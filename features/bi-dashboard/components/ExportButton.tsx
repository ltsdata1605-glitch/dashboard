import React, { useState } from 'react';
import { CameraIcon, SpinnerIcon } from './Icons';
import { cn } from '../../../components/shared/ui/Button';

interface ExportButtonProps {
  onExportPNG: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExportPNG, disabled = false, className }) => {
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
      onClick={handleExport}
      disabled={disabled || isLoading}
      className={cn(
        "export-button-component p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center",
        className
      )}
      aria-label="Xuất ảnh báo cáo"
      title="Xuất ảnh báo cáo (PNG)"
    >
      {isLoading ? (
        <SpinnerIcon className="h-5 w-5 animate-spin" />
      ) : (
        <CameraIcon className="h-5 w-5" />
      )}
    </button>
  );
};

export default ExportButton;
