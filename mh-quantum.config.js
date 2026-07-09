// ============================================================
//  MH-QUANTUM-INSPECTOR v2.1 — EXTERNAL CONFIG
//  Chỉnh ở đây thôi. KHÔNG BAO GIỜ đụng vào core files.
//  Mọi thay đổi behavior đều qua file này.
// ============================================================

window.MHQuantumConfig = {

  version: "2.1.0",

  // ── Hotkey kích hoạt ──────────────────────────────────
  hotkey: {
    key:   "X",
    ctrl:  true,
    shift: true,
  },

  // ── WebSocket transport ───────────────────────────────
  transport: {
    websocket_url:      "ws://localhost:9001",
    reconnect_attempts: 3,
    reconnect_delay_ms: 1500,
  },

  // ── WebGL renderer ────────────────────────────────────
  renderer: {
    prefer_webgl:        true,    // false → force Canvas2D fallback
    mesh_color_primary:  "#00FFAA",
    mesh_color_z_deep:   "#FF00FF",
    mesh_pulse_speed:    1.4,
    hud_font:            "monospace",
    z_near:              -100,    // WebGL near plane
    z_far:                100,    // WebGL far plane
  },

  // ── Analyzer ──────────────────────────────────────────
  analyzer: {
    collect_computed_styles: true,
    collect_screenshot:      true,   // DOM snapshot (no permission needed)
    adaptive_dimensions:     true,   // Auto detect T-axis
    max_elements_in_region:  50,     // Giới hạn để tránh quá tải
  },

  // ── AI Prompt ─────────────────────────────────────────
  ai_prompt: {
    enabled:        true,
    default_intent: "",
    language:       "vi",           // "vi" hoặc "en"
  },

};
