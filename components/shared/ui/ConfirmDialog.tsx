import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Icon } from '../../common/Icon';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  singleButton?: boolean;
  zIndex?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  isLoading = false,
  singleButton = false,
  zIndex
}: ConfirmDialogProps) {

  const variants = {
    danger: {
      icon: <Icon name="trash-2" size={6} className="text-rose-500" />,
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      button: 'danger' as const
    },
    warning: {
      icon: <Icon name="alert-circle" size={6} className="text-amber-500" />,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      button: 'primary' as const
    },
    info: {
      icon: <Icon name="info" size={6} className="text-sky-500" />,
      bg: 'bg-sky-100 dark:bg-sky-900/30',
      button: 'primary' as const
    },
    success: {
      icon: <Icon name="check-circle-2" size={6} className="text-emerald-500" />,
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      button: 'primary' as const
    }
  };

  const selected = variants[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      zIndex={zIndex}
    >
      <div className="flex flex-col items-center text-center p-6 pb-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${selected.bg}`}>
          {selected.icon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
          {title}
        </h3>
        <div className="text-sm text-slate-500 dark:text-slate-400 mb-6 whitespace-pre-line text-left w-full px-2">
          {message}
        </div>
        
        <div className="flex gap-3 w-full mt-2">
          {!singleButton && (
            <Button 
              variant="secondary" 
              className="flex-1" 
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          )}
          <Button 
            variant={selected.button} 
            className="flex-1" 
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
