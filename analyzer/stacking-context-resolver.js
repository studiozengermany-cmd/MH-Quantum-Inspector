// ============================================================
//  Stacking Context Resolver
//  Giải mã Z thực sự — không phải chỉ đọc css z-index
// ============================================================

const MHQStackingResolver = (() => {

  function _tokens(value) {
    return String(value || "").split(/[\s,]+/).filter(Boolean);
  }

  function _hasAnyToken(value, list) {
    const tokens = _tokens(value);
    return list.some((item) => tokens.includes(item));
  }

  function _isNone(value) {
    return !value || value === "none" || value === "normal";
  }

  // Kiểm tra element có tạo stacking context không
  function getStackingContextReasons(el) {
    const s = getComputedStyle(el);
    const parentDisplay = el.parentElement ? getComputedStyle(el.parentElement).display : "";
    const isFlexOrGridItem = /flex|grid/.test(parentDisplay);
    const reasons = [];

    if (el === document.documentElement) reasons.push("root");
    if (s.position === "fixed") reasons.push("position:fixed");
    if (s.position === "sticky") reasons.push("position:sticky");
    if (s.position !== "static" && s.zIndex !== "auto") reasons.push("positioned-z-index");
    if (isFlexOrGridItem && s.zIndex !== "auto") reasons.push("flex-grid-z-index");
    if (parseFloat(s.opacity) < 1) reasons.push("opacity");
    if (!_isNone(s.transform)) reasons.push("transform");
    if (!_isNone(s.scale)) reasons.push("scale");
    if (!_isNone(s.rotate)) reasons.push("rotate");
    if (!_isNone(s.translate)) reasons.push("translate");
    if (!_isNone(s.filter)) reasons.push("filter");
    if (!_isNone(s.backdropFilter || s.webkitBackdropFilter)) reasons.push("backdrop-filter");
    if (!_isNone(s.perspective)) reasons.push("perspective");
    if (!_isNone(s.clipPath)) reasons.push("clip-path");
    if (!_isNone(s.maskImage || s.webkitMaskImage)) reasons.push("mask");
    if (s.isolation === "isolate") reasons.push("isolation");
    if (s.mixBlendMode !== "normal") reasons.push("mix-blend-mode");
    if (_hasAnyToken(s.contain, ["layout", "paint", "strict", "content"])) reasons.push("contain");
    if (s.containerType === "size" || s.containerType === "inline-size") reasons.push("container-type");
    if (_hasAnyToken(s.willChange, [
      "transform", "opacity", "filter", "backdrop-filter", "perspective",
      "clip-path", "mask", "left", "top", "contents"
    ])) reasons.push("will-change");

    return reasons;
  }

  function createsStackingContext(el) {
    return getStackingContextReasons(el).length > 0;
  }

  // Đếm bao nhiêu stacking context lồng nhau từ el lên root
  function resolveDepth(el) {
    let depth = 0;
    let node  = el.parentElement;
    while (node && node !== document.documentElement) {
      if (createsStackingContext(node)) depth++;
      node = node.parentElement;
    }
    return depth;
  }

  // Lấy z-index declared
  function getDeclaredZ(el) {
    const s   = getComputedStyle(el);
    const raw = parseInt(s.zIndex, 10);
    return isNaN(raw) ? 0 : raw;
  }

  // Paint order tương đối trong parent
  function resolvePaintOrder(el) {
    const siblings = Array.from(el.parentElement?.children || []);
    return siblings.indexOf(el);
  }

  function analyze(el) {
    const depth = resolveDepth(el);
    return {
      css_z_index_declared:      getDeclaredZ(el),
      creates_stacking_context:  createsStackingContext(el),
      stacking_context_reasons:  getStackingContextReasons(el),
      stacking_context_depth:    depth,
      resolved_paint_order:      resolvePaintOrder(el),
      webgl_z_normalized:        Math.min(depth / 10, 1.0),
    };
  }

  return { analyze, resolveDepth, createsStackingContext };
})();
