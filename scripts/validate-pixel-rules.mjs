import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const failures = [];
const report = (file, rule, detail) => failures.push(`${file}: ${rule}${detail ? ` (${detail})` : ""}`);
const read = (file) => readFile(path.join(root, file), "utf8");

const cssFiles = tracked.filter((file) => file.endsWith(".css") && !file.includes("/dist/") && !file.startsWith("skills/"));
const productionCss = cssFiles.filter((file) => file.startsWith("packages/") || file.startsWith("examples/") || file === "tokens.css");
const forbiddenCss = [
  ["border-radius", /border-radius\s*:/i],
  ["blur", /(?:backdrop-filter|filter)\s*:[^;]*blur\s*\(/i],
  ["smooth color interpolation", /color-mix\s*\(/i],
  ["smooth easing", /cubic-bezier\s*\(/i],
  ["fluid display type", /clamp\s*\(/i],
  ["external font import", /@import\s+url\s*\(/i],
  ["fractional CSS pixel", /\d+\.\d+px\b/i],
  ["generic diagonal stripe", /(?:repeating-)?linear-gradient\(\s*(?:45deg|135deg)/i]
];

for (const file of productionCss) {
  const source = await read(file);
  for (const [label, pattern] of forbiddenCss) if (pattern.test(source)) report(file, label);
  if (!file.endsWith("tokens.css")) {
    for (const match of source.matchAll(/(-?\d+)px\b/g)) {
      const value = Number(match[1]);
      if (value !== 0 && Math.abs(value) % 4 !== 0) report(file, "off-grid raw pixel literal", `${value}px`);
    }
  }
  if ((file.startsWith("packages/core/src/") && !file.endsWith("tokens.css")) || file.startsWith("packages/react/src/")) {
    if (/#[0-9a-f]{3,8}\b/i.test(source)) report(file, "hard-coded component color");
  }
}

const tsxFiles = tracked.filter((file) => file.endsWith(".tsx") && (file.startsWith("packages/") || file.startsWith("examples/")));
for (const file of tsxFiles) {
  const source = await read(file);
  if (/from\s+["'](?:lucide|@heroicons|@mui\/icons-material|@fortawesome)/i.test(source)) report(file, "generic icon library import");
  for (const svg of source.matchAll(/<svg\b([^>]*)>/g)) {
    if (!/shapeRendering=["']crispEdges["']/.test(svg[1])) report(file, "SVG missing crispEdges");
    if (/strokeLinecap=["']round["']|strokeLinejoin=["']round["']/.test(svg[1])) report(file, "rounded SVG stroke");
  }
  for (const pathData of source.matchAll(/\bd=["']([^"']+)["']/g)) {
    if (/[CQSTA]/i.test(pathData[1])) report(file, "curved SVG path command", pathData[1].slice(0, 32));
    if (/\d+\.\d+/.test(pathData[1])) report(file, "fractional SVG coordinate", pathData[1].slice(0, 32));
  }
}

const demoEntries = tracked.filter((file) => /^examples\/[^/]+\/src\/main\.tsx$/.test(file));
for (const file of demoEntries) {
  const source = await read(file);
  if (!/data-px-grid=["'](?:2|4|8)["']/.test(source)) report(file, "demo does not declare pixel grid");
  if (!/data-px-mode=["'](?:ornamental|minimal-8bit|rpg-16bit|cozy|tactical-hud|cyber|data-dashboard)["']/.test(source)) report(file, "demo does not declare style family");
}

const fantasyDemo = await read("examples/fantasy-ui/src/main.tsx");
const fantasyStyles = await read("examples/fantasy-ui/src/styles.css");
if (!/data-px-mode="ornamental"/.test(fantasyDemo)) report("examples/fantasy-ui/src/main.tsx", "reference demo must use Ornamental family");
if (/px-grid-surface/.test(fantasyDemo)) report("examples/fantasy-ui/src/main.tsx", "ornamental demo uses global grid surface");
if (!/PixelOrnateFrame/.test(fantasyDemo) || !/PixelOrnateButton/.test(fantasyDemo)) report("examples/fantasy-ui/src/main.tsx", "ornamental demo does not compose shared ornate primitives");
for (const family of ["account", "primary", "navigation", "content", "compact"]) {
  if (!fantasyDemo.includes(`family="${family}"`)) report("examples/fantasy-ui/src/main.tsx", "missing ornamental frame family", family);
}
if (!/viewBox="0 0 48 48"/.test(fantasyDemo)) report("examples/fantasy-ui/src/main.tsx", "ornamental demo lacks 48px handcrafted icon grid");
for (const label of ["Saber", "TIỀN ẢO", "600.000.000 đ", "Nạp", "Thị Trường", "Xưởng Nghiên Cứu", "Pháo Đài Vốn", "Lõi Trí Tuệ"]) {
  if (!fantasyDemo.includes(label)) report("examples/fantasy-ui/src/main.tsx", "missing required Vietnamese demo label", label);
}
if (/\.ornamental-demo\s*\{[^}]*background-image/s.test(fantasyStyles)) report("examples/fantasy-ui/src/styles.css", "ornamental root uses global texture");

const tokenSource = await read("packages/core/src/tokens.css");
for (const token of ["--px-grid", "--px-half-grid", "--px-press-offset", "--px-font-xs", "--px-sprite-sm", "--px-sprite-hero", "--px-control-sm", "--px-layer-overlay", "--px-motion-step", "--px-selected", "--px-disabled", "--px-frame-padding", "--px-panel-padding", "--px-orn-slice", "--px-orn-icon"]) {
  if (!tokenSource.includes(token)) report("packages/core/src/tokens.css", "missing canonical token", token);
}

const reactStyles = await read("packages/react/src/styles.css");
if (!/\.px-sprite[^}]*image-rendering:\s*pixelated/s.test(reactStyles)) report("packages/react/src/styles.css", "sprite primitive lacks pixelated rendering");
for (const slice of ["top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"]) {
  if (!reactStyles.includes(`data-slice="${slice}"`)) report("packages/react/src/styles.css", "ornamental nine-slice region missing", slice);
}
if (!/\.px-control:not\(:disabled\):active[^{]*\{[^}]*var\(--px-press-offset\)/s.test(await read("packages/core/src/primitives.css"))) report("packages/core/src/primitives.css", "active control does not use canonical press offset");

const skillPath = "skills/pixel-ui-design-system/SKILL.md";
const skill = await read(skillPath);
if (skill.split(/\r?\n/).length > 500) report(skillPath, "SKILL.md exceeds 500 lines");
for (const match of skill.matchAll(/\]\(([^)]+\.md)\)/g)) {
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(skillPath), match[1]));
  if (!tracked.includes(target)) report(skillPath, "missing linked reference", target);
}

const catalogPath = "skills/pixel-ui-design-system/references/component-catalog.md";
const catalog = await read(catalogPath);
const requiredComponents = ["Button", "Icon button", "Tabs", "Segmented control", "Card", "Panel", "Dialog", "Tooltip", "Dropdown", "Inventory slot", "Item card", "Stat block", "Health bar", "Mana bar", "Stamina bar", "Progress bar", "Badge", "Counter", "Currency display", "Navigation menu", "Sidebar", "Status panel", "Data table", "Notification", "Input field", "Checkbox", "Radio control", "Switch", "Slider", "Map marker", "Timeline", "Chart", "Loading state", "Empty state", "Error state"];
for (const component of requiredComponents) {
  const heading = `### ${component}`;
  const start = catalog.indexOf(heading);
  if (start < 0) { report(catalogPath, "missing component definition", component); continue; }
  const next = catalog.indexOf("\n### ", start + heading.length);
  const section = catalog.slice(start, next < 0 ? catalog.length : next);
  for (const field of ["Structure", "Visual", "States", "Keyboard", "Responsive", "Accessibility", "Grid", "Anti-patterns", "Example"]) {
    if (!section.includes(`**${field}:**`)) report(catalogPath, `component missing ${field}`, component);
  }
}

for (const file of tracked.filter((name) => name.startsWith("skills/pixel-ui-design-system/references/") && name.endsWith(".md"))) {
  const source = await read(file);
  if (source.split(/\r?\n/).length > 100 && !source.includes("## Contents")) report(file, "long reference missing contents");
}

if (failures.length) {
  console.error(`Pixel rules failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Pixel rules passed: ${productionCss.length} CSS files, ${tsxFiles.length} TSX files, ${requiredComponents.length} component contracts.`);
}
