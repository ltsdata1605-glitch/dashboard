import React, { useEffect, useState } from 'react';
import { AppIcon } from '../ui/icon/AppIcon';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/toast';
import { useAuth } from '../../../contexts/AuthContext';
import {
    getAreaExportSetting,
    setAreaExportSetting,
    onAutoExportSettingsChanged,
    saveAutoReportImagesToFirebase,
    type AreaExportSetting
} from '../../../services/autoReportExportService';

interface AreaAutoExportButtonProps {
    areaId: string;
    areaName?: string;
    className?: string;
    onTestExport?: () => Promise<Blob | null>;
}

export const AreaAutoExportButton: React.FC<AreaAutoExportButtonProps> = ({
    areaId,
    areaName,
    className = '',
    onTestExport
}) => {
    const { user, departmentId } = useAuth();
    const [setting, setSetting] = useState<AreaExportSetting>(() => getAreaExportSetting(areaId));
    const [isOpen, setIsOpen] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        setSetting(getAreaExportSetting(areaId));
        return onAutoExportSettingsChanged(() => {
            setSetting(getAreaExportSetting(areaId));
        });
    }, [areaId]);

    const isAnyActive = setting.realtime || setting.luyke;

    const handleToggleRealtime = async () => {
        const next = !setting.realtime;
        await setAreaExportSetting(areaId, { realtime: next });
        setSetting(prev => ({ ...prev, realtime: next }));
        toast.success(`Đã ${next ? 'bật' : 'tắt'} tự động xuất Realtime (lệnh bcrt) cho ${areaName || areaId}`);
    };

    const handleToggleLuyke = async () => {
        const next = !setting.luyke;
        await setAreaExportSetting(areaId, { luyke: next });
        setSetting(prev => ({ ...prev, luyke: next }));
        toast.success(`Đã ${next ? 'bật' : 'tắt'} tự động xuất Luỹ kế (lệnh bclk) cho ${areaName || areaId}`);
    };

    const handleRunTest = async () => {
        if (!onTestExport) return;
        setIsTesting(true);
        try {
            const blob = await onTestExport();
            if (!blob) {
                toast.error('Không chụp được ảnh khu vực này.');
                return;
            }
            const res = await saveAutoReportImagesToFirebase({
                mode: setting.luyke && !setting.realtime ? 'luyke' : 'realtime',
                images: [{ reportKey: areaName || areaId, blob, fileName: `${areaId}.png` }],
                user,
                departmentId
            });
            if (res.ok) {
                toast.success(`Đã lưu ảnh thử nghiệm lên Bot LINE cho lệnh "${res.commands.join('", "')}"!`);
            } else {
                toast.error('Lỗi lưu ảnh lên Bot LINE. Vui lòng kiểm tra cấu hình Bot.');
            }
        } catch (err) {
            console.error('Lỗi khi chụp thử:', err);
            toast.error('Lỗi khi chụp thử ảnh.');
        } finally {
            setIsTesting(false);
        }
    };

    const titleTooltip = isAnyActive
        ? `Tự xuất Bot LINE: ${[setting.realtime ? 'Realtime (bcrt)' : '', setting.luyke ? 'Luỹ kế (bclk)' : ''].filter(Boolean).join(', ')}`
        : 'Cấu hình tự động xuất ảnh cho Bot LINE';

    return (
        <>
            <Button
                variant="unstyled"
                size="none"
                onClick={() => setIsOpen(true)}
                title={titleTooltip}
                aria-label={titleTooltip}
                className={`ycx-hit relative flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg transition-colors ${
                    isAnyActive
                        ? 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${className}`}
            >
                <AppIcon name="bot" size="md" />
                {isAnyActive && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900" />
                )}
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Cấu hình tự xuất cho Bot LINE"
                subTitle={areaName || areaId}
                maxWidth="md"
            >
                <div className="space-y-4 text-[13px] text-slate-700 dark:text-slate-300">
                    <p className="text-slate-500 dark:text-slate-400">
                        Sau khi hoàn tất Auto Sync, khu vực này sẽ được tự động chụp ảnh và lưu lên Firebase. Khi gõ lệnh tương ứng trong nhóm LINE, Bot sẽ gửi ảnh này vào nhóm.
                    </p>

                    {/* Card 1: Realtime (bcrt) */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-100">Báo cáo Realtime</span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                                    Lệnh: bcrt
                                </span>
                            </div>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                Tự động chụp & lưu sau mỗi lượt chạy Auto Sync Realtime.
                            </p>
                        </div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={handleToggleRealtime}
                            className={`h-8 px-3 rounded-lg text-[12px] font-bold border transition-colors shrink-0 ${
                                setting.realtime
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            {setting.realtime ? 'Đang bật' : 'Đang tắt'}
                        </Button>
                    </div>

                    {/* Card 2: Lũy kế (bclk) */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-100">Báo cáo Lũy kế</span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                                    Lệnh: bclk
                                </span>
                            </div>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                Tự động chụp & lưu sau mỗi lượt chạy Auto Sync Luỹ kế.
                            </p>
                        </div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={handleToggleLuyke}
                            className={`h-8 px-3 rounded-lg text-[12px] font-bold border transition-colors shrink-0 ${
                                setting.luyke
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            {setting.luyke ? 'Đang bật' : 'Đang tắt'}
                        </Button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[12px] text-amber-800 dark:text-amber-300 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                            <AppIcon name="info" size="xs" />
                            <span>Mẹo tra cứu từ nhóm LINE:</span>
                        </p>
                        <p>• Gõ <code>bcrt</code> để nhận ảnh Realtime mới nhất.</p>
                        <p>• Gõ <code>bclk</code> để nhận ảnh Luỹ kế mới nhất.</p>
                        <p>• Gõ <code>bc</code> để nhận báo cáo chung mới nhất.</p>
                    </div>

                    {onTestExport && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleRunTest}
                                disabled={isTesting}
                                className="flex items-center gap-1.5"
                            >
                                {isTesting ? (
                                    <>
                                        <AppIcon name="loading" size="xs" spin />
                                        <span>Đang chụp & tải lên...</span>
                                    </>
                                ) : (
                                    <>
                                        <AppIcon name="exportImage" size="xs" />
                                        <span>Chụp thử & lưu lên Bot ngay</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default AreaAutoExportButton;
