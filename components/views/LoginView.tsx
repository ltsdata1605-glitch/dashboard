import React, { useState } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../shared/ui/Button';
import { getErrorMessage, getErrorCode } from '../../utils/dataUtils';
import { isStandaloneMode, isInAppBrowser } from '../../services/firebase';

const LoginView: React.FC = () => {
    const { loginWithGoogle, loginWithGoogleRedirect, setDemoMode, isLoading } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isInAppWebView] = useState(() => isInAppBrowser());
    const [isStandalone] = useState(() => isStandaloneMode());

    const handleLogin = async () => {
        try {
            setError(null);
            setIsLoggingIn(true);

            // Bảo hiểm 10s: Nếu trình duyệt không phản hồi hoặc bị gián đoạn, tự động mở lại nút
            const failsafeTimer = setTimeout(() => {
                setIsLoggingIn(false);
                setError('Quá trình kết nối Google mất nhiều thời gian hơn dự kiến.\nNếu trang chưa tự chuyển, vui lòng bấm "Đăng nhập chuyển hướng" hoặc mở bằng Safari.');
            }, 10000);

            try {
                if (isStandalone || isInAppWebView) {
                    await loginWithGoogleRedirect();
                } else {
                    await loginWithGoogle();
                }
            } finally {
                clearTimeout(failsafeTimer);
            }
        } catch (err: unknown) {
            console.error(err);
            let errMsg = getErrorMessage(err) || 'Có lỗi xảy ra khi đăng nhập';
            const errCode = getErrorCode(err);

            if (errCode === 'auth/unauthorized-domain') {
                const currentDomain = window.location.hostname;
                errMsg = `Tên miền '${currentDomain}' chưa được cấp phép (unauthorized-domain). \n\nCách khắc phục: Anh/Chị vui lòng truy cập Firebase Console -> Authentication -> Settings -> Authorized Domains và thêm tên miền "${currentDomain}" vào danh sách.`;
            } else if (errCode === 'auth/popup-blocked' || errCode === 'auth/popup-timeout') {
                errMsg = 'Cửa sổ đăng nhập Google bị trình duyệt chặn hoặc không phản hồi. Vui lòng bấm vào "Đăng nhập chuyển hướng" bên dưới.';
            } else if (errCode === 'auth/operation-not-supported-in-this-environment') {
                errMsg = 'Môi trường này không hỗ trợ cửa sổ popup. Vui lòng nhấn nút Đăng nhập chuyển hướng bên dưới.';
            } else if (errCode === 'auth/internal-error') {
                errMsg = 'Lỗi kết nối xác thực Google (auth/internal-error).\nThường do trình duyệt chặn cookie bên thứ 3 hoặc tiện ích AdBlock/chặn pop-up can thiệp.\n\nAnh/Chị có thể chọn "Đăng nhập chuyển hướng" (không cần cookie) hoặc nhấn "Vào ngay bằng Chế độ Dùng Thử" bên dưới!';
            } else if (errCode === 'auth/network-request-failed') {
                errMsg = 'Lỗi kết nối xác thực Google (auth/network-request-failed).\nNguyên nhân: Mạng Wifi/4G chập chờn, hoặc trình duyệt chặn cookie/popup xác thực của Google.\n\nCách xử lý nhanh nhất:\n1. Nhấn nút "Đăng nhập chuyển hướng (Không cần cookie)" ngay bên dưới để vào trực tiếp.\n2. Hoặc mở trang bằng trình duyệt Chrome / Safari chính thay vì trình duyệt tích hợp của Zalo/Facebook.';
            } else if (errCode === 'auth/invalid-api-key' || errCode === 'auth/api-key-not-valid') {
                errMsg = 'Mã cấu hình Firebase API Key không hợp lệ. Vui lòng kiểm tra lại services/firebase.ts.';
            }
            
            setError(errMsg);
            setIsLoggingIn(false);
        }
    };

    const handleRedirectLogin = async () => {
        try {
            setError(null);
            setIsLoggingIn(true);
            const failsafeTimer = setTimeout(() => {
                setIsLoggingIn(false);
                setError('Trình duyệt chưa hoàn tất chuyển hướng. Vui lòng thử lại hoặc mở bằng trình duyệt Safari.');
            }, 10000);
            try {
                await loginWithGoogleRedirect();
            } finally {
                clearTimeout(failsafeTimer);
            }
        } catch (err: unknown) {
            console.error(err);
            setError(getErrorMessage(err) || 'Không thể chuyển hướng đăng nhập');
            setIsLoggingIn(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex items-center justify-center bg-static-blobs">
                <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-3 sm:p-4 bg-static-blobs">
            {/* A22 (2026-09-30): thẻ phẳng thay kính mờ + bo 24px + bóng lớn */}
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl animate-fade-in-up">
                <div className="flex justify-center mb-5 sm:mb-7">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center shadow-inner">
                        <AppIcon name="dashboard" size="state" className="text-sky-700 dark:text-sky-400" />
                    </div>
                </div>
                
                <h1 className="text-xl sm:text-2xl font-black text-center text-slate-800 dark:text-white mb-1.5 uppercase tracking-tight">Dashboard Report</h1>
                <p className="text-center text-sky-600 dark:text-sky-400 font-semibold text-xs mb-2">Công cụ phân tích dữ liệu</p>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-5 sm:mb-6 text-xs sm:text-sm">Đăng nhập để đồng bộ dữ liệu và cài đặt giữa các thiết bị một cách an toàn.</p>

                {isStandalone && (
                    <div className="mb-4 p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 rounded-xl text-xs border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-between gap-2 shadow-xs">
                        <span className="flex items-center gap-1.5 font-medium truncate">
                            <AppIcon name="phone" size="sm" className="text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>Màn hình chính (PWA)</span>
                        </span>
                        <a
                            href="https://dashboard.pro.vn"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-sky-700 dark:text-sky-300 underline shrink-0 inline-flex items-center gap-1"
                        >
                            <AppIcon name="web" size="xs" /> Mở Safari &rarr;
                        </a>
                    </div>
                )}

                {isInAppWebView && (
                    <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                            <AppIcon name="warning" size="md" /> Lưu ý Đăng Nhập:
                        </div>
                        <p className="leading-relaxed">
                            Anh/Chị đang truy cập qua trình duyệt của <strong>Zalo/Facebook</strong>. Trình duyệt này chặn cửa sổ đăng nhập Google.
                        </p>
                        <p className="font-semibold text-sky-700 dark:text-sky-400 flex items-start gap-1.5">
                            <AppIcon name="pointer" size="sm" className="mt-0.5 shrink-0" />
                            <span>Vui lòng nhấn vào nút ba dấu chấm (...) ở góc màn hình rồi chọn "Mở bằng trình duyệt" (hoặc "Mở bằng Safari / Chrome") để đăng nhập nhé!</span>
                        </p>
                    </div>
                )}
                
                {error && (
                    <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs sm:text-sm font-medium border border-rose-100 dark:border-rose-800 whitespace-pre-line">
                        {error}
                        <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={handleRedirectLogin}
                                disabled={isLoggingIn}
                                className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                                <AppIcon name="refresh" size="md" />Đăng nhập chuyển hướng (Không cần cookie) &rarr;
                            </button>
                            <button
                                type="button"
                                onClick={() => setDemoMode(true)}
                                className="text-xs font-bold text-sky-700 dark:text-sky-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                                <AppIcon name="quick" size="md" />Vào ngay bằng Chế độ Dùng Thử &rarr;
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="space-y-3.5">
                    <div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:shadow-md focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 font-bold text-slate-700 dark:text-white disabled:opacity-50 cursor-pointer"
                        >
                            {isLoggingIn ? (
                                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            Tiếp tục với Cổng Google
                        </Button>
                        <div className="text-center pt-1.5">
                            <button
                                type="button"
                                onClick={handleRedirectLogin}
                                disabled={isLoggingIn}
                                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                <AppIcon name="refresh" size="xs" />
                                {isStandalone ? 'Đang kích hoạt đăng nhập chuyển hướng' : 'Gặp lỗi xoay? Đăng nhập chuyển hướng &rarr;'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-widest">Hoặc</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={() => setDemoMode(true)}
                        className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl py-2.5 px-4 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/10 transition-all font-medium text-slate-500 dark:text-slate-400 cursor-pointer"
                    >
                        <AppIcon name="glasses" size="lg" />
                        Kích hoạt Chế độ Dùng Thử
                    </Button>
                    <p className="text-[11px] text-center text-slate-400 mt-1 px-2 leading-relaxed">
                        Phiên bản Offline sẽ không lưu được Setting hay File lên Cloud, dữ liệu chỉ xử lý ở local. 
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
