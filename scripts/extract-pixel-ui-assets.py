#!/usr/bin/env python3
"""Deterministically extract transparent pixel UI assets from the source board."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import deque
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "public" / "assets" / "pixel-ui" / "asset-manifest.json"


class ExtractionError(RuntimeError):
    """Raised when source data or a configured crop is invalid."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    return parser.parse_args()


def load_manifest(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise ExtractionError(f"Crop manifest is missing: {path}")
    with path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    assets = manifest.get("assets")
    if not isinstance(assets, list) or not assets:
        raise ExtractionError("Crop manifest must contain a non-empty assets array.")
    ids = [asset.get("id") for asset in assets]
    if any(not asset_id for asset_id in ids) or len(ids) != len(set(ids)):
        raise ExtractionError("Every asset requires a unique, non-empty id.")
    required_types = set(manifest.get("requiredAssetTypes", []))
    present_types = {asset.get("type") for asset in assets}
    missing_types = sorted(required_types - present_types)
    if missing_types:
        raise ExtractionError(f"Manifest is missing required asset types: {', '.join(missing_types)}")
    return manifest


def squared_distance(left: tuple[int, int, int], right: tuple[int, int, int]) -> int:
    return sum((a - b) ** 2 for a, b in zip(left, right))


def remove_edge_background(image: Image.Image, tolerance: int) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    rgb = image.convert("RGB")
    width, height = rgba.size
    if width == 0 or height == 0:
        raise ExtractionError("Cannot remove a background from an empty crop.")

    sample_points = ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1))
    samples = [rgb.getpixel(point) for point in sample_points]
    threshold = tolerance * tolerance

    def is_background(point: tuple[int, int]) -> bool:
        color = rgb.getpixel(point)
        return any(squared_distance(color, sample) <= threshold for sample in samples)

    queue: deque[tuple[int, int]] = deque()
    visited = bytearray(width * height)

    def seed(x: int, y: int) -> None:
        index = y * width + x
        if not visited[index] and is_background((x, y)):
            visited[index] = 1
            queue.append((x, y))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)

    removed = 0
    pixels = rgba.load()
    while queue:
        x, y = queue.popleft()
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        removed += 1
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= next_x < width and 0 <= next_y < height:
                index = next_y * width + next_x
                if not visited[index] and is_background((next_x, next_y)):
                    visited[index] = 1
                    queue.append((next_x, next_y))

    return rgba, removed


def trim_transparent(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ExtractionError("Background removal produced a fully transparent asset.")
    return image.crop(bounds)


def image_stats(image: Image.Image, dark_threshold: int = 48) -> dict[str, Any]:
    opaque = 0
    transparent = 0
    dark_opaque = 0
    alpha_values: set[int] = set()
    for red, green, blue, alpha in image.getdata():
        alpha_values.add(alpha)
        if alpha == 0:
            transparent += 1
        else:
            opaque += 1
            if max(red, green, blue) <= dark_threshold:
                dark_opaque += 1
    return {
        "width": image.width,
        "height": image.height,
        "opaquePixels": opaque,
        "transparentPixels": transparent,
        "darkOpaquePixels": dark_opaque,
        "alphaValues": sorted(alpha_values),
    }


def validate_asset(asset: dict[str, Any], stats: dict[str, Any]) -> None:
    if stats["opaquePixels"] == 0:
        raise ExtractionError(f"{asset['id']}: output is fully transparent.")
    if any(alpha not in (0, 255) for alpha in stats["alphaValues"]):
        raise ExtractionError(f"{asset['id']}: alpha edges are not binary: {stats['alphaValues']}")
    rules = asset.get("validation", {})
    if stats["opaquePixels"] < rules.get("minOpaquePixels", 1):
        raise ExtractionError(
            f"{asset['id']}: only {stats['opaquePixels']} opaque pixels; "
            f"minimum is {rules['minOpaquePixels']}."
        )
    if stats["darkOpaquePixels"] < rules.get("minDarkOpaquePixels", 0):
        raise ExtractionError(
            f"{asset['id']}: dark interior preservation check failed "
            f"({stats['darkOpaquePixels']} < {rules['minDarkOpaquePixels']})."
        )


def checkerboard(size: tuple[int, int], base: tuple[int, int, int], alternate: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", size, base)
    draw = ImageDraw.Draw(image)
    cell = 8
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=alternate)
    return image


def make_contact_sheet(
    results: list[dict[str, Any]],
    base_dir: Path,
    output: Path,
    palette: tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]],
) -> None:
    columns = 3
    cell_width = 260
    cell_height = 168
    rows = (len(results) + columns - 1) // columns
    sheet = checkerboard((columns * cell_width, rows * cell_height), palette[0], palette[1])
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, result in enumerate(results):
        column = index % columns
        row = index // columns
        left = column * cell_width
        top = row * cell_height
        asset = Image.open(base_dir / result["output"]).convert("RGBA")
        display = asset.resize((asset.width * 2, asset.height * 2), Image.Resampling.NEAREST)
        x = left + (cell_width - display.width) // 2
        y = top + 32 + (112 - display.height) // 2
        sheet.paste(display, (x, y), display)
        draw.text((left + 8, top + 8), result["id"], fill=palette[2], font=font)
        draw.text(
            (left + 8, top + cell_height - 18),
            f"{result['width']}x{result['height']} | alpha {result['alphaValues']}",
            fill=palette[2],
            font=font,
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="PNG", compress_level=9)


