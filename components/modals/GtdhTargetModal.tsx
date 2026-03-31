import React, { useState, useMemo } from 'react';
import ModalWrapper from './ModalWrapper';
import { useDashboardContext } from '../../contexts/DashboardContext';
import SearchableSelect from '../common/SearchableSelect';
import { Icon } from '../common/Icon';
import { formatCurrency } from '../../utils/dataUtils';

interface GtdhTargetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GtdhTargetModal: React.FC<GtdhTargetModalProps> = ({ isOpen, onClose }) => {
    const { productConfig, gtdhTargets, updateGtdhTarget, deleteGtdhTarget } = useDashboardContext();

    const [selectedNganhHang, setSelectedNganhHang] = useState('');
    const [selectedNhomHang, setSelectedNhomHang] = useState('');
    const [targetValue, setTargetValue] = useState('');

    const nganhHangOptions = useMemo(() => {
        if (!productConfig?.subgroups) return [];
        return Object.keys(productConfig.subgroups).sort();
    }, [productConfig]);

    const nhomHangOptions = useMemo(() => {
        if (!productConfig?.subgroups || !selectedNganhHang) return [];
        return Object.keys(productConfig.subgroups[selectedNganhHang] || {}).sort();
    }, [productConfig, selectedNganhHang]);

    // Update form when Nhóm Hàng changes
    React.useEffect(() => {
        if (selectedNhomHang && gtdhTargets[selectedNhomHang] !== undefined) {
            setTargetValue(gtdhTargets[selectedNhomHang].toString());
        } else {
            setTargetValue('');
        }
    }, [selectedNhomHang, gtdhTargets]);

    const handleNganhHangChange = (value: string) => {
        setSelectedNganhHang(value);
        setSelectedNhomHang('');
        setTargetValue('');
    };

    const handleSave = () => {
        if (!selectedNhomHang) return;
        const numValue = parseFloat(targetValue.replace(/,/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
            updateGtdhTarget(selectedNhomHang, numValue);
            setSelectedNhomHang('');
            setTargetValue('');
        }
    };

    const gtdhList = Object.entries(gtdhTargets).sort((a, b) => a[0].localeCompare(b[0]));

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Cấu hình Mục Tiêu GTĐH (AOV)"
            subTitle="Thiết lập chỉ tiêu cảnh báo màu đỏ"
            titleColorClass="text-rose-600 dark:text-rose-400"
            maxWidthClass="max-w-3xl"
        >
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden rounded-b-xl">
                
                {/* CONFIGURATION FORM */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 flex-shrink-0">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-4 flex items-center gap-2">
                        <Icon name="plus-circle" size={4} className="text-rose-500" />
                        Thêm / Chỉnh Sửa Mục Tiêu
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="w-full">
                            <SearchableSelect
                                label="Ngành Hàng"
                                options={nganhHangOptions}
                                value={selectedNganhHang}
                                onChange={handleNganhHangChange}
                                placeholder="Chọn Ngành Hàng..."
                            />
                        </div>
                        <div className="w-full">
                            <SearchableSelect
                                label="Nhóm Hàng"
                                options={nhomHangOptions}
                                value={selectedNhomHang}
                                onChange={setSelectedNhomHang}
                                placeholder={selectedNganhHang ? "Chọn Nhóm Hàng..." : "Chọn Ngành Hàng trước"}
                            />
                        </div>
                        <div className="w-full">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mục Tiêu GTĐH</label>
                            <input 
                                type="text"
                                value={targetValue}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    const parsed = parseInt(raw, 10);
                                    if (!isNaN(parsed)) setTargetValue(parsed.toString());
                                    else setTargetValue('');
                                }}
                                placeholder="Nhập giá trị..."
                                className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-bold text-rose-600 dark:text-rose-400"
                            />
                        </div>
                        <div className="w-full">
                            <button
                                onClick={handleSave}
                                disabled={!selectedNhomHang || !targetValue}
                                className={`w-full h-11 font-bold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 flex justify-center items-center gap-2 ${
                                    !selectedNhomHang || !targetValue
                                     ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                     : 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 dark:focus:ring-offset-slate-900 border border-transparent'
                                }`}
                            >
                                <Icon name="save" size={4} />
                                LƯU MỤC TIÊU
                            </button>
                        </div>
                    </div>
                </div>

                {/* CURRENT TARGETS LIST */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
                            <Icon name="list" size={4} className="text-indigo-500" />
                            Mục Tiêu Đang Áp Dụng
                        </h4>
                        <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            {gtdhList.length} Nhóm Hàng
                        </span>
                    </div>

                    {gtdhList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                            <Icon name="target" size={12} className="mb-3 opacity-20" />
                            <p className="text-sm">Chưa có mục tiêu GTĐH nào được thiết lập.</p>
                            <p className="text-xs mt-1">Hệ thống sẽ không bôi đỏ cảnh báo trong bảng Chi Tiết Ngành Hàng.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {gtdhList.map(([nhom, value]) => (
                                <div key={nhom} className="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group">
                                    <div className="flex flex-col overflow-hidden pr-2">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={nhom}>
                                            {nhom}
                                        </span>
                                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                                            GTĐH: {formatCurrency(value)}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => deleteGtdhTarget(nhom)}
                                        className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors shrink-0"
                                        title="Xoá mục tiêu này"
                                    >
                                        <Icon name="trash-2" size={4} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ModalWrapper>
    );
};

export default GtdhTargetModal;
