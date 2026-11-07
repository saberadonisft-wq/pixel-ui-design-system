# End-to-End Pixel Asset & Sprite Forge Pipeline

## Contents

1. [Pipeline overview](#1-pipeline-overview)
2. [Stage 1: Prompt compilation and Master Still spec](#2-stage-1-prompt-compilation-and-master-still-spec)
3. [Stage 2: CIELAB chroma key, hibit grid lock, and palette discipline](#3-stage-2-cielab-chroma-key-hibit-grid-lock-and-palette-discipline)
4. [Stage 3: Concentric 7-layer paperdoll and weapon sockets](#4-stage-3-concentric-7-layer-paperdoll-and-weapon-sockets)
5. [Stage 4: Motion stabilization, region-masked idle, and dual-buffer VFX](#5-stage-4-motion-stabilization-region-masked-idle-and-dual-buffer-vfx)
6. [Stage 5: 16-tile Wang autotiles, parallax stages, and 2.5D lighting maps](#6-stage-5-16-tile-wang-autotiles-parallax-stages-and-25d-lighting-maps)
7. [Stage 6: Multi-map atlas packing and quality gates](#7-stage-6-multi-map-atlas-packing-and-quality-gates)

## 1. Pipeline overview

When a project requires production-ready character sprites, layered equipment (paperdoll), multi-action animations, combat/summon VFX, terrain autotiles, or 2.5D lighting maps, run the deterministic Pixel Forge pipeline (`scripts/pixel-forge.py`) rather than cropping screenshots or shipping raw AI diffusion outputs.

```bash
npm run forge:build
npm run forge:validate
npm run forge:prompts
```

Every generated asset must satisfy six non-negotiable contracts before entering `@pixel-ui/react`, Godot 4, Unity 6, or Aseprite:

- Binary alpha `{0, 255}` with zero semi-transparent fringe pixels.
- Discrete material shading (`<= 3` shades per material ramp) and `<= 24` total colors per character.
- Concentric pivot registration (`64×64` character body centered inside a `96×96` weapon/FX canvas).
- Damaged and skin variants whose bounding boxes drift by `<= 1px` from the base pose.
- Temporal hysteresis (`Crawl Killer`) and foot baseline lock across all animation frames.
- Synchronized multi-map bounding rectangles across `_diffuse.png`, `_normal.png`, and `_emissive.png`.

## 2. Stage 1: Prompt compilation and Master Still spec

Direct pixel-grid generation in diffusion models often introduces mixels and palette flicker. Instead, `scripts/pixel_forge/prompt_compiler.py` compiles structured specifications for flat cel-shaded master stills (`hibit` mode) and routes requests across configured providers (`gemini`, `openai`, `fal`, `comfyui`, `ollama`) with an always-available offline procedural fallback (`codeart2d`).

Key prompt constraints:

- Render flat, unoutlined cel-shaded regions with at most 3 discrete shades per material.
- Place both feet on the declared horizontal baseline (`Y = 56` on a `64×64` canvas).
- Use a solid high-contrast chroma key background (`#00FF00` or corner-sampled solid matte) that never overlaps character ramps.
- Leave at least 8 pixels of silhouette padding around extremities and never bake dynamic text into raster art.
- For 8-direction turnarounds, generate 5 canonical directions (`S, SW, W, NW, N`) and derive the 3 symmetric directions (`SE, E, NE`) via deterministic horizontal mirror flips, saving 37.5% generation cost.

## 3. Stage 2: CIELAB chroma key, hibit grid lock, and palette discipline

`scripts/pixel_forge/grid_cleaner.py` enforces strict execution order:

1. **Chroma Key BEFORE Quantize (`chroma_key_cielab`)**: Boundary-connected flood-fill runs in perceptual CIELAB space (`Delta-E <= 14.0`) and snaps alpha to `{0, 255}` before any downscaling or color quantization so background hues never bleed into edge pixels.
2. **8×8 Majority-Vote Downscaling (`hibit_majority_downscale`)**: Collapses high-resolution cel regions onto the target pixel grid while preserving 1-pixel specular glints (eyes and blade tips) when luminance contrast exceeds threshold.
3. **Orphan Cleanup & Selective 1px Outline (`remove_orphan_pixels`, `apply_selective_outline`)**: Strips isolated 1-pixel noise islands and applies a quantized 3-ink selective outline (`warm`, `cool`, `neutral dark`) around opaque silhouettes.
4. **Byte-Exact Elemental Recoloring (`recolor_image_by_element`)**: Remaps primary, accent, and glow ramps deterministically to produce elemental variants (`solar`, `fire`, `ice`, `shadow`, `emerald`) without re-running AI inference.

## 4. Stage 3: Concentric 7-layer paperdoll and weapon sockets

`scripts/pixel_forge/paperdoll_builder.py` decomposes characters into 7 standardized RGBA layers sharing a single ground pivot (`(32, 56)` in `64×64` space == `(48, 72)` in `96×96` space):

| Layer ID | Canvas | Role |
| --- | --- | --- |
| `00_shadow` | `64×64` | Ground contact shadow locked to baseline `Y=56` |
| `10_body` | `64×64` | Base anatomy and boots (exports `_greyscale.png` tint mask) |
| `20_iris` | `64×64` | Isolated eye iris layer so eye recoloring never tints sclera or glints |
| `30_outfit` | `64×64` | Armor, tabard, and cape (includes `-damaged` variant with `<=1px` bbox delta) |
| `40_hair` | `64×64` | Hair and crown/headgear |
| `50_weapon` | `96×96` | Oversized broadsword/staff layer that never clips during wide swings |
| `60_fx` | `96×96` | Elemental aura and crescent slash arcs |

Each frame also exports 5 socket coordinates (`hand_r`, `hand_l`, `head`, `back`, `muzzle`) in `forge-manifest.json`.

## 5. Stage 4: Motion stabilization, region-masked idle, and dual-buffer VFX

`scripts/pixel_forge/motion_engine.py` provides three complementary motion systems:

- **Temporal Hysteresis (`temporal_hysteresis_filter` / Crawl Killer)**: Suppresses 1-frame edge shimmer by requiring a new pixel color to persist for `commit_frames = 2` before committing, paired with a starvation escape (`max_hold = 3`) so rapidly moving limbs update cleanly.
- **Foot Contact & Alpha-Weighted Centroid Lock (`lock_foot_contact_and_centroid`)**: Anchors the lowest opaque foot pixel to the ground baseline and stabilizes horizontal center-of-mass across `idle`, `walk`, `attack`, `hurt`, and `victory` clips.
- **Dual-Buffer VFX (`build_dual_buffer_vfx`)**: Separates `_color` and `_emissive` buffers for Gacha summon rituals (`vfx-gacha-summon-ssr`) and combat slashes (`vfx-solar-slash`), enforcing 22 pixel-craft rules (1-frame flash, dark contrast frame, hot core / cold rim, and pixel-cluster dissipation instead of soft alpha fades).

## 6. Stage 5: 16-tile Wang autotiles, parallax stages, and 2.5D lighting maps

`scripts/pixel_forge/world_and_atlas.py` constructs world and lighting assets:

- **16-Tile Wang/Blob Autotile (`build_wang_autotile_16`)**: Generates all 16 4-bit neighbor bitmask tiles (`0000` to `1111`) at `16×16` pixels and assembles a seamless `160×96` sanctuary room preview.
- **3-Layer Parallax Battle Stage (`build_parallax_battle_plate`)**: Produces `parallax-sky-far.png`, `parallax-ruins-mid.png`, and `parallax-arena-ground.png` using a disciplined 14-color palette.
- **2.5D Lighting Maps (`generate_25d_lighting_maps`)**: Computes tangent-space `_normal.png`, metallic `_specular.png`, and `_emissive.png` maps from silhouette bevels and luminance gradients.

## 7. Stage 6: Multi-map atlas packing and quality gates

`pack_multi_map_atlas` packs character clips and loot icons into synchronized `384×384` diffuse, normal, and emissive texture atlases and writes four engine manifests:

- `public/assets/pixel-forge/generated/forge-manifest.json` (`@pixel-ui/react`)
- `public/assets/pixel-forge/generated/forge-atlas.aseprite.json` (Aseprite JSON)
- `public/assets/pixel-forge/generated/forge-sprites.godot.tres` (Godot 4 `SpriteFrames`)
- `public/assets/pixel-forge/generated/forge-atlas.unity.json` (Unity 6 URP 2D Sprite Atlas with pivots and sockets)

Finally, `scripts/pixel_forge/validate_forge.py` computes a deterministic `0–100` Quality Gate score and outputs 2× nearest-neighbor contact sheets (`contact-sheet-forge-dark.png`, `contact-sheet-forge-light.png`).
