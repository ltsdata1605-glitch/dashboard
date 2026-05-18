import React from 'react';
import { Icon } from '../../../common/Icon';
import { DATA_STATUS_COLORS } from '../../../../constants';

interface FormattingRule {
    id: number;
    condition: string;
    value1: string;
    value2: string;
    color: string;
    textColor: string;
}

interface FormattingRulesFormProps {
    formattingRules: FormattingRule[];
    addFormattingRule: () => void;
    updateFormattingRule: (id: number, field: string, value: string) => void;
    removeFormattingRule: (id: number) => void;
}

const getAutoLabel = (condition: string) => {
    const isNegative = condition === '<' || condition === '<avg';
    const colors = isNegative ? DATA_STATUS_COLORS.negative : DATA_STATUS_COLORS.positive;
    const label = isNegative ? 'Cảnh báo (Đỏ)' : 'Tốt (Xanh)';
    return { colors, label };
};

export const FormattingRulesForm: React.FC<FormattingRulesFormProps> = ({
    formattingRules, addFormattingRule, updateFormattingRule, removeFormattingRule
}) => {
    return (
        <div className="mt-3 sm:mt-5">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
                <h4 className="font-bold text-xs sm:text-base text-slate-800 dark:text-slate-200 flex items-center gap-1.5 sm:gap-2">
                    <Icon name="paintbrush" size={3.5} className="text-pink-500 dark:text-pink-400 sm:hidden" />
                    <Icon name="paintbrush" size={4} className="text-pink-500 dark:text-pink-400 hidden sm:block" />
                    Định dạng cảnh báo
                </h4>
                <button type="button" onClick={addFormattingRule} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-sm font-bold bg-slate-200/50 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors flex items-center gap-0.5 sm:gap-1">
                    <Icon name="plus" size={3.5} className="sm:hidden" /><Icon name="plus" size={4} className="hidden sm:block" />Thêm luật
                </button>
            </div>
            {formattingRules.length === 0 ? (
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-sm font-medium">Tạo luật đổ màu ô tự động dựa trên số liệu thực tế</span>
                </div>
            ) : (
                <div className="space-y-2 sm:space-y-2.5">
                    {formattingRules.map((rule) => {
                        const valueInputsNeeded = !['<avg', '>avg'].includes(rule.condition);
                        const { colors: autoColors, label: autoLabel } = getAutoLabel(rule.condition);
                        const isNegative = rule.condition === '<' || rule.condition === '<avg';
                        return (
                        <div key={rule.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_auto] gap-1.5 sm:gap-3 items-end p-2 sm:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl shadow-sm">
                            <div>
                                <label className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase truncate block">Luật kiểm tra</label>
                                <select value={rule.condition} onChange={e => updateFormattingRule(rule.id, 'condition', e.target.value)} className="w-full h-8 sm:h-10 mt-0.5 sm:mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-[10px] sm:text-sm px-1 sm:px-3">
                                    <option value=">">&gt; Lớn hơn</option>
                                    <option value="<">&lt; Nhỏ hơn</option>
                                    <option value="=">=Bằng</option>
                                    <option value="between">Trong khoảng</option>
                                    <option value=">avg">Cao hơn T.Bình</option>
                                    <option value="<avg">Thấp hơn T.Bình</option>
                                </select>
                            </div>
                            {valueInputsNeeded ? (
                                <div className={rule.condition === 'between' ? 'grid grid-cols-2 gap-1.5 sm:gap-2' : ''}>
                                    <div>
                                        <label className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-transparent select-none">-</label>
                                        <input type="number" value={rule.value1} onChange={e => updateFormattingRule(rule.id, 'value1', e.target.value)} placeholder="Nhập số" className="w-full h-8 sm:h-10 mt-0.5 sm:mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 text-[10px] sm:text-sm px-1.5 sm:px-3"/>
                                    </div>
                                    {rule.condition === 'between' && (
                                        <div>
                                            <label className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase truncate block">&amp; dưới</label>
                                            <input type="number" value={rule.value2} onChange={e => updateFormattingRule(rule.id, 'value2', e.target.value)} placeholder="Nhập số..." className="w-full h-8 sm:h-10 mt-0.5 sm:mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 text-[10px] sm:text-sm px-1.5 sm:px-3"/>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center h-8 sm:h-10 mt-0.5 sm:mt-1">
                                    <div className="text-[9px] sm:text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-1 sm:px-3 py-1 sm:py-1.5 rounded w-full text-center border-dashed border-slate-200 border flex items-center justify-center h-full">
                                        <span className="sm:hidden">So sánh T.Bình</span>
                                        <span className="hidden sm:inline">Tự động so sánh với trung bình cột</span>
                                    </div>
                                </div>
                            )}
                            <button type="button" onClick={() => removeFormattingRule(rule.id)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/50 flex-shrink-0 self-end">
                                <Icon name="trash-2" size={3.5} className="sm:hidden"/><Icon name="trash-2" size={4} className="hidden sm:block"/>
                            </button>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};
