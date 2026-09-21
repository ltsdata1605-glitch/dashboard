import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Icon } from '../../../components/common/Icon';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import type { ItemGroup, ReportDraft, CustomField } from '../types';
import { COUNT_ITEMS, AMOUNT_ITEMS, GROUP_META, customCountFields, customRevenueFields } from '../catalog';
import { CounterRow } from './CounterRow';

interface GroupSectionProps {
    group: ItemGroup;
    draft: ReportDraft;
    fields: CustomField[];
    onCount: (group: ItemGroup, key: string, value: number) => void;
    onAmount: (key: string, value: string) => void;
    onOther: (group: ItemGroup, patch: Partial<{ name: string; count: number }>) => void;
    onAddField: (group: ItemGroup) => void;
    onDeleteField: (field: CustomField) => void;
}

const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};

/** Dải tiêu đề nhóm 28px — chuẩn ca trực: một tông xám, chữ 11px viết hoa phông condensed. */
export const BandHeader: React.FC<{ icon?: string; title: React.ReactNode; right?: React.ReactNode }> = ({ icon, title, right }) => (
    <div className="h-7 px-2 flex items-center justify-between gap-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-1.5 min-w-0 text-slate-600">
            {icon && <Icon name={icon} size={3.5} />}
            <span className="text-[11px] font-bold uppercase tracking-wider truncate font-[family-name:var(--console-font-label)]">{title}</span>
        </div>
        {right && <div className="flex items-center gap-1 shrink-0">{right}</div>}
    </div>
);

/**
 * Ô nhập tiền (Tr) — luôn một dòng như CounterRow: nhãn trái, ô nhập phải. 2 ô tiền của nhóm
 * Ưu tiên nằm cạnh nhau 1 dòng (col-span-1). Tên dài "Bảo hiểm Khác (Tr)" cắt bớt, kèm `title`.
 * Input `text-base` (16px) để tránh browser zoom trên mobile khi người dùng thao tác.
 */
const AmountRow: React.FC<{ icon: string; label: string; value: string; onChange: (v: string) => void; onDelete?: () => void }> = ({ icon, label, value, onChange, onDelete }) => {
    const active = parseFloat(value) > 0;
    return (
        <div className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 h-11 lg:h-[34px] border-b border-slate-100 ${active ? 'bg-emerald-50/60' : 'bg-white'}`}>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                <span className={`hidden sm:inline-flex shrink-0 ${active ? 'text-emerald-700' : 'text-slate-400'}`}><Icon name={icon} size={4} /></span>
                <span className={`min-w-0 truncate text-[13px] ${active ? 'font-semibold text-slate-900' : 'text-slate-700'}`} title={label}>{label}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                {onDelete && (
                    <Button variant="unstyled" size="none" onClick={onDelete} title="Xoá mục này" aria-label={`Xoá ${label}`}
                        className="h-6 w-6 flex items-center justify-center text-slate-300 hover:text-rose-600">
                        <Trash2 size={12} />
                    </Button>
                )}
                <Input type="number" inputMode="decimal" min="0" step="0.1" placeholder="0" fullWidth={false} aria-label={label}
                    value={value} onChange={e => onChange(e.target.value)} onKeyDown={blockNonNumericKeys}
                    className="h-8 lg:h-6 w-16 sm:w-[88px] lg:w-20 rounded px-2 text-base sm:text-[13px] tabular-nums text-right" />
            </div>
        </div>
    );
};

export const GroupSection: React.FC<GroupSectionProps> = ({ group, draft, fields, onCount, onAmount, onOther, onAddField, onDeleteField }) => {
    const meta = GROUP_META[group];
    const counts = draft.counts[group] ?? {};
    const other = draft.others[group] ?? { name: '', count: 0 };
    const countFields = customCountFields(fields, group);
    const revenueFields = customRevenueFields(fields, group);

    return (
        <section className="border border-slate-200 bg-white" data-testid={`group-${group}`}>
            <BandHeader
                icon={meta.icon}
                title={meta.label}
                right={
                    <Button variant="unstyled" size="none" onClick={() => onAddField(group)} title="Thêm mục mới"
                        className="h-6 px-1.5 flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50 rounded">
                        <Plus size={12} /> Thêm mục
                    </Button>
                }
            />
            {/* Lưới 2 cột ở MỌI cỡ màn; ô lẻ kẻ viền phải để tách 2 cột. */}
            <div className="grid grid-cols-2 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-r-slate-100">
                {COUNT_ITEMS[group].map(item => (
                    <CounterRow key={item.key} icon={item.icon} label={item.label} value={Number(counts[item.key]) || 0}
                        onChange={v => onCount(group, item.key, v)} />
                ))}
                {AMOUNT_ITEMS[group].map(item => (
                    <AmountRow key={item.key} icon={item.icon} label={item.label} value={draft.amounts[item.key] ?? ''} onChange={v => onAmount(item.key, v)} />
                ))}
                {countFields.map(f => (
                    <CounterRow key={f.id} icon={meta.icon} label={f.name} value={Number(counts[f.id]) || 0}
                        onChange={v => onCount(group, f.id, v)} onDelete={() => onDeleteField(f)} />
                ))}
                {revenueFields.map(f => (
                    <AmountRow key={f.id} icon="banknote" label={`${f.name} (Tr)`} value={draft.amounts[f.id] ?? ''}
                        onChange={v => onAmount(f.id, v)} onDelete={() => onDeleteField(f)} />
                ))}
            </div>
            {/* Dòng "khác": tên tự do + đếm (nhóm Bảo hiểm không có — xem GROUP_META) */}
            {meta.otherPlaceholder && (
            <div className="flex items-center gap-2 px-2 h-11 lg:h-[34px] border-t border-slate-200 bg-slate-50/60">
                <Input type="text" placeholder={meta.otherPlaceholder} value={other.name} aria-label={meta.otherPlaceholder}
                    onChange={e => onOther(group, { name: e.target.value })}
                    className="h-8 lg:h-6 rounded px-2 text-[13px]" />
                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="secondary" size="icon" onClick={() => onOther(group, { count: Math.max(0, other.count - 1) })} aria-label="Giảm mục khác"
                        className="h-8 w-8 lg:h-6 lg:w-6 rounded"><Minus size={12} /></Button>
                    <span className={`w-6 text-center text-[13px] tabular-nums font-semibold ${other.count > 0 ? 'text-sky-700' : 'text-slate-400'}`}>{other.count}</span>
                    <Button variant="secondary" size="icon" onClick={() => onOther(group, { count: other.count + 1 })} aria-label="Tăng mục khác"
                        className="h-8 w-8 lg:h-6 lg:w-6 rounded"><Plus size={12} /></Button>
                </div>
            </div>
            )}
        </section>
    );
};
