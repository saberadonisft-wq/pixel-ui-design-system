# Typography, icons, sprites, assets, and motion

## Contents

1. Typography strategy
2. Raster sprite contract
3. Pixel-safe SVG contract
4. Placeholder policy
5. Texture assets
6. Motion

## 1. Typography strategy

Use the display face for headings, tabs, counters, badges, controls, inventory labels, short navigation, and status values. Use the readable body face for long descriptions, documentation, dense data, validation help, and accessibility-sensitive copy.

Keep the scale limited:

| Token | Font size | Line height | Use |
| --- | ---: | ---: | --- |
| `xs` | 12px | 16px | Badges, counters, metadata |
| `sm` | 14px | 20px | Controls, compact rows |
| `md` | 16px | 24px | Body and standard controls |
| `lg` | 20px | 28px | Panel title |
| `xl` | 24px | 32px | Screen title |
| `display` | 32px | 40px | Modern Pixel Fantasy hero, short only |

Use integer values. Change tokens at discrete breakpoints rather than fluidly interpolating decorative pixel type. Keep type weight to two or three values. Avoid negative letter spacing, blurred text, soft text shadow, stretched transforms, and uppercase paragraphs.

Use the pixel face for short display headings, item names, values, and button labels. Use a readable serif or sans for body copy and accessibility-sensitive text. Default body size is 16px or larger. For Vietnamese, test `ă â đ ê ô ơ ư` with every tone mark in real labels. If the bitmap face clips or lacks glyphs, fall back to Cascadia Mono or Segoe UI and preserve pixel identity through geometry rather than broken type.

Bitmap fonts differ in legibility. Test the actual face at 100%, 125%, and 200% zoom. If it becomes ambiguous, switch body copy to the readable fallback. Recommended fallback groups:

```css
--px-font-display: "Pixel Operator", "Press Start 2P", "Cascadia Mono", monospace;
--px-font-body: system-ui, "Segoe UI", sans-serif;
--px-font-data: "Cascadia Mono", "SFMono-Regular", monospace;
```

External fonts are optional enhancement, not a rendering dependency. Define stable metrics and usable local fallbacks. Never claim authenticity from the font alone.

## 2. Raster sprite contract

Prefer raster sprites for authored item art, avatars, map markers, animated effects, and decorative material pieces.

Require:

- a small source dimension such as 8, 16, 24, 32, 48, or 64px;
- explicit intrinsic `width` and `height`;
- transparent background when the sprite is composited;
- nearest-neighbor display with `image-rendering: pixelated`;
- integer display scale only;
- one palette shared with the target theme or an intentional reserved sub-palette;
- no baked dynamic text;
- a text alternative when the sprite conveys information.

```css
.px-sprite {
  width: calc(var(--px-sprite-source-width) * var(--px-sprite-scale));
  height: calc(var(--px-sprite-source-height) * var(--px-sprite-scale));
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  object-fit: contain;
}
```

For sprite sheets, store source cell width/height, sheet columns/rows, frame count, frame duration, and supported integer scales. Move the background position in whole source-cell increments.

## 3. Pixel-safe SVG contract

Use SVG only when a raster asset is unavailable or when theming with `currentColor` is materially useful. It must still resemble a sprite.

Require:

- `viewBox="0 0 16 16"`, `24 24`, `32 32`, `48 48`, or `64 64`;
- integer coordinates and integer dimensions;
- `shape-rendering="crispEdges"`;
- block fills or strokes at least two logical units thick;
- `stroke-linecap="butt"` and `stroke-linejoin="miter"` when strokes are needed;
- paths made from `M`, `L`, `H`, `V`, and `Z` commands;
- no `C`, `S`, `Q`, `T`, or `A` curve/arc commands;
- no filters, blur, gradient fill, round cap, or round join;
- display at the matching token size or an integer multiple without stretching.
- for Ornamental primary modules, occupy roughly 15–25% of module width and use two-to-five shades from the component ramp.

Prefer simple `<rect>` and block `<path>` shapes. A diagonal is acceptable only when it resolves into intentional stair steps at the target size.

```html
<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="currentColor" d="M2 2H8V4H10V6H12V12H10V14H4V12H2Z" />
  <rect x="4" y="6" width="2" height="2" fill="var(--px-border-dark)" />
</svg>
```

## 4. Placeholder policy

Lucide, Heroicons, Material Symbols, Font Awesome, and other smooth icon libraries are placeholders only. When temporarily used:

1. label the code or task as `PIXEL_ICON_PLACEHOLDER`;
2. lock the icon box to the target sprite size;
3. disable rounded line caps and joins where possible;
4. do not tune the entire component around the placeholder detail;
5. add a replacement plan naming the target source size and palette;
6. replace before calling the interface production-ready.

Do not mix placeholder line icons with completed raster sprites in the same primary navigation.

## 5. Texture assets

Author texture tiles at a small source size and record their repeat axis. Keep them reusable and free of dynamic content. Use integer scaling and hard alpha edges. Do not crop reference screenshots, assemble screenshot fragments, or use a screenshot as a background.

Use CSS tiles for simple checker, grid, or scanline patterns. Use purpose-built raster tiles for stone, wood, paper, metal, terrain, or irregular dither. Avoid generic diagonal stripes.

## 6. Motion

Use motion to clarify state:

- pressed control: translate by exactly one grid unit and reduce the bottom/right shadow;
- selection: tile or marker swap with no interpolation;
- loading: sprite frames or `steps()` sequence;
- caret: hard opacity toggle;
- notification: discrete slide by whole grid units;
- damage/status: short palette or tile swap;
- progress: quantized segments when precise continuous display is unnecessary.

Avoid spring, elastic curves, smooth float, hover scaling, blur trails, and continuous glow pulses. A short one-grid sprite reaction or two-frame bounce may respond to a deliberate action in Modern Pixel Fantasy; it must use `steps()` and settle immediately. Prefer durations divisible into a stable frame cadence, such as 96, 192, 384, or 768ms.

Under `prefers-reduced-motion: reduce`, remove decorative loops, keep state changes immediate, and preserve the final informative frame.
