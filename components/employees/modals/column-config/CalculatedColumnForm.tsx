import React from 'react';
import { Icon } from '../../../common/Icon';
import { Select } from '../../../shared/ui/Select';
import { Button } from '../../../shared/ui/Button';

interface CalculatedColumnFormProps {
    operation: '+' | '-' | '/' | '*';
    setOperation: (val: '+' | '-' | '/' | '*') => void;
    operand1: string;
    setOperand1: (val: string) => void;
    operand2: string;
    setOperand2: (val: string) => void;
    displayAs: 'number' | 'percentage';
    setDisplayAs: (val: 'number' | 'percentage') => void;
    decimalPlaces?: 0 | 1 | 2;
    setDecimalPlaces: (val: 0 | 1 | 2) => void;
    // Chỉ cần 3 field này (xem JSX bên dưới) — dùng shape hẹp thay vì ColumnConfig đầy đủ để
    // HeadToHeadConfigModal (chỉ có id/columnName) cũng truyền được mà không cần ép any.
    availableOperands: { id: string; columnName: string; mainHeader?: string }[];
}

export const CalculatedColumnForm: React.FC<CalculatedColumnFormProps> = ({
    operation, setOperation,
    operand1, setOperand1,
    operand2, setOperand2,
    displayAs, setDisplayAs,
    decimalPlaces = 0, setDecimalPlaces,
    availableOperands
}) => {
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Icon name="sigma" size={4} className="text-sky-500" /> Thuật toán ghép cột
                </h4>
            </div>
            <div className="space-y-5">
                <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
                    <div className="flex-1 w-full relative">
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nguồn dữ liệu 1</label>
                        <Select value={operand1} onChange={e => setOperand1(e.target.value)} className="h-9">
                            <option value="">– Chọn –</option>
                            {availableOperands.map(c => <option key={c.id} value={c.id}>{c.mainHeader ? `[${c.mainHeader}] ${c.columnName}` : c.columnName}</option>)}
                        </Select>
                    </div>
                    <div className="flex-shrink-0 relative w-8 sm:w-10 h-8 sm:h-10 mt-6 flex items-center justify-center">
                        <select value={operation} onChange={e => setOperation(e.target.value as '+' | '-' | '/' | '*')} className="absolute inset-0 z-10 opacity-0 cursor-pointer w-full h-full">
                            <option value="+">+</option>
                            <option value="-">-</option>
                            <option value="*">*</option>
                            <option value="/">/</option>
                        </select>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium text-lg pointer-events-none transition-colors">
                            {operation === '*' ? '×' : operation === '/' ? '÷' : operation}
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 opacity-0">Nguồn 2</label>
                        <Select value={operand2} onChange={e => setOperand2(e.target.value)} className="h-9">
                            <option value="">– Chọn –</option>
                            {availableOperands.map(c => <option key={c.id} value={c.id}>{c.mainHeader ? `[${c.mainHeader}] ${c.columnName}` : c.columnName}</option>)}
                        </Select>
                    </div>
                </div>
                <div className="pt-2 flex flex-wrap justify-end gap-4">
                    <div className="w-full sm:w-[220px]">
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Làm tròn số</label>
                        <div className="flex rounded-md p-1 bg-slate-100/50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 w-full">
                            <Button type="button" variant="ghost" onClick={() => setDecimalPlaces(0)} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-1.5 px-2 text-xs sm:text-sm rounded transition-colors ${decimalPlaces === 0 ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>Bỏ số lẻ</Button>
                            <Button type="button" variant="ghost" onClick={() => setDecimalPlaces(1)} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-1.5 px-2 text-xs sm:text-sm rounded transition-colors ${decimalPlaces === 1 ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>1 chữ số</Button>
                            <Button type="button" variant="ghost" onClick={() => setDecimalPlaces(2)} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-1.5 px-2 text-xs sm:text-sm rounded transition-colors ${decimalPlaces === 2 ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>2 chữ số</Button>
                        </div>
                    </div>
                    {operation === '/' && (
                        <div className="w-full sm:w-[140px]">
                            <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Định dạng</label>
                            <div className="flex rounded-md p-1 bg-slate-100/50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 w-full">
                                <Button type="button" variant="ghost" onClick={() => setDisplayAs('number')} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-1.5 px-2 text-xs sm:text-sm rounded transition-colors ${displayAs === 'number' ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>Số</Button>
                                <Button type="button" variant="ghost" onClick={() => setDisplayAs('percentage')} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-1.5 px-2 text-xs sm:text-sm rounded transition-colors ${displayAs === 'percentage' ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>%</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
