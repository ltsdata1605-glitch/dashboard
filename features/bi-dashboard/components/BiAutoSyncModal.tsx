import React, { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { BiSyncMode, BiSyncProgress, USERSCRIPT_URL } from '../services/biAutoSyncService';
import { setStoredUserscriptVersion } from '../services/userscriptProbeService';
import { TampermonkeyInstallGuideContent } from './common/TampermonkeyInstallGuideContent';

interface BiAutoSyncModalProps {
    isOpen: boolean;
    mode: BiSyncMode;
    progress: BiSyncProgress | null;
    status: 'idle' | 'running' | 'success' | 'error' | 'not-installed' | 'outdated';
    currentVersion?: string;
    /** Bản mới nhất đang phát trên Dashboard (đọc từ dòng @version) — rỗng nếu không đọc được */
    latestVersion?: string;
    /** Luỹ kế: tháng đang lấy (YYYYMM) — hiện trên tiêu đề */
    month?: string;
    errorMessage?: string;
    onClose: () => void;
    onCancel?: () => void;
    onReopenWorker?: () => void;
    onRetry?: () => void;
}

// Thứ tự dòng = thứ tự CHẠY THẬT của userscript (Direct API): Hợp nhất → Thi đua → Ngành hàng → Nhân viên.
// `id` là mã bước theo tên (buocTheoTen), không phải số hiển thị — số trong vòng tròn = vị trí dòng.
const STEPS_REALTIME = [
    { id: 1, title: 'Doanh thu hợp nhất', desc: 'Chọn tất cả, bật Trả góp & DT quy đổi' },
    { id: 4, title: 'Báo cáo Thi đua', desc: 'Chọn tất cả & sao chép bảng thi đua' },
    { id: 2, title: 'Ngành hàng BI', desc: 'Mở rộng cây [+] & sao chép ngành hàng' },
    { id: 3, title: 'Doanh thu nhân viên', desc: 'Sao chép chi tiết doanh số nhân viên' },
];

// Luỹ kế (userscript 7.9+) chạy cùng Direct API như Realtime + Trả chậm theo nhân viên: 5 báo cáo, đúng thứ tự chạy.
const STEPS_LUYKE = [
    { id: 1, title: 'Doanh thu hợp nhất', desc: 'Chọn Lũy kế, bật Trả góp & DT quy đổi' },
    { id: 4, title: 'Báo cáo Thi đua', desc: 'Thi đua Luỹ kế toàn cụm' },
    { id: 2, title: 'Ngành hàng BI', desc: 'Cây ngành hàng Luỹ kế từng siêu thị' },
    { id: 3, title: 'Doanh thu nhân viên', desc: 'Doanh thu nhân viên Luỹ kế từng siêu thị' },
    { id: 5, title: 'Thi đua & Trả chậm', desc: 'Thi đua + trả chậm từng nhân viên, từng siêu thị' },
];

/** Sau khi xong, modal tự đóng sau ngần này giây (chủ dự án: "hoàn tất tự quay về trang gốc và tự đóng thông báo"). */
export const AUTO_CLOSE_SECONDS = 3;

/**
 * Bước trong modal xác định theo TÊN bước userscript gửi, KHÔNG theo số thứ tự: Direct API Engine báo
 * 2 = Thi đua, 3 = Ngành hàng, 4 = Nhân viên, còn đường UI báo 2 = Ngành hàng, 4 = Thi đua → so theo số
 * thì modal hiện "Ngành hàng đang xử lý" trong lúc thực ra đang lấy Thi đua.
 */
export function buocTheoTen(stepName: string | undefined): number | null {
    const t = (stepName || '').toLowerCase();
    if (t.includes('hợp nhất')) return 1;
    if (t.includes('ngành hàng')) return 2;
    if (t.includes('nhân viên')) return 3;
    if (t.includes('trả chậm')) return 5; // trước "thi đua": bước 5 Luỹ kế tên "Thi đua & Trả chậm"
    if (t.includes('thi đua')) return 4;
    return null; // "Khởi tạo …" — chưa vào bước nào
}

export const BiAutoSyncModal: React.FC<BiAutoSyncModalProps> = ({
    isOpen,
    mode,
    progress,
    status,
    errorMessage,
    currentVersion,
    latestVersion,
    month,
    onClose,
    onCancel,
    onReopenWorker,
    onRetry,
}) => {
    const isRealtime = mode === 'realtime';
    const steps = isRealtime ? STEPS_REALTIME : STEPS_LUYKE;
    const currentStep = buocTheoTen(progress?.stepName);

    // Các bước đã đi qua: bước đang chạy đổi sang bước khác thì bước cũ coi như xong
    const [daXong, setDaXong] = useState<Set<number>>(new Set());
    const buocTruoc = useRef<number | null>(null);
    const jobTruoc = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (progress?.jobId !== jobTruoc.current) {
            jobTruoc.current = progress?.jobId;
            buocTruoc.current = null;
            setDaXong(new Set());
        }
        if (currentStep !== null && buocTruoc.current !== null && buocTruoc.current !== currentStep) {
            const xong = buocTruoc.current;
            setDaXong(prev => new Set(prev).add(xong));
        }
        if (currentStep !== null) buocTruoc.current = currentStep;
    }, [progress?.jobId, currentStep]);

    // Tự đóng sau khi hoàn tất, có đếm ngược để người dùng kịp thấy kết quả
    const [conLai, setConLai] = useState(AUTO_CLOSE_SECONDS);
    useEffect(() => {
        if (!isOpen || status !== 'success') { setConLai(AUTO_CLOSE_SECONDS); return; }
        if (conLai <= 0) { onClose(); return; }
        const t = window.setTimeout(() => setConLai(n => n - 1), 1000);
        return () => window.clearTimeout(t);
    }, [isOpen, status, conLai, onClose]);

    const [hoiHuy, setHoiHuy] = useState(false);
    const phanTram = progress && progress.totalSteps > 0
        ? Math.min(100, Math.round((progress.step / progress.totalSteps) * 100))
        : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (status === 'running') setHoiHuy(true);
                else onClose();
            }}
            title={
                status === 'not-installed' ? (
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-xs">
                            <AppIcon name="securityOk" size="lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                                Cài đặt Tampermonkey — Tự động {isRealtime ? 'Realtime' : 'Luỹ kế'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                                Làm theo hướng dẫn 3 bước dưới đây để kết nối Dashboard với hệ thống báo cáo MWG
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl text-white shadow-xs ${
                            isRealtime ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-600 shadow-emerald-500/20'
                        }`}>
                            {isRealtime ? <AppIcon name="clock" size="lg" /> : <AppIcon name="trendUp" size="lg" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                                    {isRealtime ? 'Tự động Cập nhật Realtime' : `Tự động Cập nhật Luỹ Kế${month && /^\d{6}$/.test(month) ? ` · tháng ${month.slice(4)}/${month.slice(0, 4)}` : ''}`}
                                </h3>
                                <span className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-wide rounded-full border ${
                                    isRealtime
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                }`}>
                                    {steps.length} Báo cáo
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                                {isRealtime
                                    ? 'Tự động mở trang MWG, check các tuỳ chọn và dán 4 báo cáo Realtime vào hệ thống'
                                    : 'Tự động mở trang MWG, chọn Lũy kế và dán 5 báo cáo Luỹ kế vào hệ thống'}
                            </p>
                        </div>
                    </div>
                )
            }
            maxWidth={status === 'not-installed' ? 'lg' : 'md'}
        >
            <div className="space-y-4 py-1">
                {/* TRƯỜNG HỢP CẦN CẬP NHẬT USERSCRIPT */}
                {status === 'outdated' && (
                    <div className="space-y-3 p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 animate-in fade-in duration-200">
                        <div className="flex items-start gap-3">
                            <AppIcon name="alert" size="lg" className="text-rose-600 mt-0.5" />
                            <div className="text-xs space-y-1.5">
                                <p className="font-bold text-rose-900 dark:text-rose-200" data-testid="bi-sync-can-cap-nhat">
                                    Cần cập nhật Userscript{latestVersion ? ` lên bản mới nhất v${latestVersion}` : ''}
                                </p>
                                <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                                    Trình duyệt đang chạy bản cũ{currentVersion ? ` (v${currentVersion})` : ''}. Đã tự mở trang cập nhật ở tab mới:
                                    bấm <b>Cập nhật</b> (Update) trong Tampermonkey. Sau khi cập nhật xong, <b>hệ thống sẽ tự động phát hiện ngầm và tự động đổ dữ liệu</b> mà không cần F5 hay bấm lại.
                                </p>
                                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold text-[11px] bg-rose-100/60 dark:bg-rose-900/40 px-2.5 py-1.5 rounded-lg border border-rose-200/80 dark:border-rose-800/50">
                                    <AppIcon name="loading" size="xs" spin className="text-rose-600 dark:text-rose-400 shrink-0" />
                                    <span>Đang kiểm tra ngầm liên tục... Sẽ tự động đổ dữ liệu ngay khi cập nhật xong.</span>
                                </div>
                                <div className="pt-1.5 flex flex-wrap gap-2">
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        onClick={() => {
                                            if (latestVersion) {
                                                setStoredUserscriptVersion(latestVersion);
                                            }
                                            if (onRetry) {
                                                onRetry();
                                            }
                                        }}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                                        title="Bấm để kiểm tra lại và tự động đổ dữ liệu ngay nếu bạn đã cài đặt xong trong Tampermonkey"
                                    >
                                        <AppIcon name="check" size="sm" />
                                        <span>Đã cài đặt xong · Đổ dữ liệu ngay</span>
                                    </Button>
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        onClick={() => window.open(USERSCRIPT_URL, '_blank')}
                                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                                    >
                                        <AppIcon name="externalLink" size="sm" />
                                        <span>Mở lại trang cập nhật Userscript{latestVersion ? ` v${latestVersion}` : ''}</span>
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={onClose}
                                    >
                                        Đóng
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TRƯỜNG HỢP CHƯA CÀI USERSCRIPT - HƯỚNG DẪN 3 BƯỚC CHI TIẾT */}
                {status === 'not-installed' && (
                    <TampermonkeyInstallGuideContent
                        onRetry={onRetry}
                        onClose={onClose}
                    />
                )}

                {/* DANH SÁCH BƯỚC */}
                {status !== 'not-installed' && (
                    <div className="space-y-2">
                        {steps.map((step, viTri) => {
                            const isCompleted = status === 'success' || (daXong.has(step.id) && currentStep !== step.id);
                            const isCurrent = currentStep === step.id && status === 'running';

                            return (
                                <div
                                    key={step.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                        isCurrent
                                            ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 ring-2 ring-sky-500/10'
                                            : isCompleted
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                                                : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/70 dark:border-slate-800 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                            isCompleted
                                                ? 'bg-emerald-600 text-white'
                                                : isCurrent
                                                    ? 'bg-sky-600 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {isCompleted ? (
                                                <AppIcon name="check" size="md" />
                                            ) : isCurrent ? (
                                                <AppIcon name="loading" size="md" spin />
                                            ) : (
                                                viTri + 1
                                            )}
                                        </div>
                                        <div>
                                            <div className={`text-xs font-bold ${
                                                isCurrent
                                                    ? 'text-sky-900 dark:text-sky-200'
                                                    : isCompleted
                                                        ? 'text-slate-800 dark:text-slate-200'
                                                        : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {step.title}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {step.desc}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        {isCurrent && (
                                            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 animate-pulse flex items-center gap-1">
                                                <span>Đang xử lý...</span>
                                            </span>
                                        )}
                                        {isCompleted && (
                                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <span>Đã xong</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* TIẾN TRÌNH TRỰC TIẾP — cùng nội dung bảng tiến trình trên tab MWG, để theo dõi ngay tại Dashboard */}
                {status === 'running' && (
                    <div className="p-3 rounded border border-sky-200 bg-sky-50" data-testid="bi-sync-tien-trinh">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                                <AppIcon name="loading" size="sm" spin />
                                Tự động cập nhật BI
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                                {progress ? `${progress.step}/${progress.totalSteps} (${phanTram}%)` : 'Đang mở trang MWG…'}
                            </span>
                        </div>
                        {progress && (
                            <>
                                <div className="text-sm font-semibold text-slate-800">{progress.stepName}</div>
                                <div className="text-xs text-slate-600 mb-2 break-words">{progress.message}</div>
                            </>
                        )}
                        <div className="w-full h-1.5 bg-slate-200 rounded overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={phanTram}>
                            <div className="h-full bg-sky-600 transition-[width] duration-300" style={{ width: `${phanTram}%` }} />
                        </div>
                    </div>
                )}

                {/* THÀNH CÔNG */}
                {status === 'success' && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                        <AppIcon name="check" size="lg" className="text-emerald-600" />
                        <span>Toàn bộ {steps.length} báo cáo {isRealtime ? 'Realtime' : 'Luỹ kế'} đã được tự động dán và lưu trữ thành công vào hệ thống!</span>
                    </div>
                )}

                {/* LỖI */}
                {status === 'error' && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-800 dark:text-rose-200 text-xs">
                        <AppIcon name="alert" size="lg" className="text-rose-600" />
                        <div>
                            <div className="font-bold">Có lỗi xảy ra trong quá trình thu thập:</div>
                            <div className="text-[11px] opacity-90 mt-0.5">{errorMessage || 'Không thể kết nối hoặc phiên đăng nhập MWG hết hạn.'}</div>
                        </div>
                    </div>
                )}

                {/* FOOTER ACTIONS (Chỉ hiện khi đang chạy hoặc xong/lỗi, không hiện khi not-installed) */}
                {status !== 'not-installed' && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-400" aria-live="polite">
                            {status === 'running' && 'Không đóng tab MWG đang chạy ngầm...'}
                            {status === 'success' && `Tự đóng sau ${conLai} giây…`}
                        </div>
                        <div className="flex items-center gap-2">
                            {status === 'running' && onReopenWorker && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onReopenWorker}
                                    className="text-xs"
                                    title="Bấm nếu vô tình đóng mất tab báo cáo MWG"
                                >
                                    Mở lại tab MWG
                                </Button>
                            )}
                            {status === 'running' && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onCancel}
                                    className="text-xs text-rose-600 hover:bg-rose-50"
                                >
                                    Huỷ
                                </Button>
                            )}
                            {(status === 'success' || status === 'error') && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={onClose}
                                    className="text-xs"
                                >
                                    Hoàn tất & Đóng
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <ConfirmDialog
                isOpen={hoiHuy}
                onClose={() => setHoiHuy(false)}
                onConfirm={() => { setHoiHuy(false); onCancel?.(); onClose(); }}
                title="Huỷ cập nhật tự động?"
                message="Quá trình tự động đang chạy. Bạn có chắc muốn huỷ không?"
                confirmText="Huỷ cập nhật"
                cancelText="Tiếp tục chạy"
                variant="warning"
            />
        </Modal>
    );
};
