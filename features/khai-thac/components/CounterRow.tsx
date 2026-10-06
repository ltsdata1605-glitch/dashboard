import React from 'react';
import { resolveIconName } from '../../../components/shared/ui/icon/legacyIconNames';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';

interface CounterRowProps {
    icon: string;
    label: string;
    value: number;
    onChange: (next: number) => void;
    /** Mục tuỳ chỉnh có nút xoá. */
    onDelete?: () => void;
}

/**
 * Một mục đếm số lượng: icon · tên · [−] số [+] — LUÔN trên một dòng (chủ dự án chốt 2026-09-21,
 * bỏ bố cục 2 tầng trên điện thoại). Số khác 0 tô màu nhấn để liếc qua thấy ngay mục nào đã bán.
 *
 * Mỗi nhóm xếp 2 CỘT ở mọi cỡ màn nên trên điện thoại mỗi cột chỉ ~185px: ẩn icon (trang trí),
 * nút đếm thu về 28px ngang (cao 32px vẫn đủ chạm) — đo ở 390px thì tên dài nhất "Quạt điều hoà"
 * vừa khít; máy 360px vẫn cắt vài tên, chấp nhận (kèm `title`). Từ `sm` có icon, nút rộng 36px;
 * desktop dòng 34px / nút 24px theo mật độ ca trực.
 *
 * VÙNG CHẠM (2026-09-27): nút `size="icon"` dùng chung được trả lại `min-w-11` (44px) cho iPhone —
 * ở đây GHI ĐÈ về `min-w-0 min-h-0` để giữ đúng bố cục 1 dòng đã chốt ở trên (44px làm tên bị cắt
 * "Sạc dự phòng", "Máy lọc nước"…), rồi nới vùng chạm VÔ HÌNH bằng `::after` ra 44×44: dòng cao
 * 44px sẵn, ô số giữa rộng 20px đủ cho 2 vùng chạm lấn 8px mỗi bên mà không chạm nhau.
 */
export const CounterRow: React.FC<CounterRowProps> = ({ icon, label, value, onChange, onDelete }) => {
    const active = value > 0;
    return (
        <div className={`flex items-center gap-0.5 sm:gap-2 px-1.5 sm:px-2 h-11 lg:h-[34px] border-b border-slate-100 ${active ? 'bg-sky-50/60' : 'bg-white'}`}>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                <span className={`hidden sm:inline-flex shrink-0 ${active ? 'text-sky-700' : 'text-slate-400'}`}>
                    <AppIcon name={resolveIconName(icon) ?? 'help'} size="md" />
                </span>
                <span className={`min-w-0 truncate text-[13px] ${active ? 'font-semibold text-slate-900' : 'text-slate-700'}`} title={label}>
                    {label}
                </span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                {onDelete && (
                    <Button variant="unstyled" size="none" onClick={onDelete} title="Xoá mục này" aria-label={`Xoá ${label}`}
                        className="h-6 w-6 flex items-center justify-center text-slate-300 hover:text-rose-600 relative after:absolute after:-inset-2.5 after:content-[''] lg:after:hidden">
                        <AppIcon name="delete" size="sm" />
                    </Button>
                )}
                <Button variant="secondary" size="icon" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Giảm ${label}`}
                    className="h-8 w-7 min-h-0 min-w-0 sm:w-9 lg:h-6 lg:w-6 rounded relative after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-[''] lg:after:hidden">
                    <AppIcon name="minus" size="sm" />
                </Button>
                <span className={`w-5 sm:w-6 text-center text-[13px] tabular-nums font-semibold ${active ? 'text-sky-700' : 'text-slate-400'}`} data-testid={`count-${label}`}>
                    {value}
                </span>
                <Button variant="secondary" size="icon" onClick={() => onChange(value + 1)} aria-label={`Tăng ${label}`}
                    className="h-8 w-7 min-h-0 min-w-0 sm:w-9 lg:h-6 lg:w-6 rounded relative after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-[''] lg:after:hidden">
                    <AppIcon name="add" size="sm" />
                </Button>
            </div>
        </div>
    );
};
