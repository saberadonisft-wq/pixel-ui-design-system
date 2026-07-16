# Pixel component catalog

## Contents

1. Shared state contract
2. Actions and selection
3. Surfaces and overlays
4. Game content and resources
5. Navigation and data display
6. Fields and choice controls
7. Spatial and visualization components
8. System states

## 1. Shared state contract

Apply every numbered field in each definition. Use hard token swaps between states. Interactive components support idle, hover, focus-visible, active, selected, disabled, loading, and error when applicable. Active controls move by one grid unit and lose their bottom/right shadow. Loading keeps dimensions stable.

Apply the selected art-direction mode to every visual field. In Modern Pixel Fantasy, use calm fills, one or two border layers, larger spacing, readable type, and stronger sprite emphasis. In Dense Retro HUD, compact rows, deeper major frames, and material tiles are valid. Behavior, semantics, target sizes, and state completeness do not change by mode.

## 2. Actions and selection

### Button

1. **Structure:** Native `<button>` with marker, label, and optional sprite.
2. **Visual:** Rectangular or stepped face. Modern fantasy uses one rim plus a subtle hard shadow; dense HUD may add top/left and bottom/right edge bands.
3. **States:** Use face/edge token swaps; active moves one grid; selected adds a marker; loading retains label.
4. **Keyboard:** Native Enter and Space activation.
5. **Responsive:** Preserve 44px target; allow full-width mobile action without stretching decoration.
6. **Accessibility:** Keep visible text, focus ring, `disabled`, and `aria-busy`.
7. **Grid:** Derive height, padding, cut, icon box, and shadow from grid tokens.
8. **Anti-patterns:** No pill, soft shadow, hover scale, smooth gradient, or label-only spinner.
9. **Example:** `<button class="px-control" data-px-tone="accent"><i aria-hidden="true"></i>Equip</button>`.

### Icon button

1. **Structure:** Square native button containing one raster or block-SVG sprite.
2. **Visual:** Use the same control depth with a centered 16/24/32px icon box.
3. **States:** Mirror button states; selected adds a corner block independent of color.
4. **Keyboard:** Native Enter and Space activation.
5. **Responsive:** Never shrink below target; move secondary actions into a labelled menu.
6. **Accessibility:** Require `aria-label`; tooltip is supplemental, not the name.
7. **Grid:** Keep square dimensions and integer icon scale.
8. **Anti-patterns:** No emoji, round icon tile, generic smooth line icon, or stretched SVG.
9. **Example:** `<button class="px-icon-control" aria-label="Mark favorite"><svg viewBox="0 0 16 16" shape-rendering="crispEdges">…</svg></button>`.

### Tabs

1. **Structure:** `tablist`, tab buttons, and labelled tabpanels with managed selection.
2. **Visual:** Joined stepped plates or a rail; selected tab joins the panel and gains a shape marker.
3. **States:** Provide idle, hover, focus, active, selected, disabled, and loading content state.
4. **Keyboard:** Arrow keys move focus; Home/End jump; selected tab has `tabIndex=0`.
5. **Responsive:** Use horizontal scrolling or a dropdown only when labels no longer fit.
6. **Accessibility:** Apply `role=tab`, `aria-selected`, `aria-controls`, and matching panel IDs.
7. **Grid:** Align tab seams, rail, padding, and marker to the grid.
8. **Anti-patterns:** No color-only underline, wrapped labels, or unimplemented tab roles.
9. **Example:** `<button role="tab" aria-selected="true" aria-controls="items">Items</button>`.

### Segmented control

1. **Structure:** Labelled group of native radio inputs or pressed buttons.
2. **Visual:** Share one outer frame; use hard separators and a filled selected segment.
3. **States:** Each segment supports focus, hover, active, selected, and disabled.
4. **Keyboard:** Radio version uses arrow keys natively; button version manages roving focus.
5. **Responsive:** Stack or scroll; do not continuously compress labels.
6. **Accessibility:** Provide group label and checked/pressed semantics.
7. **Grid:** Use equal grid-derived heights and integer separator widths.
8. **Anti-patterns:** No pill group, sliding smooth thumb, or color-only selection.
9. **Example:** `<fieldset class="px-segments"><legend>View</legend><label><input type="radio" name="view" checked>Grid</label>…</fieldset>`.

