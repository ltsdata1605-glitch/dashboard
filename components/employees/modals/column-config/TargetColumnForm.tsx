import React from 'react';
import { Icon } from '../../../common/Icon';
import { Input } from '../../../shared/ui/Input';

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
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-3 sm:mt-5">
            <div className="bg-teal-50/80 dark:bg-teal-900/20 px-3 sm:px-5 py-2 sm:py-3 border-b border-teal-100 dark:border-teal-900">
                <h4 className="flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-base text-teal-700 dark:text-teal-300">
                    <Icon name="target" size={3.5} className="sm:hidden" /><Icon name="target" size={4} className="hidden sm:block" /> Chỉ tiêu kho (Target)
                </h4>
            </div>
            <div className="p-3 sm:p-5 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                    <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">Đinh dạng chỉ tiêu</label>
                        <div className="inline-flex rounded-lg shadow-sm p-0.5 sm:p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full">
                            <button type="button" onClick={() => setMetricType('revenue')} className={`flex-1 py-1 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-sm font-bold rounded-md transition-all ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Tiền Tệ ($)</button>
                            <button type="button" onClick={() => setMetricType('quantity')} className={`flex-1 py-1 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-sm font-bold rounded-md transition-all ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Số Lượng (#)</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">Tổng Mục Tiêu *</label>
                        <div className="relative">
                            <Input 
                                type="text" 
                                value={targetValue} 
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                    setTargetValue(raw ? Number(raw).toLocaleString('en-US') : '');
                                }}
                                placeholder="VD: 1,500,000,000" 
                                leftIcon={metricType === 'revenue' ? "dollar-sign" : "hash"}
                                className="h-10 sm:h-12 text-xs sm:text-base font-black text-teal-700 dark:text-teal-300"
                            />
                        </div>
                        <p className="mt-1.5 sm:mt-2.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 sm:gap-1.5 font-medium">
                            <Icon name="info" size={3} className="mt-0.5 text-teal-500 sm:hidden" /><Icon name="info" size={3.5} className="mt-0.5 text-teal-500 hidden sm:block" />
                            <span>Hệ thống phân bổ tổng điểm này theo nguyên tắc trung bình công cho số lượng nhân viên thực tế làm việc.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
