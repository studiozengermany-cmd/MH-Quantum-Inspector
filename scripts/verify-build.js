import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

console.log('🚀 Bắt đầu Verify Build...');

let hasError = false;
function fail(msg) {
  console.error(`❌ LỖI: ${msg}`);
  hasError = true;
}
function ok(msg) {
  console.log(`✅ OK: ${msg}`);
}

// 1. Check Manifest
const manifestPath = path.join(ROOT_DIR, 'manifest.json');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  ok('manifest.json hợp lệ (valid JSON)');
} catch (e) {
  fail('manifest.json không hợp lệ hoặc không tồn tại!');
  process.exit(1);
}

// 2. Check required files from manifest
const filesToCheck = [];

// Icons
if (manifest.icons) {
  Object.values(manifest.icons).forEach(file => filesToCheck.push(file));
}
// Action / Popup
if (manifest.action && manifest.action.default_popup) {
  filesToCheck.push(manifest.action.default_popup);
}
// Background
if (manifest.background && manifest.background.service_worker) {
  filesToCheck.push(manifest.background.service_worker);
}
// Content Scripts
if (manifest.content_scripts) {
  manifest.content_scripts.forEach(cs => {
    if (cs.js) cs.js.forEach(file => filesToCheck.push(file));
    if (cs.css) cs.css.forEach(file => filesToCheck.push(file));
  });
}
// Locales
filesToCheck.push('_locales/en/messages.json');

console.log('\n🔍 Kiểm tra các file tham chiếu...');
let missingFiles = 0;
filesToCheck.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    fail(`File không tồn tại: ${file}`);
    missingFiles++;
  }
});
if (missingFiles === 0) {
  ok('Tất cả file tham chiếu trong manifest đều tồn tại');
}

// 3. Check code for console.log / debugger
console.log('\n🔍 Quét mã nguồn...');
function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git', 'mcp', 'server', 'dist'].includes(file)) {
        scanDir(fullPath);
      }
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('debugger;')) {
        console.warn(`⚠️ CẢNH BÁO: Tìm thấy 'debugger' trong file ${path.relative(ROOT_DIR, fullPath)}`);
      }
    }
  }
}
scanDir(ROOT_DIR);
ok('Quét mã nguồn hoàn tất');

if (hasError) {
  console.error('\n💥 Kiểm tra thất bại! Vui lòng fix các lỗi trên trước khi build.');
  process.exit(1);
} else {
  console.log('\n🎉 Mọi thứ đều ổn! Sẵn sàng để build.');
}
