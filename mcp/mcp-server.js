/**
 * MH-Quantum MCP Server (Stdio JSON-RPC + Local Sync Bridge)
 * Run: node mcp/mcp-server.js
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MHQ_PORT || 3747);
const DATA_FILE = join(__dirname, '.last-payload.json');

// --- In-memory Payload Cache ---
let currentPayload = null;
try {
  currentPayload = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
} catch (e) {
  // Ignored if file doesn't exist yet
}

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
  { name: 'mh_get_element_styles', description: 'Get computed styles of the last inspected element', inputSchema: { type: 'object', properties: {} } }
];

function generatePromptText(element, intent, template) {
  if (!element || !element.identity || !element.geometry) return "Invalid payload format.";
  const { identity, geometry, stacking, styles } = element;
  return `## MH-Quantum Element Context

**Selector:** \`${identity.selector}\`  
**Tag:** ${identity.tag} | **Size:** ${geometry.width}×${geometry.height}px  
**Position:** ${stacking.position} | **z-index:** ${stacking.zIndex}  
**Display:** ${stacking.display}

**Critical Styles:**
\`\`\`css
color: ${styles?.color || 'inherit'};
background: ${styles?.backgroundColor || 'transparent'};
font-size: ${styles?.fontSize || 'inherit'};
padding: ${styles?.padding || '0px'};
margin: ${styles?.margin || '0px'};
${styles?.transform && styles.transform !== 'none' ? `transform: ${styles.transform};` : ''}
\`\`\`

**Template:** ${template}${intent ? `\n**Intent:** ${intent}` : ''}`;
}

// --- STDIO JSON-RPC Server for Cursor/Claude ---
function sendJSONRPC(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

function handleMCPRequest(body) {
  const { method, params = {}, id } = body;

  if (method === 'initialize') {
    return { 
      jsonrpc: '2.0', 
      id, 
      result: { 
        protocolVersion: '2024-11-05', 
        capabilities: { tools: {} }, 
        serverInfo: { name: 'mh-quantum-inspector', version: '3.0.0' } 
      } 
    };
  }
  
  if (method === 'notifications/initialized') {
    return null; // No response needed
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
  }

  if (method === 'tools/call') {
    if (!currentPayload) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '⚠️ No element inspected yet. Use MH-Quantum Inspector Extension to inspect an element first (Ctrl+Shift+X).' }], isError: true } };
    }

    switch (params.name) {
      case 'mh_get_last_element':
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: generatePromptText(currentPayload.element, params.arguments?.intent, params.arguments?.template || 'debug') }] } };
      case 'mh_get_element_selector':
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Element selector: \`${currentPayload.element?.identity?.selector || 'unknown'}\`` }] } };
      case 'mh_get_element_styles': {
        const styles = currentPayload.element?.styles || {};
        const inline = currentPayload.element?.inlineStyles || 'none';
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `## Computed Styles\n\`\`\`json\n${JSON.stringify(styles, null, 2)}\n\`\`\`\n\n## Inline Styles\n\`\`\`css\n${inline}\n\`\`\`` }] } };
      }
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${params.name}` } };
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
}

// Start reading stdin for JSON-RPC
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const req = JSON.parse(line);
    const res = handleMCPRequest(req);
    if (res) sendJSONRPC(res);
  } catch (e) {
    // Write error to stderr to not corrupt JSON-RPC stdout stream
    console.error('JSON-RPC Parse Error:', e);
  }
});


// --- Internal HTTP Sync Bridge for Chrome Extension ---
// This runs in the background of the Node process spawned by Cursor
const syncBridge = createServer((req, res) => {
  // Allow CORS from Chrome Extension
  const origin = req.headers.origin;
  if (origin && origin.startsWith('chrome-extension://')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method === 'POST' && req.url === '/sync') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        currentPayload = JSON.parse(body);
        // Persist optionally
        writeFileSync(DATA_FILE, JSON.stringify(currentPayload, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Payload synced to MCP server' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload format' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Start the bridge on the specified port. Ignore EADDRINUSE if another instance is already running.
syncBridge.listen(PORT, '127.0.0.1').on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[MH-Quantum] Internal Sync Bridge port ${PORT} already in use. Assuming another instance is running.`);
  }
});
