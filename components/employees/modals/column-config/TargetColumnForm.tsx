import React from 'react';
import { Icon } from '../../../common/Icon';
import { Input } from '../../../shared/ui/Input';
import { Button } from '../../../shared/ui/Button';

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
        <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Icon name="target" size={4} className="text-sky-500" /> Chỉ tiêu kho (Target)
                </h4>
            </div>
            <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Định dạng chỉ tiêu</label>
                        <div className="inline-flex rounded-md p-1 bg-slate-100/50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 w-full sm:w-auto">
                            <button type="button" onClick={() => setMetricType('revenue')} className={`flex-1 sm:flex-none py-1.5 px-4 text-xs sm:text-sm rounded transition-colors ${metricType === 'revenue' ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>Tiền Tệ ($)</button>
                            <button type="button" onClick={() => setMetricType('quantity')} className={`flex-1 sm:flex-none py-1.5 px-4 text-xs sm:text-sm rounded transition-colors ${metricType === 'quantity' ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>Số Lượng (#)</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tổng Mục Tiêu *</label>
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
                                className="h-10"
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                            <Icon name="info" size={3.5} className="mt-0.5 text-sky-500" />
                            <span>Hệ thống phân bổ tổng điểm này theo nguyên tắc trung bình cộng cho số lượng nhân viên thực tế làm việc.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
