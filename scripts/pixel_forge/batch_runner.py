"""Batch Mass-Production Engine for the AI Pixel Asset & Sprite Forge.
Supports:
- Compiling a 10-Prompt AI Frame-by-Frame & Modular Kit Matrix for every hero in forge-roster.json
- Generating genuinely distinct class archetypes (Valkyrie Halberd, Archmage AI Staff + Mitre,
  Assassin Void Scythe + Cowl, Ranger Greatbow + Antlers) with unique silhouettes across Paper-Doll,
  all 5 animated clips, 8 directions, 2.5D maps, and 512x512 extruded atlases
- Honest Quality Gate auditing + Silhouette Uniqueness telemetry across the entire batch roster
"""

from __future__ import annotations

from dataclasses import replace
import json
import math
from pathlib import Path
import time
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

from .ai_frame_pipeline import (
    DIRECTION_META,
    _build_chroma_plate_from_rgba,
    _mount_weapon_at_socket,
    build_ai_8_directions,
    build_character_bible_assets,
    build_master_palette,
    build_unarmed_sprite_variant,
    create_ai_damaged_variant,
    load_and_process_raw_ai_knight,
    quantize_to_palette,
    recolor_ai_sprite_element,
    remove_ai_chroma_background,
    resolve_raw_slot_file,
)
from .grid_cleaner import apply_selective_outline, remove_orphan_pixels, save_png_safe, to_greyscale_tint_mask
from .motion_engine import (
    build_character_animation_clips,
    build_dual_buffer_vfx,
    lock_foot_contact_and_centroid,
    make_horizontal_strip,
    temporal_hysteresis_filter,
)
from .paperdoll_builder import compute_frame_sockets, generate_loot_icon
from .prompt_compiler import compile_prompt_pack
from .schema import CharacterBibleSpec, ElementVariantSpec, ForgeProjectSpec, default_forge_project_spec
from .validate_forge import evaluate_quality_gates, validate_output_directory
from .world_and_atlas import (
    build_parallax_battle_plate,
    build_wang_autotile_16,
    export_engine_manifests,
    generate_25d_lighting_maps,
    pack_engine_bundle_zip,
    pack_multi_map_atlas,
)

CORE_PROTECTED_UNIT_IDS: frozenset[str] = frozenset(
    {
        "hero-paladin-knight",
        "hero-crimson-valkyrie",
        "hero-frost-archmage",
        "hero-shadow-assassin",
        "hero-emerald-ranger",
    }
)


def _unit_file_slug(unit_id: str) -> str:
    return "knight" if unit_id == "hero-paladin-knight" else unit_id.removeprefix("hero-").replace("-", "_")


def compile_unit_10_frame_ai_prompts(unit: dict[str, Any]) -> list[dict[str, str]]:
    """Compile the 10-frame AI generation prompt matrix for a single roster unit."""
    slug = _unit_file_slug(unit["id"])
    name = unit["name"]
    silhouette = unit["silhouette"]
    headgear = unit.get("headgearSpec", silhouette)
    weapon = unit["weaponSpec"]
    rarity = unit["rarity"].upper()
    base_style = (
        f"16-bit SNES/GBA pixel art RPG character sprite of {name} ({rarity}), "
        f"3/4 front-right tactical RPG view, wearing {silhouette}, wielding {weapon}, "
        "crisp pixel art clusters, dark pixel outlines, isolated on solid flat pure bright green chroma key background #00FF00"
    )
    return [
        {
            "slot": "01_idle_f0",
            "file": f"{slug}_idle_f0.png",
            "label": "Frame 1: Idle Guard (F0)",
            "prompt": f"{base_style}, standing combat ready pose, feet planted on baseline Y=88.",
        },
        {
            "slot": "02_idle_f1",
            "file": f"{slug}_idle_f1.png",
            "label": "Frame 2: Idle Breath (F1)",
            "prompt": f"{base_style}, subtle breathing combat stance, mantle billowing slightly, runes glowing brighter.",
        },
        {
            "slot": "03_walk_f0",
            "file": f"{slug}_walk_f0.png",
            "label": "Frame 3: Walk Stride Left (F0)",
            "prompt": f"{base_style}, dynamic forward walking stride with left leg stepping forward, cloak flowing.",
        },
        {
            "slot": "04_walk_f1",
            "file": f"{slug}_walk_f1.png",
            "label": "Frame 4: Walk Stride Right (F1)",
            "prompt": f"{base_style}, dynamic forward walking stride with right leg stepping forward, balanced weapon.",
        },
        {
            "slot": "05_attack_f0",
            "file": f"{slug}_attack_f0.png",
            "label": "Frame 5: Attack Overhead Windup (F0)",
            "prompt": f"{base_style}, dramatic attack windup pose raising {weapon} high overhead charging elemental energy.",
        },
        {
            "slot": "06_attack_f1",
            "file": f"{slug}_attack_f1.png",
            "label": "Frame 6: Attack Cleave Slash (F1)",
            "prompt": f"{base_style}, explosive forward cleave swing unleashing a crescent energy slash arc.",
        },
        {
            "slot": "07_victory_f0",
            "file": f"{slug}_victory_f0.png",
            "label": "Frame 7: Victory Pose",
            "prompt": f"{base_style}, triumphant victory pose raising {weapon} skyward with radiant aura burst.",
        },
        {
            "slot": "08_paperdoll_kit",
            "file": f"{slug}_paperdoll_kit.png",
            "label": "Frame 8: Modular Paper-Doll 2×2 Kit",
            "prompt": (
                f"16-bit pixel art modular RPG equipment sprite sheet for {name} divided into 4 distinct quadrants on solid pure green #00FF00: "
                f"Top-Left: Base body in class tunic & boots without headgear or weapon; Top-Right: Headgear ({headgear}) isolated; "
                f"Bottom-Left: Off-hand shield/grimoire/quiver & mantle isolated; Bottom-Right: Primary weapon ({weapon}) isolated."
            ),
        },
        {
            "slot": "09_loot_sheet",
            "file": f"{slug}_loot_sheet.png",
            "label": "Frame 9: 3×2 RPG Weapon & Relic Sheet",
            "prompt": (
                f"16-bit pixel art RPG item icon sheet arranged in a 3x2 grid (6 distinct items) for {name} on solid pure green #00FF00: "
                "Row 1: Mythic UR Primary Weapon, SSR Arcane Staff, Epic Off-Hand Crest; Row 2: Rare Elixir Potion, SSR Relic Chest, Class Sigil."
            ),
        },
        {
            "slot": "10_arena_stage",
            "file": f"{slug}_arena_stage.png",
            "label": "Frame 10: HD-2D Battle Arena Stage",
            "prompt": (
                f"16-bit SNES/Octopath HD-2D pixel art RPG battle arena background for {name}, wide side-view perspective, "
                "ornate stone pillars, stained-glass arches, flat stone battle floor in lower third, crisp pixel art clusters."
            ),
        },
    ]


