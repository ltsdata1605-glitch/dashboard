import { useState, useRef, startTransition } from 'react';
// @ts-ignore: Vite virtual module alias for Web Workers
import SalesWorker from '../services/worker?worker';
import type { DataRow, Status, AppState, ProductConfig } from '../types';
import { processShiftFile, DepartmentMap } from '../services/dataService';
import { 
    saveDepartmentMap, clearDepartmentMap, 
    saveSalesData, clearSalesData, 
    clearCustomTabs,
    saveSetting
} from '../services/dbService';

interface FileUploadLogicProps {
    isDeduplicationEnabled: boolean;
    originalData: DataRow[];
    setOriginalData: (data: DataRow[]) => void;
    setDepartmentMap: (map: DepartmentMap | null) => void;
    setProcessedData: (data: any) => void;
    setFileInfo: (info: { filename: string; savedAt: string } | null) => void;
    setAppState: (state: AppState) => void;
    setStatus: (status: Status) => void;
    setFilterState?: (filters: any) => void;
}

export const useFileUploadLogic = ({
    isDeduplicationEnabled,
    originalData,
    setOriginalData,
    setDepartmentMap,
    setProcessedData,
    setFileInfo,
    setAppState,
    setStatus,
    setFilterState
}: FileUploadLogicProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isClearingDepartments, setIsClearingDepartments] = useState(false);
    const [processingTime, setProcessingTime] = useState(0);
    const timerRef = useRef<number | undefined>(undefined);

    const startTimer = () => {
        setProcessingTime(0);
        const startTime = Date.now();
        timerRef.current = window.setInterval(() => {
            setProcessingTime(Date.now() - startTime);
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = undefined;
        }
    };

    const handleClearDepartments = async () => {
        setIsClearingDepartments(true);
        try {
            await clearDepartmentMap();
            setDepartmentMap(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsClearingDepartments(false);
        }
    };
    
    const handleClearData = async () => {
        try {
            await clearSalesData();
            await clearCustomTabs();
            setOriginalData([]);
            setProcessedData(null);
            setFileInfo(null);
            setAppState('upload');
        } catch (error) {
            console.error(error);
        }
    };

    const handleShiftFileProcessing = async (files: File[]) => {
        if (files.length === 0) return;
        setAppState('loading');
        setIsProcessing(true);
        setStatus({ message: `Đang xử lý ${files.length} file phân ca...`, type: 'info', progress: 20 });
        try {
            // Note: In a real app, we might want to get the current map from a ref or state passed in
            // For now, we'll just assume it's handled via the setDepartmentMap callback
            let mergedMap: DepartmentMap = {}; 

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setStatus({ message: `Đang xử lý file ${i + 1}/${files.length}: ${file.name}`, type: 'info', progress: 20 + (60 * (i + 1) / files.length) });
                const { map } = await processShiftFile(file); 
                mergedMap = { ...mergedMap, ...map }; 
            }
            
            await saveDepartmentMap(mergedMap);
            await saveSetting('originalDepartmentMap', mergedMap);
            setDepartmentMap(mergedMap);
            setStatus({ message: `Đã xử lý và gộp ${files.length} file phân ca!`, type: 'success', progress: 100 });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Lỗi không xác định";
            setStatus({ message: msg, type: 'error', progress: 0 });
        } finally {
            setIsProcessing(false);
            if(originalData.length > 0) setAppState('dashboard');
            else setAppState('upload');
        }
    };

    const handleFileProcessing = async (files: File[]) => {
        if (!files || files.length === 0) return;
        setAppState('loading');
        setIsProcessing(true);
        startTimer();
        
        try {
            const token = sessionStorage.getItem('googleOAuthToken');
            if (token) {
                const { uploadFileToDrive, listDriveFiles } = await import('../services/googleDriveService');
                
                setStatus({ message: `Đang kiểm tra lịch sử tải lên...`, type: 'info', progress: 5 });
                const existingFiles = await listDriveFiles(token);
                
                const pad = (n: number) => n.toString().padStart(2, '0');
                const formatDate = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
                
                let uploadedCount = 0;
                let skippedCount = 0;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const progressBase = 5 + (15 * (i / files.length)); // Drive gets first 20%
                    setStatus({ message: `Kiểm tra File ${i + 1}/${files.length}: ${file.name}...`, type: 'info', progress: progressBase });
                    
                    const formattedCreation = formatDate(new Date(file.lastModified));
                    const isDuplicate = existingFiles.some(f => {
                        const nameMatches = f.name.includes(`YCX_${formattedCreation}`) || f.name.includes(`Tải file: ${formattedCreation}`);
                        const sizeMatches = f.size ? f.size === file.size.toString() : true;
                        return nameMatches && sizeMatches;
                    });
                    
                    if (isDuplicate) {
                        skippedCount++;
                    } else {
                        setStatus({ message: `Đang tải lên Drive File ${i + 1}/${files.length}...`, type: 'info', progress: progressBase + 5 });
                        await uploadFileToDrive(file, token, 'dmx_sales');
                        uploadedCount++;
                    }
                }

                if (uploadedCount > 0) {
                    import('react-hot-toast').then(m => m.toast.success(`Đã đồng bộ ${uploadedCount} báo cáo lên Google Drive!`));
                }
                if (skippedCount > 0) {
                    import('react-hot-toast').then(m => m.toast(`Bỏ qua ${skippedCount} file (đã tồn tại trên Drive)!`, { icon: '⚠️' }));
                }
            }
        } catch (err: any) {
            console.error("Lỗi Google Drive Upload:", err);
            // Non-blocking fallback
            setStatus({ message: `Lỗi kết nối Drive, đang tiếp tục xử lý nội bộ...`, type: 'error', progress: 20 });
        }

        let worker: Worker;
        try {
            worker = new SalesWorker();
        } catch (e) {
            console.error("Worker instantiation error:", e);
            setStatus({ message: 'Trình duyệt không hỗ trợ xử lý nền', type: 'error', progress: 0 });
            setAppState('upload');
            setIsProcessing(false);
            return;
        }
        worker.onmessage = async (e) => {
            const { type, payload } = e.data;
            if (type === 'progress') {
                setStatus(payload);
            } else if (type === 'result') {
                try {
                    setStatus({ message: 'Đang lưu dữ liệu...', type: 'info', progress: 95 });
                    await new Promise(r => setTimeout(r, 50)); // nhường CPU để vẽ progress
                    
                    const mergedName = files.length === 1 ? files[0].name : `Gộp ${files.length} Báo cáo`;
                    const latestDate = new Date(Math.max(...files.map(f => f.lastModified)));
                    
                    await saveSalesData(payload, mergedName);
                    setFileInfo({ filename: mergedName, savedAt: latestDate.toLocaleString('vi-VN') });
                    
                    // Reset filters to initial state to avoid stale filters from previous data
                    if (setFilterState) {
                        const { initialFilterState } = await import('./useFilterState');
                        setFilterState(initialFilterState);
                    }
                    
                    setOriginalData(payload);
                    setStatus({ message: 'Đang tổng hợp báo cáo...', type: 'info', progress: 98 });
                    await new Promise(r => setTimeout(r, 50)); // nhường CPU trước khi React render Dashboard khổng lồ
                    
                    startTransition(() => {
                        setAppState('dashboard');
                    });
                } catch (error) {
                    console.error("Lỗi lưu dữ liệu:", error);
                    setStatus({ message: 'Lỗi khi lưu vào hệ thống', type: 'error', progress: 0 });
                    setAppState('upload');
                } finally {
                    setIsProcessing(false);
                    stopTimer();
                    worker.terminate();
                }
            } else if (type === 'error') {
                setStatus({ message: payload, type: 'error', progress: 0 });
                setAppState('upload');
                setIsProcessing(false);
                stopTimer();
                worker.terminate();
            }
        };

        worker.onerror = (error) => {
            console.error("Worker err:", error);
            setStatus({ message: 'Lỗi luồng xử lý nền (Worker)', type: 'error', progress: 0 });
            setAppState('upload');
            setIsProcessing(false);
            stopTimer();
            worker.terminate();
        };

        worker.postMessage({ files: files, enableDeduplication: isDeduplicationEnabled });
    };

    return {
        isProcessing,
        isClearingDepartments,
        processingTime,
        handleFileProcessing,
        handleShiftFileProcessing,
        handleClearData,
        handleClearDepartments
    };
};
