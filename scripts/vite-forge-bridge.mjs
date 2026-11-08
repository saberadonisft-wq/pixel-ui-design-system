import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const FORGE_SCRIPT = path.join(REPO_ROOT, "scripts", "pixel-forge.py");
const ALLOWED_ASSET_ROOT = path.resolve(REPO_ROOT, "public", "assets", "pixel-forge");
const BATCH_MANIFEST_PATH = path.join(ALLOWED_ASSET_ROOT, "batch-manifest.json");
const ROOT_MANIFEST_PATH = path.join(ALLOWED_ASSET_ROOT, "generated", "forge-manifest.json");

function runPythonForge(args) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn("python", [FORGE_SCRIPT, ...args], {
      cwd: REPO_ROOT,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: Date.now() - t0,
      });
    });
    child.on("error", (err) => {
      resolve({
        ok: false,
        code: 1,
        stdout: "",
        stderr: err.message,
        durationMs: Date.now() - t0,
      });
    });
  });
}

function readJsonBody(req, maxBytes = 16 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Payload exceeds 16MB limit."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export function pixelForgeDevBridge() {
  return {
    name: "pixel-forge-dev-bridge",
    configureServer(server) {
      let debounceTimer = null;
      const notifyManifestUpdated = (reason, unitId) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          server.ws.send({
            type: "custom",
            event: "pixel-forge:updated",
            data: { reason, unitId: unitId ?? null, timestamp: Date.now() },
          });
        }, 90);
      };

      server.watcher.add([BATCH_MANIFEST_PATH, ROOT_MANIFEST_PATH]);
      const onFsEvent = (changedPath) => {
        const norm = path.resolve(changedPath);
        if (norm === BATCH_MANIFEST_PATH || norm === ROOT_MANIFEST_PATH) {
          notifyManifestUpdated("ide-fs-watch", null);
        }
      };
      server.watcher.on("change", onFsEvent);
      server.watcher.on("add", onFsEvent);

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/__pixel-forge/")) {
          next();
          return;
        }
        const route = req.url.split("?")[0];

        if (req.method === "GET" && route === "/__pixel-forge/ping") {
          sendJson(res, 200, {
            ok: true,
            bridge: "vite-local-two-way",
            timestamp: Date.now(),
          });
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "Method not allowed" });
          return;
        }

        try {
          const body = await readJsonBody(req);

          if (route === "/__pixel-forge/register-unit") {
            const tmpDir = path.join(REPO_ROOT, ".tmp");
            fs.mkdirSync(tmpDir, { recursive: true });
            const specPath = path.join(tmpDir, `bridge-register-${Date.now()}.json`);
            fs.writeFileSync(specPath, JSON.stringify(body.spec ?? body, null, 2), "utf8");
            const regRes = await runPythonForge(["register-unit", "--spec-file", specPath]);
            try {
              fs.unlinkSync(specPath);
            } catch {
              // ignore cleanup
            }
            if (!regRes.ok) {
              sendJson(res, 400, {
                ok: false,
                error: regRes.stderr || regRes.stdout || "register-unit failed",
                logs: `${regRes.stdout}\n${regRes.stderr}`.trim(),
              });
              return;
            }
            const rawId = String((body.spec ?? body).id ?? "").trim().toLowerCase().replace(/_/g, "-");
            const unitId = rawId.startsWith("hero-") ? rawId : `hero-${rawId}`;
            let buildLogs = regRes.stdout;
            if (body.buildImmediately !== false) {
              const bRes = await runPythonForge(["build-unit", "--unit", unitId]);
              buildLogs = `${regRes.stdout}\n${bRes.stdout}\n${bRes.stderr}`.trim();
              notifyManifestUpdated("register-and-build", unitId);
              sendJson(res, bRes.ok ? 200 : 500, {
                ok: bRes.ok,
                unitId,
                logs: buildLogs,
                durationMs: regRes.durationMs + bRes.durationMs,
              });
              return;
            }
            sendJson(res, 200, { ok: true, unitId, logs: buildLogs, durationMs: regRes.durationMs });
            return;
          }

          if (route === "/__pixel-forge/upload-raw") {
            const unitId = String(body.unitId ?? "").trim();
            const relDir = String(body.rawAiDir ?? "").trim().replace(/^[/\\]+/, "");
            const slotFileName = String(body.slotFileName ?? "").trim();
            const dataUrl = String(body.dataUrl ?? "");

            if (!unitId || !relDir || !/^[a-z0-9_-]+\.png$/i.test(slotFileName)) {
              sendJson(res, 400, { ok: false, error: "Invalid unitId, rawAiDir, or PNG filename." });
              return;
            }
            const targetDir = path.resolve(REPO_ROOT, relDir);
            if (!targetDir.startsWith(ALLOWED_ASSET_ROOT + path.sep) && targetDir !== ALLOWED_ASSET_ROOT) {
              sendJson(res, 403, { ok: false, error: "Target rawAiDir must reside inside public/assets/pixel-forge." });
              return;
            }
            const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
            if (!match) {
              sendJson(res, 400, { ok: false, error: "Expected data:image/png;base64 payload." });
              return;
            }
            fs.mkdirSync(targetDir, { recursive: true });
            const finalPath = path.join(targetDir, slotFileName);
            const tmpPath = path.join(targetDir, `.tmp-${Date.now()}-${slotFileName}`);
            fs.writeFileSync(tmpPath, Buffer.from(match[1], "base64"));
            fs.renameSync(tmpPath, finalPath);

            const savedRel = path.relative(REPO_ROOT, finalPath).replace(/\\/g, "/");
            if (body.autoBuild !== false) {
              const logsArr = [`Saved ${savedRel}`];
              let totalMs = 0;
              if (unitId === "hero-paladin-knight") {
                const rootBuild = await runPythonForge(["build"]);
                logsArr.push(rootBuild.stdout, rootBuild.stderr);
                totalMs += rootBuild.durationMs;
              }
              const unitBuild = await runPythonForge(["build-unit", "--unit", unitId]);
              logsArr.push(unitBuild.stdout, unitBuild.stderr);
              totalMs += unitBuild.durationMs;
              notifyManifestUpdated("upload-raw", unitId);
              sendJson(res, unitBuild.ok ? 200 : 500, {
                ok: unitBuild.ok,
                savedPath: savedRel,
                logs: logsArr.filter(Boolean).join("\n"),
                durationMs: totalMs,
              });
              return;
            }

            sendJson(res, 200, { ok: true, savedPath: savedRel, logs: `Saved ${savedRel}` });
            return;
          }

          if (route === "/__pixel-forge/build-unit") {
            const unitId = String(body.unitId ?? "").trim();
            if (!unitId) {
              sendJson(res, 400, { ok: false, error: "Missing unitId" });
              return;
            }
            const logsArr = [];
            let totalMs = 0;
            if (unitId === "hero-paladin-knight") {
              const rBuild = await runPythonForge(["build"]);
              logsArr.push(rBuild.stdout, rBuild.stderr);
              totalMs += rBuild.durationMs;
            }
            const uBuild = await runPythonForge(["build-unit", "--unit", unitId]);
            logsArr.push(uBuild.stdout, uBuild.stderr);
            totalMs += uBuild.durationMs;
            notifyManifestUpdated("manual-web-build", unitId);
            sendJson(res, uBuild.ok ? 200 : 500, {
              ok: uBuild.ok,
              unitId,
              logs: logsArr.filter(Boolean).join("\n"),
              durationMs: totalMs,
            });
            return;
          }

          if (route === "/__pixel-forge/delete-unit") {
            const unitId = String(body.unitId ?? "").trim();
            if (!unitId) {
              sendJson(res, 400, { ok: false, error: "Missing unitId" });
              return;
            }
            const dRes = await runPythonForge(["delete-unit", "--unit", unitId]);
            if (dRes.ok) {
              notifyManifestUpdated("delete-unit", "hero-paladin-knight");
            }
            sendJson(res, dRes.ok ? 200 : 400, {
              ok: dRes.ok,
              logs: `${dRes.stdout}\n${dRes.stderr}`.trim(),
            });
            return;
          }

          sendJson(res, 404, { ok: false, error: `Unknown endpoint ${route}` });
        } catch (err) {
          sendJson(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    },
  };
}
