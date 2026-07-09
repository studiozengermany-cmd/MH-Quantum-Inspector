# UX, Accessibility & Polish Audit (R4) - Handoff Report

## 1. Observation

### A. Popup UI vs. Design System Compliance (DESIGN.md)
* **Theme Color Mismatch:** `popup/popup.css` lines 1–11 defines a Light Mode palette:
  ```css
  :root {
    --charcoal: #0F1115;
    --steel: #6B7280;
    --warm-white: #F7F5F2;
    --pure-white: #FFFFFF;
    --electric-blue: #2563EB;
    --blue-hover: #1D4ED8;
    --border-color: #E5E7EB;
    --bg-alt: #F9FAFB;
    --success: #10B981;
  }
  ```
  This violates `DESIGN.md` line 10 ("Abyss Black (`#0A0A0A`) — Primary background surface for the popup"), line 12 ("Zinc Ink (`#FFFFFF`) — Primary text"), and line 15 ("Quantum Cyan (`#00F5FF`) — The ONLY accent color").
* **Popup Dimension Mismatch:** `popup/popup.css` lines 16–17:
  ```css
  body {
    ...
    width: 400px;
    height: 600px;
  ```
  This violates `DESIGN.md` line 28: "Popup Container: 340px fixed width".
* **Missing Glassmorphism & Shadow:** `popup/popup.css` does not contain `backdrop-filter: blur(20px)` or the shadow `0 20px 60px rgba(0,0,0,0.8)` on the popup container (violates `DESIGN.md` line 28).
* **Missing Font Loading:** `popup/popup.html` lines 7–9 loads Inter and JetBrains Mono, but lacks `Geist` (violates `DESIGN.md` lines 22–23).
* **Missing Button Styles & Micro-interactions:** `popup/popup.css` lines 254–265 styles `.primary-btn` and `.secondary-btn` using solid blue (`#2563EB`) and white (`#FFFFFF`) backgrounds. There are no styles or active state transformations (`transform: scale(0.98)` / `-1px` translate) for buttons in `popup.css` (violates `DESIGN.md` lines 29, 40, 42).
* **Missing MCP Status Indicator:** There is no HTML element in `popup/popup.html` representing the MCP status indicator or dot, which violates `DESIGN.md` line 30. In `popup/popup.js` line 27, a comment notes:
  ```javascript
  // If we had a global status indicator we'd update it here.
  ```

### B. Popup Usability Bugs
* **Broken Pin Window Button:** `popup/popup.html` lines 21–23 contains:
  ```html
  <button class="icon-btn" title="Pin window" id="btn-pin">
  ```
  But `popup/popup.js` does not bind any event listener to `#btn-pin` (see `bindEvents` in `popup/popup.js` lines 148–199). Clicking the pin button does nothing.
* **Non-Responsive Installation Welcome Tab:** `background.js` line 85 opens the popup in a browser tab during installation:
  ```javascript
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') + '?welcome=1' });
  ```
  Because `popup/popup.css` defines a fixed size of `width: 400px; height: 600px;` with no responsive rules, it renders as a small card aligned to the top-left of a blank web page instead of a centered, responsive welcome interface.

### C. Injected UI Styling & Integration Bugs
* **Lack of Shadow DOM Isolation:** The content script elements `#mhq-overlay`, `#mhq-tooltip`, `#mhq-context-menu`, and `#mhq-toast` are appended directly to the host document's root element (`content.js` lines 36, 61, 291). Host page stylesheets can override or corrupt the extension's UI.
* **Missing `!important` on Inline Injected Styles:** `content.js` lines 23–35, 42–60, and 275–290 inject CSS inline but do not use `!important` suffixes (e.g. `border: 2px solid #00f5ff` in line 29). This allows host page stylesheets with `!important` rules to override and break the inspector styling.
* **Inspector Context Menu Dismissal Bug:** `content.js` lines 222–224:
  ```javascript
  function onOutsideClick(e) {
    if (!STATE.contextMenu?.contains(e.target)) removeContextMenu();
  }
  ```
  Clicking outside the context menu removes the menu container but does not call `deactivate()`. This leaves the cursor as a `crosshair` and keeps the inspector active in the background, which is highly unintuitive since the inspector interface has vanished.
