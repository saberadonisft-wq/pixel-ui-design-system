"""16-Tile Wang Autotile, Cohesive 3-Layer 256x144 Parallax Stage,
2.5D SDF Normal/Zero-Leak Emissive Maps & 512x512 Extruded Multi-Map Atlas Packer."""

from __future__ import annotations

import json
import math
import zipfile
from collections import deque
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

from .grid_cleaner import chroma_key_cielab
from .schema import ForgeProjectSpec, TilesetSpec

BIOME_TILE_PALETTES: dict[str, dict[str, tuple[int, int, int, int]]] = {
    "solar": {
        "void_bg": (14, 18, 28, 255),
        "cliff_dark": (26, 34, 50, 255),
        "stone_base": (44, 58, 82, 255),
        "stone_mid": (66, 86, 116, 255),
        "stone_seam": (52, 68, 96, 255),
        "stone_light": (108, 136, 174, 255),
        "gold_trim": (218, 156, 48, 255),
    },
    "fire": {
        "void_bg": (20, 10, 12, 255),
        "cliff_dark": (46, 20, 22, 255),
        "stone_base": (78, 34, 32, 255),
        "stone_mid": (112, 50, 42, 255),
        "stone_seam": (88, 38, 34, 255),
        "stone_light": (172, 88, 62, 255),
        "gold_trim": (250, 154, 44, 255),
    },
    "ice": {
        "void_bg": (10, 18, 32, 255),
        "cliff_dark": (22, 42, 70, 255),
        "stone_base": (44, 82, 126, 255),
        "stone_mid": (74, 124, 176, 255),
        "stone_seam": (56, 98, 146, 255),
        "stone_light": (152, 212, 250, 255),
        "gold_trim": (96, 236, 255, 255),
    },
    "shadow": {
        "void_bg": (12, 10, 22, 255),
        "cliff_dark": (28, 20, 48, 255),
        "stone_base": (48, 36, 82, 255),
        "stone_mid": (74, 56, 118, 255),
        "stone_seam": (58, 44, 96, 255),
        "stone_light": (132, 102, 192, 255),
        "gold_trim": (204, 116, 255, 255),
    },
    "emerald": {
        "void_bg": (10, 20, 18, 255),
        "cliff_dark": (20, 42, 38, 255),
        "stone_base": (36, 74, 64, 255),
        "stone_mid": (56, 106, 92, 255),
        "stone_seam": (44, 86, 74, 255),
        "stone_light": (108, 172, 148, 255),
        "gold_trim": (232, 182, 62, 255),
    },
}


