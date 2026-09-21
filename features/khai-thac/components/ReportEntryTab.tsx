import React from 'react';
import { Check, Copy, RotateCcw, AlertTriangle, Swords, Wallet, CreditCard } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import type { ItemGroup, ReportDraft, CustomField } from '../types';
import { ITEM_GROUPS } from '../types';
import { fmtTr } from '../utils/reportText';
import { sanitizeExpressionInput, evaluateExpression, hasOperator } from '../utils/expression';
import { GroupSection, BandHeader } from './GroupSection';

interface ReportEntryTabProps {
    draft: ReportDraft;
    fields: CustomField[];
    warnings: string[];
    previewText: string;
    isSaving: boolean;
    onPatch: (patch: Partial<ReportDraft>) => void;
    onCount: (group: ItemGroup, key: string, value: number) => void;
    onAmount: (key: string, value: string) => void;
    onOther: (group: ItemGroup, patch: Partial<{ name: string; count: number }>) => void;
    onAddField: (group: ItemGroup) => void;
    onDeleteField: (field: CustomField) => void;
    onReset: () => void;
    onSubmit: () => void;
}

const TONE_ON: Record<'sky' | 'rose' | 'emerald', { btn: string; box: string }> = {
    sky: { btn: 'border-sky-300 bg-sky-50 text-sky-700', box: 'bg-sky-600 border-sky-600 text-white' },
    rose: { btn: 'border-rose-300 bg-rose-50 text-rose-700', box: 'bg-rose-600 border-rose-600 text-white' },
    emerald: { btn: 'border-emerald-300 bg-emerald-50 text-emerald-700', box: 'bg-emerald-600 border-emerald-600 text-white' },
};

const ToggleButton: React.FC<{ on: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone: 'sky' | 'rose' | 'emerald' }> = ({ on, onClick, icon, label, tone }) => (
    <Button variant="secondary" size="sm" onClick={onClick} aria-pressed={on}
        className={`rounded h-9 lg:h-8 gap-1.5 ${on ? TONE_ON[tone].btn : ''}`}>
        <span className={`flex h-4 w-4 items-center justify-center border rounded-sm ${on ? TONE_ON[tone].box : 'border-slate-300 bg-white'}`}>
            {on && <Check size={11} strokeWidth={3} />}
        </span>
        {icon}
        {label}
    </Button>
);

