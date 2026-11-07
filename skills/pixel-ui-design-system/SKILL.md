---
name: pixel-ui-design-system
description: Design and implement production-quality pixel-art interfaces and reusable frontend systems across Ornamental Pixel Game UI, Minimal 8-bit UI, 16-bit RPG UI, Cozy Pixel UI, Tactical Pixel HUD, Cyber Pixel Interface, and Pixel Data Dashboard. Use for responsive game UI, HUDs, terminals, dashboards, sprites, themes, and authentic pixel geometry.
---

# Pixel UI Design System

Pixel art is a rendering and construction contract. A bitmap font, square corner, thick outline, dark palette, or low-resolution screenshot is never sufficient by itself.

## 1. Resolve the style family before designing

Choose exactly one primary family from reference evidence, atmosphere, task, and density. The user's named family wins. Never let a product noun such as dashboard, fantasy, or HUD choose the family alone.

| Family | Primary evidence | Character |
| --- | --- | --- |
| Ornamental Pixel Game UI | Large decorative frames, bright hard-lit edges, mechanical ornaments, strong per-module accents, premium buttons, large pixel type, high-detail silhouettes | Polished game-asset modules inside a responsive app |
| Minimal 8-bit UI | Tiny logical canvas, very few colors, primitive controls, explicit early-console identity | Sparse and intentionally limited |
| 16-bit RPG UI | Inventory, quests, party stats, illustrated materials, medium sprite detail | Rich RPG semantics with moderate frame detail |
| Cozy Pixel UI | Warm world, characters, scenery, gentle spacing, low density | Calm modern composition with authored pixel art |
| Tactical Pixel HUD | Cockpit, combat, monitoring, dense instruments, keyed data | Compact and diagnostic |
| Cyber Pixel Interface | Terminal, network, cyberpunk, old-computer metaphor, command workflow | Electronic and keyboard-led |
| Pixel Data Dashboard | Charts, tables, analytics, modern task flow with quantized visuals | Calm data interiors framed by pixel primitives |

Prefer Ornamental Pixel Game UI when a reference contains four or more of its listed signals. Do not redirect ornamental evidence into Cozy, Tactical, or a modern dashboard with a pixel font.

Read [references/art-direction-modes.md](references/art-direction-modes.md) before choosing a family. For ornamental work also read [references/ornamental-pixel-game-ui.md](references/ornamental-pixel-game-ui.md).

## 2. Classify the rendering contract

Name the category independently of family:

- Retro-inspired UI: nostalgic mood with otherwise modern rendering.
- Pixel-art UI: grid-built silhouette, discrete shading, sprite language, hard states.
- Low-resolution game UI: authored at a declared logical resolution and enlarged by integer scale.
- Responsive pixel web UI: native DOM layout with pixel-built components and integer-aligned assets.
- Game interface asset system: individually designed modules sharing grid, depth, light, ramp, and state contracts.

If authentic pixel art is requested, fail a result whose identity depends on typeface or palette. Read [references/fundamentals.md](references/fundamentals.md).

## 3. Declare the render contract

Record before implementation:

1. style family;
2. category and logical render mode;
3. base grid: 2px, 4px default, or 8px;
4. sprite source sizes and allowed integer scales;
5. ornament/detail hierarchy;
6. density and light direction;
7. semantic palette ramps and maximum shades per material;
8. display font and Vietnamese-safe readable fallback;
9. representative primitive to build and review first.

For a 4px grid use 4/8/12/16/24/32 spacing, 2/4px borders, 4/8px hard shadows, a 4px press offset, and 16/24/32/48/64px sprites. Accessibility may use a documented 44px target. Never use fractional decorative geometry or sprite scale.

Read [references/tokens-and-geometry.md](references/tokens-and-geometry.md). For complex frames also read [references/nine-slice-system.md](references/nine-slice-system.md).

## 4. Construct identity, not decoration

- Build silhouette from stepped, clipped, tiled, or grid-chamfered geometry.
- Use one virtual light direction across frame, icon, and pressed state.
- Use discrete palette bands; blur, bloom, glass, soft shadow, and smooth gradients are off by default.
- Define colors in themes; components consume semantic tokens only.
- Use raster sprites at integer scale or rectilinear SVG with integer coordinates and crispEdges rendering.
- Treat generic icon libraries as placeholders, never final pixel artwork.
- Use texture only where it communicates material; never cover every surface with a global grid/checker.
- Use hard state swaps and steps animation; no springs, scale-on-hover, or continuous glow.
- Keep readable body copy. Pixel display type is for short labels, values, controls, and headings at tested sizes.

Ornamental uses multi-layer designed frames on prominent modules. Minimal removes detail by intent. Cozy gives scenery and characters priority. Tactical/Cyber may increase instrument density. Data Dashboard keeps charts calm.

Read [references/typography-icons-assets.md](references/typography-icons-assets.md).

## 5. Choose implementation technique deliberately

| Technique | Choose when | Avoid when |
| --- | --- | --- |
| Pure CSS | Simple stepped controls, restrained frames, hard bands, states, small motifs | The frame needs illustrated corners or dozens of fragile shadows |
| Pixel sprite asset | Fixed icon, character, emblem, bolt, plate, or material detail | Text/state must be dynamic or the sprite would scale fractionally |
| Nine-slice frame | Complex resizable ornamental panel with invariant corners and scalable edges | The component has a fixed size and no reuse |
| CSS plus sprites | Dynamic content needs CSS layout while authored hardware overlays provide identity | Sprites become screenshot fragments or hide semantic content |
| Canvas | Many animated sprites, maps, charts, or a true low-resolution scene need one render loop | Accessible DOM controls and text are safer |

