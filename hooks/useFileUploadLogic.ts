import { useState, useRef, startTransition, useEffect } from 'react';
// @ts-ignore: Vite virtual module alias for Web Workers
import SalesWorker from '../services/worker?worker';
import type { DataRow, Status, AppState, ProductConfig } from '../types';
import type { User } from 'firebase/auth';
import { processShiftFile, DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import toast from 'react-hot-toast';
import { initialFilterState } from './useFilterState';
import { normalizeSalesData } from '../utils/dataUtils';

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
    user?: User | null;
    onRegistryChange?: () => void;
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
    setFilterState,
    user,
    onRegistryChange
}: FileUploadLogicProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isClearingDepartments, setIsClearingDepartments] = useState(false);
    const [processingTime, setProcessingTime] = useState(0);
    const [pendingNaming, setPendingNaming] = useState<{
        fileName: string;
        resolve: (name: string) => void;
    } | null>(null);
    const timerRef = useRef<number | undefined>(undefined);

    // Cleanup timer on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

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
            await dbService.clearDepartmentMap();
            setDepartmentMap(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsClearingDepartments(false);
        }
    };
    
    const handleClearData = async () => {
        try {
            await dbService.clearAllSalesFiles();
            setOriginalData([]);
            setProcessedData(null);
            setFileInfo(null);
            if (onRegistryChange) {
                onRegistryChange();
            }
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
            let mergedMap: DepartmentMap = {}; 

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setStatus({ message: `Đang xử lý file ${i + 1}/${files.length}: ${file.name}`, type: 'info', progress: 20 + (60 * (i + 1) / files.length) });
                const { map } = await processShiftFile(file); 
                mergedMap = { ...mergedMap, ...map }; 
            }
            
            await dbService.saveDepartmentMap(mergedMap);
            await dbService.saveSetting('originalDepartmentMap', mergedMap);
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

    const handleFileProcessing = async (files: File[], isCloudSync: boolean = false, isHistorical: boolean = false) => {
        if (!files || files.length === 0) return;
        setAppState('loading');
        setIsProcessing(true);
        startTimer();
        
        try {
            const registry = await dbService.getSalesFilesRegistry();
            const updatedRegistry = [...registry];
            const realtimeRows: DataRow[] = [];
            let maxRealtimeLastModified = 0;
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Spin up worker for this specific file
                const parsedData = await new Promise<DataRow[]>((resolve, reject) => {
                    let worker: Worker;
                    let timeoutId: any;

                    const cleanup = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        if (worker) worker.terminate();
                    };

                    try {
                        worker = new SalesWorker();
                    } catch (e) {
                        reject(new Error('Trình duyệt không hỗ trợ xử lý nền (Worker)'));
                        return;
                    }
                    
                    // Safety timeout of 60 seconds
                    timeoutId = setTimeout(() => {
                        cleanup();
                        reject(new Error(`Quá thời gian xử lý tệp ${file.name} (Quá 60 giây)`));
                    }, 60000);

                    worker.onmessage = (e) => {
                        const { type, payload } = e.data;
                        if (type === 'progress') {
                            const fileProgress = payload.progress || 0;
                            const overallProgress = Math.round(
                                (i / files.length) * 100 + (fileProgress / files.length)
                            );
                            setStatus({
                                message: `Tệp ${i + 1}/${files.length}: ${file.name} - ${payload.message}`,
                                type: 'info',
                                progress: overallProgress
                            });
                        } else if (type === 'result') {
                            cleanup();
                            resolve(payload);
                        } else if (type === 'error') {
                            cleanup();
                            reject(new Error(payload));
                        }
                    };
                    
                    worker.onerror = (error) => {
                        console.error("Worker error for file:", file.name, error);
                        cleanup();
                        reject(new Error(`Lỗi luồng xử lý nền (Worker): ${file.name}`));
                    };
                    
                    worker.postMessage({ file, enableDeduplication: isDeduplicationEnabled });
                });
                
                if (isHistorical) {
                    let customFilename = file.name;
                    if (typeof window !== 'undefined') {
                        customFilename = await new Promise<string>((resolve) => {
                            setPendingNaming({
                                fileName: file.name,
                                resolve: resolve
                            });
                        });
                    }

                    // Save this file's data to IDB
                    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    await dbService.saveSalesFileData(fileId, parsedData);
                    
                    // Add metadata to registry
                    updatedRegistry.push({
                        id: fileId,
                        filename: customFilename,
                        rowCount: parsedData.length,
                        savedAt: Date.now(),
                        fileLastModified: file.lastModified,
                        isActive: true
                    });
                } else {
                    // Collect for realtime
                    for (let j = 0; j < parsedData.length; j++) {
                        realtimeRows.push(parsedData[j]);
                    }
                    if (file.lastModified && file.lastModified > maxRealtimeLastModified) {
                        maxRealtimeLastModified = file.lastModified;
                    }
                }
                
                // Small sleep to yield the CPU and let Garbage Collection release memory
                await new Promise(r => setTimeout(r, 100));
            }
            
            if (isHistorical) {
                // Save registry
                await dbService.saveSalesFilesRegistry(updatedRegistry);
            } else {
                // Determine combined filename for realtime
                let realtimeFilename = '';
                if (files.length === 1) {
                    realtimeFilename = files[0].name;
                } else {
                    const names = files.map(f => f.name.replace(/\.[^/.]+$/, ''));
                    realtimeFilename = `Gộp ${files.length} tệp Realtime (${names.join(', ')})`;
                    if (realtimeFilename.length > 85) {
                        realtimeFilename = `Gộp ${files.length} tệp Realtime (${names.slice(0, 2).join(', ')}...)`;
                    }
                }
                // Save to tempRealtimeData
                await dbService.saveTempRealtimeData(realtimeRows, realtimeFilename, maxRealtimeLastModified || Date.now());
            }
            
            // Notify registry change if listener exists
            if (onRegistryChange) {
                onRegistryChange();
            }
            
            // Retrieve the merged data for the dashboard
            setStatus({ message: 'Đang gộp và phân tích dữ liệu tích lũy...', type: 'info', progress: 95 });
            const merged = await dbService.getMergedSalesData();
            
            if (merged) {
                if (setFilterState) {
                    const registry = await dbService.getSalesFilesRegistry();
                    const activeHistoricalCount = registry.filter(f => f.isActive).length;
                    if (activeHistoricalCount > 0) {
                        const allTrangThai = Array.from(new Set(merged.data.map(r => r['Trạng thái hồ sơ'] || r['Trạng thái']).filter(Boolean))) as string[];
                        setFilterState({
                            ...initialFilterState,
                            trangThai: allTrangThai,
                            dateRange: 'all',
                            selectedMonths: []
                        });
                    } else {
                        setFilterState(initialFilterState);
                    }
                }
                
                setFileInfo({ filename: merged.filename, savedAt: merged.savedAt.toLocaleString('vi-VN') });
                
                const srcData = normalizeSalesData(merged.data);
                
                setOriginalData(srcData);
                setAppState('processing');
                
                // Sync the merged result to Firebase
                if (user && !isCloudSync) {
                    (async () => {
                        try {
                            toast('☁️ Đang đồng bộ dữ liệu gộp lên đám mây...', { id: 'cloud-sync-start', duration: 2000 });
                            const { uploadProcessedData } = await import('../services/cloudDataService');
                            await uploadProcessedData(user, merged.data, merged.filename, merged.savedAt.getTime());
                            toast.success('Đã đồng bộ dữ liệu lên đám mây!', { id: 'cloud-sync-done' });
                        } catch (err) {
                            console.error('Cloud data sync failed:', err);
                            toast('Dữ liệu đã lưu trên máy. Đồng bộ đám mây sẽ thử lại sau.', { icon: '☁️', id: 'cloud-sync-fail' });
                        }
                    })();
                }
            } else {
                setAppState('upload');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Lỗi khi xử lý danh sách file";
            console.error(errorMsg, error);
            setStatus({ message: errorMsg, type: 'error', progress: 0 });
            // Re-load existing merged data if any, otherwise return to upload
            const merged = await dbService.getMergedSalesData();
            if (merged && merged.data.length > 0) {
                setAppState('dashboard');
            } else {
                setAppState('upload');
            }
        } finally {
            setIsProcessing(false);
            stopTimer();
        }
    };

    return {
        isProcessing,
        isClearingDepartments,
        processingTime,
        handleFileProcessing,
        handleShiftFileProcessing,
        handleClearData,
        handleClearDepartments,
        pendingNaming,
        setPendingNaming
    };
};