## 3. Surfaces and overlays

### Card

1. **Structure:** Semantic article composed inside a shared frame primitive.
2. **Visual:** Lower density than a panel; one edge and optional state marker. In modern fantasy, prefer an open content group over a card when containment is unnecessary.
3. **States:** Noninteractive cards have no hover; selectable cards use button/link semantics.
4. **Keyboard:** Only interactive descendants or an explicit card action receive focus.
5. **Responsive:** Reflow content; do not shrink sprites fractionally.
6. **Accessibility:** Preserve heading order and avoid nested interactive controls in a clickable card.
7. **Grid:** Derive padding, gaps, and frame depth from tokens.
8. **Anti-patterns:** No floating SaaS card, gratuitous hover lift, unique frame per card, or dense frame used only to fill whitespace.
9. **Example:** `<article class="px-card"><h3>Iron key</h3><p>Opens gate 03.</p></article>`.

### Panel

1. **Structure:** Section/aside/article with outer frame, header rail, and content surface.
2. **Visual:** Establishes a major region through a repeatable corner grammar and mode-appropriate hard depth; modern fantasy uses 1–2 border layers and generous padding.
3. **States:** Static by default; selected/loading/error apply only when the region owns that state.
4. **Keyboard:** The panel is not focusable unless it owns scroll or interaction.
5. **Responsive:** Stack, collapse secondary content, or reduce decoration before padding.
6. **Accessibility:** Use a labelled region when helpful and semantic heading order.
7. **Grid:** All frame layers, header height, padding, cuts, and shadow follow tokens.
8. **Anti-patterns:** No glass, cropped frame, nested maximum-density frames, or repeated ornament on every panel. A calm background plus one authored border is valid in modern fantasy.
9. **Example:** `<section class="px-panel" aria-labelledby="stats-title"><h2 id="stats-title">Stats</h2>…</section>`.

### Dialog

1. **Structure:** Native `<dialog>` with labelled header, content, actions, and close control.
2. **Visual:** High-priority framed surface over a hard dim/checker backdrop.
3. **States:** Opening is immediate or stepped; destructive/error state changes frame marker and copy.
4. **Keyboard:** Trap focus natively, support Escape, restore trigger focus, and order actions predictably.
5. **Responsive:** Fit within viewport, scroll content internally, and stack actions on narrow screens.
6. **Accessibility:** Use `aria-labelledby` when title association is not implicit; never hide the close path.
7. **Grid:** Width, padding, edge cuts, shadow, and action gaps align to tokens.
8. **Anti-patterns:** No blurred backdrop, smooth zoom, tiny close icon, or dialog built from a generic div.
9. **Example:** `<dialog aria-labelledby="confirm-title"><h2 id="confirm-title">Discard?</h2><button>Cancel</button></dialog>`.

### Tooltip

1. **Structure:** Trigger with `aria-describedby` and a separate tooltip bubble.
2. **Visual:** Compact high-contrast square/stepped box with one hard shadow.
3. **States:** Appears after hover delay and immediately on focus; disappearance is hard or stepped.
4. **Keyboard:** Focused trigger exposes it; Escape may dismiss persistent variants.
5. **Responsive:** Reposition to stay in viewport; use a popover/dialog for touch-critical help.
6. **Accessibility:** Supplemental text only; never place essential actions inside.
7. **Grid:** Padding, offset, pointer/notch, and shadow align to the grid.
8. **Anti-patterns:** No smooth fade/float, low contrast, hover-only meaning, or tooltip as accessible name.
9. **Example:** `<button aria-describedby="tip-save">Save</button><span role="tooltip" id="tip-save">Write slot</span>`.

### Dropdown

