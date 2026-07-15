# Component API contract

## Shared props

- `theme`: preset name; emit as `data-px-theme` only when overriding a subtree.
- `variant`: structural treatment such as `solid`, `outline`, `inset`, or `ghost`.
- `tone`: semantic emphasis such as `neutral`, `accent`, `success`, `warning`, or `danger`.
- `density`: `low`, `medium`, or `high`.
- `size`: `sm`, `md`, or `lg`; preserve minimum hit area.
- `disabled`: native disabled behavior where supported.
- `selected`: use `aria-selected`/`aria-pressed` according to the semantic control.
- `loading`: set `aria-busy`, retain stable dimensions, and keep a readable label.

Forward native element attributes and refs. Keep DOM nesting minimal, but provide one inner content surface when the frame requires it. Do not let visual wrappers change semantic ownership.

## Composition

Use `PixelFrame` as structure, `PixelPanel` for semantic regions, and controls inside the panel. A domain component such as `WalletPanel` owns data/copy only; it must not recreate frame CSS.

## State contract

Test pointer, keyboard, touch, forced colors, reduced motion, disabled, selected, and loading. Tabs use a `tablist`, arrow-key navigation, `aria-controls`, and `aria-selected`. Icon buttons require an accessible name.

