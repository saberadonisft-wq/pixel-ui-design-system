import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import { createServer } from "vite";

const root = process.cwd();
const demos = [
  { name: "sci-fi", root: "examples/sci-fi-hud", port: 5273 },
  { name: "fantasy", root: "examples/fantasy-ui", port: 5274 },
  { name: "terminal", root: "examples/terminal-ui", port: 5275 },
  { name: "lab", root: "examples/component-lab", port: 5276 }
];
const viewports = [
  { label: "320px", width: 320, height: 900 },
  { label: "375px", width: 375, height: 900 },
  { label: "414px", width: 414, height: 900 },
  { label: "768px", width: 768, height: 900 },
  { label: "landscape", width: 812, height: 375 },
  { label: "text-125", width: 375, height: 900, rootFontSize: "20px" }
];
const themes = ["sci-fi", "fantasy", "cyberpunk", "terminal", "arcade", "industrial", "minimal"];
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);

async function findBrowser() {
  for (const candidate of chromeCandidates) {
    try { await access(candidate); return candidate; } catch { /* try next candidate */ }
  }
  throw new Error("Chrome/Chromium not found. Set CHROME_PATH before running test:visual.");
}

const servers = [];
let browser;
let failed = false;

try {
  for (const demo of demos) {
    const server = await createServer({ root: path.join(root, demo.root), logLevel: "error", server: { host: "127.0.0.1", port: demo.port, strictPort: true } });
    await server.listen();
    servers.push(server);
  }

  browser = await puppeteer.launch({ executablePath: await findBrowser(), headless: true });
  for (const viewport of viewports) {
    for (const demo of demos) {
      const page = await browser.newPage();
      await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
      await page.goto(`http://127.0.0.1:${demo.port}`, { waitUntil: "networkidle0" });
      if (viewport.rootFontSize) await page.evaluate((fontSize) => { document.documentElement.style.fontSize = fontSize; }, viewport.rootFontSize);
      const result = await page.evaluate(() => {
        const clickables = [...document.querySelectorAll("button,a[href],input,select,textarea")].filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== "none" && style.visibility !== "hidden" && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
        });
        const wrapRisk = clickables.filter((element) => element.matches("button,a[href]") && getComputedStyle(element).whiteSpace !== "nowrap").map((element) => element.textContent?.trim().slice(0, 40));
        const touchRisk = clickables.filter((element) => {
          if (element.matches("input,select,textarea") && element.closest(".px-choice,.px-switch")) return false;
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        }).map((element) => `${element.tagName}:${element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 24)}`);
        const first = clickables[0];
        first?.focus();
        const focusSurface = first?.closest(".px-field")?.querySelector(".px-field__control") ?? first?.closest(".px-choice,.px-switch")?.querySelector(".px-choice__mark,.px-switch__track") ?? first;
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          wrapRisk,
          touchRisk,
          focusWidth: focusSurface ? getComputedStyle(focusSurface).outlineWidth : "n/a"
        };
      });
      const pass = result.clientWidth === result.scrollWidth && result.wrapRisk.length === 0 && result.touchRisk.length === 0 && result.focusWidth !== "0px";
      failed ||= !pass;
      console.log(`${pass ? "PASS" : "FAIL"} ${demo.name} ${viewport.label}`, result);
      await page.close();
    }
  }

  for (const demo of demos) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 800 });
    await page.goto(`http://127.0.0.1:${demo.port}`, { waitUntil: "networkidle0" });
    let pass = false;
    if (demo.name === "sci-fi") {
      const tabs = await page.$$("[role=tab]");
      await tabs[1].click();
      pass = await tabs[1].evaluate((element) => element.getAttribute("aria-selected") === "true");
    } else if (demo.name === "fantasy") {
      const options = await page.$$("[role=option]");
      await options[1].click();
      pass = await options[1].evaluate((element) => element.getAttribute("aria-selected") === "true");
    } else if (demo.name === "terminal") {
      const before = (await page.$$("ol li")).length;
      await page.click("form button[type=submit]");
      pass = (await page.$$("ol li")).length === before + 1;
    } else {
      await page.select(".lab-controls select", "minimal");
      const modalButton = await page.$$("button");
      const trigger = await Promise.all(modalButton.map(async (button) => ({ button, text: await button.evaluate((element) => element.textContent?.trim()) })));
      await trigger.find((item) => item.text === "Open modal")?.button.click();
      pass = await page.$eval("dialog", (dialog) => dialog.open && getComputedStyle(dialog).display !== "none");
    }
    failed ||= !pass;
    console.log(`${pass ? "PASS" : "FAIL"} ${demo.name} interaction`);
    await page.close();
  }

  const themePage = await browser.newPage();
  await themePage.setViewport({ width: 1024, height: 800 });
  await themePage.goto("http://127.0.0.1:5276", { waitUntil: "networkidle0" });
  for (const theme of themes) {
    await themePage.select(".lab-controls select", theme);
    const ratios = await themePage.evaluate(() => {
      function rgba(value) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      }
      function luminance(color) {
        const channels = color.slice(0, 3).map((channel) => channel / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      }
      function contrast(a, b) {
        const [lighter, darker] = [luminance(rgba(a)), luminance(rgba(b))].sort((x, y) => y - x);
        return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
      }
      const style = getComputedStyle(document.querySelector(".lab"));
      const token = (name) => style.getPropertyValue(name).trim();
      return {
        primary: contrast(token("--text-primary"), token("--surface-dark")),
        secondary: contrast(token("--text-secondary"), token("--surface-dark")),
        accent: contrast(token("--accent-ink"), token("--accent-main")),
        boundary: contrast(token("--frame-base"), token("--surface-dark"))
      };
    });
    const pass = ratios.primary >= 4.5 && ratios.secondary >= 4.5 && ratios.accent >= 4.5 && ratios.boundary >= 3;
    failed ||= !pass;
    console.log(`${pass ? "PASS" : "FAIL"} ${theme} contrast`, ratios);
  }
  await themePage.close();
} finally {
  await browser?.close();
  await Promise.all(servers.map((server) => server.close()));
}

if (failed) process.exitCode = 1;