1. **Structure:** Use native select for value selection or button plus menu/listbox for custom behavior.
2. **Visual:** Inset control and separate framed option surface with a block caret.
3. **States:** Trigger and options expose hover, focus, active, selected, disabled, loading, and error.
4. **Keyboard:** Follow native select, menu, or listbox keys exactly; include Escape and Home/End where required.
5. **Responsive:** Keep option surface within viewport; switch complex content to dialog on mobile.
6. **Accessibility:** Label trigger/value and expose expanded, controls, and active descendant semantics as needed.
7. **Grid:** Control height, option rows, caret, shadow, and popup offset use tokens.
8. **Anti-patterns:** No custom ARIA without full behavior, rounded floating menu, or color-only selection.
9. **Example:** `<label>Sort<select class="px-select"><option>Power</option></select></label>`.

## 4. Game content and resources

### Inventory slot

1. **Structure:** Button/option containing sprite box, quantity, rarity/status marker, and accessible item name.
2. **Visual:** Square inset well with discrete rim and selected corner brackets. Checker floor is optional and should be absent from modern fantasy unless the material requires it.
3. **States:** Empty, idle, hover, focus, active, selected, disabled/locked, loading, and invalid drop.
4. **Keyboard:** Arrow navigation within grid, Home/End by row or collection, Enter/Space selects.
5. **Responsive:** Preserve square slots; scroll rows or reduce column count without fractional sprites. Modern fantasy may replace a dense inventory grid with a short row of larger favorite items.
6. **Accessibility:** Expose item name, quantity, equipped/locked state, and grid position in text.
7. **Grid:** Slot side, rim, sprite source/display scale, count offset, and brackets are integer-derived.
8. **Anti-patterns:** No line-icon item, stretched or under-scaled sprite, tiny count, color-only rarity, decorative checker on every slot, or div listbox without keys.
9. **Example:** `<button class="px-slot" aria-label="Potion, quantity 4"><img width="16" height="16" alt="" src="potion.png"><b>4</b></button>`.

### Item card

1. **Structure:** Item sprite, type label, name, key stats, and explicit action/selection control.
2. **Visual:** Compose a slot and compact info rail; keep art and data in separate grid regions.
3. **States:** Idle, hover/focus, active, selected/equipped, disabled/locked, loading, and error/invalid.
4. **Keyboard:** Use a button for selection or keep actions separately focusable; avoid nested buttons.
5. **Responsive:** Collapse secondary stats or switch to slot plus detail panel.
6. **Accessibility:** Provide full item name, state text, and sprite alternative only when art adds meaning.
7. **Grid:** Sprite scale, row height, padding, stat separators, and selected marker follow tokens.
8. **Anti-patterns:** No modern product card, editorial title, generic SVG weapon, or selected state by gold border alone.
9. **Example:** `<button class="px-item-card"><span class="px-slot">…</span><span><b>Sun blade</b><small>ATK 42</small></span></button>`.

### Stat block

1. **Structure:** Label/value pairs in `<dl>` with optional sprite and comparison delta.
2. **Visual:** Use block separators, tabular numerals, and aligned value cells.
3. **States:** Highlight changed values with symbol and pattern; support loading and unavailable states.
4. **Keyboard:** Static by default; interactive drill-down uses real links/buttons.
5. **Responsive:** Wrap into fewer columns or keyed rows; keep label-value association.
6. **Accessibility:** Use `<dt>/<dd>` and text signs for positive/negative changes.
7. **Grid:** Row height, cell padding, dividers, and icon boxes align to grid.
8. **Anti-patterns:** No color-only deltas, misaligned proportional numerals, or decorative chart replacing values.
9. **Example:** `<dl class="px-stats"><div><dt>Power</dt><dd>42 ▲</dd></div></dl>`.

### Health bar

1. **Structure:** Label, numeric text, native progress/meter, and segmented visual overlay.
2. **Visual:** Use health semantic colors plus border/pattern; quantize into visible cells.
3. **States:** Normal, low, critical, damaged flash, empty, loading/unknown, and disabled.
4. **Keyboard:** Static unless value is editable; editable version becomes a labelled slider.
5. **Responsive:** Keep numeric text; reduce segment count, not bar height below legibility.
6. **Accessibility:** Expose current/max and critical text; do not rely on red alone.
7. **Grid:** Bar height, cells, border, and gaps are grid-derived.
8. **Anti-patterns:** No smooth glossy gradient, unlabelled red line, or endlessly tweened value.
9. **Example:** `<label>HP <progress class="px-meter px-meter--health" value="72" max="100">72/100</progress></label>`.