* **Tooltip Right-Edge Clipping:** `content.js` lines 84–86 bounds the tooltip's coordinates:
  ```javascript
  const ttTop = rect.top > 30 ? rect.top - 28 : rect.bottom + 4;
  STATE.tooltip.style.top = `${Math.max(8, ttTop)}px`;
  STATE.tooltip.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 20))}px`;
  ```
  Because this calculation bounds the *left* edge of the tooltip by `window.innerWidth - 20`, it does not account for the width of the tooltip itself. For elements on the right edge of the viewport, the tooltip clips off the screen.
* **Missing CSS Class Mapping (Local UI):** `ui/contextual-popup.js` lines 47–48 defines action buttons:
  ```html
  <button id="mhq-popup-send">⚡ Gửi cho AI</button>
  <button id="mhq-popup-cancel">✕</button>
  ```
  But `ui/mh-quantum.css` lines 356–375 styles them using classes:
  ```css
  .mhq-btn-send { ... }
  .mhq-btn-cancel { ... }
  ```
  Since the classes are not applied to the HTML, the buttons render without primary or cancel coloring.

### D. Keyboard Accessibility & Screen Reader (WCAG 2.1 AA) Compliance
* **Violations of SC 4.1.2 Name, Role, Value:**
  * The copy selector button `btn-copy-icon` (`popup/popup.html` line 58) contains only an SVG child and no `aria-label` or text.
  * The close icon button `btn-close` and pin button `btn-pin` (`popup/popup.html` lines 21–26) lack `aria-label` attributes (using only visual `title` attributes).
  * The context menu close button `#mhq-close` (`content.js` line 167) contains `✕` but lacks an `aria-label`.
  * The tab navigation (`popup/popup.html` lines 31–36) uses standard `<button>` tags without ARIA attributes (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` or `role="tabpanel"`).
* **Violations of SC 1.3.1 Info and Relationships:**
  * Select input `prompt-template-select` (`popup/popup.html` line 129), `mhq-intent` (`content.js` line 178), and `mhq-popup-intent` (`ui/contextual-popup.js` line 38) lack associated `<label>` elements or `aria-label` attributes.
* **Violations of SC 4.1.3 Status Messages:**
  * Toast elements (`#toast` in `popup/popup.html` and `#mhq-toast` in `content.js`) lack `role="status"` or `aria-live="polite"`, preventing screen readers from announcing successful copy notifications.
* **Inaccessible Keyboard Focus & Traps:**
  * When the injected context menu is opened, focus is not moved into the menu container. Keyboard users must tab-cycle through the entire host webpage.
  * There is no focus trap within the injected context menu container, so focus leaks back into the page.
  * In local UI, the quick intent chips (`ui/contextual-popup.js` lines 61–71) are generated as `<span>` tags without `tabindex` or keyboard listeners, making them unreachable by keyboard-only users.
* **Violations of SC 1.4.3 Contrast (Minimum):**
  * The light theme text `--steel: #6B7280` on `#FFFFFF` background has a contrast of **4.0:1** (below the **4.5:1** requirement).
  * In the injected context menu: `.mhq-menu-sel` (`color: rgba(255,255,255,0.4)` on `#0d0d14` background) has a contrast of **3.4:1**.
  * In the injected context menu: `.mhq-section-label` (`color: rgba(255,255,255,0.2)` on `#0d0d14` background) has a contrast of **1.7:1**.

### E. Toast Notification Timing
* **Violation of SC 2.2.1 Timing Adjustable:**
  * Toast timeouts in `popup/popup.js` line 218 (`setTimeout(() => { toast.hidden = true; }, 2500)`) and `content.js` line 292 (`setTimeout(() => toast.remove(), 2500)`) are fixed to `2.5 seconds`. This is too fast for users with reading or cognitive difficulties to notice and process.

### F. Keyboard Shortcut Discoverability & Emojis
* **Undocumented Command:** The keyboard shortcut `Ctrl+Shift+C` / `Command+Shift+C` (`copy-last-context`) is registered in `manifest.json` lines 49–55 and handled in `background.js` line 27, but is completely undocumented in the popup UI and `README.md`.
* **Emojis in Production UI:** Emojis are used inside context menu items (`content.js` lines 171–184) and context menu titles (`background.js` lines 74, 80). This violates `DESIGN.md` line 48: "NO emojis in the final production UI (replace with sharp SVG icons like Lucide or Radix Icons)."

---

## 2. Logic Chain

1. **Popup UI Design Violation:** Since `popup.css` implements light background colors (e.g. `#FFFFFF` and `#F9FAFB`) and blue accent colors (`#2563EB`), it directly contradicts the mandated clinical dark cockpit theme (Abyss Black `#0A0A0A`, Quantum Cyan `#00F5FF`) documented in `DESIGN.md`.
2. **Missing Component / Feature:** Because the popup HTML is missing any status container, and `popup.js` contains a fallback comment, the MCP status pulse indicator specified in the design guide is completely omitted.
3. **Broken Feature:** Since `popup.js` lacks an event binding for `#btn-pin`, the header Pin button behaves as a dead control.
4. **Style Pollution Vulnerability:** Appending raw elements into the host document without a Shadow DOM or `!important` suffixes on inline rules allows host page styles to override and break the inspector overlays.
5. **A11y/WCAG Compliance Failure:**
   * Icon buttons with no text and no `aria-label` violate SC 4.1.2 because screen readers have no text alternative to read.
   * Dynamic toast content appended to the page without `role="status"` or `aria-live` violates SC 4.1.3 because assistive technologies are not notified of visual changes.
   * Tab list markup lacking ARIA roles forces screen readers to treat tabs as generic button links, violating structural navigation standards.
6. **Undocumented Command:** The mismatch between the defined shortcuts in `manifest.json` and the documentation in `README.md` / `popup.html` prevents users from discovering the automated copy functionality.

---

## 3. Caveats
* The WebGL/Canvas visual rendering (`renderer/*`) was audited via source files but could not be visually run on a real browser during this read-only exploration step.
* Alternative keyboard patterns (such as standard focus outlines for focusable elements) were evaluated purely via CSS properties and HTML attributes.

---

## 4. Conclusion
The MH-Quantum Inspector extension currently has several critical UX, layout, and WCAG AA accessibility bugs. 
The popup UI is built as a Light Mode interface in direct violation of the dark cockpit Design System (`DESIGN.md`). Key features like the Pin Window action are dead, and the MCP status dot is completely missing.
The injected inspector UI is highly vulnerable to CSS style pollution from host pages.
Furthermore, multiple screen reader violations (unlabeled buttons, missing `aria-live` roles) and keyboard traps make the extension non-compliant with WCAG 2.1 AA guidelines.

---

## 5. Verification Method

### A. Manual Inspections
1. **Verify popup theme and markup:**
   * Inspect `popup/popup.css` (lines 1–23) to confirm the light mode variables and the fixed 400px width.
   * Inspect `popup/popup.html` (lines 21, 58) to verify that `#btn-pin` and `.btn-copy-icon` do not have `aria-label` properties.
2. **Verify context menu and toast timeout:**
   * Check `content.js` (lines 211–220) to confirm the window close handlers, and verify that `onOutsideClick` does not call `deactivate()`.
   * Check `popup/popup.js` (line 218) and `content.js` (line 292) to verify the `2500ms` setTimeout durations.
3. **Verify CSS class mapping in local UI:**
   * Check `ui/contextual-popup.js` (lines 47–48) and compare the button IDs against the classes defined in `ui/mh-quantum.css` (lines 356–375).

### B. Automated checks
* Run syntax verification:
  ```bash
  npm run verify
  ```
  *(Confirms all files are present and syntactically valid JS, but does not validate visual design system compliance).*
