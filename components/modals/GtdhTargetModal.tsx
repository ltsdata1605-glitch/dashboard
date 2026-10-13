import React, { useState, useMemo } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { Modal } from '../shared/ui/Modal';
import { useDashboardContext } from '../../contexts/DashboardContext';
import SearchableSelect from '../common/SearchableSelect';
import { formatCurrency } from '../../utils/dataUtils';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { EmptyState } from '../shared/ui/EmptyState';

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

    // Lỗi #6 (video v1:048–059): tiêu đề ĐỎ + nút Lưu HỒNG (màu của lỗi/xoá) cho một việc bình thường; nội dung bị cắt mép trái
    // trên iPhone (lề âm 20px cũ lấn đệm 12px của sheet — nay `modal-bleed`). Nay: tiêu đề trung tính, nút chính sky, nhãn viết như
    // câu, ô nhập dùng chung (cao 44px trên cảm ứng), danh sách mục tiêu dạng hàng nhóm kiểu iOS.
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Mục tiêu GTĐH (AOV)"
            subTitle="Nhóm hàng có GTĐH dưới mục tiêu sẽ tô đỏ ở bảng Chi tiết ngành hàng"
            maxWidth="lg"
        >
            <div className="modal-bleed h-full flex flex-col bg-slate-50 dark:bg-slate-900">

                {/* Thêm / sửa mục tiêu */}
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 flex-shrink-0">
                    <h4 className="type-subhead font-semibold text-slate-800 dark:text-slate-200 mb-3">Thêm hoặc sửa mục tiêu</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
                        <div className="w-full min-w-0">
                            <SearchableSelect
                                label="Ngành hàng"
                                options={nganhHangOptions}
                                value={selectedNganhHang}
                                onChange={handleNganhHangChange}
                                placeholder="Chọn ngành hàng…"
                            />
                        </div>
                        <div className="w-full min-w-0">
                            <SearchableSelect
                                label="Nhóm hàng"
                                options={nhomHangOptions}
                                value={selectedNhomHang}
                                onChange={setSelectedNhomHang}
                                placeholder={selectedNganhHang ? 'Chọn nhóm hàng…' : 'Chọn ngành hàng trước'}
                            />
                        </div>
                        <div className="w-full min-w-0">
                            <label htmlFor="gtdh-muc-tieu" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1">Mục tiêu GTĐH (triệu đồng)</label>
                            <Input
                                id="gtdh-muc-tieu"
                                type="text"
                                inputMode="decimal"
                                value={targetValue}
                                onChange={(e) => {
                                    // Chỉ nhận số và dấu chấm thập phân
                                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                                    setTargetValue(raw);
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                                placeholder="Ví dụ: 9.5"
                                className="tabular-nums font-semibold"
                            />
                        </div>
                        <div className="w-full">
                            <Button
                                onClick={handleSave}
                                disabled={!selectedNhomHang || !targetValue}
                                variant="primary"
                                icon="save"
                                className="w-full"
                            >
                                Lưu mục tiêu
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mục tiêu đang áp dụng */}
                <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h4 className="type-subhead font-semibold text-slate-800 dark:text-slate-200">Mục tiêu đang áp dụng</h4>
                        <span className="text-[12px] font-medium tabular-nums text-slate-500">{gtdhList.length} nhóm hàng</span>
                    </div>

                    {gtdhList.length === 0 ? (
                        <EmptyState
                            icon="target"
                            title="Chưa có mục tiêu GTĐH"
                            description="Khi chưa có mục tiêu, bảng Chi tiết ngành hàng không tô đỏ cảnh báo."
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {gtdhList.map(([nhom, value]) => (
                                <div key={nhom} className="flex justify-between items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-3 pr-1 py-1.5 rounded-control">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate" title={nhom}>
                                            {nhom}
                                        </span>
                                        <span className="text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
                                            GTĐH {formatCurrency(value / 1000000)} triệu
                                        </span>
                                    </div>
                                    <Button
                                        onClick={() => deleteGtdhTarget(nhom)}
                                        variant="unstyled" size="none"
                                        className="shrink-0 w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center rounded-control text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400"
                                        title={`Xoá mục tiêu ${nhom}`}
                                        aria-label={`Xoá mục tiêu ${nhom}`}
                                    >
                                        <AppIcon name="delete" size="md" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default GtdhTargetModal;
