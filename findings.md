# Phát hiện & Ghi chú Kỹ thuật (Findings)

## 1. Cấu trúc dữ liệu Thi đua
- Mỗi chương trình thi đua (`ProcessedProgram`) có:
  - `name`: Tên chương trình
  - `metric`: Tiêu chí gốc (`SLLK`, `DTLK`, `DTQĐ`)
  - `data`: Mảng giá trị theo `headers`
  - `conLai`: Giá trị còn lại (được tính động dựa vào các cột hiển thị)
- Cột Thực hiện:
  - Realtime: Cột có tên bắt đầu bằng `Realtime` hoặc `THỰC HIỆN`
  - Luỹ kế: Cột có tên bắt đầu bằng `L.Kế` hoặc `LUỸ KẾ`
- Cột Target:
  - Chế độ Vượt trội: `Target V.Trội`
  - Chế độ Thường: `Target`

## 2. Nhóm tiêu chí
- `groupingMode === 'default'`: Gom nhóm theo tiêu chí gốc (`SLLK`, `DTLK`, `DTQĐ`).
- `groupingMode === 'configured'`: Gom nhóm theo nhóm tuỳ chỉnh (`DỊCH VỤ`, `P.KIỆN - Đ.HỒ`, `CE`, `ICT`, `GIA DỤNG`...).
- `groupedAndSortedPrograms` trong `CompetitionView.tsx` chứa sẵn cấu trúc Record<groupKey, ProcessedProgram[]>.

## 3. Sticker & Icon sinh động
- Nhóm sticker:
  - Xuất sắc / Về đích: 🏆 🥇 🚀 👏 💎
  - Sát nút / Tăng tốc: ⚡ 🔥 🏃 🎯 💪
  - Cần nỗ lực / Cảnh báo: ⚠️ 🚨 ⏳ 📢
- Nhóm biểu tượng ngành hàng:
  - Dịch vụ / SIM: 📱 💳
  - Phụ kiện / Đ.Hồ: 🎧 ⌚
  - Gia dụng: 🍳 🍲 🫕
  - Điện tử / Điện lạnh CE: 📺 ❄️
  - Công nghệ ICT: 💻 📱
  - SLLK: 📦
  - DTLK: 💰
  - DTQĐ: ⭐
