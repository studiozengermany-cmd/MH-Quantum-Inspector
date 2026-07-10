import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

function fail(msg) {
  console.error(`❌ FAIL: ${msg}`);
  process.exit(1);
}

function pass(msg) {
  console.log(`✅ PASS: ${msg}`);
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT_DIR, relPath));
}

function checkSyntax(relPath) {
  if (!exists(relPath)) return;
  try {
    execSync(`node --check "${path.join(ROOT_DIR, relPath)}"`, { stdio: 'pipe' });
    pass(`Syntax OK: ${relPath}`);
  } catch (e) {
    fail(`Syntax Error in ${relPath}: ${e.message}`);
  }
}

console.log('🔍 Running Verify...');

// 1. manifest.json parseable and exists
const manifestPath = 'manifest.json';
if (!exists(manifestPath)) fail('manifest.json does not exist');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, manifestPath), 'utf8'));
  pass('manifest.json is valid JSON');
} catch (e) {
  fail(`manifest.json parse error: ${e.message}`);
}

// 2. Files referenced in manifest exist
const expectedFiles = [];
if (manifest.background?.service_worker) expectedFiles.push(manifest.background.service_worker);
if (manifest.action?.default_popup) expectedFiles.push(manifest.action.default_popup);
if (manifest.action?.default_icon) Object.values(manifest.action.default_icon).forEach(i => expectedFiles.push(i));
if (manifest.icons) Object.values(manifest.icons).forEach(i => expectedFiles.push(i));
if (manifest.content_scripts) {
  manifest.content_scripts.forEach(cs => {
    if (cs.js) cs.js.forEach(j => expectedFiles.push(j));
    if (cs.css) cs.css.forEach(c => expectedFiles.push(c));
  });
}

expectedFiles.forEach(file => {
  if (exists(file)) {
    pass(`File exists (from manifest): ${file}`);
  } else {
    fail(`File referenced in manifest not found: ${file}`);
  }
});

// 3. inspector.css tồn tại
if (exists('inspector.css')) {
  pass('inspector.css exists');
} else {
  fail('inspector.css does not exist');
}

// 4. Check syntax for ALL JS files
const filesToCheck = [
  'background.js',
  'content.js',
  'popup/popup.js',
  'utils/dom-crawler.js',
  'utils/prompt-generator.js',
  'utils/payload-schema.js',
  'mcp/mcp-server.js'
];
filesToCheck.forEach(file => {
  if (exists(file)) {
    checkSyntax(file);
  } else {
    fail(`File required for syntax check not found: ${file}`);
  }
});

// 5. mcp/mcp-server.js không được dùng console.log ra stdout
const mcpServerPath = 'mcp/mcp-server.js';
if (exists(mcpServerPath)) {
  const mcpContent = fs.readFileSync(path.join(ROOT_DIR, mcpServerPath), 'utf8');
  if (mcpContent.includes('console.log')) {
    fail('mcp/mcp-server.js uses console.log. It must only output JSON-RPC to stdout. Use console.error for logging.');
  } else {
    pass('mcp/mcp-server.js does not use console.log');
  }
}

// 6. package.json build phải trỏ đúng scripts/build.js
const packageJsonPath = 'package.json';
if (!exists(packageJsonPath)) fail('package.json missing');
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, packageJsonPath), 'utf8'));
} catch(e) {
  fail('package.json parse error');
}
if (pkg.scripts?.build === 'node scripts/build.js') {
  pass('package.json build script is correctly set');
} else {
  fail('package.json build script is not "node scripts/build.js"');
}

console.log('✅ All checks passed successfully.');
