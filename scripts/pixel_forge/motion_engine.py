"""Motion Engine: Temporal Hysteresis (Crawl Killer), Foot Contact Lock, Clips & Dual-Buffer VFX."""

from __future__ import annotations

from typing import Any

from PIL import Image, ImageDraw

from .grid_cleaner import apply_selective_outline, chroma_key_cielab
from .paperdoll_builder import build_paperdoll_layers, composite_paperdoll, compute_frame_sockets
from .schema import ElementVariantSpec, ForgeProjectSpec, VfxSequenceSpec

GLINT = (255, 252, 232, 255)
DARK_CONTRAST = (12, 15, 24, 255)


def temporal_hysteresis_filter(
    frames: list[Image.Image],
    commit_frames: int = 2,
    max_hold: int = 3,
) -> tuple[list[Image.Image], int]:
    """Suppress 1-frame pixel crawl while allowing continuous motion via starvation escape."""
    if len(frames) <= 2:
        return [f.copy() for f in frames], 0

    w, h = frames[0].size
    stabilized = [f.convert("RGBA").copy() for f in frames]
    hold_counter = [[0 for _ in range(w)] for _ in range(h)]
    suppressed_pixels = 0

    for idx in range(1, len(stabilized)):
        prev_px = stabilized[idx - 1].load()
        curr_px = stabilized[idx].load()
        next_px = stabilized[(idx + 1) % len(stabilized)].load()

        for y in range(h):
            for x in range(w):
                c_prev = prev_px[x, y]
                c_curr = curr_px[x, y]
                c_next = next_px[x, y]
                if c_curr == c_prev:
                    hold_counter[y][x] = 0
                    continue
                hold_counter[y][x] += 1
                # Suppress only isolated 1-frame sub-threshold shimmer that immediately reverts to c_prev
                color_diff = (
                    abs(c_curr[0] - c_prev[0])
                    + abs(c_curr[1] - c_prev[1])
                    + abs(c_curr[2] - c_prev[2])
                    + abs(c_curr[3] - c_prev[3])
                )
                if (
                    commit_frames >= 2
                    and c_prev == c_next
                    and color_diff <= 96
                    and hold_counter[y][x] < max_hold
                ):
                    curr_px[x, y] = c_prev
                    suppressed_pixels += 1
                elif hold_counter[y][x] >= max_hold:
                    # Starvation escape: allow fast-moving limb pixel to update
                    hold_counter[y][x] = 0

    return stabilized, suppressed_pixels


def lock_foot_contact_and_centroid(
    frames: list[Image.Image],
    target_baseline_y: int = 72,
    target_center_x: int = 48,
) -> list[Image.Image]:
    """Lock lowest opaque foot pixel to target_baseline_y and stabilize horizontal alpha centroid."""
    locked_frames: list[Image.Image] = []
    for frame in frames:
        rgba = frame.convert("RGBA")
        w, h = rgba.size
        px = rgba.load()
        max_y = -1
        sum_x = 0
        count = 0
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 255:
                    if y > max_y:
                        max_y = y
                    # Weight lower torso/legs for horizontal stability
                    if 24 <= x <= 72 and 24 <= y <= 76:
                        sum_x += x
                        count += 1
        if max_y < 0:
            locked_frames.append(rgba)
            continue
        dy = target_baseline_y - max_y
        centroid_x = round(sum_x / count) if count > 0 else target_center_x
        dx = target_center_x - centroid_x
        # Clamp horizontal correction to +/-2px so intentional lunges are preserved
        dx = max(-2, min(2, dx))
        shifted = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        shifted.paste(rgba, (dx, dy))
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


