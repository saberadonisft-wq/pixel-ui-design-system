# Responsive and accessibility contract

## Contents

1. Responsive modes
2. Layout rules
3. Sprite and type scaling
4. Overflow and data
5. Accessibility
6. Required tests

## 1. Responsive modes

Use discrete composition modes rather than continuous shrinking.

### Mobile: 320–414px

- Use one primary column.
- Stack detail below the actionable list or open it as a dialog/drawer when semantics support that.
- Reduce decorative layers before content padding.
- Keep quick slots in a labelled horizontal scroller when order matters.
- Keep persistent primary action and visible context.
- Use 2px or 4px grid; do not fractionally scale sprites.

### Tablet: around 768px

- Use one or two columns based on content, not device name.
- Restore secondary panels only when they do not compress the main task.
- Permit wider tables or slot grids with controlled overflow.
- Keep the same sprite source and choose the next integer scale only if space permits.

### Desktop

- Allow scenic background and environmental layers to span the full viewport. Cap readable content, not the world.
- Use side detail, status rail, or equipment pane when it shortens task flow.
- Do not fill empty width by stretching panel ornaments or sprites.
- Keep reading measure reasonable for long descriptions.

For Modern Pixel Fantasy, crop or simplify nonessential scenery at narrow widths while preserving the primary character, landmark, and content hierarchy. Never shrink the whole desktop scene into a tiny mobile window.

For Ornamental Pixel Game UI, remove secondary bolts and braces before corner silhouette, dominant accent edge, icon, or label. Recompose a unified account bar from horizontal to two-row to stacked while preserving one outer frame. Keep nine-slice corners fixed and change slice thickness only through declared grid-derived tokens.

## 2. Layout rules

Declare for every screen:

- maximum content width;
- panel stacking order;
- collapse/removal order for decoration;
- fixed or fluid columns;
- sticky regions and their escape behavior;
- horizontal and vertical overflow ownership;
- text wrapping policy;
- density change at each breakpoint.

Use Grid and Flexbox for composition. Do not repair layout with arbitrary absolute offsets or negative margins. Absolute positioning is valid for contained decoration and map markers when the containing coordinate system is explicit.

Do not let clickable labels wrap unless the component is designed as a multiline tile. Do not truncate the only visible label without an accessible full name.

## 3. Sprite and type scaling

- Scale raster sprites by 1×, 2×, 3×, or 4× only.
- Do not use `width: 100%` on a sprite unless the resolved size is constrained to an integer multiple.
- Keep icons at defined 16/24/32px boxes.
- Switch font tokens at breakpoints; do not use viewport-fluid font interpolation.
- Keep pixel display faces out of long copy.
- At text zoom, allow frames to grow vertically instead of clipping.

## 4. Overflow and data

Tables may scroll in a focusable labelled region, convert to keyed rows, or expose a mobile detail view. Preserve header relationships and reading order. Charts need a text summary or data table. Inventory grids may scroll horizontally only when slot order or quick-access grouping matters.

Never hide errors, status, or primary actions solely to prevent overflow. Never crop outer frames. Keep selected items visible after keyboard navigation.

## 5. Accessibility

Require:

- semantic headings and landmarks;
- native `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `<progress>`, `<dialog>`, and table semantics where appropriate;
- visible persistent labels;
- high-contrast `:focus-visible` that is not clipped;
- keyboard operation matching the control pattern;
- touch targets at least 44×44px, or 48×48px on an 8px grid;
- text contrast meeting WCAG AA against the exact local background;
- shape, icon, pattern, position, or text reinforcement for selected/status states;
- reduced-motion support;
- readable fallback for long text and small sizes;
- alt text or adjacent text for meaningful sprites;
- decorative sprites hidden from assistive technology;
- no essential information encoded only in animation or decoration.

Use ARIA only when native semantics do not express the pattern. A tablist requires roving focus and arrow-key navigation. A listbox requires arrow keys, Home/End, selection semantics, and managed focus; do not add `role="listbox"` to a set of buttons without implementing that behavior. A toolbar requires labelled grouping and arrow-key behavior when roving focus is used.

Disabled controls must remain legible. Do not use opacity alone; change pattern or face token and preserve the label. Loading controls expose `aria-busy`, keep a readable action label, and prevent duplicate activation.

## 6. Required tests

Render at:

- 320×900;
- 375×900;
- 414×900;
- 768×900;
- 812×375 landscape;
- 375×900 with 125% root text size.

Also test:

- keyboard-only navigation;
- visible focus on every interactive control;
- 200% browser zoom where practical;
- `prefers-reduced-motion`;
- forced colors;
- disabled, selected, loading, error, and empty states;
- no horizontal document overflow;
- integer sprite bounding boxes and display scale;
- 44/48px hit targets;
- color-independent status;
- dialog focus and Escape behavior.
