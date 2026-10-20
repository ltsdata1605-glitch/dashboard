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
    parseCommands,
    RESERVED_COMMANDS,
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

    // Trạng thái chỉnh sửa lệnh
    const [isEditingRt, setIsEditingRt] = useState(false);
    const [isEditingLk, setIsEditingLk] = useState(false);
    const [rtCmdInput, setRtCmdInput] = useState('');
    const [lkCmdInput, setLkCmdInput] = useState('');
    const [rtError, setRtError] = useState<string | null>(null);
    const [lkError, setLkError] = useState<string | null>(null);

    useEffect(() => {
        const s = getAreaExportSetting(areaId);
        setSetting(s);
        setRtCmdInput(s.realtimeCommand || 'bcrt');
        setLkCmdInput(s.luykeCommand || 'bclk');

        return onAutoExportSettingsChanged(() => {
            const updated = getAreaExportSetting(areaId);
            setSetting(updated);
            setRtCmdInput(updated.realtimeCommand || 'bcrt');
            setLkCmdInput(updated.luykeCommand || 'bclk');
        });
    }, [areaId]);

    const isAnyActive = setting.realtime || setting.luyke;

    const handleToggleRealtime = async () => {
        const next = !setting.realtime;
        await setAreaExportSetting(areaId, { realtime: next });
        setSetting(prev => ({ ...prev, realtime: next }));
        const cmdName = setting.realtimeCommand || 'bcrt';
        toast.success(`Đã ${next ? 'bật' : 'tắt'} tự động xuất Realtime (lệnh ${cmdName}) cho ${areaName || areaId}`);
    };

    const handleToggleLuyke = async () => {
        const next = !setting.luyke;
        await setAreaExportSetting(areaId, { luyke: next });
        setSetting(prev => ({ ...prev, luyke: next }));
        const cmdName = setting.luykeCommand || 'bclk';
        toast.success(`Đã ${next ? 'bật' : 'tắt'} tự động xuất Luỹ kế (lệnh ${cmdName}) cho ${areaName || areaId}`);
    };

    const validateCmdInput = (val: string, defaultCmd: string) => {
        const cmds = val.split(/[,;\s]+/).map(c => c.trim().toLowerCase().replace(/^[./!#\s]+/, '')).filter(Boolean);
        if (cmds.length === 0) return { ok: true, cleaned: defaultCmd };
        for (const c of cmds) {
            if (c.length < 2 || c.length > 30) {
                return { ok: false, error: `Lệnh "${c}" phải từ 2 đến 30 ký tự.` };
            }
            if (!/^[a-z0-9_-]+$/.test(c)) {
                return { ok: false, error: `Lệnh "${c}" chỉ được chứa chữ cái, số, gạch nối (-) hoặc gạch dưới (_).` };
            }
            if (RESERVED_COMMANDS.includes(c)) {
                return { ok: false, error: `Lệnh "${c}" trùng với lệnh hệ thống của Bot.` };
            }
        }
        const unique = Array.from(new Set(cmds));
        return { ok: true, cleaned: unique.join(', ') };
    };

    const handleSaveRtCmd = async () => {
        const result = validateCmdInput(rtCmdInput, 'bcrt');
        if (!result.ok) {
            setRtError(result.error || 'Lệnh không hợp lệ');
            return;
        }
        setRtError(null);
        const cleaned = result.cleaned || 'bcrt';
        await setAreaExportSetting(areaId, { realtimeCommand: cleaned });
        setSetting(prev => ({ ...prev, realtimeCommand: cleaned }));
        setIsEditingRt(false);
        toast.success(`Đã lưu lệnh Realtime cho ${areaName || areaId}: "${cleaned}"`);
    };

    const handleResetRtCmd = async () => {
        setRtCmdInput('bcrt');
        setRtError(null);
        await setAreaExportSetting(areaId, { realtimeCommand: 'bcrt' });
        setSetting(prev => ({ ...prev, realtimeCommand: 'bcrt' }));
        setIsEditingRt(false);
        toast.success(`Đã khôi phục lệnh Realtime về mặc định (bcrt)`);
    };

    const handleSaveLkCmd = async () => {
        const result = validateCmdInput(lkCmdInput, 'bclk');
        if (!result.ok) {
            setLkError(result.error || 'Lệnh không hợp lệ');
            return;
        }
        setLkError(null);
        const cleaned = result.cleaned || 'bclk';
        await setAreaExportSetting(areaId, { luykeCommand: cleaned });
        setSetting(prev => ({ ...prev, luykeCommand: cleaned }));
        setIsEditingLk(false);
        toast.success(`Đã lưu lệnh Luỹ kế cho ${areaName || areaId}: "${cleaned}"`);
    };

    const handleResetLkCmd = async () => {
        setLkCmdInput('bclk');
        setLkError(null);
        await setAreaExportSetting(areaId, { luykeCommand: 'bclk' });
        setSetting(prev => ({ ...prev, luykeCommand: 'bclk' }));
        setIsEditingLk(false);
        toast.success(`Đã khôi phục lệnh Luỹ kế về mặc định (bclk)`);
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
            const activeMode = setting.luyke && !setting.realtime ? 'luyke' : 'realtime';
            const customCmds = activeMode === 'luyke'
                ? parseCommands(setting.luykeCommand, 'bclk')
                : parseCommands(setting.realtimeCommand, 'bcrt');

            const res = await saveAutoReportImagesToFirebase({
                mode: activeMode,
                images: [{ reportKey: areaName || areaId, blob, fileName: `${areaId}.png` }],
                user,
                departmentId,
                customCommands: customCmds,
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

    const rtCommands = parseCommands(setting.realtimeCommand, 'bcrt');
    const lkCommands = parseCommands(setting.luykeCommand, 'bclk');

    const titleTooltip = isAnyActive
        ? `Tự xuất Bot LINE: ${[
            setting.realtime ? `Realtime (${setting.realtimeCommand || 'bcrt'})` : '',
            setting.luyke ? `Luỹ kế (${setting.luykeCommand || 'bclk'})` : ''
        ].filter(Boolean).join(', ')}`
        : 'Cấu hình tự động xuất ảnh cho Bot LINE';

    return (
        <>
            <Button
                variant="unstyled"
                size="none"
                onClick={() => {
                    const s = getAreaExportSetting(areaId);
                    setSetting(s);
                    setRtCmdInput(s.realtimeCommand || 'bcrt');
                    setLkCmdInput(s.luykeCommand || 'bclk');
                    setIsEditingRt(false);
                    setIsEditingLk(false);
                    setRtError(null);
                    setLkError(null);
                    setIsOpen(true);
                }}
                title={titleTooltip}
                aria-label={titleTooltip}
                className={`ycx-hit preserve-rounded relative flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg transition-all duration-150 active:scale-[0.94] ${
                    isAnyActive
                        ? 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 shadow-2xs font-semibold'
                        : 'border border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 dark:text-slate-100">Báo cáo Realtime</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditingRt(prev => !prev);
                                            setRtError(null);
                                        }}
                                        className="group inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700 hover:bg-sky-200 dark:hover:bg-sky-800/80 transition-colors cursor-pointer"
                                        title="Nhấn để cấu hình lệnh gọi LINE"
                                    >
                                        <span>Lệnh: {setting.realtimeCommand || 'bcrt'}</span>
                                        <AppIcon name="edit" size="xs" className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                    </button>
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

                        {/* Inline Edit Form cho Realtime Command */}
                        {isEditingRt && (
                            <div className="pt-2 mt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                                        Cấu hình lệnh gọi trên LINE:
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleResetRtCmd}
                                        className="text-[11px] text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 underline transition-colors"
                                    >
                                        ↺ Mặc định (bcrt)
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={rtCmdInput}
                                        onChange={(e) => {
                                            setRtCmdInput(e.target.value);
                                            setRtError(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveRtCmd();
                                            if (e.key === 'Escape') setIsEditingRt(false);
                                        }}
                                        placeholder="Ví dụ: bcrt hoặc bcrt, rt, cttk"
                                        autoFocus
                                        className="flex-1 px-2.5 py-1 text-[12px] font-mono rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveRtCmd}
                                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-2xs transition-colors shrink-0"
                                    >
                                        Lưu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingRt(false)}
                                        className="px-2 py-1 rounded-md text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                                    >
                                        Đóng
                                    </button>
                                </div>
                                {rtError ? (
                                    <p className="text-[11px] text-rose-500 dark:text-rose-400">{rtError}</p>
                                ) : (
                                    <p className="flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        <AppIcon name="idea" size="xs" className="mt-px shrink-0 text-amber-500" />
                                        <span>Nhập 1 hoặc nhiều lệnh cách nhau bằng dấu phẩy (vd: <code>bcrt, rt, cttk</code>).</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Card 2: Lũy kế (bclk) */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 dark:text-slate-100">Báo cáo Lũy kế</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditingLk(prev => !prev);
                                            setLkError(null);
                                        }}
                                        className="group inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800/80 transition-colors cursor-pointer"
                                        title="Nhấn để cấu hình lệnh gọi LINE"
                                    >
                                        <span>Lệnh: {setting.luykeCommand || 'bclk'}</span>
                                        <AppIcon name="edit" size="xs" className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                    </button>
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

                        {/* Inline Edit Form cho Luỹ kế Command */}
                        {isEditingLk && (
                            <div className="pt-2 mt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                        Cấu hình lệnh gọi trên LINE:
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleResetLkCmd}
                                        className="text-[11px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 underline transition-colors"
                                    >
                                        ↺ Mặc định (bclk)
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={lkCmdInput}
                                        onChange={(e) => {
                                            setLkCmdInput(e.target.value);
                                            setLkError(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveLkCmd();
                                            if (e.key === 'Escape') setIsEditingLk(false);
                                        }}
                                        placeholder="Ví dụ: bclk hoặc bclk, lk, kho910"
                                        autoFocus
                                        className="flex-1 px-2.5 py-1 text-[12px] font-mono rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveLkCmd}
                                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0"
                                    >
                                        Lưu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingLk(false)}
                                        className="px-2 py-1 rounded-md text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                                    >
                                        Đóng
                                    </button>
                                </div>
                                {lkError ? (
                                    <p className="text-[11px] text-rose-500 dark:text-rose-400">{lkError}</p>
                                ) : (
                                    <p className="flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        <AppIcon name="idea" size="xs" className="mt-px shrink-0 text-amber-500" />
                                        <span>Nhập 1 hoặc nhiều lệnh cách nhau bằng dấu phẩy (vd: <code>bclk, lk, kho910</code>).</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mẹo tra cứu từ nhóm LINE với lệnh động */}
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[12px] text-amber-800 dark:text-amber-300 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                            <AppIcon name="info" size="xs" />
                            <span>Mẹo tra cứu từ nhóm LINE:</span>
                        </p>
                        <p>
                            • Gõ {rtCommands.map((c, idx) => (
                                <React.Fragment key={c}>
                                    {idx > 0 && ' hoặc '}
                                    <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-bold">{c}</code>
                                </React.Fragment>
                            ))} để nhận ảnh Realtime mới nhất.
                        </p>
                        <p>
                            • Gõ {lkCommands.map((c, idx) => (
                                <React.Fragment key={c}>
                                    {idx > 0 && ' hoặc '}
                                    <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-bold">{c}</code>
                                </React.Fragment>
                            ))} để nhận ảnh Luỹ kế mới nhất.
                        </p>
                        <p>• Gõ <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-bold">bc</code> để nhận báo cáo chung mới nhất.</p>
                        <p>• Gõ <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-bold">dsbc</code> để xem tất cả các lệnh báo cáo có sẵn trên Bot.</p>
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

