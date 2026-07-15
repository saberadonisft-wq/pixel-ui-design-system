---
name: pixel-ui-design-system
description: Design and implement production-quality pixel-art interfaces and reusable frontend systems. Use for sci-fi HUDs, fantasy UI, cyberpunk interfaces, retro terminals, arcade UI, industrial panels, strategy dashboards, minimal pixel web UI, or whenever Codex must plan, build, review, or refactor a web app, dashboard, game HUD, mobile interface, landing page, design system, or reusable component library with authentic pixel geometry.
---

# Pixel UI Design System

Treat pixel UI as a structural design language, not a decoration pack. Create a clear silhouette, grid-built geometry, layered frame, hard highlight and shadow, coherent icon language, explicit hierarchy, interaction states, and reusable decoration grammar.

## 1. Scope

Use this skill for web apps, dashboards, game HUDs, mobile interfaces, landing pages, design systems, and reusable component libraries. Handle both visual design and frontend implementation. Compose large product components from primitives; never create an unrelated visual language per screen.

## 2. Pixel-grid system

Choose a 2px, 4px, or 8px grid. Default to 4px. Make padding, gap, border, icon size, corner cut, notch, shadow offset, and component height multiples of the active grid. Permit a 1px deviation only for documented optical alignment; never let exceptions become a second spacing scale.

```css
:root {
  --px-grid: 4px;
  --px-border-thin: 1px;
  --px-border-medium: 2px;
  --px-border-thick: 4px;
  --px-corner-cut: 8px;
  --px-notch-size: 4px;
  --px-shadow-offset: 4px;
  --px-icon-size: 24px;
}
```

## 3. Density system

| Density | Decoration | Best use |
| --- | --- | --- |
| `low` | One structural frame, few ornaments, generous content room | Mobile and reading-first UI |
| `medium` | Balanced inner frame, corner details, moderate spacing | Dashboards and web apps |
| `high` | Multiple frame layers and systematic mechanical detail | Game HUD and immersive panels |

Reduce decoration before reducing legibility. Density must not change semantic structure or minimum hit areas.

## 4. Theme presets

| Preset | Palette | Geometry and frame | Icons and type | Density and motion |
| --- | --- | --- | --- | --- |
| `sci-fi` | Blue-black surfaces, cyan signal, amber warning | Chamfered frame, brackets, segmented rails | Technical 2px SVG, condensed display + readable sans/mono | Medium–high; scan/state motion only |
| `fantasy` | Charcoal, parchment, bronze, jewel accent | Stepped stone/metal frame, corner caps, engraved inset | Solid relic glyphs, display serif + readable serif/sans | Medium–high; deliberate press/reveal |
| `cyberpunk` | Ink, electric magenta or acid green, dirty neutral | Asymmetric cuts, exposed notches, interrupted borders | Dense angular glyphs, condensed display + mono data | High; sharp flicker only when functional |
| `terminal` | Near-black, phosphor green, dim blue-grey | Square inset frame, command rails, minimal corners | Mono grid icons and monospace type | Low–medium; static except command caret/loading |
| `arcade` | Deep navy, saturated primary, cream highlight | Chunky stepped corners, score plaques, hard shadow | 8-bit solid icons, display pixel + sans body | Medium; fast stepped feedback |
| `industrial` | Graphite, safety amber, steel, danger red | Bolted caps, slotted rails, heavy inset surfaces | Stencil/technical icons, condensed sans + mono values | Medium–high; switch and alarm feedback |
| `minimal` | Tinted paper/ink, one restrained accent | Clean square frame, a single cut or notch, little ornament | Sparse 2px icons, sans body + mono values | Low; near-static |

Use one dominant accent. Keep glow local to a semantic signal, never as the default border treatment.

## 5. Design tokens

Define every component through semantic variables. Include:

- Geometry: `--px-grid`, `--px-border-thin`, `--px-border-medium`, `--px-border-thick`, `--px-corner-cut`, `--px-notch-size`, `--px-shadow-offset`, `--px-icon-size`.
- Spacing: `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-6`, `--space-8`.
- Color: `--surface-dark`, `--surface-mid`, `--surface-light`, `--frame-shadow`, `--frame-base`, `--frame-highlight`, `--accent-dark`, `--accent-main`, `--accent-light`, `--text-primary`, `--text-secondary`, `--state-success`, `--state-warning`, `--state-danger`.
- Motion: `--motion-fast`, `--motion-medium`, `--press-offset`, `--hover-offset`.

Never hard-code a theme color in a primitive. Add a semantic token or component alias instead.

## 6. Component primitives

Provide these primitives with shared `theme`, `variant`, `tone`, `density`, `size`, `disabled`, and `selected` concepts where meaningful:

| Primitive | Responsibility |
| --- | --- |
| `PixelFrame` | Outer silhouette, hard depth, frame layers, content boundary |
| `PixelPanel` | Semantic content region composed inside a frame |
| `PixelButton` | Text action with complete interaction states |
| `PixelIconButton` | Labelled square icon action; require accessible name |
| `PixelTab` | Keyboard-operable selection in a tablist |
| `PixelCard` | Repeated content unit; avoid independent screen styling |
| `PixelBadge` | Compact categorical label, not an action |
| `PixelInput`, `PixelTextarea`, `PixelSelect` | Labelled data entry with helper/error slot |
| `PixelCheckbox`, `PixelRadio`, `PixelSwitch` | Native semantic selection controls with custom skin |
| `PixelTooltip` | Supplemental, dismissible, hoverable help |
| `PixelModal` | Native dialog-based focused task |
| `PixelToast` | Async failure or hidden-effect feedback; avoid success noise |
| `PixelTable` | Tabular data with mobile redesign and tabular numerals |
| `PixelProgress` | Determinate/indeterminate progress with text equivalent |
| `PixelDivider` | Structural segmentation in the active frame language |
| `PixelStatus` | Icon/pattern/text state, never color alone |
| `PixelWindow` | Application content surface, not fake operating-system chrome |
| `PixelToolbar` | Group of related, labelled actions with roving keyboard support |

