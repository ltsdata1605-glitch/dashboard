import React, { useEffect, useMemo, useState } from 'react';
import type { DataRow, ProductConfig } from '../../types';
import * as dbService from '../../services/dbService';
import {
    evaluateAlerts,
    createEmptyRule,
    ALERT_RULES_STORAGE_KEY,
    type AlertRule,
    type AlertOperator,
} from '../../services/alertService';
import { PIVOT_DIMENSIONS, PIVOT_METRICS, type PivotDimension, type PivotMetric } from '../../services/pivotService';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Select } from '../shared/ui/Select';
import { Input } from '../shared/ui/Input';
import { Button } from '../shared/ui/Button';
import { Icon } from '../common/Icon';

/**
 * Cảnh báo theo ngưỡng — phần giao diện.
 *
 * Người dùng tự đặt quy tắc ("Kho nào có Doanh thu QĐ thấp hơn X thì báo"), hệ thống soi hộ trên
 * đúng dữ liệu đang xem thay vì bắt họ tự dò từng dòng.
 *
 * Quy tắc lưu vào IndexedDB qua `dbService.saveSetting` — cùng cơ chế mà các cấu hình khác của
 * module Phân Tích đang dùng, nên tự động được đồng bộ/khôi phục như mọi cài đặt khác.
 */

interface Props {
    /** Dữ liệu ĐÃ lọc quyền (baseFilteredData). */
    sourceData: DataRow[];
    productConfig: ProductConfig | null;
}

const OPERATORS: { value: AlertOperator; label: string }[] = [
    { value: 'lt', label: 'thấp hơn' },
    { value: 'gt', label: 'vượt quá' },
];

