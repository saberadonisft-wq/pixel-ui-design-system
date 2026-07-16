# Pixel UI source inspection

## Source

- Path: `public/assets/pixel-ui/source/pixel-ui-sheet.png`
- Dimensions: 1672 × 941 pixels
- Format and mode: PNG, RGB
- Alpha channel: absent
- Render classification: generated asset board on the left and a baked assembled example on the right
- Background: near-black RGB field with subtle nonuniform noise and local colored glow around several pieces

The source is not an immediately usable transparent spritesheet. Automatic component discovery is unreliable because labels, divider rules, glows, and nearby pieces can join at permissive thresholds. Extraction therefore uses a manual crop manifest.

## Detected regions

| Approximate source region | Contents | Decision |
| --- | --- | --- |
| x 22–265, y 84–272 | Amber, red, purple, and cyan ornamental corners | Useful reference; omitted because the cleaner empty frames already contain complete corner geometry. |
| x 290–632, y 82–272 | Horizontal/vertical edges | Rejected for the demo because glow and inconsistent padding increase seam risk. |
| x 650–876, y 80–266 | Five text-free colored frames/fills | Extracted. Best nine-slice candidates. |
| x 20–574, y 320–480 | Caps, trims, dividers, bolts | Reference-only in this proof of concept; dense spacing makes isolated background removal less reliable. |
| x 613–878, y 319–543 | Compact square icon frames | Security, logout, and cyan plus frames extracted as fixed sprites. |
| x 22–330, y 540–760 | Baked-label buttons | Rejected because dynamic labels would duplicate or cover rasterized text. |
| x 650–840, y 580–782 | Round/badge icons | Five well-separated raster icons extracted. |
| x 20–560, y 810–916 | Larger empty panel examples | Retained as reference; their corners overlap adjacent samples more closely than the selected frame/fill set. |
| x 895–1672, y 0–941 | Assembled example and explanatory copy | Never extracted; baked text and complete UI composition make it unsuitable as a reusable asset. |

## Extraction risks

- The RGB source has no alpha, and its black outlines are close in value to the page background.
- Faint baked glow may remain because removing all near-black or low-saturation pixels would destroy intentional outlines and interiors.
- Several pieces use inconsistent outer padding.
- The source is a generated visual experiment, not a production spritesheet with verified slice guides.

Background removal is therefore restricted to pixels connected to a crop boundary and within a configured color distance of crop-corner samples. Alpha is binary (0 or 255); no feathering or antialiasing is introduced.

## Rendering contract

- Style family: Ornamental Pixel Game UI
- Category: responsive pixel web UI backed by a game-interface asset system
- Base layout grid: 4 CSS pixels
- Raster display scale: natural 1× for frames, icons, and compact controls
- Density: high for the account hero, medium for navigation, restrained for content rows
- Light direction: top-left highlight, bottom-right shadow, inherited from the raster sheet
- Type: Cascadia Mono/Segoe UI fallbacks with Vietnamese diacritics kept as live DOM text
- Representative primitive: raster-backed `PixelAssetFrame` using measured 16-pixel nine-slice borders

The five 112×60-ish text-free frames are appropriate for nine-slice composition. Round icons and compact icon frames remain fixed-size sprites.
