import React, { useState } from 'react';
import { toast } from '../../components/shared/ui/toast';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';

interface PdfPreviewModalProps {
    url: string;
    onClose: () => void;
    fileName: string;
}

/**
 * Audit 2026-10-07 (IOS-01): khung xem trước trên iPhone có thể trắng hoặc chỉ hiện TRANG ĐẦU của PDF (giới
 * hạn trình xem PDF nhúng của Safari) — nên luôn có lối khác: "Mở" (trình xem PDF toàn màn của iOS, cuộn đủ
 * trang, có nút in/chia sẻ) và "Chia sẻ" (gửi Zalo/AirDrop/Lưu vào Tệp qua bảng chia sẻ hệ thống).
 */
const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ url, onClose, fileName }) => {
    const [isSharing, setIsSharing] = useState(false);
    const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpen = () => {
        // Không gắn `noopener`: Safari trả null cho window.open có noopener nên không biết tab có mở hay bị chặn.
        const w = window.open(url, '_blank');
        if (!w) handleDownload();
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const blob = await (await fetch(url)).blob();
            const file = new File([blob], fileName, { type: 'application/pdf' });
            if (!navigator.canShare?.({ files: [file] })) {
                handleDownload();
                return;
            }
            await navigator.share({ files: [file], title: fileName });
        } catch (e) {
            // Người dùng đóng bảng chia sẻ → AbortError, không phải lỗi.
            if ((e as Error)?.name !== 'AbortError') toast.error('Không chia sẻ được. Hãy dùng nút Tải xuống.');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Xem trước PDF"
            titleColorClass="text-slate-900"
            maxWidth="xl"
            controls={
                <div className="flex items-center gap-2">
                    <Button variant="secondary" icon="externalLink" onClick={handleOpen}>Mở</Button>
                    {canShareFiles && (
                        <Button variant="secondary" icon="share" onClick={handleShare} disabled={isSharing}>Chia sẻ</Button>
                    )}
                    <Button variant="primary" icon="download" onClick={handleDownload}>Tải xuống</Button>
                </div>
            }
        >
            <div className="h-[calc(90dvh-140px)]">
                <iframe
                    src={url}
                    className="w-full h-full border border-slate-300 rounded-control"
                    title="PDF Preview"
                ></iframe>
            </div>
        </Modal>
    );
};

export default PdfPreviewModal;
