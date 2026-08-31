import React from 'react';

// "Enterprise Tinh Gọn" — %HT/HQQĐ/%T.Góp/%B.Kèm và các cột trạng thái tương tự hiển thị
// dạng pill (viên thuốc) nền bán-trong-suốt thay vì chỉ tô chữ, dễ quét mắt hơn khi liếc
// nhanh nhiều dòng. Nhận màu hex trực tiếp từ các hàm tính màu hiện có (getHtColor,
// getDynamicColor...) — KHÔNG đổi logic ngưỡng màu ở bất kỳ đâu, chỉ bọc thêm nền mờ cùng
// tông. Dùng chung cho toàn bộ bảng trong features/bi-dashboard/ (Đợt 3 Lô 5).
export const Pill: React.FC<{ color?: string; children: React.ReactNode }> = ({ color, children }) => (
    <span
        className="inline-flex min-w-[42px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold"
        style={color ? { color, backgroundColor: `${color}1A` } : undefined}
    >
        {children}
    </span>
);
