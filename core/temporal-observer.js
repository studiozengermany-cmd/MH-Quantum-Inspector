// ============================================================
//  MH-QUANTUM — temporal-observer.js (BẢN VÁ v2.1)
//  SỬA LỖI:
//  [#6] Điểm mù trục T (T-axis blindspot) — tự động phát hiện hoạt ảnh chạy bằng JS
//       (GSAP, Framer Motion, Web Animations API, RAF inline)
// ============================================================

const MHQTemporalObserver = (() => {

  let rafId    = null;
  let frameIdx = 0;

  // MutationObserver theo dõi inline style changes (GSAP/Framer)
  let mutationObserver = null;
  let attachRetryTimer = null;
  const recentlyMutated = new WeakSet();
  const pendingTimers = new Set();

  function clearPendingTimers() {
    pendingTimers.forEach((timer) => clearTimeout(timer));
    pendingTimers.clear();
    if (attachRetryTimer) {
      clearTimeout(attachRetryTimer);
      attachRetryTimer = null;
    }
  }

  function start() {
    if (rafId || mutationObserver) return;
    clearPendingTimers();

    frameIdx = 0;

    // RAF counter
    function tick() {
      frameIdx++;
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // MutationObserver để nhận diện hoạt ảnh chạy bằng JS (JS-driven animation)
    // Khi GSAP/Framer thay đổi thuộc tính style/class → đánh dấu element đang chuyển động
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (
          m.type === "attributes" &&
          (m.attributeName === "style" || m.attributeName === "class")
        ) {
          recentlyMutated.add(m.target);
          // Clear flag sau 200ms
          const t = setTimeout(() => {
            recentlyMutated.delete(m.target);
            pendingTimers.delete(t);
          }, 200);
          pendingTimers.add(t);
        }
      });
    });

    const attachObserver = (attempt = 0) => {
      if (!mutationObserver) return;
      if (document.body) {
        mutationObserver.observe(document.body, {
          attributes: true,
          subtree: true,
          attributeFilter: ["style", "class"],
        });
        return;
      }
      if (attempt < 10) {
        attachRetryTimer = setTimeout(() => attachObserver(attempt + 1), 50);
      }
    };

    attachObserver();

    console.log("[MHQ Temporal] ✅ Bộ giám sát thời gian đã kích hoạt (Đang quét chuyển động CSS + JS)");
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    clearPendingTimers();
    frameIdx = 0;
  }

  // ── [BẢN VÁ] captureT — Khắc phục lỗi #6 ─────────────────────
  function captureT(el) {
    const styleInfo = MHQStyleExtractor.extract(el);

    // Phương pháp 1: Chỉ tính hoạt ảnh CSS đang hoạt động. Các transition khai báo sẵn nhưng không chạy sẽ coi là tĩnh.
    const hasCSSAnimation = styleInfo.is_animating;

    // Phương pháp 2: Web Animations API (CSS transitions, Framer Motion, anime.js...)
    let hasWebAnimation = false;
    let webAnimationDetails = null;
    if (typeof el.getAnimations === "function") {
      const runningAnims = el.getAnimations().filter(
        (a) => a.playState === "running" || a.playState === "pending"
      );
      if (runningAnims.length > 0) {
        hasWebAnimation = true;
        webAnimationDetails = runningAnims.map((a) => ({
          type:       a.constructor.name,
          playState:  a.playState,
          currentTime: a.currentTime,
        }));
      }
    }

    // Phương pháp 3: MutationObserver — Theo dõi thay đổi inline style bằng JS (GSAP, RAF)
    const hasJSAnimation = recentlyMutated.has(el);

    // ── Tổng hợp kết quả ──
    const isActuallyAnimating = hasCSSAnimation || hasWebAnimation || hasJSAnimation;

    // Tự động thích ứng: trả về null nếu phần tử THỰC SỰ tĩnh (không chuyển động)
    if (!isActuallyAnimating) return null;

    const computedTransform = getComputedStyle(el).transform;
    const computedOpacity   = parseFloat(getComputedStyle(el).opacity);

    return {
      performance_now_ms:    parseFloat(performance.now().toFixed(3)),
      iso_timestamp:         new Date().toISOString(),
      animation_frame_index: frameIdx,
      detection_method: {
        css_animation:       hasCSSAnimation,
        web_animations_api:  hasWebAnimation,
        js_driven_mutation:  hasJSAnimation,
      },
      web_animation_details: webAnimationDetails,
      element_state_at_T: {
        is_animating:      true,
        current_transform: computedTransform,
        opacity:           computedOpacity,
        inline_style:      el.getAttribute("style") || null,
      },
    };
  }

  return { start, stop, captureT };
})();
