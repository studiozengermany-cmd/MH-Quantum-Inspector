/**
 * MH-Quantum Payload Schema
 * Validates + serializes inspector data.
 */
(function () {
  'use strict';

  window.MHPayloadSchema = {
    VERSION: '3.0.0',

    build(crawlData, intent = '', template = 'debug') {
      if (!crawlData) return null;
      return {
        schema_version: this.VERSION,
        session_id: this.generateSessionId(),
        template,
        intent,
        element: crawlData,
        generated_at: new Date().toISOString()
      };
    },

    serialize(payload) {
      return JSON.stringify(payload, null, 2);
    },

    validate(payload) {
      const required = ['schema_version', 'element', 'generated_at'];
      return !!payload && required.every((key) => key in payload) && !!payload.element?.identity?.selector;
    },

    compact(payload) {
      if (!payload?.element) return payload;
      const e = payload.element;
      return {
        ...payload,
        element: {
          identity: e.identity,
          geometry: e.geometry,
          stacking: e.stacking,
          styles: e.styles,
          inlineStyles: e.inlineStyles,
          attributes: e.attributes,
          content: { textContent: e.content?.textContent?.slice(0, 100) || null },
          animation: e.animation,
          parentContext: e.parentContext,
          appliedRules: e.appliedRules?.slice(0, 5) || [],
          meta: e.meta
        }
      };
    },

    generateSessionId() {
      try {
        const uuid = globalThis?.crypto?.randomUUID?.();
        if (uuid) return uuid;
      } catch (_) {
        // ignore and fallback
      }

      const now = Date.now().toString(16);
      const perf = Math.floor((globalThis?.performance?.now?.() || 0) * 1000000).toString(16);
      const base = `${now}${perf}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
      let idx = 0;

      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const a = parseInt(base[idx % base.length] || '0', 16);
        const b = Math.floor(Math.random() * 16);
        const seed = (a ^ b) & 0xf;
        idx += 1;
        const v = c === 'x' ? seed : ((seed & 0x3) | 0x8);
        return v.toString(16);
      });
    }
  };
})();
