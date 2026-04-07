
import React from 'react';

interface FooterProps {
    lastUpdated: string;
    onToggleDebug: () => void;
    onOpenChangelog: () => void;
}

const Footer: React.FC<FooterProps> = ({ lastUpdated, onToggleDebug, onOpenChangelog }) => {
    return (
        <footer className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                <button 
                    onClick={onOpenChangelog} 
                    className="font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors tracking-wide flex items-center gap-2"
                >
                    Phiên bản 3.0.0 
                    <span className="text-[10px] uppercase bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full">
                        Lịch sử cập nhật
                    </span>
                </button>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
                <span className="text-xs font-medium">Bản vá dữ liệu: {lastUpdated}</span>
            </div>
        </footer>
    );
};

export default Footer;
