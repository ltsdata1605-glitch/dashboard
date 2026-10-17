import React, { useState } from 'react';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';

interface SaveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (listName: string) => void;
  defaultName: string;
}

const SaveListModal: React.FC<SaveListModalProps> = ({ isOpen, onClose, onSave, defaultName }) => {
  const [listName, setListName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listName.trim()) {
      onSave(listName.trim());
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lưu Danh Sách"
      titleColorClass="text-slate-800"
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="save-list-form"
            variant="primary"
          >
            Lưu
          </Button>
        </div>
      }
    >
      <form id="save-list-form" onSubmit={handleSubmit}>
        <label htmlFor="listName" className="block text-sm font-medium text-slate-700 mb-1">
          Tên danh sách
        </label>
        <input
          type="text"
          id="listName"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Nhập tên danh sách..."
          autoFocus
          required
        />
      </form>
    </Modal>
  );
};

export default SaveListModal;
