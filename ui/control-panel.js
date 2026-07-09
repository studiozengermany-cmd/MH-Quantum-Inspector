// ============================================================
//  Control Panel — Mini floating panel
// ============================================================

const MHQPanel = (() => {

  let panel = null;

  function init() {
    if (panel) return;

    panel = document.createElement("div");
    panel.id        = "mhq-panel";
    panel.innerHTML = `
      <div id="mhq-panel-title">⚡ MH-QUANTUM v2.1</div>
      <div>
        <span id="mhq-status-dot"></span>
        <span id="mhq-status-text">Disconnected</span>
      </div>
      <div style="margin-top:8px;font-size:11px;opacity:0.6;">
        Hotkey: Ctrl+Shift+X &nbsp;|&nbsp; Drag để chọn vùng
      </div>
      <textarea
        id="mhq-intent-input"
        rows="2"
        placeholder="Anh muốn làm gì với element này? (optional)"
      ></textarea>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button id="mhq-btn-close" style="
          flex:1;background:transparent;border:1px solid #FF4444;
          color:#FF4444;font-family:monospace;font-size:11px;
          border-radius:4px;padding:4px;cursor:pointer;
        ">✕ Đóng</button>
        <button id="mhq-btn-clear" style="
          flex:1;background:transparent;border:1px solid #00FFAA;
          color:#00FFAA;font-family:monospace;font-size:11px;
          border-radius:4px;padding:4px;cursor:pointer;
        ">↺ Clear</button>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById("mhq-btn-close").onclick  = () => MHQEngine.deactivate();
    document.getElementById("mhq-btn-clear").onclick  = () => {
      document.getElementById("mhq-intent-input").value = "";
    };
  }

  function show() {
    if (panel) panel.classList.add("active");
    updateStatus();
  }

  function hide() {
    if (panel) panel.classList.remove("active");
  }

  function getIntent() {
    return document.getElementById("mhq-intent-input")?.value?.trim() || "";
  }

  function updateStatus(forceConnected) {
    const dot  = document.getElementById("mhq-status-dot");
    const text = document.getElementById("mhq-status-text");
    if (!dot || !text) return;

    const ok = typeof forceConnected === "boolean"
      ? forceConnected
      : (typeof MHQTransport !== "undefined" && MHQTransport.isConnected());

    dot.classList.toggle("connected", ok);
    text.textContent = ok ? "WebSocket E2E 🔐" : "Offline mode";
  }

  return { init, show, hide, getIntent, updateStatus };
})();
