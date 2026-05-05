import React, { useState, useRef } from 'react';

interface GoogleSheetExportModalProps {
  data: string;
  onClose: () => void;
}

const GoogleSheetExportModal: React.FC<GoogleSheetExportModalProps> = ({ data, onClose }) => {
  const [copyButtonText, setCopyButtonText] = useState('Sao chép vào Clipboard');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    if (textareaRef.current) {
      navigator.clipboard.writeText(textareaRef.current.value).then(() => {
        setCopyButtonText('✅ Đã sao chép!');
        setTimeout(() => setCopyButtonText('Sao chép vào Clipboard'), 2000);
      }).catch(err => {
        console.error('Không thể sao chép:', err);
        setCopyButtonText('Lỗi!');
      });
    }
  };

  const handleOpenSheet = () => {
    window.open('https://sheets.new', '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Xuất Mẫu Lịch Bận Ra Google Sheet</h2>
        
        <div className="p-3 mb-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
            <h4 className="font-bold">Quy ước điền lịch bận:</h4>
            <ul className="list-disc list-inside text-sm mt-1">
                <li>Điền <code className="font-bold bg-yellow-100 px-1 rounded">S</code>: Bận buổi Sáng (sẽ không xếp ca chứa số 1, 2, 3)</li>
                <li>Điền <code className="font-bold bg-yellow-100 px-1 rounded">C</code>: Bận buổi Chiều (sẽ không xếp ca chứa số 4, 5, 6)</li>
                <li>Điền <code className="font-bold bg-yellow-100 px-1 rounded">OFF</code>: Xin nghỉ cả ngày</li>
            </ul>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
            <p>Do giới hạn bảo mật của trình duyệt, ứng dụng không thể tự động tạo file. Vui lòng làm theo các bước sau:</p>
            <ol className="list-decimal list-inside space-y-2 bg-gray-50 p-3 rounded-md border">
                <li>
                    Bấm vào nút <strong className="text-blue-600">"Sao chép vào Clipboard"</strong> bên dưới để sao chép dữ liệu.
                </li>
                <li>
                    Bấm vào nút <strong className="text-green-600">"Mở Google Sheet mới"</strong>. Thao tác này sẽ mở một trang tính trống trong tab mới.
                </li>
                <li>
                    Trong trang tính mới, chọn ô <strong className="font-mono">A1</strong> và dán dữ liệu vào (sử dụng <kbd>Ctrl</kbd>+<kbd>V</kbd> hoặc <kbd>Cmd</kbd>+<kbd>V</kbd>).
                </li>
                <li>
                    Sau khi dán, bấm nút <strong className="text-green-700">"Share"</strong> (Chia sẻ) ở góc trên bên phải, và trong phần "General access", chọn <strong className="font-semibold">"Anyone with the link"</strong> và vai trò là <strong className="font-semibold">"Editor"</strong>.
                </li>
            </ol>
        </div>

        <textarea
          ref={textareaRef}
          readOnly
          value={data}
          className="w-full h-32 my-4 p-2 border rounded-md bg-gray-50 font-mono text-xs"
        />

        <div className="flex justify-end gap-3 mt-auto pt-4 border-t">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition">
            Đóng
          </button>
          <button type="button" onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition min-w-[180px]">
            {copyButtonText}
          </button>
          <button type="button" onClick={handleOpenSheet} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition">
            Mở Google Sheet mới
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetExportModal;