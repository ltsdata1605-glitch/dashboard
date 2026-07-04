import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { XIcon } from '../Icons';

export interface SharedModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOutsideClick?: boolean;
    className?: string;
}

export const SharedModal: React.FC<SharedModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnOutsideClick = true,
    className
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        'sm': 'max-w-md',
        'md': 'max-w-2xl',
        'lg': 'max-w-4xl',
        'xl': 'max-w-6xl',
        'full': 'max-w-[95vw] h-[95vh]'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 dark:bg-slate-900/80 transition-opacity duration-300 animate-in fade-in">
            <div 
                className="absolute inset-0"
                onClick={closeOnOutsideClick ? onClose : undefined}
            />
            
            <div 
                ref={modalRef}
                className={clsx(
                    "relative flex flex-col w-full max-h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300",
                    sizeClasses[size],
                    className
                )}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                        <h2 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
                            {title}
                        </h2>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {!title && (
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors shadow-sm backdrop-blur-md"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
