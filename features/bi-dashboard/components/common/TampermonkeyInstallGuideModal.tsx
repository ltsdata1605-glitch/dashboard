import React from 'react';
import { Modal } from '../../../../components/shared/ui/Modal';
import { TampermonkeyInstallGuideContent } from './TampermonkeyInstallGuideContent';

interface TampermonkeyInstallGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetry?: () => void;
    onUseManual?: () => void;
    isCheckingExternal?: boolean;
}

export const TampermonkeyInstallGuideModal: React.FC<TampermonkeyInstallGuideModalProps> = ({
    isOpen,
    onClose,
    onRetry,
    onUseManual,
    isCheckingExternal = false,
}) => {
    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Hướng dẫn cài đặt Tampermonkey — Chế độ Tự động"
            maxWidth="lg"
        >
            <TampermonkeyInstallGuideContent
                onRetry={onRetry}
                onClose={onClose}
                onUseManual={onUseManual}
                isCheckingExternal={isCheckingExternal}
            />
        </Modal>
    );
};

export default TampermonkeyInstallGuideModal;
