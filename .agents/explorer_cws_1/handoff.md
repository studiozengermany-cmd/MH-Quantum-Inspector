# Chrome Web Store Compliance & Completeness Audit Report

## 1. Observation

### Manifest Configuration & Structure
* **File Path**: `manifest.json`
* **Observation**: The extension is configured under Manifest Version 3 (MV3).
```json
  "manifest_version": 3,
  "name": "MH-Quantum Inspector",
  "version": "3.0.0",
  "description": "Click any element → instant AI-ready context. Zero setup. Zero server.",
```
* **Required Keys**: All standard MV3 keys (`name`, `version`, `manifest_version`, `description`, `icons`, `action`, `background`, `content_scripts`, `commands`, `permissions`, `host_permissions`) are declared.
* **Metadata Length**: The description is 72 characters, which is well below the Chrome Web Store maximum limit of 132 characters.

### Permissions Audit
* **File Path**: `manifest.json` lines 6-14:
```json
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "clipboardWrite",
    "contextMenus",
    "notifications"
  ],
  "host_permissions": ["<all_urls>"],
```
* **API Usage Observations**:
  1. `scripting`: Never called or referenced in the background worker `background.js` or any other script.
  2. `notifications`: Never called in the entire extension codebase. The extension implements DOM-based overlays and toast messages rather than chrome notification alerts (e.g. `content.js` line 268 `showToast()` and `popup.js` line 201 `showToast()`).
  3. `clipboardWrite`: The popup controller `popup.js` (lines 180, 187, 193) and the content script `content.js` (lines 240, 241, 255) copy prompts directly using `navigator.clipboard.writeText(text)` which executes within a document context upon user gesture. The extension does not perform background clipboard writes, making the extension-level `"clipboardWrite"` permission redundant.
  4. `host_permissions` & `<all_urls>` Match: The extension injects content scripts dynamically across `<all_urls>` (line 21) and declares `<all_urls>` in `host_permissions` (line 14). This results in the high-disclosure warnings: *"Read and change all your data on the websites you visit."*

### Assets & Icons Presence
* **Observation**: The `icons` folder is empty.
* **Referenced paths in manifest.json**:
```json
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
```
* **Referenced path in popup/popup.html** line 17:
```html
        <img src="../icons/icon48.png" alt="Logo" class="logo-icon">
```
* **Status**: None of these PNG files (`icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`) exist in the workspace, causing extension installation failures and broken image links in `popup.html`.

### Content Security Policy (CSP) & Privacy Requirements
* **Observation in `popup/popup.html`** lines 7-9:
```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```
* **CSP Policy**: There is no custom `content_security_policy` declared in `manifest.json`. Under MV3, the default CSP applies.
* **External Connections**: A full scan of `background.js`, `content.js`, `popup.js`, and `utils/` confirms that no external network calls (no `fetch`, `XMLHttpRequest`, `WebSocket`, or telemetry beacons) are made. All data remains local.

### File Completeness
* **Referenced Content Script Dependencies**: All scripts declared in `manifest.json` line 22-27 exist under the expected paths:
  - `utils/dom-crawler.js` (Exists)
  - `utils/prompt-generator.js` (Exists)
  - `utils/payload-schema.js` (Exists)
  - `content.js` (Exists)
  - `inspector.css` (Exists)
* **Popup Files**: All referenced popup files exist under `popup/`:
  - `popup/popup.html` (Exists)
  - `popup/popup.css` (Exists)
  - `popup/popup.js` (Exists)

### Development and Build Modules
* **Observation**: The workspace contains multiple Node.js configs, test pages, and backend modules:
  - `server/` (Node.js WebSocket/AI server)
  - `mcp/` (Model Context Protocol server)
  - `logs/` (Payload logs)
  - `node_modules/` (Node package folder)
  - `index.html` (Local test page)
  - `mhq.bundle.js` (Test page browser bundle)
  - `analyzer/`, `core/`, `renderer/`, `transport/`, `ui/`, `scripts/` (Source modules and build/verification scripts for the standalone web tool version)
  - `package.json`, `package-lock.json`, `mh-quantum.config.js` (Root node settings)

---

## 2. Logic Chain

1. **Manifest & Directory Integrity**:
   - The manifest file references extension icons (`icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`).
   - The directory scan of `icons/` returned an empty directory.
   - **Conclusion**: The extension cannot be installed in Chrome without throw errors due to missing declared files, and the popup header logo is broken.

