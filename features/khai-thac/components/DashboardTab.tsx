import React, { useMemo, useRef } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { KpiCard } from '../../../components/shared/ui/KpiCard';
import type { SavedReport, CustomField, DashboardRange, ItemGroup } from '../types';
import { GROUP_META, AMOUNT_ITEMS, customRevenueFields } from '../catalog';
import { summarize, isInRange, type RankedItem } from '../utils/aggregate';
import { fmtTr } from '../utils/reportText';
import { BandHeader } from './GroupSection';
import { shareElementAsImage } from '../utils/exportImage';

interface DashboardTabProps {
    reports: SavedReport[];
    fields: CustomField[];
    staffName: string;
    range: DashboardRange;
    onRangeChange: (r: DashboardRange) => void;
}

const RANGE_ITEMS = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'week', label: 'Tuần này' },
    { id: 'month', label: 'Tháng này' },
];
const RANGE_LABEL: Record<DashboardRange, string> = { today: 'hôm nay', week: 'tuần này', month: 'tháng này' };

/** Bảng xếp hạng một nhóm: tên · thanh tỉ lệ · số. Thanh tỉ lệ 3px màu đặc, không gradient. */
const RankingTable: React.FC<{ group: ItemGroup; items: RankedItem[]; otherCount: number }> = ({ group, items, otherCount }) => {
    const max = Math.max(1, ...items.map(i => i.count));
    const total = items.reduce((s, i) => s + i.count, 0) + otherCount;
    return (
        <section className="border border-slate-200 bg-white">
            <BandHeader icon={GROUP_META[group].icon} title={GROUP_META[group].label} right={<span className="text-[11px] text-slate-500 tabular-nums">Tổng <b className="text-slate-800">{total}</b></span>} />
            <table className="w-full text-[13px] tabular-nums">
                <tbody className="divide-y divide-slate-100">
                    {items.map(i => (
                        <tr key={i.key} className={`h-[26px] ${i.count > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                            <td className="px-2 py-0 w-[40%] truncate">{i.label}</td>
                            <td className="px-2 py-0">
                                <div className="h-[3px] bg-slate-100 w-full">
                                    <div className={`h-full ${i.count > 0 ? 'bg-sky-600' : ''}`} style={{ width: `${(i.count / max) * 100}%` }} />
                                </div>
                            </td>
                            <td className="px-2 py-0 w-12 text-right font-semibold">{i.count}</td>
                        </tr>
                    ))}
                    {otherCount > 0 && (
                        <tr className="h-[26px] text-slate-700">
                            <td className="px-2 py-0">Khác</td>
                            <td className="px-2 py-0" />
                            <td className="px-2 py-0 text-right font-semibold">{otherCount}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    );
};

export const DashboardTab: React.FC<DashboardTabProps> = ({ reports, fields, staffName, range, onRangeChange }) => {
    const captureRef = useRef<HTMLDivElement>(null);
    const filtered = useMemo(() => reports.filter(r => isInRange(r.date, range)), [reports, range]);
    const s = useMemo(() => summarize(filtered, fields), [filtered, fields]);
    const svcRevenueFields = customRevenueFields(fields, 'services');
    const accRevenueFields = customRevenueFields(fields, 'accessories');
    const insRevenueFields = customRevenueFields(fields, 'insurance');

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <Tabs items={RANGE_ITEMS} activeId={range} onChange={id => onRangeChange(id as DashboardRange)} variant="segment" size="sm" />
                <Button variant="secondary" size="sm" className="rounded h-8" leftIcon={<Share2 size={13} />}
                    onClick={() => shareElementAsImage(captureRef.current, `bieu-do-${new Date().toISOString().slice(0, 10)}.png`, 'Báo cáo doanh số cá nhân')}>
                    Xuất ảnh
                </Button>
            </div>

            <div ref={captureRef} className="space-y-3 bg-white lg:bg-transparent">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-1">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-[family-name:var(--console-font-label)]">Doanh số cá nhân · {RANGE_LABEL[range]}</span>
                        {staffName && <span className="ml-2 text-[12px] font-semibold text-sky-700">{staffName}</span>}
                    </div>
                    <span className="text-[11.5px] text-slate-400 tabular-nums">{new Date().toLocaleDateString('vi-VN')} · {s.orders} đơn</span>
                </div>

                {filtered.length === 0 ? (
                    <div className="border border-slate-200 bg-white px-3 py-10 text-center text-[13px] text-slate-400">
                        Chưa có đơn hàng nào {RANGE_LABEL[range]}. Bấm <b>Báo cáo</b> ở tab Nhập báo cáo để ghi nhận.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" data-testid="kpi-strip">
                            <KpiCard icon="banknote" iconColor="sky" title="Tổng doanh số" trendLabel="Tiền mặt / Trả chậm" trendValue={<span className="tabular-nums">{fmtTr(s.cash)} / {fmtTr(s.installment)} Tr</span>}>
                                <span className="text-[25px] leading-none font-semibold tabular-nums text-slate-900">{fmtTr(s.revenueTotal)}<span className="text-[13px] text-slate-400 ml-1">Tr</span></span>
                            </KpiCard>
                            <KpiCard icon="percent" iconColor="emerald" title="Tỉ lệ trả chậm" trendLabel="Số đơn" trendValue={<span className="tabular-nums">{s.orders}</span>} progressPercent={s.installmentRate}>
                                <span className="text-[25px] leading-none font-semibold tabular-nums text-emerald-700">{s.installmentRate}<span className="text-[13px] text-slate-400 ml-1">%</span></span>
                            </KpiCard>
                            <KpiCard icon="wallet" iconColor="sky" title="Mở Ví" trendLabel="Tiền ví" trendValue={<span className="tabular-nums">{fmtTr(s.viTr)} Tr</span>}>
                                <span className="text-[25px] leading-none font-semibold tabular-nums text-sky-700">{s.moViCount}<span className="text-[13px] text-slate-400 ml-1">đơn</span></span>
                            </KpiCard>
                            <KpiCard icon="swords" iconColor="rose" title="Chiến giá" trendLabel="Bảo hiểm" trendValue={<span className="tabular-nums">{fmtTr(s.insuranceTr)} Tr</span>}>
                                <span className="text-[25px] leading-none font-semibold tabular-nums text-rose-700">{s.priceWarCount}<span className="text-[13px] text-slate-400 ml-1">đơn</span></span>
                            </KpiCard>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <RankingTable group="products" items={s.ranking.products} otherCount={s.otherCounts.products} />
                            <RankingTable group="household" items={s.ranking.household} otherCount={s.otherCounts.household} />
                            <section className="border border-slate-200 bg-white">
                                <BandHeader icon={GROUP_META.services.icon} title="Dịch vụ bổ sung" />
                                <table className="w-full text-[13px] tabular-nums">
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="h-[26px]"><td className="px-2 text-slate-600">Ví</td><td className="px-2 text-right font-semibold">{fmtTr(s.viTr)} Tr <span className="text-slate-400 font-normal">({s.moViCount} đơn)</span></td></tr>
                                        {s.ranking.services.map(i => (
                                            <tr key={i.key} className={`h-[26px] ${i.count > 0 ? '' : 'text-slate-400'}`}><td className="px-2">{i.label}</td><td className="px-2 text-right font-semibold">{i.count}</td></tr>
                                        ))}
                                        {svcRevenueFields.map(f => (
                                            <tr key={f.id} className="h-[26px]"><td className="px-2 text-slate-600">{f.name}</td><td className="px-2 text-right font-semibold">{fmtTr(s.customRevenue[f.id] ?? 0)} Tr</td></tr>
                                        ))}
                                        {s.otherCounts.services > 0 && <tr className="h-[26px]"><td className="px-2">Khác</td><td className="px-2 text-right font-semibold">{s.otherCounts.services}</td></tr>}
                                    </tbody>
                                </table>
                            </section>
                            <section className="border border-slate-200 bg-white">
                                <BandHeader icon={GROUP_META.insurance.icon} title="Bảo hiểm" right={<span className="text-[11px] text-slate-500 tabular-nums">Tổng <b className="text-slate-800">{fmtTr(s.insuranceTr)} Tr</b></span>} />
                                <table className="w-full text-[13px] tabular-nums">
                                    <tbody className="divide-y divide-slate-100">
                                        {AMOUNT_ITEMS.insurance.map(item => (
                                            <tr key={item.key} className={`h-[26px] ${(s.amounts[item.key] ?? 0) > 0 ? '' : 'text-slate-400'}`}><td className="px-2">{item.label.replace(' (Tr)', '')}</td><td className="px-2 text-right font-semibold">{fmtTr(s.amounts[item.key] ?? 0)} Tr</td></tr>
                                        ))}
                                        {insRevenueFields.map(f => (
                                            <tr key={f.id} className="h-[26px]"><td className="px-2 text-slate-600">{f.name}</td><td className="px-2 text-right font-semibold">{fmtTr(s.customRevenue[f.id] ?? 0)} Tr</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                            <section className="border border-slate-200 bg-white">
                                <BandHeader icon={GROUP_META.accessories.icon} title="Phụ kiện" />
                                <table className="w-full text-[13px] tabular-nums">
                                    <tbody className="divide-y divide-slate-100">
                                        {s.ranking.accessories.map(i => (
                                            <tr key={i.key} className={`h-[26px] ${i.count > 0 ? '' : 'text-slate-400'}`}><td className="px-2">{i.label}</td><td className="px-2 text-right font-semibold">{i.count}</td></tr>
                                        ))}
                                        {accRevenueFields.map(f => (
                                            <tr key={f.id} className="h-[26px]"><td className="px-2 text-slate-600">{f.name}</td><td className="px-2 text-right font-semibold">{fmtTr(s.customRevenue[f.id] ?? 0)} Tr</td></tr>
                                        ))}
                                        {s.otherCounts.accessories > 0 && <tr className="h-[26px]"><td className="px-2">Khác</td><td className="px-2 text-right font-semibold">{s.otherCounts.accessories}</td></tr>}
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
