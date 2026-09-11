import React from 'react';

/**
 * Ô số có mã màu theo ngưỡng (%HT, HQQĐ, %T.Góp, %B.Kèm và các cột trạng thái tương tự).
 *
 * 2026-09-11 — chuẩn "Bảng điều khiển ca trực": **tô CHỮ, không tô NỀN**.
 *
 * Lý do cũ (Đợt 3 Lô 5) là: *"pill nền bán-trong-suốt thay vì chỉ tô chữ, dễ quét mắt hơn khi
 * liếc nhanh nhiều dòng"*. Lý do đó không sai, nhưng chuẩn mới chọn hướng khác và quan trọng hơn
 * là chọn MỘT hướng: ở bảng dày, mỗi ô có nền riêng làm mặt bảng vỡ thành hàng chục mảng màu, mắt
 * nhảy theo mảng thay vì đọc theo dòng. Màu nay dành cho chữ số và cho vạch trạng thái ở mép dòng.
 *
 * Giữ `min-width` để các cột % vẫn thẳng hàng — đó là phần có ích thật của bản cũ.
 *
 * ⚠️ KHÔNG đổi logic ngưỡng màu ở bất kỳ đâu. Component này chỉ nhận màu hex đã tính sẵn từ
 * `getHtColor` / `getDynamicColor`; đổi ngưỡng là việc của những hàm đó.
 */
export const Pill: React.FC<{ color?: string; children: React.ReactNode }> = ({ color, children }) => (
    <span
        className="inline-flex min-w-[42px] items-center justify-center px-1 text-[12px] font-bold tabular-nums"
        style={color ? { color } : undefined}
    >
        {children}
    </span>
);