### Mana bar

1. **Structure:** Same resource meter contract with mana label, value/max, and segments.
2. **Visual:** Use mana tokens and a distinct rune/checker pattern, not hue alone.
3. **States:** Full, normal, low, empty, regenerating, unavailable, and loading.
4. **Keyboard:** Static unless editable; editable form uses slider semantics.
5. **Responsive:** Preserve label and number; shorten cell count discretely.
6. **Accessibility:** Announce value changes only when operationally important.
7. **Grid:** Segment width, height, border, and regen marker align to grid.
8. **Anti-patterns:** No neon bloom, smooth liquid fill, or blue-only identification.
9. **Example:** `<label>MP <progress class="px-meter px-meter--mana" value="31" max="60">31/60</progress></label>`.

### Stamina bar

1. **Structure:** Label, current/max text, segmented meter, and recovery/locked marker.
2. **Visual:** Use stamina tokens plus diagonal stair-step or alternating blocks sparingly.
3. **States:** Full, draining, depleted, recovering, locked, loading, and error.
4. **Keyboard:** Static unless player-adjustable.
5. **Responsive:** Keep depletion state visible; reduce segments at breakpoints.
6. **Accessibility:** Provide text for depleted/recovering/locked states.
7. **Grid:** Use integer segment counts and grid-derived cells.
8. **Anti-patterns:** No continuous CSS interpolation or color-only distinction from health/mana.
9. **Example:** `<label>STA <progress class="px-meter px-meter--stamina" value="8" max="12">8/12</progress></label>`.

### Progress bar

1. **Structure:** Visible label/value plus native `<progress>` and optional segmented overlay.
2. **Visual:** Neutral/accent cells inside an inset track; indeterminate uses finite stepped frames.
3. **States:** Determinate, indeterminate, complete, paused, error, and disabled.
4. **Keyboard:** Static; cancellation is a separate labelled button.
5. **Responsive:** Keep label and status; reduce decoration before track height.
6. **Accessibility:** Use native progress semantics and `aria-busy` on the owning region.
7. **Grid:** Track, border, cells, and animation positions align to grid.
8. **Anti-patterns:** No smooth stripe animation, hidden value, or spinner replacing task context.
9. **Example:** `<div aria-busy="true"><label>Loading map <progress value="48" max="100">48%</progress></label></div>`.

### Badge

1. **Structure:** Inline text with optional small state block; never an action.
2. **Visual:** Compact square/stepped label using one border and hard fill.
3. **States:** Neutral, selected, success, warning, danger, and disabled categories.
4. **Keyboard:** Not focusable unless semantics change to a button/link.
5. **Responsive:** Keep text readable; replace verbose copy with an approved short label.
6. **Accessibility:** Include text or accessible name beyond color/pattern.
7. **Grid:** Height, padding, marker, and cut use small grid tokens.
8. **Anti-patterns:** No pill, tiny unreadable pixel font, clickable span, or color-only dot.
9. **Example:** `<span class="px-badge" data-px-tone="warning"><i aria-hidden="true"></i>Low</span>`.

### Counter

1. **Structure:** Visible label or accessible name plus tabular numeric value.
2. **Visual:** Fixed-cell digits or compact inset plaque.
3. **States:** Normal, increment/decrement flash, max, zero, disabled, and loading.
4. **Keyboard:** Static unless paired with separate increment/decrement buttons.
5. **Responsive:** Preserve digits; abbreviate only with explicit readable full value.
6. **Accessibility:** Announce changes selectively and provide full number text.
7. **Grid:** Digit cells, gaps, and plaque padding align to grid.
8. **Anti-patterns:** No rolling smooth odometer, proportional digits, or unlabeled number.
9. **Example:** `<output class="px-counter" aria-label="Keys: 3">003</output>`.

### Currency display

