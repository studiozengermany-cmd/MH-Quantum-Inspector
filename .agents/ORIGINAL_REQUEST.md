# Original User Request

## Initial Request — 2026-07-09T09:11:36Z

Deep audit & Chrome Web Store readiness review of **MH-Quantum Inspector** — a Chrome Extension (Manifest V3) that lets developers click any UI element to instantly generate AI-ready context prompts. The review must cover code quality, security, Chrome Web Store policy compliance, completeness, accessibility, UX, and identify all missing/broken pieces before publication. Additionally, produce a comprehensive report with actionable fix recommendations.

Working directory: j:\2. Minh Hieu Check FIX WEB\MH-QUANTUM-INSPECTOR
Integrity mode: development

## Requirements

### R1. Chrome Web Store Compliance Audit

Verify the extension meets all Chrome Web Store requirements for publication:
- `manifest.json` correctness and completeness (MV3 fields, required keys, version format)
- Permission justification — every permission in `permissions` and `host_permissions` must be necessary and justified; flag any over-requested permissions that may cause rejection
- Icon files: verify `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` exist and meet Chrome Web Store size/format requirements (PNG, correct dimensions)
- Content Security Policy compliance
- Privacy policy requirements (does the extension collect/transmit user data?)
- Missing store listing assets: description, screenshots, promotional images, category selection
- Compliance with Chrome Web Store Developer Program Policies (no remote code execution, no hidden functionality, no data exfiltration)

### R2. Code Quality, Security & Robustness Review

Review all JavaScript files across the entire project for:
- **Security**: XSS vulnerabilities in injected UI (context menu, overlay, toast), unsafe `innerHTML` usage, clipboard data handling, message passing validation, WebSocket security in transport layer, E2E cipher implementation correctness
- **Code quality**: Dead code, unused variables, inconsistent naming, missing error handling, race conditions in async flows
- **Robustness**: Edge cases in DOM crawling (iframes, shadow DOM, SVG elements), behavior on restricted pages (chrome://, file://), memory leaks in event listeners, proper cleanup on deactivation
- **Compatibility**: Cross-browser API usage, deprecated API calls, Manifest V3 service worker lifecycle handling (worker termination/restart)
- **Version mismatch**: `manifest.json` says version `3.0.0` but `package.json` says `2.1.0` — flag inconsistencies

### R3. Completeness & Missing Pieces Check

Identify everything that is missing or incomplete for a production-ready Chrome Extension:
- The `icons/` directory is **empty** — no icon files exist. This will cause Chrome to reject the extension
- Missing `_locales/` directory if internationalization is intended
- Missing `privacy_policy.html` or privacy policy URL
- Check if `index.html` (19KB) and `mhq.bundle.js` (64KB) are needed for the extension or are development-only artifacts
- Check if `server/`, `mcp/`, `logs/`, `node_modules/` should be excluded from the extension package (these are server-side components, not part of the browser extension)
- Verify the `popup/popup.html` popup works correctly and references the right assets
- Check if `renderer/shader/` directory has required shader files
- Verify all content script dependencies in manifest (`utils/dom-crawler.js`, `utils/prompt-generator.js`, `utils/payload-schema.js`, `content.js`) are correct and these files exist

### R4. UX, Accessibility & Polish Review

Review the user-facing experience:
- Popup UI (`popup/popup.html`, `popup/popup.css`, `popup/popup.js`) — layout, usability, responsiveness
- Context menu injected into pages — styling, positioning, z-index conflicts, dark/light theme handling
- Keyboard accessibility for all interactive elements
- Screen reader compatibility
- WCAG 2.1 AA compliance for injected UI elements
- Toast notification visibility and timing
- Keyboard shortcut discoverability and documentation

### R5. Produce Actionable Report

Generate a comprehensive, structured report that:
- Lists ALL issues found, categorized by severity (Critical/High/Medium/Low)
- Critical = will cause Chrome Web Store rejection or security vulnerability
- High = major functionality or quality issue
- Medium = should fix before release
- Low = nice to have improvement
- For each issue: description, file location, specific fix recommendation
- Summary checklist of "must fix before publishing" items
- Summary of what IS working well (positive findings)

## Acceptance Criteria

### Chrome Web Store Readiness
- [ ] All `manifest.json` fields validated against MV3 schema — report lists every missing/invalid field
- [ ] Every permission is justified or flagged as over-requested with explanation
- [ ] Icon file status verified (exist? correct size? correct format?)
- [ ] Privacy implications documented (does extension send data externally?)

### Security
- [ ] Every instance of `innerHTML` usage identified with XSS risk assessment
- [ ] All message passing endpoints validated for input sanitization
- [ ] E2E cipher implementation reviewed for cryptographic correctness
- [ ] No hardcoded secrets, API keys, or credentials found (or all flagged)

### Completeness
- [ ] Every file referenced in `manifest.json` verified to exist and be syntactically valid
- [ ] Files/directories that should NOT be in the extension package clearly listed
- [ ] Missing required files listed with creation recommendations

### Code Quality
- [ ] All JS files checked for syntax errors
- [ ] Dead code and unused exports identified
- [ ] Race conditions or async issues flagged
- [ ] Memory leak risks identified

### Report Quality
- [ ] Report contains at least 3 severity categories with issues in each
- [ ] Every issue includes: file path, line number (where applicable), description, fix recommendation
- [ ] Report includes a "Must Fix Before Publishing" checklist with no more than 15 items
- [ ] Report includes positive findings section
