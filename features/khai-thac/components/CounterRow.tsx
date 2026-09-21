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
 * Một dòng đếm số lượng: icon · tên · [−] số [+]. Mật độ theo chuẩn ca trực: 30px desktop, 44px
 * vùng chạm trên điện thoại. Số khác 0 tô màu nhấn để liếc qua thấy ngay mục nào đã bán.
 */
export const CounterRow: React.FC<CounterRowProps> = ({ icon, label, value, onChange, onDelete }) => {
    const active = value > 0;
    return (
        <div className={`flex items-center gap-2 px-2 h-11 lg:h-[34px] border-b border-slate-100 last:border-b-0 ${active ? 'bg-sky-50/60' : 'bg-white'}`}>
            <span className={`shrink-0 ${active ? 'text-sky-700' : 'text-slate-400'}`}>
                <Icon name={icon} size={4} />
            </span>
            <span className={`flex-1 min-w-0 truncate text-[13px] ${active ? 'font-semibold text-slate-900' : 'text-slate-700'}`} title={label}>
                {label}
            </span>
            {onDelete && (
                <Button variant="unstyled" size="none" onClick={onDelete} title="Xoá mục này" aria-label={`Xoá ${label}`}
                    className="h-6 w-6 flex items-center justify-center text-slate-300 hover:text-rose-600">
                    <Trash2 size={12} />
                </Button>
            )}
            <div className="flex items-center gap-1 shrink-0">
                <Button variant="secondary" size="icon" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Giảm ${label}`}
                    className="h-8 w-8 lg:h-6 lg:w-6 rounded">
                    <Minus size={12} />
                </Button>
                <span className={`w-6 text-center text-[13px] tabular-nums font-semibold ${active ? 'text-sky-700' : 'text-slate-400'}`} data-testid={`count-${label}`}>
                    {value}
                </span>
                <Button variant="secondary" size="icon" onClick={() => onChange(value + 1)} aria-label={`Tăng ${label}`}
                    className="h-8 w-8 lg:h-6 lg:w-6 rounded">
                    <Plus size={12} />
                </Button>
            </div>
        </div>
    );
};
