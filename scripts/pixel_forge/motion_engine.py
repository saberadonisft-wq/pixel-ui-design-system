"""Motion Engine: Region-Safe Temporal Hysteresis (Crawl Killer), Foot Contact Lock,
Alternating Walk Gait, Distinct 5-Clip Action Sequences, Unarmed Rigging & 16-Bit Dual-Buffer VFX."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

from .grid_cleaner import apply_selective_outline, chroma_key_cielab, remove_orphan_pixels
from .paperdoll_builder import build_paperdoll_layers, composite_paperdoll, compute_frame_sockets
from .schema import ElementVariantSpec, ForgeProjectSpec, VfxSequenceSpec

GLINT = (255, 252, 232, 255)
DARK_CONTRAST = (11, 14, 22, 255)


def temporal_hysteresis_filter(
    frames: list[Image.Image],
    commit_frames: int = 2,
    max_hold: int = 3,
) -> tuple[list[Image.Image], int]:
    """Suppress only isolated 1px-2px contour crawl noise that reverts immediately (c_prev == c_next)
    while NEVER erasing contiguous anatomical motion regions (breathing, stride, cape, slash)."""
    if len(frames) <= 2:
        return [f.copy() for f in frames], 0

    w, h = frames[0].size
    stabilized = [f.convert("RGBA").copy() for f in frames]
    hold_counter = np.zeros((h, w), dtype=np.int32)
    suppressed_pixels = 0

    arrs = [np.array(im, dtype=np.int32) for im in stabilized]

    for idx in range(1, len(arrs)):
        prev = arrs[idx - 1]
        curr = arrs[idx]
        nxt = arrs[(idx + 1) % len(arrs)]

        diff_prev = np.sum(np.abs(curr - prev), axis=2)
        same_as_prev = diff_prev == 0
        hold_counter[same_as_prev] = 0

        revert_mask = (
            ~same_as_prev
            & np.all(prev == nxt, axis=2)
            & (diff_prev <= 112)
        )
        # Count how many 4-connected neighbors also changed from prev -> contiguous motion has > 2 changed neighbors
        changed_map = (~same_as_prev).astype(np.int32)
        nb_changed = (
            np.roll(changed_map, 1, axis=0)
            + np.roll(changed_map, -1, axis=0)
            + np.roll(changed_map, 1, axis=1)
            + np.roll(changed_map, -1, axis=1)
        )
        isolated_crawl = revert_mask & (nb_changed <= 2) & (hold_counter < max_hold)
        if commit_frames >= 2 and np.any(isolated_crawl):
            curr[isolated_crawl] = prev[isolated_crawl]
            suppressed_pixels += int(isolated_crawl.sum())

        still_changed = (~same_as_prev) & ~isolated_crawl
        hold_counter[still_changed] += 1
        hold_counter[hold_counter >= max_hold] = 0
        arrs[idx] = curr

    out_frames = [Image.fromarray(a.astype(np.uint8), mode="RGBA") for a in arrs]
    return out_frames, suppressed_pixels


def lock_foot_contact_and_centroid(
    frames: list[Image.Image],
    target_baseline_y: int = 88,
    target_center_x: int = 48,
) -> list[Image.Image]:
    """Lock lowest opaque foot pixel to target_baseline_y and stabilize horizontal torso centroid."""
    locked_frames: list[Image.Image] = []
    for frame in frames:
        arr = np.array(frame.convert("RGBA"), dtype=np.uint8)
        h, w, _ = arr.shape
        fg_ys, fg_xs = np.where(arr[:, :, 3] == 255)
        if len(fg_ys) == 0:
            locked_frames.append(frame.convert("RGBA"))
            continue
        max_y = int(fg_ys.max())
        torso = (fg_xs >= 24) & (fg_xs <= 72) & (fg_ys >= 24) & (fg_ys <= 76)
        centroid_x = int(round(float(fg_xs[torso].mean()))) if np.any(torso) else target_center_x
        dy = target_baseline_y - max_y
        dx = max(-2, min(2, target_center_x - centroid_x))
        shifted = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        shifted.paste(frame.convert("RGBA"), (dx, dy))
        locked_frames.append(shifted)
    return locked_frames


def make_horizontal_strip(frames: list[Image.Image]) -> Image.Image:
    """Pack a list of same-sized frames into a horizontal sprite strip."""
    if not frames:
        raise ValueError("Cannot build a sprite strip from an empty frame list.")
    w, h = frames[0].size
    strip = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for idx, frame in enumerate(frames):
        strip.paste(frame, (idx * w, 0))
    return strip


def _shift_sprite(img: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (dx, dy), img)
    return out


def _shift_cape_edge_outward(arr: np.ndarray, y0: int, y1: int, x0: int, x1: int) -> np.ndarray:
    """Safely flutter only the outer silhouette pixels of a cape outward by 1px into transparent air,
    NEVER using np.roll (which creates transparent interior seams!)."""
    out = arr.copy()
    for y in range(max(1, y0), min(arr.shape[0] - 1, y1)):
        for x in range(max(1, x0), min(arr.shape[1] - 1, x1)):
            if arr[y, x, 3] == 0 and arr[y, x + 1, 3] == 255:
                out[y, x] = arr[y, x + 1]
    return out


def _compose_walk_alternating_gait(
    walk0: Image.Image,
    walk1: Image.Image,
    variant: str,
) -> Image.Image:
    """Compose clean 4-beat bipedal walk stride without detached leg artifacts or cape slits,
    ensuring opposite contact phase clearly swaps lead vs trailing foot while keeping Y=88 locked."""
    w0 = np.array(walk0.convert("RGBA"), dtype=np.uint8)
    w1 = np.array(walk1.convert("RGBA"), dtype=np.uint8)
    if variant == "passing_a":
        # Passing height bounce (+1px lift on upper torso/head while feet stay planted cleanly at Y=88)
        out = w0.copy()
        out[0:62, :] = w0[1:63, :]
        # Bridge waist seam cleanly without leaving blank gaps
        mask_gap = (out[61, :, 3] == 0) & (w0[62, :, 3] == 255)
        out[61, mask_gap] = w0[62, mask_gap]
        out = _shift_cape_edge_outward(out, 50, 82, 8, 32)
        return Image.fromarray(out, mode="RGBA")
    if variant == "opposite_stride":
        # Smooth alternating counter-stride from AI walk1 without np.roll chopping shins!
        # Subtle forward lunge on torso/cloak (+1px X) while tucking leading toe & flexing trail knee cleanly.
        out = w1.copy()
        out[:, 1:96] = w1[:, 0:95]
        # Advance trailing right leg slightly (y=68..89, x=46..66 -> -2px) smoothly into ground contact without orphaned toes
        trail_col_mask = w1[68:89, 48:66]
        out[68:89, 46:64] = np.where(trail_col_mask[:, :, 3:4] == 255, trail_col_mask, out[68:89, 46:64])
        # Subtle upward bounce (-1px) on upper plume/helm crest (y<=44) for snappy gait rhythm
        out[0:44, :] = w1[1:45, :]
        out = _shift_cape_edge_outward(out, 50, 82, 8, 30)
        return Image.fromarray(out, mode="RGBA")
    # passing_b: counter-passing lift on w1
    out = w1.copy()
    out[0:64, :] = w1[1:65, :]
    mask_gap = (out[63, :, 3] == 0) & (w1[64, :, 3] == 255)
    out[63, mask_gap] = w1[64, mask_gap]
    return Image.fromarray(out, mode="RGBA")


def _compose_hurt_shield_recoil(
    idle0: Image.Image,
    damaged: Image.Image,
) -> Image.Image:
    """Compose an authentic Shield Guard recoil pose (-2px shift, raised Heater Shield + hit spark)."""
    base = _shift_sprite(damaged, -2, 0)
    b_arr = np.array(base, dtype=np.uint8)
    i_arr = np.array(idle0.convert("RGBA"), dtype=np.uint8)
    # Extract left-arm Cross Shield patch (x=22..44, y=44..74) and lift it 4px diagonally forward to guard chest
    shield_patch = i_arr[44:74, 22:44]
    out_img = Image.fromarray(b_arr, mode="RGBA")
    patch_img = Image.fromarray(shield_patch, mode="RGBA")
    out_img.paste(patch_img, (24, 40), patch_img)

    # Crisp 2-frame shield impact star spark right on the raised shield face
    draw = ImageDraw.Draw(out_img)
    draw.rectangle((31, 47, 36, 48), fill=GLINT)
    draw.rectangle((33, 45, 34, 50), fill=GLINT)
    draw.rectangle((29, 49, 32, 51), fill=(255, 214, 92, 255))
    return out_img


def _draw_connected_cross_sparkle(draw: ImageDraw.ImageDraw, cx: int, cy: int, core: tuple[int, int, int, int], edge: tuple[int, int, int, int]) -> None:
    """Draw a 5-pixel connected cross sparkle so remove_orphan_pixels preserves it reliably."""
    draw.point((cx, cy), fill=core)
    draw.point((cx - 1, cy), fill=edge)
    draw.point((cx + 1, cy), fill=edge)
    draw.point((cx, cy - 1), fill=edge)
    draw.point((cx, cy + 1), fill=edge)


def _compose_victory_sequence(
    idle1: Image.Image,
    vic0: Image.Image,
    stage: str,
) -> Image.Image:
    """Craft distinct 4-frame Victory banner frames so f0!=f1!=f2!=f3 with zero boot/cape seams."""
    if stage == "prepare":
        return _shift_sprite(idle1, 0, 1)
    if stage == "raise_mid":
        # Smooth upward anticipation: coil upper torso/shoulder +1px without breaking leg/greave pixels!
        arr = np.array(vic0.convert("RGBA"), dtype=np.uint8)
        out = arr.copy()
        out[2:68, :] = arr[0:66, :]
        # Weld overlap band cleanly around waist so feet stay rock-solid on Y=88 with zero split stripe
        gap = (out[67:71, :, 3] == 0) & (arr[67:71, :, 3] == 255)
        out[67:71, :][gap] = arr[67:71, :][gap]
        return Image.fromarray(out, mode="RGBA")
    if stage == "apex_spark":
        # Distinct apex frame: safe outer cape billow + radiant 5px holy sparkles (never np.roll seams!)
        arr = _shift_cape_edge_outward(np.array(vic0.convert("RGBA"), dtype=np.uint8), 48, 82, 10, 32)
        out_img = Image.fromarray(arr, mode="RGBA")
        draw = ImageDraw.Draw(out_img)
        for sx, sy in ((20, 26), (76, 22), (46, 5), (72, 48)):
            _draw_connected_cross_sparkle(draw, sx, sy, GLINT, (255, 214, 92, 255))
        return out_img
    return vic0.copy()


def _compose_idle_breathing(idle0: Image.Image, idle1: Image.Image, stage: str) -> Image.Image:
    """Craft subtle region-masked breathing/cape/rune sequence without interior seams or duplicate frames."""
    if stage == "apex":
        # Outward cape hem billow + bright connected cross-sparkles & visor gleam
        arr = _shift_cape_edge_outward(np.array(idle1.convert("RGBA"), dtype=np.uint8), 52, 82, 10, 32)
        out = Image.fromarray(arr, mode="RGBA")
        draw = ImageDraw.Draw(out)
        _draw_connected_cross_sparkle(draw, 74, 28, GLINT, (72, 232, 255, 255))
        _draw_connected_cross_sparkle(draw, 22, 54, GLINT, (255, 214, 92, 255))
        return out
    # exhale transition: subtle 1px cape relaxation from idle0 + golden aura sparkle
    arr = _shift_cape_edge_outward(np.array(idle0.convert("RGBA"), dtype=np.uint8), 56, 80, 12, 30)
    out = Image.fromarray(arr, mode="RGBA")
    draw = ImageDraw.Draw(out)
    _draw_connected_cross_sparkle(draw, 76, 33, GLINT, (255, 214, 92, 255))
    return out


def _compose_attack_frame(
    idle0: Image.Image,
    atk0: Image.Image,
    atk1: Image.Image,
    stage: str,
) -> Image.Image:
    """Craft distinct 4-frame Attack arc: coil -> overhead windup -> cleave slash -> crisp follow-through."""
    if stage == "coil":
        arr = np.array(idle0.convert("RGBA"), dtype=np.uint8)
        out = np.zeros_like(arr)
        out[2:80, :] = arr[0:78, :]
        out[78:89, :] = arr[78:89, :]
        return Image.fromarray(out, mode="RGBA")
    if stage == "recovery":
        arr = np.array(atk1.convert("RGBA"), dtype=np.uint8)
        # Erase right-side slash energy arc to show post-swing recovery stance with extended blade lowered
        out = arr.copy()
        for y in range(6, 56):
            for x in range(62, 95):
                r, g, b, a = out[y, x]
                if a == 255 and ((int(r) > 190 and int(g) > 130) or (int(b) > 200 and int(r) < 120)):
                    out[y, x] = (0, 0, 0, 0)
        return remove_orphan_pixels(Image.fromarray(out, mode="RGBA"))
    return atk0.copy() if stage == "windup" else atk1.copy()


def build_character_animation_clips(
    spec: ForgeProjectSpec,
    ai_frames: dict[str, Image.Image] | None = None,
    master_palette: list[tuple[int, int, int]] | None = None,
) -> dict[str, Any]:
    """Generate the 5 character animation clips with region-safe Crawl Killer, Foot Lock at Y=88,
    Single Master Palette LUT consistency, Unarmed swaps, and synchronized per-frame sockets."""
    from pathlib import Path
    from .ai_frame_pipeline import (
        build_master_palette,
        build_unarmed_sprite_variant,
        create_ai_damaged_variant,
        load_and_process_raw_ai_knight,
        quantize_to_palette,
    )

    if ai_frames is None:
        root = Path(__file__).resolve().parents[2]
        ai_bundle = load_and_process_raw_ai_knight(
            root / "public" / "assets" / "pixel-forge" / "raw_ai",
            root / "public" / "assets" / "pixel-forge" / "generated",
            spec,
        )
        if ai_bundle is not None:
            ai_frames = ai_bundle["aiFrames"]
            master_palette = master_palette or ai_bundle.get("masterPalette")

    base_element = spec.elements[0]
    clips_out: dict[str, Any] = {}

    if ai_frames is not None:
        if master_palette is None:
            master_palette = build_master_palette(list(ai_frames.values()), max_colors=20)

        f_idle0 = ai_frames["knight-idle-f0"]
        f_idle1 = ai_frames["knight-idle-f1"]
        f_walk0 = ai_frames["knight-walk-f0"]
        f_walk1 = ai_frames["knight-walk-f1"]
        f_atk0 = ai_frames["knight-attack-f0"]
        f_atk1 = ai_frames["knight-attack-f1"]
        f_vic0 = ai_frames["knight-victory-f0"]
        f_dmg = create_ai_damaged_variant(f_idle0, shared_palette=master_palette, max_colors=20)

        ai_clip_sequences: dict[str, list[Image.Image]] = {
            "idle": [
                f_idle0.copy(),
                f_idle1.copy(),
                _compose_idle_breathing(f_idle0, f_idle1, "apex"),
                _compose_idle_breathing(f_idle0, f_idle1, "exhale"),
            ],
            "walk": [
                f_walk0.copy(),
                _compose_walk_alternating_gait(f_walk0, f_walk1, "passing_a"),
                _compose_walk_alternating_gait(f_walk0, f_walk1, "opposite_stride"),
                _compose_walk_alternating_gait(f_walk0, f_walk1, "passing_b"),
            ],
            "attack": [
                _compose_attack_frame(f_idle0, f_atk0, f_atk1, "coil"),
                f_atk0.copy(),
                f_atk1.copy(),
                _compose_attack_frame(f_idle0, f_atk0, f_atk1, "recovery"),
            ],
            "hurt": [
                f_idle0.copy(),
                _compose_hurt_shield_recoil(f_idle0, f_dmg),
            ],
            "victory": [
                _compose_victory_sequence(f_idle1, f_vic0, "prepare"),
                _compose_victory_sequence(f_idle1, f_vic0, "raise_mid"),
                f_vic0.copy(),
                _compose_victory_sequence(f_idle1, f_vic0, "apex_spark"),
            ],
        }

        unarmed_hints: dict[str, list[str]] = {
            "idle": ["idle", "idle", "idle", "idle"],
            "walk": ["walk", "walk", "walk", "walk"],
            "attack": ["idle", "attack_windup", "attack_cleave", "attack_cleave"],
            "hurt": ["hurt", "hurt"],
            "victory": ["idle", "victory", "victory", "victory"],
        }

        for clip in spec.clips:
            raw_frames = [quantize_to_palette(f, master_palette) for f in ai_clip_sequences[clip.id]]
            frame_sockets: list[list[dict[str, Any]]] = []
            for idx in range(len(raw_frames)):
                if clip.id == "attack" and idx == 1:
                    slash_phase = 1
                elif clip.id == "attack" and idx == 2:
                    slash_phase = 2
                else:
                    slash_phase = 0
                sock = compute_frame_sockets(0, slash_phase, "S")
                if clip.id == "victory" and idx >= 1:
                    for s in sock:
                        if s["id"] == "hand_r":
                            s["poseTag"] = "victory"
                            s["x"] = 56
                            s["y"] = 36
                            s["angleDeg"] = -15
                elif clip.id == "hurt" and idx == 1:
                    for s in sock:
                        if s["id"] == "hand_r":
                            s["poseTag"] = "guard"
                            s["x"] = 60
                            s["y"] = 56
                frame_sockets.append(sock)

            stabilized, suppressed = temporal_hysteresis_filter(raw_frames, commit_frames=2, max_hold=3)
            locked = lock_foot_contact_and_centroid(stabilized, target_baseline_y=88, target_center_x=48)
            locked = [quantize_to_palette(f, master_palette) for f in locked]
            unarmed_frames = [
                build_unarmed_sprite_variant(f, unarmed_hints[clip.id][idx], shared_palette=master_palette)
                for idx, f in enumerate(locked)
            ]
            strip = make_horizontal_strip(locked)
            clips_out[clip.id] = {
                "spec": clip,
                "frames": locked,
                "unarmedFrames": unarmed_frames,
                "strip": strip,
                "socketsPerFrame": frame_sockets,
                "crawlPixelsSuppressed": suppressed,
            }
        return clips_out

    for clip in spec.clips:
        raw_frames: list[Image.Image] = []
        frame_sockets: list[list[dict[str, Any]]] = []

        for f_idx in range(clip.frames):
            if clip.id == "idle":
                pose_y = 0 if f_idx in (0, 2) else -1
                layers = build_paperdoll_layers(base_element, pose_offset_y=pose_y, step_phase=f_idx, slash_phase=0)
                raw_frames.append(composite_paperdoll(layers, canvas_size=(96, 96)))
                frame_sockets.append(compute_frame_sockets(pose_y, 0, "S"))
            elif clip.id == "walk":
                pose_y = -1 if f_idx % 2 == 1 else 0
                layers = build_paperdoll_layers(base_element, pose_offset_y=pose_y, step_phase=f_idx, slash_phase=0)
                raw_frames.append(composite_paperdoll(layers, canvas_size=(96, 96)))
                frame_sockets.append(compute_frame_sockets(pose_y, 0, "S"))
            elif clip.id == "attack":
                slash_phase = 0 if f_idx == 0 else (1 if f_idx == 1 else (2 if f_idx == 2 else 0))
                pose_y = -1 if f_idx == 1 else (1 if f_idx == 2 else 0)
                layers = build_paperdoll_layers(base_element, pose_offset_y=pose_y, step_phase=f_idx, slash_phase=slash_phase)
                raw_frames.append(composite_paperdoll(layers, canvas_size=(96, 96)))
                frame_sockets.append(compute_frame_sockets(pose_y, slash_phase, "S"))
            elif clip.id == "hurt":
                damaged = f_idx == 1
                pose_y = 1 if damaged else 0
                layers = build_paperdoll_layers(base_element, pose_offset_y=pose_y, step_phase=0, slash_phase=0, damaged=damaged)
                frame_img = composite_paperdoll(layers, canvas_size=(96, 96))
                if damaged:
                    px = frame_img.load()
                    for y in range(frame_img.height):
                        for x in range(frame_img.width):
                            r, g, b, a = px[x, y]
                            if a == 255 and (r + g + b) > 360:
                                px[x, y] = (255, 248, 224, 255)
                raw_frames.append(frame_img)
                frame_sockets.append(compute_frame_sockets(pose_y, 0, "S"))
            else:
                slash_phase = 1 if f_idx in (1, 2) else 0
                pose_y = -2 if f_idx == 2 else 0
                layers = build_paperdoll_layers(base_element, pose_offset_y=pose_y, step_phase=f_idx, slash_phase=slash_phase)
                raw_frames.append(composite_paperdoll(layers, canvas_size=(96, 96)))
                frame_sockets.append(compute_frame_sockets(pose_y, slash_phase, "S"))

        stabilized, suppressed = temporal_hysteresis_filter(raw_frames, commit_frames=2, max_hold=3)
        locked = lock_foot_contact_and_centroid(stabilized, target_baseline_y=88, target_center_x=48)
        strip = make_horizontal_strip(locked)

        clips_out[clip.id] = {
            "spec": clip,
            "frames": locked,
            "unarmedFrames": [f.copy() for f in locked],
            "strip": strip,
            "socketsPerFrame": frame_sockets,
            "crawlPixelsSuppressed": suppressed,
        }

    return clips_out


def _draw_pixel_star(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int, core_col: tuple[int, int, int, int], outer_col: tuple[int, int, int, int]) -> None:
    """Draw a crisp 1px-tapered pixel-art 4-point star sparkle."""
    for d in range(1, radius + 1):
        c = core_col if d <= max(1, radius // 2) else outer_col
        draw.point((cx - d, cy), fill=c)
        draw.point((cx + d, cy), fill=c)
        draw.point((cx, cy - d), fill=c)
        draw.point((cx, cy + d), fill=c)
    draw.point((cx, cy), fill=GLINT)


def _draw_crescent_arc(
    c_draw: ImageDraw.ImageDraw,
    e_draw: ImageDraw.ImageDraw,
    w: int,
    h: int,
    progress: int,
    p_dark: tuple[int, int, int, int],
    p_mid: tuple[int, int, int, int],
    p_light: tuple[int, int, int, int],
    a_mid: tuple[int, int, int, int],
    a_light: tuple[int, int, int, int],
    glow: tuple[int, int, int, int],
) -> None:
    """Render an authentic curved 16-bit SNES crescent sword-wave using polar arc sampling."""
    cx, cy = 22.0, 32.0
    if progress == 0:
        # Gathering anticipation sparks along right swing trajectory
        for sx, sy, r in ((38, 12, 2), (48, 22, 3), (44, 46, 2)):
            _draw_pixel_star(c_draw, sx, sy, r, p_light, p_dark)
            _draw_pixel_star(e_draw, sx, sy, max(1, r - 1), GLINT, glow)
        return

    if progress in (1, 2):
        # Smooth continuous pixel-stepped blade arc from top-right to bottom-right
        r_outer = 28.0 if progress == 1 else 31.0
        max_thick = 7.0 if progress == 1 else 9.0
        a_start = -math.pi * 0.44
        a_end = math.pi * 0.44
        for y in range(h):
            for x in range(w):
                dx = x - cx
                dy = y - cy
                if dx < 2:
                    continue
                ang = math.atan2(dy, dx)
                if not (a_start <= ang <= a_end):
                    continue
                t = (ang - a_start) / (a_end - a_start)  # 0..1 from top tip to bottom tip
                taper = math.sin(t * math.pi) ** 0.72
                thickness = max(0.8, max_thick * taper)
                dist = math.hypot(dx, dy)
                inner_edge = r_outer - thickness
                if inner_edge <= dist <= r_outer:
                    radial_u = (dist - inner_edge) / max(0.5, thickness)
                    if radial_u >= 0.72:
                        c_draw.point((x, y), fill=p_light)
                        e_draw.point((x, y), fill=GLINT)
                    elif radial_u >= 0.42:
                        c_draw.point((x, y), fill=p_mid)
                        e_draw.point((x, y), fill=glow)
                    elif radial_u >= 0.16:
                        c_draw.point((x, y), fill=a_light)
                        e_draw.point((x, y), fill=a_mid)
                    else:
                        c_draw.point((x, y), fill=p_dark)
        # Tapered leading edge speed sparks
        spark_pts = ((42, 8, 2), (55, 31, 3), (45, 53, 2)) if progress == 2 else ((40, 10, 2), (52, 30, 2))
        for sx, sy, r in spark_pts:
            _draw_pixel_star(c_draw, sx, sy, r, p_light, p_mid)
            _draw_pixel_star(e_draw, sx, sy, max(1, r - 1), GLINT, glow)
        return

    # Dissipation: scattered curved comet embers along arc wake (no blocky rectangles!)
    for sx, sy, r in ((40, 11, 2), (53, 23, 3), (54, 38, 2), (44, 51, 2), (35, 17, 1)):
        _draw_pixel_star(c_draw, sx, sy, r, p_mid, p_dark)
        _draw_pixel_star(e_draw, sx, sy, max(1, r - 1), glow, a_light)


def evaluate_vfx_craft_checks(
    color_frames: list[Image.Image],
    emissive_frames: list[Image.Image],
) -> int:
    """Run 22 deterministic pixel-craft checks across the 4-frame Dual-Buffer VFX sequence
    (4 per-frame checks × 4 frames + 6 sequence-level checks)."""
    passed = 0
    opaque_counts: list[int] = []
    emi_counts: list[int] = []

    for c_img, e_img in zip(color_frames[:4], emissive_frames[:4]):
        c_arr = np.array(c_img.convert("RGBA"), dtype=np.uint8)
        e_arr = np.array(e_img.convert("RGBA"), dtype=np.uint8)
        c_alpha = c_arr[:, :, 3]
        e_alpha = e_arr[:, :, 3]

        # 1. Binary alpha {0, 255} on color buffer
        if int(((c_alpha != 0) & (c_alpha != 255)).sum()) == 0:
            passed += 1
        # 2. Binary alpha {0, 255} on emissive buffer
        if int(((e_alpha != 0) & (e_alpha != 255)).sum()) == 0:
            passed += 1
        # 3. Non-empty silhouette per frame
        c_op = int((c_alpha == 255).sum())
        e_op = int((e_alpha == 255).sum())
        opaque_counts.append(c_op)
        emi_counts.append(e_op)
        if c_op >= 8:
            passed += 1
        # 4. Disciplined VFX color count (<= 16 unique RGB colors per frame)
        fg_rgb = c_arr[c_alpha == 255, :3]
        uniq_colors = len(np.unique(fg_rgb, axis=0)) if len(fg_rgb) > 0 else 0
        if 1 <= uniq_colors <= 16:
            passed += 1

    # Sequence-level checks (6 checks -> total 22)
    # 17. All 4 frames present
    if len(color_frames) >= 4 and len(emissive_frames) >= 4:
        passed += 1
    # 18. Zero adjacent duplicate frames
    if len(color_frames) >= 2 and all(
        not np.array_equal(np.array(color_frames[i]), np.array(color_frames[i + 1]))
        for i in range(len(color_frames) - 1)
    ):
        passed += 1
    # 19. Peak energy arc (mid-sequence peak frames carry strong silhouette)
    if len(opaque_counts) >= 3 and max(opaque_counts[1], opaque_counts[2]) >= opaque_counts[-1]:
        passed += 1
    # 20. Emissive buffer actively lit across sequence
    if sum(emi_counts) >= 24:
        passed += 1
    # 21. Consistent frame dimensions across color & emissive buffers
    if len({im.size for im in color_frames + emissive_frames}) == 1:
        passed += 1
    # 22. Zero pure-green (#00FF00) chroma-key spill across composite frames
    has_spill = any(
        bool(
            (
                (np.array(im)[:, :, 3] == 255)
                & (np.array(im)[:, :, 0] < 20)
                & (np.array(im)[:, :, 1] > 235)
                & (np.array(im)[:, :, 2] < 20)
            ).any()
        )
        for im in color_frames
    )
    if not has_spill:
        passed += 1

    return passed


def build_dual_buffer_vfx(vfx: VfxSequenceSpec, element: ElementVariantSpec) -> dict[str, Any]:
    """Generate crisp 16-bit Dual-Buffer VFX strips (Color + Emissive) adhering strictly to pixel craft rules."""
    p_dark, p_mid, p_light = [(*c, 255) for c in element.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in element.accent_ramp]
    glow = (*element.glow_rgb, 255)

    color_frames: list[Image.Image] = []
    emissive_frames: list[Image.Image] = []
    composite_frames: list[Image.Image] = []

    for f_idx in range(vfx.frames):
        w, h = vfx.canvas_width, vfx.canvas_height
        col_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        emi_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(col_img)
        e_draw = ImageDraw.Draw(emi_img)

        if vfx.category == "summon-ritual":
            # Stepped isometric ground summoning ellipse & magic sigil ticks
            rx, ry = 22.0, 6.5
            cx, cy = 32.0, 50.0
            for y in range(42, 59):
                for x in range(8, 57):
                    d = math.hypot((x - cx) / rx, (y - cy) / ry)
                    if 0.84 <= d <= 1.04:
                        c_draw.point((x, y), fill=p_mid if d >= 0.92 else p_dark)
                        if d >= 0.94:
                            e_draw.point((x, y), fill=glow)
                    elif 0.50 <= d <= 0.62 and (x + y) % 3 != 0:
                        c_draw.point((x, y), fill=a_dark)
                        e_draw.point((x, y), fill=a_light)

            if f_idx == 0:
                # Stage 1: Ascending rune vortex & converging orbital sparks
                for deg_step in range(8):
                    ang = deg_step * (math.pi / 4.0)
                    px = int(round(cx + math.cos(ang) * 16))
                    py = int(round(36 + math.sin(ang) * 8))
                    _draw_pixel_star(c_draw, px, py, 2, a_light, a_dark)
                    _draw_pixel_star(e_draw, px, py, 1, GLINT, a_light)
            elif f_idx == 1:
                # Stage 2: Tapered crystalline obelisk sky beam with beveled core & orbital sparks
                for y in range(6, 51):
                    t = (y - 6) / 44.0
                    half_w = max(1, int(round(4.2 * math.sin(t * math.pi) ** 0.55 + 1.5)))
                    for dx in range(-half_w, half_w + 1):
                        if abs(dx) == half_w:
                            col = DARK_CONTRAST
                        elif abs(dx) >= half_w - 1:
                            col = a_mid
                        elif abs(dx) == 0:
                            col = GLINT
                        else:
                            col = p_light if y % 4 != 0 else p_mid
                        c_draw.point((32 + dx, y), fill=col)
                        if abs(dx) <= max(1, half_w - 1):
                            e_draw.point((32 + dx, y), fill=GLINT if abs(dx) <= 1 else glow)
                _draw_pixel_star(c_draw, 19, 20, 2, p_light, p_mid)
                _draw_pixel_star(c_draw, 45, 28, 2, p_light, a_light)
                _draw_pixel_star(e_draw, 19, 20, 1, GLINT, glow)
                _draw_pixel_star(e_draw, 45, 28, 1, GLINT, glow)
            elif f_idx == 2:
                # Stage 3: Faceted 8-Ray tapered diamond burst star (smooth pixel falloff, zero square blocks)
                for y in range(6, 56):
                    for x in range(6, 58):
                        dx = abs(x - 32.0)
                        dy = abs(y - 30.0)
                        dist = math.hypot(dx, dy)
                        if dist > 23.0:
                            continue
                        axis_taper = max(0.0, 2.8 * (1.0 - dist / 23.0))
                        diag_diff = abs(dx - dy)
                        on_cardinal = (dx <= axis_taper and dy <= 22.0) or (dy <= axis_taper and dx <= 22.0)
                        on_diag = (diag_diff <= max(0.6, axis_taper * 0.7)) and (dist <= 16.0)
                        on_core = dist <= 5.5
                        if on_core or on_cardinal or on_diag:
                            if dist <= 3.5:
                                c_draw.point((x, y), fill=GLINT)
                                e_draw.point((x, y), fill=GLINT)
                            elif dist <= 8.5:
                                c_draw.point((x, y), fill=p_light)
                                e_draw.point((x, y), fill=glow)
                            elif dist <= 15.0:
                                c_draw.point((x, y), fill=p_mid)
                                e_draw.point((x, y), fill=a_light)
                            else:
                                c_draw.point((x, y), fill=a_mid)
            else:
                # Stage 4: Ascending sacred diamond sparks (no blocky bricks!)
                for sx, sy, r in ((18, 18, 3), (45, 20, 2), (24, 34, 2), (40, 36, 3), (32, 10, 3)):
                    _draw_pixel_star(c_draw, sx, sy, r, p_light, p_dark)
                    _draw_pixel_star(e_draw, sx, sy, max(1, r - 1), GLINT, glow)
        else:
            _draw_crescent_arc(
                c_draw, e_draw, w, h, f_idx,
                p_dark, p_mid, p_light, a_mid, a_light, glow,
            )

        col_clean = remove_orphan_pixels(apply_selective_outline(chroma_key_cielab(col_img), "dark", (11, 14, 22)))
        emi_clean = remove_orphan_pixels(chroma_key_cielab(emi_img))
        comp = col_clean.copy()
        comp.alpha_composite(emi_clean)

        color_frames.append(col_clean)
        emissive_frames.append(emi_clean)
        composite_frames.append(comp)

    return {
        "spec": vfx,
        "colorFrames": color_frames,
        "emissiveFrames": emissive_frames,
        "colorStrip": make_horizontal_strip(color_frames),
        "emissiveStrip": make_horizontal_strip(emissive_frames),
        "compositeStrip": make_horizontal_strip(composite_frames),
        "frames": composite_frames,
        "craftChecksPassed": evaluate_vfx_craft_checks(color_frames, emissive_frames),
    }
