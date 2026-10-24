import React, { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { Button, cn } from '../shared/ui/Button';
import { getErrorMessage, getErrorCode } from '../../utils/dataUtils';
import {
    isStandaloneMode, isInAppBrowser, isIOSDevice,
    preparePwaHandoff, startPwaHandoffLogin, claimPwaHandoff, hasPendingPwaHandoff, clearPendingPwaHandoff,
    isPwaHandoffClaiming, takePwaHandoffError, PwaHandoffSignInError,
    layTaiKhoanGanNhat, quenTaiKhoan,
    type PreparedPwaHandoff,
} from '../../services/firebase';

const LoginView: React.FC = () => {
    const { loginWithGoogle, setDemoMode, isLoading } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(() =>
        takePwaHandoffError() ? 'Chưa vào được ứng dụng sau khi đăng nhập Google. Vui lòng bấm "Tiếp tục với Google" lại.' : null);

    const [isInAppWebView] = useState(() => isInAppBrowser());
    const [isStandalone] = useState(() => isStandaloneMode());
    const [isIOS] = useState(() => isIOSDevice());
    // Tài khoản đã dùng trên máy này (2026-10-21): Google chọn sẵn, bỏ bước chọn tài khoản.
    const [taiKhoanNho, setTaiKhoanNho] = useState(() => layTaiKhoanGanNhat());

    // Toàn bộ nền tảng (Desktop, Laptop, Mobile, Web, PWA): dùng cơ chế chuyển hướng cùng tab
    // qua auth.dashboard.pro.vn PKCE Handoff, không mở bất kỳ cửa sổ popup nào.
    const useHandoff = true;

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
        // Hỏi máy chủ dày (1,5 s) trong 30 giây đầu, sau đó thưa dần 4 s — mỗi lượt hỏi là 1 lần gọi hàm + 1 giao dịch Firestore,
        // người dùng để màn chờ mở 6 phút từng tốn ~240 lượt (2026-10-21). Quay lại app (focus/visibility) thì hỏi ngay.
        const batDau = Date.now();
        let lanCuoi = 0;
        const tick = async (ngay?: unknown) => {
            if (stopped || busy || document.visibilityState !== 'visible') return;
            if (ngay === 'dinh-ky' && Date.now() - batDau > 30_000 && Date.now() - lanCuoi < 4_000) return;
            lanCuoi = Date.now();
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
                setError(`Chưa vào được ứng dụng (${getErrorCode(goc) || getErrorMessage(goc)}). Vui lòng bấm "Tiếp tục với Google" lại.`);
            } finally {
                busy = false;
            }
        };
        tick();
        const timer = setInterval(() => tick('dinh-ky'), 1500);
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
            <div data-man-cho-khoi-dong className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex items-center justify-center bg-static-blobs">
                <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Màn đăng nhập TỐI GIẢN (2026-10-22, chủ dự án: "giao diện phức tạp khó dùng"): 1 nút chính duy nhất. Bỏ hộp "Màn hình chính
    // (PWA) · Mở Safari", dòng "tối ưu riêng cho iPhone", vạch "HOẶC", đoạn mô tả dài và nút Dùng Thử to ngang nút chính. Đã nhớ tài
    // khoản thì nút ghi luôn email (Google chọn sẵn). Dùng thử lùi xuống 1 dòng chữ ở đáy (tên trợ năng giữ "Kích hoạt Chế độ Dùng
    // Thử" — các bài kiểm vào app bằng tên đó). Đăng nhập chuyển hướng (máy tính) chỉ còn trong hộp lỗi khi popup hỏng.
    return (
        <div data-testid="login-view" className="min-h-dvh bg-white sm:bg-slate-50 flex flex-col items-center justify-center px-6 select-none"
            style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="w-full max-w-[360px] flex-1 sm:flex-none flex flex-col justify-center sm:bg-white sm:border sm:border-slate-200 sm:rounded-overlay sm:shadow-xl sm:p-8">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-[72px] h-[72px] rounded-card bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-lg shadow-sky-500/25 mb-5">
                        <AppIcon name="dashboard" size="state" className="text-white" />
                    </div>
                    {/* GĐ7: cùng tên với biểu tượng Màn hình chính / tab trình duyệt (manifest: "Dashboard YCX"), không IN HOA */}
                    <h1 className="type-large-title font-bold text-slate-900 tracking-tight">Dashboard YCX</h1>
                    <p className="mt-1 type-body text-slate-500">Công cụ phân tích dữ liệu</p>
                </div>

                {/* Trình duyệt tích hợp Zalo/Facebook chặn đăng nhập Google — bắt buộc báo (không có cách nào khác) */}
                {isInAppWebView && (
                    <div className="mb-4 p-3 bg-amber-50 text-amber-900 rounded-popup type-footnote border border-amber-200 leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold mb-1"><AppIcon name="warning" size="sm" /> Mở bằng Safari hoặc Chrome</div>
                        Trình duyệt trong Zalo/Facebook chặn đăng nhập Google. Bấm <strong>(⋮)</strong> ở góc rồi chọn <strong>"Mở bằng trình duyệt"</strong>.
                    </div>
                )}

                {error && (
                    <div role="alert" className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-popup type-footnote font-medium border border-rose-200 leading-relaxed">
                        <div className="flex items-start gap-2">
                            <AppIcon name="warning" size="sm" className="text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex-1 whitespace-pre-line">{error}</div>
                        </div>
                        <div className="mt-2 flex justify-end">
                            <Button
                                type="button"
                                variant="unstyled"
                                size="none"
                                onClick={useHandoff ? handlePwaLogin : handleRedirectLogin}
                                disabled={isLoggingIn}
                                className="ycx-hit font-bold text-sky-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                                <AppIcon name="refresh" size="sm" />
                                {useHandoff ? 'Thử đăng nhập lại' : 'Đăng nhập chuyển hướng'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Đang chờ phiên từ trang Google (2026-10-13): thay hẳn nút — người dùng không phải làm gì thêm. */}
                {waitingHandoff ? (
                    <div data-testid="login-handoff-waiting" className="flex flex-col items-center text-center gap-3">
                        <div className="w-9 h-9 border-[3px] border-sky-600 border-t-transparent rounded-full animate-spin" />
                        <div>
                            <p className="type-headline font-bold text-slate-800">Đang hoàn tất đăng nhập…</p>
                            <p className="mt-1 type-footnote text-slate-500">Đăng nhập Google xong là ứng dụng tự vào.</p>
                        </div>
                        <div className="w-full flex flex-col gap-1 pt-2">
                            <Button variant="secondary" size="lg" icon="refresh" onClick={handlePwaLogin} className="w-full">
                                Mở lại trang đăng nhập Google
                            </Button>
                            <Button variant="ghost" size="md" onClick={handleCancelPwaLogin} className="w-full">
                                Huỷ
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full">
                        <Button
                            data-testid="login-google"
                            variant="unstyled"
                            size="none"
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="ycx-hit w-full max-w-[280px] h-11 px-4 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 rounded-control shadow-xs hover:shadow-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-60 cursor-pointer select-none"
                        >
                            {isLoggingIn ? (
                                <div className="w-4.5 h-4.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            <span className={cn('min-w-0 flex flex-col items-start text-left justify-center', taiKhoanNho && 'flex-1')}>
                                <span className="type-subhead font-semibold text-slate-800 leading-tight">Tiếp tục với Google</span>
                                {taiKhoanNho && (
                                    <span data-testid="login-tai-khoan-nho" className="type-caption text-slate-500 truncate w-full leading-tight mt-0.5">{taiKhoanNho.email}</span>
                                )}
                            </span>
                        </Button>

                        {taiKhoanNho && (
                            <Button
                                type="button"
                                variant="unstyled"
                                size="none"
                                onClick={() => { quenTaiKhoan(); setTaiKhoanNho(null); }}
                                disabled={isLoggingIn}
                                className="ycx-hit self-center mt-3 type-subhead font-semibold text-sky-700 hover:underline cursor-pointer disabled:opacity-50"
                            >
                                Dùng tài khoản khác
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {!waitingHandoff && (
                <Button
                    type="button"
                    variant="unstyled"
                    size="none"
                    aria-label="Kích hoạt Chế độ Dùng Thử"
                    onClick={() => setDemoMode(true)}
                    className="ycx-hit mt-8 type-subhead text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                >
                    Dùng thử không cần đăng nhập
                </Button>
            )}
        </div>
    );
};

export default LoginView;
