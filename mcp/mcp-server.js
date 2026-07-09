/**
 * MH-Quantum MCP Server
 * Run: node mcp/mcp-server.js
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MHQ_PORT || 3747);
const DATA_FILE = join(__dirname, '.last-payload.json');

const MCP_TOOLS = [
  {
    name: 'mh_get_last_element',
    description: 'Get the last inspected DOM element context from MH-Quantum Inspector',
    inputSchema: {
      type: 'object',
      properties: {
        template: { type: 'string', enum: ['debug', 'fix_css', 'accessibility', 'explain', 'refactor', 'animate'], default: 'debug' },
        intent: { type: 'string', default: '' }
      }
    }
  },
  { name: 'mh_get_element_selector', description: 'Get just the CSS selector of the last inspected element', inputSchema: { type: 'object', properties: {} } },
  { name: 'mh_get_element_styles', description: 'Get computed styles of the last inspected element', inputSchema: { type: 'object', properties: {} } },
  { name: 'mh_store_payload', description: 'Store an element payload from the Chrome Extension', inputSchema: { type: 'object', required: ['payload'], properties: { payload: { type: 'object' } } } }
];

function readPayload() {
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')); } catch (_) { return null; }
}

function handleMCPRequest(body) {
  const { method, params = {}, id } = body;

  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'mh-quantum-inspector', version: '3.0.0' } } };
  }
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
  if (method === 'tools/call') return handleToolCall(params.name, params.arguments || {}, id);
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
}

function handleToolCall(name, args, id) {
  let payload = readPayload();

  if (!payload && name !== 'mh_store_payload') {
    return successResponse(id, '⚠️ No element inspected yet. Use MH-Quantum Inspector Extension to inspect an element first (Ctrl+Shift+X).');
  }

  switch (name) {
    case 'mh_get_last_element':
      return successResponse(id, generatePromptText(payload.element, args.intent || '', args.template || 'debug'));
    case 'mh_get_element_selector':
      return successResponse(id, `Element selector: \`${payload.element?.identity?.selector || 'unknown'}\``);
    case 'mh_get_element_styles': {
      const styles = payload.element?.styles || {};
      const inline = payload.element?.inlineStyles || 'none';
      return successResponse(id, `## Computed Styles\n\`\`\`json\n${JSON.stringify(styles, null, 2)}\n\`\`\`\n\n## Inline Styles\n\`\`\`css\n${inline}\n\`\`\``);
    }
    case 'mh_store_payload':
      writeFileSync(DATA_FILE, JSON.stringify(args.payload, null, 2));
      return successResponse(id, '✅ Payload stored successfully');
    default:
      return errorResponse(id, `Unknown tool: ${name}`);
  }
}

function generatePromptText(element, intent, template) {
  const { identity, geometry, stacking, styles } = element;
  return `## MH-Quantum Element Context

**Selector:** \`${identity.selector}\`  
**Tag:** ${identity.tag} | **Size:** ${geometry.width}×${geometry.height}px  
**Position:** ${stacking.position} | **z-index:** ${stacking.zIndex}  
**Display:** ${stacking.display}

**Critical Styles:**
\`\`\`css
color: ${styles.color};
background: ${styles.backgroundColor};
font-size: ${styles.fontSize};
padding: ${styles.padding};
margin: ${styles.margin};
${styles.transform ? `transform: ${styles.transform};` : ''}
\`\`\`

**Template:** ${template}${intent ? `\n**Intent:** ${intent}` : ''}`;
}

function successResponse(id, text) {
  return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } };
}

function errorResponse(id, message) {
  return { jsonrpc: '2.0', id, error: { code: -32603, message } };
}

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

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method === 'GET' && req.url === '/health') { res.writeHead(200); res.end(JSON.stringify({ status: 'ok', version: '3.0.0' })); return; }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const response = handleMCPRequest(JSON.parse(body));
        res.writeHead(200);
        res.end(JSON.stringify(response));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON', details: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`⚡ MH-Quantum MCP Server running\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📡 Endpoint: http://127.0.0.1:${PORT}\n🔧 Tools:    ${MCP_TOOLS.length} available\n💾 Storage:  ${DATA_FILE}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nCursor/Claude config:\n{\n  "mcpServers": {\n    "mh-quantum": {\n      "command": "node",\n      "args": ["${join(__dirname, 'mcp-server.js')}"]\n    }\n  }\n}`);
});

export default server;
