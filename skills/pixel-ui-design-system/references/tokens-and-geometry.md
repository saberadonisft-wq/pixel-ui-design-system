# Tokens and pixel geometry

## Contents

1. Canonical token model
2. Grid rules
3. Palette rules
4. Style-family tokens
5. Frame construction
6. Texture and dithering
7. Nine-slice and sprite panels
8. Validation rules

## 1. Canonical token model

Define tokens once and map themes into semantic roles:

```css
:root {
  --px-grid: 4px;
  --px-half-grid: 2px;
  --px-space-1: calc(var(--px-grid) * 1);
  --px-space-2: calc(var(--px-grid) * 2);
  --px-space-3: calc(var(--px-grid) * 3);
  --px-space-4: calc(var(--px-grid) * 4);
  --px-space-6: calc(var(--px-grid) * 6);
  --px-space-8: calc(var(--px-grid) * 8);
  --px-border-thin: var(--px-half-grid);
  --px-border-thick: var(--px-grid);
  --px-shadow-1: var(--px-grid);
  --px-shadow-2: calc(var(--px-grid) * 2);
  --px-press-offset: var(--px-grid);
  --px-sprite-sm: 16px;
  --px-sprite-md: 24px;
  --px-sprite-lg: 32px;
  --px-sprite-hero: 48px;
  --px-sprite-xl: 64px;
  --px-font-xs: 12px;
  --px-font-sm: 14px;
  --px-font-md: 16px;
  --px-font-lg: 20px;
  --px-font-xl: 24px;
  --px-font-display-lg: 32px;
  --px-line-xs: 16px;
  --px-line-sm: 20px;
  --px-line-md: 24px;
  --px-line-lg: 28px;
  --px-control-sm: 44px;
  --px-control-md: 48px;
  --px-control-lg: 56px;
  --px-layer-base: 0;
  --px-layer-overlay: 400;
  --px-layer-tooltip: 600;
  --px-layer-toast: 700;
  --px-motion-instant: 0ms;
  --px-motion-step: 96ms;
  --px-motion-loop: 640ms;
  --px-canvas: #10131a;
  --px-panel-dark: #171c26;
  --px-panel-mid: #202938;
  --px-panel-light: #314056;
  --px-border-dark: #080a0f;
  --px-border-light: #7388a6;
  --px-text-primary: #f1f5f9;
  --px-text-muted: #b4c0cf;
  --px-accent: #45d7e8;
  --px-accent-highlight: #b9f7ff;
  --px-selected: #ffe066;
  --px-disabled: #687080;
  --px-danger: #ff5c66;
  --px-success: #65d47a;
}
```

Component CSS consumes semantic roles only. A theme may assign literal colors; a component may not. Add component aliases such as `--px-button-face` only when they map back to semantic roles.

## 2. Grid rules

- Select 2px for dense high-resolution work, 4px for standard web UI, or 8px for exaggerated retro work.
- Derive padding, gaps, cut sizes, notches, shadows, icon boxes, and translations from the selected grid.
- Use a half-grid only for borders or optical dividers. Do not create a parallel half-grid spacing system.
- Keep left/top positions and widths/heights integer CSS pixels at rendered breakpoints.
- Keep SVG coordinates integer-valued and match their view box to 16, 24, or 32 units.
- Use `steps()` or no transition. Never animate from an integer-aligned position through fractional frames.
- Use percentage coordinates in `clip-path` only for full edges or symmetrical proportions; use grid tokens for corner steps.
- Avoid percentage translation for pixel art. Center with grid/flex where possible; if centering demands `-50%`, verify the resulting bounding box is integer-aligned at every target size.

Accessibility dimensions may override the art grid. A 44px touch target is valid on 2px and 4px grids. On an 8px grid use a 48px minimum.

## 3. Palette rules

Use these minimum semantic roles:

- canvas;
- panel-dark, panel-mid, panel-light;
- border-dark, border-light;
- text-primary, text-muted;
- accent, accent-highlight;
- danger, success;
- selected, disabled.

Use two to four shades per material. Reuse the same ramp across panels, slots, menus, and overlays. Keep selected and focus visually distinct. Test text contrast against the actual pixel band behind it, not an averaged gradient.

Disable gradients by default. If a requested style needs a gradient, translate it into hard bands, an ordered dither tile, a checker tile, or separated tonal regions. Do not use `color-mix()` inside a primitive to invent an intermediate shade; define the shade in the theme.

Modern Pixel Fantasy themes may add semantic scenery roles such as sky, mist, mountain-far, mountain-near, blossom, terracotta, moss, river, wood, paper, and gold. Screen CSS still consumes roles only.

