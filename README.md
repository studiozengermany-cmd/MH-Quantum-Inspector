# MH Quantum Inspector

> **Trạng thái:** công cụ cá nhân đang phát triển. Dự án được tạo để giúp Minh Hiếu quan sát giao diện web, lấy đúng ngữ cảnh kỹ thuật và giao việc cho AI rõ ràng hơn. Chưa phải sản phẩm thương mại và chưa được phát hành như một tiện ích ổn định cho mọi người dùng.

## Vì sao dự án này tồn tại?

Minh Hiếu bắt đầu từ nhu cầu thực tế chứ không bắt đầu từ việc đã biết lập trình. Khi làm việc với AI, một khó khăn lớn là mô tả đúng phần giao diện đang cần sửa: phần tử nào, kích thước ra sao, CSS nào đang tác động và mục tiêu muốn thay đổi là gì.

MH Quantum Inspector được xây dựng để giảm sự mơ hồ đó. Công cụ hỗ trợ chọn một phần tử trên trang web, thu thập ngữ cảnh DOM/CSS và chuyển thông tin thành nội dung có cấu trúc để người dùng hoặc AI hiểu đúng vấn đề hơn.

Mục tiêu cốt lõi không phải thay người dùng quyết định. Người dùng vẫn là người xác định cần làm gì; AI chỉ hỗ trợ rút ngắn các bước kỹ thuật và tiết kiệm thời gian.

## Vị trí trong hệ sinh thái MH

MH Quantum Inspector là lớp **quan sát và làm rõ** cho toàn bộ chuỗi dự án MH:

```text
MH Quantum Inspector
Quan sát giao diện, lấy ngữ cảnh, làm rõ yêu cầu cho AI
        ↓
MH-Dowsample
Thu thập, kiểm tra và chuẩn hóa sample
        ↓
MH FileOS
Lập chỉ mục, phân tích, sắp xếp và bảo vệ dữ liệu
        ↓
MH Sample FL
Tìm, nghe, ghi nhớ và sử dụng sample trong quy trình FL Studio
        ↓
MINH HIEU STUDIO
Ghi lại quá trình, chia sẻ kiến thức và đưa AI đến gần người dùng hơn
```

Các dự án này không phải những sản phẩm rời rạc. Chúng được phát triển theo một câu chuyện chung: quan sát rõ hơn, giảm việc lặp lại, bảo vệ dữ liệu, tối ưu quy trình sáng tạo và chia sẻ những gì đã học được.

## Chức năng hiện có trong source

- Chrome Extension Manifest V3.
- Chọn và kiểm tra phần tử trên trang web.
- Thu thập selector, kích thước, vị trí và một số computed styles.
- Tạo nội dung có cấu trúc để dùng khi mô tả lỗi, sửa CSS, giải thích hoặc refactor.
- Local MCP server bằng Node.js.
- Local HTTP sync bridge giữa extension và MCP server.
- Phím tắt để bật inspector và sao chép ngữ cảnh gần nhất.

## Giới hạn và cảnh báo quyền riêng tư

- Extension hiện khai báo `host_permissions` cho `<all_urls>` để có thể inspect trang đang mở. Người dùng cần tự xem xét quyền này trước khi cài.
- Công cụ có thể đọc cấu trúc và style của phần tử trên trang mà người dùng chủ động kiểm tra.
- MCP bridge chạy local tại `127.0.0.1` và mặc định dùng cổng `3747`.
- Payload gần nhất có thể được lưu trong file local của MCP server.
- Không nên dùng công cụ trên trang chứa thông tin nhạy cảm khi chưa hiểu rõ dữ liệu được thu thập.
- Repository chưa tuyên bố đã qua security audit, Chrome Web Store review hoặc kiểm thử đầy đủ trên mọi website.
- Không gọi giao diện đẹp hoặc demo thành công là bằng chứng công cụ đã sẵn sàng cho production.

## Cài đặt thử nghiệm

### 1. Nạp Chrome Extension

1. Mở `chrome://extensions/`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked**.
4. Chọn thư mục repository.
5. Ghim extension vào thanh công cụ nếu cần.

### 2. Chạy MCP server local

```bash
node mcp/mcp-server.js
```

Sau đó cấu hình AI IDE hoặc MCP client dùng command trên. Cách cấu hình cụ thể tùy từng phần mềm và có thể thay đổi theo phiên bản.

## Sử dụng cơ bản

1. Mở trang web cần kiểm tra.
2. Nhấn `Ctrl + Shift + X` hoặc `Cmd + Shift + X`.
3. Chọn phần tử cần xem.
4. Kiểm tra selector, box model, style và nội dung gợi ý.
5. Người dùng tự quyết định nội dung nào được đưa cho AI.

## Nguyên tắc của dự án

1. Người dùng quyết định mục tiêu; AI chỉ hỗ trợ thực hiện.
2. Ngữ cảnh phải đến từ dữ liệu thật, không bịa thông tin về giao diện.
3. Không tự nhận công cụ hoàn thiện khi chưa có kiểm thử.
4. Ưu tiên local, minh bạch dữ liệu và quyền kiểm soát của người dùng.
5. Làm cho nhu cầu cá nhân trước; chỉ chia sẻ rộng khi đủ rõ ràng và an toàn.

## Liên hệ

- Website: https://studiominhhieu.com/
- Email: support@studiominhhieu.com
- GitHub: https://github.com/studiozengermany-cmd
