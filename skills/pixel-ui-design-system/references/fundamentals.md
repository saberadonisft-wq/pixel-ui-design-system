# Pixel UI fundamentals

## Contents

1. Classification test
2. Style-family check
3. Authenticity model
4. Visual grammar
5. Failure patterns
6. Design brief template

## 1. Classification test

Classify the request by its rendering contract, not its story or palette.

### Retro-inspired UI

Retro-inspired UI may use old terminal colors, arcade copy, or nostalgic type while retaining smooth curves, modern cards, vector icons, and fluid animation. It is valid when requested, but do not call it pixel art.

### Pixel-art UI

Pixel-art UI makes the pixel grid visible through silhouette, stepped edges, block shading, sprite language, hard state changes, and limited palette reuse. The CSS pixel can be the logical pixel; the asset does not have to be a screenshot or canvas.

### Low-resolution game UI

Low-resolution game UI begins at a declared logical resolution such as 320×180 or 256×144. Scale the complete scene or isolated sprites by 2×, 3×, or 4×. Keep UI text readable; DOM overlays may remain native-size if the product needs accessibility.

### Fantasy RPG UI

Fantasy RPG describes product semantics: inventory, stats, quests, currency, equipment, and lore. It may be painterly, vector, modern, or pixel-art. To make it pixel art, still apply the full grid and rendering contract.

### Modern Pixel Fantasy UI

Modern Pixel Fantasy is authentic pixel-art UI with a contemporary, spacious composition. It uses authored environmental layers, expressive 32/48/64px sprites, stepped silhouettes, limited ramps, and discrete interaction while keeping most reading surfaces calm. Do not confuse it with a smooth modern website wearing a bitmap font.

### Modern retro-colored web UI

This category uses contemporary dashboard structure—large editorial heading, floating cards, thin separators, generic line icons, generous whitespace, smooth hover—with a nostalgic palette. Treat it as a failure when authentic pixel art was requested.

## 2. Style-family check

Resolve one of seven families from explicit language and reference evidence: Ornamental, Minimal 8-bit, 16-bit RPG, Cozy, Tactical HUD, Cyber Interface, or Pixel Data Dashboard. Prefer Ornamental when references show large decorated frames, hard-lit colored edges, mechanical hardware, premium buttons, large icons/type, and high-detail silhouettes. Never default to Tactical. Atmosphere and references outrank product nouns.

## 3. Authenticity model

Score each axis from 0 to 2. Require at least 10/12 and no zero before calling the result pixel-art UI.

| Axis | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Geometry | Smooth or arbitrary | Some square edges | Grid-built stepped silhouette throughout |
| Depth | Soft shadow/flat card | Hard shadow or band on major panels | Mode-appropriate discrete depth with a consistent light source |
| Icons | Generic smooth set | Angular vector placeholders | Purpose-built raster or block SVG sprites |
| Palette | Unlimited/interpolated | Limited theme colors | Enforced semantic ramps with hard transitions |
| Typography | Generic single face | Retro face only | Intentional display/body pairing with pixel roles clearly assigned |
| Motion | Smooth easing/springs | Mostly static | Discrete steps/frame swaps with reduced motion |

Passing contrast, build, and responsive tests does not increase this score; those are separate quality gates.

Modern Pixel Fantasy can earn a 2 in depth with one border band and one hard shadow. Do not require maximum frame layering in a low-density mode.

## 4. Visual grammar

Choose a small repeatable grammar per interface:

- one outer silhouette family;
- one corner treatment;
- one light direction;
- one mode-appropriate border stack;
- one shadow offset family;
- one icon grid;
- one texture family per material;
- one display type family;
- one selected-state marker;
- one motion cadence.

Repeat the grammar with density variation. Do not give every card a unique decorative frame. Do not give every surface the same maximum decoration. In Modern Pixel Fantasy, reserve the strongest silhouette and decoration for the scenic hero, character, primary panel, and primary action.

### Grayscale test

Temporarily desaturate the interface. Confirm hierarchy survives through value steps, border weight, spacing, silhouette, labels, and patterns. If pixel character disappears with hue, the palette is carrying the design alone.

### Silhouette test

Hide content and flatten colors to three values. Panels and controls should still show intentional stepped edges and discrete depth. If they become ordinary rectangles with a border, the primitive is unresolved.

### Native-size test

Inspect every sprite at its source size and every supported display scale. Reject interpolated or uneven pixels, fractional bounding boxes, and details smaller than one logical pixel.

## 5. Failure patterns

Reject these substitutions:

- dark background as proof of pixel art;
- gold/brown palette as proof of fantasy pixel art;
- a bitmap font on otherwise modern components;
- diagonal stripe backgrounds standing in for material texture;
- oversized serif title standing in for RPG identity;
- square cards with 1px borders standing in for game panels;
- modern charts with retro colors standing in for pixel charts;
- generic smooth SVG line icons standing in for sprites;
- glow around every edge standing in for depth;
- old-game copy and labels standing in for visual construction.
- global grid/checker noise standing in for an authored pixel world;
- a tiny centred emulator window standing in for responsive web composition;
- dense tactical framing applied to a warm or playful fantasy brief;
- modern fantasy surfaces with no authored sprites or environmental pixel structure.

## 6. Design brief template

Record this before coding:

```text
Category: pixel-art UI | low-resolution game UI
Style family: Ornamental | Minimal 8-bit | 16-bit RPG | Cozy | Tactical HUD | Cyber | Data Dashboard
Product/task: inventory management for gamepad, keyboard, and touch
Grid: 4px; half-grid border: 2px
Sprite contract: 16/24/32 source, 1x or 2x only
Density: medium
Calm-surface target: 60% of major surfaces (Modern Pixel Fantasy only)
Light: top-left highlight, bottom-right shadow
Palette: 3 panel values + 3 accent values + state colors
Type: bitmap display for controls; readable mono/sans for descriptions
Mobile change: stack detail below slots; horizontal slot row for quick items
Representative primitive: selected inventory slot with item sprite and count
```
