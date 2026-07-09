# Project: MH-Quantum Inspector Audit & Chrome Web Store Readiness

## Architecture
MH-Quantum Inspector is a Chrome Extension (Manifest V3) that inspects DOM/CSS elements to generate AI-ready context prompts.
- **Frontend / Injected UI**: content.js (injected into target pages), handles selection box, DOM crawling, prompt generation.
- **Popup UI**: popup/ (popup.html, popup.js, popup.css), displays history, connection status, settings.
- **Service Worker / Background**: background.js, manages lifecycle, context menus, and communication with the MCP server.
- **Transport / Protocol**: core/ and transport/ layers managing secure WebSocket connection to an external MCP/Quantum server.
- **External Integration**: A local Node.js server (server/) and Model Context Protocol (mcp/) daemon.

## Code Layout
- `manifest.json`: Extension entry point & permissions.
- `background.js`: Service worker.
- `content.js`: Main content script injected into web pages.
- `popup/`: UI and scripts for the extension toolbar popup.
- `utils/`: Core utilities (DOM crawling, prompt generation, payload schema).
- `core/` / `transport/`: WebSocket communication and cryptographic wrappers.
- `server/` / `mcp/`: Server-side daemon / MCP server integration.
- `DESIGN.md`: Document detailing UI theme, typography, color palette.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | CWS Compliance Audit | Verify MV3 manifest, permissions, CSP, assets, policies | none | DONE |
| 2 | Code Security & Quality | Audit JS files for XSS, message passing, async safety, memory leaks | M1 | DONE |
| 3 | Completeness check | Verify file presence, identify dev-only artifacts and package exclusions | M1 | DONE |
| 4 | UX & Accessibility | Verify popup, injected UI, WCAG AA compliance, shortcuts | M2 | DONE |
| 5 | Synthesis & Audit Report | Compile final comprehensive report with actionable fixes & checklists | M1, M2, M3, M4 | DONE |

## Interface Contracts
- **Message passing**: Communication between popup, background, and content scripts via `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`.
- **WebSocket Protocol**: Secure WebSocket JSON-RPC communication between background.js/transport layer and the backend server.
