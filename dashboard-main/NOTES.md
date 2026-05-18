# GHI CHÚ DỰ ÁN - DASHBOARD YCX
*Lần cập nhật cuối: 02/04/2026*

## 🚀 Các thay đổi hình thành gần nhất (Chưa Commit)
1. **Tự động nhắc tải dữ liệu Cloud**:
   - Tự động hiển thị popup chọn file trên Cloud (Drive History) vào thời điểm Admin/Manager vừa đăng nhập mà chưa có dữ liệu nào (`appState === 'upload'`). Tính năng delay 800ms để đảm bảo mượt mà.
   
2. **Cải thiện tính năng chọn file ở Drive History Modal**:
   - Thêm checkbox đọc-chỉ-định cho từng hàng (row) để người dùng bấm chọn rõ ràng hơn. 
   - Thay đổi trạng thái bị vô hiệu (disabled) của nút "Tải dữ liệu" thành màu xám nhạt để dễ nhận diện.

3. **Tính nhất quán của Lịch Doanh Thu (Calendar Heatmap)**:
   - Chuyển source dữ liệu hiển thị từ `calendarSourceData` sang `baseFilteredData`, đồng nghĩa các thao tác filter trên Cửa hàng / Ngành hàng / Trạng thái đều sẽ tác động ngược vào Lịch (Calendar).
   - Đã xử lý lỗi bị đè popup khi chọn tháng: set z-index lên z-[200].

4. **Biến động hệ thống Thẻ thông số (KPI Cards)**:
   - Loại trực tiếp Thẻ **GTĐH Mục Tiêu**.
   - Cấu hình lại giao diện KPI sang chế độ dàn 4 cột (`grid-cols-4`).

5. **Nguyên Tắc Cấu Hình Bất Biến (Luôn Ghi Nhớ):**
   - **TẠO BỘ LỌC NGÀNH HÀNG / NHÓM HÀNG TÙY ĐỘNG**: Tuyệt đối không lấy trực tiếp dữ liệu từ file Excel tải lên cho filter Ngành Hàng hay Nhóm Hàng ở bất cứ đâu trong dự án (Vì dễ gặp lỗi khoảng trắng, chữ hoa chữ thường, không đồng nhất).
   - *Quy tắc map (Ánh xạ)*: Bắt buộc lấy qua file Cấu Hình Google Sheet thông qua `productConfig`.
     - Ngành hàng tương đương `NhomCha` (`childToParentMap`)
     - Nhóm hàng tương đương `NhomCon` (`childToSubgroupMap`)
     - Phải map giá trị cột RAW `Nhóm Hàng` (tương đương với `NhomHang` key) qua `productConfig` để lấy ra đích xác kết quả ánh xạ rồi mới đem đi so khớp (`.includes`) với bộ lọc.

---

## 📋 Công việc tiếp theo dự định (TODO)
- [ ] Kiểm tra (Test) lại các tính năng trên tại môi trường Local trước khi đẩy code.
- [ ] Chạy lệnh Commit và Push để lưu trữ các thay đổi này lên nhánh `main`.
- [ ] (Điền thêm bất kỳ nhiệm vụ gì bạn muốn làm tiếp theo ở đây)

---
*💡 TIP: Bất cứ khi nào bạn bật lại dự án cùng AI trên IDE, bạn có thể đưa ID cuộc trò chuyện cũ hoặc chỉ cần mở file này bảo "hãy đọc file NOTES.md và làm tiếp các công việc còn dang dở giùm tôi".*