def build_wang_autotile_16(spec: TilesetSpec, biome_element: str = "solar") -> dict[str, Any]:
    """Generate a clean 16-variant Wang/Blob autotile sheet (64x64, 4x4 of 16x16 tiles)
    matched to the hero's elemental biome, plus a varied 10x6 (160x96) courtyard map preview."""
    ts = spec.tile_size
    sheet = Image.new("RGBA", (ts * 4, ts * 4), (0, 0, 0, 0))

    pal = BIOME_TILE_PALETTES.get(biome_element, BIOME_TILE_PALETTES["solar"])
    void_bg = pal["void_bg"]
    cliff_dark = pal["cliff_dark"]
    stone_base = pal["stone_base"]
    stone_mid = pal["stone_mid"]
    stone_seam = pal["stone_seam"]
    stone_light = pal["stone_light"]
    gold_trim = pal["gold_trim"]

    tiles: list[Image.Image] = []
    tile_meta: list[dict[str, Any]] = []

    for mask in range(16):
        has_n = bool(mask & 1)
        has_e = bool(mask & 2)
        has_s = bool(mask & 4)
        has_w = bool(mask & 8)

        tile = Image.new("RGBA", (ts, ts), void_bg)
        draw = ImageDraw.Draw(tile)

        x0 = 0 if has_w else 3
        x1 = ts - 1 if has_e else ts - 4
        y0 = 0 if has_n else 3
        y1 = ts - 1 if has_s else ts - 4

        draw.rectangle((x0, y0, x1, y1), fill=stone_base)
        draw.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=stone_mid)

        # Crisp ashlar stone masonry seams (staggered rows)
        draw.line((x0, 7, x1, 7), fill=stone_seam)
        draw.line((7, y0, 7, 7), fill=stone_seam)
        draw.line((12 if x1 >= 12 else x0 + 3, 8, 12 if x1 >= 12 else x0 + 3, y1), fill=stone_seam)

        if not has_n:
            draw.rectangle((x0, 2, x1, 3), fill=stone_light)
            draw.rectangle((x0, 0, x1, 1), fill=cliff_dark)
        if not has_w:
            draw.rectangle((2, y0, 3, y1), fill=stone_light)
            draw.rectangle((0, y0, 1, y1), fill=cliff_dark)
        if not has_s:
            draw.rectangle((x0, ts - 4, x1, ts - 3), fill=gold_trim)
            draw.rectangle((x0, ts - 2, x1, ts - 1), fill=cliff_dark)
        if not has_e:
            draw.rectangle((ts - 4, y0, ts - 3, y1), fill=cliff_dark)
            draw.rectangle((ts - 2, y0, ts - 1, y1), fill=void_bg)

        tiles.append(tile)
        col = mask % 4
        row = mask // 4
        sheet.paste(tile, (col * ts, row * ts))
        tile_meta.append(
            {
                "mask": mask,
                "binary": f"{mask:04b}",
                "neighbors": {"N": has_n, "E": has_e, "S": has_s, "W": has_w},
                "sheetX": col * ts,
                "sheetY": row * ts,
            }
        )

    # Assemble a varied 10x6 (160x96) courtyard layout showcasing corners, bridges, alcoves & interiors
    grid_layout = [
        [0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    ]
    rows_n = len(grid_layout)
    cols_n = len(grid_layout[0])
    map_img = Image.new("RGBA", (cols_n * ts, rows_n * ts), void_bg)

    for r in range(rows_n):
        for c in range(cols_n):
            if grid_layout[r][c] == 0:
                map_img.paste(tiles[0], (c * ts, r * ts))
                continue
            mask = 0
            if r > 0 and grid_layout[r - 1][c] == 1:
                mask |= 1
            if c < cols_n - 1 and grid_layout[r][c + 1] == 1:
                mask |= 2
            if r < rows_n - 1 and grid_layout[r + 1][c] == 1:
                mask |= 4
            if c > 0 and grid_layout[r][c - 1] == 1:
                mask |= 8
            map_img.paste(tiles[mask], (c * ts, r * ts))

    return {
        "sheet": sheet,
        "mapPreview": map_img,
        "gridLayout": grid_layout,
        "tileMeta": tile_meta,
        "biomeElement": biome_element,
    }


def build_parallax_battle_plate(
    spec: TilesetSpec,
    ai_arena_img: Image.Image | None = None,
) -> dict[str, Image.Image]:
    """Build 3 strictly stackable 256x144 parallax layers (skyFar, ruinsMid, arenaGround)
    whose alpha-composite equals composite."""
    w, h = spec.stage_width, spec.stage_height

    if ai_arena_img is not None:
        base = ai_arena_img.convert("RGBA").resize((w, h), resample=Image.Resampling.NEAREST)
        arr = np.array(base, dtype=np.uint8)
        ground_y = int(round(h * 0.65))  # y ~ 94

        # 1. Sky Far: ping-pong mirror the central rose-window colonnade softly into outer bays so panning left/right has ZERO vertical seam bars
        sky_arr = arr.copy()
        center_strip = arr[:, 84:172, :]  # width 88
        mir_left = center_strip[:, ::-1, :][:, :84, :]
        mir_right = center_strip[:, ::-1, :][:, -84:, :]
        sky_arr[:, :84, :3] = (mir_left[:, :, :3].astype(np.float32) * 0.62).astype(np.uint8)
        sky_arr[:, 172:, :3] = (mir_right[:, :, :3].astype(np.float32) * 0.62).astype(np.uint8)
        sky_arr[:, :, 3] = 255
        sky = Image.fromarray(sky_arr, mode="RGBA")

        # 2. Ruins Mid: left & right vaulted Gothic columns + torches (center stained-glass arch left transparent!)
        ruins_arr = np.zeros_like(arr)
        for y in range(ground_y):
            for x in range(w):
                # Keep central arched rose window (x=82..174, y=0..ground_y) open as transparent portal
                dx_center = abs(x - (w // 2))
                arch_half_w = 46 if y >= 32 else int(max(12, 46 * math.sqrt(max(0.0, 1.0 - ((32 - y) / 36.0) ** 2))))
                if dx_center > arch_half_w:
                    ruins_arr[y, x] = arr[y, x]
        ruins = Image.fromarray(ruins_arr, mode="RGBA")

        # 3. Arena Ground: lower stone floor & steps (y >= ground_y)
        arena_arr = np.zeros_like(arr)
        arena_arr[ground_y:, :] = arr[ground_y:, :]
        arena = Image.fromarray(arena_arr, mode="RGBA")

        composite = sky.copy()
        composite.alpha_composite(ruins)
        composite.alpha_composite(arena)
        return {
            "skyFar": sky,
            "ruinsMid": ruins,
            "arenaGround": arena,
            "composite": composite,
        }

    # Procedural fallback 256x144 Obsidian Sanctum
    sky = Image.new("RGBA", (w, h), (12, 16, 28, 255))
    s_draw = ImageDraw.Draw(sky)
    s_draw.rectangle((0, 0, w - 1, 44), fill=(18, 24, 42, 255))
    s_draw.rectangle((0, 44, w - 1, 96), fill=(26, 36, 58, 255))
    s_draw.ellipse((110, 18, 146, 54), fill=(218, 168, 72, 255))
    s_draw.ellipse((114, 22, 142, 50), fill=(255, 224, 122, 255))

    ruins = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(ruins)
    for px, ph in ((18, 64), (58, 56), (178, 56), (218, 64)):
        y_top = 96 - ph
        r_draw.rectangle((px, y_top, px + 18, 96), fill=(32, 44, 68, 255))
        r_draw.rectangle((px + 3, y_top + 3, px + 8, 96), fill=(52, 70, 102, 255))
        r_draw.rectangle((px + 8, y_top + 16, px + 10, y_top + 30), fill=(68, 212, 236, 255))

    arena = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(arena)
    a_draw.rectangle((0, 94, w - 1, 98), fill=(108, 136, 174, 255))
    a_draw.rectangle((0, 98, w - 1, h - 1), fill=(38, 50, 74, 255))
    a_draw.rectangle((0, 110, w - 1, 132), fill=(52, 68, 96, 255))
    a_draw.rectangle((36, 118, w - 37, 121), fill=(218, 156, 48, 255))

    composite = sky.copy()
    composite.alpha_composite(ruins)
    composite.alpha_composite(arena)
    return {
        "skyFar": sky,
        "ruinsMid": ruins,
        "arenaGround": arena,
        "composite": composite,
    }


def _compute_interior_sdf(fg_mask: np.ndarray) -> np.ndarray:
    """Compute exact 4-connected BFS inward distance field (max ~10px) inside opaque silhouette."""
    h, w = fg_mask.shape
    dist = np.full((h, w), 999.0, dtype=np.float32)
    q: deque[tuple[int, int]] = deque()
    for y in range(h):
        for x in range(w):
            if not fg_mask[y, x]:
                dist[y, x] = 0.0
            else:
                if y == 0 or y == h - 1 or x == 0 or x == w - 1 or (
                    not fg_mask[y - 1, x] or not fg_mask[y + 1, x] or not fg_mask[y, x - 1] or not fg_mask[y, x + 1]
                ):
                    dist[y, x] = 1.0
                    q.append((y, x))
    while q:
        cy, cx = q.popleft()
        nd = dist[cy, cx] + 1.0
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and fg_mask[ny, nx] and dist[ny, nx] > nd:
                dist[ny, nx] = nd
                q.append((ny, nx))
    dist[~fg_mask] = 0.0
    return dist


def generate_25d_lighting_maps(sprite: Image.Image) -> dict[str, Image.Image]:
    """Generate SDF-smoothed tangent Normal, metallic Specular, and strict zero-leak Emissive maps."""
    rgba = chroma_key_cielab(sprite)
    arr = np.array(rgba, dtype=np.uint8)
    h, w, _ = arr.shape
    fg = arr[:, :, 3] == 255

    sdf = _compute_interior_sdf(fg)
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

    # Smooth heightfield combines rounded SDF depth (smooth helm/armor dome curvature) + subtle plate relief
    height = np.where(fg, np.minimum(1.0, sdf / 6.0) * 0.72 + luma * 0.28, 0.0)

    normal_arr = np.zeros((h, w, 4), dtype=np.uint8)
    specular_arr = np.zeros((h, w, 4), dtype=np.uint8)
    emissive_arr = np.zeros((h, w, 4), dtype=np.uint8)

    for y in range(h):
        ym = max(0, y - 1)
        yp = min(h - 1, y + 1)
        for x in range(w):
            if not fg[y, x]:
                continue
            xm = max(0, x - 1)
            xp = min(w - 1, x + 1)
            dz_dx = (height[y, xm] - height[y, xp]) * 2.2
            dz_dy = (height[ym, x] - height[yp, x]) * 2.2
            dz = 1.0
            inv_len = 1.0 / math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy + dz * dz)
            nx = int(round(((dz_dx * inv_len) * 0.5 + 0.5) * 255.0))
            ny = int(round(((dz_dy * inv_len) * 0.5 + 0.5) * 255.0))
            nz = int(round(((dz * inv_len) * 0.5 + 0.5) * 255.0))
            normal_arr[y, x] = (max(0, min(255, nx)), max(0, min(255, ny)), max(128, min(255, nz)), 255)

            lum_255 = int(round(luma[y, x] * 255.0))
            spec_val = 255 if lum_255 >= 205 else (172 if lum_255 >= 145 else (96 if lum_255 >= 95 else 36))
            specular_arr[y, x] = (spec_val, spec_val, spec_val, 255)

            # Strict Emissive extraction: zero leak (0,0,0,255) on matte surfaces;
            # brighten cyan visor eyes & energy runes + hot golden/gem sparkle cores!
            ri, gi, bi = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
            max_c = max(ri, gi, bi)
            min_c = min(ri, gi, bi)
            is_cyan_glow = bi >= 145 and gi >= 135 and (bi - ri) >= 40
            is_rune_glint = max_c >= 230 and (max_c - min_c) >= 65 and not (ri > 180 and gi > 160 and bi > 140 and (max_c - min_c) < 70)
            if is_cyan_glow or is_rune_glint:
                emissive_arr[y, x] = (ri, gi, bi, 255)
            else:
                emissive_arr[y, x] = (0, 0, 0, 255)

    return {
        "normal": Image.fromarray(normal_arr, mode="RGBA"),
        "specular": Image.fromarray(specular_arr, mode="RGBA"),
        "emissive": Image.fromarray(emissive_arr, mode="RGBA"),
    }


def _paste_with_extrude(
    atlas: Image.Image,
    src: Image.Image,
    dest_x: int,
    dest_y: int,
    extrude: int = 2,
) -> None:
    """Paste sprite onto atlas and extrude outer 1px perimeter outward by `extrude` pixels
    to prevent bilinear subpixel edge-bleed in hardware texture samplers."""
    w, h = src.size
    atlas.paste(src, (dest_x, dest_y))
    if extrude <= 0 or w <= 0 or h <= 0:
        return
    top_strip = src.crop((0, 0, w, 1))
    bot_strip = src.crop((0, h - 1, w, h))
    left_strip = src.crop((0, 0, 1, h))
    right_strip = src.crop((w - 1, 0, w, h))
    for e in range(1, extrude + 1):
        atlas.paste(top_strip, (dest_x, max(0, dest_y - e)))
        atlas.paste(bot_strip, (dest_x, min(atlas.height - 1, dest_y + h - 1 + e)))
        atlas.paste(left_strip, (max(0, dest_x - e), dest_y))
        atlas.paste(right_strip, (min(atlas.width - 1, dest_x + w - 1 + e), dest_y))


def pack_multi_map_atlas(
    entries: list[dict[str, Any]],
    atlas_size: tuple[int, int] = (512, 512),
    extrude_px: int = 2,
    gutter_px: int = 4,
) -> dict[str, Any]:
    """Shelf-pack ALL animations, directions, paperdoll layers, full VFX sequences, and loot icons
    using alpha-trimmed bounding boxes into a power-of-two multi-map atlas with genuine 2px
    edge-bleed extrusion and true frame-byte deduplication."""
    atlas_w, atlas_h = atlas_size
    pad = extrude_px * 2 + gutter_px

    prepared: list[dict[str, Any]] = []
    seen_hashes: dict[bytes, dict[str, Any]] = {}
    deduplicated_count = 0

    cur_x = gutter_px + extrude_px
    cur_y = gutter_px + extrude_px
    row_h = 0

    for entry in entries:
        img: Image.Image = entry["image"].convert("RGBA")
        sw, sh = img.size
        alpha_bbox = img.getchannel("A").getbbox()
        if alpha_bbox is None:
            alpha_bbox = (0, 0, min(4, sw), min(4, sh))
        tx, ty, bx2, by2 = alpha_bbox
        tw, th = max(1, bx2 - tx), max(1, by2 - ty)
        trimmed_img = img.crop((tx, ty, tx + tw, ty + th))
        raw_bytes = trimmed_img.tobytes() + f":{tw}x{th}".encode("ascii")

        if raw_bytes in seen_hashes:
            deduplicated_count += 1
            reused = seen_hashes[raw_bytes]
            prepared.append(
                {
                    "entry": entry,
                    "deduplicated": True,
                    "rect": dict(reused["rect"]),
                    "trimmedSourceSize": {"x": tx, "y": ty, "w": tw, "h": th},
                    "sourceSize": {"w": sw, "h": sh},
                    "trimmedImg": None,
                }
            )
            continue

        if cur_x + tw + pad > atlas_w:
            cur_x = gutter_px + extrude_px
            cur_y += row_h + pad
            row_h = 0

        while cur_y + th + pad > atlas_h:
            atlas_h *= 2

        ox, oy = cur_x, cur_y
        cur_x += tw + pad
        row_h = max(row_h, th)
        rect_info = {"x": ox, "y": oy, "w": tw, "h": th}
        seen_hashes[raw_bytes] = {"rect": rect_info}
        prepared.append(
            {
                "entry": entry,
                "deduplicated": False,
                "rect": rect_info,
                "trimmedSourceSize": {"x": tx, "y": ty, "w": tw, "h": th},
                "sourceSize": {"w": sw, "h": sh},
                "trimmedImg": trimmed_img,
            }
        )

    diffuse_atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    normal_atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    emissive_atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))

    frames_meta: list[dict[str, Any]] = []
    for item in prepared:
        entry = item["entry"]
        rect_info = item["rect"]
        sw, sh = item["sourceSize"]["w"], item["sourceSize"]["h"]
        if not item["deduplicated"] and item["trimmedImg"] is not None:
            t_img = item["trimmedImg"]
            maps = generate_25d_lighting_maps(t_img)
            _paste_with_extrude(diffuse_atlas, t_img, rect_info["x"], rect_info["y"], extrude=extrude_px)
            _paste_with_extrude(normal_atlas, maps["normal"], rect_info["x"], rect_info["y"], extrude=extrude_px)
            _paste_with_extrude(emissive_atlas, maps["emissive"], rect_info["x"], rect_info["y"], extrude=extrude_px)

        frames_meta.append(
            {
                "id": entry["id"],
                "category": entry.get("category", "sprite"),
                "clipId": entry.get("clipId"),
                "durationMs": entry.get("durationMs", 125),
                "deduplicated": item["deduplicated"],
                "frame": rect_info,
                "trimmedSourceSize": item["trimmedSourceSize"],
                "sourceSize": item["sourceSize"],
                "pivot": entry.get("pivot", {"x": sw // 2, "y": sh - 8}),
                "sockets": entry.get("sockets", []),
            }
        )

    return {
        "diffuseAtlas": diffuse_atlas,
        "normalAtlas": normal_atlas,
        "emissiveAtlas": emissive_atlas,
        "atlasWidth": atlas_w,
        "atlasHeight": atlas_h,
        "extrudePx": extrude_px,
        "gutterPx": gutter_px,
        "deduplicatedFrames": deduplicated_count,
        "frames": frames_meta,
    }


def export_engine_manifests(
    spec: ForgeProjectSpec,
    atlas_bundle: dict[str, Any],
    output_dir: Path,
    res_base_path: str = "res://assets/pixel-forge/generated",
) -> dict[str, str]:
    """Write synchronized Aseprite JSON (with real clip durations & frameTags),
    Unity 6 JSON (unified Y=88 pivot), and dynamic Godot 4 .tres manifests."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Build clip tags from sequential clip entries
    frame_tags: list[dict[str, Any]] = []
    frames_list = atlas_bundle["frames"]
    for clip in spec.clips:
        indices = [i for i, f in enumerate(frames_list) if f.get("clipId") == clip.id]
        if indices:
            frame_tags.append(
                {
                    "name": clip.id,
                    "from": indices[0],
                    "to": indices[-1],
                    "direction": "forward",
                    "repeat": "0" if clip.loop else "1",
                }
            )

    aseprite_json = {
        "frames": {
            f["id"]: {
                "frame": f["frame"],
                "rotated": False,
                "trimmed": True,
                "spriteSourceSize": f["trimmedSourceSize"],
                "sourceSize": f["sourceSize"],
                "duration": f.get("durationMs", 125),
            }
            for f in frames_list
        },
        "meta": {
            "app": "https://github.com/pixel-ui-design-system/pixel-forge",
            "version": "2.0.0",
            "image": "forge-atlas-diffuse.png",
            "normalMap": "forge-atlas-normal.png",
            "emissiveMap": "forge-atlas-emissive.png",
            "format": "RGBA8888",
            "size": {"w": atlas_bundle["atlasWidth"], "h": atlas_bundle["atlasHeight"]},
            "extrudePx": atlas_bundle.get("extrudePx", 2),
            "scale": "1",
            "frameTags": frame_tags,
        },
    }
    aseprite_path = output_dir / "forge-atlas.aseprite.json"
    aseprite_path.write_text(json.dumps(aseprite_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    unity_json = {
        "schema": "unity-6-2d-sprite-atlas-v2",
        "textures": {
            "diffuse": "forge-atlas-diffuse.png",
            "normalMap": "_NormalMap:forge-atlas-normal.png",
            "maskMap": "_EmissiveMap:forge-atlas-emissive.png",
        },
        "pixelsPerUnit": 16,
        "filterMode": "Point",
        "extrudePx": atlas_bundle.get("extrudePx", 2),
        "sprites": [
            {
                "name": f["id"],
                "rect": f["frame"],
                "pivot": f["pivot"],
                "sockets": f["sockets"],
            }
            for f in frames_list
        ],
    }
    unity_path = output_dir / "forge-atlas.unity.json"
    unity_path.write_text(json.dumps(unity_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    safe_uid_slug = spec.character.id.replace("-", "_")
    pascal_name = "".join(part.capitalize() for part in spec.character.id.split("-")) + "SpriteFrames"

    # Build genuine Godot 4 SpriteFrames sub-resources (AtlasTexture regions + margins)
    anim_defs: list[tuple[str, float, bool, list[dict[str, Any]], dict[str, int]]] = []
    for clip in spec.clips:
        c_frames = [f for f in frames_list if f.get("clipId") == clip.id]
        if c_frames:
            anim_defs.append(
                (
                    clip.id,
                    float(clip.fps),
                    clip.loop,
                    c_frames,
                    {
                        "windup_frames": clip.timing.windup_frames,
                        "hit_frame": clip.timing.hit_frame,
                        "hit_stop_ms": clip.timing.hit_stop_ms,
                        "screen_shake_px": clip.timing.screen_shake_px,
                    },
                )
            )
    for vfx in spec.vfx_sequences:
        v_frames = [f for f in frames_list if f.get("clipId") == vfx.id]
        if v_frames:
            anim_defs.append(
                (
                    vfx.id.replace("-", "_"),
                    float(vfx.fps),
                    False,
                    v_frames,
                    {
                        "windup_frames": vfx.timing.windup_frames,
                        "hit_frame": vfx.timing.hit_frame,
                        "hit_stop_ms": vfx.timing.hit_stop_ms,
                        "screen_shake_px": vfx.timing.screen_shake_px,
                    },
                )
            )

    sub_resources: list[str] = []
    frame_sub_ids: dict[str, str] = {}
    for _, _, _, c_frames, _ in anim_defs:
        for f in c_frames:
            fid = f["id"]
            if fid in frame_sub_ids:
                continue
            sub_id = "AtlasTexture_" + fid.replace("-", "_")
            frame_sub_ids[fid] = sub_id
            r = f["frame"]
            ts = f["trimmedSourceSize"]
            ss = f["sourceSize"]
            margin_w = ss["w"] - ts["w"]
            margin_h = ss["h"] - ts["h"]
            sub_resources.extend(
                [
                    f'[sub_resource type="AtlasTexture" id="{sub_id}"]',
                    'atlas = ExtResource("1_diffuse")',
                    f'region = Rect2({r["x"]}, {r["y"]}, {r["w"]}, {r["h"]})',
                    f'margin = Rect2({ts["x"]}, {ts["y"]}, {margin_w}, {margin_h})',
                    "filter_clip = true",
                    "",
                ]
            )

    load_steps = 1 + 1 + len(frame_sub_ids)
    godot_lines = [
        f'[gd_resource type="SpriteFrames" load_steps={load_steps} format=3 uid="uid://pixel_forge_{safe_uid_slug}"]',
        "",
        f'[ext_resource type="Texture2D" path="{res_base_path}/forge-atlas-diffuse.png" id="1_diffuse"]',
        "",
        *sub_resources,
        "[resource]",
        f'resource_name = "{pascal_name}"',
        "animations = [",
    ]
    for anim_idx, (anim_name, speed_fps, is_loop, c_frames, _) in enumerate(anim_defs):
        frame_entries = ", ".join(
            f'{{ "duration": 1.0, "texture": SubResource("{frame_sub_ids[f["id"]]}") }}'
            for f in c_frames
        )
        comma = "," if anim_idx < len(anim_defs) - 1 else ""
        godot_lines.append(
            f'  {{ "frames": [{frame_entries}], "loop": {str(is_loop).lower()}, '
            f'"name": &"{anim_name}", "speed": {speed_fps:.1f} }}{comma}'
        )
    godot_lines.extend(
        [
            "]",
            f'metadata/character_id = "{spec.character.id}"',
            f"metadata/foot_baseline_y = {spec.character.foot_baseline_y}",
            f'metadata/normal_atlas = "{res_base_path}/forge-atlas-normal.png"',
            f'metadata/emissive_atlas = "{res_base_path}/forge-atlas-emissive.png"',
            "metadata/action_timing = {",
        ]
    )
    for t_idx, (anim_name, _, _, _, timing_meta) in enumerate(anim_defs):
        comma = "," if t_idx < len(anim_defs) - 1 else ""
        godot_lines.append(
            f'  "{anim_name}": {{ "windup": {timing_meta["windup_frames"]}, '
            f'"hit_frame": {timing_meta["hit_frame"]}, '
            f'"hit_stop_ms": {timing_meta["hit_stop_ms"]}, '
            f'"screen_shake_px": {timing_meta["screen_shake_px"]} }}{comma}'
        )
    godot_lines.append("}")
    godot_path = output_dir / "forge-sprites.godot.tres"
    godot_path.write_text("\n".join(godot_lines) + "\n", encoding="utf-8")

    return {
        "aseprite": aseprite_path.name,
        "unity": unity_path.name,
        "godot": godot_path.name,
    }


def pack_engine_bundle_zip(
    output_dir: Path,
    unit_id: str,
    zip_name: str = "forge-engine-bundle.zip",
) -> dict[str, Any]:
    """Create a complete 1-click downloadable Engine Import Bundle (.zip) containing
    Diffuse/Normal/Emissive atlases, Godot 4 .tres, Unity 6 .json, Aseprite .json,
    7 Paper-Doll layers, 4 Greyscale masks, animation strips, and world maps."""
    output_dir.mkdir(parents=True, exist_ok=True)
    final_zip = output_dir / zip_name
    tmp_zip = output_dir / f".tmp-{zip_name}"

    root_files = (
        "forge-manifest.json",
        "forge-atlas-diffuse.png",
        "forge-atlas-normal.png",
        "forge-atlas-emissive.png",
        "forge-sprites.godot.tres",
        "forge-atlas.unity.json",
        "forge-atlas.aseprite.json",
        "hero-master-still.png",
        "hero-master-damaged.png",
        "hero-master-normal.png",
        "hero-master-specular.png",
        "hero-master-emissive.png",
        "hero-chibi.png",
    )
    world_files = (
        "autotile-16-sheet.png",
        "autotile-map-preview.png",
        "parallax-stage-composite.png",
        "parallax-sky-far.png",
        "parallax-ruins-mid.png",
        "parallax-arena-ground.png",
    )

    readme_text = "\n".join(
        [
            f"Pixel Forge Engine Bundle — {unit_id}",
            "================================================",
            "1. Godot 4.x: Copy this folder into res://assets/ and assign forge-sprites.godot.tres to AnimatedSprite2D.",
            "   Attach forge-atlas-normal.png + forge-atlas-emissive.png inside a CanvasTexture for 2.5D lighting.",
            "2. Unity 6 (URP 2D): Import forge-atlas-diffuse.png (Filter Mode: Point, Compression: None, PPU: 16)",
            "   and bind Secondary Textures (_NormalMap, _EmissiveMap) per forge-atlas.unity.json.",
            "3. Aseprite / TexturePacker: Open forge-atlas-diffuse.png with forge-atlas.aseprite.json.",
            "4. Modular Paper-Doll: Concentric 64x64 + 96x96 layers are in layers/ and runtime tint masks in masks/.",
            "",
        ]
    )

    with zipfile.ZipFile(tmp_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README-IMPORT.txt", readme_text)
        for fname in root_files:
            fpath = output_dir / fname
            if fpath.exists():
                zf.write(fpath, arcname=fname)
        for p in sorted(output_dir.glob("layer-*.png")):
            zf.write(p, arcname=f"layers/{p.name}")
        for p in sorted(output_dir.glob("mask-*.png")):
            zf.write(p, arcname=f"masks/{p.name}")
        for p in sorted(output_dir.glob("clip-*-strip.png")):
            zf.write(p, arcname=f"clips/{p.name}")
        for fname in world_files:
            fpath = output_dir / fname
            if fpath.exists():
                zf.write(fpath, arcname=f"world/{fname}")

    tmp_zip.replace(final_zip)
    return {
        "file": zip_name,
        "sizeBytes": final_zip.stat().st_size,
    }
