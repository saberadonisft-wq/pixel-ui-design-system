"""Pixel Grid Reconstruction, CIELAB Chroma Key, hibit Downscaling & Elemental Recolor."""

from __future__ import annotations

import math
from collections import Counter, deque
from typing import Iterable

from PIL import Image

from .schema import ElementVariantSpec, OutlineMode


def rgb_to_lab(rgb: tuple[int, int, int]) -> tuple[float, float, float]:
    """Convert sRGB (0..255) to perceptual CIELAB (L*, a*, b*) for accurate chroma keying."""
    channels = []
    for value in rgb:
        norm = value / 255.0
        linear = norm / 12.92 if norm <= 0.04045 else ((norm + 0.055) / 1.055) ** 2.4
        channels.append(linear * 100.0)
    r, g, b = channels
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505

    def f(t: float) -> float:
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t) + (16.0 / 116.0)

    fx = f(x / 95.047)
    fy = f(y / 100.000)
    fz = f(z / 108.883)
    return (116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz))


def lab_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    """Compute perceptual Delta-E (CIE76) color distance."""
    la, aa, ba = rgb_to_lab(a)
    lb, ab, bb = rgb_to_lab(b)
    return math.sqrt((la - lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2)


def chroma_key_cielab(image: Image.Image, delta_e_threshold: float = 14.0) -> Image.Image:
    """Remove boundary-connected background in CIELAB space BEFORE quantization and enforce binary alpha."""
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()

    corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    bg_samples = [
        (pixels[cx, cy][0], pixels[cx, cy][1], pixels[cx, cy][2])
        for cx, cy in corners
        if pixels[cx, cy][3] > 0
    ]
    if not bg_samples:
        # Enforce strict binary alpha on already-transparent images
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                pixels[x, y] = (r, g, b, 255 if a >= 128 else 0)
        return rgba

    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def matches_bg(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        if a < 128:
            return True
        return any(lab_distance((r, g, b), sample) <= delta_e_threshold for sample in bg_samples)

    for x in range(width):
        for y in (0, height - 1):
            idx = y * width + x
            if not visited[idx] and matches_bg(x, y):
                visited[idx] = 1
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            idx = y * width + x
            if not visited[idx] and matches_bg(x, y):
                visited[idx] = 1
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                n_idx = ny * width + nx
                if not visited[n_idx] and matches_bg(nx, ny):
                    visited[n_idx] = 1
                    queue.append((nx, ny))

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (r, g, b, 255 if a >= 128 else 0)
    return rgba


def hibit_majority_downscale(
    high_res: Image.Image,
    cell_size: int = 8,
    preserve_glints: bool = True,
) -> Image.Image:
    """Downscale flat cel-art by cell_size×cell_size majority vote while preserving 1px specular glints."""
    rgba = high_res.convert("RGBA")
    src_w, src_h = rgba.size
    dst_w = max(1, src_w // cell_size)
    dst_h = max(1, src_h // cell_size)
    out = Image.new("RGBA", (dst_w, dst_h), (0, 0, 0, 0))
    src_px = rgba.load()
    dst_px = out.load()
    half_threshold = (cell_size * cell_size) // 2

    for gy in range(dst_h):
        for gx in range(dst_w):
            opaque_colors: list[tuple[int, int, int]] = []
            max_luma = -1
            glint_color: tuple[int, int, int] | None = None
            for sy in range(gy * cell_size, min(src_h, (gy + 1) * cell_size)):
                for sx in range(gx * cell_size, min(src_w, (gx + 1) * cell_size)):
                    r, g, b, a = src_px[sx, sy]
                    if a >= 128:
                        color = (r, g, b)
                        opaque_colors.append(color)
                        luma = (r * 299 + g * 587 + b * 114) // 1000
                        if luma > max_luma:
                            max_luma = luma
                            glint_color = color
            if len(opaque_colors) < half_threshold:
                dst_px[gx, gy] = (0, 0, 0, 0)
                continue
            counts = Counter(opaque_colors)
            winner, _ = counts.most_common(1)[0]
            winner_luma = (winner[0] * 299 + winner[1] * 587 + winner[2] * 114) // 1000
            if preserve_glints and glint_color is not None and max_luma >= 235 and max_luma - winner_luma >= 70:
                dst_px[gx, gy] = (*glint_color, 255)
            else:
                dst_px[gx, gy] = (*winner, 255)
    return out


def remove_orphan_pixels(image: Image.Image, min_cluster: int = 1) -> Image.Image:
    """Eliminate isolated noise pixels or tiny disconnected specks smaller than min_cluster."""
    rgba = image.convert("RGBA")
    w, h = rgba.size
    src = rgba.load()
    out = rgba.copy()
    dst = out.load()
    if min_cluster <= 1:
        for y in range(h):
            for x in range(w):
                if src[x, y][3] == 0:
                    continue
                neighbors = 0
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] == 255:
                        neighbors += 1
                if neighbors == 0:
                    dst[x, y] = (0, 0, 0, 0)
        return out

    visited = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0 or visited[y * w + x]:
                continue
            comp: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque([(x, y)])
            visited[y * w + x] = 1
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx] and src[nx, ny][3] == 255:
                        visited[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(comp) < min_cluster:
                for cx, cy in comp:
                    dst[cx, cy] = (0, 0, 0, 0)
    return out


def apply_selective_outline(
    image: Image.Image,
    mode: OutlineMode = "selective",
    dark_color: tuple[int, int, int] = (11, 14, 22),
) -> Image.Image:
    """Apply a crisp 1px pixel-art outline around opaque regions using selective or dark ink."""
    if mode == "none":
        return image.convert("RGBA")
    rgba = image.convert("RGBA")
    w, h = rgba.size
    src = rgba.load()
    out = rgba.copy()
    dst = out.load()

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if src[x, y][3] == 255:
                continue
            neighbor_colors: list[tuple[int, int, int]] = []
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                r, g, b, a = src[nx, ny]
                if a == 255 and (r, g, b) != dark_color:
                    neighbor_colors.append((r, g, b))
            if not neighbor_colors:
                continue
            if mode == "dark":
                dst[x, y] = (*dark_color, 255)
            else:
                # Selective outline quantized to 3 canonical dark outline inks (warm, cool, neutral)
                avg_r = sum(c[0] for c in neighbor_colors) // len(neighbor_colors)
                avg_b = sum(c[2] for c in neighbor_colors) // len(neighbor_colors)
                if avg_r > avg_b + 24:
                    dst[x, y] = (38, 22, 16, 255)
                elif avg_b > avg_r + 16:
                    dst[x, y] = (16, 26, 44, 255)
                else:
                    dst[x, y] = (*dark_color, 255)
    return out


def extract_palette(image: Image.Image) -> list[tuple[int, int, int]]:
    """Return unique RGB colors sorted from darkest to brightest."""
    rgba = image.convert("RGBA")
    unique: set[tuple[int, int, int]] = set()
    for r, g, b, a in rgba.getdata():
        if a == 255:
            unique.add((r, g, b))
    return sorted(unique, key=lambda c: c[0] * 299 + c[1] * 587 + c[2] * 114)


def recolor_image_by_element(
    image: Image.Image,
    base_element: ElementVariantSpec,
    target_element: ElementVariantSpec,
) -> Image.Image:
    """Deterministically remap primary, accent, and glow ramps to produce byte-exact elemental variants."""
    if base_element.id == target_element.id:
        return image.copy()

    color_map: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for src_c, dst_c in zip(base_element.primary_ramp, target_element.primary_ramp):
        color_map[src_c] = dst_c
    for src_c, dst_c in zip(base_element.accent_ramp, target_element.accent_ramp):
        color_map[src_c] = dst_c
    color_map[base_element.glow_rgb] = target_element.glow_rgb

    rgba = image.convert("RGBA")
    out = rgba.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 255 and (r, g, b) in color_map:
                nr, ng, nb = color_map[(r, g, b)]
                px[x, y] = (nr, ng, nb, 255)
    return out


def to_greyscale_tint_mask(image: Image.Image) -> Image.Image:
    """Convert an RGBA layer into a greyscale luminance mask preserving binary alpha for engine tinting."""
    rgba = image.convert("RGBA")
    out = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    src = rgba.load()
    dst = out.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 255:
                luma = min(255, max(0, (r * 299 + g * 587 + b * 114) // 1000))
                dst[x, y] = (luma, luma, luma, 255)
    return out


def save_png_safe(img: Image.Image, target_path: Any) -> None:
    """Encode PNG in memory first and write with Windows handle-lock retry protection."""
    import io
    from pathlib import Path
    import time

    p = Path(target_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    buf = io.BytesIO()
    img.save(buf, format="PNG", compress_level=9)
    payload = buf.getvalue()

    for attempt in range(6):
        try:
            p.write_bytes(payload)
            return
        except OSError:
            if attempt == 5:
                raise
            time.sleep(0.06 * (attempt + 1))
