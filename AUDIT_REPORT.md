# MH-Quantum Inspector — Codebase Audit & Security Assessment

This audit report identifies, categorizes, and provides resolutions for security, compatibility, and quality issues found in the MH-Quantum Inspector codebase.

---

## 📋 Must Fix Before Publishing Checklist

Before submitting the extension to the Chrome Web Store, the following **14 critical, high, and medium-severity issues** must be resolved:

- [ ] **Critical:** Resolve DOM-Based XSS vulnerability in `popup/popup.js` by removing raw `innerHTML` assignments.
- [ ] **Critical:** Add missing icon assets (`icon16.png`, `icon48.png`, `icon128.png`) in the `icons/` folder to allow extension installation.
- [ ] **Critical:** Prune unnecessary permissions (`scripting`, `notifications`, `clipboardWrite`) from `manifest.json`.
- [ ] **Critical:** Restrict local MCP Server CORS wildcard (`Access-Control-Allow-Origin: *`) to safe, authenticated origins.
- [ ] **Critical:** Eliminate MV3 CSP violation by downloading Google Fonts assets and loading them locally in `popup/popup.html`.
- [ ] **Critical:** Add missing privacy policy URL or `privacy_policy.html`.
- [ ] **High:** Rectify Design System violations: convert the popup UI to dark theme (`#0A0A0A`), adjust width to `340px`, and remove emojis from production menu strings.
- [ ] **High:** Implement connection status UI pulse dot for the local MCP Server in the popup header.
- [ ] **High:** Bind event listener to the Broken Pin Window Button (`#btn-pin`) in `popup.js`.
- [ ] **High:** Align Client-Server Session IDs by standardizing both to use valid UUID formats.
- [ ] **High:** Fix Extension Transport Isolation by including transport script files in the manifest's content scripts list.
- [ ] **High:** Isolate injected UI elements (`#mhq-overlay`, tooltip, toast, menu) from host page styles by wrapping them in a Shadow DOM.
- [ ] **High:** Define package build rule to exclude server-side/dev-only folders.
- [ ] **Medium:** Prepare store listing assets (screenshots, description, category).

---

## 1. 🛑 CRITICAL SEVERITY ISSUES
*Issues in this category will cause Chrome Web Store rejection, security vulnerabilities, or complete failure to install.*

### 1.1 DOM-Based XSS in Styles List Renderer
* **Location**: `popup/popup.js` (lines 107-133)
* **Description**: Computed CSS styles extracted from target pages are rendered in the popup using `row.innerHTML = ... ${valHtml}` where `valHtml` contains raw style values. If a malicious website customizes its element properties (e.g. CSS custom properties or color values containing HTML injections like `<img src=x onerror=... >`), it can execute arbitrary scripts inside the highly privileged extension context.
* **Fix Recommendation**: Avoid using `innerHTML` with raw values. Re-write the DOM construction dynamically using `document.createElement`, `textContent`, and safe DOM assignment interfaces.
* **Actionable Snippet**:
  ```javascript
  function renderStylesList(styles) {
    const container = document.getElementById('styles-container');
    container.innerHTML = '';
    
    const importantProps = ['display', 'align-items', 'justify-content', 'gap', 'padding', 'margin', 'font-family', 'font-size', 'font-weight', 'line-height', 'border-radius', 'background-color', 'color', 'border', 'box-shadow', 'cursor'];
    
    importantProps.forEach(prop => {
      const key = prop.replace(/-([a-z])/g, g => g[1].toUpperCase());
      const val = styles[key];
      if (val && val !== 'none' && val !== 'auto' && val !== '0px') {
        const row = document.createElement('div');
        row.className = 'style-row';
        
        const propEl = document.createElement('div');
        propEl.className = 'style-prop';
        propEl.textContent = prop;
        row.appendChild(propEl);

        const valWrapper = document.createElement('div');
        valWrapper.className = 'style-val-wrapper';

        if (val.includes('rgb') || val.includes('#')) {
          const colorMatch = val.match(/(rgba?\(.*?\)|#[0-9a-fA-F]{3,8})/);
          if (colorMatch) {
            const colorBox = document.createElement('div');
            colorBox.className = 'style-color-box';
            colorBox.style.backgroundColor = colorMatch[0];
            valWrapper.appendChild(colorBox);
          }
        }
        
        const valEl = document.createElement('div');
        valEl.className = 'style-val';
        valEl.textContent = val;
        valWrapper.appendChild(valEl);
        
        row.appendChild(valWrapper);
        container.appendChild(row);
      }
    });
  }
  ```

