import React, { useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../common/Icon';

interface ModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    subTitle?: string;
    titleColorClass?: string;
    controls?: React.ReactNode;
    maxWidthClass?: string;
    position?: 'center' | 'bottom';
    hideCloseButton?: boolean;
    hideHeader?: boolean;
    noRounded?: boolean;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
    isOpen,
    onClose,
    children,
    title,
    subTitle,
    titleColorClass = 'text-slate-800 dark:text-white',
    controls,
    maxWidthClass = 'max-w-6xl',
    position = 'center',
    hideCloseButton = false,
    hideHeader = false,
    noRounded = false
}) => {
    const modalContentRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleOverlayMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) onClose();
    }, [onClose]);
    
    if (!isOpen) return null;

    const isBottom = position === 'bottom';

    return ReactDOM.createPortal(
        <div 
            ref={overlayRef}
            className={`modal-overlay fixed inset-0 bg-slate-900/60 z-[99999] p-1.5 sm:p-4 transition-opacity duration-300 opacity-100 flex ${isBottom ? 'items-end sm:items-center justify-center sm:p-0' : 'items-center justify-center'}`}
            onMouseDown={handleOverlayMouseDown}
        >
            <div
                ref={modalContentRef}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title || 'Modal'}
                className={`modal-content relative bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 w-full ${maxWidthClass} flex flex-col transition-all duration-300 ${isBottom ? `mb-2 sm:mb-0 transform animate-in slide-in-from-bottom-8 sm:zoom-in-95 ${noRounded ? '' : 'rounded-md'}` : `max-h-[90vh] opacity-100 scale-100 ${noRounded ? 'rounded-none' : 'rounded-md'}`}`}
            >
                {!hideHeader && (
                    <div className={`flex justify-between items-center p-3 sm:p-4 bg-white dark:bg-slate-900 flex-shrink-0 z-10 relative ${noRounded ? '' : 'rounded-t-md'}`}>
                        <div>
                            {subTitle && <p className="text-[10px] sm:text-xs font-normal text-slate-500 dark:text-slate-400">{subTitle}</p>}
                            {title && <h3 className={`text-sm sm:text-lg font-semibold tracking-tight ${titleColorClass}`}>{title}</h3>}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-3">
                            {controls}
                            {!hideCloseButton && (
                                <button onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-1.5 sm:p-2 transition-all">
                                   <Icon name="x" size={4} className="sm:hidden" />
                                   <Icon name="x" size={5} className="hidden sm:block" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="overflow-y-auto w-full max-h-[85vh] sm:max-h-[90vh] overflow-x-hidden p-0 relative z-10 custom-scrollbar flex flex-col flex-1">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ModalWrapper;
