<div align="center">
  <img src="icons/icon128.png" alt="MH-Quantum Logo" width="128" />
  <h1>MH-Quantum Inspector</h1>
  <p><strong>Awwwards-Tier Spatial Inspector & Real-Time MCP Bridge for AI IDEs</strong></p>
</div>

---

## ✦ Vision

MH-Quantum Inspector is an ultra-premium, agency-level Chrome Extension designed to bridge the gap between browser UI inspection and AI coding context (Cursor, Claude, etc.). Built with an uncompromising **"God-Tier" design philosophy** (Double-Bezel architecture, Cream/Beige palette, Spring Physics), this tool allows developers to instantly capture DOM structure, computed styles, and AI-ready prompts directly from the browser.

Created by **Minh Hieu Producer (Studio Zen Germany)**, MH-Quantum Inspector doesn't just extract data; it provides an unparalleled tactile and visual experience.

## 🎥 Demos

See MH-Quantum Inspector in action. The tool seamlessly captures UI context and feeds it directly into your AI workflow.

- **[Watch the Full Architecture Review](check/product-review-multi-scene.mp4)**  
  *(Real-time MCP integration, popup dashboard, and Cursor sync)*
- **[Watch the Quick Inspector Demo](check/product-review-final.mp4)**

*(Note: Videos are hosted directly in the repository under the `/check` directory).*

---

## ✦ Features

- **Spatial Inspector (Awwwards Level):** A floating, draggable context menu with a transparent double-bezel UI.
- **Deep DOM Crawling:** Accurately calculates true bounding boxes, extracts CSS, and ignores irrelevant shadow roots.
- **AI-Ready Prompt Generation:** Instantly outputs highly structured, context-rich prompts tailored for Claude, ChatGPT, or Cursor.
- **Real-Time MCP Sync:** A local Node.js Model Context Protocol (MCP) server that seamlessly syncs hovered elements directly to your IDE.

---

## ✦ Installation

### 1. Load the Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top right.
3. Click **Load unpacked** and select the `MH-QUANTUM-INSPECTOR` folder.
4. Pin the extension to your toolbar.

### 2. Connect to Cursor (MCP Sync)
To allow Cursor or Claude to read the UI you are inspecting in real time:
1. Open Cursor Settings > **MCP**.
2. Click **+ Add New MCP Server**.
3. Name: `MH-Quantum`
4. Type: `command`
5. Command:
   ```bash
   node path/to/MH-QUANTUM-INSPECTOR/mcp/mcp-server.js
   ```
*(You can also find this command beautifully formatted inside the extension's Popup Dashboard!)*

---

## ✦ Usage Guide

1. Go to any webpage you want to inspect.
2. Press **`Ctrl + Shift + X`** (or `Cmd + Shift + X` on Mac) to activate the Spatial Inspector.
3. Hover over elements to see the spring-physics overlay.
4. Click on an element. The Awwwards-tier floating inspector will appear with:
   - **Selector:** Exact CSS path and IDs.
   - **Layout:** A visual Box Model (Margin, Border, Padding).
   - **Styles:** The computed styles applied to the element.
   - **AI Prompt:** A one-click copyable prompt for your AI.
5. If the MCP Server is running, your Cursor IDE will instantly receive this context!

---

<div align="center">
  <p>Designed and engineered by <b>Minh Hieu Producer</b>.</p>
  <p><i>MH-Quantum © 2026 Studio Zen Germany. All rights reserved.</i></p>
</div>
