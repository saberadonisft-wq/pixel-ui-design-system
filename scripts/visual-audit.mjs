import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import { createServer } from "vite";

const root = process.cwd();
const captureDir = process.env.PIXEL_CAPTURE_DIR;
const viewports = [
  { label: "320px", width: 320, height: 900 },
  { label: "375px", width: 375, height: 900 },
  { label: "414px", width: 414, height: 900 },
  { label: "768px", width: 768, height: 900 },
  { label: "desktop-1440", width: 1440, height: 1000 },
  { label: "landscape", width: 812, height: 375 },
  { label: "text-125", width: 375, height: 900, rootFontSize: "20px" },
];

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

async function findBrowser() {
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* try next candidate */
    }
  }
  throw new Error("Chrome/Chromium not found. Set CHROME_PATH before running visual-audit.");
}

const server = await createServer({
  root: path.join(root, "examples", "pixel-asset-demo"),
  logLevel: "error",
  server: { host: "127.0.0.1", port: 5278, strictPort: true },
});
let browser;
let failed = false;

try {
  if (captureDir) await mkdir(captureDir, { recursive: true });
  await server.listen();
  browser = await puppeteer.launch({ executablePath: await findBrowser(), headless: true });

  for (const viewport of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:5278/pixel-asset-demo", { waitUntil: "networkidle0" });
    if (viewport.rootFontSize) {
      await page.evaluate((fontSize) => {
        document.documentElement.style.fontSize = fontSize;
      }, viewport.rootFontSize);
    }

    const result = await page.evaluate(() => {
      const clickables = [...document.querySelectorAll("button,a[href]")].filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      const touchRisk = clickables
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        })
        .map((element) => `${element.tagName}:${element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 24)}`);
      const spriteRisk = [...document.querySelectorAll(".pixel-art")]
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            !["pixelated", "crisp-edges"].includes(style.imageRendering) ||
            [rect.width, rect.height].some((value) => Math.abs(value - Math.round(value)) > 0.01)
          );
        })
        .map((element) => element.getAttribute("src"));
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        touchRisk,
        spriteRisk,
      };
    });

    const pass =
      result.clientWidth === result.scrollWidth &&
      result.touchRisk.length === 0 &&
      result.spriteRisk.length === 0;
    failed ||= !pass;
    console.log(`${pass ? "PASS" : "FAIL"} pixel-asset-demo ${viewport.label}`, result);

    if (captureDir && ["375px", "768px", "desktop-1440"].includes(viewport.label)) {
      await page.screenshot({
        path: path.join(captureDir, `pixel-asset-demo-${viewport.label}.png`),
        fullPage: true,
      });
    }
    await page.close();
  }

  // Audit all interactive Studio navigation tabs
  const tabPage = await browser.newPage();
  await tabPage.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await tabPage.goto("http://127.0.0.1:5278/pixel-asset-demo", { waitUntil: "networkidle0" });
  const navButtons = await tabPage.$$('#studio-main-nav [role="tab"]');
  if (navButtons.length === 0) {
    failed = true;
    console.error("FAIL studio-tabs: no tabs found under #studio-main-nav");
  }
  for (let i = 0; i < navButtons.length; i += 1) {
    await navButtons[i].click();
    const tabResult = await tabPage.evaluate(async () => {
      const images = [...document.querySelectorAll("img.pixel-art")];
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
              }),
        ),
      );
      const clickables = [...document.querySelectorAll("button,a[href]")].filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      const touchRisk = clickables
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        })
        .map((element) => `${element.tagName}:${element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 24)}`);
      const spriteRisk = [...document.querySelectorAll(".pixel-art")]
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            !["pixelated", "crisp-edges"].includes(style.imageRendering) ||
            [rect.width, rect.height].some((value) => Math.abs(value - Math.round(value)) > 0.01)
          );
        })
        .map((element) => element.getAttribute("src"));
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        brokenImages: images
          .filter((img) => !img.complete || img.naturalWidth === 0)
          .map((img) => img.getAttribute("src")),
        touchRisk,
        spriteRisk,
      };
    });
    const tabPass =
      tabResult.clientWidth === tabResult.scrollWidth &&
      tabResult.brokenImages.length === 0 &&
      tabResult.touchRisk.length === 0 &&
      tabResult.spriteRisk.length === 0;
    failed ||= !tabPass;
    console.log(`${tabPass ? "PASS" : "FAIL"} studio-tab-${i}`, tabResult);
    if (captureDir) {
      await tabPage.screenshot({
        path: path.join(captureDir, `studio-tab-${i}.png`),
        fullPage: true,
      });
    }
  }
  await tabPage.close();
} finally {
  await browser?.close();
  await server.close();
}

if (failed) process.exitCode = 1;
