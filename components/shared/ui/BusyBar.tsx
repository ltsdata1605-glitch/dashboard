import React, { useEffect, useRef, useState } from 'react';
import { cn } from './utils';

/**
 * THANH TIẾN TRÌNH MẢNH dùng chung cho việc tính lại ngầm (KE_HOACH_GIAO_DIEN_APPLE.md mục 3.13, lỗi #9 — 2026-10-11).
 *
 * Thay cho lớp chờ "ĐANG XỬ LÝ BỘ LỌC" phủ kín màn mỗi lần đổi bộ lọc: số cũ vẫn nằm trên màn, người dùng vẫn thao tác được
 * (kết quả lượt cũ tự bị bỏ khi có lượt mới — useDataManagement), chỉ một vạch 2px màu nhấn chạy ở mép trên màn hình, kiểu
 * thanh tải của Safari.
 *  - Chỉ hiện khi bận quá `delayMs` (mặc định 300 ms) → lượt tính nhanh không nháy gì cả.
 *  - Đã hiện thì giữ tối thiểu `minVisibleMs` để không chớp tắt.
 *  - Không chặn thao tác (`pointer-events: none`); trình đọc màn hình nghe "đang bận" qua `role="progressbar"` + `aria-label`.
 * Việc THẬT SỰ phải chặn (đang ghi file, đang nhập Excel lớn) vẫn dùng `<Overlay kind="busy">`.
 */
export interface BusyBarProps {
    active: boolean;
    /** Đọc cho trình đọc màn hình, ví dụ "Đang tính lại theo bộ lọc". */
    label: string;
    delayMs?: number;
    minVisibleMs?: number;
    className?: string;
}

export const BusyBar: React.FC<BusyBarProps> = ({ active, label, delayMs = 300, minVisibleMs = 400, className }) => {
    const [visible, setVisible] = useState(false);
    const shownAt = useRef(0);

    useEffect(() => {
        if (active) {
            if (visible) return;
            const t = setTimeout(() => { shownAt.current = Date.now(); setVisible(true); }, delayMs);
            return () => clearTimeout(t);
        }
        if (!visible) return;
        const t = setTimeout(() => setVisible(false), Math.max(0, minVisibleMs - (Date.now() - shownAt.current)));
        return () => clearTimeout(t);
    }, [active, visible, delayMs, minVisibleMs]);

    if (!visible) return null;
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-busy="true"
            data-busy-bar=""
            className={cn('ycx-busy-bar fixed inset-x-0 top-0 z-[1000001] h-0.5 pointer-events-none overflow-hidden', className)}
        >
            <div className="ycx-busy-bar__track h-full w-1/3 rounded-full bg-sky-600" />
        </div>
    );
};

export default BusyBar;
