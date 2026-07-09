# MH-Quantum Inspector — Chrome Extension MV3

Click any element → instant AI-ready context. Zero setup. Zero server.

## Load unpacked

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `mh-quantum-inspector/` folder
5. Press `Ctrl+Shift+X` / `Command+Shift+X` on any normal webpage

## Flow

```text
Ctrl+Shift+X → hover element → click → choose prompt → paste into your AI tool
```

## Keyboard Shortcuts

| Shortcut | Mac | Action |
|---|---|---|
| `Ctrl+Shift+X` | `⌘+Shift+X` | Toggle element inspector |
| `Ctrl+Shift+C` | `⌘+Shift+C` | Copy last inspected context to clipboard |

> **Tip:** After inspecting an element, use `Ctrl+Shift+C` to instantly copy the generated AI-ready context without reopening the popup.

## Optional MCP server

```bash
node mcp/mcp-server.js
```

Health check:

```bash
curl http://127.0.0.1:3747/health
```

> Note: the included MCP server stores payloads in `mcp/.last-payload.json`. Browser extensions cannot write to that file directly without a local bridge; use `mh_store_payload` or paste/export payloads when wiring deeper Cursor integration.