1. **Structure:** Currency sprite/glyph, tabular amount, and currency label.
2. **Visual:** Compact plaque; authored coin sprite at integer scale.
3. **States:** Normal, gain, spend, insufficient, capped, loading, and error.
4. **Keyboard:** Static; purchase action remains a separate control.
5. **Responsive:** Keep amount and symbol; shorten label only with accessible full name.
6. **Accessibility:** Expose currency name and full amount, not sprite alone.
7. **Grid:** Sprite, digit cells, padding, and gain/loss marker align to grid.
8. **Anti-patterns:** No emoji coin, smooth count animation, color-only insufficient state, or baked amount image.
9. **Example:** `<output class="px-currency" aria-label="Gold: 2480"><img src="coin.png" width="8" height="8" alt="">2,480</output>`.

## 5. Navigation and data display

### Navigation menu

1. **Structure:** Semantic `<nav>` with list of links/buttons and current-page marker.
2. **Visual:** Rail, stepped plates, or slot-like entries with a consistent selected marker.
3. **States:** Idle, hover, focus, active, current/selected, disabled, loading, and error badge.
4. **Keyboard:** Native link order; composite game menus may use roving arrows plus Enter/Escape.
5. **Responsive:** Collapse to a labelled menu or bottom rail; retain the current location.
6. **Accessibility:** Label navigation and use `aria-current` for the current page.
7. **Grid:** Entry height, marker, rail, icon box, and separators align to grid.
8. **Anti-patterns:** No icon-only mystery nav, smooth sliding indicator, or fake links.
9. **Example:** `<nav aria-label="Inventory"><a aria-current="page" href="/items">Items</a></nav>`.

### Sidebar

1. **Structure:** Complementary or navigation region composed from panel/menu primitives.
2. **Visual:** Lower contrast than main task; shared frame edge rather than floating card stack.
3. **States:** Expanded, collapsed, selected section, loading, and error where content is remote.
4. **Keyboard:** Preserve logical focus order; collapse trigger is a labelled button.
5. **Responsive:** Stack after main content, convert to dialog/drawer, or expose a compact rail.
6. **Accessibility:** Use `<aside>` only for complementary content; announce expanded state on trigger.
7. **Grid:** Width changes in grid steps; icons and separators remain integer-aligned.
8. **Anti-patterns:** No off-canvas focus trap bug, fractional width animation, or independent SaaS cards.
9. **Example:** `<aside aria-label="Equipment"><nav>…</nav></aside>`.

### Status panel

1. **Structure:** Labelled region with status rows, symbols/patterns, values, and optional actions.
2. **Visual:** Dense keyed rows in Dense Retro HUD; in Modern Pixel Fantasy use a short status summary with larger labels, breathing room, and one shared calm surface.
3. **States:** Nominal, warning, danger, unknown, offline, loading, and stale.
4. **Keyboard:** Static rows are not focusable; actions use native controls.
5. **Responsive:** Stack label/value, hide nonessential metadata, preserve severity text.
6. **Accessibility:** Use text labels and polite/assertive live regions only for meaningful changes.
7. **Grid:** Row height, status sprite, separators, and value columns align to grid.
8. **Anti-patterns:** No colored-dot-only status, animated glow, or table semantics on generic divs when table fits.
9. **Example:** `<section aria-labelledby="sys"><h2 id="sys">Systems</h2><p><span>Thermal</span><strong>Warning</strong></p></section>`.

### Data table

1. **Structure:** Native table with caption, scoped headers, body, and optional actions.
2. **Visual:** Hard row/column separators, tabular numerals, compact header band.
3. **States:** Row hover/focus when actionable, selected, loading, empty, error, and sorted column.
4. **Keyboard:** Native reading; interactive grid behavior only when full grid keyboard model is implemented.
5. **Responsive:** Scroll in labelled focusable region or convert to keyed mobile rows.
6. **Accessibility:** Preserve header associations, caption, sort state, and full cell content.
7. **Grid:** Row height, padding, divider, sort sprite, and numeric columns align to grid.
8. **Anti-patterns:** No tiny dense table, hidden columns without alternate access, or div imitation.
9. **Example:** `<table><caption>Party stats</caption><thead><tr><th scope="col">Hero</th>…`.