2. **CWS Permission Minimization (Single Purpose / Least Privilege Policy)**:
   - Chrome Web Store reviews flag and reject extensions requesting permissions they do not actively use.
   - The `scripting` and `notifications` permissions are declared but the code never invokes `chrome.scripting` or `chrome.notifications`.
   - The `clipboardWrite` permission is declared but the copy feature is handled locally by `navigator.clipboard.writeText` within user-interaction flows in popup and content scripts.
   - **Conclusion**: The permissions `scripting` (in Option A), `notifications`, and `clipboardWrite` are over-requested and must be removed to avoid review failure.

3. **User Warnings & Host Scoping**:
   - Injecting a declarative content script into all websites requires `<all_urls>` permission, displaying a broad safety warning to users.
   - Under MV3, dynamic script injection via the `scripting` API when the user explicitly triggers the action is the recommended practice to avoid global warnings.
   - **Conclusion**: We should offer two options:
     - **Option A (Cleaned Declarative)**: Retain current declarative style, but remove unused permissions.
     - **Option B (Dynamic Injection)**: Remove global `content_scripts` and `host_permissions` from the manifest. Introduce a dynamic injection helper inside the service worker using the `scripting` permission, which triggers only on user demand.

4. **Resource Bundling for CSP & Privacy**:
   - `popup.html` loads Google Fonts via external URL stylesheets.
   - CWS policies strongly recommend bundling all styling and typography assets locally to ensure security and prevent remote-loading vulnerabilities.
   - **Conclusion**: Fonts must be downloaded and bundled locally, and the external stylesheet links must be replaced with local CSS fonts to guarantee strict compliance.

5. **Distribution Packaging**:
   - Packaging the entire workspace directory would upload unnecessary backend files (`server/`, `node_modules/`, etc.) containing thousands of files and potentially exposing keys/logs.
   - **Conclusion**: A production packaging build rule must be defined to exclude all non-extension directories.

---

## 3. Caveats

* **Assumptions**: We assume the extension is intended to run as a local productivity tool (zero server/telemetry). If telemetry is planned for the future, a Privacy Policy document and disclosure on the CWS developer console will be required.
* **Permissions Options**: If Option B (Dynamic Injection) is selected, the shortcut `Ctrl+Shift+X` will only work *after* the extension has been clicked/activated once on the active tab (as `activeTab` permission is granted dynamically). If the user expects the keyboard shortcut to work immediately on any fresh page load without prior interaction, Option A (Declarative Injection with `<all_urls>`) is mandatory.

---

## 4. Conclusion

The extension has a strong foundation and is cleanly written, but it **cannot be published in its current state** due to:
1. Missing icon assets (broken installation block).
2. Violation of the CWS least privilege policy due to over-requested/unused permissions (`scripting` in current code, `notifications`, `clipboardWrite`).
3. External assets loading in the popup (`https://fonts.googleapis.com`).
4. Bundled development files that should not be packaged for production.

### Actionable Remediations
1. **Provide Icons**: Generate 16x16, 48x48, and 128x128 pixel versions of the extension icon, save them to the `icons/` folder, and reference them.
2. **Apply Manifest Clean-up**: Update `manifest.json`.
   - We have prepared **Option A** (`proposed_manifest_option_a.json`) which cleans up the manifest but keeps declarative injection.
   - We have prepared **Option B** (`proposed_manifest_option_b.json` and `proposed_background_option_b.js`) which introduces dynamic content script injection, removing `<all_urls>` warnings entirely.
3. **Localize Fonts**: Download the `Inter` and `JetBrains Mono` fonts and place them in the `popup/` or a `fonts/` folder, importing them locally.
4. **Create a Production Package Filter**: Only include:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `inspector.css`
   - `utils/`
   - `popup/`
   - `icons/`

---

## 5. Verification Method

### Step 1: Install & Verify Missing Files
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the extension directory `j:\2. Minh Hieu Check FIX WEB\MH-QUANTUM-INSPECTOR`.
4. Chrome will instantly throw a manifest compile error complaining that `icons/icon16.png` does not exist.
5. Create dummy PNGs inside the `icons/` folder and reload; verify that the error disappears and the popup icon works.

### Step 2: Validate Unused Permissions
1. Under `chrome://extensions/`, inspect the background Service Worker console.
2. Paste the following snippet into the console to confirm that the `chrome.notifications` API has no event handlers and is never declared in code:
```javascript
console.log(chrome.notifications); // Check API existence
```
3. Update the manifest using `proposed_manifest_option_a.json` or `proposed_manifest_option_b.json`, reload the extension, and confirm that the extension successfully loads without these excessive permissions.

### Step 3: Local Packaging
1. Compress the designated production assets:
   - Zip command (pwsh):
     ```powershell
     Compress-Archive -Path manifest.json, background.js, content.js, inspector.css, utils, popup, icons -DestinationPath production-extension.zip
     ```
2. Unpack the generated zip file into a temporary directory and verify that no server-side components (like `server/` or `node_modules/`) are present.
