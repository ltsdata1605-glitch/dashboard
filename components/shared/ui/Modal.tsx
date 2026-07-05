import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from './utils';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Dòng phụ nhỏ hiển thị phía trên title trong header (tương đương subTitle của ModalWrapper cũ). */
  subTitle?: React.ReactNode;
  /** Override màu chữ của title, vd. "text-rose-600 dark:text-rose-400". Mặc định dùng màu slate chuẩn. */
  titleColorClass?: string;
  /** Nội dung tùy chỉnh (nút phụ...) hiển thị cạnh nút đóng trong header. */
  controls?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  hideCloseButton?: boolean;
  /** Ẩn hẳn thanh header chuẩn — dùng khi component con tự dựng header riêng trong children. */
  hideHeader?: boolean;
  /** Bỏ bo góc — dùng cho modal cần tràn viền/edge-to-edge. */
  noRounded?: boolean;
  /** 'bottom' = dán đáy màn hình trên mobile (bottom-sheet), căn giữa trên desktop. Mặc định 'center'. */
  position?: 'center' | 'bottom';
  zIndex?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subTitle,
  titleColorClass = 'text-slate-800 dark:text-slate-100',
  controls,
  children,
  footer,
  maxWidth = 'md',
  hideCloseButton = false,
  hideHeader = false,
  noRounded = false,
  position = 'center',
  zIndex = 'z-50'
}: ModalProps) {
  // Prevent body scroll when modal is open
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

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scale theo DESIGN.md (sm/md/lg/xl chuẩn hóa theo boltz_project_rules_md) —
  // 2xl/4xl/full là size mở rộng riêng của dự án cho các modal nhiều nội dung
  // (bảng dữ liệu lớn...), DESIGN.md gốc không định nghĩa nên giữ nguyên như cũ.
  const maxWidthClasses = {
    'sm': 'max-w-[420px]',
    'md': 'max-w-[560px]',
    'lg': 'max-w-[720px]',
    'xl': 'max-w-[960px]',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    'full': 'max-w-[95vw]'
  };

  const isBottom = position === 'bottom';
  const showHeader = !hideHeader && !!(title || subTitle);
  const roundedClass = noRounded ? '' : (isBottom ? 'rounded-t-2xl sm:rounded-2xl' : 'rounded-2xl');
  const roundedFooterClass = noRounded ? '' : (isBottom ? 'sm:rounded-b-2xl' : 'rounded-b-2xl');

  // Portal ra document.body — tránh modal bị kẹt/lệch vị trí nếu component cha có
  // overflow-hidden hoặc transform (tạo stacking context riêng), đây là cách chuẩn
  // để render modal mà ModalWrapper (hệ cũ) đã làm nhưng Modal chưa có trước đây.
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={cn(
          "fixed inset-0 flex justify-center",
          isBottom ? "items-end sm:items-center p-0 sm:p-6" : "items-center p-4 sm:p-6",
          zIndex
        )}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', bounce: 0.25 }}
            className={cn(
              "relative w-full bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden",
              roundedClass,
              maxWidthClasses[maxWidth]
            )}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Header */}
            {showHeader && (
              <div className="flex-none px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                <div>
                  {subTitle && (
                    <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{subTitle}</p>
                  )}
                  {title && (
                    <h3 className={cn("font-bold text-lg tracking-tight", titleColorClass)}>
                      {title}
                    </h3>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {controls}
                  {!hideCloseButton && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onClose}
                      className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-sky-500/50"
                    >
                      <X size={18} />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={cn("flex-none px-5 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50", roundedFooterClass)}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
