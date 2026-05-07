
import React, { useState, useRef, useEffect } from 'react';
import Card from './Card';
import { DownloadIcon, UploadIcon, AlertTriangleIcon, SpinnerIcon, TrashIcon, CheckCircleIcon, SaveIcon, ClockIcon } from './Icons';
import * as db from '../utils/db';

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
    const [restoreLogs, setRestoreLogs] = useState<string[]>([]);

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

    const addLog = (message: string) => {
        const time = new Date().toLocaleTimeString();
        setRestoreLogs(prev => [`[${time}] ${message}`, ...prev]);
    };

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
        setRestoreLogs([]);
        addLog("Bắt đầu quy trình khôi phục...");
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            addLog("Người dùng hủy chọn file.");
            return;
        }

        setIsLoading('restore');
        addLog(`Đang đọc file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error('Không thể đọc nội dung file.');
                
                addLog("Đọc file thành công. Đang phân tích JSON...");
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

                addLog("Đang xóa dữ liệu cũ và ghi đè...");
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
                
                // db.set() và db.setMany() mới đã tự bắn event indexeddb-change

                addLog("Khôi phục thành công!");
                setIsLoading(null); 
                
                // Đã tắt thông báo thành công theo yêu cầu

            } catch (error) {
                console.error('Restore failed:', error);
                addLog(`❌ LỖI: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
                setIsLoading(null);
                alert(`Khôi phục thất bại.`);
            }
        };
        reader.readAsText(file);
    };

    const handleDeleteSnapshot = async (supermarket: string, snapshotId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xoá snapshot này không?')) return;
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

            {/* Restore Logs */}
            {restoreLogs.length > 0 && (
                <section className="bg-slate-900 border border-slate-700 shadow-lg animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-700">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nhật ký hệ thống</span>
                        <button onClick={() => setRestoreLogs([])} className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors">Xóa log</button>
                    </div>
                    <div className="h-32 overflow-y-auto p-4 font-mono text-xs space-y-1">
                        {restoreLogs.map((log, index) => (
                            <div key={index} className={`${log.includes('❌') ? 'text-red-400' : (log.includes('thành công') ? 'text-green-400' : 'text-slate-300')}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Section 2: Quản lý Snapshots */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <ClockIcon className="h-4 w-4 text-amber-500" />
                    <h2 className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Quản lý Snapshots (Lịch sử lưu)</h2>
                </div>
                <div className="p-5">
                    {/* Info banner */}
                    <div className="mb-5 bg-slate-50 dark:bg-slate-800/50 border-l-3 border-l-indigo-500 p-4">
                        <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">Hướng dẫn sử dụng Snapshots:</h4>
                        <ul className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-indigo-500 font-black shrink-0">•</span>
                                <span><strong className="text-slate-700 dark:text-slate-200">Tạo mới:</strong> Tại tab Phân tích Nhân viên → Doanh thu, nhấn biểu tượng 👤 (+) bên cạnh dòng "So sánh với" để lưu dữ liệu hiện tại.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-indigo-500 font-black shrink-0">•</span>
                                <span><strong className="text-slate-700 dark:text-slate-200">Công dụng:</strong> Cho phép bạn quay lại xem dữ liệu hiệu suất của các ngày trước đó để so sánh sự tăng/giảm.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-indigo-500 font-black shrink-0">•</span>
                                <span><strong className="text-slate-700 dark:text-slate-200">Quản lý:</strong> Bạn có thể xóa các bản snapshot cũ tại đây để giải phóng bộ nhớ trình duyệt nếu ứng dụng chạy chậm.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Snapshot list */}
                    <div className="space-y-4">
                        {isLoading === 'snapshots' ? (
                            <div className="flex justify-center py-8"><SpinnerIcon className="h-8 w-8 text-indigo-500 animate-spin" /></div>
                        ) : Object.keys(allSnapshots).length > 0 ? (
                            (Object.entries(allSnapshots) as [string, SnapshotMetadata[]][]).map(([supermarket, snapshots]) => (
                                <div key={supermarket} className="border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{supermarket}</span>
                                        <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 border border-slate-200 dark:border-slate-600">{snapshots.length} bản lưu</span>
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {snapshots.map(snapshot => (
                                            <li key={snapshot.id} className="px-4 py-3 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div>
                                                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{snapshot.name}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Lưu lúc: {new Date(snapshot.date).toLocaleString('vi-VN')}</p>
                                                </div>
                                                <button onClick={() => handleDeleteSnapshot(supermarket, snapshot.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all">
                                                    <TrashIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700">
                                <ClockIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Chưa có snapshot nào được lưu</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Settings;