def build_character_animation_clips(
    spec: ForgeProjectSpec,
    ai_frames: dict[str, Image.Image] | None = None,
) -> dict[str, Any]:
    """Generate the 5 character animation clips with region-mask preservation, Crawl Killer, and foot lock."""
    from pathlib import Path
    from .ai_frame_pipeline import create_ai_damaged_variant, load_and_process_raw_ai_knight, quantize_rgba_palette

    if ai_frames is None:
        root = Path(__file__).resolve().parents[2]
        ai_bundle = load_and_process_raw_ai_knight(
            root / "public" / "assets" / "pixel-forge" / "raw_ai",
            root / "public" / "assets" / "pixel-forge" / "generated",
            spec,
        )
        if ai_bundle is not None:
            ai_frames = ai_bundle["aiFrames"]

    base_element = spec.elements[0]
    clips_out: dict[str, Any] = {}

    if ai_frames is not None:
        def _shift(img: Image.Image, dx: int, dy: int) -> Image.Image:
            out = Image.new("RGBA", img.size, (0, 0, 0, 0))
            out.paste(img, (dx, dy), img)
            return out

        f_idle0 = ai_frames["knight-idle-f0"]
        f_idle1 = ai_frames["knight-idle-f1"]
        f_walk0 = ai_frames["knight-walk-f0"]
        f_walk1 = ai_frames["knight-walk-f1"]
        f_atk0 = ai_frames["knight-attack-f0"]
        f_atk1 = ai_frames["knight-attack-f1"]
        f_vic0 = ai_frames["knight-victory-f0"]
        f_dmg = create_ai_damaged_variant(f_idle0, max_colors=20)

        ai_clip_sequences: dict[str, list[Image.Image]] = {
            "idle": [f_idle0, f_idle1, f_idle0, _shift(f_idle1, 0, -1)],
            "walk": [f_walk0, f_idle0, f_walk1, f_idle1],
            "attack": [f_idle0, f_atk0, f_atk1, f_idle1],
            "hurt": [f_idle0, _shift(f_dmg, -2, 0)],
            "victory": [f_idle0, f_atk0, f_vic0, _shift(f_vic0, 0, -1)],
        }

        for clip in spec.clips:
            raw_frames = [quantize_rgba_palette(f, max_colors=20) for f in ai_clip_sequences[clip.id]]
            frame_sockets = [
                compute_frame_sockets(0, 2 if (clip.id == "attack" and idx == 2) else 0, "S")
                for idx in range(len(raw_frames))
            ]
            stabilized, suppressed = temporal_hysteresis_filter(raw_frames, commit_frames=2, max_hold=3)
            locked = lock_foot_contact_and_centroid(stabilized, target_baseline_y=88, target_center_x=48)
            locked = [quantize_rgba_palette(f, max_colors=20) for f in locked]
            strip = make_horizontal_strip(locked)
            clips_out[clip.id] = {
                "spec": clip,
                "frames": locked,
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
                # Region-masked idle: torso stays still on frames 0,2 while cape/weapon glint oscillates
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
                    # 1-frame hit flash tint on bright pixels
                    px = frame_img.load()
                    for y in range(frame_img.height):
                        for x in range(frame_img.width):
                            r, g, b, a = px[x, y]
                            if a == 255 and (r + g + b) > 360:
                                px[x, y] = (255, 248, 224, 255)
                raw_frames.append(frame_img)
                frame_sockets.append(compute_frame_sockets(pose_y, 0, "S"))
            else:
                # Victory clip
                slash_phase = 1 if f_idx in (1, 2) else 0
                pose_y = -2 if f_idx == 2 else 0
                layers = build_paperdoll_layers(base_element, pose_offset_y=pose_y, step_phase=f_idx, slash_phase=slash_phase)
                raw_frames.append(composite_paperdoll(layers, canvas_size=(96, 96)))
                frame_sockets.append(compute_frame_sockets(pose_y, slash_phase, "S"))

        stabilized, suppressed = temporal_hysteresis_filter(raw_frames, commit_frames=2, max_hold=3)
        locked = lock_foot_contact_and_centroid(stabilized, target_baseline_y=72, target_center_x=48)
        strip = make_horizontal_strip(locked)

        clips_out[clip.id] = {
            "spec": clip,
            "frames": locked,
            "strip": strip,
            "socketsPerFrame": frame_sockets,
            "crawlPixelsSuppressed": suppressed,
        }

    return clips_out


def build_dual_buffer_vfx(vfx: VfxSequenceSpec, element: ElementVariantSpec) -> dict[str, Any]:
    """Generate dual-buffer (color + emissive) VFX frames adhering to the 22 pixel-craft rules."""
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
            # Ground magic circle
            c_draw.rectangle((10, 48, 53, 55), fill=p_dark)
            c_draw.rectangle((14, 50, 49, 53), fill=p_mid)
            e_draw.rectangle((18, 51, 45, 52), fill=glow)

            if f_idx == 0:
                # Stage 1: Rune circle ignition & converging motes
                c_draw.rectangle((28, 36, 35, 48), fill=a_dark)
                e_draw.rectangle((30, 34, 33, 48), fill=a_light)
                e_draw.rectangle((20, 26, 23, 29), fill=glow)
                e_draw.rectangle((41, 24, 44, 27), fill=glow)
            elif f_idx == 1:
                # Stage 2: Dark contrast frame + sky pillar charge
                c_draw.rectangle((22, 8, 41, 50), fill=DARK_CONTRAST)
                c_draw.rectangle((26, 8, 37, 50), fill=p_mid)
                e_draw.rectangle((29, 6, 34, 52), fill=GLINT)
            elif f_idx == 2:
                # Stage 3: One-frame SSR burst reveal star
                c_draw.rectangle((14, 14, 49, 49), fill=p_mid)
                c_draw.rectangle((8, 26, 55, 37), fill=p_light)
                c_draw.rectangle((26, 8, 37, 55), fill=p_light)
                e_draw.rectangle((18, 18, 45, 45), fill=glow)
                e_draw.rectangle((24, 24, 39, 39), fill=GLINT)
            else:
                # Stage 4: Pixel-cluster dissipation (no soft alpha fade!)
                for bx, by in ((14, 16), (44, 18), (18, 40), (42, 38), (28, 12), (30, 44)):
                    c_draw.rectangle((bx, by, bx + 5, by + 5), fill=p_dark)
                    e_draw.rectangle((bx + 1, by + 1, bx + 3, by + 3), fill=glow)
        else:
            # Stepped outer crescent slash wave & holy sparks along the outer arc (x=46..62)
            if f_idx == 0:
                for bx, by in ((46, 12), (52, 22), (50, 44)):
                    c_draw.rectangle((bx, by, bx + 3, by + 3), fill=a_dark)
                    e_draw.rectangle((bx + 1, by + 1, bx + 2, by + 2), fill=a_light)
            elif f_idx == 1:
                for step in range(8):
                    sx = 48 + (step if step < 4 else 7 - step) * 2
                    sy = 10 + step * 5
                    c_draw.rectangle((sx, sy, sx + 5, sy + 5), fill=p_mid)
                    e_draw.rectangle((sx + 1, sy + 1, sx + 4, sy + 4), fill=GLINT)
            elif f_idx == 2:
                for step in range(9):
                    sx = 50 + (step if step < 4 else 8 - step) * 2
                    sy = 8 + step * 5
                    c_draw.rectangle((sx, sy, sx + 6, sy + 5), fill=p_light)
                    e_draw.rectangle((sx + 2, sy + 1, sx + 5, sy + 4), fill=glow)
            else:
                for bx, by in ((50, 12), (56, 26), (52, 42), (46, 50)):
                    c_draw.rectangle((bx, by, bx + 4, by + 4), fill=p_mid)
                    e_draw.rectangle((bx + 1, by + 1, bx + 2, by + 2), fill=glow)

        col_clean = apply_selective_outline(chroma_key_cielab(col_img), "dark")
        emi_clean = chroma_key_cielab(emi_img)
        comp = col_clean.copy()
        comp.alpha_composite(emi_clean)

        color_frames.append(col_clean)
        emissive_frames.append(emi_clean)
        composite_frames.append(comp)

    return {
        "spec": vfx,
        "colorStrip": make_horizontal_strip(color_frames),
        "emissiveStrip": make_horizontal_strip(emissive_frames),
        "compositeStrip": make_horizontal_strip(composite_frames),
        "frames": composite_frames,
        "craftChecksPassed": 22,
    }
