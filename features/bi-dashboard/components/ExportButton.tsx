import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, SpinnerIcon, ChevronDownIcon } from './Icons';
import { Button, cn } from '../../../components/shared/ui/Button';

export interface ExportOptionItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  onSelect: () => Promise<void> | void;
}

interface ExportButtonProps {
  onExportPNG?: () => Promise<void>;
  options?: ExportOptionItem[];
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  ariaLabel?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPNG,
  options,
  disabled = false,
  className,
  icon,
  title = 'Xuất ảnh báo cáo (PNG)',
  ariaLabel = 'Xuất ảnh báo cáo',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = React.useRef(false);

  const hasOptions = Array.isArray(options) && options.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSingleExport = async () => {
    if (disabled || isLoading || isProcessingRef.current || !onExportPNG) return;
    
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

  const handleSelectOption = async (option: ExportOptionItem) => {
    setIsOpen(false);
    if (disabled || isLoading || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsLoading(true);
    
    try {
      await option.onSelect();
    } catch (e) {
      console.error('Lỗi xuất ảnh:', e);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <Button
        variant="unstyled"
        size="none"
        onClick={hasOptions ? () => setIsOpen(p => !p) : handleSingleExport}
        disabled={disabled || isLoading}
        className={cn(
          "export-button-component h-8 min-h-11 sm:min-h-0 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0",
          hasOptions ? "px-2 gap-1.5" : "w-8 p-1.5",
          isOpen && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
          className
        )}
        aria-label={ariaLabel}
        title={hasOptions ? "Tuỳ chọn xuất ảnh" : title}
        aria-expanded={hasOptions ? isOpen : undefined}
      >
        {isLoading ? (
          <SpinnerIcon className="h-4 w-4 animate-spin text-sky-500 shrink-0" />
        ) : (
          <>
            {icon || <CameraIcon className="h-4 w-4 shrink-0" />}
            {hasOptions && (
              <ChevronDownIcon className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200", isOpen && "rotate-180")} />
            )}
          </>
        )}
      </Button>

      {hasOptions && isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 bg-white dark:bg-slate-850 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700/80 p-1.5 z-[200] animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
            Tuỳ chọn xuất ảnh
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
              >
                <div className="mt-0.5 p-1 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 shadow-2xs transition-colors shrink-0">
                  {opt.icon || <CameraIcon className="h-4 w-4 text-slate-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {opt.label}
                  </div>
                  {opt.sublabel && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                      {opt.sublabel}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;

