import React from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Check, Loader2, AlertCircle, ExternalLink, Zap, Clock, TrendingUp } from 'lucide-react';
import { BiSyncMode, BiSyncProgress } from '../services/biAutoSyncService';

interface BiAutoSyncModalProps {
    isOpen: boolean;
    mode: BiSyncMode;
    progress: BiSyncProgress | null;
    status: 'idle' | 'running' | 'success' | 'error' | 'not-installed' | 'outdated';
    currentVersion?: string;
    errorMessage?: string;
    onClose: () => void;
    onCancel?: () => void;
    onReopenWorker?: () => void;
}

const STEPS_REALTIME = [
    { id: 1, title: 'Doanh thu hợp nhất', desc: 'Chọn tất cả, bật Trả góp & DT quy đổi' },
    { id: 2, title: 'Ngành hàng BI', desc: 'Mở rộng cây [+] & sao chép ngành hàng' },
    { id: 3, title: 'Doanh thu nhân viên', desc: 'Sao chép chi tiết doanh số nhân viên' },
    { id: 4, title: 'Báo cáo Thi đua', desc: 'Chọn tất cả & sao chép bảng thi đua' },
];

const STEPS_LUYKE = [
    { id: 1, title: 'Doanh thu hợp nhất', desc: 'Chọn tất cả, bật Trả góp & DT quy đổi' },
    { id: 2, title: 'Ngành hàng BI', desc: 'Mở rộng cây [+] & sao chép ngành hàng' },
    { id: 3, title: 'Doanh thu nhân viên', desc: 'Sao chép chi tiết doanh số nhân viên' },
    { id: 4, title: 'Báo cáo Thi đua', desc: 'Chọn tất cả & sao chép thi đua (Cụm & Siêu thị)' },
    { id: 5, title: 'Báo cáo Trả chậm', desc: 'Chọn tất cả & sao chép tỷ trọng trả chậm' },
];

export const BiAutoSyncModal: React.FC<BiAutoSyncModalProps> = ({
    isOpen,
    mode,
    progress,
    status,
    errorMessage,
    currentVersion,
    onClose,
    onCancel,
    onReopenWorker,
}) => {
    const isRealtime = mode === 'realtime';
    const steps = isRealtime ? STEPS_REALTIME : STEPS_LUYKE;
    const currentStep = progress ? progress.step : 1;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (status === 'running') {
                    if (window.confirm('Quá trình tự động đang chạy. Bạn có chắc muốn huỷ không?')) {
                        onCancel?.();
                        onClose();
                    }
                } else {
                    onClose();
                }
            }}
            title={
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl text-white shadow-xs ${
                        isRealtime ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-600 shadow-emerald-500/20'
                    }`}>
                        {isRealtime ? <Clock className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                                {isRealtime ? 'Tự động Cập nhật Realtime' : 'Tự động Cập nhật Luỹ Kế'}
                            </h3>
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wide rounded-full border ${
                                isRealtime
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            }`}>
                                {isRealtime ? '4 Báo cáo' : '5 Báo cáo'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            {isRealtime
                                ? 'Tự động mở trang MWG, check các tuỳ chọn và dán 4 báo cáo Realtime vào hệ thống'
                                : 'Tự động mở trang MWG, check các tuỳ chọn và dán 5 báo cáo Luỹ kế (kèm Trả chậm & Thi đua) vào hệ thống'}
                        </p>
                    </div>
                </div>
            }
            maxWidth="md"
        >
            <div className="space-y-4 py-1">
                {/* TRƯỜNG HỢP CẦN CẬP NHẬT USERSCRIPT */}
                {status === 'outdated' && (
                    <div className="space-y-3 p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 animate-in fade-in duration-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1.5">
                                <p className="font-bold text-rose-900 dark:text-rose-200">
                                    Cần cập nhật Userscript lên phiên bản mới v6.9
                                </p>
                                <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                                    Trình duyệt của bạn đang chạy bản cũ {currentVersion ? `(v${currentVersion})` : ''}. Bản mới v6.9 ưu tiên chọn tab "Realtime" (bg-blue-600) đầu tiên, tự động chọn "DT quy đổi" & "Trả góp", hỗ trợ chuẩn xác dải ngày Realtime và Bước 3 GROUPBY BICAT trong 1 lần gọi.
                                </p>
                                <div className="pt-2 flex flex-wrap gap-2">
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        onClick={() => window.open('/scripts/mwg-auto-thu-thap-diem-thuong.user.js', '_blank')}
                                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>👉 Bấm vào đây để Cài đặt / Cập nhật Userscript v6.9 ngay</span>
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

                {/* TRƯỜNG HỢP CHƯA CÀI USERSCRIPT */}
                {status === 'not-installed' && (
                    <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1.5">
                                <p className="font-bold text-slate-800 dark:text-slate-100">
                                    Chưa phát hiện tiện ích Tampermonkey trên trình duyệt
                                </p>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Để chạy tính năng tự động thu thập từ hệ thống báo cáo MWG, bạn cần cài đặt Tampermonkey và nạp Userscript của Dashboard YCX (hoàn toàn an toàn & bảo mật).
                                </p>
                                <div className="pt-2 flex flex-wrap gap-2">
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        onClick={() => window.open('/scripts/mwg-auto-thu-thap-diem-thuong.user.js', '_blank')}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Cài đặt Userscript v6.9 ngay</span>
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

                {/* DANH SÁCH BƯỚC */}
                {status !== 'not-installed' && (
                    <div className="space-y-2">
                        {steps.map((step) => {
                            const isCompleted = currentStep > step.id || status === 'success';
                            const isCurrent = currentStep === step.id && status === 'running';
                            const isPending = currentStep < step.id && status !== 'success';

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
                                                <Check className="w-4 h-4 stroke-[2.5]" />
                                            ) : isCurrent ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                step.id
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

                {/* TRẠNG THÁI HIỆN TẠI & THÔNG ĐIỆP */}
                {status === 'running' && progress?.message && (
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500 shrink-0" />
                        <span className="truncate">{progress.message}</span>
                    </div>
                )}

                {/* THÀNH CÔNG */}
                {status === 'success' && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                        <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Toàn bộ 4 báo cáo {isRealtime ? 'Realtime' : 'Luỹ kế'} đã được tự động dán và lưu trữ thành công vào hệ thống!</span>
                    </div>
                )}

                {/* LỖI */}
                {status === 'error' && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-800 dark:text-rose-200 text-xs">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                            <div className="font-bold">Có lỗi xảy ra trong quá trình thu thập:</div>
                            <div className="text-[11px] opacity-90 mt-0.5">{errorMessage || 'Không thể kết nối hoặc phiên đăng nhập MWG hết hạn.'}</div>
                        </div>
                    </div>
                )}

                {/* FOOTER ACTIONS */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400">
                        {status === 'running' && 'Không đóng tab MWG đang chạy ngầm...'}
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
            </div>
        </Modal>
    );
};
