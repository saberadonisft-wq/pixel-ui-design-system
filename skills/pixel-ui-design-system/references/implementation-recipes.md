# Implementation recipes

## Chamfered silhouette

Use a shared polygon so cuts remain proportional:

```css
clip-path: polygon(var(--px-corner-cut) 0, calc(100% - var(--px-corner-cut)) 0, 100% var(--px-corner-cut), 100% calc(100% - var(--px-corner-cut)), calc(100% - var(--px-corner-cut)) 100%, var(--px-corner-cut) 100%, 0 calc(100% - var(--px-corner-cut)), 0 var(--px-corner-cut));
```

## Layered frame

Use a wrapper for the outer silhouette and hard shadow, `::before` for the structural frame/highlight, an inner element for the content surface, and `::after` for non-interactive brackets or notches. Avoid deeply nested decorative DOM.

## Hard edges

Use zero-blur `box-shadow` and hard-stop gradients. Align offsets to the grid. Keep highlight on the virtual light-source edges and shadow on the opposite edges across all components.

## Responsive cut

Reduce `--px-corner-cut` and decoration density through tokens at small widths. Never crop the outer frame. Let content reflow and let the frame grow with it.

