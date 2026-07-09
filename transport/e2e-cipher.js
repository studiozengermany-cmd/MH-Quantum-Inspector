// ============================================================
//  MH-QUANTUM — e2e-cipher.js (PATCHED v2.1)
//  BUG FIX:
//  [#1] Key mismatch — đồng bộ HKDF giữa client & server
//  [#2] Stack overflow — safe Base64 encoder
// ============================================================

const MHQCipher = (() => {

  let sharedKey = null;

  // ── [NEW] Safe Base64 encoder — Fix Bug #2 ──────────────
  // Không dùng spread operator → không overflow call stack
  // Safe với payload bất kỳ kích thước nào (ảnh, JSON lớn...)
  function _safeBytesToBase64(bytes) {
    let binary = "";
    const len  = bytes.byteLength;
    // Chunk 8192 bytes để tránh cả string concat overhead
    const CHUNK = 8192;
    for (let i = 0; i < len; i += CHUNK) {
      const slice = bytes.subarray(i, Math.min(i + CHUNK, len));
      for (let j = 0; j < slice.length; j++) {
        binary += String.fromCharCode(slice[j]);
      }
    }
    return btoa(binary);
  }

  // ── Generate ECDH key pair ───────────────────────────────
  async function generateKeyPair() {
    return crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]  // [FIX #1] deriveBits thay vì deriveKey
    );
  }

  // ── Export public key → base64 ───────────────────────────
  async function exportPublicKey(keyPair) {
    const raw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    // "raw" format = 65-byte uncompressed point (0x04 prefix)
    // Compatible với Node.js ecdh.generateKeys("buffer")
    return _safeBytesToBase64(new Uint8Array(raw));
  }

  // ── Import server's public key ───────────────────────────
  async function importServerPublicKey(b64) {
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey(
      "raw",
      raw,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []  // public key không cần usage
    );
  }

  // ── [PATCHED] Derive AES key — Fix Bug #1 ───────────────
  // Đồng bộ hoàn toàn với Node.js hkdfSync ở server:
  //   salt  = 32 bytes zero
  //   info  = "MHQ-AES-KEY" (UTF-8)
  //   hash  = SHA-256
  //   length = 256 bits
  async function deriveSharedKey(privateKey, serverPublicKey) {
    // Step 1: Lấy raw shared secret (256 bits = X coordinate)
    const rawSecretBits = await crypto.subtle.deriveBits(
      { name: "ECDH", public: serverPublicKey },
      privateKey,
      256
    );

    // Step 2: Import làm HKDF key
    const hkdfKey = await crypto.subtle.importKey(
      "raw",
      rawSecretBits,
      { name: "HKDF" },
      false,
      ["deriveKey"]
    );

    // Step 3: Derive AES-256-GCM — SAME params as server
    sharedKey = await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(32),                     // 32 bytes 0 — match server
        info: new TextEncoder().encode("MHQ-AES-KEY") // match server
      },
      hkdfKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    console.log("[MHQ Cipher] ✅ Shared key derived via HKDF-SHA256");
  }

  // ── [PATCHED] Encrypt — Fix Bug #2 ──────────────────────
  async function encrypt(plaintext) {
    if (!sharedKey) throw new Error("[MHQ] No shared key — handshake first");

    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const ct  = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      new TextEncoder().encode(plaintext)
    );

    return {
      iv:         _safeBytesToBase64(iv),                    // Fix #2
      ciphertext: _safeBytesToBase64(new Uint8Array(ct)),    // Fix #2
    };
  }

  // ── Decrypt ──────────────────────────────────────────────
  async function decrypt(iv_b64, ct_b64) {
    if (!sharedKey) throw new Error("[MHQ] No shared key");

    const iv = Uint8Array.from(atob(iv_b64), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ct_b64), (c) => c.charCodeAt(0));

    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      ct
    );
    return new TextDecoder().decode(pt);
  }

  function hasKey() { return sharedKey !== null; }

  function reset() {
    sharedKey = null;
    console.log("[MHQ Cipher] 🔑 Key reset");
  }

  return {
    generateKeyPair,
    exportPublicKey,
    importServerPublicKey,
    deriveSharedKey,
    encrypt,
    decrypt,
    hasKey,
    reset,
  };
})();
