import React from 'react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
        <div className="p-6">
          <h3 className="text-lg leading-6 font-medium text-slate-900 mb-2">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-slate-500 whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-2">
          <button
            type="button"
            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto sm:text-sm ${
              type === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
