import React, { useState } from 'react';
import { CameraIcon, SpinnerIcon } from './Icons';

interface ExportButtonProps {
  onExportPNG: () => Promise<void>;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExportPNG, disabled = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const isProcessingRef = React.useRef(false);

  const handleExport = async () => {
    if (disabled || isLoading || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsLoading(true);
    
    try {
      await onExportPNG();
    } catch (e) {
      console.error('Lỗi xuất ảnh:', e);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || isLoading}
      className="export-button-component p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Xuất ảnh báo cáo"
      title="Xuất ảnh báo cáo (PNG)"
    >
      {isLoading ? (
        <SpinnerIcon className="h-4 w-4" />
      ) : (
        <CameraIcon className="h-4 w-4" />
      )}
    </button>
  );
};

export default ExportButton;
