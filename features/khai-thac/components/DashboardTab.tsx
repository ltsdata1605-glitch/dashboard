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
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

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
                    <div className="relative group my-2">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500/20 via-rose-500/20 to-sky-500/20 rounded-xl blur-lg opacity-40 group-hover:opacity-80 transition duration-700 pointer-events-none"></div>
                        <div className="relative bg-white/90 backdrop-blur-md rounded-lg border border-slate-200 px-4 py-10 text-center">
                            <p className="text-[13px] text-slate-500">Chưa có đơn hàng nào {RANGE_LABEL[range]}. Bấm <b className="text-sky-600">Báo cáo</b> ở tab Nhập báo cáo để ghi nhận.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3" data-testid="kpi-strip">
                            <KpiCard icon="banknote" iconColor="sky" title="Tổng doanh số" trendLabel="Số đơn" trendValue={<span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10.5px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40 tabular-nums">{s.orders}</span>}>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[22px] sm:text-[26px] lg:text-[30px] font-black leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">{fmtTr(s.revenueTotal)}</span>
                                    <span className="text-[12px] sm:text-[14px] font-extrabold text-slate-400 dark:text-slate-500">Tr</span>
                                </div>
                            </KpiCard>
                            <KpiCard icon="credit-card" iconColor="emerald" title="Trả góp" trendLabel="Tỉ lệ" trendValue={<span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40 tabular-nums">{pct(s.traGopCount, s.orders)}%</span>} progressPercent={pct(s.traGopCount, s.orders)}>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[22px] sm:text-[26px] lg:text-[30px] font-black leading-none tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">{s.traGopCount}</span>
                                    <span className="text-[12px] sm:text-[14px] font-extrabold text-slate-400 dark:text-slate-500">đơn</span>
                                </div>
                            </KpiCard>
                            <KpiCard icon="wallet" iconColor="sky" title="Mở Ví" trendLabel="Tỉ lệ" trendValue={<span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10.5px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40 tabular-nums">{pct(s.moViCount, s.orders)}%</span>}>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[22px] sm:text-[26px] lg:text-[30px] font-black leading-none tracking-tight tabular-nums text-sky-700 dark:text-sky-400">{s.moViCount}</span>
                                    <span className="text-[12px] sm:text-[14px] font-extrabold text-slate-400 dark:text-slate-500">đơn</span>
                                </div>
                            </KpiCard>
                            <KpiCard icon="swords" iconColor="rose" title="Chiến giá" trendLabel="Bảo hiểm" trendValue={<span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40 tabular-nums">{fmtTr(s.insuranceTr)} Tr</span>}>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[22px] sm:text-[26px] lg:text-[30px] font-black leading-none tracking-tight tabular-nums text-rose-700 dark:text-rose-400">{s.priceWarCount}</span>
                                    <span className="text-[12px] sm:text-[14px] font-extrabold text-slate-400 dark:text-slate-500">đơn</span>
                                </div>
                            </KpiCard>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <RankingTable group="products" items={s.ranking.products} otherCount={s.otherCounts.products} />
                            <section className="border border-slate-200 bg-white">
                                <BandHeader icon={GROUP_META.insurance.icon} title={GROUP_META.insurance.label} right={<span className="text-[11px] text-slate-500 tabular-nums">Bảo hiểm <b className="text-slate-800">{fmtTr(s.insuranceTr)} Tr</b></span>} />
                                <table className="w-full text-[13px] tabular-nums">
                                    <tbody className="divide-y divide-slate-100">
                                        {s.ranking.insurance.map(i => (
                                            <tr key={i.key} className={`h-[26px] ${i.count > 0 ? '' : 'text-slate-400'}`}><td className="px-2">{i.label}</td><td className="px-2 text-right font-semibold">{i.count}</td></tr>
                                        ))}
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
                            <RankingTable group="household" items={s.ranking.household} otherCount={s.otherCounts.household} />
                            <section className="border border-slate-200 bg-white">
                                <BandHeader icon={GROUP_META.services.icon} title={GROUP_META.services.label} />
                                <table className="w-full text-[13px] tabular-nums">
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className={`h-[26px] ${s.moViCount > 0 ? '' : 'text-slate-400'}`}><td className="px-2">Mở Ví</td><td className="px-2 text-right font-semibold">{s.moViCount} <span className="text-slate-400 font-normal">đơn</span></td></tr>
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
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
