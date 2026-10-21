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
      ariaLabel={title}
      maxWidth="sm"
      footer={
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={onClose}
        >
          Đóng
        </Button>
      }
    >
      <div className="text-center">
        <h3 className="text-[17px] leading-6 font-medium text-slate-900 mb-2">{title}</h3>
        <div className="mt-2">
          <p className="text-sm text-slate-500 whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default AlertModal;
