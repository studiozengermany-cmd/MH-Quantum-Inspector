// ============================================================
//  Local WebSocket Server (Node.js)
//  npm install ws
//  node server/ws-server.js
// ============================================================

const WebSocket = require("ws");
const crypto    = require("crypto");
const MHQBridge = require("./ai-bridge");

const PORT = process.env.MHQ_PORT || 9001;
const wss  = new WebSocket.Server({
  port: PORT,
  maxPayload: 2 * 1024 * 1024,
});

// ECDH key pairs per connection
const sessions = new Map();

function decodeBase64(value, maxChars) {
  if (typeof value !== "string" || value.length === 0 || value.length > maxChars) {
    return null;
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return null;
  }
  return Buffer.from(value, "base64");
}

function decodeP256PublicKey(value) {
  const key = decodeBase64(value, 128);
  if (!key || key.length !== 65 || key[0] !== 0x04) return null;
  return key;
}

function decodeIv(value) {
  const iv = decodeBase64(value, 24);
  if (!iv || iv.length !== 12) return null;
  return iv;
}

function decodeCiphertext(value) {
  const ciphertext = decodeBase64(value, 2 * 1024 * 1024);
  if (!ciphertext || ciphertext.length <= 16) return null;
  return ciphertext;
}

wss.on("listening", () => {
  console.log(`[MHQ Server] 🚀 WebSocket listening on ws://localhost:${PORT}`);
});

wss.on("connection", (ws) => {
  const sessionId = crypto.randomUUID();
  const ecdh      = crypto.createECDH("prime256v1");
  const serverPub = ecdh.generateKeys();

  sessions.set(ws, { ecdh, sharedKey: null, sessionId });
  console.log(`[MHQ Server] 🔌 Client connected — session: ${sessionId}`);

  ws.on("message", async (raw) => {
    try {
      const msg     = JSON.parse(raw.toString());
      const session = sessions.get(ws);
      if (!session || !msg || typeof msg !== "object") return;

      // ── HANDSHAKE ──
      if (msg.type === "HANDSHAKE") {
        const clientPubBuf = decodeP256PublicKey(msg.publicKey);
        if (!clientPubBuf) {
          ws.close(1008, "Invalid public key");
          return;
        }

        const shared = session.ecdh.computeSecret(clientPubBuf);

        // Derive AES key via HKDF-SHA256
        const derived = crypto.hkdfSync(
          "sha256", shared,
          Buffer.alloc(32), // salt
          Buffer.from("MHQ-AES-KEY"),
          32
        );
        session.sharedKey = derived;

        ws.send(JSON.stringify({
          type:      "HANDSHAKE_ACK",
          publicKey: serverPub.toString("base64"),
        }));

        console.log(`[MHQ Server] 🔐 Session ${sessionId} — E2E key exchanged`);
        return;
      }

      // ── ENCRYPTED PAYLOAD ──
      if (msg.type === "PAYLOAD" && session.sharedKey) {
        const iv         = decodeIv(msg.iv);
        const ciphertext = decodeCiphertext(msg.ciphertext);
        if (!iv || !ciphertext) {
          ws.close(1008, "Invalid payload frame");
          return;
        }

        const authTag = ciphertext.slice(-16);
        const ct      = ciphertext.slice(0, -16);

        const decipher = crypto.createDecipheriv("aes-256-gcm", session.sharedKey, iv);
        decipher.setAuthTag(authTag);

        let plain = decipher.update(ct, null, "utf8");
        plain    += decipher.final("utf8");

        const payload = JSON.parse(plain);
        console.log(`[MHQ Server] 📦 Payload received — session: ${sessionId}`);

        await MHQBridge.handle(payload, sessionId);
      }

    } catch (e) {
      console.error("[MHQ Server] ❌ Error:", e.message);
    }
  });

  ws.on("close", () => {
    sessions.delete(ws);
    console.log(`[MHQ Server] 🔌 Disconnected — session: ${sessionId}`);
  });
});
