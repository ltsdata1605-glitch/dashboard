import React, { useEffect, useState } from 'react';
import { AppIcon } from '../shared/ui/icon';
import { Button } from '../shared/ui/Button';
import { isRunningStandalone, readDismissedAt, shouldShowInstallHint, writeDismissedAt } from './installHint';

/** Hiện chậm vài giây: để người dùng thấy app trước, không chắn ngay màn đầu. */
const SHOW_DELAY_MS = 4000;

/**
 * Thẻ nhắc cài app lên màn hình chính — CHỈ Safari trên iPhone, khi chưa cài, không phải màn
 * In Sticker/Phân Ca (2 màn đó có thanh công cụ riêng ở đáy). "Để sau" → 14 ngày mới nhắc lại.
 * iOS không có API cài app (beforeinstallprompt chỉ có ở Android/Chrome) nên chỉ hướng dẫn được.
 */
const InstallAppHint: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const ok = shouldShowInstallHint({
            ua: navigator.userAgent,
            isStandalone: isRunningStandalone(),
            dismissedAt: readDismissedAt(),
            now: Date.now(),
        });
        if (!ok) return;
        const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        return () => clearTimeout(t);
    }, []);

    if (!visible || hidden) return null;

    const dismiss = () => {
        writeDismissedAt(Date.now());
        setVisible(false);
    };

    return (
        <div
            role="dialog"
            aria-label="Cài Dashboard YCX lên màn hình chính"
            data-testid="install-app-hint"
            className="mobile-chrome lg:hidden fixed left-2 right-2 z-[185] bg-white border border-slate-200 rounded-md shadow-lg p-3 pr-1"
            style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
            <div className="flex items-start gap-3">
                <img src="/icons/apple-touch-icon-120.png" alt="" className="w-10 h-10 rounded-md shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-slate-800 leading-snug">Cài Dashboard YCX như app</p>
                    <p className="text-[13px] text-slate-600 leading-snug mt-1">
                        Bấm <AppIcon name="iosShare" size="sm" label="Chia sẻ" className="-mt-0.5 text-sky-600" /> ở thanh Safari,
                        rồi chọn <AppIcon name="iosAddToHome" size="sm" className="-mt-0.5 text-slate-700" /> <b>Thêm vào MH chính</b>.
                    </p>
                    <p className="text-[12px] text-slate-500 leading-snug mt-1">Mở toàn màn hình, không còn thanh địa chỉ. Bấm × để nhắc lại sau 14 ngày.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Để sau" className="shrink-0 text-slate-400">
                    <AppIcon name="close" size="md" />
                </Button>
            </div>
        </div>
    );
};

export default InstallAppHint;
