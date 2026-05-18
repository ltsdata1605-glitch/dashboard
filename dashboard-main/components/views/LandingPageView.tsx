
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
        <div className="relative min-h-[calc(100vh-120px)] flex flex-col justify-center items-center overflow-hidden font-sans bg-[#F8FAFC] dark:bg-[#0B0F19] selection:bg-indigo-500/20 selection:text-indigo-600">
            
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

            {/* Animated Glow Orbs - Stripe / Apple Style */}
            <div className="absolute top-[10%] left-[20%] w-[250px] h-[250px] bg-indigo-500/30 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-blob pointer-events-none"></div>
            <div className="absolute top-[10%] right-[20%] w-[250px] h-[250px] bg-purple-500/30 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-blob [animation-delay:2s] pointer-events-none"></div>
            <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-blue-500/30 dark:bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-blob [animation-delay:4s] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-[900px] px-6 flex flex-col items-center text-center">
                
                {/* Hero Typography */}
                <div className="mb-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                    <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-3 drop-shadow-sm">
                        Dữ liệu phức tạp.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-fuchsia-400 dark:to-cyan-400">Phân tích siêu tốc.</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed tracking-tight">
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
                <div className="mt-5 flex items-center justify-center gap-6 text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="shield-check" size={3.5} />
                        <span className="text-[10px] font-semibold text-slate-500">Local Processing</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="zap" size={3.5} />
                        <span className="text-[10px] font-semibold text-slate-500">Instant Speed</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="sparkles" size={3.5} />
                        <span className="text-[10px] font-semibold text-slate-500">Smart UI</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingPageView;
