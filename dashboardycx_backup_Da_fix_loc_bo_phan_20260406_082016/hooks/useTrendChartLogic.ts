import { useMemo } from 'react';
import type { TrendData } from '../types';

export interface RechartsTrendData {
    label: string;
    value: number;
    rawDate?: Date;
    changePercent?: number;
    isDecrease?: boolean;
    fill?: string;
}

interface UseTrendChartLogicProps {
    trendData: TrendData | undefined;
    view: string;
    metric: string;
}

export const useTrendChartLogic = ({ trendData, view, metric }: UseTrendChartLogicProps) => {
    return useMemo(() => {
        if (!trendData) return { totalValue: 0, chartData: [], hasData: false, metricName: metric === 'qd' ? 'DTQĐ' : 'Doanh thu' };

        const metricKey = metric === 'qd' ? 'revenueQD' : 'revenue';
        const metricName = metric === 'qd' ? 'DTQĐ' : 'Doanh thu';
        let totalValue = 0;
        let hasData = false;
        
        const rows: RechartsTrendData[] = [];

        const isDark = document.documentElement.classList.contains('dark');
        const shiftColors = isDark 
            ? ['#a78bfa', '#7dd3fc', '#6ee7b7', '#fde047', '#f9a8d4', '#fda4af']
            : ['#818cf8', '#38bdf8', '#34d399', '#facc15', '#f472b6', '#fb7185'];

        if (view === 'daily') {
            const dailyData = (Object.values(trendData.daily || {}) as Array<{ date: Date; revenue: number; revenueQD: number; }>).sort((a, b) => a.date.getTime() - b.date.getTime());
            dailyData.forEach(day => {
                const value = day[metricKey];
                totalValue += value;
                if (value > 0) hasData = true;
                const formattedDate = day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                rows.push({ label: formattedDate, value, rawDate: day.date });
            });
        } else if (view === 'weekly') {
            const weeklyData = Object.values(trendData.daily || {}).reduce((acc: { [key: string]: { date: Date; value: number } }, day: any) => {
                const date = new Date(day.date);
                date.setHours(0, 0, 0, 0);
                const dayOfWeek = date.getDay();
                const dateOfMonday = new Date(date);
                dateOfMonday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
                const key = dateOfMonday.toISOString().split('T')[0];
                if (!acc[key]) acc[key] = { date: dateOfMonday, value: 0 };
                acc[key].value += day[metricKey];
                return acc;
            }, {});

            const sortedWeeklyData = Object.values(weeklyData).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
            sortedWeeklyData.forEach((week: any, index: number) => {
                totalValue += week.value;
                if (week.value > 0) hasData = true;

                const startDate = week.date;
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                const formatDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }).replace(/\./g, '/');
                const label = `${formatDate(startDate)}-${formatDate(endDate)}`;
                
                let changePercent: number | undefined = undefined;
                let isDecrease = false;

                if (index > 0) {
                    const prevValue = sortedWeeklyData[index - 1].value;
                    if (prevValue > 0) {
                        changePercent = ((week.value - prevValue) / prevValue) * 100;
                        if (changePercent < 0) isDecrease = true;
                    }
                }
                rows.push({ label, value: week.value, changePercent, isDecrease, rawDate: startDate });
            });
        } else if (view === 'monthly') {
            const monthlyData = Object.values(trendData.daily || {}).reduce((acc: { [key: string]: { date: Date; value: number } }, day: any) => {
                const date = new Date(day.date);
                const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const key = firstDayOfMonth.toISOString().split('T')[0];
                if (!acc[key]) acc[key] = { date: firstDayOfMonth, value: 0 };
                acc[key].value += day[metricKey];
                return acc;
            }, {});

            const sortedMonthlyData = Object.values(monthlyData).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
            sortedMonthlyData.forEach((month: any, index: number) => {
                totalValue += month.value;
                if (month.value > 0) hasData = true;
                const label = month.date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
                
                let changePercent: number | undefined = undefined;
                let isDecrease = false;

                if (index > 0) {
                    const prevValue = sortedMonthlyData[index - 1].value;
                    if (prevValue > 0) {
                        changePercent = ((month.value - prevValue) / prevValue) * 100;
                        if (changePercent < 0) isDecrease = true;
                    }
                }
                rows.push({ label, value: month.value, changePercent, isDecrease, rawDate: month.date });
            });
        } else { // shift view
            const shiftData = trendData.shifts || {};
            for (let i = 1; i <= 6; i++) {
                const value = shiftData[`Ca ${i}`]?.[metricKey] || 0;
                totalValue += value;
                if (value > 0) hasData = true;
                const color = shiftColors[i - 1];
                rows.push({ label: `Ca ${i}`, value, fill: color });
            }
        }

        return { totalValue, chartData: rows, hasData, metricName };
    }, [trendData, view, metric]);
};

