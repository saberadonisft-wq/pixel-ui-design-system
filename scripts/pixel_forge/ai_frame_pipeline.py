"""Real AI Frame-by-Frame Post-Processing Pipeline:
1. CIELAB Flood-Fill + Interior Chroma-Hole Removal (preserving bright Cyan magic/visor)
2. Cross-Frame Foot-Baseline & Horizontal Centroid Alignment
3. Shared Accent-Preserving Master Palette LUT (eliminates multi-frame palette crawl)
4. Connected-Component Paper-Doll Segmentation + Modular Layer Registration
5. Unarmed Base Frames & Pre-Rendered Weapon Socket Poses (zero double-weapon / blur)
6. Authentic 8-Direction Turnaround (incl. Back N & 3/4 Back NW/NE), Element Recolors & -damaged Cracks
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

from .grid_cleaner import (
    apply_selective_outline,
    extract_palette,
    remove_orphan_pixels,
    save_png_safe,
    to_greyscale_tint_mask,
)
from .schema import ElementVariantSpec, ForgeProjectSpec, default_forge_project_spec


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
    interior_green_ratio: float = 1.18,
) -> Image.Image:
    """Remove AI chroma-key background (#00FF00) using CIELAB flood-fill while
    protecting high-blue cyan visor/rune glow from interior chroma and despill."""
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

    # Protect bright cyan visor eyes, frost/magic aura & teal highlights
    is_cyan_or_blue = (b_ch >= 115.0) & (g_ch <= b_ch * 1.25)

    is_green_key = (
        ~is_cyan_or_blue
        & (g_ch > 90.0)
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

    interior_chroma = ~is_cyan_or_blue & (
        (de <= tolerance_de * 0.88)
        | ((g_ch > 130.0) & (g_ch > r_ch * 1.30) & (g_ch > b_ch * 1.30))
    )
    bg_mask |= interior_chroma

    if h >= 256 and w >= 256:
        fringe = (
            ~bg_mask
            & ~is_cyan_or_blue
            & (
                bg_mask[np.clip(np.arange(h) - 1, 0, h - 1), :]
                | bg_mask[np.clip(np.arange(h) + 1, 0, h - 1), :]
                | bg_mask[:, np.clip(np.arange(w) - 1, 0, w - 1)]
                | bg_mask[:, np.clip(np.arange(w) + 1, 0, w - 1)]
            )
            & (g_ch > r_ch * 1.12)
            & (g_ch > b_ch * 1.14)
        )
        bg_mask |= fringe

    out = rgba.copy()
    out[bg_mask, :3] = 0
    out[bg_mask, 3] = 0
    out[~bg_mask, 3] = 255

    # Clean only genuine chroma-green spill (never touching cyan/aqua visor pixels)
    fg = ~bg_mask
    r_o = out[:, :, 0].astype(np.int32)
    g_o = out[:, :, 1].astype(np.int32)
    b_o = out[:, :, 2].astype(np.int32)
    true_green_spill = fg & (g_o > r_o + 18) & (g_o > (b_o * 1.24)) & (b_o < 145)
    out[true_green_spill, 1] = np.maximum(out[true_green_spill, 0], out[true_green_spill, 2])

    return Image.fromarray(out, mode="RGBA")


def quantize_to_palette(
    img: Image.Image,
    palette_rgb: list[tuple[int, int, int]],
) -> Image.Image:
    """Snap every opaque foreground pixel cleanly onto the canonical shared palette LUT
    using weighted perceptual RGB distance while keeping strict binary alpha {0, 255}."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    fg = arr[:, :, 3] >= 128
    arr[~fg] = (0, 0, 0, 0)
    arr[fg, 3] = 255
    if int(fg.sum()) == 0 or not palette_rgb:
        return Image.fromarray(arr, mode="RGBA")

    pal = np.array(palette_rgb, dtype=np.float32)  # (K, 3)
    px = arr[fg, :3].astype(np.float32)  # (N, 3)
    # Perceptual sRGB weights (2, 4, 3) give more accurate skin/cyan/gold matching than unweighted L2
    diff = px[:, None, :] - pal[None, :, :]
    weights = np.array([2.0, 4.0, 3.0], dtype=np.float32)
    dist2 = np.sum((diff * diff) * weights[None, None, :], axis=2)
    nearest_idx = np.argmin(dist2, axis=1)
    mapped = np.array(palette_rgb, dtype=np.uint8)[nearest_idx]
    arr[fg, :3] = mapped
    return Image.fromarray(arr, mode="RGBA")


def quantize_rgba_palette(img: Image.Image, max_colors: int = 20) -> Image.Image:
    """Quantize opaque pixels to at most max_colors with rare high-chroma cyan preservation."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    fg = arr[:, :, 3] >= 128
    arr[~fg] = (0, 0, 0, 0)
    arr[fg, 3] = 255
    if int(fg.sum()) == 0:
        return Image.fromarray(arr, mode="RGBA")

    pal = build_master_palette([Image.fromarray(arr, mode="RGBA")], max_colors=max_colors)
    return quantize_to_palette(Image.fromarray(arr, mode="RGBA"), pal)


def build_master_palette(
    frames: list[Image.Image],
    max_colors: int = 20,
) -> list[tuple[int, int, int]]:
    """Build a single shared master palette <= max_colors across multiple frames,
    explicitly reserving rare glowing cyan visor/blade rune tones and dark ink outline."""
    all_rgb_chunks: list[np.ndarray] = []
    cyan_candidates: list[np.ndarray] = []

    for frame in frames:
        arr = np.array(frame.convert("RGBA"), dtype=np.uint8)
        fg = arr[:, :, 3] >= 128
        if not np.any(fg):
            continue
        pts = arr[fg, :3]
        all_rgb_chunks.append(pts)
        r = pts[:, 0].astype(np.int32)
        g = pts[:, 1].astype(np.int32)
        b = pts[:, 2].astype(np.int32)
        cyan = pts[(b >= 155) & (g >= 145) & ((b - r) >= 48)]
        if len(cyan) > 0:
            cyan_candidates.append(cyan)

    if not all_rgb_chunks:
        return [(11, 14, 22), (242, 246, 250)]

    merged = np.concatenate(all_rgb_chunks, axis=0)
    protected: list[tuple[int, int, int]] = [(11, 14, 22)]  # Always keep crisp ink outline
    if cyan_candidates:
        cyan_pts = np.concatenate(cyan_candidates, axis=0)
        med_c = tuple(int(v) for v in np.median(cyan_pts, axis=0))
        bright_c = (
            min(255, max(med_c[0] + 40, 140)),
            min(255, max(med_c[1] + 24, 232)),
            min(255, max(med_c[2] + 15, 250)),
        )
        protected.append(med_c)
        if max(abs(a - b) for a, b in zip(med_c, bright_c)) > 24:
            protected.append(bright_c)

    core_slots = max(4, max_colors - len(protected))
    # Cap median-cut input size to avoid slowdowns while staying deterministic
    step = max(1, len(merged) // 16384)
    sample = merged[::step].reshape(1, -1, 3)
    q_img = Image.fromarray(sample, mode="RGB").quantize(
        colors=core_slots,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    raw_pal = list({tuple(int(c) for c in px) for px in np.array(q_img).reshape(-1, 3)})

    # Merge any near-duplicate colors under Euclidean distance 14 before combining with protected accents
    unique_pal: list[tuple[int, int, int]] = list(protected)
    for col in sorted(raw_pal, key=lambda c: c[0] * 299 + c[1] * 587 + c[2] * 114):
        if len(unique_pal) >= max_colors:
            break
        if all(sum((a - b) ** 2 for a, b in zip(col, ex)) >= 14 * 14 for ex in unique_pal):
            unique_pal.append(col)

    return sorted(unique_pal[:max_colors], key=lambda c: c[0] * 299 + c[1] * 587 + c[2] * 114)


def downscale_pixel_crisp(
    cleaned_rgba: Image.Image,
    target_size: tuple[int, int],
) -> Image.Image:
    """Downscale high-res AI sprite sharply onto logical grid while preserving thin bright visor pixels."""
    tw, th = target_size
    mid = cleaned_rgba.resize((tw * 2, th * 2), resample=Image.Resampling.BILINEAR)
    small = mid.resize((tw, th), resample=Image.Resampling.NEAREST)
    arr = np.array(small.convert("RGBA"), dtype=np.uint8)
    alpha = arr[:, :, 3]
    arr[alpha < 128] = (0, 0, 0, 0)
    arr[alpha >= 128, 3] = 255
    return Image.fromarray(arr, mode="RGBA")


def normalize_and_pixelize_ai_frame(
    cleaned_rgba: Image.Image,
    canvas_size: tuple[int, int] = (96, 96),
    target_height: int = 84,
    foot_baseline_y: int = 88,
    max_colors: int = 20,
    shared_palette: list[tuple[int, int, int]] | None = None,
) -> Image.Image:
    """Crop the cleaned AI frame to its opaque bounding box, scale crisp onto canvas_size,
    lock feet to foot_baseline_y and horizontal centroid to canvas_size[0] // 2,
    preserving glowing visor eyes and snapping to shared_palette."""
    arr = np.array(cleaned_rgba.convert("RGBA"), dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] >= 128)
    if len(xs) == 0 or len(ys) == 0:
        return Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    cropped = cleaned_rgba.crop((x0, y0, x1, y1))

    cw, ch = cropped.size
    scale = min((canvas_size[0] - 6) / max(1, cw), target_height / max(1, ch))
    new_w = max(8, int(round(cw * scale)))
    new_h = max(8, int(round(ch * scale)))

    small = downscale_pixel_crisp(cropped, (new_w, new_h))

    # Rescue thin cyan visor slit pixels from full-res cropped alpha/RGB so bilateral blur cannot swallow 2px eyes
    c_arr = np.array(cropped.convert("RGBA"), dtype=np.uint8)
    c_fg = c_arr[:, :, 3] >= 128
    c_cyan = c_fg & (c_arr[:, :, 2] >= 150) & (c_arr[:, :, 1] >= 135) & (c_arr[:, :, 0] < 130)
    cy, cx = np.where(c_cyan)
    if len(cx) > 0:
        s_arr = np.array(small, dtype=np.uint8)
        for ry, rx in zip(cy, cx):
            gx = min(new_w - 1, max(0, int((rx / max(1, cw)) * new_w)))
            gy = min(new_h - 1, max(0, int((ry / max(1, ch)) * new_h)))
            # Keep cyan inside upper 45% (helmet/visor area) or blade runes if opaque neighbor exists
            if s_arr[gy, gx, 3] == 255:
                src_col = tuple(int(v) for v in c_arr[ry, rx, :3])
                if src_col[2] - src_col[0] >= 55:
                    s_arr[gy, gx, :3] = src_col
        small = Image.fromarray(s_arr, mode="RGBA")

    if shared_palette is not None:
        small_clean = quantize_to_palette(small, shared_palette)
    else:
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
    return canvas


def recolor_ai_sprite_element(
    master_96: Image.Image,
    element: ElementVariantSpec,
    max_colors: int = 20,
) -> Image.Image:
    """Recolor armor trim, cape, enamel, visor/blade glow AND harmonize steel plate temperature
    for the target element while keeping ink outlines dark and binary alpha exact."""
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
    # 1. Warm chromatic trim/plume -> Primary element ramp
    warm_mask = fg & (sat > 0.28) & (r >= b)
    # 2. Cool chromatic cape/shield enamel/visor -> Accent element ramp + Glow
    cool_mask = fg & (sat > 0.24) & (b > r)
    # 3. Neutral steel armor plate harmonic tint (skip dark ink outlines lum < 0.22)
    steel_mask = fg & ~warm_mask & ~cool_mask & (lum >= 0.22)

    if int(steel_mask.sum()) > 0:
        tint = np.array(a_light if element.id != "fire" else p_light, dtype=np.float32)
        strength = 0.26 if element.id != "shadow" else 0.38
        for ch_i in range(3):
            base_val = arr[:, :, ch_i].astype(np.float32)
            # Darken shadow steel slightly while infusing element tone
            target_val = base_val * (1.0 - strength) + tint[ch_i] * lum * strength
            if element.id == "shadow":
                target_val = target_val * 0.72
            out[steel_mask, ch_i] = np.clip(target_val[steel_mask], 0, 255).astype(np.uint8)

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

    # Guarantee visor cyan eyes map cleanly to element glow_rgb on upper head window
    visor_eye_region = fg & (b > r + 40) & (np.arange(arr.shape[0])[:, None] <= int(arr.shape[0] * 0.48))
    if np.any(visor_eye_region):
        out[visor_eye_region, :3] = glow

    return quantize_rgba_palette(Image.fromarray(out, mode="RGBA"), max_colors=max_colors)


def create_ai_damaged_variant(
    master_96: Image.Image,
    shared_palette: list[tuple[int, int, int]] | None = None,
    max_colors: int = 20,
) -> Image.Image:
    """Carve authentic diagonal pixel-art battle cracks, notched shield gouges, and scorch scuffs
    strictly inside interior opaque pixels (>=2px from boundary -> 0px bbox delta)."""
    arr = np.array(master_96.convert("RGBA"), dtype=np.uint8)
    fg = arr[:, :, 3] == 255
    interior = (
        fg
        & np.roll(fg, 1, axis=0)
        & np.roll(fg, -1, axis=0)
        & np.roll(fg, 1, axis=1)
        & np.roll(fg, -1, axis=1)
    )
    deep_crack = (14, 18, 28)
    scorch_edge = (68, 76, 92)
    spark_nick = (212, 224, 240)

    # Diagonal jagged shield slash + chest cuirass crack + helm dent
    crack_paths = [
        [(28 + i, 52 + i) for i in range(9)],          # Diagonal shield cleave
        [(36 - i // 2, 48 + i) for i in range(7)],     # Cross-crack on shield boss
        [(46 + i, 45 + i // 2) for i in range(8)],     # Cuirass chestplate gouge
        [(43 + i, 24 + (i % 2)) for i in range(6)],    # Greathelm brow scratch
    ]
    for path in crack_paths:
        for cx, cy in path:
            if 1 <= cy < arr.shape[0] - 1 and 1 <= cx < arr.shape[1] - 1 and interior[cy, cx]:
                arr[cy, cx, :3] = deep_crack
                if interior[cy + 1, cx]:
                    arr[cy + 1, cx, :3] = scorch_edge
                if interior[cy - 1, cx]:
                    arr[cy - 1, cx, :3] = spark_nick

    img_out = Image.fromarray(arr, mode="RGBA")
    if shared_palette is not None:
        return quantize_to_palette(img_out, shared_palette)
    return quantize_rgba_palette(img_out, max_colors=max_colors)


def _segment_kit_components(cleaned_kit: Image.Image) -> dict[str, Image.Image]:
    """Segment the 2x2 AI Paperdoll Equipment Kit using connected components rather than crude midpoint slicing,
    assigning small detached sparkles to their nearest major component."""
    arr = np.array(cleaned_kit.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    scale_step = max(2, min(w, h) // 256)
    small = cleaned_kit.resize((w // scale_step, h // scale_step), resample=Image.Resampling.NEAREST)
    s_arr = np.array(small, dtype=np.uint8)
    sh, sw, _ = s_arr.shape
    mask = s_arr[:, :, 3] >= 128

    visited = np.zeros((sh, sw), dtype=bool)
    components: list[dict[str, Any]] = []
    for sy in range(sh):
        for sx in range(sw):
            if mask[sy, sx] and not visited[sy, sx]:
                q: deque[tuple[int, int]] = deque([(sy, sx)])
                visited[sy, sx] = True
                pts: list[tuple[int, int]] = []
                while q:
                    cy, cx = q.popleft()
                    pts.append((cy, cx))
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < sh and 0 <= nx < sw and mask[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            q.append((ny, nx))
                ys = [p[0] * scale_step for p in pts]
                xs = [p[1] * scale_step for p in pts]
                area = len(pts) * (scale_step * scale_step)
                x0, y0 = max(0, min(xs) - scale_step), max(0, min(ys) - scale_step)
                x1, y1 = min(w, max(xs) + scale_step * 2), min(h, max(ys) + scale_step * 2)
                components.append(
                    {
                        "area": area,
                        "bbox": [x0, y0, x1, y1],
                        "cx": (x0 + x1) * 0.5,
                        "cy": (y0 + y1) * 0.5,
                    }
                )

    components.sort(key=lambda c: c["area"], reverse=True)
    if len(components) < 4:
        hw, hh = w // 2, h // 2
        return {
            "body": cleaned_kit.crop((0, 0, hw, hh)),
            "helm": cleaned_kit.crop((hw, 0, w, hh)),
            "shield": cleaned_kit.crop((0, hh, hw, h)),
            "sword": cleaned_kit.crop((hw, hh, w, h)),
        }

    majors = components[:4]
    # Expand major bounding boxes to absorb nearby detached sparkles (like sword blade glints)
    for minor in components[4:]:
        nearest = min(majors, key=lambda m: (m["cx"] - minor["cx"]) ** 2 + (m["cy"] - minor["cy"]) ** 2)
        dist = ((nearest["cx"] - minor["cx"]) ** 2 + (nearest["cy"] - minor["cy"]) ** 2) ** 0.5
        if dist < max(w, h) * 0.32:
            b = nearest["bbox"]
            mb = minor["bbox"]
            b[0] = min(b[0], mb[0])
            b[1] = min(b[1], mb[1])
            b[2] = max(b[2], mb[2])
            b[3] = max(b[3], mb[3])

    # Assign roles by spatial quadrant centroid (top-left=body, top-right=helm, bottom-left=shield, bottom-right=sword)
    top_pair = sorted(majors, key=lambda m: m["cy"])[:2]
    bot_pair = sorted(majors, key=lambda m: m["cy"])[2:]
    body_c, helm_c = sorted(top_pair, key=lambda m: m["cx"])
    shield_c, sword_c = sorted(bot_pair, key=lambda m: m["cx"])

    result: dict[str, Image.Image] = {}
    for key, comp in (("body", body_c), ("helm", helm_c), ("shield", shield_c), ("sword", sword_c)):
        x0, y0, x1, y1 = comp["bbox"]
        # Mask out pixels belonging strictly inside another major component's tight bbox if slight rect overlap occurs
        piece = Image.new("RGBA", cleaned_kit.size, (0, 0, 0, 0))
        crop_p = cleaned_kit.crop((x0, y0, x1, y1))
        piece.paste(crop_p, (x0, y0), crop_p)
        result[key] = piece.crop((x0, y0, x1, y1))
    return result


def _crop_and_scale_piece(
    piece_rgba: Image.Image,
    target_w: int,
    target_h: int,
    shared_palette: list[tuple[int, int, int]] | None = None,
    max_colors: int = 18,
) -> Image.Image:
    """Crop opaque bounding box of an isolated AI piece and scale cleanly onto (<=target_w, <=target_h)."""
    arr = np.array(piece_rgba.convert("RGBA"), dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] >= 128)
    if len(xs) == 0 or len(ys) == 0:
        return Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    cropped = piece_rgba.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    cw, ch = cropped.size
    scale = min(target_w / max(1, cw), target_h / max(1, ch))
    nw = max(6, int(round(cw * scale)))
    nh = max(6, int(round(ch * scale)))
    small = downscale_pixel_crisp(cropped, (nw, nh))
    if shared_palette is not None:
        return remove_orphan_pixels(quantize_to_palette(small, shared_palette))
    return remove_orphan_pixels(quantize_rgba_palette(small, max_colors=max_colors))


def _extract_paladin_plate_armor(
    master_96: Image.Image,
    shield_piece: Image.Image,
    shared_palette: list[tuple[int, int, int]] | None,
) -> Image.Image:
    """Build concentric 64x64 Plate Cuirass + Winged Pauldrons + Royal Cape + Cross Shield
    aligned at (16, 26) with smooth anatomical collar/arm bounds and clean pixel outlines."""
    m_arr = np.array(master_96.convert("RGBA"), dtype=np.uint8)
    o_arr = np.zeros((64, 64, 4), dtype=np.uint8)
    for y96 in range(38, 83):
        y64 = y96 - 26
        if not (0 <= y64 < 64):
            continue
        for x96 in range(18, 69):
            x64 = x96 - 16
            if not (0 <= x64 < 64):
                continue
            r, g, b, a = m_arr[y96, x96]
            if a < 128:
                continue
            # Smooth U-shaped curved collar cutout under greathelm jaw (deepest at x96=48)
            if 40 <= x96 <= 57:
                collar_depth = 43 - max(0, (abs(x96 - 48) * 3) // 4)
                if y96 <= collar_depth:
                    continue
            # Softly round top left/right pauldron corners instead of flat y96=38 edge
            if y96 <= 39 and 34 <= x96 <= 63 and (x96 < 40 or x96 > 57) and y96 == 38:
                continue
            # Exclude diagonal greatsword blade extending past right gauntlet smoothly
            if x96 >= 59 and (x96 - y96) >= 13:
                continue
            if x96 >= 64 and y96 >= 55:
                continue
            # Leave lower greaves/boots (y96 >= 76) open so 10_body base boots remain clearly readable
            if y96 >= 76 and x96 >= 30:
                continue
            o_arr[y64, x64] = (r, g, b, 255)

    outfit_64 = remove_orphan_pixels(Image.fromarray(o_arr, mode="RGBA"))
    outfit_64 = apply_selective_outline(outfit_64, "dark", (11, 14, 22))
    sx = max(2, 16 - shield_piece.width // 2)
    sy = max(16, 33 - shield_piece.height // 2)
    outfit_64.paste(shield_piece, (sx, sy), shield_piece)
    outfit_64 = remove_orphan_pixels(outfit_64)
    if shared_palette is not None:
        return quantize_to_palette(outfit_64, shared_palette)
    return outfit_64


def extract_paperdoll_from_ai_kit(
    kit_img: Image.Image,
    master_frame_96: Image.Image,
    *,
    already_cleaned: bool = False,
    shared_palette: list[tuple[int, int, int]] | None = None,
) -> dict[str, Image.Image]:
    """Extract modular Paper-Doll layers from the AI 2x2 Kit Sheet using Connected Components,
    locking boots to Y=88 (via offset=(16, 26)) and helm+plume to (16, 4) with ZERO limb amputation."""
    cleaned_kit = kit_img if already_cleaned else remove_ai_chroma_background(kit_img)
    parts = _segment_kit_components(cleaned_kit)
    q_body = parts["body"]
    q_helm = parts["helm"]
    q_shield = parts["shield"]
    q_sword = parts["sword"]

    if shared_palette is None:
        shared_palette = build_master_palette([master_frame_96], max_colors=20)

    # 1. 00_shadow (64x64 at offset (16, 26) -> y_64=61..63 maps to Y=87..89 under feet)
    shadow = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    s_arr = np.array(shadow, dtype=np.uint8)
    for y in range(59, 64):
        for x in range(15, 50):
            dx = (x - 32.0) / 16.0
            dy = (y - 61.5) / 2.6
            if dx * dx + dy * dy <= 1.0:
                s_arr[y, x] = (14, 18, 28, 255)
    shadow = Image.fromarray(s_arr, mode="RGBA")

    # 2. 10_body (64x64 at offset (16, 26), target height 62px -> boots locked to y_64=62 == y_96=88)
    body_64 = normalize_and_pixelize_ai_frame(
        q_body,
        canvas_size=(64, 64),
        target_height=62,
        foot_baseline_y=62,
        max_colors=20,
        shared_palette=shared_palette,
    )

    # 3. 30_outfit (64x64 at offset (16, 26) -> Plate Cuirass + Cape + AI Shield)
    shield_piece = _crop_and_scale_piece(q_shield, target_w=24, target_h=28, shared_palette=shared_palette)
    outfit_64 = _extract_paladin_plate_armor(master_frame_96, shield_piece, shared_palette)

    # 4. 40_hair (64x64 at offset (16, 4) -> encloses arching Plume y_96=4..20 & Helm y_96=19..43 without clipping!)
    helm_piece = _crop_and_scale_piece(q_helm, target_w=42, target_h=40, shared_palette=shared_palette)
    helm_64 = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    hx = max(4, 33 - helm_piece.width // 2)
    hy = max(1, 39 - helm_piece.height)
    helm_64.paste(helm_piece, (hx, hy), helm_piece)

    # Extract strictly the eye-slit cyan visor glow from helm_64 onto 20_iris (ignoring outer helm wing glints!)
    iris_64 = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    h_arr = np.array(helm_64, dtype=np.uint8)
    i_arr = np.zeros((64, 64, 4), dtype=np.uint8)
    for y_h in range(24, 39):
        for x_h in range(25, 44):
            r, g, b, a = h_arr[y_h, x_h]
            if a == 255 and b >= 145 and g >= 135 and (int(b) - int(r)) >= 50:
                y_i = (y_h + 4) - 26
                if 0 <= y_i < 64:
                    i_arr[y_i, x_h] = (72, 232, 255, 255)
                    h_arr[y_h, x_h] = (14, 18, 28, 255)
    # Also draw crisp bright eye slit highlights matching 10_body eyes if visor extract is sparse
    if int((i_arr[:, :, 3] == 255).sum()) < 6:
        i_arr[7:9, 29:33] = (72, 232, 255, 255)
        i_arr[7:9, 36:40] = (72, 232, 255, 255)
        i_arr[7, 30] = (232, 252, 255, 255)
        i_arr[7, 37] = (232, 252, 255, 255)
    helm_64 = Image.fromarray(h_arr, mode="RGBA")
    iris_64 = Image.fromarray(i_arr, mode="RGBA")

    # 5. 50_weapon (96x96 upright-right Greatsword pinned at right-hand socket ~(62, 57))
    weapon_96 = _mount_weapon_at_socket(
        q_sword,
        rot_deg=48,
        target_w=36,
        target_h=46,
        hand_x=63,
        hand_y=57,
        anchor_mode="hilt_bottom_left",
        shared_palette=shared_palette,
    )

    # 6. 60_fx (96x96 crisp Paladin diamond runes & subtle aura sparkles)
    fx_96 = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    f_arr = np.array(fx_96, dtype=np.uint8)
    for rx, ry in ((16, 26), (80, 18), (12, 56), (82, 52), (46, 2)):
        for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            if 0 <= ry + dy < 96 and 0 <= rx + dx < 96:
                f_arr[ry + dy, rx + dx] = (255, 214, 92, 255)
        f_arr[ry, rx] = (255, 252, 232, 255)
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


def _mount_weapon_at_socket(
    raw_piece: Image.Image,
    rot_deg: float,
    target_w: int,
    target_h: int,
    hand_x: int,
    hand_y: int,
    anchor_mode: str = "hilt_bottom_left",
    shared_palette: list[tuple[int, int, int]] | None = None,
) -> Image.Image:
    """Rotate & downscale an AI weapon cleanly onto 96x96 aligned to right gauntlet (hand_x, hand_y)."""
    rotated = raw_piece.rotate(rot_deg, resample=Image.Resampling.NEAREST, expand=True)
    piece = _crop_and_scale_piece(
        rotated,
        target_w=target_w,
        target_h=target_h,
        shared_palette=shared_palette,
        max_colors=18,
    )
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    pw, ph = piece.size
    if anchor_mode == "hilt_bottom_left":
        px = hand_x - max(4, pw // 4)
        py = hand_y - ph + max(8, ph // 4)
    elif anchor_mode == "hilt_top_left":
        px = hand_x - max(4, pw // 4)
        py = hand_y - max(4, ph // 5)
    elif anchor_mode == "hilt_right":
        px = hand_x - pw + max(6, pw // 4)
        py = hand_y - max(4, ph // 3)
    else:
        px = hand_x - pw // 2
        py = hand_y - ph // 2
    px = max(0, min(96 - pw, px))
    py = max(0, min(96 - ph, py))
    canvas.paste(piece, (px, py), piece)
    return canvas


def extract_weapon_attachments_from_sheets(
    kit_img: Image.Image,
    loot_sheet_img: Image.Image | None,
    spec: ForgeProjectSpec,
    *,
    already_cleaned_kit: bool = False,
    shared_palette: list[tuple[int, int, int]] | None = None,
) -> dict[str, Image.Image]:
    """Generate 5 swappable 96x96 default weapon layers + crisp multi-pose weapon sprites
    for Animator & Battle Arena (no CSS blur rotation!)."""
    cleaned_kit = kit_img if already_cleaned_kit else remove_ai_chroma_background(kit_img)
    parts = _segment_kit_components(cleaned_kit)
    q_sword = parts["sword"]

    base_greatsword = _mount_weapon_at_socket(
        q_sword, rot_deg=48, target_w=36, target_h=46, hand_x=63, hand_y=57, shared_palette=shared_palette
    )
    weapons: dict[str, Image.Image] = {
        "greatsword": base_greatsword,
        "crimson-blade": recolor_ai_sprite_element(base_greatsword, spec.elements[1], max_colors=18),
        "frost-blade": recolor_ai_sprite_element(base_greatsword, spec.elements[2], max_colors=18),
    }

    if loot_sheet_img is not None:
        lw, lh = loot_sheet_img.size
        col_w = lw // 3
        row_h = lh // 2

        c_sun = remove_ai_chroma_background(loot_sheet_img.crop((8, 8, col_w - 8, row_h - 8)))
        weapons["sunblade"] = _mount_weapon_at_socket(
            c_sun, rot_deg=10, target_w=38, target_h=48, hand_x=63, hand_y=57, shared_palette=None
        )

        c_staff = remove_ai_chroma_background(loot_sheet_img.crop((col_w + 8, 8, col_w * 2 - 8, row_h - 8)))
        weapons["staff"] = _mount_weapon_at_socket(
            c_staff, rot_deg=12, target_w=36, target_h=52, hand_x=63, hand_y=57, shared_palette=None
        )
    else:
        weapons["sunblade"] = base_greatsword.copy()
        weapons["staff"] = recolor_ai_sprite_element(base_greatsword, spec.elements[3], max_colors=18)

    return weapons


def generate_weapon_pose_sprites(
    kit_img: Image.Image,
    loot_sheet_img: Image.Image | None,
    spec: ForgeProjectSpec,
    *,
    already_cleaned_kit: bool = False,
    shared_palette: list[tuple[int, int, int]] | None = None,
) -> dict[str, dict[str, Image.Image]]:
    """Pre-bake 5 crisp integer pixel-art poses per weapon (`ready`, `windup`, `cleave`, `guard`, `victory`)
    pinned cleanly to right-hand sockets without CSS rotation blur."""
    cleaned_kit = kit_img if already_cleaned_kit else remove_ai_chroma_background(kit_img)
    parts = _segment_kit_components(cleaned_kit)
    raw_weapons: dict[str, tuple[Image.Image, float]] = {
        "greatsword": (parts["sword"], 0.0),
    }
    if loot_sheet_img is not None:
        lw, lh = loot_sheet_img.size
        col_w, row_h = lw // 3, lh // 2
        c_sun = remove_ai_chroma_background(loot_sheet_img.crop((8, 8, col_w - 8, row_h - 8)))
        c_staff = remove_ai_chroma_background(loot_sheet_img.crop((col_w + 8, 8, col_w * 2 - 8, row_h - 8)))
        raw_weapons["sunblade"] = (c_sun, -35.0)
        raw_weapons["staff"] = (c_staff, -35.0)
    else:
        raw_weapons["sunblade"] = (parts["sword"], 0.0)
        raw_weapons["staff"] = (parts["sword"], 0.0)

    # Derived recolors for crimson & frost blades
    raw_weapons["crimson-blade"] = (recolor_ai_sprite_element(parts["sword"], spec.elements[1], max_colors=18), 0.0)
    raw_weapons["frost-blade"] = (recolor_ai_sprite_element(parts["sword"], spec.elements[2], max_colors=18), 0.0)

    pose_specs = {
        "ready": (48.0, 36, 46, 63, 57, "hilt_bottom_left"),
        "windup": (-22.0, 44, 34, 34, 24, "hilt_bottom_left"),
        "cleave": (-18.0, 46, 32, 32, 48, "hilt_top_left"),
        "guard": (62.0, 34, 44, 60, 56, "hilt_bottom_left"),
        "victory": (84.0, 26, 48, 56, 36, "hilt_bottom_left"),
    }

    poses_out: dict[str, dict[str, Image.Image]] = {}
    for w_id, (raw_img, base_offset_deg) in raw_weapons.items():
        w_pal = shared_palette if w_id == "greatsword" else build_master_palette([raw_img], max_colors=18)
        poses_out[w_id] = {}
        for p_id, (deg, tw, th, hx, hy, anchor) in pose_specs.items():
            poses_out[w_id][p_id] = _mount_weapon_at_socket(
                raw_img,
                rot_deg=deg + base_offset_deg,
                target_w=tw,
                target_h=th,
                hand_x=hx,
                hand_y=hy,
                anchor_mode=anchor,
                shared_palette=w_pal,
            )
    return poses_out


def build_unarmed_sprite_variant(
    sprite_96: Image.Image,
    clip_hint: str = "idle",
    shared_palette: list[tuple[int, int, int]] | None = None,
) -> Image.Image:
    """Remove the protruding Greatsword blade pixels from an AI knight frame without clipping
    the helmet crown/visor or leaving diagonal blade remnants during cleave swings."""
    arr = np.array(sprite_96.convert("RGBA"), dtype=np.uint8)
    h, w, _ = arr.shape
    out = arr.copy()

    if clip_hint in ("idle", "walk", "hurt"):
        # Exposed Greatsword extends right of right gauntlet (x >= 63, y <= 63) & below pommel (x >= 62, y=64..72)
        for y in range(h):
            for x in range(w):
                if (x >= 63 and y <= 63) or (x >= 62 and 64 <= y <= 72):
                    out[y, x] = (0, 0, 0, 0)
    elif clip_hint == "attack_windup":
        # Overhead blade behind plume & extending diagonally right above helmet crown (keep helm crown y>=20, x<=62!)
        for y in range(h):
            for x in range(w):
                if (y <= 18 and x >= 56) or (y <= 19 and x >= 55 and int(out[y, x, 0]) < 140 and int(out[y, x, 2]) > 90) or (y <= 38 and x <= 25):
                    out[y, x] = (0, 0, 0, 0)
    elif clip_hint == "attack_cleave":
        # Clear right crescent slash arc (x >= 63), overhanging right glint (y <= 22, x >= 58), and sword handle/pommel left (x=7..26, y=41..60)
        for y in range(h):
            for x in range(w):
                if x >= 63 or (y <= 22 and x >= 58) or (7 <= x <= 26 and 41 <= y <= 60):
                    out[y, x] = (0, 0, 0, 0)
        # Clear crescent inner glow tongue along right waist/ribs (x=50..62, y=50..66)
        for y in range(50, 67):
            for x in range(50, 63):
                r, g, b, a = out[y, x]
                if a == 255 and ((int(r) > 185 and int(g) > 165) or (int(b) > 185 and int(g) > 175 and int(r) < 180)):
                    out[y, x] = (0, 0, 0, 0)
        # Remove diagonal sword blade crossing waist/skirt along true blade band:
        # upper blade boundary starts at y=49..50 at x=27 and slopes +0.48px/px down to y=62 at x=53;
        # reconstruct enclosed waist/tunic strictly from LOWER skirt/tasset pixels (below_px) so chest silver/gold NEVER smears down.
        for x in range(27, 63):
            cy = int(round(53.0 + 0.42 * (x - 16)))
            y_blade_top = int(round(49.5 + 0.48 * (x - 27)))
            y_lo = max(49, min(cy - 5, y_blade_top)) if x <= 53 else max(51, cy - 5)
            y_hi = min(75, cy + 4)
            below_px = None
            for sy in range(y_hi + 1, min(83, y_hi + 4)):
                if out[sy, x, 3] == 255:
                    pr, pg, pb, _ = out[sy, x]
                    # Skip bright silver/cyan edge highlights; prefer skirt/tasset/belt tones
                    if not (int(pb) > 195 and int(pg) > 195 and int(pr) > 160):
                        below_px = tuple(int(v) for v in out[sy, x])
                        break
            for y in range(y_lo, y_hi + 1):
                if out[y, x, 3] != 255:
                    continue
                if 29 <= x <= 53 and below_px is not None:
                    out[y, x] = below_px
                else:
                    out[y, x] = (0, 0, 0, 0)
    elif clip_hint == "victory":
        # Raised blade extending above gauntlet (y <= 36, x >= 54)
        for y in range(h):
            for x in range(w):
                if y <= 36 and x >= 54:
                    out[y, x] = (0, 0, 0, 0)

    cleaned = remove_orphan_pixels(Image.fromarray(out, mode="RGBA"), min_cluster=4)
    cleaned = apply_selective_outline(cleaned, "dark", (11, 14, 22))
    if shared_palette is not None:
        return quantize_to_palette(cleaned, shared_palette)
    return cleaned


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
            max_colors=18,
        )
        loot_icons[item.id] = icon_32
    return loot_icons


DIRECTION_META: dict[str, dict[str, Any]] = {
    "S": {"source": "ai-source", "label": "Nam (Chính diện S)", "mirrorOf": None},
    "SE": {"source": "ai-source", "label": "Đông Nam (Chéo phải SE)", "mirrorOf": None},
    "E": {"source": "ai-source", "label": "Đông (Nghiêng phải E)", "mirrorOf": None},
    "NE": {"source": "mirror-flip", "label": "Đông Bắc (Lưng phải NE)", "mirrorOf": "NW"},
    "N": {"source": "dorsal-pixel", "label": "Bắc (Sau lưng N)", "mirrorOf": None},
    "NW": {"source": "dorsal-pixel", "label": "Tây Bắc (Lưng trái NW)", "mirrorOf": None},
    "W": {"source": "mirror-flip", "label": "Tây (Nghiêng trái W)", "mirrorOf": "E"},
    "SW": {"source": "mirror-flip", "label": "Tây Nam (Chéo trái SW)", "mirrorOf": "SE"},
}


def _build_dorsal_from_silhouette(
    ref_sprite: Image.Image,
    master_palette: list[tuple[int, int, int]],
    *,
    is_diagonal: bool = False,
) -> Image.Image:
    """Construct a crisp pixel-art dorsal view directly from the hero's real sprite silhouette
    so headgear, pauldrons, cloak folds, and boots match the AI keyframes 1:1."""
    arr = np.array(ref_sprite.convert("RGBA"), dtype=np.uint8)
    out = arr.copy()
    h, w, _ = out.shape

    # Sample hero's own dominant dark/mid/light cape & armor tones from upper/lower body
    fg_mask = (arr[:, :, 3] == 255) & (np.arange(h)[:, None] >= 36) & (np.arange(h)[:, None] <= 76)
    fg_pixels = arr[fg_mask, :3]
    if len(fg_pixels) > 0:
        lums = 0.299 * fg_pixels[:, 0] + 0.587 * fg_pixels[:, 1] + 0.114 * fg_pixels[:, 2]
        sats = (fg_pixels.max(axis=1).astype(np.float32) - fg_pixels.min(axis=1).astype(np.float32)) / np.maximum(
            1.0, fg_pixels.max(axis=1).astype(np.float32)
        )
        colored = fg_pixels[sats >= 0.22]
        if len(colored) >= 6:
            c_lums = 0.299 * colored[:, 0] + 0.587 * colored[:, 1] + 0.114 * colored[:, 2]
            order = np.argsort(c_lums)
            cape_dark = (*tuple(int(v) for v in colored[order[len(order) // 6]]), 255)
            cape_mid = (*tuple(int(v) for v in colored[order[len(order) // 2]]), 255)
            cape_light = (*tuple(int(v) for v in colored[order[(len(order) * 5) // 6]]), 255)
        else:
            cape_dark, cape_mid, cape_light = (24, 48, 112, 255), (42, 82, 172, 255), (76, 128, 214, 255)
        order_all = np.argsort(lums)
        trim_gold = (*tuple(int(v) for v in fg_pixels[order_all[(len(order_all) * 4) // 5]]), 255)
    else:
        cape_dark, cape_mid, cape_light = (24, 48, 112, 255), (42, 82, 172, 255), (76, 128, 214, 255)
        trim_gold = (224, 174, 64, 255)

    steel_dark = (62, 68, 82, 255)
    steel_mid = (118, 126, 142, 255)
    steel_light = (178, 188, 204, 255)
    ink = (11, 14, 22, 255)

    cx = 46 if is_diagonal else 48
    for y in range(18, 80):
        row_xs = np.where(out[y, :, 3] == 255)[0]
        if len(row_xs) < 4:
            continue
        x_min, x_max = int(row_xs.min()), int(row_xs.max())
        for x in range(x_min + 1, x_max):
            if out[y, x, 3] != 255:
                continue
            r, g, b, _ = out[y, x]
            # Preserve dark 1px outlines
            if int(r) < 28 and int(g) < 32 and int(b) < 42:
                continue
            if 22 <= y <= 37:
                # Replace front visor/face slits with solid shaded rear helmet/hood cranium
                rel = (x - x_min) / max(1, x_max - x_min)
                if abs(x - cx) <= 1 and y % 2 == 0:
                    out[y, x] = trim_gold
                elif rel < 0.34:
                    out[y, x] = steel_light if int(r) + int(g) + int(b) > 220 else cape_light
                elif rel < 0.72:
                    out[y, x] = steel_mid if int(r) + int(g) + int(b) > 180 else cape_mid
                else:
                    out[y, x] = steel_dark if int(r) + int(g) + int(b) > 180 else cape_dark
            elif 38 <= y <= 76 and (x_min + 2) <= x <= (x_max - 2):
                # Flowing stepped dorsal mantle with vertical pleat folds & golden hem
                if y >= 74:
                    out[y, x] = trim_gold if y == 74 else ink
                elif y <= 40:
                    out[y, x] = steel_mid if x < cx else steel_dark
                else:
                    fold = (x - cx + (y - 38) // 6) % 7
                    if fold in (0, 1):
                        out[y, x] = cape_dark
                    elif fold in (2, 3):
                        out[y, x] = cape_light if x < cx + 4 else cape_mid
                    else:
                        out[y, x] = cape_mid

    res = apply_selective_outline(Image.fromarray(out, mode="RGBA"), "dark", (11, 14, 22))
    return quantize_to_palette(res, master_palette)


def build_ai_8_directions(
    cleaned_frames: dict[str, Image.Image],
    master_palette: list[tuple[int, int, int]],
) -> dict[str, Image.Image]:
    """Construct a spatially accurate 8-direction compass turnaround:
    - S: Front stance
    - SE: 3/4 Front-Right stance (AI native)
    - SW: 3/4 Front-Left stance (Horizontal mirror of SE)
    - E: East right-facing stride (AI native)
    - W: West left-facing stride (Horizontal mirror of E)
    - N: Dorsal back stance built directly from the hero's pixel silhouette
    - NW: 3/4 Back-Left stance built from West silhouette
    - NE: 3/4 Back-Right stance (Horizontal mirror of NW)
    """
    front = cleaned_frames["knight-idle-f0"]
    se_frame = cleaned_frames["knight-idle-f1"]
    e_frame = cleaned_frames["knight-walk-f0"]
    w_frame = e_frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    unarmed_front = build_unarmed_sprite_variant(front, clip_hint="idle", shared_palette=master_palette)
    unarmed_w = build_unarmed_sprite_variant(w_frame, clip_hint="walk", shared_palette=master_palette)

    # Symmetrize central stance slightly for pure N dorsal view
    n_base = unarmed_front.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    back_n = _build_dorsal_from_silhouette(n_base, master_palette, is_diagonal=False)
    back_nw = _build_dorsal_from_silhouette(unarmed_w, master_palette, is_diagonal=True)

    return {
        "S": front.copy(),
        "SE": se_frame.copy(),
        "E": e_frame.copy(),
        "NE": back_nw.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        "N": back_n,
        "NW": back_nw,
        "W": w_frame,
        "SW": se_frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
    }


def build_character_bible_assets(
    master_96: Image.Image,
    cleaned_frames: dict[str, Image.Image],
    elements: tuple[Any, ...],
    master_palette: list[tuple[int, int, int]] | None = None,
) -> dict[str, Any]:
    """Generate the promised Character Bible assets on integer pixel canvases:
    - 6 Portrait Expressions (48x48 RGBA)
    - 3 Ascension Skins (96x96 RGBA)
    - 1 SD Chibi Form (64x64 RGBA)"""
    # Locate head center for crisp 48x48 portrait crop
    m_arr = np.array(master_96.convert("RGBA"), dtype=np.uint8)
    ys, xs = np.where((m_arr[:, :, 3] == 255) & (np.arange(96)[:, None] <= 48))
    cx = int(round(float(xs.mean()))) if len(xs) > 0 else 48
    top_y = max(0, (int(ys.min()) - 2) if len(ys) > 0 else 4)
    x0 = max(0, min(96 - 48, cx - 24))
    y0 = max(0, min(96 - 48, top_y))

    base_bust = master_96.crop((x0, y0, x0 + 48, y0 + 48))
    vic_src = cleaned_frames.get("knight-victory-f0", master_96)
    vic_bust = vic_src.crop((x0, y0, x0 + 48, y0 + 48))
    atk_src = cleaned_frames.get("knight-attack-f0", master_96)
    atk_bust = atk_src.crop((x0, y0, x0 + 48, y0 + 48))

    expressions: dict[str, dict[str, Any]] = {}
    expr_defs = [
        ("neutral", "Điềm Tĩnh (Neutral)", base_bust, (72, 232, 255, 255)),
        ("determined", "Quyết Chiến (Determined)", atk_bust, (255, 214, 72, 255)),
        ("victory", "Khải Hoàn (Victory)", vic_bust, (255, 244, 142, 255)),
        ("hurt", "Chịu Đòn (Battle Scar)", base_bust, (255, 84, 84, 255)),
        ("arcane-trance", "Thức Tỉnh Pháp Ấn (Arcane)", base_bust, (168, 128, 255, 255)),
        ("command", "Hiệu Lệnh Quân Đoàn (Command)", vic_bust, (92, 248, 184, 255)),
    ]
    for exp_id, exp_label, src_bust, accent_rgba in expr_defs:
        p = src_bust.copy()
        d = ImageDraw.Draw(p)
        # Stepped pixel portrait corner brackets + expression aura cue
        d.rectangle((1, 1, 5, 2), fill=accent_rgba)
        d.rectangle((1, 1, 2, 5), fill=accent_rgba)
        d.rectangle((42, 1, 46, 2), fill=accent_rgba)
        d.rectangle((45, 1, 46, 5), fill=accent_rgba)
        if exp_id == "determined":
            d.rectangle((20, 22, 23, 23), fill=accent_rgba)
            d.rectangle((26, 22, 29, 23), fill=accent_rgba)
        elif exp_id == "victory":
            for sx, sy in ((8, 10), (39, 10), (24, 4)):
                d.rectangle((sx, sy, sx + 1, sy + 1), fill=accent_rgba)
        elif exp_id == "hurt":
            d.line((18, 18, 23, 23), fill=(255, 84, 84, 255), width=1)
            d.rectangle((37, 14, 39, 16), fill=(255, 142, 72, 255))
        elif exp_id == "arcane-trance":
            for sx, sy in ((7, 20), (40, 20), (10, 34), (37, 34)):
                d.rectangle((sx, sy, sx + 1, sy + 2), fill=accent_rgba)
        elif exp_id == "command":
            d.rectangle((22, 6, 25, 8), fill=accent_rgba)
            d.rectangle((7, 14, 9, 15), fill=accent_rgba)
            d.rectangle((38, 14, 40, 15), fill=accent_rgba)
        expressions[exp_id] = {"label": exp_label, "image": p}

    # 3 Ascension Skins (96x96)
    astral_el = elements[2] if len(elements) > 2 else elements[0]
    crimson_el = elements[1] if len(elements) > 1 else elements[0]
    skin_vanguard = master_96.copy()
    skin_astral = recolor_ai_sprite_element(vic_src, astral_el, max_colors=20)
    da = ImageDraw.Draw(skin_astral)
    for rx, ry in ((18, 22), (76, 20), (20, 56), (78, 52)):
        da.rectangle((rx, ry, rx + 2, ry + 2), fill=(164, 236, 255, 255))
    skin_crimson = recolor_ai_sprite_element(atk_src, crimson_el, max_colors=20)
    dc = ImageDraw.Draw(skin_crimson)
    for rx, ry in ((16, 26), (78, 24), (18, 60), (80, 54)):
        dc.rectangle((rx, ry, rx + 2, ry + 2), fill=(255, 168, 72, 255))

    skins = {
        "vanguard-armor": {"label": "Giáp Tiên Phong (Tier I)", "image": skin_vanguard},
        "astral-robe": {"label": "Thánh Y Tinh Hà (Tier II)", "image": skin_astral},
        "crimson-awakened": {"label": "Huyết Thần Thức Tỉnh (UR)", "image": skin_crimson},
    }

    # 1 Super-Deformed 2-Head-Tall Chibi (64x64, feet at Y=58)
    chibi = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    head_crop = master_96.crop((max(0, cx - 22), y0, min(96, cx + 22), min(96, y0 + 38)))
    body_crop = master_96.crop((max(0, cx - 24), min(80, y0 + 36), min(96, cx + 28), 89))
    head_sd = head_crop.resize((36, 32), resample=Image.Resampling.NEAREST)
    body_sd = body_crop.resize((34, 24), resample=Image.Resampling.NEAREST)
    # Shadow oval
    cd = ImageDraw.Draw(chibi)
    cd.rectangle((18, 57, 45, 59), fill=(14, 18, 28, 255))
    chibi.alpha_composite(body_sd, dest=(15, 35))
    chibi.alpha_composite(head_sd, dest=(14, 7))
    chibi = remove_orphan_pixels(apply_selective_outline(chibi, "dark", (11, 14, 22)), min_cluster=3)
    if master_palette is not None:
        chibi = quantize_to_palette(chibi, master_palette)

    return {
        "expressions": expressions,
        "skins": skins,
        "chibi": chibi,
    }


_RAW_AI_DIR_CACHE: dict[str, dict[str, Any]] = {}


def _build_chroma_plate_from_rgba(sprite_rgba: Image.Image, bg_rgb: tuple[int, int, int] = (0, 255, 0)) -> Image.Image:
    """Composite an RGBA sprite over a pure #00FF00 plate for Stage 01 raw thumbnail parity."""
    plate = Image.new("RGBA", sprite_rgba.size, (*bg_rgb, 255))
    plate.alpha_composite(sprite_rgba.convert("RGBA"))
    return plate


def _derive_missing_motion_frame(
    idle_clean: Image.Image,
    attack_clean: Image.Image | None,
    suffix: str,
) -> Image.Image:
    """Derive a clean pixel-locked keyframe when an IDE runs in Fast Pack mode (fewer than 7 character plates)."""
    base = normalize_and_pixelize_ai_frame(idle_clean, (96, 96), 84, 88, max_colors=24)
    arr = np.array(base, dtype=np.uint8)
    out = np.zeros_like(arr)

    if suffix == "idle_f1":
        out[0:63, :] = arr[1:64, :]
        out[63:96, :] = arr[63:96, :]
        bridge = (out[62, :, 3] == 0) & (arr[63, :, 3] == 255)
        out[62, bridge] = arr[63, bridge]
        return Image.fromarray(out, mode="RGBA")

    if suffix == "walk_f0":
        out[0:66, 1:96] = arr[0:66, 0:95]
        out[66:89, 0:48] = arr[66:89, 2:50]
        out[66:89, 50:96] = arr[66:89, 48:94]
        return Image.fromarray(out, mode="RGBA")

    if suffix == "walk_f1":
        out[0:65, :] = arr[1:66, :]
        out[65:89, 2:50] = arr[65:89, 0:48]
        out[65:89, 46:94] = arr[65:89, 48:96]
        return Image.fromarray(out, mode="RGBA")

    if suffix == "attack_f0":
        out[0:62, 0:94] = arr[2:64, 2:96]
        out[62:96, :] = arr[62:96, :]
        return Image.fromarray(out, mode="RGBA")

    if suffix == "attack_f1":
        src = normalize_and_pixelize_ai_frame(attack_clean, (96, 96), 84, 88, max_colors=24) if attack_clean is not None else base
        s_arr = np.array(src, dtype=np.uint8)
        out[:, 3:96] = s_arr[:, 0:93]
        img = Image.fromarray(out, mode="RGBA")
        d = ImageDraw.Draw(img)
        for step in range(18, 72, 2):
            rx = min(93, 74 + int(round(12 * np.sin((step - 18) / 54.0 * np.pi))))
            d.rectangle((rx - 2, step, rx, step + 2), fill=(255, 244, 168, 255))
            d.point((min(94, rx + 1), step + 1), fill=(255, 252, 232, 255))
        return img

    # victory_f0
    out[0:62, :] = arr[2:64, :]
    out[62:96, :] = arr[62:96, :]
    img = Image.fromarray(out, mode="RGBA")
    d = ImageDraw.Draw(img)
    for sx, sy in ((20, 14), (76, 12), (48, 4), (16, 42), (82, 38)):
        d.rectangle((sx - 1, sy, sx + 1, sy), fill=(255, 224, 96, 255))
        d.rectangle((sx, sy - 1, sx, sy + 1), fill=(255, 224, 96, 255))
        d.point((sx, sy), fill=(255, 252, 236, 255))
    return img


def _derive_missing_kit_from_idle(idle_clean: Image.Image) -> Image.Image:
    """Synthesize a clean 192x192 2x2 modular kit from an AI idle sprite when `{slug}_paperdoll_kit.png` is omitted."""
    norm_96 = normalize_and_pixelize_ai_frame(idle_clean, (96, 96), 84, 88, max_colors=24)
    unarmed_96 = build_unarmed_sprite_variant(norm_96, "idle")
    kit = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    # Top-left: unarmed body
    kit.paste(unarmed_96, (0, 0), unarmed_96)
    # Top-right: headgear / hair region (y=2..40, x=20..76)
    helm_crop = norm_96.crop((20, 2, 76, 40))
    kit.paste(helm_crop, (116, 24), helm_crop)
    # Bottom-left: off-hand / torso mantle region (x=12..46, y=38..80)
    shield_crop = norm_96.crop((12, 38, 46, 80))
    kit.paste(shield_crop, (30, 118), shield_crop)
    # Bottom-right: primary right-hand weapon region (x=54..95, y=6..76)
    weapon_crop = norm_96.crop((54, 6, 95, 76))
    if weapon_crop.getchannel("A").getbbox() is None:
        weapon_crop = norm_96.crop((48, 12, 92, 76))
    kit.paste(weapon_crop, (124, 108), weapon_crop)
    return kit


def resolve_raw_slot_file(raw_ai_dir: Path, slug: str, suffix: str) -> Path | None:
    """Locate `{slug}_{suffix}.png` first, falling back to `knight_{suffix}.png` only when slug=="knight"."""
    candidate = raw_ai_dir / f"{slug}_{suffix}.png"
    if candidate.exists():
        return candidate
    if slug == "knight":
        legacy = raw_ai_dir / f"knight_{suffix}.png"
        if legacy.exists():
            return legacy
    return None


def _compute_base_raw_ai_assets(raw_ai_dir: Path, slug: str = "knight") -> dict[str, Any]:
    """Process all AI frames using CIELAB Chroma Key BEFORE Shared Palette LUT quantization,
    supporting custom unit slugs (`{slug}_*.png`) and Fast-Pack auto-derivation."""
    png_mtimes = [p.stat().st_mtime_ns for p in raw_ai_dir.glob("*.png")] if raw_ai_dir.exists() else []
    latest_mtime = max(png_mtimes) if png_mtimes else 0
    cache_key = f"{raw_ai_dir.resolve()}::{slug}::{latest_mtime}"
    if cache_key in _RAW_AI_DIR_CACHE:
        return _RAW_AI_DIR_CACHE[cache_key]

    canonical_spec = default_forge_project_spec()
    frame_suffixes = (
        "idle_f0",
        "idle_f1",
        "walk_f0",
        "walk_f1",
        "attack_f0",
        "attack_f1",
        "victory_f0",
    )

    idle_path = resolve_raw_slot_file(raw_ai_dir, slug, "idle_f0")
    if idle_path is None:
        raise FileNotFoundError(f"Missing primary AI frame `{slug}_idle_f0.png` in {raw_ai_dir}")

    idle_raw_img = Image.open(idle_path).convert("RGBA")
    idle_cleaned = remove_ai_chroma_background(idle_raw_img)

    atk0_path = resolve_raw_slot_file(raw_ai_dir, slug, "attack_f0")
    atk0_cleaned = (
        remove_ai_chroma_background(Image.open(atk0_path).convert("RGBA"))
        if atk0_path is not None
        else None
    )

    cleaned_raw_sprites: dict[str, Image.Image] = {}
    raw_thumb_images: dict[str, Image.Image] = {}
    raw_slot_provenance: dict[str, str] = {}
    pre_palette_frames: list[Image.Image] = []

    for suffix in frame_suffixes:
        canonical_key = f"knight-{suffix.replace('_', '-')}"
        thumb_key = f"{slug.replace('_', '-')}-{suffix.replace('_', '-')}"
        slot_path = resolve_raw_slot_file(raw_ai_dir, slug, suffix)
        if slot_path is not None:
            raw_img = Image.open(slot_path).convert("RGBA")
            cleaned = remove_ai_chroma_background(raw_img)
            raw_thumb_images[thumb_key] = raw_img.resize((96, 96), resample=Image.Resampling.NEAREST)
            raw_slot_provenance[suffix] = "ai-raw"
        else:
            cleaned = _derive_missing_motion_frame(idle_cleaned, atk0_cleaned, suffix)
            raw_thumb_images[thumb_key] = _build_chroma_plate_from_rgba(cleaned).resize(
                (96, 96), resample=Image.Resampling.NEAREST
            )
            raw_slot_provenance[suffix] = "auto-derived"

        cleaned_raw_sprites[canonical_key] = cleaned
        pre = normalize_and_pixelize_ai_frame(cleaned, (96, 96), 84, 88, max_colors=24)
        pre_palette_frames.append(pre)

    # Build ONE canonical <= 20 color Master Palette shared across ALL AI frames
    master_palette = build_master_palette(pre_palette_frames, max_colors=20)

    cleaned_frames: dict[str, Image.Image] = {}
    for canonical_key, cleaned in cleaned_raw_sprites.items():
        cleaned_frames[canonical_key] = normalize_and_pixelize_ai_frame(
            cleaned,
            canvas_size=(96, 96),
            target_height=84,
            foot_baseline_y=88,
            max_colors=20,
            shared_palette=master_palette,
        )

    kit_thumb_key = f"{slug.replace('_', '-')}-paperdoll-kit"
    kit_path = resolve_raw_slot_file(raw_ai_dir, slug, "paperdoll_kit")
    if kit_path is not None:
        kit_raw = Image.open(kit_path).convert("RGBA")
        cleaned_kit = remove_ai_chroma_background(kit_raw)
        raw_thumb_images[kit_thumb_key] = kit_raw.resize((96, 96), resample=Image.Resampling.NEAREST)
        raw_slot_provenance["paperdoll_kit"] = "ai-raw"
    else:
        cleaned_kit = _derive_missing_kit_from_idle(idle_cleaned)
        raw_thumb_images[kit_thumb_key] = _build_chroma_plate_from_rgba(cleaned_kit).resize(
            (96, 96), resample=Image.Resampling.NEAREST
        )
        raw_slot_provenance["paperdoll_kit"] = "auto-derived"

    master_96 = cleaned_frames["knight-idle-f0"]
    layers = extract_paperdoll_from_ai_kit(
        cleaned_kit, master_96, already_cleaned=True, shared_palette=master_palette
    )

    loot_icons: dict[str, Image.Image] | None = None
    loot_raw: Image.Image | None = None
    loot_thumb_key = f"{slug.replace('_', '-')}-loot-sheet"
    loot_sheet_path = resolve_raw_slot_file(raw_ai_dir, slug, "loot_sheet")
    if loot_sheet_path is not None:
        loot_raw = Image.open(loot_sheet_path).convert("RGBA")
        raw_thumb_images[loot_thumb_key] = loot_raw.resize((96, 64), resample=Image.Resampling.NEAREST)
        loot_icons = extract_loot_from_ai_sheet(loot_raw, canonical_spec)
        raw_slot_provenance["loot_sheet"] = "ai-raw"
    else:
        raw_slot_provenance["loot_sheet"] = "procedural-fallback"

    weapon_layers = extract_weapon_attachments_from_sheets(
        cleaned_kit,
        loot_raw,
        canonical_spec,
        already_cleaned_kit=True,
        shared_palette=master_palette,
    )
    weapon_poses = generate_weapon_pose_sprites(
        cleaned_kit,
        loot_raw,
        canonical_spec,
        already_cleaned_kit=True,
        shared_palette=master_palette,
    )

    # Also build palette-quantized 256x144 arena master for parallax extraction
    arena_256x144: Image.Image | None = None
    arena_thumb_key = f"{slug.replace('_', '-')}-arena-stage"
    arena_path = resolve_raw_slot_file(raw_ai_dir, slug, "arena_stage")
    if arena_path is not None:
        arena_raw = Image.open(arena_path).convert("RGB")
        raw_thumb_images[arena_thumb_key] = arena_raw.convert("RGBA").resize(
            (128, 72), resample=Image.Resampling.NEAREST
        )
        arena_mid = arena_raw.resize((512, 288), resample=Image.Resampling.BILINEAR)
        arena_small = arena_mid.resize((256, 144), resample=Image.Resampling.NEAREST)
        arena_256x144 = arena_small.quantize(
            colors=20,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.NONE,
        ).convert("RGBA")
        raw_slot_provenance["arena_stage"] = "ai-raw"
    else:
        raw_slot_provenance["arena_stage"] = "biome-procedural"

    cached = {
        "cleanedFrames": cleaned_frames,
        "masterPalette": master_palette,
        "rawThumbImages": raw_thumb_images,
        "rawSlotProvenance": raw_slot_provenance,
        "layers": layers,
        "weaponLayers": weapon_layers,
        "weaponPoses": weapon_poses,
        "lootIcons": loot_icons,
        "arenaComposite": arena_256x144,
    }
    _RAW_AI_DIR_CACHE[cache_key] = cached
    return cached


def load_and_process_raw_ai_knight(
    raw_ai_dir: Path,
    generated_out_dir: Path,
    spec: ForgeProjectSpec,
    *,
    slug: str = "knight",
) -> dict[str, Any] | None:
    """Process every AI frame cleanly onto a shared Master Palette, build modular layers,
    swappable weapon pose overlays, elemental variants, and 8-direction turnaround.
    Supports both the canonical Paladin (`knight_*.png`) and custom units (`{slug}_*.png`)."""
    if resolve_raw_slot_file(raw_ai_dir, slug, "idle_f0") is None:
        return None

    base = _compute_base_raw_ai_assets(raw_ai_dir, slug=slug)
    generated_out_dir.mkdir(parents=True, exist_ok=True)
    master_palette = base["masterPalette"]

    raw_thumbnails: dict[str, str] = {}
    for stem, thumb_96 in base["rawThumbImages"].items():
        thumb_name = f"raw-{stem}.png"
        save_png_safe(thumb_96, generated_out_dir / thumb_name)
        raw_thumbnails[stem] = thumb_name

    for w_id, w_img in base["weaponLayers"].items():
        save_png_safe(w_img, generated_out_dir / f"layer-50_weapon-{w_id}.png")

    weapon_pose_files: dict[str, dict[str, str]] = {}
    for w_id, poses in base["weaponPoses"].items():
        weapon_pose_files[w_id] = {}
        for pose_name, p_img in poses.items():
            fname = f"weapon-{w_id}-pose-{pose_name}.png"
            save_png_safe(p_img, generated_out_dir / fname)
            weapon_pose_files[w_id][pose_name] = fname

    cleaned_frames = {k: v.copy() for k, v in base["cleanedFrames"].items()}
    layers = {k: v.copy() for k, v in base["layers"].items()}
    master_96 = cleaned_frames["knight-idle-f0"].copy()
    damaged_96 = create_ai_damaged_variant(master_96, shared_palette=master_palette, max_colors=20)
    loot_icons = (
        {k: v.copy() for k, v in base["lootIcons"].items()}
        if base["lootIcons"] is not None
        else None
    )
    arena_256 = base["arenaComposite"].copy() if base["arenaComposite"] is not None else None

    element_composites: dict[str, Image.Image] = {}
    for idx, el in enumerate(spec.elements):
        if idx == 0 and (el.id == spec.character.base_element or el.id == "solar"):
            element_composites[el.id] = master_96.copy()
        else:
            element_composites[el.id] = recolor_ai_sprite_element(master_96, el, max_colors=20)

    dir_frames = build_ai_8_directions(cleaned_frames, master_palette)
    bible_assets = build_character_bible_assets(
        master_96, cleaned_frames, spec.elements, master_palette=master_palette
    )

    return {
        "master96": master_96,
        "masterPalette": master_palette,
        "damaged96": damaged_96,
        "layers": layers,
        "greyscaleMasks": {
            "10_body": to_greyscale_tint_mask(layers["10_body"]),
            "20_iris": to_greyscale_tint_mask(layers["20_iris"]),
            "30_outfit": to_greyscale_tint_mask(layers["30_outfit"]),
            "40_hair": to_greyscale_tint_mask(layers["40_hair"]),
        },
        "elementComposites": element_composites,
        "directionFrames": dir_frames,
        "directionMeta": DIRECTION_META,
        "characterBible": bible_assets,
        "aiFrames": cleaned_frames,
        "rawThumbnails": raw_thumbnails,
        "rawSlotProvenance": dict(base.get("rawSlotProvenance", {})),
        "weaponPoseFiles": weapon_pose_files,
        "lootIcons": loot_icons,
        "arenaComposite": arena_256,
    }
