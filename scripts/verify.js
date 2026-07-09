// ============================================================
//  MH-QUANTUM-INSPECTOR v2.1 — Pre-ship Verifier
//  node scripts/verify.js
// ============================================================

"use strict";

const fs   = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const REQUIRED_FILES = [
  "mh-quantum.config.js",
  "ui/mh-quantum.css",
  "ui/toast.js",
  "ui/control-panel.js",
  "renderer/webgl-context.js",
  "renderer/quantum-mesh-builder.js",
  "renderer/hud-overlay.js",
  "analyzer/stacking-context-resolver.js",
  "analyzer/computed-style-extractor.js",
  "analyzer/dom-crawler.js",
  "core/temporal-observer.js",
  "core/dimension-sampler.js",
  "core/quantum-engine.js",
  "transport/e2e-cipher.js",
  "transport/payload-schema.js",
  "transport/ws-client.js",
  "server/ws-server.js",
  "server/ai-bridge.js",
  "scripts/build-bundle.js",
  "scripts/dev-server.js",
  "scripts/verify.js",
  "index.html",
  "package.json",
  "README.md",
];

const BUNDLE_ORDER = [
  "mh-quantum.config.js",
  "analyzer/stacking-context-resolver.js",
  "analyzer/computed-style-extractor.js",
  "analyzer/dom-crawler.js",
  "core/temporal-observer.js",
  "core/dimension-sampler.js",
  "renderer/webgl-context.js",
  "renderer/quantum-mesh-builder.js",
  "renderer/hud-overlay.js",
  "transport/e2e-cipher.js",
  "transport/payload-schema.js",
  "transport/ws-client.js",
  "ui/toast.js",
  "ui/control-panel.js",
  "core/quantum-engine.js",
];

const results = { pass: [], warn: [], fail: [] };
function pass(msg) { results.pass.push(msg); console.log(`✅ ${msg}`); }
function warn(msg) { results.warn.push(msg); console.log(`⚠️  ${msg}`); }
function fail(msg) { results.fail.push(msg); console.log(`❌ ${msg}`); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function expect(condition, message) { condition ? pass(message) : fail(message); }

console.log("MH-Quantum-Inspector verify");
console.log("=".repeat(44));

REQUIRED_FILES.forEach((file) => expect(exists(file), `exists: ${file}`));

REQUIRED_FILES.filter((file) => file.endsWith(".js")).forEach((file) => {
  if (!exists(file)) return;
  try {
    new Function(read(file));
    pass(`syntax ok: ${file}`);
  } catch (e) {
    fail(`syntax error: ${file}: ${e.message}`);
  }
});

try {
  const pkg = JSON.parse(read("package.json"));
  ["start", "dev", "dev:ui", "build", "verify", "release", "logs"].forEach((script) => {
    expect(!!pkg.scripts?.[script], `package script: ${script}`);
  });
} catch (e) {
  fail(`package.json parse error: ${e.message}`);
}

if (exists("mhq.bundle.js")) {
  const bundle = read("mhq.bundle.js");
  let lastIndex = -1;
  BUNDLE_ORDER.forEach((file) => {
    const marker = `MODULE: ${file}`;
    const idx = bundle.indexOf(marker);
    expect(idx > lastIndex, `bundle order: ${file}`);
    lastIndex = idx;
  });
  try {
    new Function(bundle);
    pass("bundle syntax ok");
  } catch (e) {
    fail(`bundle syntax error: ${e.message}`);
  }
} else {
  fail("mhq.bundle.js missing — run npm run build first");
}

if (exists("server/ws-server.js")) {
  const src = read("server/ws-server.js");
  expect(src.includes("maxPayload"), "ws-server maxPayload set");
  expect(src.includes("decodeP256PublicKey") && src.includes("key.length !== 65") && src.includes("key[0] !== 0x04"), "ws-server validates P-256 public key before computeSecret");
  expect(src.includes("decodeIv") && src.includes("iv.length !== 12"), "ws-server validates AES-GCM iv");
}

if (exists("server/ai-bridge.js")) {
  const src = read("server/ai-bridge.js");
  expect(src.includes("safeSessionId") && src.includes("crypto.randomUUID"), "ai-bridge sanitizes session id");
  expect(!src.includes("mhq-${payload.session_id}.json"), "ai-bridge avoids raw payload.session_id filename");
}

if (exists("core/temporal-observer.js")) {
  const src = read("core/temporal-observer.js");
  expect(src.includes("if (rafId || mutationObserver) return"), "temporal observer start is idempotent");
  expect(!src.includes("styleInfo.is_animating || styleInfo.has_transition"), "transition declaration not treated as active animation");
}

if (exists("analyzer/stacking-context-resolver.js")) {
  const src = read("analyzer/stacking-context-resolver.js");
  ["position:fixed", "position:sticky", "flex-grid-z-index", "perspective", "clip-path", "mask", "backdrop-filter", "container-type"].forEach((needle) => {
    expect(src.includes(needle), `stacking rule: ${needle}`);
  });
}

if (exists("analyzer/dom-crawler.js")) {
  const src = read("analyzer/dom-crawler.js");
  expect(src.includes("max_elements_in_region") && src.includes("results.length >= limit"), "dom crawler enforces max_elements_in_region");
}

if (exists("transport/payload-schema.js")) {
  const src = read("transport/payload-schema.js");
  expect(src.includes("dom_snapshot") && src.includes("artifact_type"), "payload schema has explicit dom_snapshot artifact");
}

if (exists("renderer/webgl-context.js")) {
  const src = read("renderer/webgl-context.js");
  expect(src.includes("if (program)") && src.includes("deleteShader"), "WebGL program is reused and shaders cleaned");
}

if (exists("ui/toast.js") && exists("ui/mh-quantum.css")) {
  expect(read("ui/toast.js").includes("warn") && read("ui/mh-quantum.css").includes("#mhq-toast.warn"), "toast supports warn style");
}

if (exists("server/package.json")) {
  try {
    const serverPkg = JSON.parse(read("server/package.json"));
    const ok = serverPkg.main === "ws-server.js" && serverPkg.scripts?.start === "node ws-server.js";
    ok ? pass("server/package.json paths ok") : fail("server/package.json paths must use ws-server.js or file should be removed");
  } catch (e) {
    fail(`server/package.json parse error: ${e.message}`);
  }
} else {
  pass("server/package.json absent (root package is canonical)");
}

console.log("=".repeat(44));
console.log(`PASS ${results.pass.length} | WARN ${results.warn.length} | FAIL ${results.fail.length}`);

if (results.warn.length) {
  console.log("\nWarnings:");
  results.warn.forEach((msg) => console.log(`- ${msg}`));
}

if (results.fail.length) {
  console.log("\nFailures:");
  results.fail.forEach((msg) => console.log(`- ${msg}`));
  process.exit(1);
}

console.log("Ready to ship checks passed.");
