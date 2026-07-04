import React from 'react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, message, title = "Thông báo" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
        <div className="p-6 text-center">
          <h3 className="text-lg leading-6 font-medium text-slate-900 mb-2">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-slate-500 whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
