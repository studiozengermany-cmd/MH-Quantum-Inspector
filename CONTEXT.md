# CONTEXT — MH-Quantum-Inspector

> **HƯỚNG DẪN:** Dán file này vào đầu phiên khi làm việc với repo này.
> Đọc thêm `CONTEXT-SNAPSHOT.md` từ repo Master Memory để biết trạng thái toàn bộ hệ sinh thái.
> Lần cập nhật gần nhất: 2026-07-21 | Cập nhật bởi: Notion AI

---

## 1. DỰ ÁN LÀ GÌ

**Tên:** MH Quantum Inspector
**Loại:** Chrome Browser Extension
**Mục đích:** Tool kiểm tra chất lượng audio — phân tích và inspect tín hiệu âm thanh
**Stack kỹ thuật:** Vanilla JS + Chrome Extension API (Manifest V3)

---

## 2. CẤU TRÚC REPO

```
MH-Quantum-Inspector/
├── manifest.json     # Chrome extension config (Manifest V3)
├── content.js        # Content script (inject vào trang web)
├── background.js     # Service worker
├── popup/            # Extension popup UI
├── analyzer/         # Logic phân tích audio
├── check/            # Kiểm tra chất lượng
├── utils/            # Utilities
├── mcp/              # MCP integration
├── AUDIT_REPORT.md   # Báo cáo audit
├── DESIGN.md         # Thiết kế hệ thống
├── PROJECT.md        # Mô tả dự án
├── TODO.md           # Việc cần làm
└── CONTEXT.md        # File này
```

---

## 3. TRẠNG THÁI HIỆN TẠI (2026-07-21)

- **Tiến độ:** ⚪ Chờ — chưa rõ trạng thái active
- **Xem thêm:** `PROJECT.md` và `TODO.md` để biết việc cần làm
- **Audit report:** `AUDIT_REPORT.md` chứa báo cáo kiểm tra gần nhất

---

## 4. TÀI SẢN ĐANG KHÓA

- **Tên sản phẩm:** MH Quantum Inspector
- **Màu + style:** Tuân theo `PRODUCT-UI-STANDARD.md` trong Master Memory repo
- **Manifest version:** V3 — không hạ xuống V2

---

## 5. QUY TẪC LÀM VIỆC TRONG REPO NÀY

1. Đọc `DESIGN.md` trước khi thay đổi kiến trúc
2. Đọc `TODO.md` trước khi bắt đầu phiên mới
3. Không thay đổi `manifest.json` mà không kiểm tra backward compatibility
4. Mọi thay đổi lớn: tạo branch mới, không push thẳng main
5. Sau khi release, cập nhật `CONTEXT-SNAPSHOT.md` ở repo Master Memory

---

## 6. LIÊN KẾT QUAN TRỌNG

- **Master Memory repo:** https://github.com/studiozengermany-cmd/MH-Master-Memory-AI-Ecosystem
- **CONTEXT-SNAPSHOT:** https://github.com/studiozengermany-cmd/MH-Master-Memory-AI-Ecosystem/blob/main/CONTEXT-SNAPSHOT.md
- **Notion Hub:** Projects → MH Master Memory — Notion AI Hub

---

*File này do Notion AI tạo và duy trì. Cập nhật khi có thay đổi lớn về kiến trúc, trạng thái, hoặc scope.*
