// ============================================================
//  MH-QUANTUM — quantum-mesh-builder.js (PATCHED v2.1)
//  BUG FIX:
//  [#3] Z-Clipping — ortho matrix now includes near/far plane
// ============================================================

const MHQMeshBuilder = (() => {

  function buildMeshVertices(rect, zDepth, segments = 12) {
    const { left, top, right, bottom } = rect;
    const verts  = [];
    const alphas = [];

    const W      = right  - left;
    const H      = bottom - top;
    const zScale = Math.min(zDepth * 4, 40); // max 40, safe với near=-100 far=100

    function pushVertex(x, y, z, alpha) {
      verts.push(x, y, z);
      alphas.push(alpha);
    }

    function pushLine(x1, y1, z1, x2, y2, z2, alpha) {
      pushVertex(x1, y1, z1, alpha);
      pushVertex(x2, y2, z2, alpha);
    }

    // ── Perimeter edges — explicit pairs for gl.LINES ─────────
    const perimeter = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      perimeter.push([left + t * W, top, zScale * Math.sin(t * Math.PI)]);
    }
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      perimeter.push([right, top + t * H, zScale * Math.sin(t * Math.PI)]);
    }
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      perimeter.push([right - t * W, bottom, zScale * Math.sin(t * Math.PI)]);
    }
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      perimeter.push([left, bottom - t * H, zScale * Math.sin(t * Math.PI)]);
    }
    perimeter.push(perimeter[0]);

    for (let i = 0; i < perimeter.length - 1; i++) {
      const a = perimeter[i];
      const b = perimeter[i + 1];
      pushLine(a[0], a[1], a[2], b[0], b[1], b[2], 0.9);
    }

    // ── Internal grid ────────────────────────────────────
    const gridX = 4, gridY = 4;
    for (let i = 1; i < gridX; i++) {
      const x = left + (W / gridX) * i;
      pushLine(x, top, 0, x, bottom, 0, 0.25);
    }
    for (let i = 1; i < gridY; i++) {
      const y = top + (H / gridY) * i;
      pushLine(left, y, 0, right, y, 0, 0.25);
    }

    // ── Corner markers ───────────────────────────────────
    const corners = [
      [left,  top],
      [right, top],
      [right, bottom],
      [left,  bottom],
    ];
    const csz = 12;
    corners.forEach(([x, y]) => {
      pushLine(x - csz, y, zScale, x + csz, y, zScale, 1.0);
      pushLine(x, y - csz, zScale, x, y + csz, zScale, 1.0);
    });

    return {
      positions: new Float32Array(verts),
      alphas:    new Float32Array(alphas),
      count:     verts.length / 3,
    };
  }

  // ── [PATCHED] Orthographic matrix — Fix Bug #3 ──────────
  // Thêm near/far plane để normalize Z về [-1, 1]
  // near = -100, far = 100 → safe với zScale max = 40
  // Ma trận column-major (WebGL convention):
  //
  //  [ 2/w,       0,          0,          0 ]
  //  [ 0,        -2/h,        0,          0 ]
  //  [ 0,         0,         -2/depth,    0 ]
  //  [ -1,        1,         -(f+n)/depth, 1 ]
  //
  function buildOrthoMatrix(w, h, near = -100, far = 100) {
    const depth = far - near;

    return new Float32Array([
      2 / w,            0,              0,                    0,
          0,       -2 / h,              0,                    0,
          0,            0,      -2 / depth,                   0,
         -1,            1, -(far + near) / depth,             1,
    ]);
  }

  return { buildMeshVertices, buildOrthoMatrix };
})();
