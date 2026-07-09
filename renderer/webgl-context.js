// ============================================================
//  WebGL Context Manager
//  Khởi tạo, compile shader, fallback nếu WebGL không available
// ============================================================

const MHQWebGL = (() => {
  let gl = null;
  let program = null;

  function init(canvas) {
    if (gl) return true;

    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
      });
      if (!gl) throw new Error("WebGL not supported");

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      return true;
    } catch (e) {
      console.warn("[MHQ] WebGL unavailable:", e.message);
      gl = null;
      return false;
    }
  }

  function compileShader(src, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("[MHQ Shader Error]", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function buildProgram(vertSrc, fragSrc) {
    if (!gl) return false;
    if (program) {
      gl.useProgram(program);
      return true;
    }

    const vert = compileShader(vertSrc, gl.VERTEX_SHADER);
    const frag = compileShader(fragSrc, gl.FRAGMENT_SHADER);
    if (!vert || !frag) {
      if (vert) gl.deleteShader(vert);
      if (frag) gl.deleteShader(frag);
      return false;
    }

    const nextProgram = gl.createProgram();
    gl.attachShader(nextProgram, vert);
    gl.attachShader(nextProgram, frag);
    gl.linkProgram(nextProgram);

    gl.detachShader(nextProgram, vert);
    gl.detachShader(nextProgram, frag);
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
      console.error("[MHQ Program Error]", gl.getProgramInfoLog(nextProgram));
      gl.deleteProgram(nextProgram);
      program = null;
      return false;
    }

    program = nextProgram;
    gl.useProgram(program);
    return true;
  }

  function destroyProgram() {
    if (gl && program) {
      gl.deleteProgram(program);
      program = null;
    }
  }

  function getGL()      { return gl; }
  function getProgram() { return program; }

  function resize(canvas) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  return { init, buildProgram, destroyProgram, getGL, getProgram, resize };
})();
