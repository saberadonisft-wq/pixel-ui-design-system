# Component contract

All React primitives forward native attributes and refs. Visual options are emitted as `data-px-*` attributes so CSS stays composable and framework-independent.

## Shared options

- `theme`: subtree override for one of the supported presets.
- `mode`: one of `ornamental`, `minimal-8bit`, `rpg-16bit`, `cozy`, `tactical-hud`, `cyber`, or `data-dashboard`; controls family geometry without changing semantics.
- `grid`: `2`, `4`, or `8`; controls all decorative geometry.
- `variant`: `solid`, `outline`, `inset`, or `ghost`.
- `tone`: `neutral`, `accent`, `success`, `warning`, or `danger`.
- `density`: `low`, `medium`, or `high`.
- `size`: `sm`, `md`, or `lg`.
- `selected`: exposes a structural selected marker.
- `loading`: sets `aria-busy`, stabilizes dimensions, and prevents duplicate activation.

Active controls move by exactly one grid unit and reduce their bottom/right shadow. Selected, disabled, loading, and error states include shape, pattern, position, icon, or text evidence rather than color alone.

## Current primitives

- `PixelFrame`: generic family-aware container.
- `PixelOrnateFrame`: formal nine-slice DOM frame with fixed corners, live content center, material ornament, detail hierarchy, and semantic ramp.
- `PixelOrnateButton`: native button composed from the same nine-slice system with icon, label, marker, complete interaction states, and non-color selection.
- `PixelPanel`: semantic section/aside/article composed inside `PixelFrame`.
- `PixelButton`: text action using a native button.
- `PixelIconButton`: square native button requiring `label`.
- `PixelTab`: `role="tab"`, `aria-selected`, controlled panel target, and roving tab index.
- Content: `PixelCard`, `PixelBadge`, `PixelDivider`, `PixelStatus`, `PixelProgress`, `PixelToolbar`, `PixelWindow`, `PixelTable`, and `PixelToast`.
- Fields: `PixelInput`, `PixelTextarea`, `PixelSelect`, `PixelCheckbox`, `PixelRadio`, and `PixelSwitch` with persistent labels, helper/error text, and native semantics.
- Overlays: `PixelTooltip` with keyboard focus support and `PixelModal` built on the native dialog element.
- Game primitives: `PixelSprite` with intrinsic source dimensions and integer scale, `PixelSlot`, segmented `PixelMeter`, `PixelCounter`, `PixelCurrency`, and `PixelState` for loading/empty/error.
- Composite keyboard helpers: `PixelTabList` and `PixelToolbar` with roving arrow-key focus.

All eight presets (`ornamental`, `sci-fi`, `fantasy`, `cyberpunk`, `terminal`, `arcade`, `industrial`, and `minimal`) consume this same contract. A theme swap must not require component-specific CSS.

## Adding a primitive

Start from the skill template, compose existing layers, and add only semantic markup necessary for the new control. Add states to shared CSS when the behavior generalizes. If a style exists only because one demo needs it, keep it in the demo until a second use proves the abstraction.