### Notification

1. **Structure:** Status/alert region with message, optional action, and dismiss button.
2. **Visual:** Compact high-priority frame with semantic marker and hard shadow.
3. **States:** Info, success, warning, danger, loading/update, dismissed, and action error.
4. **Keyboard:** Dismiss/action controls are reachable; focus does not jump for routine notices.
5. **Responsive:** Fit viewport width and stack action below copy when necessary.
6. **Accessibility:** Use polite `status` or assertive `alert` appropriately; avoid success noise.
7. **Grid:** Padding, marker, icon, shadow, and action gap align to grid.
8. **Anti-patterns:** No auto-dismiss of critical text, smooth floating toast, or color-only severity.
9. **Example:** `<aside role="alert" class="px-toast"><strong>Error</strong><span>Save failed.</span><button>Retry</button></aside>`.

## 6. Fields and choice controls

### Input field

1. **Structure:** Visible label, native input/textarea/select, helper/error slot, and state marker.
2. **Visual:** Inset rectangular well with hard focus frame and block status icon.
3. **States:** Idle, hover, focus, filled, disabled, readonly, loading, success, and error.
4. **Keyboard:** Preserve native editing, selection, autocomplete, and form submission.
5. **Responsive:** Grow vertically for textarea; keep label and message visible; avoid clipped values.
6. **Accessibility:** Associate label and description; use `aria-invalid` and persistent error text.
7. **Grid:** Height, padding, border, caret/icon box, and message gap align to tokens.
8. **Anti-patterns:** No floating label, rounded field, placeholder-only label, or glow focus.
9. **Example:** `<label for="name">Name</label><input id="name" class="px-field__control" aria-describedby="name-help">`.

### Checkbox

1. **Structure:** Native checkbox inside a full clickable label with block mark.
2. **Visual:** Square inset box; checked state draws a filled stepped glyph.
3. **States:** Unchecked, hover, focus, active, checked, indeterminate, disabled, and error.
4. **Keyboard:** Native Space toggling.
5. **Responsive:** Keep full label target at least 44px high.
6. **Accessibility:** Retain native input and visible label; expose indeterminate programmatically.
7. **Grid:** Box, border, glyph pixels, gap, and focus offset align to grid.
8. **Anti-patterns:** No CSS-only div checkbox, tiny box, smooth check stroke, or color-only checked state.
9. **Example:** `<label class="px-choice"><input type="checkbox"><span aria-hidden="true"></span>Pin map</label>`.

### Radio control

1. **Structure:** Native radios in a labelled fieldset/legend group.
2. **Visual:** Stepped octagonal or square mark with solid inner selected block.
3. **States:** Unchecked, hover, focus, active, checked, disabled, and error.
4. **Keyboard:** Native arrow movement and Space selection within named group.
5. **Responsive:** Stack labels when the group no longer fits.
6. **Accessibility:** Use fieldset/legend and consistent `name`.
7. **Grid:** Outer mark, inner block, gap, and focus ring align to grid.
8. **Anti-patterns:** No smooth circle, independent buttons without group semantics, or color-only state.
9. **Example:** `<fieldset><legend>Channel</legend><label><input type="radio" name="ch">Alpha</label></fieldset>`.

### Switch

1. **Structure:** Native checkbox with `role=switch`, track, block thumb, and visible label.
2. **Visual:** Rectangular inset track; thumb jumps between integer positions.
3. **States:** Off, hover, focus, active, on, disabled, loading, and error.
4. **Keyboard:** Native Space toggling.
5. **Responsive:** Keep label visible and target at least 44px.
6. **Accessibility:** Expose checked state and visible label; use only for immediate settings.
7. **Grid:** Track, thumb, border, and both thumb positions align to grid.
8. **Anti-patterns:** No pill, circular thumb, smooth slide, or switch for form submission choices.
9. **Example:** `<label><input type="checkbox" role="switch"><span class="px-switch__track"></span>Sound</label>`.

### Slider

