import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface TrendDataPoint {
  date: string;
  value: number;
  name: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  employeeName: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 text-white rounded-lg shadow-xl border border-slate-700 p-3 pointer-events-none">
        <p className="text-sm font-bold mb-1 text-primary-400">{`${payload[0].value.toLocaleString('vi-VN')}`}</p>
        <p className="text-xs text-slate-300">{payload[0].payload.name}</p>
        <p className="text-[10px] text-slate-500 mt-1">{payload[0].payload.date}</p>
      </div>
    );
  }
  return null;
};

const TrendChart: React.FC<TrendChartProps> = ({ data, employeeName }) => {
    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 py-8">
                <p>Cần ít nhất 2 snapshot dữ liệu để vẽ biểu đồ xu hướng.</p>
            </div>
        );
    }
  
    return (
        <div style={{ height: '300px', width: '100%' }}>
            <h4 className="text-lg font-semibold text-center text-slate-700 dark:text-slate-200 mb-4">
                Xu hướng Hiệu suất của {employeeName}
            </h4>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={true} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                        dy={10}
                        stroke="#94a3b8"
                    />
                    <YAxis 
                        axisLine={true} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                        tickFormatter={(val) => val.toLocaleString('vi-VN')}
                        stroke="#94a3b8"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#3b82f6' }}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;