
import React from 'react';
import type { Status } from '../../types';
import { Icon } from './Icon';

interface ProcessingLoaderProps {
    status: Status;
    processingTime: number; // Thời gian tính bằng ms
}

const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({ status, processingTime }) => {
    // Chuyển đổi ms sang giây với 1 chữ số thập phân
    const seconds = (processingTime / 1000).toFixed(1);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
            {/* Elegant darker backdrop with high blur for focus */}
            <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-xl transition-all duration-500"></div>

            {/* Premium Glassmorphism Card */}
            <div className="relative w-full max-w-[400px] bg-white/90 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-3xl p-8 flex flex-col items-center overflow-hidden">
                
                {/* Subtle top glare/gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60"></div>
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[40px] pointer-events-none"></div>

                {/* Modern Loader Icon */}
                <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                    {/* Rotating outer ring */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-slate-800"></div>
                    <div className="absolute inset-0 rounded-full border-[3px] border-indigo-600 dark:border-indigo-400 border-t-transparent border-r-transparent animate-spin" style={{ animationDuration: '1.2s' }}></div>
                    
                    {/* Inner glowing icon block */}
                    <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 w-12 h-12 rounded-xl shadow-lg shadow-indigo-500/40 flex items-center justify-center text-white transform rotate-3">
                        <Icon name="cpu" size={5.5} className="animate-pulse" />
                    </div>
                </div>

                {/* Badge & Status Text */}
                <div className="flex flex-col items-center mb-8 w-full text-center relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 mb-3 shadow-inner">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                            AI Engine Processing
                        </span>
                    </div>
                    <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white leading-snug px-2">
                        {status.message || "Đang tổng hợp dữ liệu báo cáo..."}
                    </h3>
                </div>

                {/* Progress & Time Section */}
                <div className="w-full space-y-3 relative z-10">
                    <div className="flex items-end justify-between px-1">
                        <div className="flex items-baseline mb-0.5">
                            <span className="text-3xl font-mono tabular-nums font-light tracking-tight text-indigo-600 dark:text-indigo-400 leading-none">
                                {seconds}
                            </span>
                            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 ml-1 leading-none uppercase tracking-widest">
                                s
                            </span>
                        </div>
                        <div className="flex items-baseline mb-0.5">
                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">
                                {Math.round(status.progress)}
                            </span>
                            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 leading-none">
                                %
                            </span>
                        </div>
                    </div>

                    {/* Minimalist Premium Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner relative">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                            style={{ 
                                width: `${status.progress > 0 ? status.progress : 5}%`,
                                backgroundSize: '200% 100%',
                                animation: 'gradientMove 2s linear infinite'
                            }}
                        >
                            {/* Little glowing head */}
                            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-r from-transparent to-white/60 blur-[1px]"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Keyframes for gradient move */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes gradientMove {
                    0% { background-position: 100% 0; }
                    100% { background-position: -100% 0; }
                }
            `}} />
        </div>
    );
};

export default ProcessingLoader;
