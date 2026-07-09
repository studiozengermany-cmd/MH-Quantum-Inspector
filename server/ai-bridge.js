// ============================================================
//  AI Bridge — Nhận payload → format → log / gửi AI
//  Có thể hook bất kỳ AI API nào vào đây
// ============================================================

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const LOG_DIR = path.join(__dirname, "../logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function safeSessionId(value, fallback) {
  const id = typeof value === "string" ? value : fallback;
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}

function safeLogPath(sessionId) {
  const filename = `mhq-${sessionId}.json`;
  const resolved = path.resolve(LOG_DIR, filename);
  const root     = path.resolve(LOG_DIR) + path.sep;
  if (!resolved.startsWith(root)) {
    throw new Error("Unsafe log path");
  }
  return resolved;
}

async function handle(payload, serverSessionId) {
  // 1. Log ra file (luôn luôn)
  const sessionId = safeSessionId(payload?.session_id, serverSessionId);
  const filename  = safeLogPath(sessionId);
  fs.writeFileSync(filename, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[MHQ Bridge] 💾 Logged → ${filename}`);

  // 2. Print auto-prompt ra terminal (paste vào AI chat)
  console.log("\n" + "═".repeat(60));
  console.log("[MHQ Bridge] 🤖 AUTO-PROMPT (copy & paste to AI):");
  console.log("═".repeat(60));
  console.log(payload.auto_prompt);
  console.log("═".repeat(60) + "\n");

  // 3. Hook AI API ở đây nếu muốn tự động
  // await callOpenAI(payload.auto_prompt);
  // await callClaude(payload.auto_prompt);
}

module.exports = { handle };
