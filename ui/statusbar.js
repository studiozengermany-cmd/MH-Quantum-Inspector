// ============================================================
//  MH-QUANTUM-INSPECTOR v2.1 — statusbar.js
//  Thay thế panel cũ — chỉ hiện status nhỏ ở góc dưới phải
//  Không còn chiếm không gian, không còn xa vùng selection
//  Credits: Zenith.gg / TWAI Fam
// ============================================================

const MHQStatusBar = (() => {

  let bar = null;

  function init() {
    if (document.getElementById("mhq-statusbar")) return;

    bar    = document.createElement("div");
    bar.id = "mhq-statusbar";
    bar.innerHTML = `
      <span id="mhq-statusbar-dot"></span>
      <span id="mhq-statusbar-text">MHQ v2.1</span>
    `;
    document.body.appendChild(bar);
  }

  function show() {
    if (!bar) init();
    bar.classList.add("active");
    _update();
  }

  function hide() {
    if (bar) bar.classList.remove("active");
  }

  function _update() {
    const dot  = document.getElementById("mhq-statusbar-dot");
    const text = document.getElementById("mhq-statusbar-text");
    if (!dot || !text) return;

    const connected = typeof MHQCipher !== "undefined" && MHQCipher.hasKey();
    dot.classList.toggle("connected", connected);
    text.textContent = connected
      ? "🔐 E2E · Ctrl+Shift+X"
      : "◌ Offline · Ctrl+Shift+X";
  }

  function updateStatus(isConnected) {
    const dot  = document.getElementById("mhq-statusbar-dot");
    const text = document.getElementById("mhq-statusbar-text");
    if (!dot || !text) return;
    dot.classList.toggle("connected", isConnected);
    text.textContent = isConnected
      ? "🔐 E2E · Ctrl+Shift+X"
      : "◌ Offline · Ctrl+Shift+X";
  }

  return { init, show, hide, updateStatus };
})();