### 1.2 Missing Icon Files
* **Location**: `manifest.json` (lines 35-37, 58-60) and `popup/popup.html` (line 17)
* **Description**: The `icons/` folder is empty. The extension manifest and popup reference `icon16.png`, `icon48.png`, and `icon128.png` which do not exist in the package. This triggers immediate directory parsing failures and blocks unpacked extension loading in Chrome.
* **Fix Recommendation**: Generate the required PNG icons with exact sizes and save them in the `/icons` folder.
* **Actionable Snippet**:
  Ensure these files are present:
  ```text
  /icons/icon16.png (16x16 pixels)
  /icons/icon48.png (48x48 pixels)
  /icons/icon128.png (128x128 pixels)
  ```

### 1.3 Over-requested Permissions
* **Location**: `manifest.json` (lines 8, 10, 12)
* **Description**: Requests `scripting`, `notifications`, and `clipboardWrite` permissions which are not required. The scripting API is unused; notifications are handled via custom inline toast overlays (not the system notification API); and clipboard writing is initiated directly through user gestures inside document context via `navigator.clipboard.writeText`. Requesting unnecessary permissions violates the Chrome Web Store policy of least privilege and triggers strict manual review delays.
* **Fix Recommendation**: Prune unused items from the permissions configuration.
* **Actionable Snippet**:
  In `manifest.json`:
  ```json
    "permissions": [
      "activeTab",
      "storage",
      "contextMenus"
    ],
  ```

### 1.4 Wildcard CORS on Local MCP Server
* **Location**: `mcp/mcp-server.js` (lines 101-105)
* **Description**: The MCP backend sets `Access-Control-Allow-Origin: *` without validating authorization keys or caller identities. Any website open in the user's browser can query the localhost server to retrieve inspected logs, prompt outputs, and sensitive workspace paths.
* **Fix Recommendation**: Bind incoming origins to the unique chrome-extension scheme or enforce token verification on request headers.
* **Actionable Snippet**:
  In `mcp/mcp-server.js`:
  ```javascript
  const server = createServer((req, res) => {
    const origin = req.headers.origin;
    if (origin && origin.startsWith('chrome-extension://')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'null');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    // ...
  ```

### 1.5 External Asset Loading (CSP Violation)
* **Location**: `popup/popup.html` (lines 7-9)
* **Description**: Loads Inter and JetBrains Mono stylesheets and font files from remote CDNs (`fonts.googleapis.com` and `fonts.gstatic.com`). Extension Manifest V3 enforces strict offline-only Content Security Policies (CSP) which reject remote network requests for CSS or font assets.
* **Fix Recommendation**: Download font files and reference them locally in the package.
* **Actionable Snippet**:
  In `popup/popup.html`, remove remote references and import local fonts:
  ```html
  <link rel="stylesheet" href="../fonts/fonts.css">
  <link rel="stylesheet" href="popup.css">
  ```
  In `/fonts/fonts.css`:
  ```css
  @font-face {
    font-family: 'Inter';
    src: url('Inter-Regular.woff2') format('woff2');
    font-weight: 400;
  }
  @font-face {
    font-family: 'JetBrains Mono';
    src: url('JetBrainsMono-Regular.woff2') format('woff2');
    font-weight: 400;
  }
  ```

