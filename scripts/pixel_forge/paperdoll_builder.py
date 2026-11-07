"""Concentric 7-Layer Paper-Doll Builder, Socket Generator & Loot Icon Forge."""

from __future__ import annotations

from typing import Any

from PIL import Image, ImageDraw

from .grid_cleaner import (
    apply_selective_outline,
    chroma_key_cielab,
    recolor_image_by_element,
    remove_orphan_pixels,
    to_greyscale_tint_mask,
)
from .schema import (
    Direction8,
    ElementVariantSpec,
    ForgeProjectSpec,
    LootItemSpec,
    SocketPoint,
)

INK = (11, 14, 22, 255)
SKIN_DARK = (178, 122, 96, 255)
SKIN_MID = (224, 172, 138, 255)
SKIN_LIGHT = (250, 214, 186, 255)
SCLERA = (242, 246, 250, 255)
STEEL_DARK = (54, 66, 86, 255)
STEEL_MID = (104, 124, 152, 255)
STEEL_LIGHT = (182, 204, 228, 255)
GLINT = (255, 252, 232, 255)


def _rect(draw: ImageDraw.ImageDraw, x0: int, y0: int, w: int, h: int, color: tuple[int, int, int, int]) -> None:
    if w > 0 and h > 0:
        draw.rectangle((x0, y0, x0 + w - 1, y0 + h - 1), fill=color)


