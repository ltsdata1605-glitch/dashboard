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
      maxWidth="sm"
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="button"
            variant="ghost"
            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto sm:text-sm ${
              type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
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