### 1.6 Privacy Policy Audit (R1 & R3)
* **Location**: Store listing configurations & Extension root directory
* **Description**: The extension lacks a `privacy_policy.html` file or a privacy policy URL in its store listing configs. Under Chrome Web Store guidelines, because the extension has `<all_urls>` host permissions and runs code on user tabs, a privacy policy is mandatory. Furthermore, the extension transmits data via WebSockets to `localhost` (port 3747) for MCP server integration. This data boundary (sending DOM and css styling snippets locally) must be explicitly disclosed in the privacy policy to prevent policy violations.
* **Fix Recommendation**: Create a `privacy_policy.html` page to include in the package and host a public version of the privacy policy on a website, then link it in the developer console. The policy must disclose that element data is processed locally and via local WebSockets only, with no external remote telemetry.
* **Actionable Snippet**:
  Create a local `privacy_policy.html` page inside the extension package with the following baseline template:
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Privacy Policy - MH-Quantum Inspector</title>
    <style>
      body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
      h1 { border-bottom: 1px solid #ccc; padding-bottom: 10px; }
    </style>
  </head>
  <body>
    <h1>Privacy Policy for MH-Quantum Inspector</h1>
    <p>This privacy policy governs your use of the MH-Quantum Inspector browser extension.</p>
    <h2>Data Collection & Boundaries</h2>
    <p>MH-Quantum Inspector accesses tab and element styling details solely to perform local code analyses. The extension transmits retrieved DOM and CSS styling snippets strictly via local WebSockets to <code>localhost</code> (port 3747) for Model Context Protocol (MCP) server integration.</p>
    <h2>No Remote Telemetry</h2>
    <p>All data processing is conducted locally. No remote tracking, telemetry, or third-party web reporting services are embedded or utilized.</p>
  </body>
  </html>
  ```

---

## 2. ⚠️ HIGH SEVERITY ISSUES
*Issues in this category represent major functionality failures, user experience defects, or design system violations.*

### 2.1 Design System Violations (DESIGN.md)
* **Location**: `popup/popup.css` (lines 1-23), `popup/popup.html`, `content.js` (lines 170-185)
* **Description**:
  1. The popup UI is rendered in a standard Light Mode theme instead of the dark cockpit cockpit theme (`#0A0A0A`, `#161618`, `#FFFFFF`, `#00F5FF`).
  2. The MCP pulse connection status dot is completely missing.
  3. The popup body width is defined as 400px instead of the mandatory 340px limit.
  4. Buttons lack transition micro-interactions (`transform: scale(0.98)`).
  5. Emojis are used inside context menu items, which violates the strict anti-pattern: "NO emojis in final production UI (replace with sharp SVG icons)".
* **Fix Recommendation**: Override the stylesheet variables to match the dark cockpit color palette. Add the status pulse indicator element, implement button spring physics, and remove emoji strings from the context menu UI.
* **Actionable Snippet**:
  In `popup/popup.css`:
  ```css
  :root {
    --abyss-black: #0A0A0A;
    --charcoal-surface: #161618;
    --zinc-ink: #FFFFFF;
    --muted-steel: #888888;
    --whisper-border: rgba(255, 255, 255, 0.08);
    --quantum-cyan: #00F5FF;
    --error-red: #FF4444;
    --online-green: #00FF88;
  }

  body {
    width: 340px; /* Set fixed width */
    background-color: var(--abyss-black);
    color: var(--zinc-ink);
  }

  /* Tactile active state */
  .primary-btn:active, .secondary-btn:active {
    transform: scale(0.98);
    transition: transform 0.08s ease;
  }
  ```
  In `popup/popup.html` (header logo area):
  ```html
  <div class="logo-area">
    <img src="../icons/icon48.png" alt="Logo" class="logo-icon">
    <span class="logo-text">MH-Quantum Inspector</span>
    <span id="mhq-status-dot" class="status-pulse-dot" title="MCP Connection Status"></span>
  </div>
  ```
  In `popup/popup.css` (for MCP status dot):
  ```css
  .status-pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--muted-steel);
    display: inline-block;
    margin-left: 6px;
  }
  .status-pulse-dot.connected {
    background-color: var(--online-green);
    box-shadow: 0 0 8px var(--online-green);
    animation: status-heartbeat 2s infinite;
  }
  @keyframes status-heartbeat {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }
  ```

### 2.2 Broken Pin Window Button
* **Location**: `popup/popup.html` (line 21), `popup/popup.js`
* **Description**: The window pinning button (`#btn-pin`) in the header contains no click callback or event handler inside `popup.js`, rendering it non-functional.
* **Fix Recommendation**: Assign a click listener that clones the current popup view inside a standalone panel window using the `chrome.windows.create` API.
* **Actionable Snippet**:
  In `popup/popup.js` (inside `bindEvents()`):
  ```javascript
  document.getElementById('btn-pin')?.addEventListener('click', async () => {
    const url = chrome.runtime.getURL('popup/popup.html');
    await chrome.windows.create({
      url: url,
      type: 'popup',
      width: 340,
      height: 600
    });
    window.close(); // Close existing dropdown view
  });
  ```

### 2.3 Session ID Mismatch
* **Location**: `utils/payload-schema.js` (lines 53-55) and `server/ai-bridge.js` (lines 13-19)
* **Description**: The client generates local session identifiers starting with `mhq_` (e.g. `'mhq_' + Date.now().toString(36) + ...`). The receiver backend enforces a strict UUID matching expression, which rejects the client ID and silently overwrites it with a fresh random server-side UUID. This breaks chronological alignment of diagnostic logs.
* **Fix Recommendation**: Standardize client session key generation to produce standard cryptographically secure UUID v4 formats.
* **Actionable Snippet**:
  In `utils/payload-schema.js`:
  ```javascript
  generateSessionId() {
    return crypto.randomUUID();
  }
  ```

### 2.4 Extension Transport Isolation
* **Location**: `manifest.json` (lines 19-31) and `utils/prompt-generator.js`
* **Description**: The extension configuration completely omits the WebSocket transport layer (`transport/ws-client.js`, `transport/e2e-cipher.js`) from content scripts. This cuts off runtime communications between the browser script context and the local MCP broker, leaving prompt utility endpoints like `generateMCPPayload(...)` as orphaned dead code.
* **Fix Recommendation**: Include `e2e-cipher.js` and `ws-client.js` in the content script array list before `content.js`.
* **Actionable Snippet**:
  In `manifest.json`:
  ```json
    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "js": [
          "transport/e2e-cipher.js",
          "transport/ws-client.js",
          "utils/dom-crawler.js",
          "utils/prompt-generator.js",
          "utils/payload-schema.js",
          "content.js"
        ],
        "css": ["inspector.css"],
        "run_at": "document_idle"
      }
    ],
  ```

### 2.5 Lack of Style Isolation in Injected UI
* **Location**: `content.js` (lines 22-37, 39-62)
* **Description**: Elements like overlay outlines, inspector tooltips, quick menus, and toast panels are injected directly into the target website's root hierarchy. CSS definitions on the parent site frequently override, skew, and break the extension interface. Furthermore, the inline CSS styles do not use the `!important` rule, which allows external styling sheets to take priority.
* **Fix Recommendation**: Wrap the injected interactive visual UI nodes inside a closed or open Shadow DOM container to prevent host stylesheet pollution.
* **Actionable Snippet**:
  In `content.js`:
  ```javascript
  let shadowRoot = null;

  function initShadowHost() {
    const host = document.createElement('div');
    host.id = 'mhq-shadow-host';
    shadowRoot = host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);

    const style = document.createElement('style');
    style.textContent = `
      #mhq-overlay {
        position: fixed !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        border: 2px solid #00f5ff !important;
        background: rgba(0, 245, 255, 0.08) !important;
      }
      #mhq-tooltip {
        position: fixed !important;
        z-index: 2147483647 !important;
        background: #0a0a0f !important;
        color: #00f5ff !important;
        font-family: 'JetBrains Mono', monospace !important;
      }
    `;
    shadowRoot.appendChild(style);
  }

  function createOverlay() {
    if (!shadowRoot) initShadowHost();
    STATE.overlay = document.createElement('div');
    STATE.overlay.id = 'mhq-overlay';
    shadowRoot.appendChild(STATE.overlay);
  }
  ```