Never crop a screenshot into assets. Author new reusable slices or an equivalent nine-region DOM system.

For Ornamental, expose distinct frame families in addition to ornament variants: account header, primary action, navigation, content panel, and compact control. Families change proportion, depth, socket layout, edge hardware, and ornament density. Ornament variants change semantic hardware such as mechanical brackets, reinforced pulse rails, arcane shield corners, or circuit edges. Neither axis may be color-only.

## 6. Compose shared primitives

Use frame to surface to product component. Product components own data and copy, not frame CSS. Every interactive primitive defines idle, hover, focus-visible, active, selected, disabled, loading, and error when applicable.

Every component contract covers structure, visual rules, states, keyboard, responsive behavior, accessibility, grid constraints, anti-patterns, and an implementation example.

Read [references/component-catalog.md](references/component-catalog.md) before modifying a component and [references/component-api.md](references/component-api.md) when implementing an adapter or primitive.

## 7. Preserve architecture

Do not change framework or data ownership to obtain a style. Use semantic tokens in packages/core, reusable primitives in packages/react, themes for literal palette values, and demos for composition only. Add no dependency when a local grid-aligned implementation is reasonable.

Read [references/framework-guidance.md](references/framework-guidance.md) and [references/theme-presets.md](references/theme-presets.md) when needed.

## 8. Recompose responsively

Do not proportionally shrink a desktop asset.

- Desktop: preserve complete labels, icons, frame depth, and primary ornaments.
- Tablet: wrap modules, simplify secondary braces, keep corner and edge depth.
- Mobile: stack, lower ornament density, keep silhouette, icon, label, semantic color, and 44px targets.
- Change layout only at declared breakpoints and scale sprites only by integers.
- Test 320, 375, 414, 768, and a representative desktop near 1440 CSS px, plus landscape and 125% text.

Read [references/responsive-accessibility.md](references/responsive-accessibility.md).

## 9. Preserve accessibility

Use native controls and semantic regions. Keep visible labels, instant high-contrast focus-visible, keyboard operation, reduced motion, meaningful sprite alternatives, and non-color state evidence. Do not hide data inside frame imagery. Visually review real Vietnamese diacritics; if a bitmap face fails, use the documented mono/sans fallback.

## 10. Required workflow

1. Inspect architecture, shared primitives, themes, and existing user changes.
2. Resolve style family from brief and references.
3. Classify the rendering contract.
4. Declare grid, scales, density, detail hierarchy, palette, type, and light.
5. Map semantic tokens.
6. Choose CSS, sprite, nine-slice, hybrid, or canvas per component.
7. Build one representative primitive with complete states.
8. Render and visually review it at required widths.
9. Fix silhouette, material depth, typography, and family fit.
10. Compose the full interface from shared primitives.
11. Run validation, type-check, build, responsive tests, and visual review.

Do not expand a full screen while the representative primitive still reads as a flat rectangle, generic modern card, or wrong family.

## 11. Authenticity and family-fit gate

Fail if any answer is no:

- Does silhouette remain recognizably pixel-built without text or color?
- Are decorative positions and dimensions on the declared grid?
- Are depth and lighting made from discrete bands?
- Are icons authored as coherent pixel artwork?
- Do states use non-color evidence?
- Does mobile recompose instead of shrink?
- Does grayscale preserve hierarchy?
- Is this more than a modern dashboard wearing pixel styling?
- Does ornament density match hierarchy?
- Does the selected family still match the evidence?

For Ornamental also fail if major modules are plain colored outlines, every frame is identical except hue, centers are noisy, corners stretch, or the result resembles a tactical debug screen.

Run [checklists/visual-review.md](checklists/visual-review.md). In this repository run npm run validate:pixel, npm run test:visual, npm run type-check, and npm run build.

## Resource routing

- Family selection: [references/art-direction-modes.md](references/art-direction-modes.md)
- Ornamental construction: [references/ornamental-pixel-game-ui.md](references/ornamental-pixel-game-ui.md)
- Classification: [references/fundamentals.md](references/fundamentals.md)
- Tokens/geometry: [references/tokens-and-geometry.md](references/tokens-and-geometry.md)
- Formal nine-slice: [references/nine-slice-system.md](references/nine-slice-system.md)
- Typography/icons: [references/typography-icons-assets.md](references/typography-icons-assets.md)
- Components: [references/component-catalog.md](references/component-catalog.md)
- Primitive API: [references/component-api.md](references/component-api.md)
- Responsive/accessibility: [references/responsive-accessibility.md](references/responsive-accessibility.md)
- Frameworks: [references/framework-guidance.md](references/framework-guidance.md)
- Themes: [references/theme-presets.md](references/theme-presets.md)
- CSS techniques: [references/implementation-recipes.md](references/implementation-recipes.md)
- Sprite, paperdoll, animation, autotile & multi-map atlas forge: [references/asset-forge-pipeline.md](references/asset-forge-pipeline.md)
