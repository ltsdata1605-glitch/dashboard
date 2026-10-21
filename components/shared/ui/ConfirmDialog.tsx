import React from 'react';
import { Modal } from './Modal';
import { Button, type ButtonVariant } from './Button';
import { AppIcon } from './icon/AppIcon';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

/** Lựa chọn thứ ba của hộp xác nhận — xem `ConfirmDialogProps.extraAction`. */
export interface ConfirmExtraAction {
  text: string;
  onClick: () => void;
  /** Mặc định `secondary`. Việc xoá nhẹ hơn nút chính: `destructive` (đỏ nhạt) — nút đỏ ĐẶC chỉ dành cho nút chính. */
  variant?: Extract<ButtonVariant, 'secondary' | 'tinted' | 'destructive'>;
}

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
  /**
   * Lựa chọn THỨ BA (GĐ10 2026-10-15) — khi người dùng phải chọn giữa 2 việc, vd "Chỉ xoá Realtime" / "Xoá toàn bộ" (thay cho 2 hộp
   * `window.confirm` nối nhau mà "Huỷ" ở hộp đầu lại dẫn sang câu hỏi xoá nhiều hơn). Có `extraAction` thì các nút XẾP DỌC kiểu hộp
   * thoại iOS nhiều lựa chọn: lựa chọn phụ (nhẹ hơn) ở trên, nút chính (`confirmText`, màu theo `variant`) ở giữa, Huỷ dưới cùng —
   * nút phá huỷ mạnh nhất không nằm ở chỗ bấm theo thói quen đầu tiên.
   */
  extraAction?: ConfirmExtraAction;
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
  zIndex,
  extraAction
}: ConfirmDialogProps) {

  const variants = {
    danger: {
      icon: <AppIcon name="delete" size="xl" className="text-rose-500" />,
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      button: 'danger' as const
    },
    warning: {
      icon: <AppIcon name="warning" size="xl" className="text-amber-500" />,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      button: 'primary' as const
    },
    info: {
      icon: <AppIcon name="info" size="xl" className="text-sky-500" />,
      bg: 'bg-sky-100 dark:bg-sky-900/30',
      button: 'primary' as const
    },
    success: {
      icon: <AppIcon name="success" size="xl" className="text-emerald-500" />,
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
      ariaLabel={title}
    >
      <div className="flex flex-col items-center text-center p-6 pb-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${selected.bg}`}>
          {selected.icon}
        </div>
        <h3 className="text-[17px] font-bold text-slate-800 dark:text-slate-100 mb-2 leading-7">
          {title}
        </h3>
        <div className="text-sm text-slate-500 dark:text-slate-400 mb-6 whitespace-pre-line text-left w-full px-2">
          {message}
        </div>
        
        {extraAction ? (
          <div className="flex flex-col gap-2 w-full mt-2">
            <Button
              variant={extraAction.variant ?? 'secondary'}
              className="w-full"
              onClick={extraAction.onClick}
              disabled={isLoading}
            >
              {extraAction.text}
            </Button>
            <Button
              variant={selected.button}
              className="w-full"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmText}
            </Button>
            {!singleButton && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </Modal>
  );
}
