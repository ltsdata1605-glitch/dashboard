import React, { useState } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import { thangLuyKeMacDinh, nhanThang } from '../services/biAutoSyncService';

/**
 * Chọn tháng trước khi chạy Tự động Luỹ kế (chủ dự án 2026-10-01): "Tháng hiện tại" (ngày 1 thì lấy trọn tháng trước)
 * hoặc tháng bất kỳ. Dùng chung cho nút ở mục Cập nhật (DataUpdater) và nút nổi / nút nhanh (useBiAutoSync) —
 * trước đây chỉ DataUpdater có, nút nổi chạy thẳng tháng mặc định.
 */
export const LuyKeMonthPickerModal: React.FC<{ isOpen: boolean; onClose: () => void; onStart: (month: string) => void }> = ({ isOpen, onClose, onStart }) => {
    const [kieuThang, setKieuThang] = useState<'hien-tai' | 'tuy-chon'>('hien-tai');
    const [thangTuyChon, setThangTuyChon] = useState(() => { const m = thangLuyKeMacDinh(); return `${m.slice(0, 4)}-${m.slice(4)}`; });
    const thangDangChon = kieuThang === 'hien-tai' ? thangLuyKeMacDinh() : thangTuyChon.replace('-', '');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Tự động Luỹ kế — chọn tháng"
            maxWidth="sm"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose}>Huỷ</Button>
                    <Button
                        variant="primary"
                        size="sm"
                        data-testid="bat-dau-luy-ke"
                        disabled={!/^\d{6}$/.test(thangDangChon)}
                        onClick={() => { onClose(); onStart(thangDangChon); }}
                    >
                        Bắt đầu — tháng {nhanThang(thangDangChon)}
                    </Button>
                </div>
            }
        >
            <div className="space-y-3">
                <div className="flex gap-2" role="radiogroup" aria-label="Kiểu tháng luỹ kế">
                    <Button
                        variant={kieuThang === 'hien-tai' ? 'primary' : 'outline'}
                        size="sm"
                        role="radio"
                        aria-checked={kieuThang === 'hien-tai'}
                        onClick={() => setKieuThang('hien-tai')}
                    >
                        Tháng hiện tại
                    </Button>
                    <Button
                        variant={kieuThang === 'tuy-chon' ? 'primary' : 'outline'}
                        size="sm"
                        role="radio"
                        aria-checked={kieuThang === 'tuy-chon'}
                        onClick={() => setKieuThang('tuy-chon')}
                    >
                        Chọn tháng
                    </Button>
                </div>
                {kieuThang === 'hien-tai' ? (
                    <p className="text-xs text-slate-600">
                        Lấy luỹ kế tháng <b>{nhanThang(thangLuyKeMacDinh())}</b>
                        {new Date().getDate() === 1 ? ' — hôm nay là ngày 1 nên lấy trọn tháng trước.' : ' (từ ngày 01 đến hôm nay).'}
                    </p>
                ) : (
                    <Input
                        type="month"
                        aria-label="Tháng luỹ kế"
                        value={thangTuyChon}
                        max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()}
                        onChange={(e) => setThangTuyChon(e.target.value)}
                    />
                )}
            </div>
        </Modal>
    );
};
