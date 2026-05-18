import React, { useState, useEffect } from 'react';
import type { HeadToHeadTableConfig, HeadToHeadConditionalFormatRule } from '../../../types';
import ModalWrapper from '../../modals/ModalWrapper';
import { Icon } from '../../common/Icon';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: Omit<HeadToHeadTableConfig, 'id'>) => void;
    allSubgroups: string[];
    allParentGroups: string[];
    editingConfig?: HeadToHeadTableConfig;
}

const HeadToHeadConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onSave, allSubgroups, allParentGroups, editingConfig }) => {
    const [tableName, setTableName] = useState('');
    const [metricType, setMetricType] = useState<HeadToHeadTableConfig['metricType']>('quantity');
    const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
    const [selectedParentGroups, setSelectedParentGroups] = useState<string[]>([]);
    const [totalCalculationMethod, setTotalCalculationMethod] = useState<'sum' | 'average'>('sum');
    const [conditionalFormats, setConditionalFormats] = useState<HeadToHeadConditionalFormatRule[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (editingConfig) {
                setTableName(editingConfig.tableName);
                setMetricType(editingConfig.metricType);
                setSelectedSubgroups(editingConfig.selectedSubgroups);
                setSelectedParentGroups(editingConfig.selectedParentGroups || []);
                setTotalCalculationMethod(editingConfig.totalCalculationMethod || 'sum');
                setConditionalFormats(editingConfig.conditionalFormats || []);
            } else {
                setTableName('');
                setMetricType('quantity');
                setSelectedSubgroups([]);
                setSelectedParentGroups([]);
                setTotalCalculationMethod('sum');
                setConditionalFormats([]);
            }
        }
    }, [isOpen, editingConfig]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (tableName.trim()) {
            let finalTableName = tableName.trim().toUpperCase();
            if (!editingConfig) {
                finalTableName = `7 NGÀY - ${finalTableName}`;
            }
            onSave({ tableName: finalTableName, metricType, selectedSubgroups, selectedParentGroups, totalCalculationMethod, conditionalFormats });
        }
    };

    const addRule = () => {
        const newRule: HeadToHeadConditionalFormatRule = {
            id: `rule-${Date.now()}`,
            criteria: 'specific_value',
            operator: '>',
            value: 0,
            textColor: '#000000',
            backgroundColor: '#ffff00'
        };
        setConditionalFormats(prev => [...prev, newRule]);
    };

    const updateRule = (id: string, field: keyof HeadToHeadConditionalFormatRule, value: any) => {
        setConditionalFormats(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const removeRule = (id: string) => {
        setConditionalFormats(prev => prev.filter(r => r.id !== id));
    };

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={editingConfig ? "Sửa Bảng Theo Dõi" : "Tạo Bảng Theo Dõi Mới"}
            subTitle="Tùy chỉnh bảng so sánh hiệu suất trong 7 ngày"
            titleColorClass="text-primary-600 dark:text-primary-400"
            maxWidthClass="max-w-3xl"
        >
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
                <div className="flex-grow p-5 sm:p-6 space-y-6 sm:space-y-8 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar min-h-0">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-5">
                        <h4 className="flex items-center gap-2 font-bold mb-4 text-slate-800 dark:text-slate-100">
                            <Icon name="layout" size={4} className="text-indigo-500" /> Cấu trúc bảng
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div>
                                <label htmlFor="tableName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">Tên Bảng (Bắt buộc) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Icon name="edit-3" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input id="tableName" type="text" value={tableName} onChange={e => setTableName(e.target.value)} placeholder="VD: Thi Đua Sim Số" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2.5 text-sm font-bold text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none shadow-sm" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Chỉ số đo lường chính</label>
                                <div className="relative">
                                    <Icon name="bar-chart-2" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select value={metricType} onChange={e => setMetricType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none shadow-sm appearance-none cursor-pointer">
                                        <option value="quantity">Số lượng</option>
                                        <option value="revenue">Doanh thu</option>
                                        <option value="revenueQD">Doanh thu quy đổi</option>
                                        <option value="hieuQuaQD">Hiệu quả quy đổi</option>
                                    </select>
                                    <Icon name="chevron-down" size={4} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            
                            <div className="md:col-span-2 mt-1">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                                    Nguồn dữ liệu
                                    <span className="font-normal text-xs text-slate-500">Mặc định hiển thị tất cả nếu bỏ trống</span>
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Ngành hàng (Cha)</label>
                                         <MultiSelectDropdown options={allParentGroups} selected={selectedParentGroups} onChange={setSelectedParentGroups} label="ngành hàng" placeholder="Lọc theo ngành hàng" variant="compact"/>
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Nhóm hàng (Con)</label>
                                         <MultiSelectDropdown options={allSubgroups} selected={selectedSubgroups} onChange={setSelectedSubgroups} label="nhóm hàng" placeholder="Lọc theo nhóm hàng" variant="compact"/>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Calculation */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                            <h4 className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                                <Icon name="calculator" size={4} /> Cách tính dòng tổng chốt
                            </h4>
                        </div>
                        <div className="p-5">
                            <div className="flex bg-slate-100 p-1.5 rounded-xl self-start w-max border border-slate-200 shadow-inner">
                                <button type="button" onClick={() => setTotalCalculationMethod('sum')} className={`px-5 py-2 text-sm rounded-lg transition-all ${totalCalculationMethod === 'sum' ? 'bg-white text-indigo-700 shadow ring-1 ring-black/5 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'}`}>Tổng 7 ngày</button>
                                <button type="button" onClick={() => setTotalCalculationMethod('average')} className={`px-5 py-2 text-sm rounded-lg transition-all ${totalCalculationMethod === 'average' ? 'bg-white text-indigo-700 shadow ring-1 ring-black/5 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'}`}>Trung bình / Ngày</button>
                            </div>
                        </div>
                    </div>

                    {/* Conditional Formatting */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-emerald-50/30 dark:bg-emerald-900/10">
                            <h4 className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                                <Icon name="paint-bucket" size={4} /> Định dạng có điều kiện
                            </h4>
                            <button type="button" onClick={addRule} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200 shadow-sm transition-colors flex items-center gap-1.5"><Icon name="plus" size={3.5}/>Thêm luật</button>
                        </div>
                        
                        <div className="p-5">
                            {conditionalFormats.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50">
                                    <Icon name="list-filter" size={6} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500 font-medium">Chưa có quy tắc nào.</p>
                                    <button type="button" onClick={addRule} className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">Thiết lập ngay</button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {conditionalFormats.map(rule => (
                                        <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end p-4 border border-slate-200 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:border-slate-300 transition-colors shadow-sm">
                                            <div className="sm:col-span-2 lg:col-span-2">
                                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Tiêu chí</label>
                                                <select value={rule.criteria} onChange={e => updateRule(rule.id, 'criteria', e.target.value)} className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500">
                                                    <option value="specific_value">So với giá trị cụ thể</option>
                                                    <option value="column_dept_avg">So với T.Bình bộ phận</option>
                                                    <option value="row_avg">So với T.Bình nhân viên</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Điều kiện</label>
                                                <select value={rule.operator} onChange={e => updateRule(rule.id, 'operator', e.target.value)} className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 text-center font-mono">
                                                    <option value=">">&gt;</option>
                                                    <option value="<">&lt;</option>
                                                    <option value="=">=</option>
                                                </select>
                                            </div>
                                            {rule.criteria === 'specific_value' ? (
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Nền tham chiếu</label>
                                                    <input type="number" value={rule.value} onChange={e => updateRule(rule.id, 'value', Number(e.target.value))} className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-white px-3 focus:ring-2 focus:ring-indigo-500 text-sm font-medium" />
                                                </div>
                                            ) : <div />}
                                            <div className="flex items-end gap-2 lg:col-span-2">
                                                <div className="flex-grow flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5">
                                                    <div className="flex-1 flex flex-col items-center">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Màu chữ</label>
                                                        <input type="color" value={rule.textColor} onChange={e => updateRule(rule.id, 'textColor', e.target.value)} className="w-7 h-7 rounded shrink-0 cursor-pointer border-0 p-0" title="Chọn màu chữ"/>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-100"></div>
                                                    <div className="flex-1 flex flex-col items-center">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Màu nền</label>
                                                        <input type="color" value={rule.backgroundColor} onChange={e => updateRule(rule.id, 'backgroundColor', e.target.value)} className="w-7 h-7 rounded shrink-0 cursor-pointer border-0 p-0" title="Chọn màu nền"/>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => removeRule(rule.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100 shrink-0" title="Xóa luật"><Icon name="trash-2" size={4.5}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 rounded-b-xl shrink-0">
                    <button type="button" onClick={onClose} className="py-2 px-5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Hủy Bỏ</button>
                    <button type="submit" className="py-2 px-6 rounded-xl shadow text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2">
                        {editingConfig ? <><Icon name="save" size={4}/> Lưu Thay Đổi</> : <><Icon name="plus" size={4}/> Thêm Bảng</>}
                    </button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default HeadToHeadConfigModal;