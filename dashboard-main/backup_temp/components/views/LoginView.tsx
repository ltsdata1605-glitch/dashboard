import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../common/Icon';

const LoginView: React.FC = () => {
    const { loginWithGoogle, setDemoMode, isLoading } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        try {
            setError(null);
            setIsLoggingIn(true);
            await loginWithGoogle();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Có lỗi xảy ra khi đăng nhập');
        } finally {
            setIsLoggingIn(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Icon name="layout-dashboard" className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
                
                <h1 className="text-2xl font-black text-center text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Phân Tích Yêu Cầu Xuất</h1>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm">Đăng nhập để sử dụng nền tảng đồng bộ đám mây và kết nối dữ liệu Google Drive an toàn tuyệt đối.</p>
                
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
                        {error}
                        <div className="mt-2 text-xs opacity-80">(Anh/Chị cần chắc chắn đã cấu hình mã Firebase đúng trong thư mục services/firebase.ts nhé!)</div>
                    </div>
                )}
                
                <div className="space-y-4">
                    <button 
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 font-bold text-slate-700 dark:text-white disabled:opacity-50"
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
                    </button>
                    
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-widest">Hoặc</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    
                    <button 
                        onClick={() => setDemoMode(true)}
                        className="w-full flex items-center justify-center gap-2 bg-transparent border border-dashed border-slate-300 dark:border-slate-600 rounded-xl py-3 px-4 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-500 dark:text-slate-400"
                    >
                        <Icon name="glasses" size={5} />
                        Kích hoạt Chế độ Dùng Thử
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2 px-2 leading-relaxed">
                        Phiên bản Offline sẽ không lưu được Setting hay File lên Cloud, dữ liệu chỉ xử lý ở local. 
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
