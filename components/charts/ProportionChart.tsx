
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CHART_ANIMATION_ENABLED } from '../../utils/chartConfig';

const data = [
  { name: 'Tủ lạnh', value: 400 },
  { name: 'Tivi', value: 300 },
  { name: 'Máy giặt', value: 300 },
  { name: 'Gia dụng', value: 200 },
  { name: 'Điện thoại', value: 278 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ProportionChart: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 overflow-hidden rounded-none mb-8 transition-all duration-300">
      <header className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Tỷ trọng doanh thu theo ngành hàng</h1>
      </header>
      <div className="p-6 h-[400px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              isAnimationActive={CHART_ANIMATION_ENABLED}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
