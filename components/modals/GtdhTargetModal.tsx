import React, { useState, useMemo } from 'react';
import ModalWrapper from './ModalWrapper';
import { useDashboardContext } from '../../contexts/DashboardContext';
import SearchableSelect from '../common/SearchableSelect';
import { Icon } from '../common/Icon';
import { formatCurrency } from '../../utils/dataUtils';
import { Button } from '../shared/ui/Button';

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
        return Object.keys(productConfig.subgroups)
            .filter(name => name !== 'Không tính doanh thu')
            .sort();
    }, [productConfig]);

    const nhomHangOptions = useMemo(() => {
        if (!productConfig?.subgroups || !selectedNganhHang) return [];
        if (selectedNganhHang === 'Không tính doanh thu') return [];
        return Object.keys(productConfig.subgroups[selectedNganhHang] || {})
            .filter(name => name !== 'Không tính doanh thu')
            .sort();
    }, [productConfig, selectedNganhHang]);

    // Update form when Nhóm Hàng changes
    React.useEffect(() => {
        if (selectedNhomHang && gtdhTargets[selectedNhomHang] !== undefined) {
             const targetDivided = (gtdhTargets[selectedNhomHang] / 1000000);
             setTargetValue(targetDivided.toString());
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
            updateGtdhTarget(selectedNhomHang, numValue * 1000000);
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
                <div className="p-3 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 flex-shrink-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
                        <Icon name="plus-circle" size={3.5} className="text-rose-500 sm:hidden" />
                        <Icon name="plus-circle" size={4} className="text-rose-500 hidden sm:block" />
                        Thêm / Chỉnh Sửa Mục Tiêu
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
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
                            <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mục Tiêu GTĐH (Đvt: Triệu VNĐ)</label>
                            <input 
                                type="text"
                                value={targetValue}
                                onChange={(e) => {
                                    // Allow numbers and dot for decimal
                                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                                    setTargetValue(raw);
                                }}
                                placeholder="Ví dụ: 9.5"
                                className="w-full h-9 sm:h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 sm:px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400"
                            />
                        </div>
                        <div className="w-full">
                            <Button
                                onClick={handleSave}
                                disabled={!selectedNhomHang || !targetValue}
                                variant="danger"
                                leftIcon={<Icon name="save" size={4} />}
                                className="w-full"
                            >
                                LƯU MỤC TIÊU
                            </Button>
                        </div>
                    </div>
                </div>

                {/* CURRENT TARGETS LIST */}
                <div className="p-3 sm:p-6 bg-slate-50 dark:bg-slate-900 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
                            <Icon name="list" size={3.5} className="text-indigo-500 sm:hidden" />
                            <Icon name="list" size={4} className="text-indigo-500 hidden sm:block" />
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
                                <div key={nhom} className="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 sm:p-3 rounded-lg shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group">
                                    <div className="flex flex-col overflow-hidden pr-2">
                                        <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={nhom}>
                                            {nhom}
                                        </span>
                                        <span className="text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                                            GTĐH: {formatCurrency(value / 1000000)} T
                                        </span>
                                    </div>
                                    <Button 
                                        onClick={() => deleteGtdhTarget(nhom)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400"
                                        title="Xoá mục tiêu này"
                                    >
                                        <Icon name="trash-2" size={4} />
                                    </Button>
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
