import { useState, useRef, startTransition, useEffect } from 'react';
// @ts-ignore: Vite virtual module alias for Web Workers
import SalesWorker from '../services/worker?worker';
import type { DataRow, Status, AppState, ProductConfig } from '../types';
import type { User } from 'firebase/auth';
import { processShiftFile, DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import toast from 'react-hot-toast';
import { initialFilterState } from './useFilterState';
import { normalizeSalesData, parseExcelDate, getRowValue, toLocalISOString } from '../utils/dataUtils';
import { COL } from '../constants';
import type { UploadConflictInfo } from '../components/modals/UploadConflictModal';


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
    const [pendingConflict, setPendingConflict] = useState<{
        newFilename: string;
        newDateRangeStr: string;
        conflicts: UploadConflictInfo[];
        resolve: (action: 'overwrite_deactivate' | 'merge_deduplicate' | 'merge_all' | 'cancel') => void;
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
            if (user) {
                const { deleteCloudSalesData } = await import('../services/cloudDataService');
                await deleteCloudSalesData(user).catch(console.error);
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
            
            if (!isHistorical) {
                await dbService.clearTempRealtimeData();
            }

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
                
                // Calculate file dates and unique dates
                const fileDates: Date[] = [];
                parsedData.forEach(row => {
                    let dateObj: Date | null = null;
                    const rawDate = row.parsedDate;
                    if (rawDate) {
                        if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
                            dateObj = rawDate;
                        } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
                            dateObj = parseExcelDate(rawDate);
                        }
                    }
                    if (!dateObj || isNaN(dateObj.getTime())) {
                        dateObj = parseExcelDate(getRowValue(row, COL.DATE_CREATED));
                    }
                    if (dateObj && !isNaN(dateObj.getTime())) {
                        row.parsedDate = dateObj;
                        fileDates.push(dateObj);
                    }
                });

                const fileTimestamps = fileDates.map(d => d.getTime());
                const fileMinTime = fileTimestamps.length > 0 ? fileTimestamps.reduce((min, val) => val < min ? val : min, fileTimestamps[0]) : Date.now();
                const fileMaxTime = fileTimestamps.length > 0 ? fileTimestamps.reduce((max, val) => val > max ? val : max, fileTimestamps[0]) : Date.now();
                const fileUniqueDates = Array.from(new Set(fileDates.map(d => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                }))).sort();

                // Overlap and duplication check
                const conflicts: UploadConflictInfo[] = [];

                if (isHistorical) {
                    // A. Check against active historical files
                    const activeHistFiles = updatedRegistry.filter(f => f.isActive);
                    for (const histFile of activeHistFiles) {
                        const isExactDup = histFile.filename === file.name || 
                                            (file.lastModified && histFile.fileLastModified === file.lastModified);
                        
                        let histUniqueDates = histFile.uniqueDates;
                        // Backfill for older registry entries that don't have uniqueDates cached
                        if (!histUniqueDates) {
                            const histData = await dbService.getSalesFileData(histFile.id);
                            if (histData && histData.length > 0) {
                                const parsedDates = histData.map(r => {
                                    let dObj = r.parsedDate;
                                    if (dObj && typeof dObj === 'string') dObj = parseExcelDate(dObj);
                                    if (!dObj || !(dObj instanceof Date) || isNaN(dObj.getTime())) {
                                        dObj = parseExcelDate(getRowValue(r, COL.DATE_CREATED));
                                    }
                                    return dObj;
                                }).filter(Boolean) as Date[];
                                
                                histUniqueDates = Array.from(new Set(parsedDates.map(d => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    return `${y}-${m}-${day}`;
                                }))).sort();

                                // Update registry in memory and save
                                const regIdx = updatedRegistry.findIndex(f => f.id === histFile.id);
                                if (regIdx !== -1) {
                                    updatedRegistry[regIdx].uniqueDates = histUniqueDates;
                                    const tss = parsedDates.map(d => d.getTime());
                                    if (tss.length > 0) {
                                        updatedRegistry[regIdx].minDate = tss.reduce((min, val) => val < min ? val : min, tss[0]);
                                        updatedRegistry[regIdx].maxDate = tss.reduce((max, val) => val > max ? val : max, tss[0]);
                                    }
                                    await dbService.saveSalesFilesRegistry(updatedRegistry);
                                }
                            }
                        }

                        const existingDates = new Set(histUniqueDates || []);
                        const overlaps = fileUniqueDates.filter(d => existingDates.has(d));

                        if (isExactDup) {
                            conflicts.push({
                                type: 'exact_duplicate',
                                targetType: 'historical',
                                conflictingFileId: histFile.id,
                                conflictingFilename: histFile.filename,
                                conflictingLastModified: histFile.fileLastModified,
                                overlappingDates: []
                            });
                        } else if (overlaps.length > 0) {
                            let totalOverlappingOrdersCount = 0;
                            const histData = await dbService.getSalesFileData(histFile.id);
                            if (histData && histData.length > 0) {
                                const histOrders = new Set(histData.map(r => String(getRowValue(r, COL.ID) || '').trim()).filter(Boolean));
                                parsedData.forEach(r => {
                                    const orderId = String(getRowValue(r, COL.ID) || '').trim();
                                    if (orderId && histOrders.has(orderId)) {
                                        totalOverlappingOrdersCount++;
                                    }
                                });
                            }

                            conflicts.push({
                                type: 'overlap_dates',
                                targetType: 'historical',
                                conflictingFileId: histFile.id,
                                conflictingFilename: histFile.filename,
                                conflictingLastModified: histFile.fileLastModified,
                                overlappingDates: overlaps,
                                totalOverlappingOrdersCount
                            });
                        }
                    }

                    // B. Check against active realtime data
                    const tempRealtime = await dbService.getTempRealtimeData();
                    if (tempRealtime && tempRealtime.data.length > 0) {
                        const isExactDup = tempRealtime.filename === file.name || 
                                            (file.lastModified && tempRealtime.fileLastModified === file.lastModified);
                        
                        const rtDatesList = tempRealtime.data.map(r => {
                            let dObj = r.parsedDate;
                            if (dObj && typeof dObj === 'string') dObj = parseExcelDate(dObj);
                            if (!dObj || !(dObj instanceof Date) || isNaN(dObj.getTime())) {
                                dObj = parseExcelDate(getRowValue(r, COL.DATE_CREATED));
                            }
                            return dObj;
                        }).filter(Boolean) as Date[];
                        
                        const rtUniqueDates = Array.from(new Set(rtDatesList.map(d => {
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            return `${y}-${m}-${day}`;
                        }))).sort();

                        const rtExistingDates = new Set(rtUniqueDates);
                        const overlaps = fileUniqueDates.filter(d => rtExistingDates.has(d));

                        if (isExactDup) {
                            conflicts.push({
                                type: 'exact_duplicate',
                                targetType: 'realtime',
                                conflictingFilename: tempRealtime.filename,
                                conflictingLastModified: tempRealtime.fileLastModified,
                                overlappingDates: []
                            });
                        } else if (overlaps.length > 0) {
                            let totalOverlappingOrdersCount = 0;
                            const rtOrders = new Set(tempRealtime.data.map(r => String(getRowValue(r, COL.ID) || '').trim()).filter(Boolean));
                            parsedData.forEach(r => {
                                const orderId = String(getRowValue(r, COL.ID) || '').trim();
                                if (orderId && rtOrders.has(orderId)) {
                                    totalOverlappingOrdersCount++;
                                }
                            });

                            conflicts.push({
                                type: 'overlap_dates',
                                targetType: 'realtime',
                                conflictingFilename: tempRealtime.filename,
                                conflictingLastModified: tempRealtime.fileLastModified,
                                overlappingDates: overlaps,
                                totalOverlappingOrdersCount
                            });
                        }
                    }
                }

                // If conflicts found, prompt user and await decision
                let shouldSkipFile = false;
                if (conflicts.length > 0) {
                    const rangeStr = fileDates.length > 0
                        ? `${toLocalISOString(fileDates[0])} đến ${toLocalISOString(fileDates[fileDates.length - 1])}`
                        : 'Không xác định';

                    const action = await new Promise<'overwrite_deactivate' | 'merge_deduplicate' | 'merge_all' | 'cancel'>((resolve) => {
                        setPendingConflict({
                            newFilename: file.name,
                            newDateRangeStr: rangeStr,
                            conflicts,
                            resolve
                        });
                    });

                    if (action === 'cancel') {
                        shouldSkipFile = true;
                    } else if (action === 'overwrite_deactivate') {
                        for (const conflict of conflicts) {
                            if (conflict.targetType === 'historical' && conflict.conflictingFileId) {
                                const idx = updatedRegistry.findIndex(f => f.id === conflict.conflictingFileId);
                                if (idx !== -1) {
                                    updatedRegistry[idx].isActive = false;
                                }
                            } else if (conflict.targetType === 'realtime') {
                                await dbService.clearTempRealtimeData();
                            }
                        }
                    } else if (action === 'merge_deduplicate') {
                        await dbService.saveDeduplicationSetting(true);
                        window.dispatchEvent(new CustomEvent('dedup-changed', { detail: true }));
                        toast.success('Đã tự động kích hoạt tính năng lọc trùng mã đơn hàng!');
                    }
                }

                if (shouldSkipFile) {
                    // Small sleep before next file in loop
                    await new Promise(r => setTimeout(r, 100));
                    continue;
                }

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
                        isActive: true,
                        minDate: fileMinTime,
                        maxDate: fileMaxTime,
                        uniqueDates: fileUniqueDates
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
                            await uploadProcessedData(user, merged.data, merged.filename, merged.fileLastModified || merged.savedAt.getTime(), merged.savedAt.getTime(), merged.isRealtime);
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
        setPendingNaming,
        pendingConflict,
        setPendingConflict
    };
};

