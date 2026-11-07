---
name: pixel-asset-batch-forge
description: Mass-produce AI frame-by-frame pixel art characters, 7-layer paperdoll kits, swappable 96x96 weapons, 5 combat animations, 2.5D lighting maps, and multi-map texture atlases across an entire game roster using forge-roster.json and scripts/pixel-forge.py.
---

# Pixel Asset & Sprite Batch Forge Skill

Use this skill whenever the user wants to **mass-produce (tạo hàng loạt)** multiple RPG/Gacha characters, bosses, weapons, equipment sets, animations, or maps using the AI Frame-by-Frame & Modular Paper-Doll Forge pipeline.

## 1. Quick Commands (CLI & NPM Scripts)

| Command | Purpose |
| --- | --- |
| `npm run forge:batch-prompts` | Compile the **10-Frame AI Generation Prompt Matrix** (`batch-prompts.json`) for every unit defined in `forge-roster.json`. |
| `npm run forge:batch` | Run the full mass-production pipeline across all units in `forge-roster.json` (CIELAB chroma-key removal, `96×96` foot-baseline lock `Y=88`, 7-layer Paper-Doll decomposition, 5 swappable weapons, 5 animation clips, 2.5D Normal/Specular/Emissive maps, and `384×384` Multi-Map Atlases). |
| `npm run forge:batch-validate` | Audit every generated unit in the batch against the 6 deterministic Quality Gates (`100/100 PASS`). |
| `npm run forge:build` | Rebuild the canonical master hero (`hero-paladin-knight`) and world stage assets. |

## 2. Adding New Characters or Bosses to the Batch Roster

1. Open [forge-roster.json](file:///d:/pixel-ui-design-system/forge-roster.json) at the workspace root.
2. Add a new entry to the `"units"` array with:
   - `id`: Unique slug (e.g. `"hero-crimson-valkyrie"`).
   - `name` & `title`: Display name and epithet in Vietnamese.
   - `classRole`: Combat role (`"Tank / Vanguard"`, `"Striker / Lancer"`, `"Caster / Control"`, `"Assassin / Burst"`, `"Ranger / Marksman"`).
   - `rarity`: `"common" | "rare" | "epic" | "ssr" | "ur"`.
   - `baseElement`: `"solar" | "fire" | "ice" | "shadow" | "emerald"`.
   - `rawAiDir`: Folder where raw `#00FF00` AI frames for this unit are stored (`public/assets/pixel-forge/batch/<id>/raw_ai`).
   - `outputDir`: Target folder for cleaned & packed engine assets (`public/assets/pixel-forge/batch/<id>/generated`).
   - `silhouette`: Armor, headgear, cape, and off-hand visual description.
   - `weaponSpec`: Oversized right-hand weapon description (`96×96` oversize canvas).

## 3. Generating the 10 Raw AI Frames per Unit (`#00FF00` Chroma-Key)

For each unit in `forge-roster.json`:

1. Run `npm run forge:batch-prompts` to generate `public/assets/pixel-forge/batch-prompts.json` and `<outputDir>/ai-frame-prompts.json`.
2. Feed the 10 standardized prompts to the `image-generator` subagent or external diffusion model to produce:
   - `knight_idle_f0.png` (Frame 1: Idle Guard on `#00FF00`)
   - `knight_idle_f1.png` (Frame 2: Idle Breath on `#00FF00`)
   - `knight_walk_f0.png` (Frame 3: Walk Stride Left on `#00FF00`)
   - `knight_walk_f1.png` (Frame 4: Walk Stride Right on `#00FF00`)
   - `knight_attack_f0.png` (Frame 5: Attack Overhead Windup on `#00FF00`)
   - `knight_attack_f1.png` (Frame 6: Attack Cleave Slash on `#00FF00`)
   - `knight_victory_f0.png` (Frame 7: Victory Skyward Pose on `#00FF00`)
   - `knight_paperdoll_kit.png` (Frame 8: `2×2` Modular Equipment Sheet — Base Body, Headgear, Shield/Offhand, Oversized Weapon on `#00FF00`)
   - `knight_loot_sheet.png` (Frame 9: `3×2` RPG Weapon & Relic Icon Sheet on `#00FF00`)
   - `knight_arena_stage.png` (Frame 10: HD-2D Battle Arena Background)
3. Note: If a unit in `forge-roster.json` does not yet have dedicated raw AI files in its `rawAiDir`, `npm run forge:batch` automatically synthesizes its full asset pack by remapping the master AI frames and `2×2` Paper-Doll layers through its `baseElement` palette LUT so every unit in the roster is immediately playable and testable!

## 4. Non-Negotiable Quality Gates (`100/100`)

Every unit produced by `npm run forge:batch` is automatically verified against 6 rules:
1. **Binary Alpha `{0, 255}`**: Zero semi-transparent pixels and zero `#00FF00` green spill after CIELAB flood-fill + interior pocket removal.
2. **Palette Discipline (`<= 24` colors)**: Shared Median-Cut indexed palette across all frames.
3. **Damaged Variant (`-damaged`) `0px` BBox Drift**: Battle-scarred armor cracks stay strictly inside the opaque silhouette.
4. **Concentric `64×64` Body + `96×96` Weapon Pivot Lock**: Foot baseline locked at `Y = 88`, horizontal centroid at `X = 48`, right-hand weapon socket at `(58, 50)`.
5. **Temporal Hysteresis (`Crawl Killer`)**: Suppresses isolated 1-frame pixel shimmer while preserving full AI keyframe poses.
6. **Synchronized `384×384` Multi-Map Atlases**: Byte-aligned `_diffuse.png`, `_normal.png`, and `_emissive.png` atlases with Godot 4 `.tres`, Unity 6 `.json`, and Aseprite `.json` manifests.
