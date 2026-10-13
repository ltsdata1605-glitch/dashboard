
import React from 'react';
import { Switch as SwitchChung } from '../../../../components/shared/ui/Switch';

// Công tắc của Report BI = công tắc DÙNG CHUNG (GĐ6, 2026-10-13 — trước là bản tự vẽ 28×16 màu sky, lệch kiểu với phần còn lại
// của app; KE_HOACH_GIAO_DIEN_APPLE.md lỗi #16). Giữ chữ ký cũ `onChange: () => void` cho 9 nơi gọi. Bản dùng chung đã tự chặn
// nổi bọt (cần cho Bộ lọc bảng Thi đua: công tắc nằm TRONG một <div onClick> bật/tắt cả dòng).
export const Switch: React.FC<{ checked: boolean; onChange: () => void; id?: string }> = ({ checked, onChange, id }) => (
    <SwitchChung checked={checked} onChange={() => onChange()} id={id} size="sm" />
);

export const ProgressBar: React.FC<{ value: number; customColorClass?: string }> = ({ value, customColorClass }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);

    let colorClass = customColorClass;
    if (!colorClass) {
        colorClass = 'bg-sky-500';
        if (value >= 100) colorClass = 'bg-emerald-500';
        else if (value < 100) colorClass = 'bg-amber-500';
        if (value < 50) colorClass = 'bg-rose-500';
    }

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div
                className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${displayPercentage}%` }}
            ></div>
             {percentage > 100 && (
                <div
                    className="absolute top-0 left-0 h-full bg-emerald-300 rounded-full"
                    style={{ width: `${Math.min(percentage - 100, 100)}%` }}
                ></div>
             )}
        </div>
    );
};
