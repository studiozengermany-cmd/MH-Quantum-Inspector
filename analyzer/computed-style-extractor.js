// ============================================================
//  Computed Style Extractor
//  Lấy những style QUAN TRỌNG — không lấy tất cả (quá nặng)
// ============================================================

const MHQStyleExtractor = (() => {

  const IMPORTANT_PROPS = [
    "display","position","top","left","right","bottom",
    "width","height","margin","padding","flex","flexDirection",
    "alignItems","justifyContent","gridTemplateColumns",
    "transform","opacity","visibility","overflow",
    "backgroundColor","color","fontSize","fontWeight",
    "zIndex","boxShadow","border","borderRadius",
    "transition","transitionProperty","transitionDuration","transitionDelay",
    "animation","animationName","animationDuration","animationPlayState",
    "willChange",
  ];

  function _maxTimeMs(value) {
    if (!value || value === "none") return 0;
    return value.split(",").reduce((max, part) => {
      const v = part.trim();
      if (!v) return max;
      const n = parseFloat(v);
      if (Number.isNaN(n)) return max;
      const ms = v.endsWith("ms") ? n : n * 1000;
      return Math.max(max, ms);
    }, 0);
  }

  function extract(el) {
    const computed = getComputedStyle(el);
    const snapshot = {};
    IMPORTANT_PROPS.forEach((prop) => {
      snapshot[prop] = computed[prop] || null;
    });

    const animationDuration = _maxTimeMs(snapshot.animationDuration);
    const animationNames    = (snapshot.animationName || "none").split(",").map((v) => v.trim());
    const playStates        = (snapshot.animationPlayState || "running").split(",").map((v) => v.trim());

    // Active CSS animations only. Declared transitions are metadata, not proof of motion.
    const isAnimating =
      animationDuration > 0 &&
      animationNames.some((name) => name && name !== "none") &&
      playStates.some((state) => state !== "paused");

    const hasTransition =
      _maxTimeMs(snapshot.transitionDuration) > 0 &&
      snapshot.transitionProperty !== "none";

    return {
      properties:     snapshot,
      is_animating:   isAnimating,
      has_transition: hasTransition,
      current_transform: snapshot.transform,
    };
  }

  return { extract };
})();