## 4. Style-family tokens

Expose family through `data-px-mode="ornamental"`, `minimal-8bit`, `rpg-16bit`, `cozy`, `tactical-hud`, `cyber`, or `data-dashboard`. The attribute name remains compatible with existing adapters; its values are explicit style families.

Mode tokens should control geometry rather than forcing screen overrides:

```css
:root,
[data-px-mode="cozy"],
[data-px-mode="data-dashboard"] {
  --px-frame-padding: var(--px-border-thin);
  --px-panel-padding: var(--space-6);
  --px-frame-inner-visibility: hidden;
  --px-decoration-visibility: hidden;
}

[data-px-mode="ornamental"] {
  --px-frame-padding: var(--px-border-thick);
  --px-panel-padding: var(--space-6);
  --px-frame-inner-visibility: visible;
  --px-decoration-visibility: visible;
  --px-orn-slice: calc(var(--px-grid) * 5);
}
```

Do not duplicate components per family. Let shared primitives read geometry tokens; let theme files map palette and material roles.

## 5. Frame construction

Construct only the layers the mode and density need:

1. outer hard shadow;
2. dark silhouette;
3. light top/left edge;
4. frame base;
5. dark bottom/right edge;
6. inner border;
7. content surface;
8. sparse decorative blocks;
9. interaction marker.

Modern Pixel Fantasy normally uses layers 2, 4, 7, and one subtle outer shadow; omit the rest unless they communicate state. Dense Retro HUD may use the full stack on a major frame. Keep one virtual light source.

Prefer:

- zero-blur multi-layer `box-shadow`;
- pseudo-elements for corner caps and selected markers;
- grid-token `clip-path` cuts;
- CSS masks only with hard alpha edges;
- `border-image` for reusable repeated frames;
- nine-slice panels for illustrated frames.

Avoid:

- `border-radius` and capsules;
- 1px low-contrast outlines on a 4px grid;
- soft elevation shadows;
- translucent glass layers;
- one maximum-detail frame around every nested region;
- stretched corners or borders.

## 6. Texture and dithering

Use texture as a small repeating tile aligned to the grid. Never use it as the global default for Modern Pixel Fantasy:

```css
.px-checker {
  background-color: var(--px-panel-dark);
  background-image:
    linear-gradient(90deg, var(--px-panel-mid) 50%, transparent 50%),
    linear-gradient(var(--px-panel-mid) 50%, transparent 50%);
  background-position: 0 0, var(--px-grid) var(--px-grid);
  background-size: calc(var(--px-grid) * 2) calc(var(--px-grid) * 2);
  image-rendering: pixelated;
}
```

The hard-stop gradients above create a tile, not a smooth gradient. Asset tiles are preferable for authored stone, wood, paper, or metal. Keep texture contrast below text contrast and avoid placing dense dither immediately behind body copy.

Valid texture families include checkerboard, ordered Bayer dither, sparse noise tile, brick, stone, wooden plank, paper grain, metal plate, CRT scanline, grid, and terrain motif. In Modern Pixel Fantasy keep at least 60% of major surfaces solid and calm. Do not cover every surface or use generic 45-degree stripes as a material shortcut.

## 7. Nine-slice and sprite panels

For raster frames and DOM equivalents:

- record source width, height, corner slice, edge repeat rule, and supported scales;
- use `border-image` or nine positioned slices;
- render with `image-rendering: pixelated`;
- scale corners only by an integer multiple;
- repeat or tile edges rather than stretching ornament;
- keep dynamic text and state outside the raster asset.
- expose slice thickness as a grid-derived token;
- implement all nine regions and never stretch corners;
- allow themes to swap material/corner/edge sets without changing component semantics.

Never crop a screenshot into slices. Author the frame asset explicitly and keep its source file reusable.
Read [nine-slice-system.md](nine-slice-system.md) for the formal region and responsive contract.

## 8. Validation rules

Flag these before handoff:

- decorative pixel literals outside 2/4/8-derived scales;
- fractional `px`, transforms, SVG coordinates, or device scaling;
- `border-radius`, blur, smooth shadows, or backdrop filters;
- unapproved smooth gradients or component `color-mix()`;
- theme colors hard-coded in components;
- sprites missing intrinsic dimensions or `image-rendering: pixelated`;
- controls whose active offset differs from one grid unit;
- inconsistent light direction;
- frames that break at 320, 375, 414, or 768px.
- missing `data-px-mode` family on representative demos;
- Tactical Pixel HUD selected without explicit evidence;
- Ornamental modules using plain outlines, stretched corners, smooth ramps, or identical hardware across variants.
