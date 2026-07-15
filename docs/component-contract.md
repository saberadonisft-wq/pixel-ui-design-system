# Component contract

All React primitives forward native attributes and refs. Visual options are emitted as `data-px-*` attributes so CSS stays composable and framework-independent.

## Shared options

- `theme`: subtree override for one of the supported presets.
- `variant`: `solid`, `outline`, `inset`, or `ghost`.
- `tone`: `neutral`, `accent`, `success`, `warning`, or `danger`.
- `density`: `low`, `medium`, or `high`.
- `size`: `sm`, `md`, or `lg`.
- `selected`: exposes a structural selected marker.
- `loading`: sets `aria-busy`, stabilizes dimensions, and prevents duplicate activation.

## Current primitives

- `PixelFrame`: generic multilayer container.
- `PixelPanel`: semantic section/aside/article composed inside `PixelFrame`.
- `PixelButton`: text action using a native button.
- `PixelIconButton`: square native button requiring `label`.
- `PixelTab`: `role="tab"`, `aria-selected`, controlled panel target, and roving tab index.
- Content: `PixelCard`, `PixelBadge`, `PixelDivider`, `PixelStatus`, `PixelProgress`, `PixelToolbar`, `PixelWindow`, `PixelTable`, and `PixelToast`.
- Fields: `PixelInput`, `PixelTextarea`, `PixelSelect`, `PixelCheckbox`, `PixelRadio`, and `PixelSwitch` with persistent labels, helper/error text, and native semantics.
- Overlays: `PixelTooltip` with keyboard focus support and `PixelModal` built on the native dialog element.

All seven presets (`sci-fi`, `fantasy`, `cyberpunk`, `terminal`, `arcade`, `industrial`, and `minimal`) consume this same contract. A theme swap must not require component-specific CSS.

## Adding a primitive

Start from the skill template, compose existing layers, and add only semantic markup necessary for the new control. Add states to shared CSS when the behavior generalizes. If a style exists only because one demo needs it, keep it in the demo until a second use proves the abstraction.
