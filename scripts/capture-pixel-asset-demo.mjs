import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import { createServer } from "vite";

const root = process.cwd();
const primitiveOnly = process.argv.includes("--primitive");
const outputDir = path.join(root, "public", "assets", "pixel-ui", "debug", "renders");
const browserCandidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

async function findBrowser() {
  for (const candidate of browserCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next installed browser.
    }
  }
  throw new Error("Chrome or Edge was not found.");
}

const captures = primitiveOnly
  ? [{ label: "primitive-1440-100", width: 1440, height: 900, zoom: 1 }]
  : [
      { label: "1440-100", width: 1440, height: 1000, zoom: 1 },
      { label: "1440-200", width: 1440, height: 1000, zoom: 2 },
      { label: "768-100", width: 768, height: 1000, zoom: 1 },
      { label: "768-200", width: 768, height: 1000, zoom: 2 },
      { label: "375-100", width: 375, height: 1000, zoom: 1 },
      { label: "375-200", width: 375, height: 1000, zoom: 2 },
    ];

const server = await createServer({
  root: path.join(root, "examples", "pixel-asset-demo"),
  logLevel: "error",
  server: { host: "127.0.0.1", port: 5277, strictPort: true },
});
let browser;

try {
  await mkdir(outputDir, { recursive: true });
  await server.listen();
  browser = await puppeteer.launch({ executablePath: await findBrowser(), headless: true });

  for (const capture of captures) {
    const page = await browser.newPage();
    const failures = [];
    page.on("requestfailed", (request) => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
    const layoutWidth = capture.zoom === 1 ? capture.width : Math.max(320, Math.floor(capture.width / capture.zoom));
    const layoutHeight = capture.zoom === 1 ? capture.height : Math.floor(capture.height / capture.zoom);
    await page.setViewport({ width: layoutWidth, height: layoutHeight, deviceScaleFactor: capture.zoom });
    await page.goto("http://127.0.0.1:5277/pixel-asset-demo", { waitUntil: "networkidle0" });
    const audit = await page.evaluate(() => {
      const interactive = [...document.querySelectorAll("button,a[href]")].filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      interactive[0]?.focus();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        touchRisks: interactive.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        }).map((element) => element.getAttribute("aria-label") ?? element.textContent?.trim()),
        focusOutline: interactive[0] ? getComputedStyle(interactive[0]).outlineWidth : "n/a",
        spriteRisks: [...document.querySelectorAll(".pixel-art")].filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return !["pixelated", "crisp-edges"].includes(style.imageRendering) || [rect.x, rect.y, rect.width, rect.height].some((value) => Math.abs(value - Math.round(value)) > 0.01);
        }).map((element) => ({
          source: element.getAttribute("src"),
          imageRendering: getComputedStyle(element).imageRendering,
          rect: element.getBoundingClientRect().toJSON(),
        })),
        frameRisks: [...document.querySelectorAll(".px-asset-frame,.px-asset-control")].filter((element) => {
          const style = getComputedStyle(element);
          return !style.borderImageSource.includes("pixel-ui") || [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].some((value) => !Number.isInteger(Number.parseFloat(value)));
        }).map((element) => element.className),
      };
    });
    if (failures.length || audit.clientWidth !== audit.scrollWidth || audit.touchRisks.length || audit.spriteRisks.length || audit.frameRisks.length) {
      throw new Error(`${capture.label} audit failed: ${JSON.stringify({ failures, audit })}`);
    }
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    const destination = path.join(outputDir, `pixel-asset-demo-${capture.label}.png`);
    await page.screenshot({ path: destination, fullPage: true });
    console.log(`captured ${destination}`, audit);
    await page.close();
  }

  if (!primitiveOnly) {
    for (const width of [320, 414]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await page.goto("http://127.0.0.1:5277/pixel-asset-demo", { waitUntil: "networkidle0" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) throw new Error(`${width}px layout overflows by ${overflow}px.`);
      await page.close();
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