Build large components by composing these primitives. Read [references/component-api.md](references/component-api.md) before implementing a new primitive.

## 7. Layer model

Build each visual component from the layers it needs: outer silhouette → hard shadow or tightly scoped glow → structural frame → highlight edge → shadow edge → inner frame → content surface → decorative details → content → interaction overlay. A low-density component may omit nonessential layers, but never reduce a pixel component to `background + border + text`.

Make decorative pseudo-elements `pointer-events: none`. Keep interaction overlays from covering labels or hit targets.

## 8. Geometry rules

Prefer square corners, 45-degree cuts, stepped corners, notches, corner brackets, segmented borders, inset frames, mechanical caps, and hard offset shadows. Use `clip-path`, pseudo-elements, masks, hard-stop gradients, and layered shadows consistently.

Restrict large radii, pill buttons, glassmorphism, strong blur, soft gradients, and smooth modern shadows. Never stretch a component to a size that distorts its corner cuts or border rhythm.

## 9. Icon system

Use SVG or CSS. Every SVG must have a `viewBox`, use `currentColor`, retain aspect ratio, and avoid thin strokes. Do not use emoji. Define icon grids at 16, 24, and 32; keep stroke/fill density consistent within one interface. Never stretch an icon.

## 10. Typography

Use a pixel display face only for short headings where appropriate. Use a readable sans or mono for long content. Prefer monospace with tabular numerals for data. Keep text as real DOM text; never bake it into images. Do not stretch text with transforms. Define consistent line-height tokens and keep body text readable at mobile sizes.

## 11. Component states

Implement default, hover, active, focus-visible, selected, disabled, and loading for every interactive component. Add error and success where data entry or async action requires them.

- Hover: increase the hard highlight slightly; do not apply large scale.
- Active: move by `--press-offset`, reduce highlight, deepen inset shadow.
- Focus-visible: draw an immediate high-contrast pixel outline for keyboard users.
- Selected: add shape/icon/text evidence, not color alone.
- Disabled: reduce saturation/contrast, remove hover response, preserve readability.
- Loading: keep component dimensions stable and expose busy state semantically.

## 12. Accessibility

Use semantic HTML: actions are `<button>`, links navigate, every input has a visible label. Support keyboard operation, visible `:focus-visible`, adequate contrast, and clear hit areas. Keep touch targets at least 44×44 CSS px. Mark decorative layers `aria-hidden` where needed and set `pointer-events: none`. Never communicate status through color alone.

## 13. Responsive rules

When space tightens, reduce decoration, gap, padding, icon size, and type size in that order; then change layout. Use horizontal scroll only for content whose meaning requires it. Test at 320, 375, 414, and 768px.

Never stretch components, distort icons, crop frames, overlap controls, or use absolute positioning to patch a broken layout. Never let clickable labels wrap. Prefer mobile-first CSS Grid/Flexbox and content-driven `rem` breakpoints.

## 14. Asset policy

Never crop screenshots, use a reference image as a background, assemble screenshot fragments, bake text into an asset, stretch sprites, or replace the interface with one large image. Use an asset only when it is purpose-built, contains no dynamic content, is reusable, defines dimensions/slices, and does not originate from a screenshot.

## 15. Implementation techniques

Prefer CSS variables, CSS Grid, Flexbox, pseudo-elements, `clip-path`, CSS masks, hard-stop/repeating gradients, layered `box-shadow`, inline SVG, and React composition. Keep CSS cascade intentional. Use data attributes for theme, density, tone, variant, size, and state rather than duplicating selectors per screen.

## 16. Anti-patterns

Reject:

- Pixel font plus colored border presented as finished pixel UI.
- Excess glow, identical frames on every component, inconsistent icons, off-grid spacing.
- Tiny text, weak contrast, hard-coded colors, copied per-button CSS.
- Pseudo-elements covering click regions, negative margins used to assemble UI.
- Absolute positioning used as layout repair.
- Fake browser/phone/IDE chrome, screenshot-backed interface, or emoji icons.

## 17. Required workflow

Follow in order:

1. Identify product type, audience, core task, and viewport constraints.
2. Choose a theme preset, grid, and density.
3. Create or map semantic tokens.
4. Select primitives; read only the relevant reference files.
5. Build one representative component with full layers and states.
6. Render or capture it at target sizes.
7. Review silhouette, depth, contrast, icon language, states, and responsiveness.
8. Fix the representative component.
9. Only then expand the full interface.
10. Run lint, type-check, build, and the visual checklist.

Do not build the full screen while the representative primitive is still visually unresolved.

## 18. Visual review checklist

Before handoff, answer every item in [checklists/visual-review.md](checklists/visual-review.md): silhouette, frame layers, logical highlight/shadow, grid spacing, icon consistency, readable text, restrained glow, no stretching, no screenshot crop, clear hover/active/focus, intact responsive frames, and whether the result is genuinely pixel UI rather than an ordinary dashboard.

## Resource routing

- Read [references/theme-presets.md](references/theme-presets.md) when defining or extending a theme.
- Read [references/component-api.md](references/component-api.md) when adding a primitive or framework adapter.
- Read [references/implementation-recipes.md](references/implementation-recipes.md) when selecting a geometry technique.
- Copy [templates/theme.css](templates/theme.css) when starting a new preset.
- Copy [templates/react-primitive.tsx](templates/react-primitive.tsx) when starting a React primitive.
- Run [checklists/visual-review.md](checklists/visual-review.md) before handoff.

