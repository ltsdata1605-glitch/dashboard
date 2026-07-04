import React from 'react';
import ModalWrapper from '../../modals/ModalWrapper';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

/**
 * Thin wrapper around ModalWrapper for shared/ui API compatibility.
 * Provides a simpler API with `footer` prop support.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
}) => {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidthClass={maxWidthClass}
    >
      <div className="px-4 py-3">
        {children}
      </div>
      {footer && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          {footer}
        </div>
      )}
    </ModalWrapper>
  );
};
