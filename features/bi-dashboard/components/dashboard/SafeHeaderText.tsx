import React from 'react';

/**
 * Render 1 chuỗi tiêu đề cột có thể chứa dấu ngắt dòng "<br/>" (từ bảng ánh xạ tên cột CỐ ĐỊNH
 * trong code) MÀ KHÔNG BAO GIỜ diễn giải phần còn lại của chuỗi là HTML.
 *
 * Trước đây các bảng Report BI dùng `dangerouslySetInnerHTML={{ __html: mapping[h] || h }}` —
 * khi tên cột không khớp bảng ánh xạ cố định (luôn xảy ra với BẤT KỲ chương trình/cột nào chưa
 * được liệt kê sẵn), chuỗi THÔ `h` — đọc trực tiếp từ dữ liệu Thi đua/Báo cáo Tổng hợp mà người
 * dùng DÁN VÀO — được render thẳng làm HTML. Một chuỗi như `<img src=x onerror=alert(1)>` dán
 * vào ô "tên chương trình" sẽ chạy ngay trên trang (XSS lưu trữ). Xem KE_HOACH_TONG_THE.md mục 2.3.
 *
 * Cách làm an toàn: CHỈ tách chuỗi theo đúng dấu phân cách "<br/>" bằng `String.split` (không
 * parse HTML), rồi chèn phần tử `<br/>` THẬT giữa các đoạn. Mọi ký tự khác — kể cả HTML độc hại —
 * luôn đi qua làm children React (React tự động escape), không đường nào chạm dangerouslySetInnerHTML.
 */
export function renderHeaderText(text: string): React.ReactNode {
    if (!text.includes('<br/>')) return text;
    const parts = text.split('<br/>');
    return parts.map((part, i) => (
        <React.Fragment key={i}>
            {i > 0 && <br />}
            {part}
        </React.Fragment>
    ));
}
