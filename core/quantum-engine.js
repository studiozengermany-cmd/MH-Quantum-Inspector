// ============================================================
//  MH-QUANTUM — quantum-engine.js (PATCHED v2.1)
//  BUG FIX:
//  [#4] GPU buffer leak + RAF runaway → reuse buffers, cancel properly
//  [#5] Screenshot async bug + popup hell → dom-snapshot fallback
//  [#7] elementFromPoint → dùng MHQDomCrawler.getElementAtPoint()
//  [FIX 2.2] Contextual Popup + StatusBar thay panel cố định
// ============================================================

const MHQEngine = (() => {

  // ── State ──────────────────────────────────────────────
  let active   = false;
  let dragging = false;
  let startX   = 0, startY = 0;
  let endX     = 0, endY   = 0;

  let _pendingSelRect = null;   // Lưu selection rect khi chờ intent
  let _pendingMouseX  = 0;
  let _pendingMouseY  = 0;

  // ── DOM refs ───────────────────────────────────────────
  let overlay    = null;
  let canvas     = null;
  let selBox     = null;
  let xhairLabel = null;
  let hudCanvas  = null;

  // ── WebGL state ────────────────────────────────────────
  let useWebGL   = false;
  let animRAF    = null;
  let meshData   = null;
  let startTime  = 0;

  // ── [FIX #4] Persistent GPU buffers ───────────────────
  let glPosBuffer   = null;
  let glAlphaBuffer = null;

  // ── Shader sources (inline) ────────────────────────────
  const VERT_SRC = `
    attribute vec3  a_position;
    attribute float a_alpha;
    uniform   mat4  u_matrix;
    uniform   float u_time;
    uniform   float u_z_depth;
    varying   float v_alpha;
    varying   float v_z_depth;

    void main() {
      float pulse = sin(u_time * 2.0 + a_position.x * 0.05) * 0.5 + 0.5;
      vec3  pos   = a_position;
      pos.z += sin(u_time * 1.5 + a_position.y * 0.03) * u_z_depth * 2.0;
      gl_Position  = u_matrix * vec4(pos, 1.0);
      gl_PointSize = 3.0;
      v_alpha      = a_alpha * (0.7 + pulse * 0.3);
      v_z_depth    = u_z_depth;
    }
  `;

  const FRAG_SRC = `
    precision mediump float;
    uniform float u_time;
    uniform float u_z_depth;
    varying float v_alpha;
    varying float v_z_depth;

    void main() {
      float t   = clamp(v_z_depth / 10.0, 0.0, 1.0);
      vec3  c1  = vec3(0.0,  1.0,  0.667); // #00FFAA
      vec3  c2  = vec3(1.0,  0.0,  1.0);   // #FF00FF
      vec3  col = mix(c1, c2, t);
      float flicker = 0.92 + 0.08 * sin(u_time * 8.0);
      gl_FragColor  = vec4(col * flicker, v_alpha);
    }
  `;

  // ── Init ───────────────────────────────────────────────
  function init() {
    _buildDOM();
    _bindHotkey();

    // [CHANGED] Dùng StatusBar + ContextPopup thay Panel cũ
    MHQStatusBar.init();
    MHQContextPopup.init();
    MHQToast.init();

    MHQTemporalObserver.start();
    MHQTransport.connect();
    console.log("[MHQ Engine] 🚀 MH-Quantum-Inspector v2.1 initialized");
  }

  function _buildDOM() {
    overlay        = document.createElement("div");
    overlay.id     = "mhq-overlay";

    canvas         = document.createElement("canvas");
    canvas.id      = "mhq-canvas";

    selBox         = document.createElement("div");
    selBox.id      = "mhq-selection-box";

    xhairLabel     = document.createElement("div");
    xhairLabel.id  = "mhq-crosshair-label";

    hudCanvas      = MHQHud.init();

    overlay.append(canvas, selBox, xhairLabel, hudCanvas);
    document.body.appendChild(overlay);

    _bindMouseEvents();
    window.addEventListener("resize", _onResize);
  }

  function _onResize() {
    MHQWebGL.resize(canvas);
    MHQHud.resize();
  }

  // ── Hotkey ─────────────────────────────────────────────
  function _bindHotkey() {
    const cfg = window.MHQuantumConfig?.hotkey || {
      key: "X", ctrl: true, shift: true
    };

    document.addEventListener("keydown", (e) => {
      const match =
        e.key === cfg.key   &&
        e.ctrlKey  === cfg.ctrl  &&
        e.shiftKey === cfg.shift;

      if (match) {
        e.preventDefault();
        active ? deactivate() : activate();
      }

      if (e.key === "Escape" && active) deactivate();
    });
  }

  // ── Activate ───────────────────────────────────────────
  function activate() {
    active    = true;
    startTime = performance.now();

    overlay.classList.add("active");

    // [CHANGED] StatusBar thay vì Panel
    MHQStatusBar.show();

    if (window.MHQuantumConfig?.renderer?.prefer_webgl !== false) {
      useWebGL = MHQWebGL.init(canvas);
      if (useWebGL) {
        MHQWebGL.resize(canvas);
        useWebGL = MHQWebGL.buildProgram(VERT_SRC, FRAG_SRC);
        if (!useWebGL) {
          console.warn("[MHQ Engine] WebGL program failed — mesh disabled");
        }

        const gl = MHQWebGL.getGL();
        if (useWebGL && gl && !glPosBuffer) {
          glPosBuffer   = gl.createBuffer();
          glAlphaBuffer = gl.createBuffer();
          console.log("[MHQ Engine] 🎮 WebGL persistent buffers created");
        }
      }
    }

    MHQHud.resize();
    MHQToast.show("⚡ MH-Quantum ACTIVE — Ctrl+Shift+X để tắt");
    console.log("[MHQ Engine] ✅ Activated");
  }

  // ── Deactivate ─────────────────────────────────────────
  function deactivate() {
    active   = false;
    dragging = false;

    // [CHANGED] Ẩn cả ContextPopup + StatusBar
    MHQContextPopup.hide();
    MHQStatusBar.hide();

    if (animRAF) {
      cancelAnimationFrame(animRAF);
      animRAF = null;
    }

    const gl = MHQWebGL.getGL();
    if (gl) {
      if (glPosBuffer)   { gl.deleteBuffer(glPosBuffer);   glPosBuffer   = null; }
      if (glAlphaBuffer) { gl.deleteBuffer(glAlphaBuffer); glAlphaBuffer = null; }
      gl.clear(gl.COLOR_BUFFER_BIT);
      console.log("[MHQ Engine] 🧹 WebGL buffers cleaned up");
    }

    meshData = null;
    window.removeEventListener("mouseup", _onMouseUp, true);

    overlay.classList.remove("active");
    selBox.style.display     = "none";
    xhairLabel.style.display = "none";
    MHQHud.clear();

    // Reset pending state
    _pendingSelRect = null;
    _pendingMouseX  = 0;
    _pendingMouseY  = 0;
  }

  // ── Mouse Events ───────────────────────────────────────
  function _bindMouseEvents() {
    overlay.addEventListener("mousedown", _onMouseDown);
    overlay.addEventListener("mousemove", _onMouseMove);
    overlay.addEventListener("mouseup",   _onMouseUp);
  }

  function _onMouseDown(e) {
    if (!active) return;
    dragging = true;
    startX   = e.clientX;
    startY   = e.clientY;
    endX     = e.clientX;
    endY     = e.clientY;
    window.addEventListener("mouseup", _onMouseUp, true);

    selBox.style.display = "block";
    MHQHud.clear();

    if (animRAF) {
      cancelAnimationFrame(animRAF);
      animRAF  = null;
      meshData = null;
    }
  }

  function _onMouseMove(e) {
    if (!active) return;

    xhairLabel.style.display = "block";
    xhairLabel.style.left    = `${e.clientX + 16}px`;
    xhairLabel.style.top     = `${e.clientY + 10}px`;
    xhairLabel.textContent   = `X:${e.clientX}  Y:${e.clientY}`;

    if (!dragging) return;
    endX = e.clientX;
    endY = e.clientY;

    const r = _getSelectionRect();
    selBox.style.left   = `${r.left}px`;
    selBox.style.top    = `${r.top}px`;
    selBox.style.width  = `${r.right  - r.left}px`;
    selBox.style.height = `${r.bottom - r.top}px`;
  }

  // ── [CHANGED] _onMouseUp — bật popup ngay tại selection ───
  async function _onMouseUp(e) {
    if (!active || !dragging) return;
    dragging = false;
    endX     = e.clientX;
    endY     = e.clientY;

    const selRect = _getSelectionRect();
    const W       = selRect.right  - selRect.left;
    const H       = selRect.bottom - selRect.top;

    if (W < 6 || H < 6) {
      selBox.style.display = "none";
      return;
    }

    // Lưu context, bật popup NGAY TẠI vùng selection
    _pendingSelRect = selRect;
    _pendingMouseX  = e.clientX;
    _pendingMouseY  = e.clientY;

    // Lấy element tag để hiển thị trong popup header
    const el  = MHQDomCrawler.getElementAtPoint(e.clientX, e.clientY);
    const tag = el
      ? MHQDomCrawler.getSelector(el).split(">").pop().trim()
      : "element";

    // Show contextual popup sát vùng selection
    MHQContextPopup.show(
      selRect,
      tag,
      // onSend callback — user đã điền intent → process
      async (intent) => {
        await _processSelection(
          _pendingSelRect,
          _pendingMouseX,
          _pendingMouseY,
          intent   // intent được pass trực tiếp từ popup
        );
      },
      // onCancel callback — user hủy
      () => {
        selBox.style.display = "none";
        MHQHud.clear();
        const gl = MHQWebGL.getGL();
        if (gl) gl.clear(gl.COLOR_BUFFER_BIT);
        MHQToast.show("↩ Đã hủy", "warn", 1200);
      }
    );
  }

  // ── [CHANGED] _processSelection signature mới ─────────
  // Thêm tham số intent (không đọc từ panel nữa)
  async function _processSelection(selRect, mouseX, mouseY, intent = "") {
    MHQToast.show("🔍 Đang phân tích...", "success", 900);

    try {
      const primaryEl = MHQDomCrawler.getElementAtPoint(mouseX, mouseY);
      if (!primaryEl) {
        MHQToast.show("⚠️ Không tìm được element", "error");
        return;
      }

      const elements   = MHQDomCrawler.findElementsInRegion(selRect);
      if (elements.length === 0) {
        MHQToast.show("⚠️ Không có element trong vùng chọn", "error");
        return;
      }

      const primaryData = MHQDomCrawler.describeElement(primaryEl);
      const matrix4D    = MHQDimensionSampler.sample(primaryEl, mouseX, mouseY);
      const styleInfo   = MHQStyleExtractor.extract(primaryEl);

      const viewportCtx = {
        window_width:       window.innerWidth,
        window_height:      window.innerHeight,
        scroll_x:           window.scrollX,
        scroll_y:           window.scrollY,
        device_pixel_ratio: window.devicePixelRatio || 1,
        zoom_level:         parseFloat(
          (window.outerWidth / window.innerWidth).toFixed(2)
        ),
      };

      const domSnapshot = _captureDOMSnapshot(primaryEl, selRect);

      const domContext = {
        primary_element: {
          ...primaryData,
          computed_styles: styleInfo.properties,
        },
        all_elements_in_region: elements,
        element_count:          elements.length,
      };

      // intent từ popup, không từ panel
      const payload = MHQPayloadSchema.build(
        matrix4D, domContext, viewportCtx, intent, domSnapshot
      );

      if (useWebGL) _renderQuantumMesh(selRect, matrix4D.Z);
      MHQHud.drawDimensionLabels(matrix4D, selRect);

      await MHQTransport.send(payload);

      console.log("[MHQ Engine] 📦 Session:", payload.session_id);

      if (intent) {
        MHQToast.show(`🚀 Đã gửi: "${intent.slice(0, 40)}..."`, "success");
      } else {
        MHQToast.show("📦 Đã gửi payload (không có intent)", "success");
      }

    } catch (err) {
      console.error("[MHQ Engine] ❌ Error:", err);
      MHQToast.show(`❌ Lỗi: ${err.message}`, "error", 4000);
    }
  }

  // ── WebGL Render — Fix Bug #4 ──────────────────────────
  function _renderQuantumMesh(rect, zData) {
    const gl      = MHQWebGL.getGL();
    const program = MHQWebGL.getProgram();
    if (!gl || !program || !glPosBuffer || !glAlphaBuffer) return;

    meshData     = MHQMeshBuilder.buildMeshVertices(rect, zData.stacking_context_depth);
    const near = window.MHQuantumConfig?.renderer?.z_near ?? -100;
    const far  = window.MHQuantumConfig?.renderer?.z_far  ?? 100;
    const matrix = MHQMeshBuilder.buildOrthoMatrix(
      canvas.width, canvas.height,
      near, far
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, glPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshData.positions, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, glAlphaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshData.alphas, gl.DYNAMIC_DRAW);
    const alphaLoc = gl.getAttribLocation(program, "a_alpha");
    gl.enableVertexAttribArray(alphaLoc);
    gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 0, 0);

    const matLoc  = gl.getUniformLocation(program, "u_matrix");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const zLoc    = gl.getUniformLocation(program, "u_z_depth");

    gl.uniformMatrix4fv(matLoc, false, matrix);
    gl.uniform1f(zLoc, zData.stacking_context_depth);

    function frame() {
      if (!meshData) return;

      const t = (performance.now() - startTime) / 1000;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLoc, t);
      gl.drawArrays(gl.LINES, 0, meshData.count);
      animRAF = requestAnimationFrame(frame);
    }
    frame();
  }

  // ── DOM Snapshot — Fix Bug #5 ──────────────────────────
  function _captureDOMSnapshot(el, rect) {
    if (!window.MHQuantumConfig?.analyzer?.collect_screenshot) return null;

    try {
      const children = Array.from(el.querySelectorAll("*"))
        .slice(0, 20)
        .map((child) => ({
          tag:        child.tagName.toLowerCase(),
          classes:    Array.from(child.classList),
          text:       child.textContent?.trim().slice(0, 60) || null,
          rect: (() => {
            const r = child.getBoundingClientRect();
            return { w: Math.round(r.width), h: Math.round(r.height) };
          })(),
        }));

      return {
        type: "dom_snapshot",
        note: "Screenshot replaced by DOM snapshot (no permission required)",
        selection_region: {
          width:  Math.round(rect.right  - rect.left),
          height: Math.round(rect.bottom - rect.top),
        },
        outer_html_preview: el.outerHTML.slice(0, 500),
        children_summary:   children,
        child_count:        el.querySelectorAll("*").length,
      };
    } catch (e) {
      console.warn("[MHQ Engine] DOM snapshot failed:", e.message);
      return null;
    }
  }

  // ── Helpers ────────────────────────────────────────────
  function _getSelectionRect() {
    return {
      left:   Math.min(startX, endX),
      top:    Math.min(startY, endY),
      right:  Math.max(startX, endX),
      bottom: Math.max(startY, endY),
    };
  }

  return { init, activate, deactivate };
})();

// ── Auto-init ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => MHQEngine.init());