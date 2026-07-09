import React from 'react';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, message, title = "Thông báo" }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      maxWidth="sm"
      footer={
        <Button
          type="button"
          variant="ghost"
          className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={onClose}
        >
          Đóng
        </Button>
      }
    >
      <div className="text-center">
        <h3 className="text-lg leading-6 font-medium text-slate-900 mb-2">{title}</h3>
        <div className="mt-2">
          <p className="text-sm text-slate-500 whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default AlertModal;
