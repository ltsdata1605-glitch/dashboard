import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';

interface GoogleSheetExportModalProps {
  data: string;
  onClose: () => void;
}

const GoogleSheetExportModal: React.FC<GoogleSheetExportModalProps> = ({ data, onClose }) => {
  const [copyButtonText, setCopyButtonText] = useState('Sao chép vào Clipboard');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (textareaRef.current) {
      navigator.clipboard.writeText(textareaRef.current.value).then(() => {
        setCopyButtonText('✅ Đã sao chép!');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setCopyButtonText('Sao chép vào Clipboard'), 2000);
      }).catch(err => {
        console.warn('Không thể sao chép:', err);
        setCopyButtonText('Lỗi!');
      });
    }
  };

  const handleOpenSheet = () => {
    window.open('https://sheets.new', '_blank');
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Xuất Mẫu Lịch Bận Ra Google Sheet"
      maxWidth="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
          <Button onClick={handleCopy} className="min-w-[180px]">{copyButtonText}</Button>
          <Button variant="secondary" onClick={handleOpenSheet}>Mở Google Sheet mới</Button>
        </div>
      }
    >
      <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-300">
        <h4 className="font-bold">Quy ước điền lịch bận:</h4>
        <ul className="list-disc list-inside text-sm mt-1">
          <li>Điền <code className="font-bold bg-amber-100 dark:bg-amber-900/40 px-1 rounded">S</code>: Bận buổi Sáng (sẽ không xếp ca chứa số 1, 2, 3)</li>
          <li>Điền <code className="font-bold bg-amber-100 dark:bg-amber-900/40 px-1 rounded">C</code>: Bận buổi Chiều (sẽ không xếp ca chứa số 4, 5, 6)</li>
          <li>Điền <code className="font-bold bg-amber-100 dark:bg-amber-900/40 px-1 rounded">OFF</code>: Xin nghỉ cả ngày</li>
        </ul>
      </div>

      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <p>Do giới hạn bảo mật của trình duyệt, ứng dụng không thể tự động tạo file. Vui lòng làm theo các bước sau:</p>
        <ol className="list-decimal list-inside space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md border border-slate-200 dark:border-slate-700">
          <li>
            Bấm vào nút <strong className="text-sky-600 dark:text-sky-400">"Sao chép vào Clipboard"</strong> bên dưới để sao chép dữ liệu.
          </li>
          <li>
            Bấm vào nút <strong className="text-emerald-600 dark:text-emerald-400">"Mở Google Sheet mới"</strong>. Thao tác này sẽ mở một trang tính trống trong tab mới.
          </li>
          <li>
            Trong trang tính mới, chọn ô <strong className="font-mono">A1</strong> và dán dữ liệu vào (sử dụng <kbd>Ctrl</kbd>+<kbd>V</kbd> hoặc <kbd>Cmd</kbd>+<kbd>V</kbd>).
          </li>
          <li>
            Sau khi dán, bấm nút <strong className="text-emerald-700 dark:text-emerald-400">"Share"</strong> (Chia sẻ) ở góc trên bên phải, và trong phần "General access", chọn <strong className="font-semibold">"Anyone with the link"</strong> và vai trò là <strong className="font-semibold">"Editor"</strong>.
          </li>
        </ol>
      </div>

      <textarea
        ref={textareaRef}
        readOnly
        value={data}
        className="w-full h-32 my-4 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs"
      />
    </Modal>
  );
};

export default GoogleSheetExportModal;
