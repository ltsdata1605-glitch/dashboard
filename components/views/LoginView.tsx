import React, { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../shared/ui/Button';
import { getErrorMessage, getErrorCode } from '../../utils/dataUtils';
import {
    isStandaloneMode, isInAppBrowser, isIOSDevice,
    preparePwaHandoff, startPwaHandoffLogin, claimPwaHandoff, hasPendingPwaHandoff, clearPendingPwaHandoff,
    isPwaHandoffClaiming, takePwaHandoffError, PwaHandoffSignInError,
    type PreparedPwaHandoff,
} from '../../services/firebase';

const LoginView: React.FC = () => {
    const { loginWithGoogle, setDemoMode, isLoading } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(() =>
        takePwaHandoffError() ? 'Chưa vào được ứng dụng sau khi đăng nhập Google. Vui lòng bấm "Tiếp tục với Cổng Google" lại.' : null);

    const [isInAppWebView] = useState(() => isInAppBrowser());
    const [isStandalone] = useState(() => isStandaloneMode());
    const [isIOS] = useState(() => isIOSDevice());

    // Trên toàn bộ thiết bị iOS (iPhone/iPad dù là Safari, Chrome iOS hay PWA Màn hình chính)
    // hoặc In-App Webview (Zalo/FB): dùng cơ chế Handoff an toàn qua auth.dashboard.pro.vn
    // để không bao giờ bị Safari ITP chặn cookie chéo miền ở redirect!
    const useHandoff = isIOS || isStandalone || isInAppWebView;

    const preparedRef = useRef<PreparedPwaHandoff | null>(null);
    // Vừa quay về từ trang đăng nhập (còn mã chờ, hoặc AuthContext đang nhận phiên): hiện màn "Đang hoàn tất",
    // KHÔNG hiện lại form đăng nhập — trước 2026-10-13 form hiện lại vài giây khiến người dùng tưởng bị lỗi.
    const [waitingHandoff, setWaitingHandoff] = useState(() => useHandoff && (hasPendingPwaHandoff() || isPwaHandoffClaiming()));
    useEffect(() => {
        if (!useHandoff) return;
        preparePwaHandoff().then(p => { preparedRef.current = p; }).catch(console.error);
    }, [useHandoff]);
    useEffect(() => {
        if (!waitingHandoff) return;
        let stopped = false;
        let busy = false;
        const tick = async () => {
            if (stopped || busy || document.visibilityState !== 'visible') return;
            if (!hasPendingPwaHandoff() && !isPwaHandoffClaiming()) {
                setWaitingHandoff(false);
                setIsLoggingIn(false);
                return;
            }
            busy = true;
            try {
                // Vào được thì onAuthStateChanged ở AuthContext tự chuyển màn hình.
                if (await claimPwaHandoff(1)) stopped = true;
            } catch (err: unknown) {
                console.error('[Auth] Nhận phiên đăng nhập từ trang Google lỗi:', err);
                takePwaHandoffError();
                clearPendingPwaHandoff();
                setWaitingHandoff(false);
                setIsLoggingIn(false);
                const goc = err instanceof PwaHandoffSignInError ? err.cause : err;
                setError(`Chưa vào được ứng dụng (${getErrorCode(goc) || getErrorMessage(goc)}). Vui lòng bấm "Tiếp tục với Cổng Google" lại.`);
            } finally {
                busy = false;
            }
        };
        tick();
        const timer = setInterval(tick, 1500);
        document.addEventListener('visibilitychange', tick);
        window.addEventListener('focus', tick);
        return () => {
            stopped = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', tick);
            window.removeEventListener('focus', tick);
        };
    }, [waitingHandoff]);

    const handlePwaLogin = async () => {
        let prepared = preparedRef.current;
        if (!prepared) {
            try {
                prepared = await preparePwaHandoff();
                preparedRef.current = prepared;
            } catch {
                setError('Đang chuẩn bị kết nối đăng nhập, vui lòng bấm lại sau giây lát.');
                return;
            }
        }
        setError(null);
        setIsLoggingIn(true);
        startPwaHandoffLogin(prepared);
        setWaitingHandoff(true);
        // Mã đã dùng: chuẩn bị mã mới cho lần bấm sau.
        preparedRef.current = null;
        preparePwaHandoff().then(p => { preparedRef.current = p; }).catch(console.error);
    };

    const handleCancelPwaLogin = () => {
        clearPendingPwaHandoff();
        setWaitingHandoff(false);
        setIsLoggingIn(false);
    };

    const handleLogin = async () => {
        if (useHandoff) {
            handlePwaLogin();
            return;
        }
        try {
            setError(null);
            setIsLoggingIn(true);

            // Bảo hiểm 180s: Cho người dùng thoải mái thời gian chọn tài khoản, nhập mật khẩu và 2FA trên thiết bị mới
            const failsafeTimer = setTimeout(() => {
                setIsLoggingIn(false);
                setError('Quá trình kết nối Google mất nhiều thời gian hơn dự kiến.\nNếu trang chưa tự chuyển, vui lòng thử lại hoặc mở bằng Safari/Chrome.');
            }, 180000);

            try {
                await loginWithGoogle();
            } finally {
                clearTimeout(failsafeTimer);
            }
        } catch (err: unknown) {
            console.error(err);
            const errCode = getErrorCode(err);

            // Người dùng chủ động đóng cửa sổ đăng nhập — reset trạng thái êm dịu, không hiển thị lỗi đỏ
            if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
                setIsLoggingIn(false);
                return;
            }

            let errMsg = getErrorMessage(err) || 'Có lỗi xảy ra khi đăng nhập';

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
        if (useHandoff) {
            handlePwaLogin();
            return;
        }
        try {
            setError(null);
            setIsLoggingIn(true);
            const prepared = await preparePwaHandoff();
            startPwaHandoffLogin(prepared);
            setWaitingHandoff(true);
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
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
            {/* Ambient Lighting Gradients */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-sky-400/10 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Login Card */}
            <div className="relative max-w-sm sm:max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-950/5 dark:shadow-black/60 transition-all">
                {/* Brand Badge & Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-sky-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 ring-4 ring-sky-50 dark:ring-sky-950/40">
                            <AppIcon name="dashboard" size="state" className="text-white" />
                        </div>
                    </div>

                    {/* GĐ7: cùng tên với biểu tượng Màn hình chính / tab trình duyệt (manifest: "Dashboard YCX"), không IN HOA */}
                    <h1 className="type-title font-bold text-slate-900 dark:text-white tracking-tight">
                        Dashboard YCX
                    </h1>
                    
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-[11px] font-semibold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        Công cụ phân tích dữ liệu
                    </div>

                    <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                        Đăng nhập để đồng bộ dữ liệu và cài đặt giữa các thiết bị một cách an toàn.
                    </p>
                </div>

                {/* Standalone PWA Notice */}
                {isStandalone && (
                    <div className="mb-4 p-2.5 bg-sky-50/80 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 rounded-xl text-xs border border-sky-200/70 dark:border-sky-800/60 flex items-center justify-between gap-2 shadow-xs">
                        <span className="flex items-center gap-1.5 font-medium truncate">
                            <AppIcon name="phone" size="sm" className="text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>Màn hình chính (PWA)</span>
                        </span>
                        <a
                            href="https://dashboard.pro.vn"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline shrink-0 inline-flex items-center gap-1"
                        >
                            <AppIcon name="web" size="xs" /> Mở Safari →
                        </a>
                    </div>
                )}

                {/* In-app Browser Notice */}
                {isInAppWebView && (
                    <div className="mb-4 p-3 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-xl text-xs border border-amber-200/80 dark:border-amber-900/50 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                            <AppIcon name="warning" size="md" /> Lưu ý trình duyệt Zalo/Facebook:
                        </div>
                        <p className="leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                            Trình duyệt tích hợp chặn đăng nhập Google. Vui lòng bấm vào <strong>(⋮)</strong> ở góc và chọn <strong>"Mở bằng trình duyệt"</strong> (Safari / Chrome).
                        </p>
                    </div>
                )}
                
                {/* Error Banner */}
                {error && (
                    <div className="mb-5 p-3.5 bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium border border-rose-200/70 dark:border-rose-900/50 leading-relaxed shadow-xs">
                        <div className="flex items-start gap-2">
                            <AppIcon name="warning" size="md" className="text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex-1 whitespace-pre-line">{error}</div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-800/50 flex items-center justify-end">
                            <Button
                                type="button"
                                variant="unstyled"
                                size="none"
                                onClick={useHandoff ? handlePwaLogin : handleRedirectLogin}
                                disabled={isLoggingIn}
                                className="ycx-hit text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <AppIcon name="refresh" size="sm" />
                                {useHandoff ? 'Thử đăng nhập lại →' : 'Đăng nhập chuyển hướng →'}
                            </Button>
                        </div>
                    </div>
                )}
                
                {/* Đang chờ phiên từ trang Google (2026-10-13): thay hẳn form — người dùng không phải làm gì thêm. */}
                {waitingHandoff ? (
                    <div data-testid="login-handoff-waiting" className="flex flex-col items-center text-center gap-3 py-2">
                        <div className="w-9 h-9 border-[3px] border-sky-600 border-t-transparent rounded-full animate-spin" />
                        <div>
                            <p className="text-sm font-bold text-slate-800">Đang hoàn tất đăng nhập…</p>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                Đăng nhập Google xong là ứng dụng tự vào, không cần bấm gì thêm.
                            </p>
                        </div>
                        <div className="w-full flex flex-col gap-2 pt-1">
                            <Button variant="secondary" size="md" icon="refresh" onClick={handlePwaLogin} className="w-full">
                                Mở lại trang đăng nhập Google
                            </Button>
                            <Button variant="ghost" size="md" onClick={handleCancelPwaLogin} className="w-full">
                                Huỷ
                            </Button>
                        </div>
                    </div>
                ) : (
                <div className="space-y-3">
                    {/* Primary Google Login Button */}
                    <div>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="w-full h-12 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 font-bold text-slate-700 dark:text-white disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                        >
                            {isLoggingIn ? (
                                <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            <span>Tiếp tục với Cổng Google</span>
                        </Button>

                        {useHandoff ? (
                            <div className="text-center pt-2 text-[11px] text-slate-500 leading-relaxed">
                                Đăng nhập Google an toàn được tối ưu riêng cho iPhone & iPad.
                            </div>
                        ) : (
                        <div className="text-center pt-2">
                            <Button
                                type="button"
                                variant="unstyled"
                                size="none"
                                onClick={handleRedirectLogin}
                                disabled={isLoggingIn}
                                className="ycx-hit text-[11px] font-medium text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                            >
                                <AppIcon name="refresh" size="xs" />
                                {isStandalone ? 'Đang kích hoạt đăng nhập chuyển hướng' : 'Gặp lỗi xoay? Đăng nhập chuyển hướng →'}
                            </Button>
                        </div>
                        )}
                    </div>
                    
                    {/* Clean Minimal Divider */}
                    <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800" />
                        <span className="flex-shrink-0 mx-3 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                            Hoặc
                        </span>
                        <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800" />
                    </div>
                    
                    {/* Secondary Trial Mode Button */}
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={() => setDemoMode(true)}
                        className="w-full h-11 flex items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-xl transition-all font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-[0.99]"
                    >
                        <AppIcon name="glasses" size="md" className="text-slate-500 dark:text-slate-400" />
                        <span>Kích hoạt Chế độ Dùng Thử</span>
                    </Button>

                    {/* Muted Offline Note */}
                    <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 px-2 pt-1 leading-relaxed">
                        Chế độ Dùng Thử lưu trữ dữ liệu tại máy này và không yêu cầu đăng nhập.
                    </p>
                </div>
                )}
            </div>
        </div>
    );
};

export default LoginView;
