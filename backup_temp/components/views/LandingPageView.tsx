
import React from 'react';
import UploadSection from '../upload/UploadSection';
import { Icon } from '../common/Icon';

interface LandingPageViewProps {
    onProcessFile: (files: File[]) => void;
    configUrl: string;
    onConfigUrlChange: (url: string) => void;
    isDeduplicationEnabled?: boolean;
    onDeduplicationChange?: (enabled: boolean) => void;
}

const LandingPageView: React.FC<LandingPageViewProps> = ({ onProcessFile, configUrl, onConfigUrlChange, isDeduplicationEnabled, onDeduplicationChange }) => {
    return (
        <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden font-sans bg-[#F8FAFC] dark:bg-[#0B0F19] selection:bg-indigo-500/20 selection:text-indigo-600">
            
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

            {/* Animated Glow Orbs - Stripe / Apple Style */}
            <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-500/30 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-60 animate-blob pointer-events-none"></div>
            <div className="absolute top-[10%] right-[20%] w-[500px] h-[500px] bg-purple-500/30 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-60 animate-blob [animation-delay:2s] pointer-events-none"></div>
            <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/30 dark:bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-60 animate-blob [animation-delay:4s] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-[1000px] px-6 flex flex-col items-center text-center mt-8">
                
                {/* Badge */}
                <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200/50 dark:border-indigo-500/20 bg-white/80 dark:bg-indigo-500/10 backdrop-blur-xl shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-800 dark:text-indigo-300">Dashboard Phiên Bản 3.0</span>
                    </div>
                </div>

                {/* Hero Typography */}
                <div className="mb-14 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.05] mb-6 drop-shadow-sm">
                        Dữ liệu phức tạp.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-fuchsia-400 dark:to-cyan-400">Phân tích siêu tốc.</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed tracking-tight">
                        Chuyển đổi tức thì hàng chục ngàn dòng Excel thành báo cáo quản trị toàn diện. <br className="hidden sm:block"/> 
                        Bảo mật tuyệt đối, xử lý cục bộ ngay trên Cloud Edge của bạn.
                    </p>
                </div>

                {/* Main Action Area - Glass Card */}
                <div className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="relative group">
                        {/* Glow effect behind */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-blue-500/40 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                        
                        <div className="relative bg-white/70 dark:bg-[#111827]/70 backdrop-blur-3xl rounded-[30px] p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white dark:ring-white/10">
                            <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl rounded-[24px] overflow-hidden border border-slate-100 dark:border-white/5">
                                <UploadSection 
                                    onProcessFile={onProcessFile}
                                    configUrl={configUrl}
                                    onConfigUrlChange={onConfigUrlChange}
                                    isDeduplicationEnabled={isDeduplicationEnabled}
                                    onDeduplicationChange={onDeduplicationChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Trust Indicators */}
                <div className="mt-16 grid grid-cols-3 gap-8 text-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <div className="space-y-1">
                        <div className="flex justify-center text-slate-400 mb-2"><Icon name="shield-check" size={5} /></div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Local Processing</p>
                        <p className="text-[10px] text-slate-500">Dữ liệu không rời khỏi máy</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-center text-slate-400 mb-2"><Icon name="zap" size={5} /></div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Instant Speed</p>
                        <p className="text-[10px] text-slate-500">Xử lý hàng vạn dòng/giây</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-center text-slate-400 mb-2"><Icon name="sparkles" size={5} /></div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Smart UI</p>
                        <p className="text-[10px] text-slate-500">Giao diện thông minh</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingPageView;