1. **Structure:** Visible label/value, native range input, segmented track, and block thumb.
2. **Visual:** Inset rail with quantized tick marks and rectangular handle.
3. **States:** Idle, hover, focus, active, disabled, loading, min/max, and error.
4. **Keyboard:** Preserve arrow, Page Up/Down, Home, and End behavior.
5. **Responsive:** Keep horizontal target wide enough; use stepper buttons if space is too narrow.
6. **Accessibility:** Label current value/unit and use meaningful min/max/step.
7. **Grid:** Track, ticks, thumb, and permitted visual steps align to grid.
8. **Anti-patterns:** No smooth pill rail, round thumb, unlabeled value, or purely decorative custom div.
9. **Example:** `<label>Volume <output>6</output><input type="range" min="0" max="10" step="1"></label>`.

## 7. Spatial and visualization components

### Map marker

1. **Structure:** Button or labelled sprite anchored to an explicit map coordinate system.
2. **Visual:** Small block sprite with selected brackets and optional compact label.
3. **States:** Idle, hover, focus, active, selected, discovered/hidden, disabled, loading, and error.
4. **Keyboard:** Provide ordered marker navigation and pan/zoom controls; Enter opens detail.
5. **Responsive:** Recompute layout from logical coordinates; never fractionally scale sprite.
6. **Accessibility:** Offer a marker list or textual map alternative and meaningful names.
7. **Grid:** Map tile, coordinate conversion, marker source size, and offsets remain integer-aligned.
8. **Anti-patterns:** No inaccessible absolute divs, smooth teardrop pins, or color-only categories.
9. **Example:** `<button class="px-map-marker" style="--map-x:12;--map-y:8" aria-label="Gate 03">…</button>`.

### Timeline

1. **Structure:** Ordered list of time/event items with rail, node sprite, label, and status.
2. **Visual:** Block rail and square/stepped nodes; use hard separators for periods.
3. **States:** Past, current, future, selected, disabled, loading, and error event.
4. **Keyboard:** Links/buttons inside events follow document order; interactive scrubber uses slider semantics.
5. **Responsive:** Switch horizontal to vertical; keep chronological order and labels.
6. **Accessibility:** Use ordered list and machine-readable `<time>` values.
7. **Grid:** Rail thickness, node size, gaps, and branch offsets align to grid.
8. **Anti-patterns:** No smooth curved rail, tiny dots, absolute overlap, or color-only current state.
9. **Example:** `<ol class="px-timeline"><li><time datetime="14:02">14:02</time><span>Relay online</span></li></ol>`.

### Chart

1. **Structure:** Labelled figure containing block chart plus summary and accessible data table/list.
2. **Visual:** Quantized bars/cells, hard grid lines, integer axes, and limited palette.
3. **States:** Default, hover/focus datum, selected series, loading, empty, and error.
4. **Keyboard:** Focusable data points only when interaction exists; arrow keys move within series.
5. **Responsive:** Reduce tick count/series or switch to summary; never fractionally shrink the plot bitmap.
6. **Accessibility:** Provide title, description, values, units, and table/list alternative.
7. **Grid:** Plot bounds, bars, points, ticks, and marker positions align to logical grid.
8. **Anti-patterns:** No smooth spline, gradient area fill, tiny anti-aliased points, or chart without data alternative.
9. **Example:** `<figure><figcaption>Power by turn</figcaption><div class="px-bar-chart" aria-hidden="true">…</div><table>…</table></figure>`.

## 8. System states

### Loading state

1. **Structure:** Stable content frame with text status and sprite/frame indicator.
2. **Visual:** Use stepped frame animation, blinking blocks, or quantized progress.
3. **States:** Initial, active, delayed, paused, complete, and failed.
4. **Keyboard:** Keep cancellation/retry reachable and prevent duplicate primary actions.
5. **Responsive:** Preserve context and dimensions; simplify indicator frames if needed.
6. **Accessibility:** Set `aria-busy`; expose readable status and determinate value when known.
7. **Grid:** Every frame, translation, and indicator cell aligns to grid.
8. **Anti-patterns:** No infinite smooth spinner, skeleton gradient, layout shift, or removed action label.
9. **Example:** `<section aria-busy="true"><p>Loading map…</p><span class="px-loader" aria-hidden="true"></span></section>`.