### 2.6 Packaging Exclusions List (R3)
* **Location**: Build & Packaging Configuration
* **Description**: The workspace contains server-side Node.js files and development tools that should NOT be bundled into the production `.zip` extension archive. These include `server/` (local backend), `mcp/` (Model Context Protocol bridge), `logs/` (debug logs), `node_modules/` (Node dependencies), `index.html` (root test page), `mhq.bundle.js` (test build), and workspace configuration files like `package.json`, `package-lock.json`, and `mh-quantum.config.js`. Bundling these increases file count, security risk, and package size.
* **Fix Recommendation**: Define a build rule or a packaging script that excludes these directories. Exclude: `/server/`, `/mcp/`, `/logs/`, `/node_modules/`, `/index.html`, `/mhq.bundle.js`, `/package.json`, `/package-lock.json`, `/mh-quantum.config.js`.
* **Actionable Snippet**:
  Add an exclusion filter in your packaging process. For example, if using a custom build tool or zip script, filter by paths:
  ```javascript
  // Example build script snippet to exclude non-extension files from zip bundle
  const ignorePatterns = [
    'server/',
    'mcp/',
    'logs/',
    'node_modules/',
    'index.html',
    'mhq.bundle.js',
    'package.json',
    'package-lock.json',
    'mh-quantum.config.js'
  ];
  ```

