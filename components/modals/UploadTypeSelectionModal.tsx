import React from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { ListGroup, ListRow } from '../shared/ui/ListGroup';

interface UploadTypeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (isHistorical: boolean) => void;
    fileCount: number;
}

const UploadTypeSelectionModal: React.FC<UploadTypeSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    fileCount
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="sm"
            zIndex="z-[1100]"
            hideHeader
            ariaLabel="Chọn loại tệp doanh số"
        >
            {/* Hai lựa chọn dạng danh sách nhóm kiểu iOS (GĐ5): tiêu đề viết như câu, mỗi hàng ≥ 48px trên cảm ứng, nút Huỷ dùng chung. */}
            <div className="space-y-4">
                <div className="flex flex-col items-center text-center pt-1">
                    <span className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
                        <AppIcon name="upload" size="lg" />
                    </span>
                    <h3 className="type-headline font-semibold text-slate-900 dark:text-white">
                        Tải lên {fileCount} tệp doanh số
                    </h3>
                    <p className="text-[13px] leading-[18px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Chọn cách phân tích cho tệp vừa tải lên
                    </p>
                </div>

                <ListGroup>
                    <ListRow
                        icon="quick" iconTone="emerald"
                        label="Tệp Realtime (Xem nhanh)"
                        description="Phân tích ngay để xem nhanh số liệu. Không lưu vào kho dữ liệu lịch sử."
                        onClick={() => onSelect(false)}
                    />
                    <ListRow
                        icon="database" iconTone="sky"
                        label="Lũy kế / Quá khứ"
                        description="Đặt tên gợi nhớ, lưu dài hạn vào kho dữ liệu để tự gộp báo cáo lũy kế."
                        onClick={() => onSelect(true)}
                    />
                </ListGroup>

                <Button variant="secondary" onClick={onClose} className="w-full">Huỷ</Button>
            </div>
        </Modal>
    );
};

export default UploadTypeSelectionModal;
