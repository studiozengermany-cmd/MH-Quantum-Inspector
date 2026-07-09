// ============================================================
//  HUD Overlay — Canvas 2D vẽ labels, thông số đè lên WebGL
// ============================================================

const MHQHud = (() => {

  let ctx2d = null;
  let hudCanvas = null;

  function init() {
    hudCanvas = document.createElement("canvas");
    hudCanvas.id = "mhq-hud";
    hudCanvas.style.cssText = `
      position:absolute; inset:0;
      width:100%; height:100%;
      pointer-events:none;
    `;
    ctx2d = hudCanvas.getContext("2d");
    return hudCanvas;
  }

  function resize() {
    if (!hudCanvas) return;
    hudCanvas.width  = window.innerWidth;
    hudCanvas.height = window.innerHeight;
  }

  function clear() {
    if (ctx2d) ctx2d.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
  }

  function drawDimensionLabels(matrix4D, rect) {
    if (!ctx2d) return;
    const { X, Y, Z, T } = matrix4D;
    const { left, top, right, bottom } = rect;

    ctx2d.font         = "11px 'Courier New', monospace";
    ctx2d.fillStyle    = "#00FFAA";
    ctx2d.shadowColor  = "#00FFAA";
    ctx2d.shadowBlur   = 8;

    const lines = [
      `X: ${X.viewport_relative} | Y: ${Y.viewport_relative}`,
      `Z-stack: ${Z.stacking_context_depth} | paint#${Z.resolved_paint_order}`,
      T ? `T: ${T.performance_now_ms.toFixed(2)}ms` : null,
    ].filter(Boolean);

    const px = left;
    const py = top - 8 - (lines.length * 15);

    lines.forEach((line, i) => {
      ctx2d.fillText(line, px, py + i * 15);
    });

    // Corner brackets
    ctx2d.strokeStyle = "#00FFAA";
    ctx2d.lineWidth   = 1.5;
    ctx2d.shadowBlur  = 6;
    const b = 10;
    [
      [left,  top,    b,  b],
      [right, top,   -b,  b],
      [right, bottom,-b, -b],
      [left,  bottom, b, -b],
    ].forEach(([x, y, dx, dy]) => {
      ctx2d.beginPath();
      ctx2d.moveTo(x + dx, y);
      ctx2d.lineTo(x, y);
      ctx2d.lineTo(x, y + dy);
      ctx2d.stroke();
    });

    ctx2d.shadowBlur = 0;
  }

  return { init, resize, clear, drawDimensionLabels };
})();
