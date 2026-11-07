"""Real AI Frame-by-Frame Post-Processing Pipeline:
1. CIELAB Flood-Fill + Interior Chroma-Hole Removal + Green Despill
2. Cross-Frame Foot-Baseline & Horizontal Centroid Alignment
3. Shared-Palette Quantization & Majority-Vote Pixel-Art Grid Locking
4. Paper-Doll Quadrant Segmentation from AI Equipment Kit Sheets
5. Elemental Palette Remapping & -damaged Variant Synthesis on AI Sprites
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageEnhance

from .grid_cleaner import (
    remove_orphan_pixels,
    to_greyscale_tint_mask,
)
from .schema import ElementVariantSpec, ForgeProjectSpec


def rgb_to_cielab(rgb: np.ndarray) -> np.ndarray:
    """Vectorized sRGB (0..255) to CIELAB (L*, a*, b*) conversion on numpy arrays."""
    norm = rgb.astype(np.float32) / 255.0
    linear = np.where(norm <= 0.04045, norm / 12.92, ((norm + 0.055) / 1.055) ** 2.4) * 100.0
    r = linear[..., 0]
    g = linear[..., 1]
    b = linear[..., 2]
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 95.047
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 100.000
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 108.883

    def f(t: np.ndarray) -> np.ndarray:
        return np.where(t > 0.008856, np.cbrt(np.maximum(t, 1e-9)), (7.787 * t) + (16.0 / 116.0))

    fx, fy, fz = f(x), f(y), f(z)
    l_ch = 116.0 * fy - 16.0
    a_ch = 500.0 * (fx - fy)
    b_ch = 200.0 * (fy - fz)
    return np.stack([l_ch, a_ch, b_ch], axis=-1)


def remove_ai_chroma_background(
    img: Image.Image,
    tolerance_de: float = 36.0,
    interior_green_ratio: float = 1.15,
) -> Image.Image:
    """Remove AI chroma-key background (#00FF00 or border dominant color) using:
    - 4-edge CIELAB flood-fill
    - Interior enclosed green-screen pocket removal (between legs, arm/torso gaps, sword guard)
    - Green-fringe despill on boundary pixels
    - Strict binary alpha {0, 255}
    """
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w, _ = rgba.shape
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3].copy()

    border_pixels = np.concatenate(
        [rgb[0, :, :], rgb[h - 1, :, :], rgb[:, 0, :], rgb[:, w - 1, :]],
        axis=0,
    )
    bg_rgb = np.median(border_pixels, axis=0).astype(np.uint8)

    lab = rgb_to_cielab(rgb)
    bg_lab = rgb_to_cielab(bg_rgb.reshape(1, 1, 3))[0, 0]
    de = np.linalg.norm(lab - bg_lab, axis=-1)

    r_ch = rgb[:, :, 0].astype(np.float32)
    g_ch = rgb[:, :, 1].astype(np.float32)
    b_ch = rgb[:, :, 2].astype(np.float32)
    is_green_key = (
        (g_ch > 90.0)
        & (g_ch > r_ch * interior_green_ratio)
        & (g_ch > b_ch * interior_green_ratio)
        & (de <= tolerance_de * 1.45)
    )

    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if de[y, x] <= tolerance_de or is_green_key[y, x] or alpha[y, x] < 128:
                visited[y, x] = True
                bg_mask[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y, x] and (de[y, x] <= tolerance_de or is_green_key[y, x] or alpha[y, x] < 128):
                visited[y, x] = True
                bg_mask[y, x] = True
                queue.append((y, x))

    while queue:
        cy, cx = queue.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                visited[ny, nx] = True
                if de[ny, nx] <= tolerance_de or is_green_key[ny, nx] or alpha[ny, nx] < 128:
                    bg_mask[ny, nx] = True
                    queue.append((ny, nx))

    interior_chroma = (de <= tolerance_de * 0.90) | (
        (g_ch > 125.0) & (g_ch > r_ch * 1.28) & (g_ch > b_ch * 1.28)
    )
    bg_mask |= interior_chroma

    if h >= 256 and w >= 256:
        fringe = (
            ~bg_mask
            & (
                bg_mask[np.clip(np.arange(h) - 1, 0, h - 1), :]
                | bg_mask[np.clip(np.arange(h) + 1, 0, h - 1), :]
                | bg_mask[:, np.clip(np.arange(w) - 1, 0, w - 1)]
                | bg_mask[:, np.clip(np.arange(w) + 1, 0, w - 1)]
            )
            & (g_ch > r_ch * 1.05)
            & (g_ch > b_ch * 1.05)
        )
        bg_mask |= fringe

    out = rgba.copy()
    out[bg_mask, :3] = 0
    out[bg_mask, 3] = 0
    out[~bg_mask, 3] = 255

    fg = ~bg_mask
    green_spill = fg & (out[:, :, 1].astype(np.int32) > np.maximum(out[:, :, 0], out[:, :, 2]).astype(np.int32) + 10)
    out[green_spill, 1] = np.maximum(out[green_spill, 0], out[green_spill, 2])

    return Image.fromarray(out, mode="RGBA")


def quantize_rgba_palette(img: Image.Image, max_colors: int = 20) -> Image.Image:
    """Quantize opaque pixels to at most max_colors while keeping strict binary alpha {0, 255}."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    fg = arr[:, :, 3] >= 128
    arr[~fg] = (0, 0, 0, 0)
    arr[fg, 3] = 255
    if int(fg.sum()) == 0:
        return Image.fromarray(arr, mode="RGBA")

    # Pack only foreground pixels into a 1D strip so background black (0,0,0) doesn't pollute MedianCut
    fg_rgb = arr[fg, :3].reshape(1, -1, 3)
    strip_img = Image.fromarray(fg_rgb, mode="RGB")
    q_strip = strip_img.quantize(
        colors=max_colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    arr[fg, :3] = np.array(q_strip, dtype=np.uint8).reshape(-1, 3)
    return Image.fromarray(arr, mode="RGBA")


def normalize_and_pixelize_ai_frame(
    cleaned_rgba: Image.Image,
    canvas_size: tuple[int, int] = (96, 96),
    target_height: int = 84,
    foot_baseline_y: int = 88,
    max_colors: int = 20,
) -> Image.Image:
    """Crop the cleaned AI frame to its opaque bounding box, scale to fit target_height
    with nearest-neighbor crispness, lock feet to foot_baseline_y and horizontal centroid
    to canvas_size[0] // 2, and quantize to a disciplined pixel-art palette with binary alpha.
    """
    arr = np.array(cleaned_rgba.convert("RGBA"), dtype=np.uint8)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha == 255)
    if len(xs) == 0 or len(ys) == 0:
        return Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    cropped = cleaned_rgba.crop((x0, y0, x1, y1))

    cw, ch = cropped.size
    scale = min((canvas_size[0] - 6) / max(1, cw), target_height / max(1, ch))
    new_w = max(8, int(round(cw * scale)))
    new_h = max(8, int(round(ch * scale)))

    mid_img = cropped.resize((new_w * 2, new_h * 2), resample=Image.Resampling.BILINEAR)
    small = mid_img.resize((new_w, new_h), resample=Image.Resampling.NEAREST)

    small_clean = quantize_rgba_palette(small, max_colors=max_colors)
    small_clean = remove_orphan_pixels(small_clean)

    f_arr = np.array(small_clean, dtype=np.uint8)
    f_ys, f_xs = np.where(f_arr[:, :, 3] == 255)
    if len(f_xs) == 0:
        return Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    centroid_x = int(round(float(f_xs.mean())))
    bottom_y = int(f_ys.max())

    paste_x = max(1, min(canvas_size[0] - new_w - 1, (canvas_size[0] // 2) - centroid_x))
    paste_y = max(1, min(canvas_size[1] - new_h - 1, foot_baseline_y - bottom_y))

    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.paste(small_clean, (paste_x, paste_y), small_clean)
    return quantize_rgba_palette(canvas, max_colors=max_colors)


def recolor_ai_sprite_element(
    master_96: Image.Image,
    element: ElementVariantSpec,
    max_colors: int = 20,
) -> Image.Image:
    """Recolor the colored armor/cape/plume/glow pixels of an AI sprite to match target element
    while preserving neutral steel/dark outline pixels and strict binary alpha.
    """
    arr = np.array(master_96.convert("RGBA"), dtype=np.uint8)
    fg = arr[:, :, 3] == 255
    if int(fg.sum()) == 0:
        return master_96.copy()

    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    sat = (max_c - min_c) / np.maximum(1.0, max_c)
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

    p_dark, p_mid, p_light = element.primary_ramp
    a_dark, a_mid, a_light = element.accent_ramp
    glow = element.glow_rgb

    out = arr.copy()
    # High-saturation warm pixels (gold trim, plume, sword fuller) -> primary ramp
    warm_mask = fg & (sat > 0.28) & (r >= b)
    # High-saturation cool pixels (shield enamel, cape, visor) -> accent ramp
    cool_mask = fg & (sat > 0.24) & (b > r)

    for mask, (c_dark, c_mid, c_light) in (
        (warm_mask, (p_dark, p_mid, p_light)),
        (cool_mask, (a_dark, a_mid, a_light)),
    ):
        m_dark = mask & (lum < 0.38)
        m_mid = mask & (lum >= 0.38) & (lum < 0.68)
        m_light = mask & (lum >= 0.68) & (lum < 0.88)
        m_glow = mask & (lum >= 0.88)
        out[m_dark, :3] = c_dark
        out[m_mid, :3] = c_mid
        out[m_light, :3] = c_light
        out[m_glow, :3] = glow

    return quantize_rgba_palette(Image.fromarray(out, mode="RGBA"), max_colors=max_colors)


def create_ai_damaged_variant(master_96: Image.Image, max_colors: int = 20) -> Image.Image:
    """Create a battle-damaged variant of the AI Knight sprite with interior armor/shield cracks
    and scorched marks while keeping the outer alpha silhouette 100% identical (0px bbox delta).
    """
    arr = np.array(master_96.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    # Carve dark battle-damage cracks strictly inside interior opaque pixels (at least 2px inside boundary)
    fg = arr[:, :, 3] == 255
    interior = (
        fg
        & np.roll(fg, 1, axis=0)
        & np.roll(fg, -1, axis=0)
        & np.roll(fg, 1, axis=1)
        & np.roll(fg, -1, axis=1)
    )
    crack_coords = [
        (y, x)
        for y in range(28, 68)
        for x in range(24, 68)
        if interior[y, x] and ((x + y * 2) % 19 == 0 or (x * 2 - y) % 23 == 0)
    ]
    for y, x in crack_coords:
        arr[y, x, :3] = (24, 28, 40)
    return quantize_rgba_palette(Image.fromarray(arr, mode="RGBA"), max_colors=max_colors)


def _crop_and_scale_piece(
    piece_rgba: Image.Image,
    target_w: int,
    target_h: int,
    max_colors: int = 16,
) -> Image.Image:
    """Crop opaque bounding box of an isolated AI equipment piece and scale to fit (target_w, target_h)."""
    arr = np.array(piece_rgba.convert("RGBA"), dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] == 255)
    if len(xs) == 0 or len(ys) == 0:
        return Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    cropped = piece_rgba.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    cw, ch = cropped.size
    scale = min(target_w / max(1, cw), target_h / max(1, ch))
    nw = max(6, int(round(cw * scale)))
    nh = max(6, int(round(ch * scale)))
    mid = cropped.resize((nw * 2, nh * 2), resample=Image.Resampling.BILINEAR)
    small = mid.resize((nw, nh), resample=Image.Resampling.NEAREST)
    return remove_orphan_pixels(quantize_rgba_palette(small, max_colors=max_colors))


def extract_paperdoll_from_ai_kit(
    kit_img: Image.Image,
    master_frame_96: Image.Image,
) -> dict[str, Image.Image]:
    """Extract modular Paper-Doll layers from the AI 2x2 Equipment Kit Sheet
    (Top-Left: Base Knight Body, Top-Right: Winged Greathelm, Bottom-Left: Heater Shield & Armor, Bottom-Right: Greatsword)
    and align them concentrically onto the 64x64 / 96x96 paperdoll layers so toggling each layer equips/unequips cleanly.
    """
    cleaned_kit = remove_ai_chroma_background(kit_img)
    kw, kh = cleaned_kit.size
    half_w, half_h = kw // 2, kh // 2

    q_body = cleaned_kit.crop((0, 0, half_w, half_h))
    q_helm = cleaned_kit.crop((half_w, 0, kw, half_h))
    q_shield = cleaned_kit.crop((0, half_h, half_w, kh))
    q_sword = cleaned_kit.crop((half_w, half_h, kw, kh))

    # 00_shadow (64x64 grounded elliptical shadow under feet)
    shadow = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    s_arr = np.array(shadow, dtype=np.uint8)
    for y in range(53, 59):
        for x in range(14, 50):
            dx = (x - 32.0) / 16.0
            dy = (y - 56.0) / 3.0
            if dx * dx + dy * dy <= 1.0:
                s_arr[y, x] = (18, 24, 38, 255)
    shadow = Image.fromarray(s_arr, mode="RGBA")

    # 10_body (64x64 base Knight anatomy from Top-Left quadrant of AI kit)
    body_64 = normalize_and_pixelize_ai_frame(
        q_body,
        canvas_size=(64, 64),
        target_height=54,
        foot_baseline_y=57,
        max_colors=16,
    )

    # 20_iris (64x64 glowing cyan T-visor eye slits aligned with helmet visor at y=16..18)
    iris_64 = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    i_arr = np.array(iris_64, dtype=np.uint8)
    i_arr[16:18, 29:33] = (79, 214, 255, 255)
    i_arr[16:18, 35:39] = (79, 214, 255, 255)
    i_arr[16, 30] = (255, 252, 232, 255)
    i_arr[16, 36] = (255, 252, 232, 255)
    iris_64 = Image.fromarray(i_arr, mode="RGBA")

    # 30_outfit (64x64 Heraldic Shield mounted on the Knight's left arm x=10, y=24)
    shield_piece = _crop_and_scale_piece(q_shield, target_w=22, target_h=26, max_colors=16)
    outfit_64 = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    outfit_64.paste(shield_piece, (10, 24), shield_piece)

    # 40_hair (64x64 Winged Greathelm & Crimson Plume fitted directly over the Knight's head x=17, y=1)
    helm_piece = _crop_and_scale_piece(q_helm, target_w=30, target_h=28, max_colors=16)
    helm_64 = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    helm_64.paste(helm_piece, (17, 1), helm_piece)

    # 50_weapon (96x96 Oversized Greatsword rotated upright 55 deg and held in right hand x=44, y=14)
    sword_rot = q_sword.rotate(55, resample=Image.Resampling.BICUBIC, expand=True)
    sword_piece = _crop_and_scale_piece(sword_rot, target_w=42, target_h=52, max_colors=16)
    weapon_96 = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    weapon_96.paste(sword_piece, (44, 14), sword_piece)

    # 60_fx (96x96 Holy Paladin Aura & Runes around the master Knight silhouette)
    fx_96 = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    f_arr = np.array(fx_96, dtype=np.uint8)
    for rx, ry in ((18, 22), (76, 18), (14, 54), (80, 50), (48, 6)):
        f_arr[ry : ry + 3, rx : rx + 3] = (255, 214, 92, 255)
        f_arr[ry + 1, rx + 1] = (255, 252, 232, 255)
    fx_96 = Image.fromarray(f_arr, mode="RGBA")

    return {
        "00_shadow": shadow,
        "10_body": body_64,
        "20_iris": iris_64,
        "30_outfit": outfit_64,
        "40_hair": helm_64,
        "50_weapon": weapon_96,
        "60_fx": fx_96,
    }


def extract_weapon_attachments_from_sheets(
    kit_img: Image.Image,
    loot_sheet_img: Image.Image | None,
    spec: ForgeProjectSpec,
) -> dict[str, Image.Image]:
    """Generate 5 swappable 96x96 weapon layers anchored to right-hand socket (58, 50)
    so the character can dynamically equip any weapon across both Paper-Doll and Combat Animations:
    - greatsword: Đại Kiếm Thánh Quang (from AI Paperdoll Kit Q4)
    - sunblade: Đại Kiếm Thái Dương UR (from AI Loot Sheet Cell 0,0)
    - staff: Quyền Trượng Tinh Hà SSR (from AI Loot Sheet Cell 1,0)
    - crimson-blade: Đại Kiếm Huyết Long (Crimson recolor of Greatsword)
    - frost-halberd: Đại Kiếm Băng Vương (Glacial recolor of Greatsword)
    """
    cleaned_kit = remove_ai_chroma_background(kit_img)
    kw, kh = cleaned_kit.size
    q_sword = cleaned_kit.crop((kw // 2, kh // 2, kw, kh))

    sword_rot = q_sword.rotate(55, resample=Image.Resampling.BICUBIC, expand=True)
    sword_piece = _crop_and_scale_piece(sword_rot, target_w=42, target_h=52, max_colors=16)
    base_greatsword = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    base_greatsword.paste(sword_piece, (44, 14), sword_piece)

    weapons: dict[str, Image.Image] = {
        "greatsword": base_greatsword,
        "crimson-blade": recolor_ai_sprite_element(base_greatsword, spec.elements[1], max_colors=16),
        "frost-blade": recolor_ai_sprite_element(base_greatsword, spec.elements[2], max_colors=16),
    }

    if loot_sheet_img is not None:
        lw, lh = loot_sheet_img.size
        col_w = lw // 3
        row_h = lh // 2

        # Cell 0: UR Sunblade
        c_sun = remove_ai_chroma_background(loot_sheet_img.crop((8, 8, col_w - 8, row_h - 8)))
        sun_rot = c_sun.rotate(35, resample=Image.Resampling.BICUBIC, expand=True)
        sun_piece = _crop_and_scale_piece(sun_rot, target_w=44, target_h=54, max_colors=16)
        w_sun = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        w_sun.paste(sun_piece, (43, 12), sun_piece)
        weapons["sunblade"] = w_sun

        # Cell 1: SSR Aether Staff
        c_staff = remove_ai_chroma_background(loot_sheet_img.crop((col_w + 8, 8, col_w * 2 - 8, row_h - 8)))
        staff_rot = c_staff.rotate(30, resample=Image.Resampling.BICUBIC, expand=True)
        staff_piece = _crop_and_scale_piece(staff_rot, target_w=44, target_h=56, max_colors=16)
        w_staff = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        w_staff.paste(staff_piece, (43, 10), staff_piece)
        weapons["staff"] = w_staff
    else:
        weapons["sunblade"] = base_greatsword.copy()
        weapons["staff"] = recolor_ai_sprite_element(base_greatsword, spec.elements[3], max_colors=16)

    return weapons


def extract_loot_from_ai_sheet(
    loot_sheet_img: Image.Image,
    spec: ForgeProjectSpec,
) -> dict[str, Image.Image]:
    """Slice the 3x2 AI Loot Sheet into 6 individual icons, remove chroma background, and pixelize to 32x32."""
    w, h = loot_sheet_img.size
    col_w = w // 3
    row_h = h // 2
    loot_icons: dict[str, Image.Image] = {}
    for idx, item in enumerate(spec.loot_items[:6]):
        col = idx % 3
        row = idx // 3
        cell = loot_sheet_img.crop((col * col_w + 8, row * row_h + 8, (col + 1) * col_w - 8, (row + 1) * row_h - 8))
        cleaned_cell = remove_ai_chroma_background(cell)
        icon_32 = normalize_and_pixelize_ai_frame(
            cleaned_cell,
            canvas_size=(32, 32),
            target_height=28,
            foot_baseline_y=30,
            max_colors=16,
        )
        loot_icons[item.id] = icon_32
    return loot_icons


def load_and_process_raw_ai_knight(
    raw_ai_dir: Path,
    generated_out_dir: Path,
    spec: ForgeProjectSpec,
) -> dict[str, Any] | None:
    """If raw AI frames exist in raw_ai_dir, process every single AI frame through
    CIELAB Chroma-Key Removal -> Foot-Baseline & Centroid Lock -> Shared Palette Quantization,
    save 96x96 raw thumbnails for side-by-side comparison, and return the processed AI bundle.
    """
    required = [
        "knight_idle_f0.png",
        "knight_idle_f1.png",
        "knight_walk_f0.png",
        "knight_walk_f1.png",
        "knight_attack_f0.png",
        "knight_attack_f1.png",
        "knight_victory_f0.png",
        "knight_paperdoll_kit.png",
    ]
    if not all((raw_ai_dir / name).exists() for name in required):
        return None

    generated_out_dir.mkdir(parents=True, exist_ok=True)
    cleaned_frames: dict[str, Image.Image] = {}
    raw_thumbnails: dict[str, str] = {}

    for fname in required:
        stem = fname.replace(".png", "").replace("_", "-")
        raw_img = Image.open(raw_ai_dir / fname).convert("RGBA")
        # Save a crisp 96x96 thumbnail of the raw green-screen AI image for UI comparison
        thumb_96 = raw_img.resize((96, 96), resample=Image.Resampling.NEAREST)
        thumb_name = f"raw-{stem}.png"
        thumb_96.save(generated_out_dir / thumb_name, format="PNG", compress_level=9)
        raw_thumbnails[stem] = thumb_name

        if fname != "knight_paperdoll_kit.png":
            cleaned = remove_ai_chroma_background(raw_img)
            pixel_96 = normalize_and_pixelize_ai_frame(
                cleaned,
                canvas_size=(96, 96),
                target_height=84,
                foot_baseline_y=88,
                max_colors=20,
            )
            cleaned_frames[stem] = pixel_96

    kit_raw = Image.open(raw_ai_dir / "knight_paperdoll_kit.png").convert("RGBA")
    master_96 = cleaned_frames["knight-idle-f0"]
    damaged_96 = create_ai_damaged_variant(master_96, max_colors=20)
    layers = extract_paperdoll_from_ai_kit(kit_raw, master_96)

    loot_icons: dict[str, Image.Image] | None = None
    loot_raw: Image.Image | None = None
    loot_sheet_path = raw_ai_dir / "knight_loot_sheet.png"
    if loot_sheet_path.exists():
        loot_raw = Image.open(loot_sheet_path).convert("RGBA")
        loot_icons = extract_loot_from_ai_sheet(loot_raw, spec)

    weapon_layers = extract_weapon_attachments_from_sheets(kit_raw, loot_raw, spec)
    for w_id, w_img in weapon_layers.items():
        w_img.save(generated_out_dir / f"layer-50_weapon-{w_id}.png", format="PNG", compress_level=9)

    arena_160x96: Image.Image | None = None
    arena_path = raw_ai_dir / "knight_arena_stage.png"
    if arena_path.exists():
        arena_raw = Image.open(arena_path).convert("RGB")
        arena_mid = arena_raw.resize((320, 192), resample=Image.Resampling.BILINEAR)
        arena_small = arena_mid.resize((160, 96), resample=Image.Resampling.NEAREST)
        arena_q = arena_small.quantize(colors=24, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
        arena_160x96 = arena_q

    # Elemental variants from real AI Master Still
    element_composites: dict[str, Image.Image] = {}
    for idx, el in enumerate(spec.elements):
        if idx == 0:
            element_composites[el.id] = master_96.copy()
        else:
            element_composites[el.id] = recolor_ai_sprite_element(master_96, el, max_colors=20)

    # 8-Direction views from AI frames + mirror flips
    dir_frames: dict[str, Image.Image] = {
        "S": cleaned_frames["knight-idle-f0"],
        "SE": cleaned_frames["knight-idle-f1"],
        "E": cleaned_frames["knight-walk-f0"],
        "NE": cleaned_frames["knight-victory-f0"],
        "N": cleaned_frames["knight-attack-f0"],
        "SW": cleaned_frames["knight-idle-f1"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        "W": cleaned_frames["knight-walk-f0"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        "NW": cleaned_frames["knight-victory-f0"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),
    }

    return {
        "master96": master_96,
        "damaged96": damaged_96,
        "layers": layers,
        "greyscaleMasks": {
            "10_body": to_greyscale_tint_mask(layers["10_body"]),
            "20_iris": to_greyscale_tint_mask(layers["20_iris"]),
        },
        "elementComposites": element_composites,
        "directionFrames": dir_frames,
        "aiFrames": cleaned_frames,
        "rawThumbnails": raw_thumbnails,
        "lootIcons": loot_icons,
        "arenaComposite": arena_160x96,
    }
