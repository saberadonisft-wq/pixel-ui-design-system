# Theme preset reference

Define presets by semantic palette, material, geometry, sprite language, typography, density, and stepped motion. A theme is not a screen skin and cannot repair non-pixel primitives.

| Preset | Limited palette/material | Geometry | Sprite/type | Texture/motion |
| --- | --- | --- | --- | --- |
| `ornamental` | Near-black center, neutral metal, five-step amber/red/purple/cyan/blue/gold ramps | Formal nine-slice, fixed stepped corners, bolts, braces, material-specific hardware | 32/48/64px multi-shade icons; large Vietnamese-safe mono display | Sparse scratches/rivets; one-grid press and hard band swaps |
| `sci-fi` | Blue-black metal, cyan signal, amber warning | 4px chamfers, brackets, segmented rails | 16/24px block glyphs; bitmap/mono controls | Grid tile; scan steps only |
| `fantasy` | Warm cream paper, brown ink, terracotta, blossom, moss, sky, muted gold | 4px stepped corners, 1–2 border layers, scenic silhouettes | Prominent 32/48/64px character and item sprites; pixel display + readable body | Local scenery/material texture; press + short sprite reaction |
| `cyberpunk` | Ink, magenta or acid accent, dirty neutral | Asymmetric grid cuts and interrupted rails | Dense angular sprites; bitmap/mono | Sparse noise/checker; functional flicker |
| `terminal` | Near-black, phosphor green, dim slate | Square inset cells and command rails | 8/16px block glyphs; mono | Scanline tile; caret/frame steps |
| `arcade` | Navy, saturated primary, cream highlight | 8px chunky steps and score plaques | 8/16px solid sprites; bitmap display | Checker tile; short frame swaps |
| `industrial` | Graphite, steel, safety amber, danger red | Bolted caps, slots, heavy inset wells | Stencil block sprites; bitmap/mono | Plate tile; switch/alarm steps |
| `minimal` | Paper/ink ramp plus one accent | Square frame and one repeated notch | Sparse 16px blocks; readable mono/sans | Near-flat; immediate state changes |

For every preset define all canonical roles: canvas, panel-dark/mid/light, border-dark/light, text-primary/muted, accent/accent-highlight, selected, disabled, success, warning, and danger. Use two to four shades per material. Never interpolate shades inside components.

Theme name does not choose style family. `ornamental` supports the Ornamental family; `fantasy` may support Cozy or 16-bit RPG; `sci-fi` may support Tactical or Data Dashboard; `terminal` may support Cyber. References and task evidence decide.

Apply a new theme to frame, button, panel, tab, slot, sprite, field, meter, table, tooltip, and dialog without editing component CSS. If a one-off override is required for basic readability or geometry, extend the semantic token contract instead.
