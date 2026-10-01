import React, { useEffect, useRef } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { TampermonkeyInstallGuideContent } from '../../common/TampermonkeyInstallGuideContent';

/**
 * Hướng dẫn 3 bước cài đặt Tampermonkey và script khi người dùng bấm
 * "Tự động" tại Tab Nhân viên > Thưởng nhưng máy chưa cài đặt.
 */
export const AutoBonusInstallGuideModal: React.FC<{
    isNotInstalled: boolean;
    isDetecting: boolean;
    onRetry: () => void;
    onDismiss: () => void;
    onUseManual: () => void;
}> = ({ isNotInstalled, isDetecting, onRetry, onDismiss, onUseManual }) => {
    // Chỉ hiện modal khi đang detecting NẾU đó là lượt "Kiểm tra lại" bấm từ trong chính
    // modal này (tức trước đó đã từng not-installed) — không phải lượt dò đầu tiên lúc
    // bấm nút "Tự động"/"Chạy N tháng" ở ngoài (lượt đó chỉ hiện chữ nhỏ, không mở modal).
    const wasNotInstalledRef = useRef(false);
    useEffect(() => {
        if (isNotInstalled) wasNotInstalledRef.current = true;
        else if (!isDetecting) wasNotInstalledRef.current = false;
    }, [isNotInstalled, isDetecting]);

    const isChecking = isDetecting && wasNotInstalledRef.current;
    const isOpen = isNotInstalled || isChecking;

    if (!isOpen) return null;

    return (
        <Modal
            isOpen
            onClose={onDismiss}
            title="Cài đặt Tampermonkey — Tự động Thưởng"
            maxWidth="lg"
        >
            <TampermonkeyInstallGuideContent
                onRetry={onRetry}
                onClose={onDismiss}
                onUseManual={onUseManual}
                isCheckingExternal={isChecking}
            />
        </Modal>
    );
};

export default AutoBonusInstallGuideModal;
