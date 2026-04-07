import React from 'react';
import { Icon } from '../../../common/Icon';
import type { ColumnConfig } from '../../../../types';

interface CalculatedColumnFormProps {
    operation: '+' | '-' | '/' | '*';
    setOperation: (val: '+' | '-' | '/' | '*') => void;
    operand1: string;
    setOperand1: (val: string) => void;
    operand2: string;
    setOperand2: (val: string) => void;
    displayAs: 'number' | 'percentage';
    setDisplayAs: (val: 'number' | 'percentage') => void;
    availableOperands: ColumnConfig[];
}

export const CalculatedColumnForm: React.FC<CalculatedColumnFormProps> = ({
    operation, setOperation,
    operand1, setOperand1,
    operand2, setOperand2,
    displayAs, setDisplayAs,
    availableOperands
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-5">
            <div className="bg-amber-50/50 dark:bg-amber-900/20 px-5 py-3 border-b border-amber-100 dark:border-amber-900">
                <h4 className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                    <Icon name="sigma" size={4} /> Thuật toán ghép cột
                </h4>
            </div>
            <div className="p-5">
                <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                    <div className="flex-1 w-full relative">
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">Nguồn dữ liệu 1</label>
                        <select value={operand1} onChange={e => setOperand1(e.target.value)} className="w-full h-12 block rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pl-4 truncate pr-8 cursor-pointer">
                            <option value="">-- Chọn Cột --</option>
                            {availableOperands.map(c => <option key={c.id} value={c.id}>{c.mainHeader ? `[${c.mainHeader}] ${c.columnName}` : c.columnName}</option>)}
                        </select>
                    </div>
                    <div className="flex-shrink-0 relative w-16 h-12 mt-5 hidden md:flex items-center justify-center">
                        <select value={operation} onChange={e => setOperation(e.target.value as any)} className="absolute inset-0 z-10 opacity-0 cursor-pointer w-full h-full">
                            <option value="+">+</option>
                            <option value="-">-</option>
                            <option value="*">*</option>
                            <option value="/">/</option>
                        </select>
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg pointer-events-none group hover:bg-indigo-200 transition-colors">
                            {operation === '*' ? '×' : operation === '/' ? '÷' : operation}
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5 md:opacity-0 hidden md:block">Nguồn dữ liệu 2</label>
                        <select value={operand2} onChange={e => setOperand2(e.target.value)} className="w-full h-12 block rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pl-4 truncate pr-8 cursor-pointer">
                            <option value="">-- Chọn Cột --</option>
                                {availableOperands.map(c => <option key={c.id} value={c.id}>{c.mainHeader ? `[${c.mainHeader}] ${c.columnName}` : c.columnName}</option>)}
                        </select>
                    </div>
                </div>
                {operation === '/' && (
                        <div className="mt-5 max-w-[200px] ml-auto">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kết quả hiển thị dưới dạng</label>
                        <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full">
                            <button type="button" onClick={() => setDisplayAs('number')} className={`flex-1 py-1 px-3 text-sm font-semibold rounded-md transition-all ${displayAs === 'number' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Tỉ lệ</button>
                            <button type="button" onClick={() => setDisplayAs('percentage')} className={`flex-1 py-1 px-3 text-sm font-semibold rounded-md transition-all ${displayAs === 'percentage' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>% Phần trăm</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
