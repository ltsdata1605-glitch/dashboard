import React from 'react';
import { Icon } from '../../../common/Icon';
import MultiSelectDropdown from '../../../common/MultiSelectDropdown';

interface DataColumnFormProps {
    metricType: 'quantity' | 'revenue' | 'revenueQD';
    setMetricType: (val: 'quantity' | 'revenue' | 'revenueQD') => void;
    allIndustries: string[];
    selectedIndustries: string[];
    setSelectedIndustries: (val: string[]) => void;
    allSubgroups: string[];
    selectedSubgroups: string[];
    setSelectedSubgroups: (val: string[]) => void;
    allManufacturers: string[];
    selectedManufacturers: string[];
    setSelectedManufacturers: (val: string[]) => void;
    productCodes: string;
    setProductCodes: (val: string) => void;
    priceType: 'original' | 'discounted';
    setPriceType: (val: 'original' | 'discounted') => void;
    priceCondition: 'greater' | 'less' | 'equal' | 'between' | 'none';
    setPriceCondition: (val: 'greater' | 'less' | 'equal' | 'between' | 'none') => void;
    priceValue1: string;
    setPriceValue1: (val: string) => void;
    priceValue2: string;
    setPriceValue2: (val: string) => void;
}

export const DataColumnForm: React.FC<DataColumnFormProps> = ({
    metricType, setMetricType,
    allIndustries, selectedIndustries, setSelectedIndustries,
    allSubgroups, selectedSubgroups, setSelectedSubgroups,
    allManufacturers, selectedManufacturers, setSelectedManufacturers,
    productCodes, setProductCodes,
    priceType, setPriceType,
    priceCondition, setPriceCondition,
    priceValue1, setPriceValue1,
    priceValue2, setPriceValue2
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-3 sm:mt-5">
            <div className="bg-indigo-50/50 dark:bg-indigo-900/20 px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-200 dark:border-slate-700">
                <h4 className="flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-base text-indigo-700 dark:text-indigo-300">
                    <Icon name="filter" size={3.5} className="sm:hidden" /><Icon name="filter" size={4} className="hidden sm:block" /> Chỉ định nguồn dữ liệu
                </h4>
            </div>
            <div className="p-3 sm:p-5 space-y-3 sm:space-y-5">
                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">Đơn vị đo lường</label>
                    <div className="inline-flex rounded-lg p-0.5 sm:p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                        <button type="button" onClick={() => setMetricType('quantity')} className={`flex-1 sm:flex-none py-1 sm:py-1.5 px-3 sm:px-6 text-[10px] sm:text-sm font-bold rounded-md transition-all ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Số lượng</button>
                        <button type="button" onClick={() => setMetricType('revenue')} className={`flex-1 sm:flex-none py-1 sm:py-1.5 px-3 sm:px-6 text-[10px] sm:text-sm font-bold rounded-md transition-all ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Doanh thu</button>
                        <button type="button" onClick={() => setMetricType('revenueQD')} className={`flex-1 sm:flex-none py-1 sm:py-1.5 px-3 sm:px-6 text-[10px] sm:text-sm font-bold rounded-md transition-all ${metricType === 'revenueQD' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Doanh thu QĐ</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ngành hàng</label>
                        <MultiSelectDropdown options={allIndustries} selected={selectedIndustries} onChange={setSelectedIndustries} label="Ngành hàng" variant="compact"/>
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhóm hàng</label>
                        <MultiSelectDropdown options={allSubgroups} selected={selectedSubgroups} onChange={setSelectedSubgroups} label="Nhóm hàng" variant="compact"/>
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Thương hiệu</label>
                        <MultiSelectDropdown options={allManufacturers} selected={selectedManufacturers} onChange={setSelectedManufacturers} label="Thương hiệu" variant="compact" />
                    </div>
                </div>
                <div>
                    <label htmlFor="productCodes" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-slate-500">Hoặc truy vấn nhanh mã SP (dấu phẩy)</label>
                    <textarea id="productCodes" value={productCodes} onChange={(e) => setProductCodes(e.target.value)} rows={2} placeholder="Ví dụ: 2515024, 050012..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none font-mono"></textarea>
                </div>
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 sm:pt-4 mt-1 sm:mt-2">
                    <h5 className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-2 sm:mb-3 flex items-center gap-1.5">
                        <Icon name="tag" size={3.5} /> Lọc theo cấu hình giá trị bán
                    </h5>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="w-full sm:w-[160px]">
                            <select value={priceType} onChange={e => setPriceType(e.target.value as any)} className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="discounted">Giá bán (Khuyến mãi)</option>
                                <option value="original">Giá niêm yết (Gốc)</option>
                            </select>
                        </div>
                        <div className="w-full sm:w-[130px]">
                            <select value={priceCondition} onChange={e => setPriceCondition(e.target.value as any)} className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="none" className="text-slate-500">Bỏ qua giá</option>
                                <option value="greater">Lớn hơn - &gt;</option>
                                <option value="less">Nhỏ hơn - &lt;</option>
                                <option value="equal">Bằng đúng - =</option>
                                <option value="between">Trong khoảng</option>
                            </select>
                        </div>
                        {priceCondition !== 'none' && (
                            <div className="flex-grow flex items-center gap-2">
                                <div className="relative flex-grow">
                                    <input type="number" value={priceValue1} onChange={e => setPriceValue1(e.target.value)} placeholder="0 đ" className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-3 pr-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                {priceCondition === 'between' && (
                                    <div className="flex items-center gap-2 flex-grow">
                                        <span className="text-slate-400 text-sm font-medium">~</span>
                                        <input type="number" value={priceValue2} onChange={e => setPriceValue2(e.target.value)} placeholder="0 đ" className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-3 pr-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
