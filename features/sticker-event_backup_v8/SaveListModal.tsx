import React, { useState } from 'react';

interface SaveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (listName: string) => void;
  defaultName: string;
}

const SaveListModal: React.FC<SaveListModalProps> = ({ isOpen, onClose, onSave, defaultName }) => {
  const [listName, setListName] = useState(defaultName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listName.trim()) {
      onSave(listName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Lưu Danh Sách</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="listName" className="block text-sm font-medium text-slate-700 mb-1">
                Tên danh sách
              </label>
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập tên danh sách..."
                autoFocus
                required
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SaveListModal;
