// ============================================================
//  MH-QUANTUM-INSPECTOR v2.1 — context-popup.js
//  Contextual popup bật lên NGAY BÊN CẠNH vùng selection
//  Không phải fixed corner panel nữa
//  Credits: Zenith.gg / TWAI Fam
// ============================================================

const MHQContextPopup = (() => {

  let popup       = null;
  let intentInput = null;
  let sendCb      = null;    // callback khi user nhấn Send
  let cancelCb    = null;    // callback khi user nhấn Cancel
  let currentTag  = "";

  // ── Quick intent chips ─────────────────────────────────
  const QUICK_INTENTS = [
    "Fix layout",
    "Sửa màu sắc",
    "Debug z-index",
    "Căn chỉnh lại",
    "Fix responsive",
    "Giải thích",
  ];

  // ── Init (gọi 1 lần) ───────────────────────────────────
  function init() {
    if (document.getElementById("mhq-context-popup")) return;

    popup = document.createElement("div");
    popup.id = "mhq-context-popup";
    popup.innerHTML = `
      <div class="mhq-popup-header">
        <span class="mhq-popup-title">💬 Intent</span>
        <span class="mhq-popup-element-tag" id="mhq-popup-tag"></span>
      </div>

      <textarea
        id="mhq-popup-intent"
        rows="2"
        placeholder="Mày muốn sửa gì ở đây?"
      ></textarea>

      <div class="mhq-quick-chips" id="mhq-quick-chips"></div>

      <div class="mhq-popup-actions">
        <button id="mhq-popup-send">⚡ Gửi cho AI</button>
        <button id="mhq-popup-cancel">✕</button>
      </div>

      <div class="mhq-popup-hint">
        Enter gửi · Esc hủy · để trống = phân tích tổng quát
      </div>
    `;

    document.body.appendChild(popup);
    intentInput = document.getElementById("mhq-popup-intent");

    // Render quick chips
    const chipsContainer = document.getElementById("mhq-quick-chips");
    QUICK_INTENTS.forEach((label) => {
      const chip = document.createElement("span");
      chip.className   = "mhq-chip";
      chip.textContent = label;
      chip.onclick     = () => {
        intentInput.value = label;
        intentInput.focus();
        // Move cursor to end
        intentInput.setSelectionRange(label.length, label.length);
      };
      chipsContainer.appendChild(chip);
    });

    // Send button
    document.getElementById("mhq-popup-send").onclick = _onSend;

    // Cancel button
    document.getElementById("mhq-popup-cancel").onclick = _onCancel;

    // Keyboard shortcuts
    intentInput.addEventListener("keydown", (e) => {
      // Enter (without Shift) → Send
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        _onSend();
        return;
      }
      // Escape → Cancel
      if (e.key === "Escape") {
        e.preventDefault();
        _onCancel();
      }
    });

    // Click outside popup → cancel
    document.addEventListener("mousedown", _onClickOutside);
  }

  // ── Show — position popup near selection rect ──────────
  function show(selectionRect, elementTag, onSend, onCancel) {
    if (!popup) init();

    sendCb   = onSend;
    cancelCb = onCancel;

    // Update element tag display
    const tagEl = document.getElementById("mhq-popup-tag");
    if (tagEl) {
      tagEl.textContent = elementTag || "element";
      tagEl.title       = elementTag || "element";
    }

    // Clear previous intent
    intentInput.value = "";

    // ── Calculate position ────────────────────────────────
    const POPUP_W    = 280;
    const POPUP_H    = 180;  // approx
    const GAP        = 10;
    const VP_W       = window.innerWidth;
    const VP_H       = window.innerHeight;

    let left = selectionRect.left;
    let top;
    let arrowClass;

    // Try placing BELOW selection first
    const belowTop = selectionRect.bottom + GAP;
    if (belowTop + POPUP_H < VP_H - 10) {
      top        = belowTop;
      arrowClass = "arrow-up";
    } else {
      // Place ABOVE selection
      top        = selectionRect.top - POPUP_H - GAP;
      arrowClass = "arrow-down";
    }

    // Clamp X within viewport
    if (left + POPUP_W > VP_W - 10) {
      left = VP_W - POPUP_W - 10;
    }
    if (left < 10) left = 10;

    // Clamp Y
    if (top < 10) top = 10;

    // Apply position
    popup.style.left  = `${Math.round(left)}px`;
    popup.style.top   = `${Math.round(top)}px`;
    popup.style.width = `${POPUP_W}px`;

    // Arrow direction
    popup.className = `visible ${arrowClass}`;

    // Auto-focus textarea after animation
    setTimeout(() => {
      if (intentInput) intentInput.focus();
    }, 120);
  }

  // ── Hide ───────────────────────────────────────────────
  function hide() {
    if (!popup) return;
    popup.classList.remove("visible");
    popup.className = popup.className
      .replace("arrow-up",   "")
      .replace("arrow-down", "")
      .trim();

    setTimeout(() => {
      if (intentInput) intentInput.value = "";
    }, 200);
  }

  // ── Get current intent value ───────────────────────────
  function getIntent() {
    return intentInput?.value?.trim() || "";
  }

  // ── Internal handlers ──────────────────────────────────
  function _onSend() {
    const intent = getIntent();
    hide();
    if (typeof sendCb === "function") sendCb(intent);
  }

  function _onCancel() {
    hide();
    if (typeof cancelCb === "function") cancelCb();
  }

  function _onClickOutside(e) {
    if (!popup) return;
    if (!popup.classList.contains("visible")) return;
    if (!popup.contains(e.target)) {
      // Click outside → treat as cancel
      _onCancel();
    }
  }

  return { init, show, hide, getIntent };
})();