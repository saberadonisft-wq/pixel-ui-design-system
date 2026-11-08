---
name: pixel-forge-ai-gen
description: >-
  Generate #00FF00 chroma-key pixel-art hero sprites, modular 2x2 Paper-Doll kits,
  3x2 RPG loot sheets, and HD-2D battle arenas from a pasted [PIXEL-FORGE-IDE-TASK]
  or /pixel-forge-ai-gen command, save them into the exact raw_ai project directory,
  and run pixel-forge build-unit so the Web Studio UI hot-reloads the new asset bundle.
---

# Pixel Forge IDE AI-Gen Skill (`pixel-forge-ai-gen`)

Activate this skill whenever the user pastes a `[PIXEL-FORGE-IDE-TASK]` prompt block from the Pixel Forge Web Studio UI, invokes `/pixel-forge-ai-gen` or `@pixel-forge-ai-gen`, or asks to generate and wire a new/updated RPG hero sprite bundle into the Studio UI.

## Workflow Overview

The Pixel Forge Studio Web UI (`examples/pixel-asset-demo`) connects via a **Two-Way Vite Dev Bridge** (`scripts/vite-forge-bridge.mjs` broadcasting HMR event `pixel-forge:updated` in `< 90ms`, with automatic 3.5s fallback polling when served statically). Completing the 4 steps below makes the generated hero appear automatically across all 8 tabs of the running Studio UI (1v1 Battle Arena, 7-Layer Paper-Doll, 5-Clip Animator, 23-Panel Character Bible, 2.5D Lighting Shader, `PixelAtlasInspector`, and `forge-engine-bundle.zip`).

---

## Step-by-Step Execution Protocol

### Step 1 — Register or Update the Hero in `forge-roster.json`

If the user's pasted prompt contains a `REGISTER_SPEC_JSON` payload or asks for a new/customized hero, register it first so `forge-roster.json` and the target `raw_ai` + `generated` folders are created cleanly:

```bash
python scripts/pixel-forge.py register-unit --spec-file <temp_or_inline_spec.json>
```

Or pass individual flags:

```bash
python scripts/pixel-forge.py register-unit \
  --id "<unit-id>" \
  --name "<Hero Name>" \
  --title "<Hero Title>" \
  --role "<Class Role>" \
  --rarity "<common|rare|epic|ssr|ur>" \
  --element "<solar|fire|ice|shadow|emerald>" \
  --headgear "<Headgear silhouette>" \
  --silhouette "<Armor & cloak silhouette>" \
  --weapon "<Signature oversized weapon>"
```

Check the CLI output to confirm:
- `Raw AI Directory` (e.g., `public/assets/pixel-forge/batch/hero-<slug>/raw_ai` or `public/assets/pixel-forge/raw_ai` for `hero-paladin-knight`)
- `File Prefix Slug` (e.g., `<slug>_idle_f0.png`)

---

### Step 2 — Generate the `#00FF00` Chroma-Key Source Plates

Generate every slot requested in the pasted task (`Full 10 Plates`, `Fast 4 Core Plates`, or `Single Slot`):

| Slot ID | Target Filename | Required Composition |
| :--- | :--- | :--- |
| `01_idle_f0` | `<slug>_idle_f0.png` | **Required**. Full-body 3/4 front-right combat guard stance, feet planted near bottom baseline, complete weapon tip inside frame, solid flat `#00FF00` background. |
| `02_idle_f1` | `<slug>_idle_f1.png` | Subtle breathing stance, cloak/mantle slightly lifted, glowing runes, solid `#00FF00`. |
| `03_walk_f0` | `<slug>_walk_f0.png` | Forward walking stride (left leg leading), balanced weapon, solid `#00FF00`. |
| `04_walk_f1` | `<slug>_walk_f1.png` | Opposite walking stride (right leg leading), solid `#00FF00`. |
| `05_attack_f0` | `<slug>_attack_f0.png` | Overhead attack windup raising signature weapon, charging elemental energy, solid `#00FF00`. |
| `06_attack_f1` | `<slug>_attack_f1.png` | Explosive forward cleave swing with crescent slash arc, solid `#00FF00`. |
| `07_victory_f0` | `<slug>_victory_f0.png` | Triumphant victory pose raising weapon skyward with aura burst, solid `#00FF00`. |
| `08_paperdoll_kit` | `<slug>_paperdoll_kit.png` | **2×2 Quadrant Sheet** on solid `#00FF00`: Top-Left = unarmed base body in tunic/boots; Top-Right = isolated headgear/hair; Bottom-Left = isolated off-hand shield/tome/cape; Bottom-Right = isolated primary weapon. |
| `09_loot_sheet` | `<slug>_loot_sheet.png` | **3×2 Grid Sheet** (6 distinct RPG items) on solid `#00FF00`: Row 1 = UR Signature Weapon, SSR Staff, Epic Shield/Crest; Row 2 = Rare Elixir, SSR Relic Chest, Class Sigil. |
| `10_arena_stage` | `<slug>_arena_stage.png` | **16:9 Wide HD-2D Battle Arena** (no chroma background needed): upper sky horizon, middle ornate pillars/ruins, flat stone combat floor in lower third. |

#### Image Generation Rules
1. **Use Native IDE Image Tools First**:
   - In **Antigravity**: Invoke the `image-generator` subagent (you may launch slots in parallel to save time), passing the exact slot prompt + negative constraints (`no anti-aliasing blur, no gradients on #00FF00 background, no text/watermarks, no cropped weapon tip`), then copy each returned PNG file directly to `<Raw AI Directory>/<slug>_<slot>.png`.
   - In **Cursor / MCP-enabled IDEs**: Call the active image generation MCP tool and save PNG bytes directly to `<Raw AI Directory>/<slug>_<slot>.png`.
2. **Offline Deterministic Fallback (Only if no image model tool exists in the current IDE)**:
   - Never stop with an error if the IDE lacks an image-generation model; write a crisp 16-bit pixel-art generator script using `PIL.Image` / `ImageDraw` on solid `(0, 255, 0, 255)` matching the hero's silhouette, palette ramp, and weapon, and save the PNGs to `<Raw AI Directory>/<slug>_<slot>.png`.
3. **Fast-Pack Auto-Completion**:
   - When the user selects **Fast 4 Core Plates** (`01_idle_f0`, `05_attack_f0`, `08_paperdoll_kit`, `10_arena_stage`), you only need to generate those 4 files; `pixel-forge.py build-unit` automatically derives the remaining motion frames while keeping `assetProvenance: "ai-native"`.

---

### Step 3 — Compile the 6-Stage Bundle & Push to Web UI

Run the single-unit forge builder for the target `<unit-id>`:

```bash
python scripts/pixel-forge.py build-unit --unit "<unit-id>"
```

If `<unit-id>` is `hero-paladin-knight`, also run `python scripts/pixel-forge.py build` so the root `public/assets/pixel-forge/generated/forge-manifest.json` stays synchronized.

---

### Step 4 — Verify Quality Gate (`100/100 PASS`)

Confirm the command output reports:
- `[PASS 100/100] Built '<unit-id>' ... | provenance=ai-native | revision=<timestamp>`
- Verify `public/assets/pixel-forge/batch-manifest.json` contains `"lastUpdatedUnitId": "<unit-id>"` and a fresh `"buildRevision"`.

Report concisely to the user which PNG files were saved and confirm that the running Web Studio UI will automatically hot-load the hero (or can be refreshed immediately via **"🔄 Quét File Mới Từ IDE"**).
