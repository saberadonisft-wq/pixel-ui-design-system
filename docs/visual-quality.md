# Visual quality protocol

Use the representative-primitive gate before building a screen:

1. Declare one of seven style families, category, 2/4/8px grid, sprite source/scale, ornament hierarchy, density, palette ramps, type strategy, and light direction. Prefer Ornamental when references contain high-detail decorated game modules; never silently default to Tactical.
2. Render a representative frame containing a heading, data row, sprite/marker, and action.
3. Hide content and flatten palette; confirm the silhouette and depth still read as pixel-built.
4. Inspect raster sprites at source and display size; verify integer scale and `image-rendering: pixelated`.
5. Inspect SVG at target size; verify integer coordinates, crisp edges, block forms, and no curves/round caps.
6. Force hover, active, focus-visible, selected, disabled, loading, empty, and error.
7. Confirm active moves one grid and selected/status states are not color-only.
8. Switch family, density, and target theme. In Ornamental verify fixed nine-slice corners, structural frame variation, five-step semantic ramps, calm centers, large coherent icons, and hierarchical ornament density.
9. Inspect at 320, 375, 414, 768, landscape 812×375, and desktop width.
10. Repeat with 125% text, reduced motion, and forced colors.
11. Verify contrast, 44×44 targets, focus, overflow, integer bounding boxes, and readable fallback copy.
12. Review in grayscale and reject any result that becomes an ordinary dashboard without its palette.

Run `npm run validate:pixel` for deterministic source rules and `npm run test:visual` for computed geometry, sprite scale, type alignment, responsive behavior, contrast, focus, and interaction. Complete `skills/pixel-ui-design-system/checklists/visual-review.md` before handoff.
