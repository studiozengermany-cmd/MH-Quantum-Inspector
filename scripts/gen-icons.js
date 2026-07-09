// Generate minimal valid PNG icons for MH-Quantum Inspector
// Run: node scripts/gen-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const iconsDir = path.join(__dirname, "..", "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// CRC32 table
const crcTbl = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTbl[i] = c;
}
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) c = (c >>> 8) ^ crcTbl[(c ^ buf[n]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
};

function makePNG(w, h) {
  // Raw RGBA pixel data + filter byte
  const raw = Buffer.alloc(1 + w * h * 4);
  raw[0] = 0; // None filter
  for (let i = 1; i < raw.length; i += 4) {
    raw[i] = 0; raw[i+1] = 245; raw[i+2] = 255; raw[i+3] = 255; // #00f5ff cyan
  }
  const deflated = zlib.deflateSync(raw);

  const sig  = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const ihdrType = Buffer.from("IHDR");
  const ihdrData = Buffer.concat([ihdrType, ihdr]);
  const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13);
  const ihdrCrc = Buffer.alloc(4); ihdrCrc.writeUInt32BE(crc32(ihdrData));

  // IDAT
  const idatType = Buffer.from("IDAT");
  const idatData = Buffer.concat([idatType, deflated]);
  const idatLen = Buffer.alloc(4); idatLen.writeUInt32BE(deflated.length);
  const idatCrc = Buffer.alloc(4); idatCrc.writeUInt32BE(crc32(idatData));

  // IEND
  const iendLen = Buffer.alloc(4); iendLen.writeUInt32BE(0);
  const iendCrc = Buffer.alloc(4); iendCrc.writeUInt32BE(crc32(Buffer.from("IEND")));

  return Buffer.concat([sig, ihdrLen, ihdrType, ihdr, ihdrCrc, idatLen, idatType, deflated, idatCrc, iendLen, Buffer.from("IEND"), iendCrc]);
}

[16, 48, 128].forEach(s => {
  const p = path.join(iconsDir, `icon${s}.png`);
  fs.writeFileSync(p, makePNG(s, s));
  const st = fs.statSync(p);
  console.log(`✅ ${p} (${s}x${s}, ${st.size} bytes)`);
});
console.log("\n🎉 Icons ready! Load unpacked in chrome://extensions.");