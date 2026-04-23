import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarData {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarData[];
  yAxisLabel?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl border border-slate-700 pointer-events-none">
        <p className="font-bold mb-0.5">{label}</p>
        <p className="text-slate-300">{`${payload[0].value.toLocaleString('vi-VN')} ${payload[0].payload.yLabel || ''}`}</p>
      </div>
    );
  }
  return null;
};

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, yAxisLabel }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
        Không có dữ liệu để hiển thị biểu đồ.
      </div>
    );
  }

  const chartData = data.map(d => ({ ...d, yLabel: yAxisLabel || '' }));

  return (
    <div className="w-full text-xs text-slate-500 dark:text-slate-400" style={{ height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <XAxis dataKey="label" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis 
            tick={{ fill: '#64748b' }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(value) => value.toLocaleString('vi-VN')}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, index) => {
              const val = entry.value;
              let color = '#3b82f6'; // primary-500
              if (val >= 100) color = '#22c55e'; // green-500
              else if (val < 85) color = '#eab308'; // yellow-500
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleBarChart;