def build_paperdoll_layers(
    base_element: ElementVariantSpec,
    pose_offset_y: int = 0,
    step_phase: int = 0,
    slash_phase: int = 0,
    damaged: bool = False,
    direction: Direction8 = "S",
) -> dict[str, Image.Image]:
    """Generate the 7 concentric RGBA layers (64x64 body layers + 96x96 weapon/fx layers)."""
    p_dark, p_mid, p_light = [(*c, 255) for c in base_element.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in base_element.accent_ramp]
    glow = (*base_element.glow_rgb, 255)

    dir_shift = -2 if direction in ("W", "SW", "NW") else (2 if direction in ("E", "SE", "NE") else 0)
    facing_back = direction in ("N", "NW", "NE")

    # 1. 00_shadow (64x64, locked to foot baseline Y=56)
    shadow = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    _rect(s_draw, 16, 54, 32, 5, (14, 18, 28, 255))
    _rect(s_draw, 20, 53, 24, 7, (22, 28, 42, 255))

    # 2. 10_body (64x64, Knight base anatomy, armored sabatons & gauntlets locked to Y=56)
    body = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(body)
    leg_l_y = 43 + (0 if step_phase % 2 == 0 else -2)
    leg_r_y = 43 + (-2 if step_phase % 2 == 1 else 0)
    # Armored Sabatons & Greaves (bottom locked to baseline Y=56)
    _rect(b_draw, 23 + dir_shift, leg_l_y, 7, 56 - leg_l_y, STEEL_DARK)
    _rect(b_draw, 24 + dir_shift, leg_l_y + 1, 5, 6, STEEL_MID)
    _rect(b_draw, 24 + dir_shift, 52, 6, 4, STEEL_LIGHT)
    _rect(b_draw, 34 + dir_shift, leg_r_y, 7, 56 - leg_r_y, STEEL_DARK)
    _rect(b_draw, 35 + dir_shift, leg_r_y + 1, 5, 6, STEEL_MID)
    _rect(b_draw, 35 + dir_shift, 52, 6, 4, STEEL_LIGHT)
    # Chainmail Hauberk & Arms core
    ty = 27 + pose_offset_y
    _rect(b_draw, 22 + dir_shift, ty, 20, 16, STEEL_DARK)
    _rect(b_draw, 24 + dir_shift, ty + 1, 16, 14, STEEL_MID)
    _rect(b_draw, 18 + dir_shift, ty + 2, 4, 12, STEEL_MID)
    _rect(b_draw, 42 + dir_shift, ty + 2, 4, 12, STEEL_DARK)
    # Knight Head (visible when helmet 40_hair is toggled off, or through visor slit)
    hy = 13 + pose_offset_y
    _rect(b_draw, 23 + dir_shift, hy, 18, 14, SKIN_DARK)
    _rect(b_draw, 24 + dir_shift, hy + 1, 16, 12, SKIN_MID)
    _rect(b_draw, 25 + dir_shift, hy + 2, 12, 8, SKIN_LIGHT)
    if not facing_back:
        _rect(b_draw, 26 + dir_shift, hy + 7, 3, 3, SCLERA)
        _rect(b_draw, 35 + dir_shift, hy + 7, 3, 3, SCLERA)
    body = apply_selective_outline(body, "selective")

    # 3. 20_iris (64x64, glowing Knight visor eye slits + 1px specular glint)
    iris = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    if not facing_back:
        i_draw = ImageDraw.Draw(iris)
        hy = 13 + pose_offset_y
        _rect(i_draw, 27 + dir_shift, hy + 7, 3, 2, glow)
        _rect(i_draw, 35 + dir_shift, hy + 7, 3, 2, glow)
        _rect(i_draw, 27 + dir_shift, hy + 7, 1, 1, GLINT)
        _rect(i_draw, 36 + dir_shift, hy + 7, 1, 1, GLINT)

    # 4. 30_outfit (64x64, Knight Plate Cuirass, Winged Pauldrons, Royal Cape, Heraldic Shield & Tassets)
    outfit = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    o_draw = ImageDraw.Draw(outfit)
    ty = 27 + pose_offset_y
    cape_shift = 1 if step_phase in (1, 3) else 0
    # Flowing Knight Mantle / Cape
    _rect(o_draw, 16 + dir_shift - cape_shift, ty + 1, 32 + cape_shift, 24, a_dark)
    _rect(o_draw, 18 + dir_shift, ty + 3, 28, 20, a_mid)
    _rect(o_draw, 20 + dir_shift, ty + 5, 6, 16, a_light)
    # Heavy Steel Cuirass & Heraldic Breastplate
    _rect(o_draw, 21 + dir_shift, ty - 1, 22, 16, STEEL_DARK)
    _rect(o_draw, 23 + dir_shift, ty, 18, 14, STEEL_MID)
    _rect(o_draw, 25 + dir_shift, ty + 1, 12, 10, STEEL_LIGHT)
    # Gold Cross Emblem on Breastplate
    _rect(o_draw, 31 + dir_shift, ty + 2, 2, 9, p_light)
    _rect(o_draw, 28 + dir_shift, ty + 4, 8, 2, p_light)
    _rect(o_draw, 31 + dir_shift, ty + 4, 2, 2, glow)
    # Layered Winged Pauldrons (Shoulder Plates)
    _rect(o_draw, 15 + dir_shift, ty - 3, 9, 8, STEEL_DARK)
    _rect(o_draw, 16 + dir_shift, ty - 2, 7, 6, STEEL_LIGHT)
    _rect(o_draw, 16 + dir_shift, ty + 2, 7, 2, p_mid)
    _rect(o_draw, 40 + dir_shift, ty - 3, 9, 8, STEEL_DARK)
    _rect(o_draw, 41 + dir_shift, ty - 2, 7, 6, STEEL_MID)
    _rect(o_draw, 41 + dir_shift, ty + 2, 7, 2, p_mid)
    # Knight Belt, Tassets & Royal Tabard
    _rect(o_draw, 22 + dir_shift, ty + 13, 20, 3, p_dark)
    _rect(o_draw, 24 + dir_shift, ty + 13, 16, 2, p_light)
    _rect(o_draw, 30 + dir_shift, ty + 12, 4, 4, glow)
    _rect(o_draw, 23 + dir_shift, ty + 16, 6, 8, STEEL_MID)
    _rect(o_draw, 35 + dir_shift, ty + 16, 6, 8, STEEL_MID)
    _rect(o_draw, 29 + dir_shift, ty + 16, 6, 11, a_light)
    _rect(o_draw, 30 + dir_shift, ty + 16, 4, 10, p_light)
    # Heraldic Heater Shield on Left Arm (x=13..24)
    _rect(o_draw, 13 + dir_shift, ty + 3, 11, 15, p_dark)
    _rect(o_draw, 14 + dir_shift, ty + 4, 9, 13, a_dark)
    _rect(o_draw, 15 + dir_shift, ty + 5, 7, 11, a_mid)
    _rect(o_draw, 18 + dir_shift, ty + 5, 2, 11, p_light)
    _rect(o_draw, 15 + dir_shift, ty + 9, 7, 2, p_light)
    _rect(o_draw, 18 + dir_shift, ty + 9, 2, 2, GLINT)
    if damaged:
        # Battle-damaged cracks across shield & breastplate while preserving exact outer bounding box (0px delta)
        _rect(o_draw, 25 + dir_shift, ty + 3, 4, 2, STEEL_DARK)
        _rect(o_draw, 15 + dir_shift, ty + 7, 4, 2, STEEL_DARK)
        _rect(o_draw, 30 + dir_shift, ty + 19, 3, 3, a_dark)
    outfit = apply_selective_outline(outfit, "selective")

    # 5. 40_hair (64x64, Knight Winged Greathelm / Visor Helmet + Flowing Royal Plume)
    hair = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    h_draw = ImageDraw.Draw(hair)
    hy = 11 + pose_offset_y
    # Sweeping Royal Plume / Feather Crest atop Greathelm
    _rect(h_draw, 26 + dir_shift, hy - 7, 12, 5, a_dark)
    _rect(h_draw, 24 + dir_shift, hy - 6, 12, 4, a_mid)
    _rect(h_draw, 25 + dir_shift, hy - 5, 8, 3, a_light)
    _rect(h_draw, 30 + dir_shift, hy - 3, 4, 3, p_light)
    # Greathelm Dome & Crown Trim
    _rect(h_draw, 21 + dir_shift, hy, 22, 8, STEEL_DARK)
    _rect(h_draw, 22 + dir_shift, hy + 1, 20, 6, STEEL_MID)
    _rect(h_draw, 24 + dir_shift, hy + 1, 14, 4, STEEL_LIGHT)
    _rect(h_draw, 22 + dir_shift, hy + 6, 20, 2, p_light)
    # Helmet Winged Side Guards & Faceplate (leaves eye slit y = hy+9..hy+10 open for 20_iris!)
    _rect(h_draw, 19 + dir_shift, hy + 3, 3, 11, p_mid)
    _rect(h_draw, 20 + dir_shift, hy + 2, 2, 6, p_light)
    _rect(h_draw, 42 + dir_shift, hy + 3, 3, 11, p_dark)
    _rect(h_draw, 42 + dir_shift, hy + 2, 2, 6, p_mid)
    if not facing_back:
        # T-Visor Cheek Guards & Nasal Bar (framing the glowing eye slits)
        _rect(h_draw, 22 + dir_shift, hy + 8, 4, 8, STEEL_MID)
        _rect(h_draw, 38 + dir_shift, hy + 8, 4, 8, STEEL_DARK)
        _rect(h_draw, 31 + dir_shift, hy + 8, 2, 8, p_light)
        _rect(h_draw, 24 + dir_shift, hy + 12, 16, 4, STEEL_MID)
        _rect(h_draw, 26 + dir_shift, hy + 13, 12, 2, STEEL_LIGHT)
    else:
        _rect(h_draw, 22 + dir_shift, hy + 8, 20, 8, STEEL_DARK)
    hair = apply_selective_outline(hair, "selective")

    # 6. 50_weapon (96x96 oversized canvas centered on pivot (48, 72) == body (32, 56) + (16, 16))
    weapon = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    w_draw = ImageDraw.Draw(weapon)
    hand_x = 16 + 44 + dir_shift
    hand_y = 16 + 34 + pose_offset_y
    if slash_phase == 0:
        # Knight's Greatsword held upright in right gauntlet, extending into 96x96 oversize zone
        _rect(w_draw, hand_x - 1, hand_y + 2, 4, 9, p_dark)
        _rect(w_draw, hand_x, hand_y + 9, 4, 3, p_light)
        _rect(w_draw, hand_x - 6, hand_y - 2, 14, 4, p_mid)
        _rect(w_draw, hand_x - 5, hand_y - 2, 12, 2, p_light)
        _rect(w_draw, hand_x - 1, hand_y - 32, 6, 30, STEEL_DARK)
        _rect(w_draw, hand_x, hand_y - 32, 4, 30, STEEL_MID)
        _rect(w_draw, hand_x, hand_y - 32, 2, 30, STEEL_LIGHT)
        _rect(w_draw, hand_x + 1, hand_y - 35, 2, 3, GLINT)
        _rect(w_draw, hand_x + 1, hand_y - 22, 2, 16, glow)
    elif slash_phase == 1:
        # Overhead two-handed Paladin charge
        _rect(w_draw, hand_x - 7, hand_y - 12, 12, 4, p_light)
        _rect(w_draw, hand_x - 4, hand_y - 40, 6, 28, STEEL_LIGHT)
        _rect(w_draw, hand_x - 2, hand_y - 38, 2, 22, glow)
    else:
        # Wide horizontal Greatsword cleave extending to x=90 in 96x96 oversize frame
        _rect(w_draw, hand_x - 2, hand_y - 5, 6, 12, p_light)
        _rect(w_draw, hand_x + 4, hand_y - 3, 34, 8, STEEL_MID)
        _rect(w_draw, hand_x + 4, hand_y - 2, 34, 5, STEEL_LIGHT)
        _rect(w_draw, hand_x + 6, hand_y - 1, 28, 3, glow)
        _rect(w_draw, hand_x + 36, hand_y - 1, 4, 4, GLINT)
    weapon = apply_selective_outline(weapon, "selective")

    # 7. 60_fx (96x96 Paladin Holy Aura & Slash Arc layer)
    fx = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    f_draw = ImageDraw.Draw(fx)
    if slash_phase >= 2:
        # Stepped crescent slash wave in 96x96 space
        _rect(f_draw, 64, 18, 6, 46, a_mid)
        _rect(f_draw, 68, 22, 6, 38, a_light)
        _rect(f_draw, 72, 28, 6, 26, glow)
        _rect(f_draw, 76, 34, 4, 14, GLINT)
    else:
        # Floating holy cross runes around Knight's Greatsword & Shield
        _rect(f_draw, hand_x + 6, hand_y - 26, 3, 3, glow)
        _rect(f_draw, hand_x + 7, hand_y - 25, 1, 1, GLINT)
        _rect(f_draw, 22, 26 + pose_offset_y, 3, 3, a_light)
        _rect(f_draw, 23, 27 + pose_offset_y, 1, 1, GLINT)
        _rect(f_draw, 26, 46 + pose_offset_y, 3, 3, glow)
    fx = remove_orphan_pixels(fx)

    return {
        "00_shadow": shadow,
        "10_body": body,
        "20_iris": iris,
        "30_outfit": outfit,
        "40_hair": hair,
        "50_weapon": weapon,
        "60_fx": fx,
    }