export const ReportEntryTab: React.FC<ReportEntryTabProps> = ({
    draft, fields, warnings, previewText, isSaving,
    onPatch, onCount, onAmount, onOther, onAddField, onDeleteField, onReset, onSubmit,
}) => {
    // Ô doanh thu nhận phép tính: hiện kết quả tạm khi đang gõ, rời ô (blur/Enter) thì thay bằng số đã tính.
    const isExpression = hasOperator(draft.revenueTotal);
    const evaluated = isExpression ? evaluateExpression(draft.revenueTotal) : null;
    const commitRevenue = () => {
        if (isExpression && evaluated !== null) onPatch({ revenueTotal: fmtTr(Math.max(0, evaluated)) });
    };

    // Nút hành động vẽ 2 lần (cột phải desktop / cuối trang mobile) — test id khác nhau để test bấm đúng nút đang hiện.
    const renderActions = (where: 'desktop' | 'mobile') => (
        <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onReset} leftIcon={<RotateCcw size={14} />} className="rounded h-11 lg:h-9 text-rose-700 border-rose-200 hover:bg-rose-50">
                Làm mới
            </Button>
            <Button variant="primary" onClick={onSubmit} isLoading={isSaving} leftIcon={<Copy size={14} />} className="rounded h-11 lg:h-9" data-testid={`btn-submit-report-${where}`}>
                Báo cáo
            </Button>
        </div>
    );

    return (
        <div className="lg:grid lg:grid-cols-12 lg:gap-3 space-y-3 lg:space-y-0">
            <div className="lg:col-span-8 space-y-3">
                {warnings.length > 0 && (
                    <div className="border border-amber-300 bg-amber-50 px-3 py-2 flex gap-2 items-start" role="alert">
                        <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-[13px] text-amber-800">
                            <span className="font-bold uppercase text-[11px] tracking-wider block">Cảnh báo 3 ngày liên tiếp không khai thác</span>
                            {warnings.join(' · ')}
                        </div>
                    </div>
                )}

                {/* Doanh thu đơn hàng */}
                <section className="border border-slate-200 bg-white" data-testid="revenue-block">
                    <BandHeader icon="banknote" title="Doanh thu đơn hàng (Tr)" />
                    <div className="p-2 space-y-1">
                        <label htmlFor="kt-revenue" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng doanh thu thực</label>
                        <div className="flex items-center gap-2">
                            <Input id="kt-revenue" type="text" inputMode="decimal" placeholder="VD: 8.5 hoặc 5+3+4" autoComplete="off"
                                value={draft.revenueTotal}
                                onChange={e => onPatch({ revenueTotal: sanitizeExpressionInput(e.target.value) })}
                                onBlur={commitRevenue}
                                onKeyDown={e => { if (e.key === 'Enter') commitRevenue(); }}
                                className="h-9 rounded text-[15px] tabular-nums font-semibold" />
                            {isExpression && (
                                <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${evaluated !== null ? 'text-sky-700' : 'text-slate-300'}`} data-testid="revenue-eval">
                                    = {evaluated !== null ? fmtTr(evaluated) : '…'}
                                </span>
                            )}
                        </div>
                        <p className="text-[11.5px] text-slate-500">Gõ được phép tính (VD <span className="tabular-nums">5+3+4</span>) — rời ô là tự tính ra tổng.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-2 border-t border-slate-100">
                        <ToggleButton on={draft.traGop} onClick={() => onPatch({ traGop: !draft.traGop })} icon={<CreditCard size={13} />} label="Trả góp" tone="emerald" />
                        <ToggleButton on={draft.moVi} onClick={() => onPatch({ moVi: !draft.moVi })} icon={<Wallet size={13} />} label="Mở Ví" tone="sky" />
                        <ToggleButton on={draft.priceWar} onClick={() => onPatch({ priceWar: !draft.priceWar })} icon={<Swords size={13} />} label="Chiến giá" tone="rose" />
                    </div>
                </section>

                {ITEM_GROUPS.map(group => (
                    <GroupSection key={group} group={group} draft={draft} fields={fields}
                        onCount={onCount} onAmount={onAmount} onOther={onOther} onAddField={onAddField} onDeleteField={onDeleteField} />
                ))}

                <section className="border border-slate-200 bg-white">
                    <BandHeader icon="info" title="Ghi chú" />
                    <textarea
                        rows={3}
                        placeholder="Nhập ghi chú…"
                        value={draft.notes}
                        onChange={e => onPatch({ notes: e.target.value })}
                        aria-label="Ghi chú"
                        className="w-full resize-none border-0 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                </section>

                <div className="lg:hidden space-y-3">
                    <section className="border border-slate-200 bg-white">
                        <BandHeader icon="file-text" title="Xem trước báo cáo" />
                        <pre className="px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-slate-800" data-testid="preview-mobile">{previewText}</pre>
                    </section>
                    {renderActions('mobile')}
                </div>
            </div>

            <aside className="hidden lg:block lg:col-span-4">
                <div className="lg:sticky lg:top-[calc(var(--app-header-h)+12px)] space-y-3">
                    <section className="border border-slate-200 bg-white">
                        <BandHeader icon="file-text" title="Xem trước báo cáo" right={<span className="text-[11px] text-slate-400 tabular-nums">{previewText.length} ký tự</span>} />
                        <pre className="px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-slate-800 min-h-[120px]" data-testid="preview">{previewText}</pre>
                    </section>
                    {renderActions('desktop')}
                    <p className="text-[11.5px] text-slate-500 leading-snug">
                        Bấm <b>Báo cáo</b>: copy văn bản vào clipboard để dán lên nhóm Zalo/Line, ghi vào Nhật ký, rồi làm sạch form cho đơn kế tiếp.
                    </p>
                </div>
            </aside>
        </div>
    );
};
