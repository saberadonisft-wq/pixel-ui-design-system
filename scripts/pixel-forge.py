#!/usr/bin/env python3
"""Unified CLI for the End-to-End Pixel Asset, Sprite, Paperdoll, Motion, Map & Atlas Forge."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pixel_forge.batch_runner import compile_unit_10_frame_ai_prompts, run_batch_forge
from pixel_forge.motion_engine import build_character_animation_clips, build_dual_buffer_vfx
from pixel_forge.paperdoll_builder import build_paperdoll_and_loot_bundle
from pixel_forge.prompt_compiler import compile_prompt_pack
from pixel_forge.schema import default_forge_project_spec
from pixel_forge.validate_forge import evaluate_quality_gates, render_forge_contact_sheet
from pixel_forge.world_and_atlas import (
    build_parallax_battle_plate,
    build_wang_autotile_16,
    export_engine_manifests,
    generate_25d_lighting_maps,
    pack_multi_map_atlas,
)

ROOT = Path(__file__).resolve().parents[1]
FORGE_OUT = ROOT / "public" / "assets" / "pixel-forge" / "generated"
DEBUG_OUT = ROOT / "public" / "assets" / "pixel-ui" / "debug"
ROSTER_PATH = ROOT / "forge-roster.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        nargs="?",
        default="all",
        choices=("all", "build", "validate", "prompts", "batch", "batch-prompts", "batch-validate"),
        help="Pipeline stage to execute.",
    )
    parser.add_argument(
        "--roster",
        default=str(ROSTER_PATH),
        help="Path to forge-roster.json for batch mass production.",
    )
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = parse_args()
    spec = default_forge_project_spec()
    FORGE_OUT.mkdir(parents=True, exist_ok=True)
    DEBUG_OUT.mkdir(parents=True, exist_ok=True)

    roster_file = Path(args.roster)
    if args.command == "batch-prompts":
        roster_data = json.loads(roster_file.read_text(encoding="utf-8"))
        matrix = {
            u["id"]: {
                "name": u["name"],
                "rarity": u["rarity"],
                "baseElement": u["baseElement"],
                "prompts": compile_unit_10_frame_ai_prompts(u),
            }
            for u in roster_data.get("units", [])
        }
        out_p = FORGE_OUT.parent / "batch-prompts.json"
        out_p.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Batch prompts compiled ({len(matrix)} units, 10 AI prompts each) -> {out_p}")
        return 0

    if args.command in ("batch", "batch-validate"):
        batch_summary = run_batch_forge(roster_file, ROOT)
        print(
            f"Batch Forge complete: {batch_summary['totalUnits']} units built | "
            f"Average Quality Score: {batch_summary['averageScore']}/100 | "
            f"All Passed: {batch_summary['allUnitsPassed']}"
        )
        for u in batch_summary["units"]:
            print(f"  [PASS {u['qualityScore']}/100] {u['id']} ({u['name']} - {u['rarity'].upper()}) -> {u['outputDir']}")
        return 0 if batch_summary["allUnitsPassed"] else 1

    # 1. Compile Prompt Pack
    prompt_pack = compile_prompt_pack(spec)
    prompt_path = FORGE_OUT / "forge-prompts.json"
    prompt_path.write_text(json.dumps(prompt_pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.command == "prompts":
        print(f"wrote prompt pack: {prompt_path}")
        return 0

    # 2. Build 7-Layer Paperdoll, Greyscale Masks, Elemental Variants, 8-Dir & Loot Icons
    pd_bundle = build_paperdoll_and_loot_bundle(spec)
    layer_files: dict[str, str] = {}
    for layer_id, img in pd_bundle["baseLayers"].items():
        fname = f"layer-{layer_id}.png"
        img.save(FORGE_OUT / fname, format="PNG", compress_level=9)
        layer_files[layer_id] = fname

    for mask_id, img in pd_bundle["greyscaleMasks"].items():
        img.save(FORGE_OUT / f"mask-{mask_id}.png", format="PNG", compress_level=9)

    pd_bundle["baseComposite"].save(FORGE_OUT / "hero-master-still.png", format="PNG", compress_level=9)
    pd_bundle["damagedComposite"].save(FORGE_OUT / "hero-master-damaged.png", format="PNG", compress_level=9)

    element_files: dict[str, str] = {}
    for el_id, img in pd_bundle["elementComposites"].items():
        fname = f"hero-element-{el_id}.png"
        img.save(FORGE_OUT / fname, format="PNG", compress_level=9)
        element_files[el_id] = fname

    direction_files: dict[str, str] = {}
    for d_id, img in pd_bundle["directionFrames"].items():
        fname = f"hero-dir-{d_id}.png"
        img.save(FORGE_OUT / fname, format="PNG", compress_level=9)
        direction_files[d_id] = fname

    loot_files: dict[str, str] = {}
    for loot_id, img in pd_bundle["lootIcons"].items():
        fname = f"{loot_id}.png"
        img.save(FORGE_OUT / fname, format="PNG", compress_level=9)
        loot_files[loot_id] = fname

    # 3. Build 5 Animation Clips + Dual-Buffer VFX Sequences
    clips_bundle = build_character_animation_clips(spec)
    clip_files: dict[str, dict[str, object]] = {}
    for clip_id, c_data in clips_bundle.items():
        strip_name = f"clip-{clip_id}-strip.png"
        c_data["strip"].save(FORGE_OUT / strip_name, format="PNG", compress_level=9)
        frame_names: list[str] = []
        for idx, f_img in enumerate(c_data["frames"]):
            f_name = f"clip-{clip_id}-f{idx}.png"
            f_img.save(FORGE_OUT / f_name, format="PNG", compress_level=9)
            frame_names.append(f_name)
        clip_files[clip_id] = {
            "strip": strip_name,
            "frames": frame_names,
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

    vfx_bundles: list[dict[str, object]] = []
    vfx_files: dict[str, dict[str, object]] = {}
    for vfx_spec in spec.vfx_sequences:
        vb = build_dual_buffer_vfx(vfx_spec, spec.elements[0])
        vfx_bundles.append(vb)
        col_name = f"{vfx_spec.id}-color-strip.png"
        emi_name = f"{vfx_spec.id}-emissive-strip.png"
        comp_name = f"{vfx_spec.id}-composite-strip.png"
        vb["colorStrip"].save(FORGE_OUT / col_name, format="PNG", compress_level=9)
        vb["emissiveStrip"].save(FORGE_OUT / emi_name, format="PNG", compress_level=9)
        vb["compositeStrip"].save(FORGE_OUT / comp_name, format="PNG", compress_level=9)
        f_names: list[str] = []
        for idx, f_img in enumerate(vb["frames"]):
            fn = f"{vfx_spec.id}-f{idx}.png"
            f_img.save(FORGE_OUT / fn, format="PNG", compress_level=9)
            f_names.append(fn)
        vfx_files[vfx_spec.id] = {
            "name": vfx_spec.name,
            "category": vfx_spec.category,
            "colorStrip": col_name,
            "emissiveStrip": emi_name,
            "compositeStrip": comp_name,
            "frames": f_names,
            "fps": vfx_spec.fps,
            "craftChecksPassed": vb["craftChecksPassed"],
        }

    # 4. Build 16-Tile Wang Autotile, 3-Layer Parallax Battle Stage & 2.5D Lighting Maps
    autotile_bundle = build_wang_autotile_16(spec.tileset)
    autotile_bundle["sheet"].save(FORGE_OUT / "autotile-16-sheet.png", format="PNG", compress_level=9)
    autotile_bundle["mapPreview"].save(FORGE_OUT / "autotile-map-preview.png", format="PNG", compress_level=9)

    parallax_bundle = build_parallax_battle_plate(spec.tileset)
    if pd_bundle.get("arenaComposite") is not None:
        parallax_bundle["composite"] = pd_bundle["arenaComposite"]
    parallax_bundle["skyFar"].save(FORGE_OUT / "parallax-sky-far.png", format="PNG", compress_level=9)
    parallax_bundle["ruinsMid"].save(FORGE_OUT / "parallax-ruins-mid.png", format="PNG", compress_level=9)
    parallax_bundle["arenaGround"].save(FORGE_OUT / "parallax-arena-ground.png", format="PNG", compress_level=9)
    parallax_bundle["composite"].save(FORGE_OUT / "parallax-stage-composite.png", format="PNG", compress_level=9)

    hero_lighting = generate_25d_lighting_maps(pd_bundle["baseComposite"])
    hero_lighting["normal"].save(FORGE_OUT / "hero-master-normal.png", format="PNG", compress_level=9)
    hero_lighting["specular"].save(FORGE_OUT / "hero-master-specular.png", format="PNG", compress_level=9)
    hero_lighting["emissive"].save(FORGE_OUT / "hero-master-emissive.png", format="PNG", compress_level=9)

    # 5. Pack Synchronized Multi-Map Texture Atlas & Engine Exports
    atlas_entries = [
        {
            "id": f"hero_idle_{i}",
            "category": "character",
            "image": img,
            "pivot": {"x": 48, "y": 72},
            "sockets": clips_bundle["idle"]["socketsPerFrame"][i],
        }
        for i, img in enumerate(clips_bundle["idle"]["frames"])
    ] + [
        {
            "id": f"hero_attack_{i}",
            "category": "character",
            "image": img,
            "pivot": {"x": 48, "y": 72},
            "sockets": clips_bundle["attack"]["socketsPerFrame"][i],
        }
        for i, img in enumerate(clips_bundle["attack"]["frames"])
    ] + [
        {
            "id": item.id,
            "category": "loot",
            "image": pd_bundle["lootIcons"][item.id],
            "pivot": {"x": 16, "y": 16},
            "sockets": [],
        }
        for item in spec.loot_items
    ]
    atlas_bundle = pack_multi_map_atlas(atlas_entries, columns=4, cell_size=(96, 96))
    atlas_bundle["diffuseAtlas"].save(FORGE_OUT / "forge-atlas-diffuse.png", format="PNG", compress_level=9)
    atlas_bundle["normalAtlas"].save(FORGE_OUT / "forge-atlas-normal.png", format="PNG", compress_level=9)
    atlas_bundle["emissiveAtlas"].save(FORGE_OUT / "forge-atlas-emissive.png", format="PNG", compress_level=9)

    engine_exports = export_engine_manifests(spec, atlas_bundle, FORGE_OUT)

    # 6. Evaluate Automated Quality Gates & Render 2x Contact Sheets
    quality_report = evaluate_quality_gates(pd_bundle, clips_bundle, vfx_bundles, atlas_bundle)
    master_palette_hex = [
        f"#{r:02X}{g:02X}{b:02X}"
        for r, g, b in quality_report.get("paletteRgb", [])
    ]
    contact_items = [
        ("Master Still (96x96)", pd_bundle["baseComposite"]),
        ("Damaged Variant", pd_bundle["damagedComposite"]),
        ("Normal Map 2.5D", hero_lighting["normal"]),
        ("Emissive Map 2.5D", hero_lighting["emissive"]),
        ("Layer 10_body", pd_bundle["baseLayers"]["10_body"]),
        ("Layer 30_outfit", pd_bundle["baseLayers"]["30_outfit"]),
        ("Layer 50_weapon (96px)", pd_bundle["baseLayers"]["50_weapon"]),
        ("Wang 16-Autotile", autotile_bundle["sheet"]),
    ] + [(f"{item.id} ({item.rarity.upper()})", pd_bundle["lootIcons"][item.id]) for item in spec.loot_items[:4]]

    render_forge_contact_sheet(
        contact_items,
        DEBUG_OUT / "contact-sheet-forge-dark.png",
        (20, 24, 34),
        (34, 40, 54),
        (242, 246, 248),
    )
    render_forge_contact_sheet(
        contact_items,
        DEBUG_OUT / "contact-sheet-forge-light.png",
        (236, 240, 244),
        (208, 214, 222),
        (14, 18, 28),
    )

    manifest = {
        "schemaVersion": 1,
        "character": {
            "id": spec.character.id,
            "name": spec.character.name,
            "title": spec.character.title,
            "rarity": spec.character.rarity,
            "masterStill": "hero-master-still.png",
            "damagedStill": "hero-master-damaged.png",
            "normalMap": "hero-master-normal.png",
            "specularMap": "hero-master-specular.png",
            "emissiveMap": "hero-master-emissive.png",
            "damagedBboxDeltaPx": pd_bundle["damagedBboxDeltaPx"],
            "bodyCanvas": list(spec.character.body_canvas),
            "weaponCanvas": list(spec.character.weapon_canvas),
            "footBaselineY": spec.character.foot_baseline_y,
            "paletteHex": master_palette_hex,
        },
        "layers": layer_files,
        "sockets": pd_bundle["sockets"],
        "elements": {el.id: {"label": el.label, "file": element_files[el.id]} for el in spec.elements},
        "directions": direction_files,
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
            for item in spec.loot_items
        ],
        "world": {
            "tilesetId": spec.tileset.id,
            "tilesetName": spec.tileset.name,
            "autotileSheet": "autotile-16-sheet.png",
            "mapPreview": "autotile-map-preview.png",
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
            "frameCount": len(atlas_bundle["frames"]),
            "deduplicatedFrames": atlas_bundle["deduplicatedFrames"],
            "exports": engine_exports,
        },
        "qualityReport": quality_report,
    }
    manifest_path = FORGE_OUT / "forge-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        f"Pixel Forge build complete -> {FORGE_OUT}\n"
        f"Quality Gate Score: {quality_report['score']}/100 "
        f"({'PASS' if quality_report['allPassed'] else 'FAIL'})"
    )
    for check in quality_report["checks"]:
        status = "PASS" if check["passed"] else "FAIL"
        print(f"  [{status}] {check['label']}: {check['detail']}")

    if not quality_report["allPassed"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
