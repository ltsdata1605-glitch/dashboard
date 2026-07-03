import React, { useState, useEffect } from 'react';

/**
 * A sleek, minimal overlay that appears over the dashboard content
 * when filter state changes trigger a re-calculation.
 * Uses a glassmorphism backdrop with a pulsing indicator.
 */
const FilterProcessingOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    const [show, setShow] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            // Double-rAF to guarantee the DOM has painted the element before adding fade-in class
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setFadeIn(true));
            });
        } else {
            setFadeIn(false);
            const timer = setTimeout(() => setShow(false), 200); // match transition duration
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    if (!show) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-200 ${
                fadeIn ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ pointerEvents: 'auto' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/70 backdrop-blur-sm" />

            {/* Indicator */}
            <div className="relative flex flex-col items-center gap-3 px-6 py-5 bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-xl shadow-indigo-200/20 dark:shadow-black/30 border border-slate-200/60 dark:border-slate-700/50">
                {/* Spinner */}
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-500 dark:border-t-indigo-400 animate-spin" />
                    <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/30 dark:to-slate-800 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                        </svg>
                    </div>
                </div>

                {/* Text */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide uppercase">
                        Đang xử lý bộ lọc
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Vui lòng đợi trong giây lát...
                    </span>
                </div>

                {/* Animated dots */}
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"
                            style={{
                                animation: `filterPulse 1s ease-in-out ${i * 0.15}s infinite`,
                            }}
                        />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes filterPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
};

export default React.memo(FilterProcessingOverlay);
