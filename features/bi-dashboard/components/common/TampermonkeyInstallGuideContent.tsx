import React, { useState } from 'react';
import { Button } from '../../../../components/shared/ui/Button';
import { ExternalLink, Copy, Check, AlertTriangle, Sparkles, RefreshCw, ShieldCheck, Download, ArrowRight, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { detectUserscript } from '../../utils/bonusBridge';

const TAMPERMONKEY_STORE_URL = 'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo';
const SCRIPT_PATH = '/scripts/mwg-auto-thu-thap-diem-thuong.user.js';

export function getScriptUrl(): string {
    return `${window.location.origin}${SCRIPT_PATH}`;
}

interface TampermonkeyInstallGuideContentProps {
    onRetry?: () => void;
    onClose?: () => void;
    onUseManual?: () => void;
    isCheckingExternal?: boolean;
}

export const TampermonkeyInstallGuideContent: React.FC<TampermonkeyInstallGuideContentProps> = ({
    onRetry,
    onClose,
    onUseManual,
    isCheckingExternal = false,
}) => {
    const [copiedLink, setCopiedLink] = useState(false);
    const [isCheckingInternal, setIsCheckingInternal] = useState(false);
    const [checkSuccess, setCheckSuccess] = useState(false);

    const isChecking = isCheckingExternal || isCheckingInternal;

    const handleCopyExtensionsLink = () => {
        navigator.clipboard.writeText('chrome://extensions');
        setCopiedLink(true);
        toast.success('Đã sao chép "chrome://extensions"! Mở tab mới và dán (Ctrl+V) vào ô địa chỉ.', {
            duration: 4000,
            icon: '📋',
        });
        setTimeout(() => setCopiedLink(false), 3000);
    };

    const handleCheckConnection = async () => {
        setIsCheckingInternal(true);
        try {
            const { installed } = await detectUserscript(1500);
            if (installed) {
                setCheckSuccess(true);
                confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                toast.success('🎉 Tuyệt vời! Tiện ích Tampermonkey & Script đã kết nối thành công!', {
                    duration: 4000,
                });
                setTimeout(() => {
                    if (onRetry) {
                        onRetry();
                    } else if (onClose) {
                        onClose();
                    }
                }, 800);
            } else {
                toast.error('Chưa phát hiện được tiện ích. Bạn hãy kiểm tra lại Bước 1 và Bước 2 nhé!', {
                    duration: 4000,
                });
                if (onRetry) onRetry();
            }
        } catch {
            toast.error('Chưa kết nối được. Vui lòng thử lại sau khi hoàn tất các bước.');
        } finally {
            setIsCheckingInternal(false);
        }
    };

    return (
        <div className="space-y-4 text-left">
            {/* Thanh giới thiệu nổi bật */}
            <div className="p-3 sm:p-3.5 bg-gradient-to-r from-sky-50 via-sky-50 to-sky-50 dark:from-sky-950/40 dark:via-sky-950/30 dark:to-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/40 flex items-start gap-3">
                <div className="p-2 bg-sky-500/10 dark:bg-sky-400/10 rounded-lg text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        Tính năng Tự Động cần tiện ích Tampermonkey
                    </p>
                    <p className="leading-relaxed">
                        Để tự động lấy số liệu <b>Realtime, Luỹ kế và Thưởng</b> từ portal MWG về máy mà không cần nhập tay, bạn chỉ cần làm theo <b>3 bước cực kỳ đơn giản bên dưới (chỉ làm 1 lần duy nhất)</b>.
                    </p>
                </div>
            </div>

            {/* DANH SÁCH 3 BƯỚC CHI TIẾT */}
            <div className="space-y-3">
                {/* ─── BƯỚC 1 ─── */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                1
                            </span>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                Cài đặt tiện ích Tampermonkey cho trình duyệt
                            </h3>
                        </div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => window.open(TAMPERMONKEY_STORE_URL, '_blank')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Mở Chrome Web Store</span>
                        </Button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-8">
                        Khi trang Google mở ra, bấm nút màu xanh <b className="text-sky-600 dark:text-sky-400">"Thêm vào Chrome"</b> (hoặc "Thêm vào Cốc Cốc" / "Add to Chrome") → Chọn <b className="text-slate-800 dark:text-slate-100">"Thêm tiện ích"</b>.
                    </p>

                    {/* Hộp BẬT DEVELOPER MODE — Bắt buộc trên Chrome mới */}
                    <div className="ml-8 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="uppercase text-[11px] tracking-wide">⚠️ Bắt buộc: Bật "Chế độ dành cho nhà phát triển"</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Google Chrome phiên bản mới yêu cầu bật chế độ này thì Tampermonkey mới được phép hoạt động:
                        </p>
                        <div className="space-y-1.5 pl-1 text-slate-700 dark:text-slate-300">
                            <div className="flex flex-wrap items-center gap-2">
                                <span>• Mở 1 tab mới và dán địa chỉ:</span>
                                <code className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded font-mono font-bold text-[11px]">
                                    chrome://extensions
                                </code>
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    onClick={handleCopyExtensionsLink}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded text-[11px] font-bold transition-colors"
                                >
                                    {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedLink ? 'Đã sao chép' : 'Sao chép link'}</span>
                                </Button>
                            </div>
                            <p>
                                • Nhìn lên <b className="text-slate-800 dark:text-slate-100">góc trên cùng bên phải màn hình</b>, gạt công tắc <b className="text-emerald-700 dark:text-emerald-400">"Chế độ dành cho nhà phát triển" (Developer mode)</b> sang trạng thái <b className="text-emerald-600 font-bold">BẬT (Xanh)</b>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ─── BƯỚC 2 ─── */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                2
                            </span>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                Cài đặt Script Tự Động của Dashboard YCX
                            </h3>
                        </div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => window.open(getScriptUrl(), '_blank')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Cài đặt Script ngay</span>
                        </Button>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 pl-8 space-y-1">
                        <p>
                            Bấm nút <b className="text-sky-600 dark:text-sky-400">"Cài đặt Script ngay"</b> ở trên. Tiện ích Tampermonkey sẽ mở một tab cài đặt mới.
                        </p>
                        <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <ArrowRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span>Bạn chỉ cần bấm nút <b className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">"Cài đặt"</b> (hoặc <b className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">"Install"</b>) màu đen/xanh. Sau đó đóng tab đó lại.</span>
                        </p>
                    </div>
                </div>

                {/* ─── BƯỚC 3 ─── */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                3
                            </span>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                Hoàn tất & Kiểm tra kết nối
                            </h3>
                        </div>
                        <Button
                            variant="unstyled"
                            size="none"
                            disabled={isChecking}
                            onClick={handleCheckConnection}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0 ${
                                checkSuccess 
                                    ? 'bg-emerald-600' 
                                    : 'bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-700 hover:to-emerald-700'
                            }`}
                        >
                            {isChecking ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Đang kiểm tra...</span>
                                </>
                            ) : checkSuccess ? (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Đã kết nối!</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Kiểm tra kết nối</span>
                                </>
                            )}
                        </Button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-8">
                        Sau khi hoàn thành Bước 1 và Bước 2, bấm nút <b className="text-emerald-700 dark:text-emerald-400">"Kiểm tra kết nối"</b>. Hệ thống sẽ tự động kích hoạt tính năng tự động ngay lập tức!
                    </p>
                </div>
            </div>

            {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Cần hỗ trợ gấp? Bấm nút Dùng thủ công bên phải</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    {onUseManual && (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={onUseManual}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50"
                        >
                            Dùng Thủ công trong lúc chờ
                        </Button>
                    )}
                    {onClose && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                        >
                            Đóng
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
