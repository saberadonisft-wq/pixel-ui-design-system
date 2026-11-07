# Component API contract

Read the matching entry in [component-catalog.md](component-catalog.md) before implementing a primitive.

## Shared props

- `theme`: semantic preset override for a subtree.
- `mode`: `ornamental`, `minimal-8bit`, `rpg-16bit`, `cozy`, `tactical-hud`, `cyber`, or `data-dashboard`; emit as `data-px-mode` for adapter compatibility.
- `grid`: `2`, `4`, or `8`; emit as `data-px-grid`.
- `density`: `low`, `medium`, or `high`; changes decoration, not semantics or hit target.
- `variant`: structural treatment such as `solid`, `outline`, `inset`, or `ghost`.
- `tone`: `neutral`, `accent`, `success`, `warning`, or `danger`.
- `size`: `sm`, `md`, or `lg`; maps to tokenized integer dimensions.
- `selected`: use `aria-selected`, `aria-pressed`, `aria-current`, or native checked state according to the pattern.
- `loading`: set `aria-busy`, retain label and dimensions, and prevent duplicate activation.

Forward native attributes and refs. Keep semantic ownership on the native element. Decorative wrappers and pseudo-elements must use `pointer-events: none` and stay out of the accessibility tree.

Ornamental primitives additionally expose `ornament` (`mechanical`, `reinforced`, `arcane`, `intelligence`, `currency`), `detail` (`hero`, `standard`, `restrained`), and a semantic ramp such as market, research, capital, intelligence, currency, or gold. Ornament changes hardware/silhouette in addition to color. A nine-slice frame renders eight decorative regions and one live semantic center.

Use `family` for structural role: `account`, `primary`, `navigation`, `content`, or `compact`. Family changes proportion, extrusion, socket layout, edge hardware, and interior density; `ornament` changes semantic corner/brace language. Keep these axes independent.

## Sprite props

A shared sprite primitive accepts source, alt text, source width/height, and integer scale. Raster sprites render with intrinsic dimensions and `image-rendering: pixelated`. Decorative sprites use empty alt text. Meaningful sprites need text alternative.

## State contract

Implement idle, hover, focus-visible, active, selected, disabled, loading, and error when applicable. Use hard token swaps. Active controls translate by `--px-press-offset`, exactly one grid unit, and remove/reduce the bottom/right shadow. Selected and error states require non-color evidence.

## Composition

Use frame → panel/window/card → product component. A domain component owns data and copy, not frame CSS. Inventory cards compose slot, sprite, badge, stat, and button primitives. Resource bars share one meter foundation with semantic variants.

Modern Pixel Fantasy screens may compose scenery → calm content surface → product primitives. Do not add a frame around the scenery merely to satisfy the composition chain. Keep panel nesting to one containment layer unless an inner control has real semantics.

## Keyboard contract

Native controls keep native behavior. Tabs, listboxes, menus, toolbars, sliders, dialogs, and grids implement their complete ARIA Authoring Practices keyboard pattern; do not add a composite role without the required keys and focus management.

## Verification

Test pointer, keyboard, touch, forced colors, reduced motion, 125% text, disabled, selected, loading, empty, and error. Verify computed geometry is integer-aligned and every raster sprite uses an integer display scale.
