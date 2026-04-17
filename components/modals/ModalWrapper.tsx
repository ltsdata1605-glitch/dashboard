import React, { useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../common/Icon';

interface ModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    subTitle: string;
    titleColorClass: string;
    controls?: React.ReactNode;
    maxWidthClass?: string;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
    isOpen,
    onClose,
    children,
    title,
    subTitle,
    titleColorClass,
    controls,
    maxWidthClass = 'max-w-6xl'
}) => {
    const modalContentRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Use onMouseDown on the overlay to prevent keyboard-induced dismissal on mobile.
    // When the virtual keyboard opens/closes, the viewport resizes and can cause
    // spurious click events. By checking the event target explicitly, we ensure
    // only intentional backdrop taps close the modal.
    const handleOverlayMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    }, [onClose]);
    
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div 
            ref={overlayRef}
            className="modal-overlay fixed inset-0 bg-slate-800/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-opacity duration-300 opacity-100"
            onMouseDown={handleOverlayMouseDown}
        >
            <div
                ref={modalContentRef}
                onClick={(e) => e.stopPropagation()}
                className={`modal-content opacity-100 scale-100 bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] w-full ${maxWidthClass} max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 transition-transform duration-300`}
            >
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-2xl flex-shrink-0">
                    <div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{subTitle}</p>
                        <h3 className={`text-lg sm:text-2xl font-bold ${titleColorClass}`}>{title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        {controls}
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                           <Icon name="x" size={6} />
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ModalWrapper;
