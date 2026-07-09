# Audit Handoff Report: MH-Quantum Inspector Security & Code Quality Audit

This report details the findings of the deep security and code quality audit performed on the MH-Quantum Inspector extension and its standalone components.

---

## 1. Observations

### 1.1 Security Findings

#### A. DOM-Based XSS via Computed Style Values in Popup UI
*   **File Path**: `popup/popup.js`
*   **Line Numbers**: 107-133
*   **Code Quote**:
    ```javascript
    function renderStylesList(styles) {
      const container = document.getElementById('styles-container');
      container.innerHTML = '';
      
      const importantProps = ['display', 'align-items', 'justify-content', 'gap', 'padding', 'margin', 'font-family', 'font-size', 'font-weight', 'line-height', 'border-radius', 'background-color', 'color', 'border', 'box-shadow', 'cursor'];
      
      importantProps.forEach(prop => {
        // Basic camelCase conversion for style keys
        const key = prop.replace(/-([a-z])/g, g => g[1].toUpperCase());
        const val = styles[key];
        if (val && val !== 'none' && val !== 'auto' && val !== '0px') {
          const row = document.createElement('div');
          row.className = 'style-row';
          
          let valHtml = `<div class="style-val">${val}</div>`;
          if (val.includes('rgb') || val.includes('#')) {
            const colorMatch = val.match(/(rgba?\(.*?\)|#[0-9a-fA-F]{3,8})/);
            if (colorMatch) {
              valHtml = `<div class="style-color-box" style="background: ${colorMatch[0]}"></div> <div class="style-val">${val}</div>`;
            }
          }
          
          row.innerHTML = `<div class="style-prop">${prop}</div><div class="style-val-wrapper">${valHtml}</div>`;
          container.appendChild(row);
        }
      });
    }
    ```
*   **Description**: The popup script reads computed styles from the inspected element (`styles[key]`) and inserts them directly into the DOM using `row.innerHTML` without sanitization. An attacker-controlled web page could customize CSS properties (e.g., custom font-family names or pseudo-element contents containing script tags like `"><script>alert(1)</script>`) to trigger arbitrary script execution within the extension popup's context (which has access to `chrome` extension APIs).

#### B. Wildcard CORS Configuration on Local MCP Server
*   **File Path**: `mcp/mcp-server.js`
*   **Line Numbers**: 101-105
*   **Code Quote**:
    ```javascript
    const server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');
    ```
*   **Description**: The local MCP HTTP server enables wildcard CORS (`*`) and has no authentication or request validation mechanism. This allows any malicious website running in the developer's browser to send cross-origin requests to `http://127.0.0.1:3747` and read the details of the last inspected elements (which might contain sensitive data, session tokens, or personal information).

#### C. Lacks Server Authenticity Verification in E2E Handshake
*   **File Path**: `transport/ws-client.js`
*   **Line Numbers**: 30-60
*   **Description**: The WebSocket transport layer establishes an E2E encrypted session using an ephemeral ECDH key exchange over `ws://` (unencrypted WebSocket). However, the client accepts the server's public key during the handshake (`HANDSHAKE_ACK`) without any authenticity verification (such as signatures, pre-shared public keys, or certificates). This makes the connection vulnerable to Man-in-the-Middle (MitM) attacks where an attacker on the network can proxy the connection and decrypt/modify the payload.

---

### 1.2 Code Quality & Robustness Findings

#### A. Session ID Mismatch and Server Discard
*   **File Paths**: `utils/payload-schema.js` (Extension) vs `server/ai-bridge.js` (Server) vs `transport/payload-schema.js` (Standalone Bundle)
*   **Extension Code Quote** (`utils/payload-schema.js` line 53):
    ```javascript
    generateSessionId() {
      return 'mhq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }
    ```
*   **Server Code Quote** (`server/ai-bridge.js` lines 13-19):
    ```javascript
    function safeSessionId(value, fallback) {
      const id = typeof value === "string" ? value : fallback;
      if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
        return id;
      }
      return crypto.randomUUID();
    }
    ```
