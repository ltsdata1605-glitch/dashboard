import React from 'react';
import { Icon } from '../../../common/Icon';

interface TargetColumnFormProps {
    metricType: 'quantity' | 'revenue' | 'revenueQD';
    setMetricType: (val: 'quantity' | 'revenue' | 'revenueQD') => void;
    targetValue: string;
    setTargetValue: (val: string) => void;
}

export const TargetColumnForm: React.FC<TargetColumnFormProps> = ({
    metricType, setMetricType,
    targetValue, setTargetValue
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-5">
            <div className="bg-teal-50/80 dark:bg-teal-900/20 px-5 py-3 border-b border-teal-100 dark:border-teal-900">
                <h4 className="flex items-center gap-2 font-bold text-teal-700 dark:text-teal-300">
                    <Icon name="target" size={4} /> Chỉ tiêu kho (Target)
                </h4>
            </div>
            <div className="p-5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Đinh dạng chỉ tiêu</label>
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full">
                            <button type="button" onClick={() => setMetricType('revenue')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-all ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Tiền Tệ ($)</button>
                            <button type="button" onClick={() => setMetricType('quantity')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-all ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Số Lượng (#)</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tổng Mục Tiêu *</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={targetValue} 
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                    setTargetValue(raw ? Number(raw).toLocaleString('en-US') : '');
                                }}
                                placeholder="VD: 1,500,000,000" 
                                className="w-full bg-white dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-800 rounded-lg p-3 pl-10 text-base font-black text-teal-700 dark:text-teal-300 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition outline-none"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500">
                                <Icon name={metricType === 'revenue' ? "dollar-sign" : "hash"} size={5} />
                            </div>
                        </div>
                        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 font-medium">
                            <Icon name="info" size={3.5} className="mt-0.5 text-teal-500" />
                            <span>Hệ thống phân bổ tổng điểm này theo nguyên tắc trung bình công cho số lượng nhân viên thực tế làm việc.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
