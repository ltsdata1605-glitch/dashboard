import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Icon } from '../../../components/common/Icon';
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
 */
export const CounterRow: React.FC<CounterRowProps> = ({ icon, label, value, onChange, onDelete }) => {
    const active = value > 0;
    return (
        <div className={`flex items-center gap-0.5 sm:gap-2 px-1.5 sm:px-2 h-11 lg:h-[34px] border-b border-slate-100 ${active ? 'bg-sky-50/60' : 'bg-white'}`}>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                <span className={`hidden sm:inline-flex shrink-0 ${active ? 'text-sky-700' : 'text-slate-400'}`}>
                    <Icon name={icon} size={4} />
                </span>
                <span className={`min-w-0 truncate text-[13px] ${active ? 'font-semibold text-slate-900' : 'text-slate-700'}`} title={label}>
                    {label}
                </span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                {onDelete && (
                    <Button variant="unstyled" size="none" onClick={onDelete} title="Xoá mục này" aria-label={`Xoá ${label}`}
                        className="h-6 w-6 flex items-center justify-center text-slate-300 hover:text-rose-600">
                        <Trash2 size={12} />
                    </Button>
                )}
                <Button variant="secondary" size="icon" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Giảm ${label}`}
                    className="h-8 w-7 sm:w-9 lg:h-6 lg:w-6 rounded">
                    <Minus size={12} />
                </Button>
                <span className={`w-5 sm:w-6 text-center text-[13px] tabular-nums font-semibold ${active ? 'text-sky-700' : 'text-slate-400'}`} data-testid={`count-${label}`}>
                    {value}
                </span>
                <Button variant="secondary" size="icon" onClick={() => onChange(value + 1)} aria-label={`Tăng ${label}`}
                    className="h-8 w-7 sm:w-9 lg:h-6 lg:w-6 rounded">
                    <Plus size={12} />
                </Button>
            </div>
        </div>
    );
};
