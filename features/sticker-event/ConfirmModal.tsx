import React from 'react';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  message, 
  title = "Xác nhận", 
  confirmText = "Đồng ý", 
  cancelText = "Hủy",
  type = 'info'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      ariaLabel={title}
      maxWidth="sm"
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="button"
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {cancelText}
          </Button>
        </div>
      }
    >
      <h3 className="text-lg leading-6 font-medium text-slate-900 mb-2">{title}</h3>
      <div className="mt-2">
        <p className="text-sm text-slate-500 whitespace-pre-wrap">{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