def composite_paperdoll(
    layers: dict[str, Image.Image],
    enabled_layers: tuple[str, ...] = (
        "00_shadow",
        "10_body",
        "20_iris",
        "30_outfit",
        "40_hair",
        "50_weapon",
        "60_fx",
    ),
    canvas_size: tuple[int, int] = (96, 96),
) -> Image.Image:
    """Composite paperdoll layers onto a unified 96x96 or 64x64 canvas using concentric pivot offsets."""
    out = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    offset_64 = ((canvas_size[0] - 64) // 2, (canvas_size[1] - 64) // 2)
    offset_96 = ((canvas_size[0] - 96) // 2, (canvas_size[1] - 96) // 2)

    for layer_id in enabled_layers:
        layer = layers.get(layer_id)
        if layer is None:
            continue
        if layer.size == (64, 64):
            out.alpha_composite(layer, dest=offset_64)
        else:
            temp = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
            temp.paste(layer, offset_96)
            out.alpha_composite(temp)
    return chroma_key_cielab(out)


def compute_frame_sockets(
    pose_offset_y: int = 0,
    slash_phase: int = 0,
    direction: Direction8 = "S",
) -> list[dict[str, Any]]:
    """Return socket attachment points in 96x96 concentric space for weapons, headgear, and FX."""
    dir_shift = -2 if direction in ("W", "SW", "NW") else (2 if direction in ("E", "SE", "NE") else 0)
    hand_x = 16 + 42 + dir_shift
    hand_y = 16 + 34 + pose_offset_y
    muzzle_x = hand_x + (38 if slash_phase >= 2 else 2)
    muzzle_y = hand_y + (0 if slash_phase >= 2 else -28)
    sockets = [
        SocketPoint("hand_r", hand_x, hand_y, 90 if slash_phase >= 2 else 0, 50, True),
        SocketPoint("hand_l", 16 + 20 + dir_shift, 16 + 35 + pose_offset_y, 0, 35, True),
        SocketPoint("head", 16 + 32 + dir_shift, 16 + 12 + pose_offset_y, 0, 45, True),
        SocketPoint("back", 16 + 32 + dir_shift, 16 + 32 + pose_offset_y, 0, 25, True),
        SocketPoint("muzzle", muzzle_x, muzzle_y, 0, 60, True),
    ]
    return [
        {
            "id": s.id,
            "x": s.x,
            "y": s.y,
            "angleDeg": s.angle_deg,
            "zOrder": s.z_order,
            "visible": s.visible,
        }
        for s in sockets
    ]


def generate_loot_icon(spec: LootItemSpec, elements: tuple[ElementVariantSpec, ...]) -> Image.Image:
    """Procedurally draw a crisp 32x32 RPG/Gacha inventory icon by category and rarity tier."""
    rarity_palettes = {
        "common": elements[4],
        "rare": elements[2],
        "epic": elements[3],
        "ssr": elements[0],
        "ur": elements[1],
    }
    el = rarity_palettes[spec.rarity]
    p_dark, p_mid, p_light = [(*c, 255) for c in el.primary_ramp]
    a_dark, a_mid, a_light = [(*c, 255) for c in el.accent_ramp]
    glow = (*el.glow_rgb, 255)

    img = Image.new("RGBA", (spec.canvas_size, spec.canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if spec.category == "sword":
        # Diagonal-stepped broadsword with glowing fuller & ornate crossguard
        for i in range(14):
            _rect(draw, 10 + i, 18 - i, 4, 4, STEEL_MID)
            _rect(draw, 10 + i, 17 - i, 2, 2, STEEL_LIGHT)
        _rect(draw, 23, 5, 3, 3, GLINT)
        _rect(draw, 7, 17, 10, 3, p_mid)
        _rect(draw, 8, 17, 8, 2, p_light)
        _rect(draw, 6, 21, 5, 5, p_dark)
        _rect(draw, 11, 18, 3, 3, glow)
    elif spec.category == "staff":
        _rect(draw, 14, 10, 4, 18, p_dark)
        _rect(draw, 15, 10, 2, 18, p_mid)
        _rect(draw, 10, 5, 12, 8, p_light)
        _rect(draw, 12, 6, 8, 6, a_mid)
        _rect(draw, 14, 7, 4, 4, glow)
        _rect(draw, 14, 7, 2, 2, GLINT)
    elif spec.category == "shield":
        _rect(draw, 7, 5, 18, 20, STEEL_DARK)
        _rect(draw, 9, 7, 14, 16, a_dark)
        _rect(draw, 11, 9, 10, 12, a_mid)
        _rect(draw, 14, 7, 4, 16, p_mid)
        _rect(draw, 9, 13, 14, 4, p_light)
        _rect(draw, 14, 13, 4, 4, glow)
    elif spec.category == "potion":
        _rect(draw, 13, 5, 6, 4, p_mid)
        _rect(draw, 12, 9, 8, 3, STEEL_LIGHT)
        _rect(draw, 8, 12, 16, 14, a_dark)
        _rect(draw, 10, 14, 12, 10, a_mid)
        _rect(draw, 11, 16, 10, 7, a_light)
        _rect(draw, 11, 14, 3, 3, GLINT)
    elif spec.category == "chest":
        _rect(draw, 5, 9, 22, 17, p_dark)
        _rect(draw, 7, 11, 18, 13, a_dark)
        _rect(draw, 5, 15, 22, 3, p_mid)
        _rect(draw, 7, 9, 3, 17, p_light)
        _rect(draw, 22, 9, 3, 17, p_light)
        _rect(draw, 14, 14, 4, 6, glow)
        _rect(draw, 15, 15, 2, 2, GLINT)
    else:
        # Relic / Sigil
        _rect(draw, 9, 6, 14, 20, p_dark)
        _rect(draw, 6, 9, 20, 14, p_mid)
        _rect(draw, 10, 10, 12, 12, a_mid)
        _rect(draw, 13, 13, 6, 6, glow)
        _rect(draw, 14, 14, 2, 2, GLINT)

    return apply_selective_outline(img, "selective")


def build_paperdoll_and_loot_bundle(spec: ForgeProjectSpec) -> dict[str, Any]:
    """Build all 7 paperdoll layers, greyscale masks, elemental variants, directions, and loot icons."""
    from pathlib import Path
    from .ai_frame_pipeline import load_and_process_raw_ai_knight

    root = Path(__file__).resolve().parents[2]
    raw_ai_dir = root / "public" / "assets" / "pixel-forge" / "raw_ai"
    gen_dir = root / "public" / "assets" / "pixel-forge" / "generated"
    ai_bundle = load_and_process_raw_ai_knight(raw_ai_dir, gen_dir, spec)

    loot_icons: dict[str, Image.Image] = {}
    for item in spec.loot_items:
        loot_icons[item.id] = generate_loot_icon(item, spec.elements)

    if ai_bundle is not None:
        base_composite = ai_bundle["master96"]
        damaged_composite = ai_bundle["damaged96"]
        base_bbox = base_composite.getchannel("A").getbbox() or (0, 0, 96, 96)
        dmg_bbox = damaged_composite.getchannel("A").getbbox() or (0, 0, 96, 96)
        bbox_delta = max(abs(a - b) for a, b in zip(base_bbox, dmg_bbox))
        return {
            "baseLayers": ai_bundle["layers"],
            "greyscaleMasks": {
                "10_body_greyscale": ai_bundle["greyscaleMasks"]["10_body"],
                "20_iris_greyscale": ai_bundle["greyscaleMasks"]["20_iris"],
            },
            "baseComposite": base_composite,
            "damagedComposite": damaged_composite,
            "damagedBboxDeltaPx": bbox_delta,
            "elementComposites": ai_bundle["elementComposites"],
            "directionFrames": ai_bundle["directionFrames"],
            "sockets": compute_frame_sockets(0, 0, "S"),
            "lootIcons": ai_bundle["lootIcons"] if ai_bundle.get("lootIcons") is not None else loot_icons,
            "aiFrames": ai_bundle["aiFrames"],
            "rawThumbnails": ai_bundle["rawThumbnails"],
            "arenaComposite": ai_bundle.get("arenaComposite"),
        }

    base_element = spec.elements[0]
    base_layers = build_paperdoll_layers(base_element, pose_offset_y=0, step_phase=0, slash_phase=0, damaged=False)
    damaged_layers = build_paperdoll_layers(base_element, pose_offset_y=0, step_phase=0, slash_phase=0, damaged=True)

    base_composite = composite_paperdoll(base_layers, canvas_size=(96, 96))
    damaged_composite = composite_paperdoll(damaged_layers, canvas_size=(96, 96))

    # Measure bounding box drift between base and -damaged variant (must be <= 1px)
    base_bbox = base_composite.getchannel("A").getbbox() or (0, 0, 96, 96)
    dmg_bbox = damaged_composite.getchannel("A").getbbox() or (0, 0, 96, 96)
    bbox_delta = max(abs(a - b) for a, b in zip(base_bbox, dmg_bbox))

    # Greyscale tintable masks for body & iris
    greyscale_masks = {
        "10_body_greyscale": to_greyscale_tint_mask(base_layers["10_body"]),
        "20_iris_greyscale": to_greyscale_tint_mask(base_layers["20_iris"]),
    }

    # Elemental variants (byte-exact deterministic recolors)
    element_composites: dict[str, Image.Image] = {}
    for el in spec.elements:
        element_composites[el.id] = recolor_image_by_element(base_composite, base_element, el)

    # 8-Direction Turnaround: 5 generated + 3 mirrored (SE<-SW, E<-W, NE<-NW)
    direction_frames: dict[str, Image.Image] = {}
    for d in spec.character.ai_directions:
        d_layers = build_paperdoll_layers(base_element, direction=d)
        direction_frames[d] = composite_paperdoll(d_layers, canvas_size=(96, 96))
    for target_dir, source_dir in spec.character.mirrored_directions.items():
        direction_frames[target_dir] = direction_frames[source_dir].transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    # Loot icons
    loot_icons: dict[str, Image.Image] = {}
    for item in spec.loot_items:
        loot_icons[item.id] = generate_loot_icon(item, spec.elements)

    return {
        "baseLayers": base_layers,
        "greyscaleMasks": greyscale_masks,
        "baseComposite": base_composite,
        "damagedComposite": damaged_composite,
        "damagedBboxDeltaPx": bbox_delta,
        "elementComposites": element_composites,
        "directionFrames": direction_frames,
        "sockets": compute_frame_sockets(0, 0, "S"),
        "lootIcons": loot_icons,
    }
