// ============================================================
//  MH-QUANTUM-INSPECTOR v2.1 — Dev Server
//  Static file server + optional bundle rebuild on save
// ============================================================

"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PORT = parseInt(process.env.DEV_PORT || "3000", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".glsl": "text/plain; charset=utf-8",
};

function safeFilePath(reqUrl) {
  const parsed = new URL(reqUrl, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname.includes("\\")) return null;
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.resolve(ROOT, "." + pathname);
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return filePath;
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  let filePath;
  try {
    filePath = safeFilePath(req.url);
  } catch (e) {
    filePath = null;
  }

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" });
      res.end(err.code === "ENOENT" ? "Not Found" : "Server Error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    });
    if (req.method === "HEAD") res.end();
    else res.end(data);
  });
});

let rebuildTimer = null;
function scheduleRebuild() {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    try {
      execFileSync(process.execPath, [path.join(__dirname, "build-bundle.js")], {
        cwd: ROOT,
        stdio: "inherit",
      });
    } catch (e) {
      console.error("[Dev] Build failed:", e.message);
    }
  }, 250);
}

["analyzer", "core", "renderer", "transport", "ui"].forEach((dir) => {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return;
  fs.watch(fullDir, { recursive: false }, (event, filename) => {
    if (filename && filename.endsWith(".js")) scheduleRebuild();
  });
});

server.listen(PORT, () => {
  console.log(`MH-Quantum Dev Server: http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("Dev server error:", err.message);
  process.exit(1);
});
