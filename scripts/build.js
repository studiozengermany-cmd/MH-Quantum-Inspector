import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ZIP_NAME = 'mh-quantum-inspector-v3.0.0.zip';
const ZIP_PATH = path.join(DIST_DIR, ZIP_NAME);

// The whitelist of files/folders to include in the extension package
const INCLUDE = [
  'analyzer',
  'core',
  'fonts',
  'icons',
  'popup',
  'transport',
  'utils',
  '_locales',
  'background.js',
  'content.js',
  'manifest.json',
  'privacy_policy.html',
  'README.md',
  'inspector.css'
];

console.log('📦 Bắt đầu đóng gói Extension...');

// 1. Run Verification First
try {
  console.log('--- Chạy Verify ---');
  execSync('node scripts/verify-build.js', { stdio: 'inherit', cwd: ROOT_DIR });
  console.log('-------------------\n');
} catch (e) {
  console.error('❌ Verify thất bại, hủy quá trình build.');
  process.exit(1);
}

// 2. Prepare dist folder
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}
if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
}
const TEMP_DIR = path.join(DIST_DIR, 'temp-build');
if (fs.existsSync(TEMP_DIR)) {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_DIR);

// 3. Copy files to Temp Dir
console.log('📋 Đang copy file...');
INCLUDE.forEach(item => {
  const src = path.join(ROOT_DIR, item);
  const dest = path.join(TEMP_DIR, item);
  
  if (fs.existsSync(src)) {
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  } else {
    console.warn(`⚠️ CẢNH BÁO: Không tìm thấy ${item}`);
  }
});

// 4. Zip using PowerShell (built-in on Windows)
console.log('🗜️ Đang nén file...');
try {
  // Use PowerShell Compress-Archive
  const psCommand = `Compress-Archive -Path '${TEMP_DIR}/*' -DestinationPath '${ZIP_PATH}' -Force`;
  execSync(`powershell.exe -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });
  
  console.log(`\n✅ Build hoàn tất thành công!`);
  console.log(`📂 File ZIP: ${ZIP_PATH}`);
} catch (e) {
  console.error('\n❌ Lỗi khi nén file zip:', e.message);
} finally {
  // Cleanup temp
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}
