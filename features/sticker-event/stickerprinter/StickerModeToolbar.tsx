import React, { useState, useEffect } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Button } from '../../../components/shared/ui/Button';
import { Tabs } from '../../../components/shared/ui/Tabs';

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

    if (!mounted || activeTab !== 'tools-print-sticker') return null;

    // iPhone / iPad (GĐ7, KE_HOACH_GIAO_DIEN_APPLE.md): KHÔNG nhét dải chế độ vào thanh trên nữa (trước: thanh 470px nhét vào
    // khe ~250px, phải vuốt ngang mới thấy "Sticker" và ô cỡ chữ — apple-tuong-thich đỏ ở mọi khung cảm ứng). Nay là HÀNG
    // THỨ HAI ngay dưới thanh trên: segmented 4 chế độ chia đều + hàng cỡ chữ (chỉ ở chế độ tem) với nút −/+ 44px.
    if (isMobile) {
        const activeId = stickerMode === 'event' ? 'event' : stickerType;
        const chon: Record<string, () => void> = { gia_soc: onSelectGiaSoc, gio_vang: onSelectGioVang, draw: onSelectDraw, event: onSelectEvent };
        const oDangChon = (stickerType === 'draw' ? getDrawActiveFieldLabel() : getActiveFieldLabel()).replace(/^Cỡ chữ\s*/, '');
        return (
            <div data-testid="sticker-mode-bar" className="no-print shrink-0 bg-slate-50/95 border-b border-slate-200 px-3 sm:px-4 pt-2 pb-2">
                <div className="space-y-1.5 sm:max-w-lg sm:mx-auto">
                <Tabs
                    variant="segment"
                    size="sm"
                    fullWidth
                    activeId={activeId}
                    onChange={id => chon[id]?.()}
                    items={[
                        { id: 'gia_soc', label: 'Giá sốc' },
                        { id: 'gio_vang', label: 'Giờ vàng' },
                        { id: 'draw', label: 'Phiếu' },
                        { id: 'event', label: 'Sticker' },
                    ]}
                />
                {stickerMode === 'sticker' && (
                    <div className="flex items-center justify-between gap-3 pl-1">
                        {/* Ô đang chọn trên bản xem trước. Nhãn Phiếu đã có sẵn "Cỡ chữ …", nhãn tem thì không → bỏ tiền tố rồi
                            ghép một lần, tránh "Cỡ chữ Cỡ chữ Thông tin trái". */}
                        <span className="type-footnote text-slate-500 truncate min-w-0">
                            Cỡ chữ{oDangChon && <> <span className="font-semibold text-slate-800">{oDangChon}</span></>}
                        </span>
                        <div className="flex items-center shrink-0 rounded-control bg-white border border-slate-200">
                            <Button variant="unstyled" size="none" onMouseDown={e => e.preventDefault()} onClick={onDecreaseFontSize}
                                className="h-9 w-11 flex items-center justify-center text-slate-700 active:bg-slate-100 rounded-l-control"
                                title="Giảm size" aria-label="Giảm cỡ chữ">
                                <AppIcon name="minus" size="md" />
                            </Button>
                            <span className="min-w-10 text-center type-subhead font-semibold tabular-nums text-slate-900 border-x border-slate-200 leading-9">
                                {stickerType === 'draw' ? getDrawActiveFontSize().toFixed(1) : getActiveFontSize()}
                            </span>
                            <Button variant="unstyled" size="none" onMouseDown={e => e.preventDefault()} onClick={onIncreaseFontSize}
                                className="h-9 w-11 flex items-center justify-center text-slate-700 active:bg-slate-100 rounded-r-control"
                                title="Tăng size" aria-label="Tăng cỡ chữ">
                                <AppIcon name="add" size="md" />
                            </Button>
                        </div>
                    </div>
                )}
                </div>
            </div>
        );
    }

    const portalTarget = document.getElementById('global-header-actions');
    if (!portalTarget) return null;

    return createPortal(
        <div className="max-w-[calc(100vw-110px)] min-[540px]:max-w-[calc(100vw-180px)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:max-w-none lg:overflow-visible py-0.5">
        <div className="flex items-center gap-0.5 lg:gap-1 bg-white/70 dark:bg-slate-900/70 p-0.5 lg:p-1 rounded-full w-max lg:w-auto border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xl shadow-xs animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0">
            <div className="flex bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-full border border-slate-200/40 dark:border-slate-700/40 items-center">
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={onSelectGiaSoc}
                    className={`flex items-center justify-center gap-1 h-6 lg:h-7 px-2 lg:px-2.5 rounded-full text-[11px] lg:text-xs whitespace-nowrap transition-all ${
                        stickerMode === 'sticker' && stickerType === 'gia_soc'
                            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium'
                    }`}
                >
                    <span className="lg:hidden">Giá Sốc</span>
                    <span className="hidden lg:inline-flex items-center gap-1">{stickerMode === 'sticker' && stickerType === 'gia_soc' && <AppIcon name="success" size="sm" className="text-sky-600" />}Giá Sốc</span>
                </Button>
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={onSelectGioVang}
                    className={`flex items-center justify-center gap-1 h-6 lg:h-7 px-2 lg:px-2.5 rounded-full text-[11px] lg:text-xs whitespace-nowrap transition-all ${
                        stickerMode === 'sticker' && stickerType === 'gio_vang'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium'
                    }`}
                >
                    <span className="lg:hidden">Giờ Vàng</span>
                    <span className="hidden lg:inline-flex items-center gap-1">{stickerMode === 'sticker' && stickerType === 'gio_vang' && <AppIcon name="success" size="sm" className="text-amber-600" />}Giờ Vàng</span>
                </Button>
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={onSelectDraw}
                    className={`flex items-center justify-center gap-1 h-6 lg:h-7 px-2 lg:px-2.5 rounded-full text-[11px] lg:text-xs whitespace-nowrap transition-all ${
                        stickerMode === 'sticker' && stickerType === 'draw'
                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium'
                    }`}
                >
                    <span className="lg:hidden">Phiếu</span>
                    <span className="hidden lg:inline-flex items-center gap-1">{stickerMode === 'sticker' && stickerType === 'draw' && <AppIcon name="success" size="sm" className="text-rose-600" />}Phiếu</span>
                </Button>
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={onSelectEvent}
                    className={`flex items-center justify-center gap-1 h-6 lg:h-7 px-2 lg:px-2.5 rounded-full text-[11px] lg:text-xs whitespace-nowrap transition-all ${
                        stickerMode === 'event'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium'
                    }`}
                >
                    <span className="lg:hidden">Sticker</span>
                    <span className="hidden lg:inline-flex items-center gap-1">{stickerMode === 'event' && <AppIcon name="success" size="sm" className="text-emerald-600" />}<AppIcon name="product" size="sm" />Sticker</span>
                </Button>
            </div>

            {stickerMode === 'sticker' && (
                <div className="flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200">
                    <span className="text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400 whitespace-nowrap">
                        {stickerType === 'draw' ? `${getDrawActiveFieldLabel()}:` : `${getActiveFieldLabel()}:`}
                    </span>
                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full shadow-xs h-[22px] lg:h-[24px]">
                        <Button
                            variant="unstyled"
                            size="none"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onDecreaseFontSize}
                            className="h-full w-5 lg:w-5.5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black rounded-l-full transition-colors text-xs"
                            title="Giảm size"
                        >
                            -
                        </Button>
                        <span className="px-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 min-w-5 lg:min-w-6 text-center">
                            {stickerType === 'draw' ? getDrawActiveFontSize().toFixed(1) : getActiveFontSize()}
                        </span>
                        <Button
                            variant="unstyled"
                            size="none"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={onIncreaseFontSize}
                            className="h-full w-5 lg:w-5.5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black rounded-r-full transition-colors text-xs"
                            title="Tăng size"
                        >
                            +
                        </Button>
                    </div>
                </div>
            )}
        </div>
        </div>,
        portalTarget
    );
};
