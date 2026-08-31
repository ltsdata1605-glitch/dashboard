import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CompetitionHistorySnapshot } from '../../../utils/competitionHistory';
import { SupermarketCompetitionData, parseNumber } from '../../../utils/dashboardHelpers';
import { EmptyState } from '../../../../../components/shared/ui/EmptyState';
import { ChartBarIcon } from '../../Icons';

// 6 họ semantic x 2 tầng sắc độ, đúng palette đã duyệt (CLAUDE.md mục 2) — xoay vòng khi có
// nhiều chương trình cùng lúc.
const LINE_COLORS = ['#0284c7', '#059669', '#d97706', '#e11d48', '#475569', '#4f46e5'];

interface TrendPoint {
    date: string;
    [programName: string]: string | number;
}

interface CompetitionTrendChartProps {
    historySnapshots: CompetitionHistorySnapshot[];
    todayData?: SupermarketCompetitionData;
    todayKey: string;
    programNames: string[];
}

const formatDateLabel = (dateKey: string): string => {
    const [, m, d] = dateKey.split('-');
    return `${d}/${m}`;
};

export const CompetitionTrendChart: React.FC<CompetitionTrendChartProps> = ({ historySnapshots, todayData, todayKey, programNames }) => {
    const { chartData, metricLabel } = useMemo(() => {
        const allDays: { date: string; headers: string[]; programs: SupermarketCompetitionData['programs'] }[] = [
            ...historySnapshots.map(s => ({ date: s.date, headers: s.headers, programs: s.programs })),
        ];
        if (todayData && todayData.programs?.length > 0) {
            allDays.push({ date: todayKey, headers: todayData.headers, programs: todayData.programs });
        }
        allDays.sort((a, b) => a.date.localeCompare(b.date));

        const label = allDays[0]?.headers?.[0] || 'DTLK';
        const points: TrendPoint[] = allDays.map(day => {
            const point: TrendPoint = { date: formatDateLabel(day.date) };
            programNames.forEach(name => {
                const program = day.programs.find(p => p.name === name);
                point[name] = program ? parseNumber(program.data[0]) : 0;
            });
            return point;
        });
        return { chartData: points, metricLabel: label };
    }, [historySnapshots, todayData, todayKey, programNames]);

    if (chartData.length < 2 || programNames.length === 0) {
        return (
            <EmptyState
                compact
                icon={<ChartBarIcon className="h-5 w-5" />}
                title="Chưa đủ dữ liệu để vẽ xu hướng"
                description="Cần ít nhất 2 ngày dữ liệu (đã qua thời gian tích luỹ lịch sử) và ít nhất 1 chương trình đang được chọn ở bộ lọc."
            />
        );
    }

    const numberFormatter = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

    return (
        <div className="px-4 py-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Xu hướng {metricLabel} theo ngày</p>
            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => numberFormatter.format(v)} />
                    <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value)} />
                    {programNames.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
                    {programNames.map((name, idx) => (
                        <Area
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                            fill={LINE_COLORS[idx % LINE_COLORS.length]}
                            fillOpacity={0.08}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
