// ============================================================
//  WebSocket Client — 3-Tier Fallback Transport
//  Tier 1: WebSocket E2E encrypted
//  Tier 2: Clipboard
//  Tier 3: Export JSON file
// ============================================================

const MHQTransport = (() => {

  let ws         = null;
  let keyPair    = null;
  let connected  = false;
  let retries    = 0;
  const MAX_RETRIES = window.MHQuantumConfig?.transport?.reconnect_attempts || 3;

  function isConnected() {
    return !!(
      connected &&
      ws &&
      ws.readyState === WebSocket.OPEN &&
      MHQCipher.hasKey()
    );
  }

  function _setConnected(ok) {
    connected = ok;
    _updateStatus(ok);
  }

  async function connect() {
    const url = window.MHQuantumConfig?.transport?.websocket_url || "ws://localhost:9001";
    try {
      _setConnected(false);
      MHQCipher.reset();
      keyPair = await MHQCipher.generateKeyPair();
      const pubKeyB64 = await MHQCipher.exportPublicKey(keyPair);

      ws = new WebSocket(url);

      ws.onopen = async () => {
        // ECDH handshake — gửi public key
        ws.send(JSON.stringify({ type: "HANDSHAKE", publicKey: pubKeyB64 }));
      };

      ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "HANDSHAKE_ACK") {
            const serverPub = await MHQCipher.importServerPublicKey(msg.publicKey);
            await MHQCipher.deriveSharedKey(keyPair.privateKey, serverPub);
            retries = 0;
            _setConnected(true);
            console.log("[MHQ] 🔐 WebSocket E2E connected & encrypted");
          }
        } catch (e) {
          console.warn("[MHQ] WS message failed:", e.message);
          _setConnected(false);
        }
      };

      ws.onclose = () => {
        _setConnected(false);
        MHQCipher.reset();
        if (retries < MAX_RETRIES) {
          retries++;
          const delay = window.MHQuantumConfig?.transport?.reconnect_delay_ms || 1500;
          console.warn(`[MHQ] WS closed. Retry ${retries}/${MAX_RETRIES}...`);
          setTimeout(connect, delay);
        }
      };

      ws.onerror = (e) => {
        _setConnected(false);
        console.warn("[MHQ] WS error:", e);
      };

    } catch (e) {
      _setConnected(false);
      console.warn("[MHQ] Cannot connect to WS server:", e.message);
    }
  }

  async function send(payload) {
    const json = JSON.stringify(payload);

    // ── TIER 1: WebSocket E2E ──
    if (isConnected()) {
      try {
        const encrypted = await MHQCipher.encrypt(json);
        ws.send(JSON.stringify({ type: "PAYLOAD", ...encrypted }));
        MHQToast.show("✅ Đã gửi qua WebSocket (E2E)", "success");
        return;
      } catch (e) {
        _setConnected(false);
        console.warn("[MHQ] WS send failed, falling back:", e);
      }
    }

    // ── TIER 2: Clipboard ──
    try {
      const text = payload.auto_prompt + "\n\n---\n" + JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(text);
      MHQToast.show("📋 Đã copy vào Clipboard (WS offline)", "warn");
      return;
    } catch (e) {
      console.warn("[MHQ] Clipboard failed, falling back to file:", e);
    }

    // ── TIER 3: Export JSON File ──
    _exportFile(json, `mhq-${Date.now()}.json`);
    MHQToast.show("💾 Đã xuất file JSON (offline mode)", "warn");
  }

  function _exportFile(content, filename) {
    const blob = new Blob([content], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function _updateStatus(isConnectedNow) {
    const dot = document.getElementById("mhq-status-dot");
    if (dot) dot.classList.toggle("connected", isConnectedNow);
    if (typeof MHQPanel !== "undefined" && MHQPanel.updateStatus) {
      MHQPanel.updateStatus(isConnectedNow);
    }
  }

  return { connect, send, isConnected };
})();
