# Sổ Ghi Ca

Web tĩnh ghi ca và tính lương cá nhân, dựa trên mẫu thiết kế xanh ngọc. Chạy trực tiếp bằng HTML, CSS, JavaScript; không cần PHP, database, tài khoản hay bước build.

## Chức năng

- Thêm, sửa, xóa ca làm; chọn Quán Cafe / Gia sư, nhập nơi làm, ngày và giờ.
- Tính giờ tự động, hỗ trợ ca qua nửa đêm, chọn nhanh hoặc nhập số giờ (quy đổi đến phút gần nhất).
- Tiền ca = lương giờ làm + phụ cấp 50% cho phần thời gian trong khung 00:00–06:00 + tiền tip. Quy tắc áp dụng cho cả ca kéo dài qua 0:00 và ca được nhập bắt đầu sau 0:00; phút lẻ được tính theo tỷ lệ và tổng tiền làm tròn đến đồng.
- Thống kê thu nhập, giờ làm và số ngày theo kỳ lương chốt ngày 25: lương tháng này gồm ca từ ngày 26 tháng trước đến hết ngày 25 tháng này. Nhiều ca cùng ngày chỉ tính một ngày; ca qua đêm được tính vào ngày bắt đầu.
- Lọc công việc. Thống kê đầu trang luôn tính cả tháng; CSV xuất theo bộ lọc hiện tại.
- Thay tên, giới thiệu, nơi làm và đơn giá mặc định trong Góc cá nhân (bấm tên/avatar).
- Lưu dữ liệu ngay trên thiết bị, xuất/nhập sao lưu JSON, xuất bảng lương CSV (UTF-8).
- Bản xem dữ liệu mẫu riêng, không tự thêm ca giả vào sổ thật.
- PWA: biểu tượng ứng dụng, màn hình độc lập, dùng ngoại tuyến sau lần tải thành công đầu tiên, thông báo cập nhật.

## Mở trên máy tính

Với XAMPP đang chạy Apache, mở **http://localhost/SoGhiCa/**.

Hoặc dùng Node.js 22+:

```sh
npm start
```

Mở **http://localhost:4173/SoGhiCa/**. Không mở `index.html` trực tiếp bằng `file://` vì JavaScript module và service worker cần web server.

## Đưa lên GitHub Pages

1. Tạo repository GitHub, ví dụ `SoGhiCa`.
2. Đưa các tệp trong thư mục này lên nhánh `main`; `index.html` phải ở thư mục gốc repository. Không tải `node_modules`, `.qa` hoặc bản sao lưu dữ liệu cá nhân lên GitHub.
3. Trong repository chọn **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Chọn **main** và **/(root)**, rồi **Save**.
5. Đợi GitHub triển khai và mở `https://TEN-GITHUB.github.io/SoGhiCa/`. Nếu repository dùng tên khác, dùng đúng đường dẫn GitHub cung cấp. Bật **Enforce HTTPS** nếu tùy chọn này xuất hiện.

Không cần chạy npm hoặc build để triển khai; toàn bộ đường dẫn tài nguyên đều tương đối và hỗ trợ thư mục con. `package.json`, `scripts/` và `tests/` chỉ phục vụ phát triển, không chứa dữ liệu ca thật.

Tài liệu: [GitHub Pages từ nhánh](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Cài trên iPhone / Android

**iPhone / iPad:** mở đường dẫn HTTPS bằng Safari → **Chia sẻ** (có thể nằm trong **Thêm …**) → **Thêm vào MH chính** → bật **Mở dưới dạng ứng dụng web** nếu có → **Thêm**. [Hướng dẫn Apple](https://support.apple.com/vi-vn/guide/iphone/iphea86e5236/ios).

**Android:** mở bằng Chrome → menu **⋮** → **Thêm vào màn hình chính / Cài đặt ứng dụng**, hoặc nút Cài đặt trong ứng dụng khi trình duyệt hỗ trợ.

Mở ứng dụng khi có mạng và kiểm tra mục **Cài lên điện thoại** báo “Đã sẵn sàng dùng ngoại tuyến” trước khi sử dụng không mạng. Cài trước khi bắt đầu ghi ca; dữ liệu trong Safari và ứng dụng màn hình chính có thể không dùng chung. Nếu sổ trống sau khi cài, xuất JSON từ Safari rồi nhập lại trong ứng dụng.

Đường dẫn HTTP trên mạng nội bộ (ví dụ `http://192.168...`) chỉ dùng để xem giao diện; cài PWA và offline cần HTTPS. `localhost` được cho phép để phát triển trên chính máy đang chạy server.

## Lưu và sao lưu

Dữ liệu ca chỉ nằm trong `localStorage` của trình duyệt/ứng dụng hiện tại, tách theo đường dẫn triển khai; không gửi lên GitHub hay máy chủ. Chưa có đồng bộ giữa các máy. Xóa dữ liệu trình duyệt, đổi trình duyệt/địa chỉ web hoặc chuyển máy có thể khiến sổ không còn truy cập được. Trình duyệt cũng có thể thu hồi dung lượng lưu trữ.

Bấm **Sao lưu dữ liệu → Tải bản sao lưu** để giữ file JSON. **Nhập bản sao lưu** kiểm tra định dạng và hỏi xác nhận trước khi thay thế dữ liệu hiện tại. File CSV dùng để xem bảng lương, không dùng để khôi phục. Khi không đọc/ghi được dữ liệu, ứng dụng báo lỗi và không báo lưu thành công; nội dung form đang nhập được giữ lại.

Khi nhiều cửa sổ cùng mở, thay đổi được cập nhật qua sự kiện `storage`. Tránh sửa cùng một ca đồng thời ở nhiều cửa sổ: bản lưu sau cùng sẽ được giữ lại.

## Cập nhật phiên bản

Sau khi sửa tệp ứng dụng, tăng phiên bản trong `CACHE_NAME` ở `sw.js` (ví dụ `v1` → `v2`) rồi đẩy lên GitHub. Lần mở lại có mạng, ứng dụng sẽ báo phiên bản mới và cho người dùng chủ động tải lại. Chỉ cache riêng của ứng dụng này được dọn dẹp; dữ liệu ca không nằm trong cache.

## Kiểm tra khi phát triển

```sh
npm test
npm run test:browser
```

Kiểm thử trình duyệt dùng Chrome hoặc Edge cài sẵn, không tải thêm thư viện. Có thể đặt `BROWSER_PATH` đến tệp thực thi trình duyệt nếu cần. `npm run test:browser` tự khởi động server và hồ sơ kiểm thử riêng trong `.qa`, kiểm tra desktop/điện thoại, lưu-sửa-xóa, lọc, sao lưu, offline và đường dẫn GitHub Pages. Kiểm tra cài đặt thực tế trên iPhone vẫn cần thiết bị thật.

Tạo lại icon PNG sau khi sửa `assets/icon.svg`: `node scripts/generate-icons.mjs`.