*   **Standalone Bundle Code Quote** (`transport/payload-schema.js` line 11):
    ```javascript
    session_id:        crypto.randomUUID(),
    ```
*   **Description**: The Extension payload schema generates session IDs starting with `mhq_`. However, the local server's `safeSessionId` function validates session IDs using a strict UUID regex match. Consequently, session IDs generated by the Chrome Extension will always fail verification, causing the server to discard them and generate a fresh random UUID. This breaks session correlation between the extension and the server logs.

#### B. Architectural Deviation & Unused MCP Transport in Chrome Extension
*   **File Paths**: `manifest.json`, `background.js`, `popup/popup.html`, `utils/prompt-generator.js`
*   **Description**: While the documentation (`PROJECT.md`) states that the background script and transport layers handle WebSocket connections to the MCP server, the actual Chrome Extension configuration in `manifest.json` completely omits the transport scripts (`transport/ws-client.js`, `transport/e2e-cipher.js`) from both background and popup environments. The extension is purely isolated to copy-to-clipboard and local storage caching. The MCP-related generator code (`generateMCPPayload` in `utils/prompt-generator.js` and target tool `mh_quantum_inspect` which does not match MCP server tools) is dead code.

#### C. Unescaped DOM Selectors in Standalone Web Analyzer
*   **File Path**: `analyzer/dom-crawler.js`
*   **Line Numbers**: 43-62
*   **Description**: Unlike the extension's version of the DOM crawler (`utils/dom-crawler.js`), which utilizes a `cssEscape` function to ensure valid CSS selectors, the standalone version `analyzer/dom-crawler.js` does not escape ID and class names. If an inspected element contains special characters (like `:` or spaces) in its ID or class names, the generated selector will be invalid and crash `document.querySelector` calls.

#### D. Missing Stacking Context / XPath Traversal in Shadow DOM
*   **File Path**: `utils/dom-crawler.js` and `analyzer/dom-crawler.js`
*   **Description**: When traversing upward to build selectors and XPaths, the code relies on `parentElement` / `parentNode`. When encountering a ShadowRoot boundary, `parentElement` evaluates to `null` and the loop terminates. This results in truncated selectors and XPaths that begin inside the shadow DOM and cannot be resolved globally from the main document scope.

#### E. Memory Leak: Event Listeners in Orphaned Content Scripts
*   **File Path**: `content.js`
*   **Line Numbers**: 95-116
*   **Description**: The extension registers mouse and keyboard event listeners (`mouseover`, `mouseout`, `click`, `keydown`) directly on the web page. However, there is no code that removes these listeners when the extension is updated or reloaded (orphaned content script situation). Listeners remain active in memory and throw exceptions when they attempt to use severed `chrome` API references.

#### F. Memory Leak: Uncleared Timers in Standalone Temporal Observer
*   **File Path**: `core/temporal-observer.js`
*   **Line Numbers**: 53-63
*   **Description**: The `stop()` function of the temporal observer disconnects the `MutationObserver` but does not cancel or clear the scheduled `setTimeout` callbacks. Pending timeouts will continue to execute on the main thread.

#### G. Extension Version Mismatch
*   **File Paths**: `manifest.json` vs `package.json`
*   **Description**: `manifest.json` defines version `"3.0.0"`, while `package.json` defines version `"2.1.0"`.

#### H. Missing Popup UI Dropdown Mapping in Prompt Generator
*   **File Paths**: `popup/popup.html` vs `popup/popup.js` vs `utils/prompt-generator.js`
*   **Description**: The template selection dropdown in `popup.html` has a `"recreate"` option. However, the generator script `utils/prompt-generator.js` does not support a `"recreate"` template in its mapper. It falls back to generating the default `"debug"` template, leading to contract mismatch and incorrect output.

---

## 2. Logic Chain

