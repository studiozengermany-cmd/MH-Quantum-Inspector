
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * MH-Quantum Inspector — Content Script (Light Theme / Agency Level)
 */
(function () {
  'use strict';

  const STATE = {
    active: false,
    hoveredEl: null,
    lastPayload: null,
    overlay: null,
    tooltip: null,
    contextMenu: null,
    isDragging: false
  };

  let shadowRoot = null;

  function initShadowHost() {
    const host = document.createElement('div');
    host.id = 'mhq-shadow-host';
    host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;';
    
    // Antigravity Rule: Prevent Google Translate from messing up our injected UI
    host.setAttribute('translate', 'no');
    
    shadowRoot = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      /* MH-Quantum Awwwards-Tier Styles */
      :host {
        --color-bg-body: #F4F2EC;
        --color-bg-popup: #FDFBF7;
        --color-surface: #FFFFFF;
        --color-text-main: #0F1115;
        --color-text-muted: #6B7280;
        --color-border: rgba(15, 17, 21, 0.04);
        --color-accent: #2563EB;
        --font-ui: 'Geist', sans-serif;
        --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
        --spring: cubic-bezier(0.32, 0.72, 0, 1);
      }
      * { box-sizing: border-box; }

      #mhq-overlay {
        position: fixed !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        border: 2px solid var(--color-accent) !important;
        background: rgba(37, 99, 235, 0.05) !important;
        border-radius: 8px !important;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.5), inset 0 0 0 1px rgba(255,255,255,0.5) !important;
        display: none;
        transition: transform 0.3s var(--spring), width 0.3s var(--spring), height 0.3s var(--spring) !important;
      }
      .mhq-corner { display: none !important; }

      #mhq-tooltip, #mhq-toast {
        position: fixed !important;
        z-index: 2147483647 !important;
        background: var(--color-text-main) !important;
        color: #FFFFFF !important;
        font-family: var(--font-ui) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        padding: 6px 12px !important;
        border-radius: 9999px !important;
        box-shadow: 0 12px 24px -8px rgba(15,17,21,0.4) !important;
        pointer-events: none !important;
      }
      #mhq-tooltip { display: none; }
      #mhq-toast { bottom: 24px !important; right: 24px !important; font-size: 13px !important; padding: 10px 16px !important; }

      /* Double Bezel Context Menu */
      #mhq-context-menu {
        position: fixed !important;
        z-index: 2147483647 !important;
        width: 360px !important;
        background: var(--color-bg-popup) !important;
        border: 1px solid rgba(15, 17, 21, 0.04) !important;
        border-radius: 32px !important;
        box-shadow: 0 40px 100px -20px rgba(15, 17, 21, 0.15), inset 0 1px 1px rgba(255,255,255,1) !important;
        display: flex !important;
        flex-direction: column !important;
        font-family: var(--font-ui) !important;
        color: var(--color-text-main) !important;
        overflow: hidden !important;
        pointer-events: auto !important;
        animation: mhq-reveal 0.6s var(--spring) forwards !important;
        padding: 8px !important;
      }

      @keyframes mhq-reveal {
        0% { transform: scale(0.96) translateY(16px); opacity: 0; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }

      .mhq-inner-core {
        background: var(--color-surface) !important;
        border-radius: 24px !important;
        box-shadow: inset 0 1px 1px rgba(255,255,255,1), 0 4px 12px -4px rgba(0,0,0,0.03) !important;
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
      }

      .mhq-menu-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px 20px 8px 20px !important;
        cursor: grab !important;
        user-select: none !important;
      }
      .mhq-menu-header:active { cursor: grabbing !important; }

      .mhq-brand {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
      .mhq-logo-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: var(--color-accent);
        box-shadow: 0 0 12px rgba(37,99,235,0.6);
      }
      .mhq-brand-text {
        font-family: 'Playfair Display', serif !important;
        font-weight: 600 !important;
        font-size: 16px !important;
        letter-spacing: -0.02em !important;
        color: var(--color-text-main) !important;
      }

      .mhq-menu-close {
        background: rgba(0,0,0,0.03) !important;
        border: none !important;
        color: var(--color-text-muted) !important;
        cursor: pointer !important;
        width: 28px !important; height: 28px !important;
        border-radius: 50% !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        transition: all 0.3s ease !important;
      }
      .mhq-menu-close:hover {
        background: rgba(0,0,0,0.06) !important;
        color: var(--color-text-main) !important;
      }

      .mhq-tabs {
        display: flex !important;
        padding: 0 12px !important;
        gap: 4px !important;
        margin-bottom: 8px !important;
      }
      .mhq-tab {
        padding: 6px 12px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        color: var(--color-text-muted) !important;
        cursor: pointer !important;
        border-radius: 9999px !important;
        transition: all 0.3s var(--spring) !important;
      }
      .mhq-tab:hover { color: var(--color-text-main) !important; background: rgba(0,0,0,0.02) !important; }
      .mhq-tab.active {
        color: var(--color-text-main) !important;
        background: rgba(15, 17, 21, 0.04) !important;
      }

      .mhq-content {
        padding: 12px 20px 20px 20px !important;
        flex: 1 !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
      }

      .mhq-section-title {
        font-size: 9px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.25em !important;
        color: #9CA3AF !important;
        margin-bottom: 8px !important;
      }

      .mhq-input-box {
        background: #F9FAFB !important;
        border: 1px solid #F3F4F6 !important;
        border-radius: 12px !important;
        padding: 12px 16px !important;
        font-family: var(--font-mono) !important;
        font-size: 11px !important;
        color: var(--color-text-main) !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        word-break: break-all !important;
      }

      .mhq-style-row {
        display: flex !important;
        align-items: flex-start !important;
        gap: 8px !important;
        font-family: var(--font-mono) !important;
        font-size: 11px !important;
        margin-bottom: 8px !important;
        padding: 6px 12px !important;
        background: #F9FAFB !important;
        border-radius: 8px !important;
      }
      .mhq-style-key { color: var(--color-text-muted) !important; width: 100px !important; flex-shrink: 0 !important; }
      .mhq-style-val { color: var(--color-text-main) !important; font-weight: 500 !important; }

      .mhq-btn {
        width: 100% !important;
        padding: 6px 6px 6px 20px !important;
        border-radius: 9999px !important;
        background: var(--color-text-main) !important;
        color: #FFFFFF !important;
        font-family: var(--font-ui) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        box-shadow: 0 12px 24px -8px rgba(15,17,21,0.4) !important;
        transition: all 0.7s var(--spring) !important;
      }
      .mhq-btn:hover { box-shadow: 0 16px 32px -8px rgba(15,17,21,0.5) !important; }
      .mhq-btn:active { transform: scale(0.96) translateY(2px) !important; }
      
      .mhq-btn-icon {
        width: 32px !important; height: 32px !important;
        border-radius: 50% !important;
        background: rgba(255,255,255,0.1) !important;
        border: 1px solid rgba(255,255,255,0.05) !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        transition: all 0.7s var(--spring) !important;
      }
      .mhq-btn:hover .mhq-btn-icon { transform: translate(4px, -1px) scale(1.05) !important; background: rgba(255,255,255,0.2) !important; }

      .mhq-textarea {
        width: 100% !important;
        background: #F9FAFB !important;
        border: 1px solid #F3F4F6 !important;
        border-radius: 12px !important;
        padding: 12px 16px !important;
        font-family: var(--font-mono) !important;
        font-size: 11px !important;
        color: var(--color-text-main) !important;
        resize: vertical !important;
        min-height: 120px !important;
        outline: none !important;
      }
      .mhq-textarea:focus { border-color: rgba(15,17,21,0.1) !important; }
    `;
    shadowRoot.appendChild(style);
    document.documentElement.appendChild(host);
  }

  function init() {
    initShadowHost();
    createOverlay();
    createTooltip();
    bindMessages();
  }

  function createOverlay() {
    STATE.overlay = document.createElement('div');
    STATE.overlay.id = 'mhq-overlay';
    
    // Add 4 corner handles
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const corner = document.createElement('div');
      corner.className = `mhq-corner mhq-corner-${pos}`;
      STATE.overlay.appendChild(corner);
    });

    shadowRoot.appendChild(STATE.overlay);
  }

  function createTooltip() {
    STATE.tooltip = document.createElement('div');
    STATE.tooltip.id = 'mhq-tooltip';
    shadowRoot.appendChild(STATE.tooltip);
  }

  function isOwnUI(el) {
    if (!el) return false;
    if (el.id === 'mhq-shadow-host') return true;
    const root = el.getRootNode?.();
    if (shadowRoot && root === shadowRoot) return true;
    if (root && root !== document && root.host?.id === 'mhq-shadow-host') return true;
    if (shadowRoot?.contains?.(el)) return true;
    return !!el.closest?.('#mhq-shadow-host, #mhq-overlay, #mhq-tooltip, #mhq-context-menu, #mhq-toast');
  }

  function isContextValid() {
    try {
      if (!chrome?.runtime?.id || typeof chrome.runtime.sendMessage !== 'function') {
        deactivate();
        return false;
      }
      return true;
    } catch (_) {
      deactivate();
      return false;
    }
  }

  function highlightElement(el) {
    if (!el || el === document.documentElement || el === document.body || isOwnUI(el) || STATE.isDragging) return;
    const rect = el.getBoundingClientRect();

    Object.assign(STATE.overlay.style, {
      display: 'block',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });

    const selector = (window.MHDomCrawler?.getUniqueSelector?.(el))
      || (window.MHDomCrawler?.getSelector?.(el))
      || el.tagName?.toLowerCase?.()
      || 'unknown';
    const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    STATE.tooltip.textContent = `${escapeHTML(selector)}  ${dims}px`;

    const ttTop = rect.top > 30 ? rect.top - 28 : rect.bottom + 4;
    STATE.tooltip.style.top = `${Math.max(8, ttTop)}px`;
    STATE.tooltip.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 20))}px`;
    STATE.tooltip.style.display = 'block';
  }

  function clearHighlight() {
    STATE.overlay.style.display = 'none';
    STATE.tooltip.style.display = 'none';
  }

  function activate() {
    if (STATE.active) return;
    STATE.active = true;
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('scroll', clearHighlight, true);
    document.documentElement.style.cursor = 'crosshair';
    showToast('MH-Quantum Inspector is active.', 'info');
  }

  function deactivate() {
    if (!STATE.active) return;
    STATE.active = false;
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('scroll', clearHighlight, true);
    document.documentElement.style.cursor = '';
    clearHighlight();
    removeContextMenu();
  }

  function onMouseOver(e) {
    if (!isContextValid()) return;
    if (isOwnUI(e.target)) return;
    STATE.hoveredEl = e.target;
    highlightElement(e.target);
  }

  function onMouseOut() {
    clearHighlight();
  }

  function onClick(e) {
    if (!isContextValid()) return;
    if (isOwnUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    if (!el || el === document.documentElement) return;

    const crawlData = window.MHDomCrawler.crawl(el);
    if (!crawlData) return;

    const payload = window.MHPayloadSchema.build(crawlData, '', 'debug');
    STATE.lastPayload = payload;

    chrome.runtime.sendMessage({
      type: 'STORE_PAYLOAD',
      payload: window.MHPayloadSchema.compact(payload)
    });

    showContextMenu(e.clientX, e.clientY, payload, el.getBoundingClientRect());
    clearHighlight();
  }

  function onKeyDown(e) {
    if (!isContextValid()) return;
    if (e.key === 'Escape') deactivate();
  }

  function showContextMenu(x, y, payload, rect) {
    removeContextMenu();

    const menu = document.createElement('div');
    menu.id = 'mhq-context-menu';
    const el = payload.element.identity;
    const selector = el.selector;
    const styles = payload.element.styles || {};
    
    // Generate Prompt Content
    const promptContent = window.MHPromptGenerator ? window.MHPromptGenerator.generate(payload.element, '', 'debug') : 'Prompt generator not loaded.';

    menu.innerHTML = `
      <!-- HEADER (DRAGGABLE) -->
      <div class="mhq-menu-header" id="mhq-drag-handle">
        <div class="mhq-brand">
          <div class="mhq-logo-icon"></div>
          MH-Quantum Inspector
        </div>
        <button class="mhq-menu-close" id="mhq-close" type="button" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- TABS -->
      <div class="mhq-tabs">
        <div class="mhq-tab active" data-target="tab-selector">Selector</div>
        <div class="mhq-tab" data-target="tab-layout">Layout</div>
        <div class="mhq-tab" data-target="tab-styles">Styles</div>
        <div class="mhq-tab" data-target="tab-prompt">AI Prompt</div>
      </div>

      <!-- TAB: SELECTOR -->
      <div class="mhq-content" id="tab-selector">
        <div>
          <div class="mhq-section-title">SELECTOR</div>
          <div class="mhq-input-box">
            <span>${escapeHTML(selector)}</span>
            <button class="mhq-menu-close" style="padding:2px !important;" data-copy="${escapeHTML(selector)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>
        <div>
          <div class="mhq-section-title">BASIC INFO</div>
          <div class="mhq-input-box">
            Tag: ${escapeHTML(el.tag.toLowerCase())} | ID: ${escapeHTML(el.id || "none")}
          </div>
        </div>
      </div>

      <!-- TAB: LAYOUT (BOX MODEL) -->
      <div class="mhq-content" id="tab-layout" style="display:none;">
        <div class="mhq-section-title">BOX MODEL</div>
        <div class="mhq-box-model">
          <div class="mhq-box-layer" style="width: 100%; border-color: #fcd34d !important; background: #fffbeb !important;">
            <span>margin</span>
            <div class="mhq-box-layer" style="border-color: #fca5a5 !important; background: #fef2f2 !important; margin-top: 10px;">
              <span>border</span>
              <div class="mhq-box-layer" style="border-color: #86efac !important; background: #f0fdf4 !important; margin-top: 10px;">
                <span>padding</span>
                <div class="mhq-box-content" style="margin-top: 10px; text-align: center;">
                  ${Math.round(rect.width)} × ${Math.round(rect.height)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: STYLES -->
      <div class="mhq-content" id="tab-styles" style="display:none;">
        <div class="mhq-section-title">COMPUTED STYLES</div>
        <div>
          ${Object.entries(styles).slice(0, 15).map(([key, val]) => `
            <div class="mhq-style-row">
              <input type="checkbox" checked />
              <div>
                <span class="mhq-style-key">${key}:</span> 
                <span class="mhq-style-val">${val};</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- TAB: PROMPT -->
      <div class="mhq-content" id="tab-prompt" style="display:none;">
        <div class="mhq-section-title">GENERATED PROMPT</div>
        <textarea class="mhq-textarea" readonly>${escapeHTML(promptContent)}</textarea>
        <button class="mhq-btn mhq-btn-primary" data-action="copy-main-prompt" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy Prompt
        </button>
      </div>
    `;

    // Position Menu
    const menuW = 340;
    const menuH = 400;
    const left = x + menuW > window.innerWidth ? Math.max(8, window.innerWidth - menuW - 20) : x + 20;
    const top = y + menuH > window.innerHeight ? Math.max(8, window.innerHeight - menuH - 20) : y;
    
    Object.assign(menu.style, {
      left: `${left}px`,
      top: `${top}px`
    });

    shadowRoot.appendChild(menu);
    STATE.contextMenu = menu;

    // EVENT LISTENERS
    
    // Close button
    menu.querySelector('#mhq-close').addEventListener('click', () => {
      removeContextMenu();
      deactivate();
    });

    // Tabs logic
    const tabs = menu.querySelectorAll('.mhq-tab');
    const contents = menu.querySelectorAll('.mhq-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.style.display = 'none');
        tab.classList.add('active');
        menu.querySelector(`#${tab.dataset.target}`).style.display = 'flex';
      });
    });

    // Copy actions
    menu.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.dataset.copy);
        showToast('Copied!', 'success');
      }
      
      const actionBtn = e.target.closest('[data-action="copy-main-prompt"]');
      if (actionBtn) {
        copyText(promptContent);
        showToast('Prompt copied to clipboard!', 'success');
      }
    });

    // DRAGGABLE LOGIC
    const header = menu.querySelector('#mhq-drag-handle');
    let isDraggingMenu = false;
    let dragStartX, dragStartY, menuStartX, menuStartY;

    header.addEventListener('mousedown', (e) => {
      isDraggingMenu = true;
      STATE.isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      menuStartX = menu.offsetLeft;
      menuStartY = menu.offsetTop;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault(); // prevent text selection
    });

    function onMouseMove(e) {
      if (!isDraggingMenu) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      menu.style.left = `${menuStartX + dx}px`;
      menu.style.top = `${menuStartY + dy}px`;
    }

    function onMouseUp() {
      isDraggingMenu = false;
      setTimeout(() => { STATE.isDragging = false; }, 100);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }

  function removeContextMenu() {
    STATE.contextMenu?.remove();
    STATE.contextMenu = null;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function showToast(message, type = 'info') {
    shadowRoot.getElementById('mhq-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'mhq-toast';
    toast.textContent = message;
    
    // Light theme toast styles
    const colors = { 
      info: 'var(--color-accent)', 
      success: '#10B981', 
      error: '#EF4444' 
    };
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
      border-left: 4px solid ${color};
      animation: mhq-pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    shadowRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function bindMessages() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.type) {
        case 'TOGGLE_INSPECTOR':
          STATE.active ? deactivate() : activate();
          sendResponse({ active: STATE.active });
          break;
        case 'ACTIVATE_INSPECTOR':
          activate();
          sendResponse({ ok: true });
          break;
        case 'DEACTIVATE_INSPECTOR':
          deactivate();
          sendResponse({ ok: true });
          break;
        case 'GET_STATUS':
          sendResponse({ active: STATE.active, hasPayload: !!STATE.lastPayload });
          break;
        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
      return true;
    });
  }

  init();
})();
