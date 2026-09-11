
import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon, SpinnerIcon, SaveIcon, ClockIcon } from './Icons';
import * as db from '../utils/db';
import { parseBackupFile, restoreFromBackup, BackupMetadata as SharedBackupMetadata } from '../utils/backupRestore';
import { getAuditLog, AuditEntry } from '../utils/auditTrail';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { Button } from '../../../components/shared/ui/Button';
import { EmptyState } from '../../../components/shared/ui/EmptyState';

interface BackupMetadata extends SharedBackupMetadata {
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
    data: { key: string; value: unknown }[];
}

const ACTION_LABELS: Record<string, string> = {
    'clear-all': 'Xoá tất cả dữ liệu',
    'restore-backup': 'Khôi phục từ backup',
    'competition-version:save': 'Lưu phiên bản thi đua',
    'competition-version:delete': 'Xoá phiên bản thi đua',
    'bonus:save-batch': 'Lưu điểm thưởng',
    'bonus:save-monthly': 'Lưu điểm thưởng theo tháng',
};

const Settings: React.FC = () => {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [isAuditLoading, setIsAuditLoading] = useState(true);

    useEffect(() => {
        getAuditLog().then(log => { setAuditLog(log); setIsAuditLoading(false); });
    }, []);

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info' | 'success';
        confirmText?: string;
        singleButton?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const showConfirm = (options: { 
        title: string; 
        message: string; 
        onConfirm: () => void; 
        variant?: 'danger' | 'warning' | 'info' | 'success'; 
        confirmText?: string;
        singleButton?: boolean;
    }) => {
        setConfirmDialog({ ...options, isOpen: true });
    };
    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

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

            showConfirm({
                title: 'Sao lưu thành công',
                message: `File chứa đầy đủ dữ liệu để chuyển sang máy khác:\n\n- 💰 Dữ liệu Thưởng: ${stats.bonus} siêu thị\n- 🎯 Cấu hình Target: ${stats.targets} mục\n- 📸 Snapshots lịch sử: ${stats.snapshots} mục\n- 📊 Báo cáo đã nhập: ${stats.reports} mục\n- ⚙️ Cài đặt khác: ${stats.configs} mục`,
                variant: 'success',
                confirmText: 'Đóng',
                singleButton: true,
                onConfirm: closeConfirm
            });

        } catch (error) {
            console.error('Backup failed:', error);
            showConfirm({
                title: 'Sao lưu thất bại',
                message: 'Đã xảy ra lỗi khi tạo file sao lưu. Vui lòng thử lại.',
                variant: 'danger',
                confirmText: 'Đóng',
                singleButton: true,
                onConfirm: closeConfirm
            });
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

                const { data: dataToRestore, metadata } = parseBackupFile(content);
                setIsLoading(null);

                const backupTime = metadata?.timestamp ? new Date(metadata.timestamp).toLocaleString('vi-VN') : null;
                showConfirm({
                    title: 'Khôi phục dữ liệu?',
                    message: `Thao tác này sẽ GHI ĐÈ toàn bộ dữ liệu Report BI hiện có trên thiết bị này bằng ${dataToRestore.length} mục từ file đã chọn${backupTime ? ` (sao lưu lúc ${backupTime})` : ''}.\n\nDữ liệu hiện tại sẽ KHÔNG thể khôi phục lại sau khi ghi đè. Hãy chắc chắn đây đúng là file bạn muốn dùng.`,
                    variant: 'danger',
                    confirmText: 'Khôi phục, ghi đè',
                    onConfirm: async () => {
                        closeConfirm();
                        setIsLoading('restore');
                        try {
                            await restoreFromBackup(dataToRestore);
                            setIsLoading(null);
                            window.location.reload();
                        } catch (error) {
                            console.error('Restore failed:', error);
                            setIsLoading(null);
                            showConfirm({
                                title: 'Khôi phục thất bại',
                                message: `Lỗi khôi phục: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
                                variant: 'danger',
                                confirmText: 'Đóng',
                                singleButton: true,
                                onConfirm: closeConfirm
                            });
                        }
                    }
                });

            } catch (error) {
                console.error('Restore failed:', error);
                setIsLoading(null);
                showConfirm({
                    title: 'Khôi phục thất bại',
                    message: `Lỗi khôi phục: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
                    variant: 'danger',
                    confirmText: 'Đóng',
                    singleButton: true,
                    onConfirm: closeConfirm
                });
            }
        };
        reader.onerror = () => {
            console.error('Restore failed: FileReader error', reader.error);
            setIsLoading(null);
            showConfirm({
                title: 'Khôi phục thất bại',
                message: 'Không thể đọc file. Vui lòng thử lại.',
                variant: 'danger',
                confirmText: 'Đóng',
                singleButton: true,
                onConfirm: closeConfirm
            });
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-none p-6">
            {/* Header */}
            <header className="flex items-center gap-3 pb-4 border-b-2 border-slate-200 dark:border-slate-700">
                <div className="w-1.5 h-8 bg-sky-600"></div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Cài đặt & Quản lý</h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sao lưu · Khôi phục · Quản lý dữ liệu</p>
                </div>
            </header>

            {/* Section 1: Sao lưu & Khôi phục */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <SaveIcon className="h-4 w-4 text-sky-500" />
                    <h2 className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Sao lưu & Khôi phục (Chuyển thiết bị)</h2>
                </div>
                <div className="p-5">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        Chuyển toàn bộ dữ liệu (Báo cáo, Target, Snapshot, Dữ liệu Thưởng) sang máy tính khác hoặc lưu trữ dự phòng.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="unstyled" size="none" onClick={handleBackup} disabled={!!isLoading} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 disabled:opacity-50 transition-all active:scale-95 shadow-sm">
                            {isLoading === 'backup' ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                            <span>Sao lưu (.json)</span>
                        </Button>
                        <Button variant="unstyled" size="none" onClick={handleRestore} disabled={!!isLoading} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95 shadow-sm">
                            {isLoading === 'restore' ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
                            <span>Khôi phục từ File</span>
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                </div>
            </section>

            {/* Section 2: Lịch sử hoạt động (audit trail) — các thao tác quan trọng gần đây,
                giữ tối đa 60 ngày / 2000 dòng (utils/auditTrail.ts) */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <ClockIcon className="h-4 w-4 text-sky-500" />
                    <h2 className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Lịch sử hoạt động</h2>
                </div>
                <div className="p-5">
                    {isAuditLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <SpinnerIcon className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                    ) : auditLog.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<ClockIcon className="h-5 w-5" />}
                            title="Chưa có hoạt động nào được ghi nhận"
                            description="Các thao tác quan trọng (dán dữ liệu, xoá, khôi phục, lưu thưởng...) sẽ hiện ở đây."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="py-2 pr-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Thời điểm</th>
                                        <th className="py-2 pr-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Người thực hiện</th>
                                        <th className="py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLog.slice(0, 100).map((entry, idx) => {
                                        const [y, m, d] = entry.date.split('-');
                                        return (
                                            <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                                <td className="py-2 pr-3 text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{entry.time} {d}/{m}/{y}</td>
                                                <td className="py-2 pr-3 text-[12px] text-slate-600 dark:text-slate-300 whitespace-nowrap">{entry.actor || <span className="text-slate-400 italic">Không xác định</span>}</td>
                                                <td className="py-2 text-[12px] text-slate-700 dark:text-slate-200">{entry.label || ACTION_LABELS[entry.action] || entry.action}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {auditLog.length > 100 && (
                                <p className="text-[11px] text-slate-400 mt-3">Đang hiển thị 100 hoạt động gần nhất trên tổng {auditLog.length}.</p>
                            )}
                        </div>
                    )}
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
                singleButton={confirmDialog.singleButton}
            />
        </div>
    );
};

export default Settings;
