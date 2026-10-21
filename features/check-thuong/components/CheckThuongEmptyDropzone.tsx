import React, { useRef, useState } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import { parseCheckThuongFile } from '../services/checkThuongParser';
import { toast } from '../../../components/shared/ui/toast';

interface CheckThuongEmptyDropzoneProps {
    onFileLoaded: (result: {
        competitionData: any[][];
        fileName: string;
        uploadTime: string;
        lastModified: number;
    }) => void;
    onManualCloudSync?: () => void;
    isSyncingCloud?: boolean;
}

export const CheckThuongEmptyDropzone: React.FC<CheckThuongEmptyDropzoneProps> = ({
    onFileLoaded,
    onManualCloudSync,
    isSyncingCloud = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleFile = async (file: File) => {
        setIsLoading(true);
        const toastId = toast.loading(`Đang đọc và phân tích file "${file.name}"...`);
        try {
            const res = await parseCheckThuongFile(file);
            toast.success(`Đã nạp thành công file "${file.name}" (${res.competitionData.length} dòng dữ liệu)`, { id: toastId });
            onFileLoaded(res);
        } catch (err: any) {
            console.error('[CheckThuong] Lỗi đọc file:', err);
            toast.error(`Không thể đọc file: ${err?.message || 'Định dạng không hợp lệ'}`, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-900/50">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`w-full max-w-xl p-8 rounded-card border-2 border-dashed transition-all text-center flex flex-col items-center justify-center ${
                    isDragging
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:border-sky-400'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleInputChange}
                />

                {/* GĐ7: bỏ icon NHẢY liên tục (animate-bounce — gây phân tâm, tốn pin) → icon đứng yên; tiêu đề viết như câu */}
                <div className="w-14 h-14 rounded-card bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                    <AppIcon name="upload" size="xl" />
                </div>

                <h3 className="type-headline font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                    Tải file thưởng thi đua
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                    Kéo thả file Excel (.xlsx, .xls) hoặc CSV kết quả thi đua vào đây để tra cứu và so sánh siêu thị.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                        variant="primary"
                        icon="upload"
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={isLoading}
                        className="px-5"
                    >
                        {isLoading ? 'Đang phân tích…' : 'Chọn file từ máy'}
                    </Button>

                    {onManualCloudSync && (
                        <Button
                            variant="secondary"
                            icon="cloudDownload"
                            onClick={onManualCloudSync}
                            isLoading={isSyncingCloud}
                            className="px-4"
                        >
                            {isSyncingCloud ? 'Đang tải đám mây…' : 'Lấy từ đám mây'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
