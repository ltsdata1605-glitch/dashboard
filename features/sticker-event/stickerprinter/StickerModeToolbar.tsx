import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Package } from 'lucide-react';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Button } from '../../../components/shared/ui/Button';

interface StickerModeToolbarProps {
    stickerMode: 'sticker' | 'event';
    stickerType: 'gia_soc' | 'gio_vang' | 'draw';
    onSelectGiaSoc: () => void;
    onSelectGioVang: () => void;
    onSelectDraw: () => void;
    onSelectEvent: () => void;
    getActiveFieldLabel: () => string;
    getDrawActiveFieldLabel: () => string;
    getActiveFontSize: () => number;
    getDrawActiveFontSize: () => number;
    onDecreaseFontSize: () => void;
    onIncreaseFontSize: () => void;
}

export const StickerModeToolbar: React.FC<StickerModeToolbarProps> = ({
    stickerMode, stickerType, onSelectGiaSoc, onSelectGioVang, onSelectDraw, onSelectEvent,
    getActiveFieldLabel, getDrawActiveFieldLabel, getActiveFontSize, getDrawActiveFontSize,
    onDecreaseFontSize, onIncreaseFontSize,
}) => {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const portalTarget = document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions');
    if (!mounted || activeTab !== 'tools-print-sticker' || !portalTarget) return null;

    return createPortal(
        <div className="flex items-center gap-0.5 lg:gap-1 bg-white/60 dark:bg-slate-900/60 p-1 lg:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0">
            <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 lg:p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                <Button
                    variant="ghost"
                    onClick={onSelectGiaSoc}
                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                        stickerMode === 'sticker' && stickerType === 'gia_soc'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    <span className="lg:hidden">Giá Sốc</span>
                    <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'gia_soc' && <CheckCircle2 size={14} className="inline mr-1 text-indigo-600 dark:text-indigo-400" />}Giá Sốc</span>
                </Button>
                <Button
                    variant="ghost"
                    onClick={onSelectGioVang}
                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                        stickerMode === 'sticker' && stickerType === 'gio_vang'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    <span className="lg:hidden">Giờ Vàng</span>
                    <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'gio_vang' && <CheckCircle2 size={14} className="inline mr-1 text-amber-600 dark:text-amber-400" />}Giờ Vàng</span>
                </Button>
                <Button
                    variant="ghost"
                    onClick={onSelectDraw}
                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                        stickerMode === 'sticker' && stickerType === 'draw'
                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    <span className="lg:hidden">Rút Thăm</span>
                    <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'draw' && <CheckCircle2 size={14} className="inline mr-1 text-rose-600 dark:text-rose-400" />}Phiếu Rút Thăm</span>
                </Button>
                <Button
                    variant="ghost"
                    onClick={onSelectEvent}
                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                        stickerMode === 'event'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    <span className="lg:hidden">Event</span>
                    <span className="hidden lg:inline">{stickerMode === 'event' && <CheckCircle2 size={14} className="inline mr-1 text-emerald-600 dark:text-emerald-400" />}<Package size={14} className="inline mr-1" />Event - Tồn kho</span>
                </Button>
            </div>

            {stickerMode === 'sticker' && (
                <div className="flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200">
                    <span className="text-[10px] lg:text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400">
                        {stickerType === 'draw' ? `${getDrawActiveFieldLabel()}:` : `${getActiveFieldLabel()}:`}
                    </span>
                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]">
                        <Button
                            variant="ghost"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onDecreaseFontSize}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-full w-auto px-1.5 lg:px-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors"
                            title="Giảm size"
                        >
                            -
                        </Button>
                        <span className="px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-6 lg:w-8 text-center">
                            {stickerType === 'draw' ? getDrawActiveFontSize().toFixed(1) : getActiveFontSize()}
                        </span>
                        <Button
                            variant="ghost"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onIncreaseFontSize}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-full w-auto px-1.5 lg:px-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors"
                            title="Tăng size"
                        >
                            +
                        </Button>
                    </div>
                </div>
            )}
        </div>,
        portalTarget
    );
};
