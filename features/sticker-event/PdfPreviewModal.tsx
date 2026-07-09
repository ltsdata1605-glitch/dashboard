import React from 'react';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';

interface PdfPreviewModalProps {
    url: string;
    onClose: () => void;
    fileName: string;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ url, onClose, fileName }) => {
    
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Xem trước PDF"
            titleColorClass="text-slate-900"
            maxWidth="4xl"
            controls={
                <Button
                    variant="ghost"
                    onClick={handleDownload}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-indigo-50 hover:bg-indigo-700 h-9 px-4 py-2"
                >
                    Tải xuống
                </Button>
            }
        >
            <div className="h-[calc(90vh-140px)]">
                <iframe
                    src={url}
                    className="w-full h-full border border-slate-300 rounded-lg"
                    title="PDF Preview"
                ></iframe>
            </div>
        </Modal>
    );
};

export default PdfPreviewModal;
