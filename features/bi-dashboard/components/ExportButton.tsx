import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { renderIcon, type IconProp } from '../../../components/shared/ui/icon/renderIcon';
import { Button, cn } from '../../../components/shared/ui/Button';
import { AreaAutoExportButton } from '../../../components/shared/export/AreaAutoExportButton';

export interface ExportOptionItem {
  id: string;
  label: string;
  sublabel?: string;
  /** Tên chức năng (iconRegistry) hoặc node tự dựng (cũ). */
  icon?: IconProp;
  onSelect: () => Promise<void> | void;
}

interface ExportButtonProps {
  onExportPNG?: () => Promise<void>;
  options?: ExportOptionItem[];
  disabled?: boolean;
  className?: string;
  icon?: IconProp;
  title?: string;
  ariaLabel?: string;
  /** Cấu hình tự xuất Bot LINE */
  autoExportAreaId?: string;
  autoExportAreaName?: string;
  onTestAutoExport?: () => Promise<Blob | null>;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPNG,
  options,
  disabled = false,
  className,
  icon,
  title = 'Xuất ảnh báo cáo (PNG)',
  ariaLabel = 'Xuất ảnh báo cáo',
  autoExportAreaId,
  autoExportAreaName,
  onTestAutoExport,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const isProcessingRef = React.useRef(false);

  const hasOptions = Array.isArray(options) && options.length > 0;

  const updateCoords = useCallback(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const right = Math.max(8, window.innerWidth - rect.right);
      const spaceBelow = window.innerHeight - rect.bottom;
      // Nếu phía dưới còn ít hơn 180px và phía trên rộng hơn thì mở ngược lên trên
      const openUpwards = spaceBelow < 180 && rect.top > 180;
      const top = openUpwards ? Math.max(8, rect.top - 165) : rect.bottom + 6;
      setCoords({ top, right });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updateCoords]);

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
    <div className="relative inline-flex items-center gap-1">
      <div className="relative inline-flex items-center" ref={dropdownRef}>
        <Button
          variant="unstyled"
          size="none"
          onClick={hasOptions ? () => setIsOpen(p => !p) : handleSingleExport}
          disabled={disabled || isLoading}
          className={cn(
            "export-button-component preserve-rounded ycx-hit w-8 h-8 lg:w-9 lg:h-9 rounded-lg border border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 active:scale-[0.94] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0",
            hasOptions ? "px-2 gap-1.5 w-auto" : "",
            isOpen && "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 shadow-2xs font-semibold",
            className
          )}
          aria-label={ariaLabel}
          title={hasOptions ? "Tuỳ chọn xuất ảnh" : title}
          aria-expanded={hasOptions ? isOpen : undefined}
        >
          {isLoading ? (
            <AppIcon name="loading" spin size="md" className="text-sky-500" />
          ) : (
            <>
              {icon ? renderIcon(icon, 'md') : <AppIcon name="exportImage" size="md" />}
              {hasOptions && (
                <AppIcon name="chevronDown" size="sm" className={cn("opacity-70 transition-transform duration-200", isOpen && "rotate-180")} />
              )}
            </>
          )}
        </Button>

        {hasOptions && isOpen && typeof document !== 'undefined' && createPortal(
          <div 
            ref={menuRef}
            style={coords ? {
              position: 'fixed',
              top: coords.top,
              right: coords.right,
              zIndex: 999999
            } : undefined}
            className="w-64 sm:w-72 bg-white dark:bg-slate-850 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-1.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
              Tuỳ chọn xuất ảnh
            </div>
            <div className="space-y-0.5">
              {options.map((opt) => (
                <Button
                  variant="unstyled"
                  size="none"
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
                >
                  <div className="mt-0.5 p-1 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 shadow-2xs transition-colors shrink-0">
                    {opt.icon ? renderIcon(opt.icon, 'md') : <AppIcon name="exportImage" size="md" className="text-slate-500" />}
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
                </Button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Nút Cấu hình tự xuất Bot LINE */}
      {autoExportAreaId && (
        <AreaAutoExportButton
          areaId={autoExportAreaId}
          areaName={autoExportAreaName}
          onTestExport={onTestAutoExport}
        />
      )}
    </div>
  );
};

export default ExportButton;

