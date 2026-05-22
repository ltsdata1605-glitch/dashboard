import React, { useState } from 'react';
import { CameraIcon, SpinnerIcon } from './Icons';
import { Button } from '../../components/shared/ui/Button';

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
    <Button
      onClick={handleExport}
      disabled={disabled || isLoading}
      variant="ghost" size="icon"
      className="export-button-component h-6 w-6 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
      aria-label="Xuất ảnh báo cáo"
      title="Xuất ảnh báo cáo (PNG)"
    >
      {isLoading ? (
        <SpinnerIcon className="h-4 w-4" />
      ) : (
        <CameraIcon className="h-4 w-4" />
      )}
    </Button>
  );
};

export default ExportButton;
