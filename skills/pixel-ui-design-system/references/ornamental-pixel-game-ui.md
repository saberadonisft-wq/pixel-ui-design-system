# Ornamental Pixel Game UI

## Contents

1. Target identity
2. Four construction layers
3. Accent ramps and lighting
4. Frame variants
5. Frame families
6. Ornament hierarchy
7. Typography and icons
8. Buttons and navigation
9. Account and currency modules
10. Responsive behavior
11. Validation

## 1. Target identity

Treat every prominent component as an individually designed game interface asset inside a modern responsive application. Identity must survive without page texture, without text, in grayscale, and at component scale.

Reject flat CSS rectangles, DOS windows, tiny tactical inventories, generic brown fantasy dashboards, neon glass cards, and modern cards wearing bitmap type.

## 2. Four construction layers

1. Outer silhouette: near-black hard shadow, stepped corners, recognizable outline.
2. Structural frame: material base, top-left highlight, bottom-right shadow, plates, brackets, and bolts.
3. Illuminated accent: highlight, bright, base, shadow, and deep bands from one semantic ramp.
4. Interior surface: near-black calm field with sparse scratches, rivets, or reflections.

Every band must represent silhouette, material, illumination, or content separation.

## 3. Accent ramps and lighting

Define highlight, bright, base, shadow, and deep roles per semantic family, plus a neutral near-black outline. Use hard bands or ordered dither, not blur. Keep one light direction.

- amber/orange: market, commerce, inventory;
- red: research, alert, combat;
- purple: capital, strategy, defense, premium;
- cyan: intelligence, AI, technology, data;
- blue: currency, deposit, primary account action;
- green: production, health, success;
- gold: rewards, equipped, high value.

A component gets one dominant ramp.

## 4. Frame variants

Variants must change silhouette or hardware, not hue alone: mechanical, reinforced industrial, fantasy metal, arcane, cyber intelligence, wood/stone, and premium currency. All share grid, depth, slice thickness, and light direction.

## 5. Frame families

- Account header: wide reinforcement, compact utility sockets, integrated balance compartment.
- Primary action: brighter face, deeper bottom extrusion, stronger pressed-depth change, larger corner blocks.
- Navigation: balanced icon zone, centered one-line label, optional marker, medium ornament density.
- Content panel: calm large surface, strong header rail, more interior space, restrained lower hardware.
- Compact control: reduced slice and ornament density for filters and secondary actions.

Families share the grid and material language but differ in proportion, depth, hardware placement, and internal composition. Do not implement them as one frame with different colors.

## 6. Ornament hierarchy

- Level 1: account/currency hero, primary action, major modal.
- Level 2: navigation modules, major cards, section headers.
- Level 3: secondary buttons, filters, tooltips.
- Level 4: tables, chart interiors, body surfaces.

Reduce detail before reducing legibility.

## 7. Typography and icons

Use large integer display sizes, clear weight, sufficient line height, and readable Vietnamese diacritics. If a bitmap face fails, use Cascadia Mono or Segoe UI and keep pixel identity in geometry. Values use tabular figures.

Primary icons occupy 15–25% of module width. Use integer raster sprites or block SVG, hard outline, two-to-five shades, common light, and common internal pixel unit. Never ship raw line icons, emojis, smooth curves, or mixed icon families.

## 8. Buttons and navigation

Primary buttons use thick silhouette, layered frame, deep face, large icon/label, and visible lower depth.

- Hover: one palette step brighter plus sparse reflection pixels.
- Active: move down one grid unit, reduce lower depth, darken one step.
- Focus-visible: instant contrasting stepped outline.
- Disabled: desaturate while preserving silhouette and readable copy.
- Selected: bracket, plate, notch, or marker in addition to color.

Navigation modules contain left icon, centered label, optional right marker, semantic frame ramp, and reinforcement detail. They are not flat tabs.

## 9. Account and currency modules

Compose identity, utility actions, balance, currency sprite, and primary action inside one unified outer frame. Internal separators belong to the same material grammar. Desktop is horizontal, tablet is two rows, and mobile stacks within the same silhouette.

## 10. Responsive behavior

Desktop preserves complete hardware. Tablet wraps and removes only secondary details. Mobile stacks while keeping corner silhouette, dominant brace, icon, label, ramp, touch target, and press offset. Never transform-scale the desktop component.

## 11. Validation

Fail if a module becomes an ordinary rectangle without color/text, corners stretch, ramps interpolate smoothly, variants differ only by hue, centers are noisy, icon light changes, Vietnamese accents clip, mobile loses identity, or composition resembles tactical debug/SaaS UI.
