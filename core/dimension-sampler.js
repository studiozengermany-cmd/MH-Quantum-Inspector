// ============================================================
//  Dimension Sampler
//  Thu thập vector 4D: X, Y, Z, T
// ============================================================

const MHQDimensionSampler = (() => {

  function sample(el, mouseX, mouseY) {
    const rect      = el.getBoundingClientRect();
    const zAnalysis = MHQStackingResolver.analyze(el);
    const tAxis     = MHQTemporalObserver.captureT(el);  // null nếu không animate
    const styles    = MHQStyleExtractor.extract(el);
    const dpr       = window.devicePixelRatio || 1;

    return {
      X: {
        viewport_relative:   Math.round(rect.left),
        absolute_with_scroll: Math.round(rect.left + window.scrollX),
        normalized_0to1:     parseFloat((rect.left / window.innerWidth).toFixed(4)),
        mouse_x:             Math.round(mouseX),
      },
      Y: {
        viewport_relative:   Math.round(rect.top),
        absolute_with_scroll: Math.round(rect.top + window.scrollY),
        normalized_0to1:     parseFloat((rect.top / window.innerHeight).toFixed(4)),
        mouse_y:             Math.round(mouseY),
      },
      Z: zAnalysis,
      T: tAxis,  // null nếu element tĩnh — adaptive dimension
    };
  }

  return { sample };
})();