---

## 3. 🔍 MEDIUM SEVERITY ISSUES
*Issues in this category represent compliance violations, potential runtime crashes, or memory leaks.*

### 3.1 WCAG 2.1 AA & Keyboard Accessibility Violations
* **Location**: `popup/popup.html`, `popup/popup.js`, `content.js`
* **Description**:
  1. Icon buttons (`btn-copy-icon`, `btn-close`, `btn-pin`, `#mhq-close`) lack text nodes or `aria-label` declarations.
  2. The tab bar does not map tab roles or support focus selection via arrow keys.
  3. Textareas (`#mhq-intent`) and options selectors are missing corresponding `<label>` links.
  4. Global toast alerts do not define `role="status"` or `aria-live`.
  5. Context menu shortcuts are plain `<span>` tags that cannot be focused or activated via keyboard navigation.
  6. Text contrast of steel `#6B7280` on pure white background is `4.0:1` (below the WCAG `4.5:1` requirement).
  7. Toast dismissal timeout is hardcoded to 2.5 seconds, failing accessibility rule SC 2.2.1 (Timing Adjustable).
* **Fix Recommendation**: Supplement DOM elements with `aria-label` tags, implement focus states, increase font contrast weights, and double the toast timeout duration to at least 5.0 seconds.
* **Actionable Snippet**:
  In `popup/popup.html`:
  ```html
  <button class="icon-btn" aria-label="Pin panel window" title="Pin window" id="btn-pin">...</button>
  <button class="icon-btn" aria-label="Close extension" title="Close" id="btn-close">...</button>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
  ```
  In `popup/popup.js`:
  ```javascript
  // Extend timing block
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.hidden = true; }, 5000);
  ```

