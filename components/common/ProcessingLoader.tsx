import React from 'react';
import type { Status } from '../../types';
import { Icon } from './Icon';

interface ProcessingLoaderProps {
    status: Status;
    processingTime: number; // Thời gian tính bằng ms
}

/**
 * Hàm làm sạch thông báo status, loại bỏ tên file dài hoặc chuỗi hash ngẫu nhiên
 */
function cleanStatusMessage(rawMessage?: string): string {
    if (!rawMessage || !rawMessage.trim()) {
        return "Đang tổng hợp dữ liệu báo cáo...";
    }

    let cleaned = rawMessage;

    // Loại bỏ tên file có đuôi .xlsx, .xls, .csv kèm các ký tự ngẫu nhiên phía trước
    cleaned = cleaned.replace(/[\w\d_\-]+\.(xlsx|xls|csv)/gi, '');

    // Loại bỏ chuỗi hash/guid ngẫu nhiên dài >= 12 ký tự (hex/alphanumeric)
    cleaned = cleaned.replace(/[a-f0-9]{12,}[a-f0-9_\-]*/gi, '');

    // Làm sạch các vạch nối hoặc dấu hai chấm thừa sau khi xóa tên file
    cleaned = cleaned
        .replace(/:\s*-\s*/g, ': ')
        .replace(/-\s*-\s*/g, '- ')
        .replace(/:\s*$/g, '')
        .replace(/\s\s+/g, ' ')
        .trim();

    // Nếu sau khi lọc mà chuỗi bị rỗng hoặc chỉ còn số thứ tự tệp (ví dụ "Tệp 1/1:")
    if (!cleaned || /^Tệp\s+\d+\/\d+:\s*$/i.test(cleaned)) {
        return "Đang phân tích & xử lý dữ liệu...";
    }

    return cleaned;
}

const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({ status, processingTime }) => {
    // Chuyển đổi ms sang giây với 1 chữ số thập phân
    const seconds = (processingTime / 1000).toFixed(1);
    const progressPercent = Math.min(Math.max(Math.round(status.progress || 0), 0), 100);
    const displayMessage = cleanStatusMessage(status.message);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
            {/* Light/Dark translucent backdrop with deep blur */}
            <div className="absolute inset-0 bg-slate-900/30 dark:bg-slate-950/70 backdrop-blur-xl transition-all duration-500"></div>

            {/* Soft Ambient Backlight Orbs */}
            <div className="absolute -top-28 -left-28 w-60 h-60 bg-blue-400/20 dark:bg-indigo-600/30 rounded-full blur-[60px] pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-28 -right-28 w-60 h-60 bg-cyan-400/20 dark:bg-cyan-500/30 rounded-full blur-[60px] pointer-events-none animate-pulse"></div>

            {/* Ultra-Modern White Glassmorphism Modal Card */}
            <div className="relative w-full max-w-[340px] sm:max-w-[420px] bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white backdrop-blur-3xl border border-white/80 dark:border-slate-800 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1),0_10px_25px_-5px_rgba(59,130,246,0.12)] rounded-3xl p-6 sm:p-8 flex flex-col items-center overflow-hidden transition-all duration-300">
                
                {/* Top Glowing Blue Gradient Line */}
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80"></div>
                
                {/* Center Orbital AI Core Spinner */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-5 sm:mb-6 flex items-center justify-center">
                    {/* Outer Track Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-slate-100 dark:border-slate-800"></div>
                    
                    {/* Outer Rotating Blue Arc */}
                    <div 
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 border-r-indigo-500 dark:border-t-blue-400 dark:border-r-indigo-400 animate-spin"
                        style={{ animationDuration: '1.4s' }}
                    ></div>
                    
                    {/* Inner Counter-Rotating Cyan Arc */}
                    <div 
                        className="absolute inset-2 rounded-full border border-transparent border-b-cyan-500 border-l-sky-400 animate-spin"
                        style={{ animationDuration: '2s', animationDirection: 'reverse' }}
                    ></div>

                    {/* Glowing Core Capsule */}
                    <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center text-white ring-4 ring-blue-50 dark:ring-slate-800 transform rotate-3">
                        <Icon name="cpu" size={5} className="animate-pulse hidden sm:block" />
                        <Icon name="cpu" size={4} className="animate-pulse sm:hidden" />
                    </div>
                </div>

                {/* Badge & Clean Status Message */}
                <div className="flex flex-col items-center mb-6 w-full text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/50 mb-3 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                            AI Engine Processing
                        </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug px-2 min-h-[48px] flex items-center justify-center">
                        {displayMessage}
                    </h3>
                </div>

                {/* Metrics Stats & Progress Bar */}
                <div className="w-full space-y-3 relative z-10">
                    {/* Metrics Bar */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
                            <Icon name="clock" size={3.5} className="text-blue-600 dark:text-blue-400" />
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm sm:text-base font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                    {seconds}s
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                    Thời gian
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-sm sm:text-base font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                    {progressPercent}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-500">%</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                Tiến độ
                            </span>
                        </div>
                    </div>

                    {/* Shimmer Glowing Progress Bar */}
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/50 shadow-inner relative">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-300 ease-out relative"
                            style={{ 
                                width: `${Math.max(progressPercent, 5)}%`,
                            }}
                        >
                            {/* Animated Light Sweep Head */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/80 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9)]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcessingLoader;
