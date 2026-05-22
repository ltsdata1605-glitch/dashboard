
import React, { useState, useRef, useEffect } from 'react';
import Card from './Card';
import { DownloadIcon, UploadIcon, AlertTriangleIcon, SpinnerIcon, TrashIcon, CheckCircleIcon, SaveIcon, ClockIcon } from './Icons';
import * as db from '../utils/db';
import { ConfirmDialog } from '../../components/shared/ui/ConfirmDialog';

interface SnapshotMetadata {
    id: string;
    name: string;
    date: string;
}

interface BackupMetadata {
    appName: string;
    version: string;
    timestamp: string;
    deviceInfo: string;
    stats: {
        totalItems: number;
        snapshots: number;
        targets: number; 
        configs: number; 
        reports: number; 
        bonus: number;
    };
}

interface BackupFileContent {
    metadata?: BackupMetadata;
    data: { key: string; value: any }[];
}

const Settings: React.FC = () => {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [allSnapshots, setAllSnapshots] = useState<Record<string, SnapshotMetadata[]>>({});
    
    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info' | 'success';
        confirmText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const showConfirm = (options: { title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' | 'success'; confirmText?: string; }) => {
        setConfirmDialog({ ...options, isOpen: true });
    };
    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    useEffect(() => {
        const fetchSnapshots = async () => {
            setIsLoading('snapshots');
            try {
                const allData = await db.getAll();
                const snapshotMetadata = allData.filter(item => item.key.startsWith('snapshots-'));
                
                const groupedSnapshots: Record<string, SnapshotMetadata[]> = {};
                snapshotMetadata.forEach(item => {
                    const supermarketName = item.key.replace('snapshots-', '');
                    if (Array.isArray(item.value)) {
                        groupedSnapshots[supermarketName] = item.value.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    }
                });
                setAllSnapshots(groupedSnapshots);
            } catch (error) {
                console.error("Failed to fetch snapshots", error);
            } finally {
                setIsLoading(null);
            }
        };
        fetchSnapshots();
    }, []);

    const handleBackup = async () => {
        setIsLoading('backup');
        try {
            const allData = await db.getAll();
            const stats = {
                totalItems: allData.length,
                snapshots: allData.filter(i => i.key.includes('snapshot')).length,
                bonus: allData.filter(i => i.key.startsWith('bonus-data-')).length,
                targets: allData.filter(i => i.key.startsWith('targethero-') || i.key.startsWith('comptarget-')).length,
                reports: allData.filter(i => i.key.startsWith('summary-') || i.key.startsWith('competition-') || i.key.startsWith('config-')).length,
                configs: allData.filter(i => 
                    !i.key.includes('snapshot') && 
                    !i.key.startsWith('bonus-data-') &&
                    !i.key.startsWith('targethero-') && 
                    !i.key.startsWith('comptarget-') && 
                    !i.key.startsWith('summary-') && 
                    !i.key.startsWith('competition-') &&
                    !i.key.startsWith('config-')
                ).length
            };

            const backupPayload: BackupFileContent = {
                metadata: {
                    appName: "reportBI_tools",
                    version: "1.6",
                    timestamp: new Date().toISOString(),
                    deviceInfo: navigator.userAgent,
                    stats: stats
                },
                data: allData
            };

            const jsonString = JSON.stringify(backupPayload, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `reportBI_FullBackup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`✅ SAO LƯU THÀNH CÔNG!\n\nFile chứa đầy đủ dữ liệu để chuyển sang máy khác:\n\n- 💰 Dữ liệu Thưởng: ${stats.bonus} siêu thị\n- 🎯 Cấu hình Target: ${stats.targets} mục\n- 📸 Snapshots lịch sử: ${stats.snapshots} mục\n- 📊 Báo cáo đã nhập: ${stats.reports} mục\n- ⚙️ Cài đặt khác: ${stats.configs} mục`);

        } catch (error) {
            console.error('Backup failed:', error);
            alert('Sao lưu thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleRestore = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setIsLoading('restore');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error('Không thể đọc nội dung file.');
                
                let parsedContent = JSON.parse(content);
                let dataToRestore: { key: string; value: any }[] = [];

                if (Array.isArray(parsedContent)) {
                    dataToRestore = parsedContent;
                } else if (parsedContent.data && Array.isArray(parsedContent.data)) {
                    dataToRestore = parsedContent.data;
                } else {
                    throw new Error('Cấu trúc file backup không hợp lệ.');
                }

                if (dataToRestore.length === 0) throw new Error('File backup rỗng.');

                await db.clearStore();
                await db.setMany(dataToRestore);
                
                const navState = {
                    'main-active-view': 'dashboard',
                    'dashboard-main-tab': 'realtime',
                    'dashboard-sub-tab': 'revenue',
                    'dashboard-active-supermarket': 'Tổng'
                };
                for (const [key, value] of Object.entries(navState)) {
                    await db.set(key, value);
                }
                
                setIsLoading(null); 
                window.location.reload();

            } catch (error) {
                console.error('Restore failed:', error);
                setIsLoading(null);
                alert(`Khôi phục thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
            }
        };
        reader.readAsText(file);
    };

    const handleDeleteSnapshot = (supermarket: string, snapshotId: string) => {
        showConfirm({
            title: 'Xóa Snapshot',
            message: 'Bạn có chắc chắn muốn xoá snapshot này không?',
            variant: 'danger',
            confirmText: 'Xóa',
            onConfirm: async () => {
                closeConfirm();
                try {
                    const metadataKey = `snapshots-${supermarket}`;
                    const currentMetadata: SnapshotMetadata[] = await db.get(metadataKey) || [];
                    const updatedMetadata = currentMetadata.filter(meta => meta.id !== snapshotId);
                    await db.set(metadataKey, updatedMetadata);
                    await db.deleteEntry(`snapshot-data-${supermarket}-${snapshotId}`);
                    setAllSnapshots(prev => ({ ...prev, [supermarket]: updatedMetadata }));
                } catch (error) {
                    console.error("Delete failed", error);
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex items-center gap-3 pb-4 border-b-2 border-slate-200 dark:border-slate-700">
                <div className="w-1.5 h-8 bg-indigo-600"></div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Cài đặt & Quản lý</h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sao lưu · Khôi phục · Quản lý dữ liệu</p>
                </div>
            </header>

            {/* Section 1: Sao lưu & Khôi phục */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <SaveIcon className="h-4 w-4 text-indigo-500" />
                    <h2 className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Sao lưu & Khôi phục (Chuyển thiết bị)</h2>
                </div>
                <div className="p-5">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        Chuyển toàn bộ dữ liệu (Báo cáo, Target, Snapshot, Dữ liệu Thưởng) sang máy tính khác hoặc lưu trữ dự phòng.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={handleBackup} disabled={!!isLoading} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 disabled:opacity-50 transition-all active:scale-95 shadow-sm">
                            {isLoading === 'backup' ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                            <span>Sao lưu (.json)</span>
                        </button>
                        <button onClick={handleRestore} disabled={!!isLoading} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95 shadow-sm">
                            {isLoading === 'restore' ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
                            <span>Khôi phục từ File</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                </div>
            </section>
            
            <ConfirmDialog 
                isOpen={confirmDialog.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                confirmText={confirmDialog.confirmText}
            />
        </div>
    );
};

export default Settings;
