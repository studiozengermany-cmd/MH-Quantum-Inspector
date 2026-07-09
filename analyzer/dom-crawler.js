// ============================================================
//  MH-QUANTUM — dom-crawler.js (PATCHED v2.1)
//  BUG FIX:
//  [#7] elementFromPoint bị overlay chặn → tạm disable pointer-events
//  [#8] XPath sai với root element → fix loop condition + undefined tag
// ============================================================

const MHQDomCrawler = (() => {

  function cssEscape(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
  }

  function getOverlayElement() {
    return document.getElementById("mhq-overlay")
      || document.querySelector("#mhq-shadow-host")?.shadowRoot?.getElementById("mhq-overlay")
      || null;
  }

  function rectsOverlap(r1, r2) {
    return !(
      r1.right  < r2.left  ||
      r1.left   > r2.right ||
      r1.bottom < r2.top   ||
      r1.top    > r2.bottom
    );
  }

  // ── [PATCHED] elementFromPoint — Fix Bug #7 ─────────────
  // Tạm tắt pointer-events của overlay để "nhìn xuyên" qua nó
  function getElementAtPoint(x, y) {
    const overlay = getOverlayElement();
    const oldPointerEvents = overlay?.style.pointerEvents || "";

    // Disable overlay temporarily
    if (overlay) overlay.style.pointerEvents = "none";

    let el = null;
    try {
      el = document.elementFromPoint(x, y);
    } finally {
      if (overlay) overlay.style.pointerEvents = oldPointerEvents;
    }

    // Fallback nếu vẫn không tìm được element thật
    if (!el || el === overlay || el === document.body) {
      return document.body;
    }
    return el;
  }

  // ── CSS Selector builder ─────────────────────────────────
  function getSelector(el) {
    const parts = [];
    let node     = el;

    while (node && node.nodeType === 1 && node !== document.documentElement) {
      let seg = node.tagName.toLowerCase();
      if (node.id) {
        seg += `#${cssEscape(node.id)}`;
        parts.unshift(seg);
        break; // ID unique → stop here
      } else if (node.className) {
        const cls = Array.from(node.classList).slice(0, 3).map((c) => cssEscape(c)).join(".");
        if (cls) seg += `.${cls}`;
      }
      parts.unshift(seg);
      let parent = node.parentElement;
      if (!parent && node.parentNode && node.parentNode instanceof ShadowRoot) {
        parent = node.parentNode.host;
      }
      node = parent;
    }

    return parts.join(" > ") || el.tagName.toLowerCase();
  }

  // ── [PATCHED] XPath builder — Fix Bug #8 ─────────────────
  // Bug gốc: parentNode có thể là Document (nodeType=9)
  //          → node.tagName = undefined → "/undefined[1]/..."
  // Fix: loop CHỈ khi nodeType === 1 (Element)
  //      và dừng trước document.documentElement
  function getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;

    const parts = [];
    let node     = el;

    while (node && node.nodeType === 1) {
      // [FIX] Dừng khi đến <html> element
      if (node === document.documentElement) {
        parts.unshift("html");
        break;
      }

      const tag = node.tagName.toLowerCase();
      let idx   = 1;
      let sib   = node.previousSibling;

      while (sib) {
        if (
          sib.nodeType === 1 &&
          sib.tagName.toLowerCase() === tag  // [FIX] lowercase compare
        ) {
          idx++;
        }
        sib = sib.previousSibling;
      }

      parts.unshift(`${tag}[${idx}]`);

      // [FIX] parentElement thay vì parentNode → luôn trả về Element hoặc null
      node = node.parentElement;
    }

    return "/" + parts.join("/");
  }

  // ── Element description ──────────────────────────────────
  function describeElement(el) {
    if (!el || el.nodeType !== 1) return null;

    const rect    = el.getBoundingClientRect();
    const zData   = MHQStackingResolver.analyze(el);
    const styles  = MHQStyleExtractor.extract(el);

    return {
      tag:          el.tagName.toLowerCase(),
      id:           el.id   || null,
      classes:      Array.from(el.classList),
      css_selector: getSelector(el),
      xpath:        getXPath(el),
      bounding_box: {
        top:    Math.round(rect.top),
        left:   Math.round(rect.left),
        bottom: Math.round(rect.bottom),
        right:  Math.round(rect.right),
        width:  Math.round(rect.width),
        height: Math.round(rect.height),
      },
      z_analysis:     zData,
      computed_styles: styles.properties,
      is_animating:   styles.is_animating,
      text_content:   el.textContent?.trim().slice(0, 80) || null,
    };
  }

  // ── Find elements in region ──────────────────────────────
  function getAllElementsDeep(root = document) {
    const out = [];
    const visitedShadowRoots = new WeakSet();

    function walk(nodeRoot) {
      if (!nodeRoot || !nodeRoot.querySelectorAll) return;
      const nodeList = nodeRoot.querySelectorAll("*");
      for (const el of nodeList) {
        out.push(el);
        const sr = el.shadowRoot;
        if (sr && !visitedShadowRoots.has(sr)) {
          visitedShadowRoots.add(sr);
          walk(sr);
        }
      }
    }

    walk(root);
    return out;
  }

  function findElementsInRegion(selectionRect) {
    const all     = getAllElementsDeep(document);
    const results = [];
    const limit   = window.MHQuantumConfig?.analyzer?.max_elements_in_region || 50;

    for (const el of all) {
      // Skip tool's own elements
      if (
        el.closest("#mhq-overlay") ||
        el.closest("#mhq-panel")   ||
        el.closest("#mhq-toast")
      ) continue;

      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      if (rectsOverlap(r, selectionRect)) {
        const desc = describeElement(el);
        if (desc) results.push(desc);
        if (results.length >= limit) break;
      }
    }

    // Sort: nổi nhất (z-depth cao) lên trước
    results.sort(
      (a, b) =>
        b.z_analysis.stacking_context_depth -
        a.z_analysis.stacking_context_depth
    );

    return results;
  }

  return {
    findElementsInRegion,
    describeElement,
    getElementAtPoint,  // [NEW] exported để quantum-engine.js dùng
    getSelector,
    getXPath,
  };
})();
