import React from 'react';
import { XIcon } from './Icons';

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
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div 
                className="relative bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl p-4 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-900">Xem trước PDF</h2>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={handleDownload}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-indigo-50 hover:bg-indigo-700 h-9 px-4 py-2"
                        >
                            Tải xuống
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            aria-label="Đóng"
                        >
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                <div className="flex-grow mt-4 overflow-hidden">
                    <iframe 
                        src={url}
                        className="w-full h-full border border-slate-300 rounded-lg"
                        title="PDF Preview"
                    ></iframe>
                </div>
            </div>
        </div>
    );
};

export default PdfPreviewModal;
