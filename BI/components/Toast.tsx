
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircleIcon, AlertTriangleIcon, XIcon } from './Icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5 text-emerald-500" />,
    error: <AlertTriangleIcon className="h-5 w-5 text-rose-500" />,
    warning: <AlertTriangleIcon className="h-5 w-5 text-amber-500" />,
    info: <CheckCircleIcon className="h-5 w-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
    error: 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
    warning: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
    info: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] w-full max-w-xs px-4"
        >
          <div className={`flex items-center gap-3 p-4 rounded-2xl border shadow-2xl ${bgColors[type]} backdrop-blur-md`}>
            <div className="shrink-0">{icons[type]}</div>
            <p className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
              <XIcon className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
