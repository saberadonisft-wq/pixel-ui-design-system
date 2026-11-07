import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter((file) => Boolean(file) && existsSync(path.join(root, file)));
const failures = [];
const report = (file, rule, detail) => failures.push(`${file}: ${rule}${detail ? ` (${detail})` : ""}`);
const read = (file) => readFile(path.join(root, file), "utf8");

// Strictly validate core pixel primitives (packages/core/src/* and packages/react/src/styles.css)
// while allowing modern SaaS/Studio CSS in the Forge Studio workbench (examples/pixel-asset-demo and asset-styles.css).
const strictPixelCssFiles = tracked.filter(
  (file) =>
    (file.startsWith("packages/core/src/") || file === "packages/react/src/styles.css" || file === "tokens.css") &&
    file.endsWith(".css"),
);

const forbiddenCoreCss = [
  ["border-radius", /border-radius\s*:/i],
  ["blur", /(?:backdrop-filter|filter)\s*:[^;]*blur\s*\(/i],
  ["smooth color interpolation", /color-mix\s*\(/i],
  ["smooth easing", /cubic-bezier\s*\(/i],
  ["fluid display type", /clamp\s*\(/i],
  ["external font import", /@import\s+url\s*\(/i],
  ["fractional CSS pixel", /\d+\.\d+px\b/i],
];

for (const file of strictPixelCssFiles) {
  const source = await read(file);
  for (const [label, pattern] of forbiddenCoreCss) if (pattern.test(source)) report(file, label);
  if (!file.endsWith("tokens.css")) {
    for (const match of source.matchAll(/(-?\d+)px\b/g)) {
      const value = Number(match[1]);
      if (value !== 0 && Math.abs(value) % 4 !== 0) report(file, "off-grid raw pixel literal", `${value}px`);
    }
  }
}

const tsxFiles = tracked.filter((file) => file.endsWith(".tsx") && (file.startsWith("packages/") || file.startsWith("examples/")));
for (const file of tsxFiles) {
  const source = await read(file);
  if (/from\s+["'](?:lucide|@heroicons|@mui\/icons-material|@fortawesome)/i.test(source)) report(file, "generic icon library import");
}

const forgeDemo = await read("examples/pixel-asset-demo/src/main.tsx");
for (const primitive of ["PixelPaperdoll", "PixelSpriteAnimator", "PixelGachaCard", "PixelTilemapView", "PixelLightingPreview"]) {
  if (!forgeDemo.includes(primitive)) report("examples/pixel-asset-demo/src/main.tsx", "missing Pixel Forge primitive", primitive);
}

const assetStyles = await read("packages/react/src/asset-styles.css");
if (!/\.pixel-art[^{]*\{[^}]*image-rendering:\s*pixelated/s.test(assetStyles)) {
  report("packages/react/src/asset-styles.css", "pixel-art class lacks pixelated rendering");
}

if (failures.length) {
  console.error(`Pixel rules failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Pixel rules passed: ${strictPixelCssFiles.length} core CSS files, ${tsxFiles.length} TSX files.`);
}