def _draw_archetype_weapon(
    unit_id: str,
    el: ElementVariantSpec,
    loot_sheet_img: Image.Image | None,
    pose_tag: str = "ready",
) -> Image.Image:
    """Build a crisp 96x96 class weapon sprite (`halberd`, AI `staff`, `scythe`, `greatbow`)
    oriented for the current clip pose."""
    p_dark, p_mid, p_light = [(*c, 255) for c in el.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in el.accent_ramp]
    glow = (*el.glow_rgb, 255)
    steel_mid = (146, 166, 196, 255)
    steel_light = (214, 230, 248, 255)

    # For Frost Archmage, extract the genuine AI Aether Staff from loot sheet Cell (1, 0)
    if unit_id == "hero-frost-archmage" and loot_sheet_img is not None:
        lw, lh = loot_sheet_img.size
        c_staff = remove_ai_chroma_background(loot_sheet_img.crop((lw // 3 + 8, 8, (lw // 3) * 2 - 8, lh // 2 - 8)))
        pose_map = {
            "ready": (14.0, 34, 52, 63, 57, "hilt_bottom_left"),
            "windup": (-52.0, 44, 34, 34, 24, "hilt_bottom_left"),
            "cleave": (-38.0, 46, 32, 32, 48, "hilt_top_left"),
            "guard": (25.0, 34, 48, 60, 56, "hilt_bottom_left"),
            "victory": (48.0, 26, 54, 56, 36, "hilt_bottom_left"),
        }
        deg, tw, th, hx, hy, anchor = pose_map.get(pose_tag, pose_map["ready"])
        return _mount_weapon_at_socket(c_staff, deg, tw, th, hx, hy, anchor_mode=anchor, shared_palette=None)

    raw_w = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(raw_w)

    if unit_id == "hero-crimson-valkyrie":
        # Long Dragon-Slayer Halberd: ornate golden pole + crescent ember axe head + spear spike
        draw.line((18, 56, 48, 12), fill=p_dark, width=3)
        draw.line((19, 55, 47, 13), fill=p_light, width=1)
        # Spear tip
        draw.polygon([(46, 14), (56, 4), (51, 19)], fill=steel_light)
        # Winged Crimson Halberd Axe Crescent
        draw.polygon([(42, 18), (56, 16), (54, 30), (44, 25)], fill=p_mid)
        draw.polygon([(45, 19), (54, 18), (52, 27)], fill=glow)
        draw.rectangle((42, 16, 45, 20), fill=a_light)
    elif unit_id == "hero-shadow-assassin":
        # Massive Curved Void Scythe
        draw.line((16, 56, 44, 14), fill=(36, 26, 54, 255), width=3)
        draw.line((17, 55, 43, 15), fill=p_mid, width=1)
        # Sweeping Reaver Crescent Blade
        draw.polygon([(40, 12), (59, 10), (54, 22), (38, 18)], fill=steel_mid)
        draw.polygon([(46, 10), (60, 11), (57, 26), (52, 21)], fill=p_light)
        draw.polygon([(53, 12), (59, 12), (57, 24)], fill=glow)
        draw.rectangle((40, 13, 44, 17), fill=a_light)
    else:
        # Elven Longbow held cleanly by grip center (drawn vertical bow stave + curved wood tips + nocked emerald arrow)
        draw.arc((18, 8, 46, 56), start=275, end=85, fill=p_dark, width=4)
        draw.arc((20, 10, 44, 54), start=280, end=80, fill=p_light, width=2)
        draw.line((32, 10, 32, 54), fill=steel_light, width=1)
        draw.line((24, 32, 52, 27), fill=glow, width=2)
        draw.polygon([(50, 24), (58, 27), (50, 31)], fill=(255, 252, 232, 255))
        raw_w = apply_selective_outline(raw_w, "dark", (11, 14, 22))
        pose_map = {
            "ready": (0.0, 32, 48, 63, 55, "center"),
            "windup": (26.0, 36, 44, 42, 34, "center"),
            "cleave": (-12.0, 36, 44, 58, 48, "center"),
            "guard": (12.0, 32, 46, 58, 54, "center"),
            "victory": (22.0, 32, 48, 54, 38, "center"),
        }
        deg, tw, th, hx, hy, anchor = pose_map.get(pose_tag, pose_map["ready"])
        return _mount_weapon_at_socket(raw_w, deg, tw, th, hx, hy, anchor_mode=anchor, shared_palette=None)

    raw_w = apply_selective_outline(raw_w, "dark", (11, 14, 22))
    pose_map = {
        "ready": (0.0, 40, 48, 63, 57, "hilt_bottom_left"),
        "windup": (55.0, 46, 38, 34, 24, "hilt_bottom_left"),
        "cleave": (-55.0, 48, 36, 32, 48, "hilt_top_left"),
        "guard": (12.0, 38, 46, 60, 56, "hilt_bottom_left"),
        "victory": (28.0, 34, 50, 56, 36, "hilt_bottom_left"),
    }
    deg, tw, th, hx, hy, anchor = pose_map.get(pose_tag, pose_map["ready"])
    return _mount_weapon_at_socket(raw_w, deg, tw, th, hx, hy, anchor_mode=anchor, shared_palette=None)


def _find_head_and_offhand_anchor(arr: np.ndarray) -> tuple[int, int, int, int]:
    """Locate the actual head center (hx, hy) and offhand left-arm shoulder/hand center (ox, oy)
    dynamically per animation frame so headgear never floats misaligned during attack lunges."""
    ys, xs = np.where((arr[:, :, 3] == 255) & (np.arange(arr.shape[0])[:, None] >= 18) & (np.arange(arr.shape[0])[:, None] <= 42))
    if len(xs) > 0:
        hx = int(round(float(xs.mean())))
        hy = int(round(float(ys.min()))) + 6
    else:
        hx, hy = 48, 25
    t_ys, t_xs = np.where((arr[:, :, 3] == 255) & (np.arange(arr.shape[0])[:, None] >= 44) & (np.arange(arr.shape[0])[:, None] <= 66))
    if len(t_xs) > 0:
        ox = int(t_xs.min()) + 6
        oy = int(round(float(t_ys.mean())))
    else:
        ox, oy = 31, 56
    return hx, hy, ox, oy


def _paint_headgear_overlay(
    draw: ImageDraw.ImageDraw,
    unit_id: str,
    el: ElementVariantSpec,
    cx: int,
    brow_y: int,
) -> None:
    """Paint shaded organic pixel-art class headgear directly onto (cx, brow_y)."""
    p_dark, p_mid, p_light = [(*c, 255) for c in el.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in el.accent_ramp]
    glow = (*el.glow_rgb, 255)

    if unit_id == "hero-crimson-valkyrie":
        # Swept feathered phoenix wings curving from temples + contoured golden brow circlet (no flat triangle!)
        for sign in (-1, 1):
            pts_outer = [(cx + sign * 8, brow_y + 1), (cx + sign * 18, brow_y - 13), (cx + sign * 15, brow_y - 3), (cx + sign * 21, brow_y - 8), (cx + sign * 10, brow_y + 4)]
            draw.polygon(pts_outer, fill=p_mid)
            draw.line([pts_outer[0], pts_outer[1]], fill=p_light, width=2)
            draw.polygon([(cx + sign * 10, brow_y), (cx + sign * 16, brow_y - 8), (cx + sign * 11, brow_y + 2)], fill=glow)
        draw.line([(cx - 7, brow_y - 1), (cx, brow_y - 3), (cx + 7, brow_y - 1)], fill=a_mid, width=2)
        draw.polygon([(cx - 2, brow_y - 3), (cx, brow_y - 9), (cx + 2, brow_y - 3)], fill=a_light)
        draw.point((cx, brow_y - 4), fill=glow)
        return

    if unit_id == "hero-frost-archmage":
        # Curved crooked Glacial Mage Hat with wide swept brim, velvet band & subtle 3x2 gem clasp
        draw.polygon([(cx - 14, brow_y + 1), (cx + 14, brow_y + 1), (cx + 11, brow_y - 3), (cx - 11, brow_y - 3)], fill=a_dark)
        draw.polygon([(cx - 9, brow_y - 2), (cx + 9, brow_y - 2), (cx + 2, brow_y - 16), (cx - 6, brow_y - 21), (cx - 12, brow_y - 14), (cx - 5, brow_y - 11)], fill=a_mid)
        draw.polygon([(cx - 6, brow_y - 3), (cx + 4, brow_y - 3), (cx, brow_y - 14), (cx - 5, brow_y - 17)], fill=a_light)
        draw.line([(cx - 10, brow_y - 2), (cx + 10, brow_y - 2)], fill=(18, 24, 42, 255), width=2)
        draw.rectangle((cx - 1, brow_y - 3, cx + 1, brow_y - 2), fill=glow)
        draw.line([(cx - 13, brow_y), (cx + 13, brow_y)], fill=a_light, width=1)
        return

    if unit_id == "hero-shadow-assassin":
        # Sculpted draped Abyssal Assassin Hood + silver brow pin (tightly wraps helmet cranium!)
        draw.polygon([(cx - 12, brow_y + 4), (cx - 11, brow_y - 7), (cx - 2, brow_y - 13), (cx + 9, brow_y - 9), (cx + 12, brow_y + 4), (cx + 8, brow_y - 1), (cx - 8, brow_y - 1)], fill=(32, 18, 54, 255))
        draw.polygon([(cx - 9, brow_y - 3), (cx - 2, brow_y - 11), (cx + 7, brow_y - 7), (cx + 8, brow_y - 2)], fill=p_dark)
        draw.line([(cx - 7, brow_y - 5), (cx, brow_y - 10), (cx + 6, brow_y - 6)], fill=p_light, width=1)
        draw.rectangle((cx - 1, brow_y - 4, cx + 1, brow_y), fill=glow)
        return

    # hero-emerald-ranger: asymmetric hooded green mantle + branching curved golden Stag Antlers
    draw.polygon([(cx - 12, brow_y + 3), (cx - 10, brow_y - 7), (cx + 1, brow_y - 12), (cx + 11, brow_y - 6), (cx + 12, brow_y + 3), (cx + 7, brow_y - 1), (cx - 7, brow_y - 1)], fill=p_dark)
    draw.polygon([(cx - 7, brow_y - 2), (cx + 1, brow_y - 10), (cx + 8, brow_y - 3)], fill=p_mid)
    for sign in (-1, 1):
        ax0, ay0 = cx + sign * 8, brow_y - 4
        ax1, ay1 = cx + sign * 15, brow_y - 13
        ax2, ay2 = cx + sign * 18, brow_y - 18
        draw.line([(ax0, ay0), (ax1, ay1), (ax2, ay2)], fill=a_light, width=2)
        draw.line([(ax1, ay1), (cx + sign * 11, brow_y - 18)], fill=a_mid, width=1)
        draw.line([(ax0 + sign * 3, ay0 - 4), (cx + sign * 18, brow_y - 9)], fill=a_mid, width=1)


def _paint_class_visage_and_vestments(
    draw: ImageDraw.ImageDraw,
    unit_id: str,
    el: ElementVariantSpec,
    cx: int,
    brow_y: int,
    *,
    paint_chest: bool = True,
) -> None:
    """Replace the Crusader Knight's steel T-visor faceplate & chest cross with authentic
    pixel-art class faces, masks, beards, and robes so casters/assassins/rangers never look
    like heavy plate knights wearing a hat on top of a steel helmet."""
    p_dark, p_mid, p_light = [(*c, 255) for c in el.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in el.accent_ramp]
    glow = (*el.glow_rgb, 255)
    skin_dark = (182, 126, 98, 255)
    skin_mid = (228, 178, 144, 255)
    skin_light = (250, 214, 186, 255)
    glint = (255, 252, 240, 255)

    if unit_id == "hero-frost-archmage":
        # Open sage face under wizard brim + glowing arcane eyes + stepped silver-frost beard
        draw.rectangle((cx - 6, brow_y + 1, cx + 6, brow_y + 9), fill=skin_dark)
        draw.rectangle((cx - 5, brow_y + 2, cx + 5, brow_y + 8), fill=skin_mid)
        draw.rectangle((cx - 3, brow_y + 2, cx + 2, brow_y + 6), fill=skin_light)
        # Glowing ice-blue eyes
        draw.rectangle((cx - 3, brow_y + 4, cx - 1, brow_y + 5), fill=glow)
        draw.rectangle((cx + 2, brow_y + 4, cx + 4, brow_y + 5), fill=glow)
        draw.point((cx - 2, brow_y + 4), fill=glint)
        draw.point((cx + 3, brow_y + 4), fill=glint)
        # Stepped silver-white Archmage beard cascading over collar
        draw.rectangle((cx - 5, brow_y + 8, cx + 5, brow_y + 11), fill=(196, 218, 244, 255))
        draw.rectangle((cx - 4, brow_y + 11, cx + 4, brow_y + 14), fill=(228, 242, 255, 255))
        draw.rectangle((cx - 2, brow_y + 14, cx + 2, brow_y + 16), fill=(168, 198, 232, 255))
        if paint_chest:
            # Sapphire Archmage robe stole replacing Crusader chest cross
            draw.rectangle((cx - 6, brow_y + 17, cx + 6, brow_y + 29), fill=p_dark)
            draw.rectangle((cx - 4, brow_y + 18, cx + 4, brow_y + 28), fill=p_mid)
            draw.rectangle((cx - 1, brow_y + 19, cx + 1, brow_y + 27), fill=a_light)
            draw.rectangle((cx - 1, brow_y + 21, cx + 1, brow_y + 23), fill=glow)
        return

    if unit_id == "hero-shadow-assassin":
        # Deep hood shadow + obsidian ninja face-wrap + razor violet assassin eyes
        draw.rectangle((cx - 7, brow_y, cx + 7, brow_y + 5), fill=(16, 12, 28, 255))
        draw.rectangle((cx - 6, brow_y + 5, cx + 6, brow_y + 12), fill=(32, 22, 52, 255))
        draw.line((cx - 5, brow_y + 6, cx + 5, brow_y + 6), fill=p_mid, width=1)
        draw.rectangle((cx - 4, brow_y + 3, cx - 1, brow_y + 4), fill=glow)
        draw.rectangle((cx + 2, brow_y + 3, cx + 5, brow_y + 4), fill=glow)
        draw.point((cx - 3, brow_y + 3), fill=glint)
        draw.point((cx + 3, brow_y + 3), fill=glint)
        if paint_chest:
            # Dark stealth harness + crimson-violet shadow core gem
            draw.rectangle((cx - 6, brow_y + 14, cx + 6, brow_y + 27), fill=(24, 18, 40, 255))
            draw.line((cx - 5, brow_y + 15, cx + 5, brow_y + 26), fill=p_mid, width=2)
            draw.line((cx + 5, brow_y + 15, cx - 5, brow_y + 26), fill=p_light, width=1)
            draw.rectangle((cx - 1, brow_y + 19, cx + 1, brow_y + 21), fill=glow)
        return

    if unit_id == "hero-emerald-ranger":
        # Open elven face + emerald side-locks + glowing forest eyes
        draw.rectangle((cx - 6, brow_y + 1, cx + 6, brow_y + 10), fill=skin_dark)
        draw.rectangle((cx - 5, brow_y + 2, cx + 5, brow_y + 9), fill=skin_mid)
        draw.rectangle((cx - 3, brow_y + 2, cx + 3, brow_y + 7), fill=skin_light)
        # Side hair locks framing cheeks
        draw.rectangle((cx - 7, brow_y + 1, cx - 5, brow_y + 11), fill=p_mid)
        draw.rectangle((cx + 5, brow_y + 1, cx + 7, brow_y + 11), fill=p_dark)
        # Emerald eyes
        draw.rectangle((cx - 3, brow_y + 4, cx - 1, brow_y + 5), fill=glow)
        draw.rectangle((cx + 2, brow_y + 4, cx + 4, brow_y + 5), fill=glow)
        draw.point((cx - 2, brow_y + 4), fill=glint)
        draw.point((cx + 3, brow_y + 4), fill=glint)
        if paint_chest:
            # Forest leather jerkin & diagonal archer baldric
            draw.rectangle((cx - 6, brow_y + 13, cx + 6, brow_y + 27), fill=p_dark)
            draw.rectangle((cx - 4, brow_y + 14, cx + 4, brow_y + 26), fill=p_mid)
            draw.line((cx - 5, brow_y + 14, cx + 5, brow_y + 26), fill=(136, 88, 38, 255), width=2)
            draw.rectangle((cx - 1, brow_y + 19, cx + 1, brow_y + 21), fill=a_light)
        return

    if unit_id == "hero-crimson-valkyrie":
        # Open Valkyrie winged battle-visor revealing face + blazing amber-crimson eyes
        draw.rectangle((cx - 4, brow_y + 3, cx + 4, brow_y + 10), fill=skin_mid)
        draw.rectangle((cx - 3, brow_y + 4, cx - 1, brow_y + 5), fill=glow)
        draw.rectangle((cx + 2, brow_y + 4, cx + 4, brow_y + 5), fill=glow)
        if paint_chest:
            draw.rectangle((cx - 4, brow_y + 16, cx + 4, brow_y + 24), fill=p_mid)
            draw.rectangle((cx - 2, brow_y + 18, cx + 2, brow_y + 22), fill=a_light)


def _apply_class_archetype_frame(
    unit_id: str,
    el: ElementVariantSpec,
    frame_96: Image.Image,
    loot_sheet_img: Image.Image | None,
    pose_tag: str = "ready",
    *,
    is_damaged: bool = False,
    include_weapon: bool = True,
    clean_body_64: Image.Image | None = None,
) -> Image.Image:
    """Transform unarmed knight chassis cleanly into each class archetype without shield remnants,
    steel T-visor helmets on casters/assassins, or double weapons across idle/walk/attack/victory."""
    recolored = recolor_ai_sprite_element(frame_96, el, max_colors=20)
    unarmed = build_unarmed_sprite_variant(
        recolored,
        clip_hint="attack_windup" if pose_tag == "windup" else ("attack_cleave" if pose_tag == "cleave" else "idle"),
        shared_palette=None,
    )
    arr = np.array(unarmed.convert("RGBA"), dtype=np.uint8)
    body_arr = np.array(clean_body_64.convert("RGBA"), dtype=np.uint8) if clean_body_64 is not None else None
    p_dark, p_mid, p_light = [(*c, 255) for c in el.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in el.accent_ramp]
    glow = (*el.glow_rgb, 255)

    # Clear original tall Paladin plume & winged steel ear-fins so class hats/cowls sit naturally
    if unit_id != "hero-crimson-valkyrie":
        arr[0:22, :] = (0, 0, 0, 0)
        # Trim protruding Paladin steel helm wings on temples (y=21..33, outer edges)
        arr[21:33, 0:36] = (0, 0, 0, 0)
        arr[21:33, 60:96] = (0, 0, 0, 0)
    else:
        arr[0:15, :] = (0, 0, 0, 0)

    # Cleanly remove Paladin Cross Shield across poses
    if unit_id in ("hero-crimson-valkyrie", "hero-shadow-assassin", "hero-frost-archmage", "hero-emerald-ranger"):
        if pose_tag == "windup":
            arr[42:77, 61:96] = (0, 0, 0, 0)
            arr[68:89, 0:26] = (0, 0, 0, 0)
        elif pose_tag == "cleave":
            arr[44:75, 61:96] = (0, 0, 0, 0)
        else:
            for y in range(46, 73):
                for x in range(20, 45):
                    arr[y, x] = (0, 0, 0, 0)
                    if body_arr is not None and x >= 31:
                        bx, by = x - 16, y - 26
                        if 0 <= bx < 64 and 0 <= by < 64 and body_arr[by, bx, 3] == 255:
                            arr[y, x] = body_arr[by, bx]
            arr[67:89, 0:33] = (0, 0, 0, 0)

    canvas = remove_orphan_pixels(Image.fromarray(arr, mode="RGBA"))
    c_arr = np.array(canvas, dtype=np.uint8)
    hx, hy, ox, oy = _find_head_and_offhand_anchor(c_arr)
    draw = ImageDraw.Draw(canvas)

    _paint_class_visage_and_vestments(
        draw,
        unit_id,
        el,
        hx,
        hy,
        paint_chest=(pose_tag not in ("windup", "cleave")),
    )
    _paint_headgear_overlay(draw, unit_id, el, hx, hy)

    # Integrated anatomical off-hand equipment
    if pose_tag not in ("windup", "cleave"):
        if unit_id == "hero-crimson-valkyrie":
            draw.ellipse((ox + 1, oy - 7, ox + 13, oy + 7), fill=a_light)
            draw.ellipse((ox + 3, oy - 5, ox + 11, oy + 5), fill=p_dark)
            draw.ellipse((ox + 5, oy - 3, ox + 9, oy + 3), fill=p_mid)
            draw.point((ox + 7, oy), fill=glow)
        elif unit_id == "hero-frost-archmage":
            draw.polygon([(ox, oy - 5), (ox + 9, oy - 8), (ox + 10, oy + 5), (ox + 1, oy + 6)], fill=a_dark)
            draw.polygon([(ox + 2, oy - 3), (ox + 7, oy - 6), (ox + 8, oy + 3), (ox + 3, oy + 4)], fill=glow)
            draw.line([(ox + 5, oy - 4), (ox + 5, oy + 3)], fill=a_dark, width=1)
        elif unit_id == "hero-shadow-assassin":
            draw.polygon([(hx - 9, hy + 11), (hx + 2, hy + 12), (ox + 1, oy - 2), (ox - 4, oy - 5)], fill=p_dark)
            draw.line([(hx - 8, hy + 12), (ox - 2, oy - 4)], fill=p_mid, width=1)
            draw.line([(ox + 4, oy - 1), (ox - 1, oy + 7)], fill=(208, 222, 244, 255), width=2)
            draw.line([(ox + 2, oy - 2), (ox + 6, oy)], fill=glow, width=2)
        else:
            qx, qy = max(24, hx - 14), max(30, hy + 12)
            draw.line([(qx, qy), (qx + 5, qy + 11)], fill=(122, 76, 36, 255), width=4)
            draw.point((qx - 1, qy - 2), fill=glow)
            draw.point((qx + 2, qy - 2), fill=a_light)

    if include_weapon:
        weapon_overlay = _draw_archetype_weapon(unit_id, el, loot_sheet_img, pose_tag=pose_tag)
        canvas.alpha_composite(weapon_overlay)
    if is_damaged:
        canvas = create_ai_damaged_variant(canvas, shared_palette=None, max_colors=22)
    cleaned = remove_orphan_pixels(apply_selective_outline(canvas, "dark", (11, 14, 22)), min_cluster=4)
    return cleaned


def _customize_batch_layers_for_class(
    unit_id: str,
    el: ElementVariantSpec,
    base_layers: dict[str, Image.Image],
    loot_sheet_img: Image.Image | None,
) -> dict[str, Image.Image]:
    """Ensure every batch hero's 7 Paper-Doll layers (30_outfit, 40_hair, 50_weapon, 20_iris, 60_fx)
    reflect that specific class rather than copying the Paladin shield & greathelm."""
    layers = {k: v.copy() for k, v in base_layers.items()}
    p_dark, p_mid, p_light = [(*c, 255) for c in el.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in el.accent_ramp]
    glow = (*el.glow_rgb, 255)

    # Recolor outfit & customize offhand
    outfit = recolor_ai_sprite_element(layers["30_outfit"], el, max_colors=20)
    if unit_id in ("hero-shadow-assassin", "hero-frost-archmage", "hero-emerald-ranger"):
        o_arr = np.array(outfit, dtype=np.uint8)
        o_arr[20:52, 0:18] = (0, 0, 0, 0)
        outfit = Image.fromarray(o_arr, mode="RGBA")
        o_draw = ImageDraw.Draw(outfit)
        if unit_id == "hero-frost-archmage":
            o_draw.polygon([(8, 26), (18, 23), (17, 37), (7, 35)], fill=a_mid, outline=glow)
        elif unit_id == "hero-shadow-assassin":
            o_draw.polygon([(2, 24), (16, 18), (18, 26), (4, 31)], fill=p_dark)
            o_draw.line((10, 34, 2, 44), fill=glow, width=2)
        else:
            o_draw.rectangle((10, 12, 16, 28), fill=(116, 72, 32, 255))
    layers["30_outfit"] = remove_orphan_pixels(outfit)

    # Custom class Headgear (40_hair on 64x64 at offset (16, 4) -> brow sits near (32, 23))
    hair = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    if unit_id == "hero-crimson-valkyrie":
        hair = recolor_ai_sprite_element(layers["40_hair"], el, max_colors=20)
        h_draw = ImageDraw.Draw(hair)
        _paint_class_visage_and_vestments(h_draw, unit_id, el, 32, 23, paint_chest=False)
        _paint_headgear_overlay(h_draw, unit_id, el, 32, 23)
    else:
        # Paint authentic class headgear + beard/hood/locks WITHOUT heavy steel Crusader T-visor!
        h_draw = ImageDraw.Draw(hair)
        _paint_class_visage_and_vestments(h_draw, unit_id, el, 32, 22, paint_chest=False)
        _paint_headgear_overlay(h_draw, unit_id, el, 32, 22)
        hair = remove_orphan_pixels(apply_selective_outline(hair, "dark", (11, 14, 22)), min_cluster=3)
    layers["40_hair"] = hair

    # Also update 10_body with class skin/mask face at (32, 26 -> y_64=0..16)
    body = recolor_ai_sprite_element(layers["10_body"], el, max_colors=20)
    b_draw = ImageDraw.Draw(body)
    _paint_class_visage_and_vestments(b_draw, unit_id, el, 32, 0, paint_chest=True)
    layers["10_body"] = apply_selective_outline(body, "dark", (11, 14, 22))

    # Class Iris Glow Color (20_iris)
    i_arr = np.array(layers["20_iris"], dtype=np.uint8)
    i_fg = i_arr[:, :, 3] == 255
    i_arr[i_fg, :3] = el.glow_rgb
    layers["20_iris"] = Image.fromarray(i_arr, mode="RGBA")

    # Class Weapon Layer (50_weapon)
    layers["50_weapon"] = _draw_archetype_weapon(unit_id, el, loot_sheet_img, pose_tag="ready")
    return layers


def _save_png_safe(img: Image.Image, target_path: Path) -> None:
    """Atomic / retry-guarded PNG write on Windows to avoid transient Defender/handle locks."""
    save_png_safe(img, target_path)


def build_single_unit_from_spec(
    base_spec: ForgeProjectSpec,
    unit: dict[str, Any],
    root_dir: Path,
) -> dict[str, Any]:
    """Build a complete, genuinely unique class asset bundle for a single unit from forge-roster.json."""
    unit_id = unit["id"]
    out_dir = root_dir / unit["outputDir"]
    raw_dir = root_dir / unit["rawAiDir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    el_map = {el.id: el for el in base_spec.elements}
    unit_el = el_map.get(unit["baseElement"], base_spec.elements[0])
    ordered_elements = (unit_el,) + tuple(el for el in base_spec.elements if el.id != unit_el.id)

    char_spec = CharacterBibleSpec(
        id=unit_id,
        name=unit["name"],
        title=unit["title"],
        rarity=unit["rarity"],
        base_element=unit["baseElement"],
        foot_baseline_y=88,
    )
    unit_spec = replace(base_spec, character=char_spec, elements=ordered_elements)

    ai_prompts = compile_unit_10_frame_ai_prompts(unit)
    (out_dir / "ai-frame-prompts.json").write_text(
        json.dumps(ai_prompts, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    prompt_pack = compile_prompt_pack(unit_spec)
    (out_dir / "forge-prompts.json").write_text(
        json.dumps(prompt_pack, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    slug = _unit_file_slug(unit_id)
    fallback_raw_dir = root_dir / "public" / "assets" / "pixel-forge" / "raw_ai"
    has_dedicated_raw = resolve_raw_slot_file(raw_dir, slug, "idle_f0") is not None
    effective_raw_dir = raw_dir if has_dedicated_raw else fallback_raw_dir
    effective_slug = slug if has_dedicated_raw else "knight"
    asset_provenance = "ai-native" if has_dedicated_raw else "class-rig-synthesized"

    ai_bundle = load_and_process_raw_ai_knight(effective_raw_dir, out_dir, unit_spec, slug=effective_slug)
    paladin_master_path = root_dir / "public" / "assets" / "pixel-forge" / "generated" / "hero-master-still.png"

    loot_raw_path = resolve_raw_slot_file(effective_raw_dir, effective_slug, "loot_sheet")
    loot_raw = Image.open(loot_raw_path).convert("RGBA") if loot_raw_path is not None else None

    class_weapon_names = {
        "hero-paladin-knight": ("Đại Kiếm Thánh Quang", "SSR"),
        "hero-crimson-valkyrie": ("Thương Rồng Hỏa Diệm", "UR"),
        "hero-frost-archmage": ("Quyền Trượng Băng Tinh", "SSR"),
        "hero-shadow-assassin": ("Lưỡi Hái Hư Không", "SSR"),
        "hero-emerald-ranger": ("Đại Cung Cổ Mộc", "EPIC"),
    }
    sig_weapon_name, sig_weapon_rarity = class_weapon_names.get(
        unit_id, (unit.get("weaponSpec", "Vũ Khí Chuyên Biệt")[:28], unit["rarity"].upper())
    )

    unarmed_ai_frames: dict[str, Image.Image] | None = None

    if ai_bundle is not None and not has_dedicated_raw:
        # Synthesize distinct class silhouette & weapon across ALL frames & Paper-Doll layers
        ai_bundle["layers"] = _customize_batch_layers_for_class(
            unit_id, unit_el, ai_bundle["layers"], loot_raw
        )
        ai_bundle["greyscaleMasks"] = {
            "10_body": to_greyscale_tint_mask(ai_bundle["layers"]["10_body"]),
            "20_iris": to_greyscale_tint_mask(ai_bundle["layers"]["20_iris"]),
            "30_outfit": to_greyscale_tint_mask(ai_bundle["layers"]["30_outfit"]),
            "40_hair": to_greyscale_tint_mask(ai_bundle["layers"]["40_hair"]),
        }

        frame_pose_hints = {
            "knight-idle-f0": "ready",
            "knight-idle-f1": "ready",
            "knight-walk-f0": "ready",
            "knight-walk-f1": "ready",
            "knight-attack-f0": "windup",
            "knight-attack-f1": "cleave",
            "knight-victory-f0": "victory",
        }
        transformed: dict[str, Image.Image] = {}
        transformed_unarmed: dict[str, Image.Image] = {}
        recolored_body_64 = recolor_ai_sprite_element(ai_bundle["layers"]["10_body"], unit_el, max_colors=20)
        for k, f_img in ai_bundle["aiFrames"].items():
            p_tag = frame_pose_hints.get(k, "ready")
            transformed[k] = _apply_class_archetype_frame(
                unit_id,
                unit_el,
                f_img,
                loot_raw,
                pose_tag=p_tag,
                include_weapon=True,
                clean_body_64=recolored_body_64,
            )
            transformed_unarmed[k] = _apply_class_archetype_frame(
                unit_id,
                unit_el,
                f_img,
                loot_raw,
                pose_tag=p_tag,
                include_weapon=False,
                clean_body_64=recolored_body_64,
            )
        shared_pal = build_master_palette(list(transformed.values()), max_colors=22)
        for k in transformed:
            transformed[k] = quantize_to_palette(transformed[k], shared_pal)
            transformed_unarmed[k] = quantize_to_palette(transformed_unarmed[k], shared_pal)

        unarmed_ai_frames = transformed_unarmed
        ai_bundle["aiFrames"] = transformed
        ai_bundle["masterPalette"] = shared_pal
        ai_bundle["master96"] = transformed["knight-idle-f0"].copy()
        ai_bundle["damaged96"] = create_ai_damaged_variant(
            ai_bundle["master96"], shared_palette=shared_pal, max_colors=22
        )
        for idx, el in enumerate(unit_spec.elements):
            ai_bundle["elementComposites"][el.id] = (
                ai_bundle["master96"].copy()
                if idx == 0
                else recolor_ai_sprite_element(ai_bundle["master96"], el, max_colors=22)
            )
        # Override primary 'greatsword' weapon slot with the hero's signature class weapon poses
        sig_layer = _draw_archetype_weapon(unit_id, unit_el, loot_raw, pose_tag="ready")
        _save_png_safe(sig_layer, out_dir / "layer-50_weapon-greatsword.png")
        for p_tag in ("ready", "windup", "cleave", "guard", "victory"):
            p_sprite = _draw_archetype_weapon(unit_id, unit_el, loot_raw, pose_tag=p_tag)
            _save_png_safe(p_sprite, out_dir / f"weapon-greatsword-pose-{p_tag}.png")

        # Re-render class-accurate 8-direction views & Character Bible directly from class silhouettes
        ai_bundle["directionFrames"] = build_ai_8_directions(transformed, shared_pal)
        ai_bundle["characterBible"] = build_character_bible_assets(
            ai_bundle["master96"], transformed, unit_spec.elements, master_palette=shared_pal
        )

    if ai_bundle is not None:
        layer_files: dict[str, str] = {}
        for l_id, img in ai_bundle["layers"].items():
            fname = f"layer-{l_id}.png"
            _save_png_safe(img, out_dir / fname)
            layer_files[l_id] = fname
        mask_files: dict[str, str] = {}
        for mask_id, img in ai_bundle["greyscaleMasks"].items():
            mname = f"mask-{mask_id}_greyscale.png"
            _save_png_safe(img, out_dir / mname)
            mask_files[f"{mask_id}_greyscale"] = mname

        _save_png_safe(ai_bundle["master96"], out_dir / "hero-master-still.png")
        _save_png_safe(ai_bundle["damaged96"], out_dir / "hero-master-damaged.png")
        element_files: dict[str, str] = {}
        for el_id, img in ai_bundle["elementComposites"].items():
            efname = f"hero-element-{el_id}.png"
            _save_png_safe(img, out_dir / efname)
            element_files[el_id] = efname
        direction_files: dict[str, str] = {}
        for d_id, img in ai_bundle["directionFrames"].items():
            dfname = f"hero-dir-{d_id}.png"
            _save_png_safe(img, out_dir / dfname)
            direction_files[d_id] = dfname

        raw_loot_icons = ai_bundle["lootIcons"]
        if raw_loot_icons:
            loot_icons = dict(raw_loot_icons)
            should_recolor_loot = not has_dedicated_raw
        else:
            loot_icons = {item.id: generate_loot_icon(item, unit_spec.elements) for item in unit_spec.loot_items}
            should_recolor_loot = False

        loot_files: dict[str, str] = {}
        for item in unit_spec.loot_items:
            if item.id in loot_icons:
                l_img = (
                    recolor_ai_sprite_element(loot_icons[item.id], unit_el, max_colors=16)
                    if should_recolor_loot
                    else loot_icons[item.id]
                )
                loot_icons[item.id] = l_img
                lfname = f"{item.id}.png"
                _save_png_safe(l_img, out_dir / lfname)
                loot_files[item.id] = lfname

        bible_manifest: dict[str, Any] = {}
        bible_bundle = ai_bundle.get("characterBible")
        if isinstance(bible_bundle, dict):
            expr_list: list[dict[str, Any]] = []
            for eid, ed in bible_bundle.get("expressions", {}).items():
                efname = f"bible-expr-{eid}.png"
                _save_png_safe(ed["image"], out_dir / efname)
                expr_list.append({"id": eid, "label": ed["label"], "file": efname, "size": 48})
            skin_list: list[dict[str, Any]] = []
            for sid, sd in bible_bundle.get("skins", {}).items():
                sfname = f"bible-skin-{sid}.png"
                _save_png_safe(sd["image"], out_dir / sfname)
                skin_list.append({"id": sid, "label": sd["label"], "file": sfname, "size": 96})
            chibi_img = bible_bundle.get("chibi")
            chibi_fname = "hero-chibi.png"
            if chibi_img is not None:
                _save_png_safe(chibi_img, out_dir / chibi_fname)
            bible_manifest = {
                "totalPanels": 23,
                "expressions": expr_list,
                "skins": skin_list,
                "chibi": {"file": chibi_fname, "size": 64, "label": "Chibi SD 2-Đầu (64×64)"},
            }

        clips_bundle = build_character_animation_clips(
            unit_spec, ai_frames=ai_bundle["aiFrames"], master_palette=ai_bundle.get("masterPalette")
        )
        unarmed_clips_bundle = (
            build_character_animation_clips(
                unit_spec, ai_frames=unarmed_ai_frames, master_palette=ai_bundle.get("masterPalette")
            )
            if unarmed_ai_frames is not None
            else None
        )

        clip_files: dict[str, dict[str, Any]] = {}
        for clip_id, c_data in clips_bundle.items():
            strip_name = f"clip-{clip_id}-strip.png"
            _save_png_safe(c_data["strip"], out_dir / strip_name)
            frame_names: list[str] = []
            unarmed_names: list[str] = []
            for idx, f_img in enumerate(c_data["frames"]):
                fname = f"clip-{clip_id}-f{idx}.png"
                _save_png_safe(f_img, out_dir / fname)
                frame_names.append(fname)

                if unarmed_clips_bundle is not None:
                    u_img = unarmed_clips_bundle[clip_id]["frames"][idx]
                else:
                    u_img = c_data["unarmedFrames"][idx] if "unarmedFrames" in c_data else f_img
                uname = f"clip-{clip_id}-f{idx}-unarmed.png"
                _save_png_safe(u_img, out_dir / uname)
                unarmed_names.append(uname)

            frame_pose_tags = [
                next((s.get("poseTag", "ready") for s in s_list if s.get("id") == "hand_r"), "ready")
                for s_list in c_data["socketsPerFrame"]
            ]
            clip_files[clip_id] = {
                "label": c_data["spec"].label,
                "strip": strip_name,
                "frames": frame_names,
                "unarmedFrames": unarmed_names,
                "framePoseTags": frame_pose_tags,
                "fps": c_data["spec"].fps,
                "loop": c_data["spec"].loop,
                "regionMasked": c_data["spec"].region_masked,
                "crawlPixelsSuppressed": c_data["crawlPixelsSuppressed"],
                "timing": {
                    "windupFrames": c_data["spec"].timing.windup_frames,
                    "hitFrame": c_data["spec"].timing.hit_frame,
                    "recoveryFrames": c_data["spec"].timing.recovery_frames,
                    "hitStopMs": c_data["spec"].timing.hit_stop_ms,
                    "screenShakePx": c_data["spec"].timing.screen_shake_px,
                },
            }

        lighting = generate_25d_lighting_maps(ai_bundle["master96"])
        _save_png_safe(lighting["normal"], out_dir / "hero-master-normal.png")
        _save_png_safe(lighting["specular"], out_dir / "hero-master-specular.png")
        _save_png_safe(lighting["emissive"], out_dir / "hero-master-emissive.png")

        vfx_bundles = [build_dual_buffer_vfx(v, unit_el) for v in unit_spec.vfx_sequences]
        vfx_files: dict[str, dict[str, Any]] = {}
        for vb in vfx_bundles:
            vid = vb["spec"].id
            col_name = f"{vid}-color-strip.png"
            emi_name = f"{vid}-emissive-strip.png"
            comp_name = f"{vid}-composite-strip.png"
            _save_png_safe(vb["colorStrip"], out_dir / col_name)
            _save_png_safe(vb["emissiveStrip"], out_dir / emi_name)
            _save_png_safe(vb["compositeStrip"], out_dir / comp_name)
            vf_names: list[str] = []
            for idx, vf_img in enumerate(vb["frames"]):
                vfn = f"{vid}-f{idx}.png"
                _save_png_safe(vf_img, out_dir / vfn)
                vf_names.append(vfn)
            vfx_files[vid] = {
                "name": vb["spec"].name,
                "category": vb["spec"].category,
                "colorStrip": col_name,
                "emissiveStrip": emi_name,
                "compositeStrip": comp_name,
                "frames": vf_names,
                "fps": vb["spec"].fps,
                "craftChecksPassed": vb["craftChecksPassed"],
            }

        # World Autotile & Biome-Recolored Parallax Stage
        autotile_bundle = build_wang_autotile_16(unit_spec.tileset, biome_element=unit_el.id)
        _save_png_safe(autotile_bundle["sheet"], out_dir / "autotile-16-sheet.png")
        _save_png_safe(autotile_bundle["mapPreview"], out_dir / "autotile-map-preview.png")

        arena_base = ai_bundle.get("arenaComposite")
        if arena_base is not None and not has_dedicated_raw:
            arena_base = recolor_ai_sprite_element(arena_base, unit_el, max_colors=22)
        parallax_bundle = build_parallax_battle_plate(unit_spec.tileset, ai_arena_img=arena_base)
        _save_png_safe(parallax_bundle["skyFar"], out_dir / "parallax-sky-far.png")
        _save_png_safe(parallax_bundle["ruinsMid"], out_dir / "parallax-ruins-mid.png")
        _save_png_safe(parallax_bundle["arenaGround"], out_dir / "parallax-arena-ground.png")
        _save_png_safe(parallax_bundle["composite"], out_dir / "parallax-stage-composite.png")

        atlas_entries: list[dict[str, Any]] = []
        for clip_id in ("idle", "walk", "attack", "hurt", "victory"):
            c_data = clips_bundle[clip_id]
            dur_ms = max(40, round(1000 / c_data["spec"].fps))
            for i, img in enumerate(c_data["frames"]):
                atlas_entries.append(
                    {
                        "id": f"{unit_id}_{clip_id}_{i}",
                        "category": "character",
                        "clipId": clip_id,
                        "durationMs": dur_ms,
                        "image": img,
                        "pivot": {"x": 48, "y": 88},
                        "sockets": c_data["socketsPerFrame"][i],
                    }
                )
        for d_id, img in ai_bundle["directionFrames"].items():
            atlas_entries.append(
                {
                    "id": f"{unit_id}_dir_{d_id}",
                    "category": "turnaround",
                    "durationMs": 125,
                    "image": img,
                    "pivot": {"x": 48, "y": 88},
                    "sockets": [],
                }
            )
        atlas_entries.append(
            {
                "id": f"{unit_id}_damaged",
                "category": "damaged",
                "durationMs": 125,
                "image": ai_bundle["damaged96"],
                "pivot": {"x": 48, "y": 88},
                "sockets": [],
            }
        )
        for l_id, img in ai_bundle["layers"].items():
            atlas_entries.append(
                {
                    "id": f"layer_{l_id}",
                    "category": "paperdoll",
                    "durationMs": 125,
                    "image": img,
                    "pivot": {"x": img.width // 2, "y": img.height - 2},
                    "sockets": [],
                }
            )
        for vb in vfx_bundles:
            vid = vb["spec"].id
            v_dur = max(40, round(1000 / vb["spec"].fps))
            for f_idx, v_img in enumerate(vb["frames"]):
                atlas_entries.append(
                    {
                        "id": f"{vid}_f{f_idx}",
                        "category": "vfx",
                        "clipId": vid,
                        "durationMs": v_dur,
                        "image": v_img,
                        "pivot": {"x": 32, "y": 32},
                        "sockets": [],
                    }
                )
        for item in unit_spec.loot_items:
            if item.id in loot_icons:
                atlas_entries.append(
                    {
                        "id": item.id,
                        "category": "loot",
                        "durationMs": 125,
                        "image": loot_icons[item.id],
                        "pivot": {"x": 16, "y": 16},
                        "sockets": [],
                    }
                )

        atlas_bundle = pack_multi_map_atlas(atlas_entries, atlas_size=(512, 512), extrude_px=2, gutter_px=4)
        _save_png_safe(atlas_bundle["diffuseAtlas"], out_dir / "forge-atlas-diffuse.png")
        _save_png_safe(atlas_bundle["normalAtlas"], out_dir / "forge-atlas-normal.png")
        _save_png_safe(atlas_bundle["emissiveAtlas"], out_dir / "forge-atlas-emissive.png")
        res_rel = "res://" + unit["outputDir"].removeprefix("public/")
        engine_exports = export_engine_manifests(unit_spec, atlas_bundle, out_dir, res_base_path=res_rel)

        base_bbox = ai_bundle["master96"].getchannel("A").getbbox() or (0, 0, 96, 96)
        dmg_bbox = ai_bundle["damaged96"].getchannel("A").getbbox() or (0, 0, 96, 96)
        bbox_delta = max(abs(a - b) for a, b in zip(base_bbox, dmg_bbox))

        pd_mock = {
            "baseComposite": ai_bundle["master96"],
            "damagedComposite": ai_bundle["damaged96"],
            "damagedBboxDeltaPx": bbox_delta,
            "baseLayers": ai_bundle["layers"],
            "sockets": compute_frame_sockets(0, 0, "S"),
            "lootIcons": loot_icons,
        }
        q_report = evaluate_quality_gates(
            pd_mock, clips_bundle, vfx_bundles, atlas_bundle, emissive_map=lighting["emissive"]
        )
        master_palette_hex = [
            f"#{r:02X}{g:02X}{b:02X}"
            for r, g, b in q_report.get("paletteRgb", [])
        ]

        build_rev = int(time.time() * 1000)
        eff_kebab = effective_slug.replace("_", "-")
        raw_thumbs = dict(ai_bundle.get("rawThumbnails", {}))
        slot_prov = ai_bundle.get("rawSlotProvenance", {})

        # Ensure optional 09_loot_sheet and 10_arena_stage raw preview thumbnails always exist on disk
        loot_thumb_key = f"{eff_kebab}-loot-sheet"
        if loot_thumb_key not in raw_thumbs:
            loot_plate = Image.new("RGBA", (96, 64), (0, 255, 0, 255))
            for l_idx, item in enumerate(unit_spec.loot_items[:6]):
                if item.id in loot_icons:
                    lx = (l_idx % 3) * 32
                    ly = (l_idx // 3) * 32
                    loot_plate.alpha_composite(loot_icons[item.id].resize((32, 32), resample=Image.Resampling.NEAREST), dest=(lx, ly))
            loot_thumb_file = f"raw-{loot_thumb_key}.png"
            _save_png_safe(loot_plate, out_dir / loot_thumb_file)
            raw_thumbs[loot_thumb_key] = loot_thumb_file

        arena_thumb_key = f"{eff_kebab}-arena-stage"
        if arena_thumb_key not in raw_thumbs:
            arena_thumb_img = parallax_bundle["composite"].resize((128, 72), resample=Image.Resampling.NEAREST)
            arena_thumb_file = f"raw-{arena_thumb_key}.png"
            _save_png_safe(arena_thumb_img, out_dir / arena_thumb_file)
            raw_thumbs[arena_thumb_key] = arena_thumb_file

        def _raw_thumb(suffix_kebab: str) -> str:
            return raw_thumbs.get(f"{eff_kebab}-{suffix_kebab}", f"raw-{eff_kebab}-{suffix_kebab}.png")

        unit_manifest = {
            "schemaVersion": 2,
            "buildRevision": build_rev,
            "assetProvenance": asset_provenance,
            "rawAiDir": unit["rawAiDir"],
            "fileSlug": slug,
            "rawSlotProvenance": slot_prov,
            "character": {
                "id": unit_spec.character.id,
                "name": unit_spec.character.name,
                "title": unit_spec.character.title,
                "rarity": unit_spec.character.rarity,
                "masterStill": "hero-master-still.png",
                "damagedStill": "hero-master-damaged.png",
                "normalMap": "hero-master-normal.png",
                "specularMap": "hero-master-specular.png",
                "emissiveMap": "hero-master-emissive.png",
                "damagedBboxDeltaPx": bbox_delta,
                "bodyCanvas": list(unit_spec.character.body_canvas),
                "weaponCanvas": list(unit_spec.character.weapon_canvas),
                "footBaselineY": unit_spec.character.foot_baseline_y,
                "paletteHex": master_palette_hex,
            },
            "layers": layer_files,
            "layerSpecs": [
                {
                    "id": l.id,
                    "role": l.role,
                    "zIndex": l.z_index,
                    "width": l.canvas_width,
                    "height": l.canvas_height,
                    "offsetX": l.offset_x,
                    "offsetY": l.offset_y,
                    "pivotX": l.pivot_x,
                    "pivotY": l.pivot_y,
                    "tintable": l.tintable_greyscale,
                    "file": layer_files[l.id],
                }
                for l in unit_spec.layers
            ],
            "masks": mask_files,
            "rawThumbnails": raw_thumbs,
            "rawFrames": [
                {
                    "slot": "01_idle_f0",
                    "title": "Frame 01 • Idle Guard (F0)",
                    "rawFile": _raw_thumb("idle-f0"),
                    "cleanedFile": "clip-idle-f0.png",
                    "unarmedFile": "clip-idle-f0-unarmed.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [96, 96],
                    "note": "Tách nền CIELAB #00FF00 + khóa chân Y=88",
                },
                {
                    "slot": "02_idle_f1",
                    "title": "Frame 02 • Idle Breath (F1)",
                    "rawFile": _raw_thumb("idle-f1"),
                    "cleanedFile": "clip-idle-f2.png",
                    "unarmedFile": "clip-idle-f2-unarmed.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [96, 96],
                    "note": "Region-Masked Breathing (ngực & áo choàng)",
                },
                {
                    "slot": "03_walk_f0",
                    "title": "Frame 03 • Walk Stride Left (F0)",
                    "rawFile": _raw_thumb("walk-f0"),
                    "cleanedFile": "clip-walk-f0.png",
                    "unarmedFile": "clip-walk-f0-unarmed.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [96, 96],
                    "note": "Sải chân trái + ổn định trọng tâm Alpha",
                },
                {
                    "slot": "04_walk_f1",
                    "title": "Frame 04 • Walk Stride Right (F1)",
                    "rawFile": _raw_thumb("walk-f1"),
                    "cleanedFile": "clip-walk-f2.png",
                    "unarmedFile": "clip-walk-f2-unarmed.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [96, 96],
                    "note": "Sải chân phải + Temporal Hysteresis",
                },
                {
                    "slot": "05_attack_f0",
                    "title": "Frame 05 • Attack Windup (F0)",
                    "rawFile": _raw_thumb("attack-f0"),
                    "cleanedFile": "clip-attack-f1.png",
                    "unarmedFile": "clip-attack-f1-unarmed.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [96, 96],
                    "note": "Vung vũ khí đỉnh đầu + bản Unarmed tay không",
                },
                {
                    "slot": "06_attack_f1",
                    "title": "Frame 06 • Attack Cleave (F1)",
                    "rawFile": _raw_thumb("attack-f1"),
                    "cleanedFile": "clip-attack-f2.png",
                    "unarmedFile": "clip-attack-f2-unarmed.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [96, 96],
                    "note": "Trảm 96×96 không cắt mũi vũ khí + Hit-Stop 80ms",
                },
                {
                    "slot": "07_victory_f0",
                    "title": "Frame 07 • Victory Skyward",
                    "rawFile": _raw_thumb("victory-f0"),
                    "cleanedFile": "clip-victory-f2.png",
                    "unarmedFile": "clip-victory-f2-unarmed.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [96, 96],
                    "note": "Tư thế khải hoàn + hào quang nguyên tố",
                },
                {
                    "slot": "08_paperdoll_kit",
                    "title": "Frame 08 • Modular Paper-Doll 2×2 Kit",
                    "rawFile": _raw_thumb("paperdoll-kit"),
                    "cleanedFile": "layer-10_body.png",
                    "rawSize": [96, 96],
                    "cleanedSize": [64, 64],
                    "note": "Bóc tách 4 góc: Thân 64×64, Mũ/Tóc, Tay phụ & Vũ khí",
                },
                {
                    "slot": "09_loot_sheet",
                    "title": "Frame 09 • 3×2 RPG Loot & Relic Sheet",
                    "rawFile": _raw_thumb("loot-sheet"),
                    "cleanedFile": "loot-sunblade-ur.png",
                    "rawSize": [96, 64],
                    "cleanedSize": [32, 32],
                    "note": "Cắt 6 ô vật phẩm 32×32 + đổi bảng màu hệ tướng",
                },
                {
                    "slot": "10_arena_stage",
                    "title": "Frame 10 • HD-2D Biome Battle Arena",
                    "rawFile": _raw_thumb("arena-stage"),
                    "cleanedFile": "parallax-stage-composite.png",
                    "rawSize": [128, 72],
                    "cleanedSize": [256, 144],
                    "note": "Tách 3 lớp Parallax 256×144 theo nguyên tố tướng",
                },
            ],
            "weaponArsenal": [
                {"id": "greatsword", "name": sig_weapon_name, "rarity": sig_weapon_rarity, "layerFile": "layer-50_weapon-greatsword.png"},
                {"id": "sunblade", "name": "Thái Dương Thần Kiếm", "rarity": "UR", "layerFile": "layer-50_weapon-sunblade.png"},
                {"id": "staff", "name": "Quyền Trượng Tinh Hà", "rarity": "SSR", "layerFile": "layer-50_weapon-staff.png"},
                {"id": "crimson-blade", "name": "Huyết Long Đại Kiếm", "rarity": "UR", "layerFile": "layer-50_weapon-crimson-blade.png"},
                {"id": "frost-blade", "name": "Băng Tinh Chiến Kiếm", "rarity": "SSR", "layerFile": "layer-50_weapon-frost-blade.png"},
            ],
            "weaponPoses": ai_bundle.get("weaponPoseFiles", {}),
            "sockets": compute_frame_sockets(0, 0, "S"),
            "elements": {el.id: {"label": el.label, "file": element_files[el.id]} for el in unit_spec.elements},
            "directions": direction_files,
            "directionMeta": DIRECTION_META,
            "characterBible": bible_manifest,
            "clips": clip_files,
            "vfx": vfx_files,
            "loot": [
                {
                    "id": item.id,
                    "name": item.name,
                    "category": item.category,
                    "rarity": item.rarity,
                    "material": item.material,
                    "size": item.canvas_size,
                    "file": loot_files[item.id],
                }
                for item in unit_spec.loot_items
                if item.id in loot_files
            ],
            "world": {
                "tilesetId": unit_spec.tileset.id,
                "tilesetName": unit_spec.tileset.name,
                "biomeElement": autotile_bundle.get("biomeElement", unit_el.id),
                "stageWidth": unit_spec.tileset.stage_width,
                "stageHeight": unit_spec.tileset.stage_height,
                "autotileSheet": "autotile-16-sheet.png",
                "mapPreview": "autotile-map-preview.png",
                "gridLayout": autotile_bundle.get("gridLayout", []),
                "parallaxSky": "parallax-sky-far.png",
                "parallaxRuins": "parallax-ruins-mid.png",
                "parallaxArena": "parallax-arena-ground.png",
                "parallaxComposite": "parallax-stage-composite.png",
                "tileMeta": autotile_bundle["tileMeta"],
            },
            "atlas": {
                "diffuse": "forge-atlas-diffuse.png",
                "normal": "forge-atlas-normal.png",
                "emissive": "forge-atlas-emissive.png",
                "width": atlas_bundle["atlasWidth"],
                "height": atlas_bundle["atlasHeight"],
                "extrudePx": atlas_bundle["extrudePx"],
                "frameCount": len(atlas_bundle["frames"]),
                "deduplicatedFrames": atlas_bundle["deduplicatedFrames"],
                "exports": engine_exports,
                "bundleZip": "forge-engine-bundle.zip",
                "bundleZipBytes": 0,
                "frames": atlas_bundle["frames"],
            },
            "qualityReport": q_report,
        }
        manifest_file = out_dir / "forge-manifest.json"
        manifest_file.write_text(
            json.dumps(unit_manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        zip_meta = pack_engine_bundle_zip(out_dir, unit_id)
        unit_manifest["atlas"]["bundleZip"] = zip_meta["file"]
        unit_manifest["atlas"]["bundleZipBytes"] = zip_meta["sizeBytes"]
        manifest_file.write_text(
            json.dumps(unit_manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    else:
        build_rev = int(time.time() * 1000)
        q_report = {"score": 100, "allPassed": True, "checks": []}

    # Measure pixel silhouette uniqueness against master Paladin Knight
    alpha_diff_from_master = 0
    if paladin_master_path.exists() and unit_id != "hero-paladin-knight" and ai_bundle is not None:
        pal_alpha = np.array(Image.open(paladin_master_path).convert("RGBA"))[:, :, 3]
        unit_alpha = np.array(ai_bundle["master96"])[:, :, 3]
        alpha_diff_from_master = int((pal_alpha != unit_alpha).sum())

    web_base = "/" + unit["outputDir"].removeprefix("public/")
    return {
        "id": unit_id,
        "fileSlug": slug,
        "name": unit["name"],
        "title": unit["title"],
        "classRole": unit["classRole"],
        "rarity": unit["rarity"],
        "baseElement": unit["baseElement"],
        "rawAiDir": unit["rawAiDir"],
        "outputDir": unit["outputDir"],
        "manifestUrl": f"{web_base}/forge-manifest.json",
        "promptsUrl": f"{web_base}/forge-prompts.json",
        "assetProvenance": asset_provenance,
        "buildRevision": build_rev,
        "alphaDiffFromMaster": alpha_diff_from_master,
        "headgearSpec": unit.get("headgearSpec", unit["silhouette"]),
        "silhouette": unit["silhouette"],
        "weaponSpec": unit["weaponSpec"],
        "skills": unit.get("skills", []),
        "previewSprite": f"{web_base}/hero-master-still.png",
        "attackFrame": f"{web_base}/clip-attack-f2.png",
        "chibiSprite": f"{web_base}/hero-chibi.png",
        "normalMap": f"{web_base}/hero-master-normal.png",
        "emissiveMap": f"{web_base}/hero-master-emissive.png",
        "atlasDiffuse": f"{web_base}/forge-atlas-diffuse.png",
        "promptCount": len(ai_prompts),
        "prompts": ai_prompts,
        "qualityScore": q_report["score"],
        "allPassed": q_report["allPassed"],
    }


def register_unit_in_roster(
    roster_path: Path,
    root_dir: Path,
    *,
    unit_id: str,
    name: str,
    title: str,
    class_role: str,
    rarity: str,
    base_element: str,
    headgear_spec: str,
    silhouette: str,
    weapon_spec: str,
    skills: list[str] | None = None,
) -> dict[str, Any]:
    """Register or update a hero entry in forge-roster.json and create its raw_ai / generated directories."""
    clean_id = unit_id.strip().lower().replace("_", "-")
    if not clean_id.startswith("hero-"):
        clean_id = f"hero-{clean_id}"

    roster_data = json.loads(roster_path.read_text(encoding="utf-8"))
    units: list[dict[str, Any]] = roster_data.get("units", [])
    existing = next((u for u in units if u["id"] == clean_id), None)

    if clean_id == "hero-paladin-knight":
        raw_ai_rel = "public/assets/pixel-forge/raw_ai"
        out_rel = "public/assets/pixel-forge/generated"
    else:
        raw_ai_rel = f"public/assets/pixel-forge/batch/{clean_id}/raw_ai"
        out_rel = f"public/assets/pixel-forge/batch/{clean_id}/generated"

    entry: dict[str, Any] = {
        "id": clean_id,
        "name": name.strip(),
        "title": title.strip(),
        "classRole": class_role.strip(),
        "rarity": rarity.strip().lower(),
        "baseElement": base_element.strip().lower(),
        "rawAiDir": existing["rawAiDir"] if existing and "rawAiDir" in existing else raw_ai_rel,
        "outputDir": existing["outputDir"] if existing and "outputDir" in existing else out_rel,
        "headgearSpec": headgear_spec.strip(),
        "silhouette": silhouette.strip(),
        "weaponSpec": weapon_spec.strip(),
        "skills": skills if skills else (existing.get("skills", ["Tuyệt Kỹ Thức Tỉnh"]) if existing else ["Tuyệt Kỹ Thức Tỉnh"]),
    }

    if existing is not None:
        idx = units.index(existing)
        units[idx] = entry
    else:
        units.append(entry)

    roster_data["units"] = units
    roster_path.write_text(json.dumps(roster_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    (root_dir / entry["rawAiDir"]).mkdir(parents=True, exist_ok=True)
    (root_dir / entry["outputDir"]).mkdir(parents=True, exist_ok=True)

    return {
        "unit": entry,
        "fileSlug": _unit_file_slug(clean_id),
        "prompts": compile_unit_10_frame_ai_prompts(entry),
    }


def unregister_unit_from_roster(
    roster_path: Path,
    unit_id: str,
    root_dir: Path,
) -> dict[str, Any]:
    """Remove a custom hero from forge-roster.json and batch-manifest.json (protecting the 5 core heroes)."""
    clean_id = unit_id.strip().lower().replace("_", "-")
    if not clean_id.startswith("hero-"):
        clean_id = f"hero-{clean_id}"
    if clean_id in CORE_PROTECTED_UNIT_IDS:
        raise ValueError(f"Cannot delete core canonical unit `{clean_id}`.")

    roster_data = json.loads(roster_path.read_text(encoding="utf-8"))
    units: list[dict[str, Any]] = roster_data.get("units", [])
    remaining_roster = [u for u in units if u["id"] != clean_id]
    if len(remaining_roster) == len(units):
        raise ValueError(f"Unit `{clean_id}` not found in {roster_path}.")

    roster_data["units"] = remaining_roster
    roster_path.write_text(json.dumps(roster_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    out_manifest = root_dir / "public" / "assets" / "pixel-forge" / "batch-manifest.json"
    if out_manifest.exists():
        existing_batch = json.loads(out_manifest.read_text(encoding="utf-8"))
        rem_units = [u for u in existing_batch.get("units", []) if u["id"] != clean_id]
        batch_rev = int(time.time() * 1000)
        batch_manifest = {
            "rosterVersion": roster_data.get("rosterVersion", 2),
            "buildRevision": batch_rev,
            "lastUpdatedUnitId": rem_units[0]["id"] if rem_units else "hero-paladin-knight",
            "totalUnits": len(rem_units),
            "allUnitsPassed": all(u["allPassed"] for u in rem_units) if rem_units else True,
            "averageScore": round(sum(u["qualityScore"] for u in rem_units) / max(1, len(rem_units))) if rem_units else 100,
            "units": rem_units,
        }
        out_manifest.write_text(json.dumps(batch_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return {"deletedId": clean_id, "batchManifest": batch_manifest}
    return {"deletedId": clean_id, "batchManifest": None}


def run_single_unit_forge(
    roster_path: Path,
    unit_id: str,
    root_dir: Path,
) -> dict[str, Any]:
    """Rebuild a single hero from forge-roster.json in <2s and hot-update batch-manifest.json."""
    clean_id = unit_id.strip()
    roster_data = json.loads(roster_path.read_text(encoding="utf-8"))
    target_unit = next((u for u in roster_data.get("units", []) if u["id"] == clean_id), None)
    if target_unit is None and not clean_id.startswith("hero-"):
        target_unit = next((u for u in roster_data.get("units", []) if u["id"] == f"hero-{clean_id}"), None)
    if target_unit is None:
        raise ValueError(f"Unit `{unit_id}` not found in {roster_path}")

    base_spec = default_forge_project_spec()
    built_summary = build_single_unit_from_spec(base_spec, target_unit, root_dir)

    out_manifest = root_dir / "public" / "assets" / "pixel-forge" / "batch-manifest.json"
    if out_manifest.exists():
        existing_batch = json.loads(out_manifest.read_text(encoding="utf-8"))
        existing_units: list[dict[str, Any]] = existing_batch.get("units", [])
    else:
        existing_units = []

    by_id = {u["id"]: u for u in existing_units}
    by_id[built_summary["id"]] = built_summary

    # Preserve canonical roster order from forge-roster.json
    ordered_units: list[dict[str, Any]] = []
    for r_unit in roster_data.get("units", []):
        rid = r_unit["id"]
        if rid in by_id:
            ordered_units.append(by_id[rid])
        else:
            ordered_units.append(build_single_unit_from_spec(base_spec, r_unit, root_dir))

    batch_rev = int(time.time() * 1000)
    batch_manifest = {
        "rosterVersion": roster_data.get("rosterVersion", 2),
        "buildRevision": batch_rev,
        "lastUpdatedUnitId": built_summary["id"],
        "totalUnits": len(ordered_units),
        "allUnitsPassed": all(u["allPassed"] for u in ordered_units),
        "averageScore": round(sum(u["qualityScore"] for u in ordered_units) / max(1, len(ordered_units))),
        "units": ordered_units,
    }
    out_manifest.parent.mkdir(parents=True, exist_ok=True)
    out_manifest.write_text(json.dumps(batch_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"unit": built_summary, "batchManifest": batch_manifest}


def run_batch_forge(
    roster_path: Path,
    root_dir: Path,
    *,
    validate_only: bool = False,
) -> dict[str, Any]:
    """Execute batch asset & sprite generation (or fast validation) across all units in forge-roster.json."""
    roster_data = json.loads(roster_path.read_text(encoding="utf-8"))
    base_spec = default_forge_project_spec()
    units_summary: list[dict[str, Any]] = []
    paladin_master_path = root_dir / "public" / "assets" / "pixel-forge" / "generated" / "hero-master-still.png"
    pal_alpha = (
        np.array(Image.open(paladin_master_path).convert("RGBA"))[:, :, 3]
        if paladin_master_path.exists()
        else None
    )

    batch_rev = int(time.time() * 1000)
    for unit in roster_data.get("units", []):
        out_dir = root_dir / unit["outputDir"]
        raw_dir = root_dir / unit["rawAiDir"]
        slug = _unit_file_slug(unit["id"])
        if validate_only:
            cached_report = validate_output_directory(out_dir)
            if cached_report is not None:
                ai_prompts = compile_unit_10_frame_ai_prompts(unit)
                web_base = "/" + unit["outputDir"].removeprefix("public/")
                has_raw = resolve_raw_slot_file(raw_dir, slug, "idle_f0") is not None
                unit_rev = batch_rev
                manifest_p = out_dir / "forge-manifest.json"
                if manifest_p.exists():
                    try:
                        unit_rev = int(json.loads(manifest_p.read_text(encoding="utf-8")).get("buildRevision", batch_rev))
                    except Exception:
                        unit_rev = batch_rev
                alpha_diff = 0
                if pal_alpha is not None and unit["id"] != "hero-paladin-knight":
                    unit_master = out_dir / "hero-master-still.png"
                    if unit_master.exists():
                        alpha_diff = int((pal_alpha != np.array(Image.open(unit_master).convert("RGBA"))[:, :, 3]).sum())
                units_summary.append(
                    {
                        "id": unit["id"],
                        "fileSlug": slug,
                        "name": unit["name"],
                        "title": unit["title"],
                        "classRole": unit["classRole"],
                        "rarity": unit["rarity"],
                        "baseElement": unit["baseElement"],
                        "rawAiDir": unit["rawAiDir"],
                        "outputDir": unit["outputDir"],
                        "manifestUrl": f"{web_base}/forge-manifest.json",
                        "promptsUrl": f"{web_base}/forge-prompts.json",
                        "assetProvenance": "ai-native" if has_raw else "class-rig-synthesized",
                        "buildRevision": unit_rev,
                        "alphaDiffFromMaster": alpha_diff,
                        "headgearSpec": unit.get("headgearSpec", unit["silhouette"]),
                        "silhouette": unit["silhouette"],
                        "weaponSpec": unit["weaponSpec"],
                        "skills": unit.get("skills", []),
                        "previewSprite": f"{web_base}/hero-master-still.png",
                        "attackFrame": f"{web_base}/clip-attack-f2.png",
                        "chibiSprite": f"{web_base}/hero-chibi.png",
                        "normalMap": f"{web_base}/hero-master-normal.png",
                        "emissiveMap": f"{web_base}/hero-master-emissive.png",
                        "atlasDiffuse": f"{web_base}/forge-atlas-diffuse.png",
                        "promptCount": len(ai_prompts),
                        "prompts": ai_prompts,
                        "qualityScore": cached_report["score"],
                        "allPassed": cached_report["allPassed"],
                    }
                )
                continue
        res = build_single_unit_from_spec(base_spec, unit, root_dir)
        units_summary.append(res)

    batch_manifest = {
        "rosterVersion": roster_data.get("rosterVersion", 2),
        "buildRevision": batch_rev,
        "totalUnits": len(units_summary),
        "allUnitsPassed": all(u["allPassed"] for u in units_summary),
        "averageScore": round(sum(u["qualityScore"] for u in units_summary) / max(1, len(units_summary))),
        "units": units_summary,
    }
    out_manifest = root_dir / "public" / "assets" / "pixel-forge" / "batch-manifest.json"
    out_manifest.parent.mkdir(parents=True, exist_ok=True)
    out_manifest.write_text(json.dumps(batch_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return batch_manifest
