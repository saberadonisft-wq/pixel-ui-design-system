# Generated pixel UI assets

Files in this directory are derived from `../source/pixel-ui-sheet.png` using `../../../../scripts/extract-pixel-ui-assets.py` and `../asset-manifest.json`.

Regenerate them from the repository root:

```sh
npm run assets:pixel-ui
```

Do not edit generated PNG files manually. `generated-metadata.json` records final dimensions, alpha values, retained dark-pixel counts, source crops, and SHA-256 digests. Gitignored contact sheets are written to `../debug/` on both light and dark checker backgrounds.
