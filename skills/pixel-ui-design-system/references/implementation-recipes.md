# Implementation recipes

## Stepped silhouette

Use grid tokens for every corner step:

```css
clip-path: polygon(
  var(--px-grid) 0,
  calc(100% - var(--px-grid)) 0,
  calc(100% - var(--px-grid)) var(--px-grid),
  100% var(--px-grid),
  100% calc(100% - var(--px-grid)),
  calc(100% - var(--px-grid)) calc(100% - var(--px-grid)),
  calc(100% - var(--px-grid)) 100%,
  var(--px-grid) 100%,
  var(--px-grid) calc(100% - var(--px-grid)),
  0 calc(100% - var(--px-grid)),
  0 var(--px-grid),
  var(--px-grid) var(--px-grid)
);
```

## Layered hard frame

In Ornamental UI, use four purposeful layers: outer silhouette, structural material, illuminated accent ramp, and calm content surface. Use formal nine-slice when corners and hardware must remain invariant. Cozy and Data Dashboard use fewer layers; Tactical and Cyber may increase functional rails. Keep decoration non-interactive.

## Scenic layer

Use one responsive SVG or a few contained CSS layers for sky, distant terrain, landmark, foliage, and foreground. Keep SVG coordinates integer-valued and use `shape-rendering="crispEdges"`. Important character/item sprites use 32/48/64 source boxes at integer display scales. Scenery may span the viewport; readable content remains in semantic DOM above it.

## Pressed state

```css
.px-control:active {
  transform: translate(var(--px-press-offset), var(--px-press-offset));
  box-shadow: inset var(--px-border-thick) var(--px-border-thick) 0 var(--px-border-dark);
}
```

## Dither tile

Create a hard 2×2 or 4×4 repeating tile with exact stops, or use a purpose-built PNG. Keep it low-contrast behind text. Do not use a single diagonal stripe pattern as generic texture.

## Responsive frame

At a breakpoint, swap corner/decorative tokens and composition. Never animate between grid modes, crop the outer frame, or proportionally stretch a raster border.

## Nine-slice panel

Record source dimensions, slice widths, repeat axes, and integer scale. Use `border-image` or nine explicit regions. Tile edges; never stretch corner art or crop a screenshot.

Choose pure CSS for simple stepped geometry; sprite assets for fixed authored icons/details; nine-slice for complex resizable frames; CSS plus sprites for dynamic content with illustrated corners; canvas only for many moving sprites or a true low-resolution render loop.
