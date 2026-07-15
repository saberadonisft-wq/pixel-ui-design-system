# Theme preset reference

Define a preset by semantic role, never by screen name. For every preset, record palette roles, geometry, frame structure, icon language, typography, density, and motion. Keep all values on the selected grid.

## Selection matrix

| Signal | Default preset | Alternative |
| --- | --- | --- |
| Telemetry, cockpit, space economy | sci-fi | industrial |
| Inventory, quest, crafting | fantasy | arcade |
| Hacker, nightlife, surveillance | cyberpunk | terminal |
| CLI, logs, developer tool | terminal | minimal |
| Score, cabinet, casual game | arcade | fantasy |
| Machinery, monitoring, operations | industrial | sci-fi |
| Content-first pixel web product | minimal | terminal |

## Token mapping rule

Map palette values to semantic roles first. Components may consume `--surface-*`, `--frame-*`, `--accent-*`, `--text-*`, and `--state-*`; they must never consume a theme-specific color name such as `--cyan-500` or `--bronze`.

## Theme extension test

Apply the new theme to `PixelFrame`, `PixelButton`, `PixelPanel`, `PixelTab`, and `PixelIconButton` without modifying component CSS. If one primitive needs a one-off override, the theme contract is incomplete.

