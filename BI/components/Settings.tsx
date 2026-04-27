
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
                
                const keysToNotify = [...Object.keys(navState), 'summary-realtime', 'summary-luy-ke', 'supermarket-list'];
                keysToNotify.forEach(key => {
                    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } }));
                });

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
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Cài đặt & Quản lý</h1>
            </header>

            <Card title="Sao lưu & Khôi phục (Chuyển thiết bị)">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Chuyển toàn bộ dữ liệu (Báo cáo, Target, Snapshot, Dữ liệu Thưởng) sang máy tính khác hoặc lưu trữ dự phòng.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleBackup} disabled={!!isLoading} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg shadow-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95">
                        {isLoading === 'backup' ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <SaveIcon className="h-5 w-5" />}
                        <span>Sao lưu (.json)</span>
                    </button>
                    <button onClick={handleRestore} disabled={!!isLoading} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-all active:scale-95">
                        {isLoading === 'restore' ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <UploadIcon className="h-5 w-5" />}
                        <span>Khôi phục từ File</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
            </Card>

            {restoreLogs.length > 0 && (
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs shadow-lg border border-slate-700 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider">
                        <span>Nhật ký hệ thống</span>
                        <button onClick={() => setRestoreLogs([])} className="text-slate-500 hover:text-slate-300 text-xs">Xóa log</button>
                    </div>
                    <div className="h-32 overflow-y-auto space-y-1">
                        {restoreLogs.map((log, index) => (
                            <div key={index} className={`${log.includes('❌') ? 'text-red-400' : (log.includes('thành công') ? 'text-green-400' : 'text-slate-300')}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Card title="Quản lý Snapshots (Lịch sử lưu)">
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            <h4 className="font-bold mb-1 uppercase tracking-tight">Hướng dẫn sử dụng Snapshots:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Tạo mới:</strong> Tại tab <span className="font-bold">Phân tích Nhân viên &gt; Doanh thu</span>, nhấn biểu tượng 👤 (+) bên cạnh dòng "So sánh với" để lưu dữ liệu hiện tại.</li>
                                <li><strong>Công dụng:</strong> Cho phép bạn quay lại xem dữ liệu hiệu suất của các ngày trước đó để so sánh sự tăng/giảm.</li>
                                <li><strong>Quản lý:</strong> Bạn có thể xóa các bản snapshot cũ tại đây để giải phóng bộ nhớ trình duyệt nếu ứng dụng chạy chậm.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {isLoading === 'snapshots' ? (
                        <div className="flex justify-center py-8"><SpinnerIcon className="h-8 w-8 text-primary-500 animate-spin" /></div>
                    ) : Object.keys(allSnapshots).length > 0 ? (
                        (Object.entries(allSnapshots) as [string, SnapshotMetadata[]][]).map(([supermarket, snapshots]) => (
                            <div key={supermarket} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                <h3 className="text-md font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2 mb-3 flex justify-between">
                                    <span>{supermarket}</span>
                                    <span className="text-xs px-2 bg-white dark:bg-slate-600 rounded-full">{snapshots.length} bản lưu</span>
                                </h3>
                                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {snapshots.map(snapshot => (
                                        <li key={snapshot.id} className="py-3 flex items-center justify-between group">
                                            <div>
                                                <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{snapshot.name}</p>
                                                <p className="text-xs text-slate-500">Lưu lúc: {new Date(snapshot.date).toLocaleString('vi-VN')}</p>
                                            </div>
                                            <button onClick={() => handleDeleteSnapshot(supermarket, snapshot.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300">
                            <p className="text-sm text-slate-500">Chưa có snapshot nào được lưu.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Settings;