1.  **Computed Style XSS**:
    *   `popup.js` reads `styles[key]` where `styles` is populated by `MHDomCrawler` using values from `getComputedStyle(element)`.
    *   It constructs a string `valHtml` containing `val` and sets `row.innerHTML = ... ${valHtml}`.
    *   Because computed styles of arbitrary elements on external web pages are processed, a page using CSS Injection or malicious properties containing HTML characters will have those characters parsed as HTML tags in the popup.
    *   *Conclusion*: This results in DOM-based XSS inside the extension context.

2.  **MCP CORS Wildcard Vulnerability**:
    *   `mcp-server.js` sets the header `Access-Control-Allow-Origin` to `*` for all incoming requests.
    *   It exposes actions like `mh_get_last_element` which returns the last inspected DOM element context.
    *   Any page visited by the user in the browser can execute `fetch('http://127.0.0.1:3747', {method: 'POST', body: ...})` and retrieve this context.
    *   *Conclusion*: A malicious site can exfiltrate developer logs and inspected DOM snippets containing private user data.

3.  **MitM on Ephemeral Handshake**:
    *   `ws-client.js` performs an ECDH exchange over unencrypted `ws://` protocol.
    *   It accepts the server public key verbatim from `HANDSHAKE_ACK` messages.
    *   Without a trusted public key or certificate to verify the server identity, any intercepting attacker can supply their own public key.
    *   *Conclusion*: The connection is vulnerable to active man-in-the-middle attacks.

4.  **Session ID Discarding**:
    *   The extension generates IDs starting with `mhq_` (`utils/payload-schema.js`).
    *   The server (`ai-bridge.js`) verifies whether incoming session IDs match standard UUID patterns.
    *   An `mhq_` ID fails this regex check and is replaced by a newly generated UUID via `crypto.randomUUID()`.
    *   *Conclusion*: Client-side session IDs are discarded, preventing log correlation.

5.  **Orphaned Listener Leak**:
    *   `content.js` adds event listeners on `document` during `activate()`.
    *   When the extension is reloaded/updated, the old script instance is detached from runtime, but the listeners are not removed since no port disconnection check or cleanup listener is implemented.
    *   *Conclusion*: Multiple content script instances run simultaneously on page reload, leaking memory and throwing runtime errors.

---

## 3. Caveats

*   **Audit Scope**: This was a read-only investigation. No live code changes were made to fix these issues.
*   **Third-party dependencies**: The project relies on the npm `ws` package. Its internal vulnerabilities were not evaluated.
*   **Restricted Page Testing**: Chrome's system-level restrictions for URL injections were analyzed conceptually but not tested on custom enterprise-managed policies.

---

## 4. Conclusion

The MH-Quantum Inspector extension exhibits several security risks (particularly DOM XSS in the popup style list renderer, wildcard CORS on the local MCP server, and lack of server authentication on WebSocket connections) and code quality defects (session ID mismatches, architectural gaps where background.js is isolated from the WS/MCP layers, shadow DOM crawling limitations, and orphaned event listener leaks). Addressing these findings is critical before presenting the extension for Chrome Web Store distribution.

---

## 5. Verification Method

To verify these findings:

1.  **Run Syntax and Integrity Verifier**:
    Run the project's pre-ship check script:
    ```powershell
    npm run verify
    ```
2.  **Verify CORS Wildcard**:
    Check `mcp/mcp-server.js` line 102 to confirm `Access-Control-Allow-Origin` is set to `*`.
3.  **Inspect Style Injection XSS**:
    Open `popup/popup.js` and trace the implementation of `renderStylesList` on line 107. Note the direct assignment of `row.innerHTML` using variable `valHtml` containing `styles` values.
4.  **Check Session ID Regex Mismatch**:
    Compare the generated format in `utils/payload-schema.js` line 53 (`mhq_...`) with the validation regex in `server/ai-bridge.js` line 15 (`/^[a-f0-9]{8}-...$/i`).
