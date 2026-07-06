import React from 'react';
import { Icon } from '../../../common/Icon';
import MultiSelectDropdown from '../../../common/MultiSelectDropdown';
import { Select } from '../../../shared/ui/Select';
import { Input } from '../../../shared/ui/Input';
import { Button } from '../../../shared/ui/Button';

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
        <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Icon name="filter" size={4} className="text-sky-500" /> Chỉ định nguồn dữ liệu
                </h4>
            </div>
            <div className="space-y-5">
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Đơn vị đo lường</label>
                    <div className="inline-flex rounded-md p-1 bg-slate-100/50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 w-full sm:w-auto">
                        <Button type="button" variant="ghost" onClick={() => setMetricType('quantity')} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 sm:flex-none py-1.5 px-4 text-xs sm:text-sm rounded transition-colors ${metricType === 'quantity' ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>Số lượng</Button>
                        <Button type="button" variant="ghost" onClick={() => setMetricType('revenue')} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 sm:flex-none py-1.5 px-4 text-xs sm:text-sm rounded transition-colors ${metricType === 'revenue' ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>Doanh thu</Button>
                        <Button type="button" variant="ghost" onClick={() => setMetricType('revenueQD')} className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 sm:flex-none py-1.5 px-4 text-xs sm:text-sm rounded transition-colors ${metricType === 'revenueQD' ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-normal border border-transparent'}`}>Doanh thu QĐ</Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
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
                    <label htmlFor="productCodes" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hoặc truy vấn nhanh mã SP (dấu phẩy)</label>
                    <textarea id="productCodes" value={productCodes} onChange={(e) => setProductCodes(e.target.value)} rows={2} placeholder="Ví dụ: 2515024, 050012..." className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md p-2 sm:p-2.5 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors outline-none font-mono"></textarea>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h5 className="font-medium text-sm text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Icon name="tag" size={4} className="text-slate-400" /> Lọc theo cấu hình giá trị bán
                    </h5>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="w-full sm:w-[160px]">
                            <Select value={priceType} onChange={e => setPriceType(e.target.value as 'original' | 'discounted')} className="h-8 sm:h-10 text-xs sm:text-sm">
                                <option value="discounted">Giá bán (Khuyến mãi)</option>
                                <option value="original">Giá niêm yết (Gốc)</option>
                            </Select>
                        </div>
                        <div className="w-full sm:w-[130px]">
                            <Select value={priceCondition} onChange={e => setPriceCondition(e.target.value as 'greater' | 'less' | 'equal' | 'between' | 'none')} className="h-8 sm:h-10 text-xs sm:text-sm">
                                <option value="none" className="text-slate-500">Bỏ qua giá</option>
                                <option value="greater">Lớn hơn - &gt;</option>
                                <option value="less">Nhỏ hơn - &lt;</option>
                                <option value="equal">Bằng đúng - =</option>
                                <option value="between">Trong khoảng</option>
                            </Select>
                        </div>
                        {priceCondition !== 'none' && (
                            <div className="flex-grow flex items-center gap-2">
                                <div className="relative flex-grow">
                                    <Input type="number" value={priceValue1} onChange={e => setPriceValue1(e.target.value)} placeholder="0 đ" className="h-8 sm:h-10 text-xs sm:text-sm" />
                                </div>
                                {priceCondition === 'between' && (
                                    <div className="flex items-center gap-2 flex-grow">
                                        <span className="text-slate-400 text-xs sm:text-sm font-medium">~</span>
                                        <Input type="number" value={priceValue2} onChange={e => setPriceValue2(e.target.value)} placeholder="0 đ" className="h-8 sm:h-10 text-xs sm:text-sm" />
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
