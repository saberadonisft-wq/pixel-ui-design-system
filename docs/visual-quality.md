# Visual quality protocol

Use the representative-primitive gate before building a complete screen:

1. Render `PixelFrame` containing a heading, data row, and one action.
2. Inspect its silhouette without reading the content.
3. Confirm frame highlight and shadow imply the same light direction.
4. Force hover, active, focus-visible, selected, disabled, and loading.
5. Switch low/medium/high density and each target theme.
6. Inspect at 320, 375, 414, 768, landscape 812×375, and desktop width.
7. Repeat with 125% root text scaling and `prefers-reduced-motion`.
8. Verify primary/secondary text contrast, accent ink contrast, frame boundary contrast, 44×44 touch targets, focus visibility, and horizontal overflow.
9. Only then compose the product view.

Use `skills/pixel-ui-design-system/checklists/visual-review.md` for the final pass.
The automated baseline is `npm run test:visual`; it covers all demos, all required viewport classes, core token contrast, focus, touch targets, theme switching, and modal interaction.