### 3.2 Unescaped DOM Selectors in Standalone Analyzer
* **Location**: `analyzer/dom-crawler.js` (lines 43-62)
* **Description**: The query crawler does not escape ID and class strings during selector construction. Characters like `:`, `[`, `]`, and `/` (typical in Tailwind CSS utilities like `lg:w-1/2`) trigger parser crashes when evaluating elements.
* **Fix Recommendation**: Wrap class and ID names inside `CSS.escape()` calls during string resolution.
* **Actionable Snippet**:
  In `analyzer/dom-crawler.js`:
  ```javascript
  function getSelector(el) {
    const parts = [];
    let node = el;

    while (node && node.nodeType === 1 && node !== document.documentElement) {
      let seg = node.tagName.toLowerCase();
      if (node.id) {
        seg += `#${CSS.escape(node.id)}`;
        parts.unshift(seg);
        break;
      } else if (node.className) {
        const cls = Array.from(node.classList)
          .slice(0, 3)
          .map(c => CSS.escape(c))
          .join(".");
        if (cls) seg += `.${cls}`;
      }
      parts.unshift(seg);
      node = node.parentElement;
    }
    return parts.join(" > ") || el.tagName.toLowerCase();
  }
  ```

### 3.3 Shadow DOM Traversal Limitation
* **Location**: `analyzer/dom-crawler.js` (line 58)
* **Description**: Upward hierarchical selector mapping breaks whenever the crawler meets a component shadow root, since `parentElement` evaluates to `null`. This prevents correct global matching of child elements positioned inside shadow templates.
* **Fix Recommendation**: Check for shadow boundary hosts when standard parent references return empty.
* **Actionable Snippet**:
  In `analyzer/dom-crawler.js`:
  ```javascript
  let parent = node.parentElement;
  if (!parent && node.parentNode && node.parentNode instanceof ShadowRoot) {
    parent = node.parentNode.host;
  }
  node = parent;
  ```

### 3.4 Orphaned Content Script Event Listeners
* **Location**: `content.js` (lines 95-116)
* **Description**: Reloading or updating the browser extension leaves old event listeners bound in target pages' memory, causing console errors ("Extension context invalidated") and active leaks.
* **Fix Recommendation**: Enforce context validation checks on callbacks and release binds if the extension context is destroyed.
* **Actionable Snippet**:
  In `content.js`:
  ```javascript
  function isContextValid() {
    if (!chrome.runtime?.id) {
      deactivate();
      return false;
    }
    return true;
  }
  
  function onMouseOver(e) {
    if (!isContextValid()) return;
    if (isOwnUI(e.target)) return;
    STATE.hoveredEl = e.target;
    highlightElement(e.target);
  }
  ```

### 3.5 Temporal Observer Uncleared Timers
* **Location**: `core/temporal-observer.js` (lines 31-48, 53-63)
* **Description**: The temporal observer detaches MutationObservers inside its `stop()` routine but fails to cancel pending style tracking timeouts, leaving unresolved timers running in the background.
* **Fix Recommendation**: Keep an array of active timeouts and clear them on stop.
* **Actionable Snippet**:
  In `core/temporal-observer.js`:
  ```javascript
  const pendingTimers = new Set();

  // inside MutationObserver loop
  const t = setTimeout(() => {
    recentlyMutated.delete(m.target);
    pendingTimers.delete(t);
  }, 200);
  pendingTimers.add(t);

  // inside stop()
  pendingTimers.forEach(timer => clearTimeout(timer));
  pendingTimers.clear();
  ```

### 3.6 Missing Store Listing Assets (R1)
* **Location**: Store Listing Configurations
* **Description**: The project currently lacks essential store listing assets needed for CWS publication: detailed store description, screenshots of the extension in action, promotional images (small/large tiles), and category selection details.
* **Fix Recommendation**: Prepare a detailed description (outlining features, offline security, usage instructions), capture at least 4 screenshots (e.g. element selection overlay, computed styles popup panel, copy-to-clipboard success toast, settings tab), generate promo tiles, and classify under the 'Developer Tools' category.
* **Actionable Snippet**:
  Construct a structural content payload for store listings:
  ```text
  - Description: Describe element structure inspection, offline privacy, WebGL mesh visualizations, and local WebSocket bridge.
  - Screenshots required (at least 4):
    1. Element selection overlay showing the visual outline bounds
    2. Computed style inspector popup pane listing CSS key-value pairs
    3. Success toast notification showing clipboard actions
    4. Settings page illustrating local WebSocket status toggles
  - Category: Developer Tools
  - Tiles: Small (440x280), Large (920x680)
  ```

---

## 4. 🔛 LOW SEVERITY ISSUES
*Minor configuration or cosmetic defects.*

### 4.1 Version Mismatch
* **Location**: `manifest.json` (line 4) vs `package.json` (line 3)
* **Description**: The extension version inside `manifest.json` specifies `3.0.0`, whereas the Node package descriptor file specifies `2.1.0`.
* **Fix Recommendation**: Standardize package version properties to `3.0.0` in both files.

### 4.2 Undocumented Keyboard Shortcut
* **Location**: `README.md` and `popup/popup.html`
* **Description**: The command shortcut `Ctrl+Shift+C` is defined in `manifest.json` to trigger copying of the last analyzed context, but it is not documented in the instruction guides or UI views.
* **Fix Recommendation**: Add keyboard shortcut instructions to `README.md`.
* **Actionable Snippet**:
  Add to `README.md`:
  ```markdown
  * **Ctrl+Shift+X**: Toggle element inspector
  * **Ctrl+Shift+C**: Copy last inspected context instantly
  ```

### 4.3 Missing Dropdown Mapping
* **Location**: `popup/popup.html` (line 130) vs `utils/prompt-generator.js`
* **Description**: The template option `"recreate"` is visible in the HTML dropdown, but it has no matching generator mapping method in `prompt-generator.js`, causing the system to fall back to the default `"debug"` template.
* **Fix Recommendation**: Match the `"recreate"` select key value to the appropriate prompt template mapping method.
* **Actionable Snippet**:
  In `utils/prompt-generator.js`:
  ```javascript
  const generators = {
    debug: () => this.debugPrompt(payload, intent),
    fix_css: () => this.fixCSSPrompt(payload, intent),
    refactor: () => this.refactorPrompt(payload, intent),
    recreate: () => this.refactorPrompt(payload, intent), // map to refactor
    accessibility: () => this.a11yPrompt(payload, intent),
    // ...
  ```

### 4.4 Internationalization (i18n) Audit (R3)
* **Location**: Extension Codebase UI Strings (`_locales/`)
* **Description**: The `_locales/` directory is missing from the extension codebase. Currently, all UI strings in popup/popup.html, background.js, and content.js are hardcoded in English (with some standalone components in Vietnamese like `Gửi cho AI` in ui/contextual-popup.js).
* **Fix Recommendation**: If multi-language support is planned, create a `_locales` directory containing `en/messages.json` and other target locale json files, and refactor UI text references to use the `chrome.i18n.getMessage()` API.
* **Actionable Snippet**:
  Create directory `_locales/en/` and file `messages.json`:
  ```json
  {
    "extName": {
      "message": "MH-Quantum Inspector",
      "description": "The name of the extension"
    },
    "btnSendToAI": {
      "message": "Send to AI",
      "description": "Label for AI request submit button"
    }
  }
  ```

---

## 5. 👍 POSITIVE FINDINGS
*Code structures and configurations that were implemented correctly and run reliably.*

* **Manifest V3 Conformance**: The extension correctly implements Manifest V3 standards, avoiding deprecated background script architectures.
* **Clean Script Dependencies**: Content scripts map clean loading orders and execute without missing base script dependencies.
* **Robust Prompt Construction**: AI templates compile raw CSS and positioning attributes into precise and structured Markdown text blocks.
* **Modular Codebase Layout**: Scripts are neatly segregated into specialized folders (`core`, `analyzer`, `renderer`, `transport`, `popup`), facilitating code reading and system maintenance.
* **Shader Files Verification (R3)**: The `renderer/shader/` directory was audited and confirmed to contain the required shader files: `fragment.glsl` (576 bytes) and `vertex.glsl` (606 bytes). These files are correctly formatted and ready for WebGL rendering in the standalone analyzer tool.
