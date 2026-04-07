import React from 'react';
import { Icon } from '../../../common/Icon';

interface FormattingRule {
    id: number;
    condition: string;
    value1: string;
    value2: string;
    color: string;
}

const ALERT_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
];

interface FormattingRulesFormProps {
    formattingRules: FormattingRule[];
    addFormattingRule: () => void;
    updateFormattingRule: (id: number, field: string, value: string) => void;
    removeFormattingRule: (id: number) => void;
}

export const FormattingRulesForm: React.FC<FormattingRulesFormProps> = ({
    formattingRules, addFormattingRule, updateFormattingRule, removeFormattingRule
}) => {
    return (
        <div className="mt-5">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Icon name="paintbrush" size={4} className="text-pink-500 dark:text-pink-400" />
                    Định dạng hiển thị cảnh báo
                </h4>
                <button type="button" onClick={addFormattingRule} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-200/50 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1">
                    <Icon name="plus" size={4}/>Thêm luật
                </button>
            </div>
            {formattingRules.length === 0 ? (
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
                    <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">Bạn có thể tạo luật đổ màu ô tự động dựa trên số liệu thực tế</span>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {formattingRules.map((rule) => {
                        const valueInputsNeeded = !['>avg', '<avg'].includes(rule.condition);
                        return (
                        <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                            <div className="sm:col-span-3">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Luật kiểm tra</label>
                                <select value={rule.condition} onChange={e => updateFormattingRule(rule.id, 'condition', e.target.value)} className="w-full h-10 mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-sm">
                                    <option value=">">&gt; Lớn hơn</option>
                                    <option value="<">&lt; Nhỏ hơn</option>
                                    <option value="=">= Bằng</option>
                                    <option value="between">Trong khoảng</option>
                                    <option value=">avg">Cao hơn T.Bình</option>
                                    <option value="<avg">Thấp hơn T.Bình</option>
                                </select>
                            </div>
                            {valueInputsNeeded ? (
                                <>
                                    <div className={`sm:col-span-3 ${rule.condition === 'between' ? '' : 'sm:col-span-5'}`}>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-transparent select-none">-</label>
                                        <input type="number" value={rule.value1} onChange={e => updateFormattingRule(rule.id, 'value1', e.target.value)} placeholder="Nhập số" className="w-full h-10 mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 text-sm"/>
                                    </div>
                                    {rule.condition === 'between' && (
                                        <div className="sm:col-span-3">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">&amp; dưới</label>
                                            <input type="number" value={rule.value2} onChange={e => updateFormattingRule(rule.id, 'value2', e.target.value)} placeholder="Nhập số..." className="w-full h-10 mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 text-sm"/>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="sm:col-span-5 flex items-center h-10">
                                    <div className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded w-full text-center border-dashed border-slate-200 border">Tự động so sánh với trung bình cột</div>
                                </div>
                            )}
                            <div className="sm:col-span-4 flex items-end gap-2">
                                <div className="flex-grow">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right block w-full">Thì đổi màu</label>
                                    <div className="flex items-center gap-1.5 mt-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm h-10 overflow-hidden px-2 justify-end w-full">
                                        {ALERT_COLORS.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => updateFormattingRule(rule.id, 'color', c)}
                                                className={`w-4 h-4 rounded-full transition-all flex-shrink-0 ${rule.color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-125' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                        <input type="color" value={rule.color} onChange={e => updateFormattingRule(rule.id, 'color', e.target.value)} className="w-5 h-5 p-0 border-0 rounded cursor-pointer shrink-0 appearance-none bg-transparent"/>
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeFormattingRule(rule.id)} className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/50 flex-shrink-0"><Icon name="trash-2" size={4}/></button>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};
