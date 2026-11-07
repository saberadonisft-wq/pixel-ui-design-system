"""16-Tile Wang Autotile, Parallax Battle Stage, 2.5D Normal Maps & Multi-Map Atlas Packer."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from .grid_cleaner import chroma_key_cielab, extract_palette
from .schema import ForgeProjectSpec, TilesetSpec


def build_wang_autotile_16(spec: TilesetSpec) -> dict[str, Any]:
    """Generate a 16-variant Wang/Blob autotile sheet (64x64, 4x4 of 16x16 tiles) and a 160x96 map preview."""
    ts = spec.tile_size
    sheet = Image.new("RGBA", (ts * 4, ts * 4), (0, 0, 0, 0))

    # Disciplined 8-color Obsidian Sanctum stone + gold/cyan rune palette
    void_bg = (14, 18, 28, 255)
    cliff_dark = (26, 34, 50, 255)
    stone_base = (44, 58, 82, 255)
    stone_mid = (68, 88, 118, 255)
    stone_light = (108, 136, 174, 255)
    rune_cyan = (68, 212, 236, 255)
    gold_trim = (218, 156, 48, 255)

    tiles: list[Image.Image] = []
    tile_meta: list[dict[str, Any]] = []

    for mask in range(16):
        # Bitmask: 1=North, 2=East, 4=South, 8=West neighbor present
        has_n = bool(mask & 1)
        has_e = bool(mask & 2)
        has_s = bool(mask & 4)
        has_w = bool(mask & 8)

        tile = Image.new("RGBA", (ts, ts), void_bg)
        draw = ImageDraw.Draw(tile)

        # Base stone interior
        x0 = 0 if has_w else 3
        x1 = ts - 1 if has_e else ts - 4
        y0 = 0 if has_n else 3
        y1 = ts - 1 if has_s else ts - 4

        draw.rectangle((x0, y0, x1, y1), fill=stone_base)
        draw.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=stone_mid)

        # Stepped brick mortar joints
        draw.rectangle((x0 + 2, 7, x1 - 2, 7), fill=cliff_dark)
        draw.rectangle((7, y0 + 2, 7, y1 - 2), fill=cliff_dark)

        # Exposed borders get top-left highlight or bottom-right shadow ledge
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

        # Full interior tile (mask == 15) gets an inlaid sanctum rune motif
        if mask == 15:
            draw.rectangle((6, 6, 9, 9), fill=rune_cyan)
            draw.rectangle((7, 7, 8, 8), fill=gold_trim)

        tiles.append(tile)
        col = mask % 4
        row = mask // 4
        sheet.paste(tile, (col * ts, row * ts))
        tile_meta.append(
            {
                "mask": mask,
                "binary": f"{mask:04b}",
                "neighbors": {
                    "N": has_n,
                    "E": has_e,
                    "S": has_s,
                    "W": has_w,
                },
                "sheetX": col * ts,
                "sheetY": row * ts,
            }
        )

    # Assemble a 10x6 tile (160x96) dungeon sanctuary room using the 16 Wang autotiles
    grid_layout = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
        "tileMeta": tile_meta,
    }


def build_parallax_battle_plate(spec: TilesetSpec) -> dict[str, Image.Image]:
    """Generate a 3-layer 160x96 HD-2D parallax battle stage with a disciplined 14-color palette."""
    w, h = spec.stage_width, spec.stage_height

    # Layer 1: Far astral sky & twin moons (opaque base)
    sky = Image.new("RGBA", (w, h), (12, 16, 28, 255))
    s_draw = ImageDraw.Draw(sky)
    s_draw.rectangle((0, 0, w - 1, 28), fill=(18, 24, 42, 255))
    s_draw.rectangle((0, 28, w - 1, 56), fill=(26, 36, 58, 255))
    # Stepped moon & stars
    s_draw.rectangle((116, 10, 134, 28), fill=(218, 168, 72, 255))
    s_draw.rectangle((118, 12, 130, 24), fill=(255, 224, 122, 255))
    for sx, sy in ((22, 12), (48, 18), (76, 10), (96, 22), (144, 16)):
        s_draw.rectangle((sx, sy, sx + 1, sy + 1), fill=(168, 236, 255, 255))

    # Layer 2: Midground ancient pillars & citadel silhouettes
    ruins = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(ruins)
    for px, ph in ((12, 42), (42, 34), (108, 36), (136, 44)):
        y_top = 66 - ph
        r_draw.rectangle((px, y_top, px + 14, 66), fill=(32, 44, 68, 255))
        r_draw.rectangle((px + 2, y_top + 2, px + 6, 66), fill=(52, 70, 102, 255))
        r_draw.rectangle((px - 2, y_top, px + 16, y_top + 4), fill=(76, 98, 138, 255))
        # Glowing rune slot on pillar
        r_draw.rectangle((px + 6, y_top + 12, px + 8, y_top + 22), fill=(68, 212, 236, 255))

    # Layer 3: Foreground battle arena floor (Y=64..95)
    arena = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(arena)
    a_draw.rectangle((0, 64, w - 1, 67), fill=(108, 136, 174, 255))
    a_draw.rectangle((0, 68, w - 1, h - 1), fill=(38, 50, 74, 255))
    a_draw.rectangle((0, 74, w - 1, 88), fill=(52, 68, 96, 255))
    # Perspective floor tiles & golden sanctum trim
    for gx in range(8, w, 24):
        a_draw.rectangle((gx, 68, gx + 2, h - 1), fill=(26, 34, 50, 255))
    a_draw.rectangle((24, 78, w - 25, 80), fill=(218, 156, 48, 255))

    composite = sky.copy()
    composite.alpha_composite(ruins)
    composite.alpha_composite(arena)

    return {
        "skyFar": sky,
        "ruinsMid": ruins,
        "arenaGround": arena,
        "composite": composite,
    }


def generate_25d_lighting_maps(sprite: Image.Image) -> dict[str, Image.Image]:
    """Infer tangent-space Normal, Specular, and Emissive maps from sprite silhouette and luminance."""
    rgba = chroma_key_cielab(sprite)
    w, h = rgba.size
    px = rgba.load()

    normal_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    specular_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    emissive_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    n_px = normal_img.load()
    s_px = specular_img.load()
    e_px = emissive_img.load()

    def height_at(x: int, y: int) -> float:
        if x < 0 or x >= w or y < 0 or y >= h:
            return 0.0
        r, g, b, a = px[x, y]
        if a == 0:
            return 0.0
        luma = (r * 299 + g * 587 + b * 114) / 255000.0
        return 0.35 + 0.65 * luma

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue

            # Sobel-like height gradient from neighbors for crisp pixel bevel normals
            dz_dx = (height_at(x - 1, y) - height_at(x + 1, y)) * 1.8
            dz_dy = (height_at(x, y - 1) - height_at(x, y + 1)) * 1.8
            dz = 1.0
            length = math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy + dz * dz)
            nx = int(round(((dz_dx / length) * 0.5 + 0.5) * 255))
            ny = int(round(((dz_dy / length) * 0.5 + 0.5) * 255))
            nz = int(round(((dz / length) * 0.5 + 0.5) * 255))
            n_px[x, y] = (max(0, min(255, nx)), max(0, min(255, ny)), max(128, min(255, nz)), 255)

            luma = (r * 299 + g * 587 + b * 114) // 1000
            # Specular metallic response
            spec_val = 255 if luma >= 210 else (164 if luma >= 145 else 48)
            s_px[x, y] = (spec_val, spec_val, spec_val, 255)

            # Emissive mask for high-saturation bright runes/gem/blade energy
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            if max_c >= 210 and (max_c - min_c) >= 70:
                e_px[x, y] = (r, g, b, 255)
            else:
                e_px[x, y] = (16, 20, 28, 255)

    return {
        "normal": normal_img,
        "specular": specular_img,
        "emissive": emissive_img,
    }


def pack_multi_map_atlas(
    entries: list[dict[str, Any]],
    columns: int = 4,
    cell_size: tuple[int, int] = (96, 96),
) -> dict[str, Any]:
    """Pack diffuse, normal, and emissive frames into synchronized multi-map texture atlases."""
    cw, ch = cell_size
    rows = (len(entries) + columns - 1) // columns
    atlas_w = columns * cw
    atlas_h = max(1, rows) * ch

    diffuse_atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    normal_atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    emissive_atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))

    frames_meta: list[dict[str, Any]] = []
    seen_hashes: dict[bytes, dict[str, int]] = {}
    deduplicated_count = 0

    for idx, entry in enumerate(entries):
        col = idx % columns
        row = idx // columns
        dest_x = col * cw
        dest_y = row * ch

        img: Image.Image = entry["image"].convert("RGBA")
        # Center smaller sprites (e.g. 32x32 or 64x64) on integer offsets inside the cell
        ox = dest_x + (cw - img.width) // 2
        oy = dest_y + (ch - img.height) // 2

        raw_bytes = img.tobytes()
        if raw_bytes in seen_hashes:
            deduplicated_count += 1

        maps = generate_25d_lighting_maps(img)
        diffuse_atlas.paste(img, (ox, oy))
        normal_atlas.paste(maps["normal"], (ox, oy))
        emissive_atlas.paste(maps["emissive"], (ox, oy))

        alpha_bbox = img.getchannel("A").getbbox() or (0, 0, img.width, img.height)
        rect_info = {
            "x": ox,
            "y": oy,
            "w": img.width,
            "h": img.height,
        }
        seen_hashes.setdefault(raw_bytes, rect_info)

        frames_meta.append(
            {
                "id": entry["id"],
                "category": entry.get("category", "sprite"),
                "frame": rect_info,
                "trimmedSourceSize": {
                    "x": alpha_bbox[0],
                    "y": alpha_bbox[1],
                    "w": alpha_bbox[2] - alpha_bbox[0],
                    "h": alpha_bbox[3] - alpha_bbox[1],
                },
                "sourceSize": {"w": img.width, "h": img.height},
                "pivot": entry.get("pivot", {"x": img.width // 2, "y": img.height - 8}),
                "sockets": entry.get("sockets", []),
            }
        )

    return {
        "diffuseAtlas": diffuse_atlas,
        "normalAtlas": normal_atlas,
        "emissiveAtlas": emissive_atlas,
        "atlasWidth": atlas_w,
        "atlasHeight": atlas_h,
        "deduplicatedFrames": deduplicated_count,
        "frames": frames_meta,
    }


def export_engine_manifests(
    spec: ForgeProjectSpec,
    atlas_bundle: dict[str, Any],
    output_dir: Path,
) -> dict[str, str]:
    """Write Aseprite JSON, Godot 4 .tres, and Unity 6 / TexturePacker JSON manifests."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Aseprite JSON Array/Hash format
    aseprite_json = {
        "frames": {
            f["id"]: {
                "frame": f["frame"],
                "rotated": False,
                "trimmed": True,
                "spriteSourceSize": f["trimmedSourceSize"],
                "sourceSize": f["sourceSize"],
                "duration": 125,
            }
            for f in atlas_bundle["frames"]
        },
        "meta": {
            "app": "https://github.com/pixel-ui-design-system/pixel-forge",
            "version": "1.0.0",
            "image": "forge-atlas-diffuse.png",
            "normalMap": "forge-atlas-normal.png",
            "emissiveMap": "forge-atlas-emissive.png",
            "format": "RGBA8888",
            "size": {"w": atlas_bundle["atlasWidth"], "h": atlas_bundle["atlasHeight"]},
            "scale": "1",
        },
    }
    aseprite_path = output_dir / "forge-atlas.aseprite.json"
    aseprite_path.write_text(json.dumps(aseprite_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 2. Unity 6 / TexturePacker JSON with Pivots & Weapon Sockets
    unity_json = {
        "schema": "unity-6-2d-sprite-atlas-v1",
        "textures": {
            "diffuse": "forge-atlas-diffuse.png",
            "normalMap": "_NormalMap:forge-atlas-normal.png",
            "maskMap": "_EmissiveMap:forge-atlas-emissive.png",
        },
        "pixelsPerUnit": 16,
        "filterMode": "Point",
        "sprites": [
            {
                "name": f["id"],
                "rect": f["frame"],
                "pivot": f["pivot"],
                "sockets": f["sockets"],
            }
            for f in atlas_bundle["frames"]
        ],
    }
    unity_path = output_dir / "forge-atlas.unity.json"
    unity_path.write_text(json.dumps(unity_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 3. Godot 4 SpriteFrames .tres resource
    godot_lines = [
        '[gd_scene load_steps=3 format=3 uid="uid://pixel_forge_paladin_knight_ssr"]',
        "",
        '[ext_resource type="Texture2D" path="res://assets/pixel-forge/generated/forge-atlas-diffuse.png" id="1_diffuse"]',
        '[ext_resource type="Texture2D" path="res://assets/pixel-forge/generated/forge-atlas-normal.png" id="2_normal"]',
        "",
        "[resource]",
        'resource_name = "PaladinKnightSpriteFrames"',
        f"character_id = \"{spec.character.id}\"",
        f"foot_baseline_y = {spec.character.foot_baseline_y}",
        "animations = [",
    ]
    for clip in spec.clips:
        godot_lines.append(
            f'  {{ "name": &"{clip.id}", "speed": {clip.fps}.0, "loop": {str(clip.loop).lower()}, '
            f'"frames": {clip.frames}, "hit_stop_ms": {clip.timing.hit_stop_ms} }},'
        )
    godot_lines.append("]")
    godot_path = output_dir / "forge-sprites.godot.tres"
    godot_path.write_text("\n".join(godot_lines) + "\n", encoding="utf-8")

    return {
        "aseprite": aseprite_path.name,
        "unity": unity_path.name,
        "godot": godot_path.name,
    }
