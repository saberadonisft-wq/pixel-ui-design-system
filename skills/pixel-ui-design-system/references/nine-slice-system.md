# Formal nine-slice frame system

## Contents

1. Region contract
2. Asset metadata
3. DOM equivalent
4. Scaling rules
5. Theme interchange
6. Responsive behavior
7. Technique checks

## 1. Region contract

Every complex resizable frame has top-left, top, top-right, left, center, right, bottom-left, bottom, and bottom-right regions.

Corners never stretch. Top/bottom edges repeat or stretch only horizontally. Left/right edges repeat or stretch only vertically. The center repeats or scales and never bakes dynamic text. Expose thickness through a grid-derived slice token.

## 2. Asset metadata

For raster assets record source dimensions, corner slice, edge repeat rule, center rule, supported integer scales, light direction, material, and semantic ramp. Use pixelated image rendering.

Never crop a screenshot into slices. Author a frame sheet or nine explicit regions.

## 3. DOM equivalent

A DOM equivalent uses a 3 by 3 grid with fixed slice tracks around a flexible center. Render eight pointer-inert decorative slices and one live semantic center. Bolts and braces overlay the regions and stay out of the accessibility tree.

## 4. Scaling rules

- Derive slices, ornaments, and shadows from 2/4/8px grid tokens.
- Raster corners scale only by integers.
- Never use fractional transforms or interpolation for assets.
- Keep labels, values, focus, and state markers in the DOM.
- Test minimum/maximum sizes and long content.

## 5. Theme interchange

The component owns layout/state. Theme sets provide interchangeable material, edge, corner, bolt, brace, surface, and ramp roles. A frame variant must change a structural feature in addition to color.

## 6. Responsive behavior

Desktop may use a seven-grid slice and full braces. Tablet preserves slice size while wrapping internal layout. Mobile may switch to a five-grid slice and hide secondary bolts; it must not scale the whole frame.

## 7. Technique checks

Use border-image for a compact single-sheet frame, nine positioned images for authored repeat rules, the DOM equivalent for themeable hard bands, and CSS center plus sprite corners when illustrated hardware is the identity.
