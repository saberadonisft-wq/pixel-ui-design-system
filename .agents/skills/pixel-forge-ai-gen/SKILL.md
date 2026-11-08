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

## Step-by-Step Execution Protocol

1. **Register or Update the Hero (`forge-roster.json`)**:
   - If the pasted prompt includes a `register-unit` command or `REGISTER_SPEC_JSON`, run `python scripts/pixel-forge.py register-unit ...` first so `forge-roster.json` and `public/assets/pixel-forge/batch/<unit-id>/raw_ai` are created.
2. **Generate `#00FF00` Chroma-Key PNG Plates into `rawAiDir`**:
   - Use Antigravity's `image-generator` subagent (invoking slots in parallel for speed) with the exact prompts in the pasted task block. Enforce solid flat `#00FF00` chroma-key background (except `10_arena_stage` which is a full 16:9 HD-2D battle scene), crisp 16-bit pixel clusters, dark selective outlines, full weapon tip inside canvas, and zero text/watermarks.
   - Copy every generated PNG to its exact target path `<rawAiDir>/<slug>_<slot>.png` (minimum `<slug>_idle_f0.png` for Fast Pack, or all 10 plates for Full Pack).
3. **Compile & Validate All 6 Pipeline Stages**:
   - Run:
     ```bash
     python scripts/pixel-forge.py build-unit --unit "<unit-id>"
     ```
   - If `<unit-id>` is `hero-paladin-knight`, also run `python scripts/pixel-forge.py build`.
4. **Verify Live UI Sync (`100/100 PASS`)**:
   - Confirm CLI output shows `[PASS 100/100]`, `provenance=ai-native`, and a new `revision=<timestamp>` in `public/assets/pixel-forge/batch-manifest.json`. The open Web Studio receives an instant `< 90ms` Vite HMR push (`pixel-forge:updated`, with automatic fallback polling) and hot-loads the newly built hero across the 1v1 Battle Arena, Paper-Doll, Animator, 23-Panel Bible, `PixelAtlasInspector`, and `forge-engine-bundle.zip` tabs.
