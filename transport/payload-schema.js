// ============================================================
//  Payload Schema + Auto-Prompt Generator
//  "AI-Proof Context Package" — AI không còn lý do kháng cự
// ============================================================

const MHQPayloadSchema = (() => {

  function build(matrix4D, domContext, viewportCtx, intentText, visualArtifact) {
    const payload = {
      inspector_version: "MH-Quantum-v2.1",
      session_id:        crypto.randomUUID(),
      spatial_matrix_4D: matrix4D,
      bounding_box:      domContext.primary_element?.bounding_box || null,
      dom_context:       domContext,
      viewport_context:  viewportCtx,
      quantum_mesh_render: {
        artifact_type:      _artifactType(visualArtifact),
        screenshot_base64:  typeof visualArtifact === "string" ? visualArtifact : null,
        dom_snapshot:       visualArtifact?.type === "dom_snapshot" ? visualArtifact : null,
      },
      user_intent: intentText || "(không có)",
      auto_prompt: _generatePrompt(matrix4D, domContext, intentText),
      timestamp: new Date().toISOString(),
    };
    return payload;
  }

  function _artifactType(artifact) {
    if (typeof artifact === "string") return "screenshot_base64";
    return artifact?.type || null;
  }

  function _generatePrompt(matrix4D, domContext, intent) {
    const el    = domContext.primary_element;
    const lang  = window.MHQuantumConfig?.ai_prompt?.language || "vi";
    const count = domContext.element_count;

    if (lang === "vi") {
      return `
[MH-QUANTUM INSPECTOR — CONTEXT PACKAGE]

Tôi đang inspect element sau trên trang web:
- Thẻ/Selector: ${el?.css_selector || "N/A"}
- XPath: ${el?.xpath || "N/A"}
- Classes: ${el?.classes?.join(", ") || "none"}
- Vị trí (X/Y viewport): ${matrix4D.X.viewport_relative}px / ${matrix4D.Y.viewport_relative}px
- Kích thước: ${el?.bounding_box?.width}x${el?.bounding_box?.height}px
- Z stacking depth: ${matrix4D.Z.stacking_context_depth} | Z-index CSS: ${matrix4D.Z.css_z_index_declared}
${matrix4D.T ? `- Đang animate: YES | Timestamp: ${matrix4D.T.performance_now_ms}ms` : "- Trạng thái: TĨNH (không animate)"}
- Tổng elements trong vùng chọn: ${count}

Ý định của tôi: ${intent || "(chưa điền)"}

Hãy dựa vào toàn bộ context trên để trả lời chính xác, không hỏi lại.
`.trim();
    } else {
      return `
[MH-QUANTUM INSPECTOR — CONTEXT PACKAGE]

Inspecting element:
- Selector: ${el?.css_selector || "N/A"}
- XPath: ${el?.xpath || "N/A"}
- Position: X=${matrix4D.X.viewport_relative}px Y=${matrix4D.Y.viewport_relative}px
- Size: ${el?.bounding_box?.width}x${el?.bounding_box?.height}px
- Z-stack depth: ${matrix4D.Z.stacking_context_depth}
${matrix4D.T ? `- Animating: YES | T=${matrix4D.T.performance_now_ms}ms` : "- Static element"}
- Elements in region: ${count}

User intent: ${intent || "(none)"}

Answer based on full context above.
`.trim();
    }
  }

  return { build };
})();
