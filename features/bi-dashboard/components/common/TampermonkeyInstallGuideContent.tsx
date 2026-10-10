import React, { useState } from 'react';
import { AppIcon } from '../../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../../components/shared/ui/Button';
import { toast } from '../../../../components/shared/ui/toast';
import confetti from 'canvas-confetti';
import { detectUserscript } from '../../utils/bonusBridge';

const TAMPERMONKEY_STORE_URL = 'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo';
const TAMPERMONKEY_SETTINGS_URL = 'chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo';
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
    const [copiedSettingsLink, setCopiedSettingsLink] = useState(false);
    const [isCheckingInternal, setIsCheckingInternal] = useState(false);
    const [checkSuccess, setCheckSuccess] = useState(false);

    const isChecking = isCheckingExternal || isCheckingInternal;

    const handleCopyExtensionsLink = () => {
        navigator.clipboard.writeText('chrome://extensions');
        setCopiedLink(true);
        toast.success('Đã sao chép "chrome://extensions"! Mở tab mới và dán (Ctrl+V) vào ô địa chỉ.', {
            duration: 4000,
            icon: <AppIcon name="copy" size="md" className="text-sky-600" />,
        });
        setTimeout(() => setCopiedLink(false), 3000);
    };

    const handleCopySettingsLink = () => {
        navigator.clipboard.writeText(TAMPERMONKEY_SETTINGS_URL);
        setCopiedSettingsLink(true);
        toast.success('Đã sao chép link thiết lập! Mở tab mới và dán (Ctrl+V) vào ô địa chỉ.', {
            duration: 4000,
            icon: <AppIcon name="copy" size="md" className="text-sky-600" />,
        });
        setTimeout(() => setCopiedSettingsLink(false), 3000);
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
                toast.success('Tuyệt vời! Tiện ích Tampermonkey & Script đã kết nối thành công!', {
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
                toast.error('Chưa phát hiện được tiện ích. Bạn hãy kiểm tra lại Bước 1, Bước 2 và Bước 3 nhé!', {
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
                    <AppIcon name="securityOk" size="lg" />
                </div>
                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        Tính năng Tự Động cần tiện ích Tampermonkey
                    </p>
                    <p className="leading-relaxed">
                        Để tự động lấy số liệu <b>Realtime, Luỹ kế và Thưởng</b> từ portal MWG về máy mà không cần nhập tay, bạn chỉ cần làm theo <b>4 bước cực kỳ đơn giản bên dưới (chỉ làm 1 lần duy nhất)</b>.
                    </p>
                </div>
            </div>

            {/* DANH SÁCH 4 BƯỚC CHI TIẾT */}
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
                            <AppIcon name="externalLink" size="sm" />
                            <span>Mở Chrome Web Store</span>
                        </Button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-8">
                        Khi trang Google mở ra, bấm nút màu xanh <b className="text-sky-600 dark:text-sky-400">"Thêm vào Chrome"</b> (hoặc "Thêm vào Cốc Cốc" / "Add to Chrome") → Chọn <b className="text-slate-800 dark:text-slate-100">"Thêm tiện ích"</b>.
                    </p>

                    {/* Hộp BẬT DEVELOPER MODE — Bắt buộc trên Chrome mới */}
                    <div className="ml-8 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border-2 border-rose-500/80 dark:border-rose-500/70 text-xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                                <span className="uppercase text-[11px] tracking-wide font-black">Khung đỏ 1: Bật "Developer mode" (Góc trên cùng bên phải)</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="relative inline-flex h-4 w-7.5 items-center rounded-full bg-sky-600 p-0.5 shadow-xs">
                                    <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-3.5 shadow-xs" />
                                </span>
                                <span className="px-1.5 py-0.5 text-[11px] font-bold bg-sky-600 text-white rounded">
                                    BẬT
                                </span>
                            </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Google Chrome phiên bản mới yêu cầu bắt buộc bật chế độ này thì Tampermonkey mới được phép hoạt động:
                        </p>
                        <div className="space-y-1.5 pl-1 text-slate-700 dark:text-slate-300">
                            <div className="flex flex-wrap items-center gap-2">
                                <span>• Mở 1 tab mới và dán địa chỉ:</span>
                                <code className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 rounded font-mono font-bold text-[11px]">
                                    chrome://extensions
                                </code>
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    onClick={handleCopyExtensionsLink}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-200 hover:bg-rose-300 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-100 rounded text-[11px] font-bold transition-colors"
                                >
                                    {copiedLink ? <AppIcon name="check" size="xs" className="text-emerald-600" /> : <AppIcon name="copy" size="xs" />}
                                    <span>{copiedLink ? 'Đã sao chép' : 'Sao chép link'}</span>
                                </Button>
                            </div>
                            <p>
                                • Nhìn lên <b className="text-slate-800 dark:text-slate-100">góc trên cùng bên phải màn hình</b>, gạt công tắc <b className="text-sky-700 dark:text-sky-400">"Chế độ dành cho nhà phát triển" (Developer mode)</b> sang trạng thái <b className="text-sky-600 font-bold">BẬT (Xanh)</b>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ─── BƯỚC 2: THIẾT LẬP QUYỀN CHO TAMPERMONKEY ─── */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                2
                            </span>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                    Thiết lập quyền cho Tampermonkey
                                </h3>
                                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                    (BẮT BUỘC PHẢI BẬT HẾT CÁC MỤC ĐƯỢC ĐÓNG KHUNG ĐỎ BÊN DƯỚI)
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={handleCopySettingsLink}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
                        >
                            {copiedSettingsLink ? <AppIcon name="check" size="sm" className="text-white" /> : <AppIcon name="copy" size="sm" />}
                            <span>{copiedSettingsLink ? 'Đã sao chép link' : 'Sao chép link thiết lập'}</span>
                        </Button>
                    </div>

                    <div className="space-y-3 pl-8 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-300">
                                • Mở một <b>tab mới</b> và dán địa chỉ cài đặt:
                            </span>
                            <code className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded font-mono font-bold text-[11px] select-all break-all">
                                {TAMPERMONKEY_SETTINGS_URL}
                            </code>
                        </div>

                        {/* HỘP KHUNG ĐỎ BẮT BUỘC BẬT HẾT CÁC CÔNG TẮC */}
                        <div className="p-3.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border-2 border-rose-500 dark:border-rose-500/80 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-rose-200 dark:border-rose-900/60 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                                    <span className="font-black text-rose-800 dark:text-rose-300 text-xs uppercase tracking-wide">
                                        Khung đỏ 2: Bắt buộc gạt BẬT HẾT 5 công tắc sau
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 text-[11px] font-black bg-rose-600 text-white rounded-full uppercase tracking-wider">
                                    5 / 5 MỤC ON
                                </span>
                            </div>

                            <div className="space-y-2">
                                {/* 1. Allow User Scripts */}
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-2">
                                    <div className="space-y-0.5 pr-2">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                                            <span>1. Allow User Scripts</span>
                                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/60">Bắt buộc số 1</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Cho phép extension chạy script tự động lấy số liệu MWG.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="relative inline-flex h-4 w-7.5 items-center rounded-full bg-sky-600 p-0.5 shadow-xs">
                                            <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-3.5 shadow-xs" />
                                        </span>
                                        <span className="px-1.5 py-0.5 text-[11px] font-bold bg-sky-600 text-white rounded">
                                            BẬT
                                        </span>
                                    </div>
                                </div>

                                {/* 2. Pin to toolbar */}
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-2">
                                    <div className="space-y-0.5 pr-2">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">
                                            2. Pin to toolbar
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Ghim biểu tượng Tampermonkey lên thanh công cụ để dễ quan sát trạng thái.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="relative inline-flex h-4 w-7.5 items-center rounded-full bg-sky-600 p-0.5 shadow-xs">
                                            <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-3.5 shadow-xs" />
                                        </span>
                                        <span className="px-1.5 py-0.5 text-[11px] font-bold bg-sky-600 text-white rounded">
                                            BẬT
                                        </span>
                                    </div>
                                </div>

                                {/* 3. Allow in Incognito */}
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-2">
                                    <div className="space-y-0.5 pr-2">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">
                                            3. Allow in Incognito
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Cho phép tiện ích hoạt động kể cả khi mở trình duyệt ở chế độ ẩn danh.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="relative inline-flex h-4 w-7.5 items-center rounded-full bg-sky-600 p-0.5 shadow-xs">
                                            <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-3.5 shadow-xs" />
                                        </span>
                                        <span className="px-1.5 py-0.5 text-[11px] font-bold bg-sky-600 text-white rounded">
                                            BẬT
                                        </span>
                                    </div>
                                </div>

                                {/* 4. Allow access to file URLs */}
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-2">
                                    <div className="space-y-0.5 pr-2">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">
                                            4. Allow access to file URLs
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Cho phép tiện ích truy cập các URL tệp cục bộ khi cần đồng bộ dữ liệu.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="relative inline-flex h-4 w-7.5 items-center rounded-full bg-sky-600 p-0.5 shadow-xs">
                                            <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-3.5 shadow-xs" />
                                        </span>
                                        <span className="px-1.5 py-0.5 text-[11px] font-bold bg-sky-600 text-white rounded">
                                            BẬT
                                        </span>
                                    </div>
                                </div>

                                {/* 5. Collect errors */}
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-2">
                                    <div className="space-y-0.5 pr-2">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">
                                            5. Collect errors
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Tự động ghi nhận log lỗi để hỗ trợ khắc phục nhanh nếu có trục trặc.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="relative inline-flex h-4 w-7.5 items-center rounded-full bg-sky-600 p-0.5 shadow-xs">
                                            <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-3.5 shadow-xs" />
                                        </span>
                                        <span className="px-1.5 py-0.5 text-[11px] font-bold bg-sky-600 text-white rounded">
                                            BẬT
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Mục Site access */}
                            <div className="pt-2 border-t border-rose-200/80 dark:border-rose-900/40 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] text-slate-700 dark:text-slate-300">
                                    • Quyền truy cập trang web (<b>Allow this extension to read and change all your data...</b>):
                                </span>
                                <span className="px-2 py-0.5 text-[11px] font-bold bg-sky-600 text-white rounded">
                                    Chọn "On all sites"
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── BƯỚC 3 ─── */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                3
                            </span>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                Cài đặt Script Tự Động của Dashboard YCX
                            </h3>
                        </div>
                        <a
                            href={getScriptUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0 no-underline"
                        >
                            <AppIcon name="download" size="sm" />
                            <span>Cài đặt Script ngay</span>
                        </a>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 pl-8 space-y-1">
                        <p>
                            Bấm nút <b className="text-sky-600 dark:text-sky-400">"Cài đặt Script ngay"</b> ở trên. Tiện ích Tampermonkey sẽ mở một tab cài đặt mới.
                        </p>
                        <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <AppIcon name="next" size="sm" className="text-sky-500" />
                            <span>Bạn chỉ cần bấm nút <b className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">"Cài đặt"</b> (hoặc <b className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">"Install"</b>) màu đen/xanh. Sau đó đóng tab đó lại.</span>
                        </p>
                    </div>
                </div>

                {/* ─── BƯỚC 4 ─── */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                4
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
                                    <AppIcon name="refresh" size="sm" spin />
                                    <span>Đang kiểm tra...</span>
                                </>
                            ) : checkSuccess ? (
                                <>
                                    <AppIcon name="check" size="sm" />
                                    <span>Đã kết nối!</span>
                                </>
                            ) : (
                                <>
                                    <AppIcon name="sparkles" size="sm" />
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
                    <AppIcon name="help" size="sm" />
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
