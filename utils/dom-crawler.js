/**
 * MH-Quantum DOM Crawler
 * Extracts structured element data — no WebGL, no theater.
 */
(function () {
  'use strict';

  window.MHDomCrawler = {
    crawl(element) {
      if (!element || element === document.body || element === document.documentElement) return null;

      const computed = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const docRect = document.documentElement.getBoundingClientRect();

      return {
        identity: {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          classes: [...element.classList],
          selector: this.getUniqueSelector(element),
          xpath: this.getXPath(element),
          role: element.getAttribute('role') || null,
          ariaLabel: element.getAttribute('aria-label') || null
        },
        geometry: {
          x: Math.round(rect.left - docRect.left),
          y: Math.round(rect.top - docRect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          viewport: { x: Math.round(rect.left), y: Math.round(rect.top) }
        },
        stacking: {
          zIndex: computed.zIndex !== 'auto' ? Number.parseInt(computed.zIndex, 10) || 0 : 0,
          position: computed.position,
          display: computed.display,
          overflow: computed.overflow,
          depth: this.getStackingDepth(element)
        },
        styles: {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
          fontFamily: computed.fontFamily,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          padding: computed.padding,
          margin: computed.margin,
          border: computed.border,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
          opacity: computed.opacity,
          transform: computed.transform !== 'none' ? computed.transform : null,
          transition: computed.transition !== 'all 0s ease 0s' ? computed.transition : null,
          animation: computed.animation !== 'none 0s ease 0s 1 normal none running' ? computed.animation : null,
          flexbox: {
            display: computed.display === 'flex' || computed.display === 'inline-flex' ? computed.display : null,
            flexDirection: computed.flexDirection,
            justifyContent: computed.justifyContent,
            alignItems: computed.alignItems,
            gap: computed.gap
          },
          grid: {
            display: computed.display === 'grid' || computed.display === 'inline-grid' ? computed.display : null,
            gridTemplateColumns: computed.gridTemplateColumns,
            gridTemplateRows: computed.gridTemplateRows,
            gridArea: computed.gridArea
          }
        },
        inlineStyles: element.style.cssText || null,
        attributes: this.getAttributes(element),
        content: {
          textContent: element.textContent?.trim().slice(0, 200) || null,
          innerHTML: element.innerHTML?.slice(0, 500) || '',
          childCount: element.children.length,
          hasChildren: element.children.length > 0
        },
        animation: {
          hasAnimation: computed.animation !== 'none 0s ease 0s 1 normal none running',
          hasTransition: computed.transition !== 'all 0s ease 0s',
          isAnimating: this.isCurrentlyAnimating(element),
          keyframes: this.getActiveKeyframes(element)
        },
        parentContext: this.getParentContext(element),
        appliedRules: this.getAppliedRules(element),
        meta: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          pixelRatio: window.devicePixelRatio,
          userAgent: navigator.userAgent
        }
      };
    },

    cssEscape(value) {
      if (window.CSS && CSS.escape) return CSS.escape(value);
      return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    },

    getUniqueSelector(element) {
      if (element.id) return `#${this.cssEscape(element.id)}`;
      const parts = [];
      let current = element;

      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
          selector = `#${this.cssEscape(current.id)}`;
          parts.unshift(selector);
          break;
        }

        if (current.classList.length > 0) {
          selector += '.' + [...current.classList].map((c) => this.cssEscape(c)).join('.');
        }

        const parent = current.parentElement;
        const siblings = parent ? [...parent.children].filter((c) => c.tagName === current.tagName) : [];
        if (siblings.length > 1) {
          selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }

        parts.unshift(selector);
        current = parent;
      }

      return parts.join(' > ');
    },

    getXPath(element) {
      const parts = [];
      let current = element;

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let idx = 1;
        let sibling = current.previousSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) idx += 1;
          sibling = sibling.previousSibling;
        }
        parts.unshift(`${current.tagName.toLowerCase()}[${idx}]`);
        current = current.parentNode;
      }

      return '/' + parts.join('/');
    },

    getStackingDepth(element) {
      let depth = 0;
      let current = element.parentElement;
      while (current && current !== document.body) {
        const cs = window.getComputedStyle(current);
        if (cs.zIndex !== 'auto' || cs.position !== 'static') depth += 1;
        current = current.parentElement;
      }
      return depth;
    },

    getAttributes(element) {
      const attrs = {};
      for (const attr of element.attributes) {
        if (!['style', 'class', 'id'].includes(attr.name)) attrs[attr.name] = attr.value;
      }
      return attrs;
    },

    isCurrentlyAnimating(element) {
      const anims = element.getAnimations?.() || [];
      return anims.some((a) => a.playState === 'running');
    },

    getActiveKeyframes(element) {
      const anims = element.getAnimations?.() || [];
      return anims.map((a) => ({
        name: a.animationName || a.id || 'unknown',
        duration: a.effect?.getTiming?.().duration || 0,
        playState: a.playState,
        progress: a.effect?.getComputedTiming?.().progress?.toFixed?.(3) || null
      }));
    },

    getParentContext(element) {
      const parent = element.parentElement;
      if (!parent) return null;
      const pc = window.getComputedStyle(parent);
      return {
        tag: parent.tagName.toLowerCase(),
        id: parent.id || null,
        classes: [...parent.classList],
        display: pc.display,
        position: pc.position
      };
    },

    getAppliedRules(element) {
      const rules = [];
      try {
        for (const sheet of document.styleSheets) {
          let cssRules;
          try { cssRules = sheet.cssRules; } catch (_) { continue; }
          if (!cssRules) continue;
          for (const rule of cssRules) {
            if (rule.type !== CSSRule.STYLE_RULE || !rule.selectorText) continue;
            try {
              if (element.matches(rule.selectorText)) {
                rules.push({
                  selector: rule.selectorText,
                  styles: rule.style.cssText,
                  source: sheet.href || 'inline'
                });
              }
            } catch (_) { /* invalid selector */ }
          }
        }
      } catch (_) { /* cross-origin or stylesheet access failure */ }
      return rules.slice(0, 15);
    }
  };
})();