def main() -> int:
    args = parse_args()
    manifest_path = args.manifest.resolve()
    manifest = load_manifest(manifest_path)
    asset_root = manifest_path.parent
    source_path = (asset_root / manifest["source"]).resolve()
    if not source_path.is_file():
        raise ExtractionError(f"Source image is missing: {source_path}")

    source = Image.open(source_path)
    source.load()
    source_width, source_height = source.size
    default_tolerance = int(manifest.get("backgroundRemoval", {}).get("defaultTolerance", 26))
    results: list[dict[str, Any]] = []

    for asset in manifest["assets"]:
        x = int(asset["x"])
        y = int(asset["y"])
        width = int(asset["width"])
        height = int(asset["height"])
        if width <= 0 or height <= 0:
            raise ExtractionError(f"{asset['id']}: crop dimensions must be positive.")
        if x < 0 or y < 0 or x + width > source_width or y + height > source_height:
            raise ExtractionError(
                f"{asset['id']}: crop ({x}, {y}, {width}, {height}) exceeds "
                f"source bounds {source_width}x{source_height}."
            )

        crop = source.crop((x, y, x + width, y + height))
        if crop.width == 0 or crop.height == 0:
            raise ExtractionError(f"{asset['id']}: crop is empty.")

        removed = 0
        if asset.get("removeBackground", False):
            crop, removed = remove_edge_background(
                crop,
                int(asset.get("backgroundTolerance", default_tolerance)),
            )
        else:
            crop = crop.convert("RGBA")

        if asset.get("trim", False):
            crop = trim_transparent(crop)

        stats = image_stats(crop)
        validate_asset(asset, stats)
        output_path = (asset_root / asset["output"]).resolve()
        if output_path == source_path:
            raise ExtractionError(f"{asset['id']}: output must never overwrite the source image.")
        if asset_root not in output_path.parents:
            raise ExtractionError(f"{asset['id']}: output escapes the pixel-ui asset directory.")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        crop.save(output_path, format="PNG", compress_level=9)
        digest = hashlib.sha256(output_path.read_bytes()).hexdigest()

        result = {
            "id": asset["id"],
            "type": asset["type"],
            "output": str(output_path.relative_to(asset_root)).replace("\\", "/"),
            "sourceCrop": { "x": x, "y": y, "width": width, "height": height },
            "width": stats["width"],
            "height": stats["height"],
            "opaquePixels": stats["opaquePixels"],
            "transparentPixels": stats["transparentPixels"],
            "darkOpaquePixels": stats["darkOpaquePixels"],
            "alphaValues": stats["alphaValues"],
            "backgroundPixelsRemoved": removed,
            "sha256": digest,
        }
        if "nineSlice" in asset:
            result["nineSlice"] = asset["nineSlice"]
        results.append(result)
        print(f"extracted {asset['id']}: {stats['width']}x{stats['height']} -> {output_path}")

    metadata = {
        "schemaVersion": 1,
        "source": str(source_path.relative_to(ROOT)).replace("\\", "/"),
        "sourceWidth": source_width,
        "sourceHeight": source_height,
        "sourceMode": source.mode,
        "sourceHasAlpha": "A" in source.getbands(),
        "backgroundRemoval": manifest.get("backgroundRemoval"),
        "assets": results,
    }
    metadata_path = asset_root / "generated" / "generated-metadata.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    make_contact_sheet(
        results,
        asset_root,
        asset_root / "debug" / "contact-sheet-light.png",
        ((238, 238, 238), (208, 208, 208), (12, 12, 12)),
    )
    make_contact_sheet(
        results,
        asset_root,
        asset_root / "debug" / "contact-sheet-dark.png",
        ((24, 27, 32), (42, 46, 54), (244, 244, 244)),
    )
    print(f"wrote metadata: {metadata_path}")
    print(f"wrote contact sheets: {asset_root / 'debug'}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ExtractionError as error:
        print(f"pixel-ui extraction failed: {error}", file=sys.stderr)
        raise SystemExit(1)
