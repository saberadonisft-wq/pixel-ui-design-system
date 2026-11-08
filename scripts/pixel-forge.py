#!/usr/bin/env python3
"""Unified CLI for the End-to-End Pixel Asset, Sprite, Paperdoll, Motion, Map & Atlas Forge."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from pixel_forge.batch_runner import (
    compile_unit_10_frame_ai_prompts,
    register_unit_in_roster,
    run_batch_forge,
    run_single_unit_forge,
    unregister_unit_from_roster,
)
from pixel_forge.grid_cleaner import save_png_safe
from pixel_forge.motion_engine import build_character_animation_clips, build_dual_buffer_vfx
from pixel_forge.paperdoll_builder import build_paperdoll_and_loot_bundle
from pixel_forge.prompt_compiler import compile_prompt_pack
from pixel_forge.schema import default_forge_project_spec
from pixel_forge.validate_forge import (
    evaluate_quality_gates,
    render_forge_contact_sheet,
    validate_output_directory,
)
from pixel_forge.world_and_atlas import (
    build_parallax_battle_plate,
    build_wang_autotile_16,
    export_engine_manifests,
    generate_25d_lighting_maps,
    pack_engine_bundle_zip,
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
        choices=(
            "all",
            "build",
            "validate",
            "prompts",
            "batch",
            "batch-prompts",
            "batch-validate",
            "register-unit",
            "build-unit",
            "delete-unit",
        ),
        help="Pipeline stage to execute.",
    )
    parser.add_argument(
        "--roster",
        default=str(ROSTER_PATH),
        help="Path to forge-roster.json for batch mass production.",
    )
    parser.add_argument("--unit", "--id", dest="unit_id", help="Hero unit ID (e.g., hero-thunder-shogun).")
    parser.add_argument("--spec-json", help="Inline JSON payload for register-unit.")
    parser.add_argument("--spec-file", help="Path to JSON payload file for register-unit.")
    parser.add_argument("--name", help="Hero display name.")
    parser.add_argument("--title", help="Hero honorific title.")
    parser.add_argument("--role", default="Striker / Vanguard", help="Combat class role.")
    parser.add_argument("--rarity", default="ssr", choices=("common", "rare", "epic", "ssr", "ur"))
    parser.add_argument("--element", default="solar", choices=("solar", "fire", "ice", "shadow", "emerald"))
    parser.add_argument("--headgear", help="Headgear / hair pixel silhouette spec.")
    parser.add_argument("--silhouette", help="Full armor / outfit silhouette spec.")
    parser.add_argument("--weapon", help="Oversized signature weapon spec.")
    parser.add_argument("--skills", nargs="*", help="Optional hero skill names.")
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = parse_args()
    spec = default_forge_project_spec()
    FORGE_OUT.mkdir(parents=True, exist_ok=True)
    DEBUG_OUT.mkdir(parents=True, exist_ok=True)

    roster_file = Path(args.roster)

    if args.command == "register-unit":
        payload: dict[str, object] = {}
        if args.spec_file:
            payload = json.loads(Path(args.spec_file).read_text(encoding="utf-8"))
        elif args.spec_json:
            payload = json.loads(args.spec_json)

        uid = str(payload.get("id") or args.unit_id or "").strip()
        name = str(payload.get("name") or args.name or "").strip()
        if not uid or not name:
            print("ERROR: register-unit requires --id and --name (or --spec-json / --spec-file).", file=sys.stderr)
            return 1
        title = str(payload.get("title") or args.title or "Chiến Binh Thức Tỉnh")
        role = str(payload.get("classRole") or args.role or "Striker / Vanguard")
        rarity = str(payload.get("rarity") or args.rarity or "ssr")
        element = str(payload.get("baseElement") or args.element or "solar")
        silhouette = str(
            payload.get("silhouette")
            or args.silhouette
            or "Ornate 16-bit RPG battle armor with flowing elemental mantle and gauntlets"
        )
        headgear = str(payload.get("headgearSpec") or args.headgear or silhouette)
        weapon = str(payload.get("weaponSpec") or args.weapon or "Oversized glowing elemental relic weapon")
        raw_skills = payload.get("skills") if isinstance(payload.get("skills"), list) else args.skills

        reg = register_unit_in_roster(
            roster_file,
            ROOT,
            unit_id=uid,
            name=name,
            title=title,
            class_role=role,
            rarity=rarity,
            base_element=element,
            headgear_spec=headgear,
            silhouette=silhouette,
            weapon_spec=weapon,
            skills=[str(s) for s in raw_skills] if raw_skills else None,
        )
        u_entry = reg["unit"]
        print(f"Registered hero `{u_entry['id']}` ({u_entry['name']}) -> {roster_file}")
        print(f"  Raw AI Directory : {u_entry['rawAiDir']}")
        print(f"  Output Directory : {u_entry['outputDir']}")
        print(f"  File Prefix Slug : {reg['fileSlug']}_*.png")
        for p in reg["prompts"]:
            print(f"    - {u_entry['rawAiDir']}/{p['file']} ({p['label']})")
        return 0

    if args.command == "build-unit":
        if not args.unit_id:
            print("ERROR: build-unit requires --unit <unit-id>.", file=sys.stderr)
            return 1
        result = run_single_unit_forge(roster_file, args.unit_id, ROOT)
        u = result["unit"]
        bm = result["batchManifest"]
        status = "PASS" if u["allPassed"] else "FAIL"
        print(
            f"[{status} {u['qualityScore']}/100] Built `{u['id']}` ({u['name']} - {u['rarity'].upper()}) "
            f"| provenance={u['assetProvenance']} | revision={bm['buildRevision']} -> {u['outputDir']}"
        )
        return 0 if u["allPassed"] else 1

    if args.command == "delete-unit":
        if not args.unit_id:
            print("ERROR: delete-unit requires --unit <unit-id>.", file=sys.stderr)
            return 1
        res = unregister_unit_from_roster(roster_file, args.unit_id, ROOT)
        print(f"Removed custom hero `{res['deletedId']}` from {roster_file}")
        return 0
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
        batch_summary = run_batch_forge(
            roster_file,
            ROOT,
            validate_only=(args.command == "batch-validate"),
        )
        print(
            f"Batch Forge complete: {batch_summary['totalUnits']} units built | "
            f"Average Quality Score: {batch_summary['averageScore']}/100 | "
            f"All Passed: {batch_summary['allUnitsPassed']}"
        )
        for u in batch_summary["units"]:
            print(
                f"  [PASS {u['qualityScore']}/100] {u['id']} ({u['name']} - {u['rarity'].upper()}) "
                f"| provenance={u.get('assetProvenance')} | alphaDiff={u.get('alphaDiffFromMaster', 0)}px -> {u['outputDir']}"
            )
        return 0 if batch_summary["allUnitsPassed"] else 1

    if args.command == "validate":
        fast_report = validate_output_directory(FORGE_OUT)
        if fast_report is not None:
            print(
                f"Pixel Forge validation complete -> {FORGE_OUT}\n"
                f"Quality Gate Score: {fast_report['score']}/100 "
                f"({'PASS' if fast_report['allPassed'] else 'FAIL'})"
            )
            for check in fast_report["checks"]:
                status = "PASS" if check["passed"] else "FAIL"
                print(f"  [{status}] {check['label']}: {check['detail']}")
            return 0 if fast_report["allPassed"] else 1

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
        save_png_safe(img, FORGE_OUT / fname)
        layer_files[layer_id] = fname

    mask_files: dict[str, str] = {}
    for mask_id, img in pd_bundle["greyscaleMasks"].items():
        fname = f"mask-{mask_id}.png"
        save_png_safe(img, FORGE_OUT / fname)
        mask_files[mask_id] = fname

    save_png_safe(pd_bundle["baseComposite"], FORGE_OUT / "hero-master-still.png")
    save_png_safe(pd_bundle["damagedComposite"], FORGE_OUT / "hero-master-damaged.png")

    element_files: dict[str, str] = {}
    for el_id, img in pd_bundle["elementComposites"].items():
        fname = f"hero-element-{el_id}.png"
        save_png_safe(img, FORGE_OUT / fname)
        element_files[el_id] = fname

    direction_files: dict[str, str] = {}
    for d_id, img in pd_bundle["directionFrames"].items():
        fname = f"hero-dir-{d_id}.png"
        save_png_safe(img, FORGE_OUT / fname)
        direction_files[d_id] = fname

    loot_files: dict[str, str] = {}
    for loot_id, img in pd_bundle["lootIcons"].items():
        fname = f"{loot_id}.png"
        save_png_safe(img, FORGE_OUT / fname)
        loot_files[loot_id] = fname

    bible_manifest: dict[str, object] = {}
    bible_bundle = pd_bundle.get("characterBible")
    if isinstance(bible_bundle, dict):
        expr_list: list[dict[str, object]] = []
        for eid, ed in bible_bundle.get("expressions", {}).items():
            efname = f"bible-expr-{eid}.png"
            save_png_safe(ed["image"], FORGE_OUT / efname)
            expr_list.append({"id": eid, "label": ed["label"], "file": efname, "size": 48})
        skin_list: list[dict[str, object]] = []
        for sid, sd in bible_bundle.get("skins", {}).items():
            sfname = f"bible-skin-{sid}.png"
            save_png_safe(sd["image"], FORGE_OUT / sfname)
            skin_list.append({"id": sid, "label": sd["label"], "file": sfname, "size": 96})
        chibi_img = bible_bundle.get("chibi")
        chibi_fname = "hero-chibi.png"
        if chibi_img is not None:
            save_png_safe(chibi_img, FORGE_OUT / chibi_fname)
        bible_manifest = {
            "totalPanels": 23,
            "expressions": expr_list,
            "skins": skin_list,
            "chibi": {"file": chibi_fname, "size": 64, "label": "Chibi SD 2-Đầu (64×64)"},
        }

    # 3. Build 5 Animation Clips + Unarmed Variants + Dual-Buffer VFX Sequences
    clips_bundle = build_character_animation_clips(
        spec,
        ai_frames=pd_bundle.get("aiFrames"),
        master_palette=pd_bundle.get("masterPalette"),
    )
    clip_files: dict[str, dict[str, object]] = {}
    for clip_id, c_data in clips_bundle.items():
        strip_name = f"clip-{clip_id}-strip.png"
        save_png_safe(c_data["strip"], FORGE_OUT / strip_name)
        frame_names: list[str] = []
        unarmed_names: list[str] = []
        for idx, f_img in enumerate(c_data["frames"]):
            f_name = f"clip-{clip_id}-f{idx}.png"
            save_png_safe(f_img, FORGE_OUT / f_name)
            frame_names.append(f_name)

            u_img = c_data["unarmedFrames"][idx] if "unarmedFrames" in c_data else f_img
            u_name = f"clip-{clip_id}-f{idx}-unarmed.png"
            save_png_safe(u_img, FORGE_OUT / u_name)
            unarmed_names.append(u_name)

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

    vfx_bundles: list[dict[str, object]] = []
    vfx_files: dict[str, dict[str, object]] = {}
    for vfx_spec in spec.vfx_sequences:
        vb = build_dual_buffer_vfx(vfx_spec, spec.elements[0])
        vfx_bundles.append(vb)
        col_name = f"{vfx_spec.id}-color-strip.png"
        emi_name = f"{vfx_spec.id}-emissive-strip.png"
        comp_name = f"{vfx_spec.id}-composite-strip.png"
        save_png_safe(vb["colorStrip"], FORGE_OUT / col_name)
        save_png_safe(vb["emissiveStrip"], FORGE_OUT / emi_name)
        save_png_safe(vb["compositeStrip"], FORGE_OUT / comp_name)
        f_names: list[str] = []
        for idx, f_img in enumerate(vb["frames"]):
            fn = f"{vfx_spec.id}-f{idx}.png"
            save_png_safe(f_img, FORGE_OUT / fn)
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

    # 4. Build 16-Tile Wang Autotile, Cohesive 3-Layer 256x144 Parallax Stage & 2.5D Maps
    autotile_bundle = build_wang_autotile_16(spec.tileset)
    save_png_safe(autotile_bundle["sheet"], FORGE_OUT / "autotile-16-sheet.png")
    save_png_safe(autotile_bundle["mapPreview"], FORGE_OUT / "autotile-map-preview.png")

    parallax_bundle = build_parallax_battle_plate(
        spec.tileset, ai_arena_img=pd_bundle.get("arenaComposite")
    )
    save_png_safe(parallax_bundle["skyFar"], FORGE_OUT / "parallax-sky-far.png")
    save_png_safe(parallax_bundle["ruinsMid"], FORGE_OUT / "parallax-ruins-mid.png")
    save_png_safe(parallax_bundle["arenaGround"], FORGE_OUT / "parallax-arena-ground.png")
    save_png_safe(parallax_bundle["composite"], FORGE_OUT / "parallax-stage-composite.png")

    hero_lighting = generate_25d_lighting_maps(pd_bundle["baseComposite"])
    save_png_safe(hero_lighting["normal"], FORGE_OUT / "hero-master-normal.png")
    save_png_safe(hero_lighting["specular"], FORGE_OUT / "hero-master-specular.png")
    save_png_safe(hero_lighting["emissive"], FORGE_OUT / "hero-master-emissive.png")

    # 5. Pack Synchronized Multi-Map 512x512 Extruded Texture Atlas & Engine Exports
    atlas_entries: list[dict[str, object]] = []
    for clip_id in ("idle", "walk", "attack", "hurt", "victory"):
        c_data = clips_bundle[clip_id]
        dur_ms = max(40, round(1000 / c_data["spec"].fps))
        for i, img in enumerate(c_data["frames"]):
            atlas_entries.append(
                {
                    "id": f"hero_{clip_id}_{i}",
                    "category": "character",
                    "clipId": clip_id,
                    "durationMs": dur_ms,
                    "image": img,
                    "pivot": {"x": 48, "y": spec.character.foot_baseline_y},
                    "sockets": c_data["socketsPerFrame"][i],
                }
            )
    for d_id, img in pd_bundle["directionFrames"].items():
        atlas_entries.append(
            {
                "id": f"hero_dir_{d_id}",
                "category": "turnaround",
                "durationMs": 125,
                "image": img,
                "pivot": {"x": 48, "y": spec.character.foot_baseline_y},
                "sockets": [],
            }
        )
    atlas_entries.append(
        {
            "id": "hero_damaged",
            "category": "damaged",
            "durationMs": 125,
            "image": pd_bundle["damagedComposite"],
            "pivot": {"x": 48, "y": spec.character.foot_baseline_y},
            "sockets": [],
        }
    )
    for l_id, img in pd_bundle["baseLayers"].items():
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
    for item in spec.loot_items:
        atlas_entries.append(
            {
                "id": item.id,
                "category": "loot",
                "durationMs": 125,
                "image": pd_bundle["lootIcons"][item.id],
                "pivot": {"x": 16, "y": 16},
                "sockets": [],
            }
        )

    atlas_bundle = pack_multi_map_atlas(atlas_entries, atlas_size=(512, 512), extrude_px=2, gutter_px=4)
    save_png_safe(atlas_bundle["diffuseAtlas"], FORGE_OUT / "forge-atlas-diffuse.png")
    save_png_safe(atlas_bundle["normalAtlas"], FORGE_OUT / "forge-atlas-normal.png")
    save_png_safe(atlas_bundle["emissiveAtlas"], FORGE_OUT / "forge-atlas-emissive.png")

    engine_exports = export_engine_manifests(
        spec, atlas_bundle, FORGE_OUT, res_base_path="res://assets/pixel-forge/generated"
    )

    # 6. Evaluate Automated Quality Gates & Render 2x Contact Sheets
    quality_report = evaluate_quality_gates(
        pd_bundle,
        clips_bundle,
        vfx_bundles,
        atlas_bundle,
        emissive_map=hero_lighting["emissive"],
    )
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
        ("Layer 40_hair", pd_bundle["baseLayers"]["40_hair"]),
        ("Layer 50_weapon (96px)", pd_bundle["baseLayers"]["50_weapon"]),
        ("Dir Back N", pd_bundle["directionFrames"]["N"]),
        ("Wang 16-Autotile", autotile_bundle["sheet"]),
    ] + [(f"{item.id} ({item.rarity.upper()})", pd_bundle["lootIcons"][item.id]) for item in spec.loot_items[:2]]

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
        "schemaVersion": 2,
        "buildRevision": int(time.time() * 1000),
        "assetProvenance": "ai-native",
        "rawAiDir": "public/assets/pixel-forge/raw_ai",
        "fileSlug": "knight",
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
            for l in spec.layers
        ],
        "masks": mask_files,
        "rawThumbnails": pd_bundle.get("rawThumbnails", {}),
        "rawFrames": [
            {
                "slot": "01_idle_f0",
                "title": "Frame 01 • Idle Guard (F0)",
                "rawFile": "raw-knight-idle-f0.png",
                "cleanedFile": "clip-idle-f0.png",
                "unarmedFile": "clip-idle-f0-unarmed.png",
                "rawSize": [96, 96],
                "cleanedSize": [96, 96],
                "note": "Tách nền CIELAB #00FF00 + khóa chân Y=88",
            },
            {
                "slot": "02_idle_f1",
                "title": "Frame 02 • Idle Breath (F1)",
                "rawFile": "raw-knight-idle-f1.png",
                "cleanedFile": "clip-idle-f2.png",
                "unarmedFile": "clip-idle-f2-unarmed.png",
                "rawSize": [96, 96],
                "cleanedSize": [96, 96],
                "note": "Region-Masked Breathing (ngực & áo choàng)",
            },
            {
                "slot": "03_walk_f0",
                "title": "Frame 03 • Walk Stride Left (F0)",
                "rawFile": "raw-knight-walk-f0.png",
                "cleanedFile": "clip-walk-f0.png",
                "unarmedFile": "clip-walk-f0-unarmed.png",
                "rawSize": [96, 96],
                "cleanedSize": [96, 96],
                "note": "Sải chân trái + ổn định trọng tâm Alpha",
            },
            {
                "slot": "04_walk_f1",
                "title": "Frame 04 • Walk Stride Right (F1)",
                "rawFile": "raw-knight-walk-f1.png",
                "cleanedFile": "clip-walk-f2.png",
                "unarmedFile": "clip-walk-f2-unarmed.png",
                "rawSize": [96, 96],
                "cleanedSize": [96, 96],
                "note": "Sải chân phải + Temporal Hysteresis",
            },
            {
                "slot": "05_attack_f0",
                "title": "Frame 05 • Attack Windup (F0)",
                "rawFile": "raw-knight-attack-f0.png",
                "cleanedFile": "clip-attack-f1.png",
                "unarmedFile": "clip-attack-f1-unarmed.png",
                "rawSize": [96, 96],
                "cleanedSize": [96, 96],
                "note": "Vung kiếm đỉnh đầu + xóa lưỡi kiếm Unarmed",
            },
            {
                "slot": "06_attack_f1",
                "title": "Frame 06 • Attack Cleave (F1)",
                "rawFile": "raw-knight-attack-f1.png",
                "cleanedFile": "clip-attack-f2.png",
                "unarmedFile": "clip-attack-f2-unarmed.png",
                "rawSize": [96, 96],
                "cleanedSize": [96, 96],
                "note": "Trảm 96×96 không cắt mũi kiếm + Hit-Stop 80ms",
            },
            {
                "slot": "07_victory_f0",
                "title": "Frame 07 • Victory Skyward",
                "rawFile": "raw-knight-victory-f0.png",
                "cleanedFile": "clip-victory-f2.png",
                "unarmedFile": "clip-victory-f2-unarmed.png",
                "rawSize": [96, 96],
                "cleanedSize": [96, 96],
                "note": "Dương kiếm khải hoàn + hào quang thánh tích",
            },
            {
                "slot": "08_paperdoll_kit",
                "title": "Frame 08 • Modular Paper-Doll 2×2 Kit",
                "rawFile": "raw-knight-paperdoll-kit.png",
                "cleanedFile": "layer-10_body.png",
                "rawSize": [96, 96],
                "cleanedSize": [64, 64],
                "note": "Bóc tách 4 góc: Thân 64×64, Mũ, Khiên & Vũ khí",
            },
            {
                "slot": "09_loot_sheet",
                "title": "Frame 09 • 3×2 RPG Loot & Relic Sheet",
                "rawFile": "raw-knight-loot-sheet.png",
                "cleanedFile": "loot-sunblade-ur.png",
                "rawSize": [96, 64],
                "cleanedSize": [32, 32],
                "note": "Cắt 6 ô vật phẩm 32×32 + viền chọn lọc 1px",
            },
            {
                "slot": "10_arena_stage",
                "title": "Frame 10 • HD-2D Cathedral Battle Arena",
                "rawFile": "raw-knight-arena-stage.png",
                "cleanedFile": "parallax-stage-composite.png",
                "rawSize": [128, 72],
                "cleanedSize": [256, 144],
                "note": "Tách 3 lớp Parallax 256×144 cuộn liền mạch",
            },
        ],
        "weaponArsenal": [
            {"id": "greatsword", "name": "Đại Kiếm Thánh Quang", "rarity": "SSR", "layerFile": "layer-50_weapon-greatsword.png"},
            {"id": "sunblade", "name": "Thái Dương Thần Kiếm", "rarity": "UR", "layerFile": "layer-50_weapon-sunblade.png"},
            {"id": "staff", "name": "Quyền Trượng Tinh Hà", "rarity": "SSR", "layerFile": "layer-50_weapon-staff.png"},
            {"id": "crimson-blade", "name": "Huyết Long Đại Kiếm", "rarity": "UR", "layerFile": "layer-50_weapon-crimson-blade.png"},
            {"id": "frost-blade", "name": "Băng Tinh Chiến Kiếm", "rarity": "SSR", "layerFile": "layer-50_weapon-frost-blade.png"},
        ],
        "weaponPoses": pd_bundle.get("weaponPoseFiles", {}),
        "sockets": pd_bundle["sockets"],
        "elements": {el.id: {"label": el.label, "file": element_files[el.id]} for el in spec.elements},
        "directions": direction_files,
        "directionMeta": pd_bundle.get("directionMeta", {}),
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
            for item in spec.loot_items
        ],
        "world": {
            "tilesetId": spec.tileset.id,
            "tilesetName": spec.tileset.name,
            "biomeElement": autotile_bundle.get("biomeElement", "solar"),
            "stageWidth": spec.tileset.stage_width,
            "stageHeight": spec.tileset.stage_height,
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
        "qualityReport": quality_report,
    }
    manifest_path = FORGE_OUT / "forge-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    zip_meta = pack_engine_bundle_zip(FORGE_OUT, spec.character.id)
    manifest["atlas"]["bundleZip"] = zip_meta["file"]
    manifest["atlas"]["bundleZipBytes"] = zip_meta["sizeBytes"]
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