### Empty state

1. **Structure:** Contextual heading, concise reason, optional decorative sprite, and next action.
2. **Visual:** Reuse the owning panel with lower-density center or aligned content. Modern fantasy may place a 48/64px character sprite beside the explanation without adding another frame.
3. **States:** First-use, filtered-empty, no-access, and offline-empty variants.
4. **Keyboard:** Primary recovery action follows heading/copy in focus order.
5. **Responsive:** Keep copy readable and action visible; reduce decorative sprite scale discretely.
6. **Accessibility:** Explain why content is empty and do not rely on decorative art.
7. **Grid:** Sprite scale, text gaps, and action placement align to grid.
8. **Anti-patterns:** No giant illustration, vague “nothing here,” disabled dead-end, or modern marketing card.
9. **Example:** `<section class="px-empty"><h2>No items</h2><p>Clear filters or visit the forge.</p><button>Clear filters</button></section>`.

### Error state

1. **Structure:** Error heading/status, clear message, recovery action, and optional technical detail.
2. **Visual:** Danger token plus distinct block pattern or icon; retain normal panel geometry.
3. **States:** Validation, recoverable, offline, permission, and fatal variants; loading may transition here.
4. **Keyboard:** Move focus only when needed; make retry/back actions reachable.
5. **Responsive:** Preserve message and action; wrap technical detail safely.
6. **Accessibility:** Use alert semantics for urgent failures and associate field errors directly.
7. **Grid:** Error marker, frame change, padding, and action gaps align to grid.
8. **Anti-patterns:** No red-only border, cryptic code without explanation, auto-dismiss, or inaccessible toast-only failure.
9. **Example:** `<section role="alert" class="px-error"><h2>Save failed</h2><p>Slot is unavailable.</p><button>Retry</button></section>`.

## 9. Ornamental components

### Ornamental frame

1. **Structure:** Formal nine-slice or equivalent 3×3 region system with eight pointer-inert decorative regions and one live semantic center.
2. **Visual:** Four purposeful layers: stepped silhouette, structural material, five-shade accent ramp, and calm near-black center; ornament variants change semantic hardware, while account/primary/navigation/content/compact families change proportion and depth.
3. **States:** Standard frames inherit owning region loading/error/selected state; interactive variants define the complete control state set.
4. **Keyboard:** Static frames never enter tab order; controls inside keep native order.
5. **Responsive:** Corners never stretch; internal layout recomposes and secondary bolts/braces disappear before primary silhouette.
6. **Accessibility:** Dynamic text and state remain DOM content; all slices, bolts, and braces are hidden from assistive technology.
7. **Grid:** Slice thickness, corner step, bolt, brace, band, and shadow derive from one 2/4/8px grid.
8. **Anti-patterns:** No screenshot crop, arbitrary nested borders, smooth gradient, stretched corner, or identical frame with only color changed.
9. **Example:** `<PixelOrnateFrame tone="gold" ornament="currency" detail="hero" family="account">Live content</PixelOrnateFrame>`.

### Ornamental navigation module

1. **Structure:** Native button/link composed from ornamental frame, left icon zone, centered label, and optional right state marker.
2. **Visual:** One semantic ramp, dark center, large multi-shade icon, reinforcement hardware, and visible lower depth.
3. **States:** Idle, hover palette step, instant focus frame, one-grid pressed depth, selected marker, disabled desaturation, loading, and error.
4. **Keyboard:** Native activation; use aria-current for links or aria-pressed for in-place module selection.
5. **Responsive:** Four-across desktop, two-column tablet, stacked or explicit carousel mobile; label stays readable and untruncated.
6. **Accessibility:** State uses marker/shape plus color; icon is decorative when the text label names the action.
7. **Grid:** Icon grid, fixed slices, label baseline, marker, and press translation align to shared tokens.
8. **Anti-patterns:** No flat tab, generic line icon, color-only selection, soft scale hover, or two-line clickable label.
9. **Example:** `<PixelOrnateButton tone="research" ornament="reinforced" family="navigation" icon={<ResearchSprite />}>Research</PixelOrnateButton>`.