export const AlertRulesPanel: React.FC<Props> = ({ sourceData, productConfig }) => {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        dbService.getSetting<AlertRule[]>(ALERT_RULES_STORAGE_KEY)
            .then(saved => { if (Array.isArray(saved)) setRules(saved); })
            .catch(() => { /* không có cấu hình cũ — bắt đầu với danh sách rỗng */ })
            .finally(() => setLoaded(true));
    }, []);

    const persist = (next: AlertRule[]) => {
        setRules(next);
        // Lỗi ghi cài đặt không được làm hỏng màn hình — báo ra console để còn lần ra, nhưng
        // người dùng vẫn dùng tiếp được với quy tắc đang có trong bộ nhớ.
        dbService.saveSetting(ALERT_RULES_STORAGE_KEY, next).catch(e =>
            console.error('Không lưu được quy tắc cảnh báo:', e)
        );
    };

    const hits = useMemo(
        () => (loaded && rules.length ? evaluateAlerts(sourceData, rules, productConfig) : []),
        [loaded, rules, sourceData, productConfig]
    );

    const fmtValue = (v: number, metric: PivotMetric) => {
        const info = PIVOT_METRICS.find(m => m.id === metric);
        return info?.kind === 'currency' ? formatCurrency(v) : formatQuantity(v);
    };

    const update = (id: string, patch: Partial<AlertRule>) =>
        persist(rules.map(r => (r.id === id ? { ...r, ...patch } : r)));

    if (!loaded) return null;

    return (
        <div className="px-2 lg:px-4 pb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <Icon name="bell" size={3.5} className="text-amber-500" />
                    Cảnh báo ngưỡng
                    {hits.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {hits.length}
                        </span>
                    )}
                </span>
                <Button
                    variant="unstyled" size="none"
                    onClick={() => {
                        // Khi CHƯA có quy tắc nào, nút này ghi "Thêm quy tắc" — nên nó phải THÊM
                        // luôn 1 quy tắc trống, không chỉ mở trình sửa rồi để người dùng nhìn vào
                        // khoảng trắng và phải bấm thêm lần nữa.
                        if (!editing && rules.length === 0) persist([createEmptyRule()]);
                        setEditing(v => !v);
                    }}
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 hover:underline hide-on-export"
                >
                    {editing ? 'Xong' : rules.length ? 'Sửa quy tắc' : 'Thêm quy tắc'}
                </Button>
            </div>

            {/* Danh sách vi phạm */}
            {rules.length > 0 && hits.length === 0 && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                    <Icon name="check" size={3.5} />
                    Không có chỉ số nào vượt ngưỡng đã đặt.
                </div>
            )}
            {hits.length > 0 && (
                <div className="space-y-1">
                    {hits.map((h, i) => (
                        <div
                            key={`${h.ruleId}-${h.itemLabel}-${i}`}
                            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] bg-rose-50 border border-rose-200 rounded px-2 py-1.5"
                        >
                            <Icon name="alert-triangle" size={3.5} className="text-rose-500 shrink-0" />
                            <span className="font-bold text-slate-800">{h.dimensionLabel} {h.itemLabel}</span>
                            <span className="text-slate-600">
                                {h.metricLabel} <strong className="text-rose-700">{fmtValue(h.value, rules.find(r => r.id === h.ruleId)?.metric ?? 'revenue')}</strong>
                                {' '}{h.operator === 'lt' ? 'thấp hơn' : 'vượt'} ngưỡng {fmtValue(h.threshold, rules.find(r => r.id === h.ruleId)?.metric ?? 'revenue')}
                            </span>
                            <span className="text-[11px] text-rose-500 font-semibold">
                                (lệch {h.deviationPercent.toFixed(0)}%)
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Trình sửa quy tắc */}
            {editing && (
                <div className="mt-2 space-y-2 border border-slate-200 rounded p-2 bg-slate-50/60 hide-on-export">
                    {rules.length === 0 && (
                        <p className="text-[11px] text-slate-500">
                            Chưa có quy tắc nào. Ví dụ hữu ích: “Nhân viên có Doanh thu QĐ thấp hơn 20.000.000”.
                        </p>
                    )}
                    {rules.map(r => (
                        <div key={r.id} className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded p-1.5">
                            <input
                                type="checkbox"
                                checked={r.enabled}
                                onChange={e => update(r.id, { enabled: e.target.checked })}
                                className="h-3.5 w-3.5 accent-sky-600"
                                title={r.enabled ? 'Đang bật' : 'Đang tắt'}
                            />
                            <Select
                                value={r.dimension}
                                onChange={e => update(r.id, { dimension: e.target.value as PivotDimension })}
                                options={PIVOT_DIMENSIONS.map(d => ({ value: d.id, label: d.label }))}
                                fullWidth={false}
                                className="h-8 text-xs"
                            />
                            <span className="text-[11px] text-slate-500">có</span>
                            <Select
                                value={r.metric}
                                onChange={e => update(r.id, { metric: e.target.value as PivotMetric })}
                                options={PIVOT_METRICS.map(m => ({ value: m.id, label: m.label }))}
                                fullWidth={false}
                                className="h-8 text-xs"
                            />
                            <Select
                                value={r.operator}
                                onChange={e => update(r.id, { operator: e.target.value as AlertOperator })}
                                options={OPERATORS.map(o => ({ value: o.value, label: o.label }))}
                                fullWidth={false}
                                className="h-8 text-xs"
                            />
                            <Input
                                type="number"
                                value={Number.isFinite(r.threshold) ? String(r.threshold) : ''}
                                onChange={e => update(r.id, { threshold: e.target.value === '' ? NaN : Number(e.target.value) })}
                                fullWidth={false}
                                className="h-8 text-xs w-32"
                                placeholder="Ngưỡng"
                            />
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => persist(rules.filter(x => x.id !== r.id))}
                                className="p-1 text-slate-400 hover:text-rose-700"
                                title="Xoá quy tắc"
                            >
                                <Icon name="trash-2" size={3.5} />
                            </Button>
                        </div>
                    ))}
                    <Button
                        variant="secondary" size="sm"
                        onClick={() => persist([...rules, createEmptyRule()])}
                        className="text-xs"
                    >
                        <Icon name="plus" size={3.5} className="mr-1" /> Thêm quy tắc
                    </Button>
                    <p className="text-[11px] text-slate-400 leading-snug">
                        Cảnh báo được tính trên đúng dữ liệu bạn đang xem (theo bộ lọc và phạm vi quyền của bạn).
                        Hiện chỉ hiển thị trong ứng dụng — chưa gửi thông báo định kỳ ra ngoài.
                    </p>
                </div>
            )}
        </div>
    );
};

export default AlertRulesPanel;
