import React, { useEffect, useState } from 'react';
import { AppIcon } from '../shared/ui/icon';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { isRunningStandalone, readDismissedAt, shouldShowInstallHint, writeDismissedAt } from './installHint';

/** Hiện chậm vài giây: để người dùng thấy app trước, không chắn ngay màn đầu. */
const SHOW_DELAY_MS = 4000;

/**
 * Nhắc cài app lên màn hình chính — CHỈ Safari trên iPhone, khi chưa cài, không phải màn In Sticker/Phân Ca.
 * "Để sau" → 14 ngày mới nhắc lại. iOS không có API cài app (beforeinstallprompt chỉ có ở Android/Chrome) nên chỉ hướng dẫn được.
 *
 * 2026-10-10 (KE_HOACH_GIAO_DIEN_APPLE.md lỗi #10): bản cũ là thẻ to (~140px) NỔI ở đáy, đè lên nội dung ngay trên thanh tab
 * — che cả nút "Xuất hàng loạt" (test xuat-hang-loat-dien-thoai… đỏ vì bị chặn bấm). Nay là dải mảnh NẰM TRONG trang ở đầu
 * nội dung, kiểu Smart App Banner của Safari: không che gì; hướng dẫn chi tiết mở trong sheet khi bấm "Xem cách".
 */
const InstallAppHint: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
    const [visible, setVisible] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);

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
        setGuideOpen(false);
        setVisible(false);
    };

    return (
        <>
            <div
                role="region"
                aria-label="Cài Dashboard YCX lên màn hình chính"
                data-testid="install-app-hint"
                className="lg:hidden mx-3 mt-2 mb-1 flex items-center gap-3 rounded-card bg-white border border-slate-200 shadow-sm pl-2.5 pr-1 py-1.5"
            >
                <img src="/icons/apple-touch-icon-120.png" alt="" className="w-9 h-9 rounded-control shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-slate-900 leading-5 truncate">Cài như ứng dụng</p>
                    <p className="text-[13px] text-slate-500 leading-[18px] truncate">Mở toàn màn hình, nhanh hơn</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setGuideOpen(true)} className="shrink-0 rounded-full">
                    Xem cách
                </Button>
                <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Để sau" title="Để sau — nhắc lại sau 14 ngày" className="shrink-0 text-slate-400 min-h-11 min-w-11">
                    <AppIcon name="close" size="md" />
                </Button>
            </div>

            <Modal
                isOpen={guideOpen}
                onClose={() => setGuideOpen(false)}
                position="bottom"
                maxWidth="sm"
                title="Cài lên màn hình chính"
                footer={
                    <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={dismiss}>Để sau</Button>
                        <Button className="flex-1" onClick={() => setGuideOpen(false)}>Đã hiểu</Button>
                    </div>
                }
            >
                <ol className="space-y-3">
                    {[
                        { icon: 'iosShare' as const, text: <>Bấm nút <b>Chia sẻ</b> ở thanh dưới của Safari.</> },
                        { icon: 'iosAddToHome' as const, text: <>Chọn <b>Thêm vào MH chính</b>.</> },
                        { icon: 'check' as const, text: <>Bấm <b>Thêm</b> — từ nay mở Dashboard từ biểu tượng như một ứng dụng.</> },
                    ].map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                                <AppIcon name={b.icon} size="md" />
                            </span>
                            <span className="text-[15px] leading-6 text-slate-700">{b.text}</span>
                        </li>
                    ))}
                </ol>
            </Modal>
        </>
    );
};

export default InstallAppHint;
