import React, { useEffect, useRef } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';

const TAMPERMONKEY_STORE_URL = 'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo';
const SCRIPT_PATH = '/scripts/mwg-auto-thu-thap-diem-thuong.user.js';

function getScriptUrl(): string {
    return `${window.location.origin}${SCRIPT_PATH}`;
}

const StepRow: React.FC<{ index: number; title: string; description?: React.ReactNode; action: React.ReactNode }> = ({ index, title, description, action }) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
        <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            {index}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
        </div>
        <div className="flex-shrink-0">{action}</div>
    </div>
);

/**
 * Thay cho thông báo "chưa cài" đơn giản trước đây — hướng dẫn 3 bước cài userscript
 * lần đầu, mỗi bước có nút hành động riêng. Bước 3 gọi onRetry (do parent nối vào đúng
 * flow đang chờ — chạy 1 job đơn hoặc chạy nhiều tháng); nếu dò thấy script, isNotInstalled
 * tắt nên modal tự đóng và tiếp tục chạy luôn, không cần bấm lại "Tự động"/"Chạy N tháng".
 * Nhận isNotInstalled/isChecking dạng boolean thuần (không phải 1 hook cụ thể) để dùng
 * chung được cho cả useBonusAutoBridge (job đơn) lẫn useMultiMonthBonusRun (chạy Năm).
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
            title="Cài đặt lần đầu — Chế độ Tự động"
            maxWidth="md"
            footer={
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onDismiss} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Đóng</Button>
                    <Button variant="ghost" onClick={() => { onDismiss(); onUseManual(); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-[2] py-2 bg-rose-600 dark:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-rose-700 dark:hover:bg-rose-800 active:scale-95 transition-all">Dùng Thủ công trong lúc chờ</Button>
                </div>
            }
        >
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Chế độ Tự động cần 1 tiện ích trình duyệt (userscript) để nối Dashboard với trang HRM. Làm theo 3 bước dưới đây, chỉ cần làm 1 lần.
            </p>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                <StepRow
                    index={1}
                    title="Cài Tampermonkey & Bật Chế độ nhà phát triển"
                    description={
                        <div className="space-y-2 mt-1">
                            <p className="text-slate-500 dark:text-slate-400">Tiện ích quản lý userscript cho Chrome.</p>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                                <span className="font-extrabold uppercase text-[10px] tracking-wider bg-amber-200 dark:bg-amber-900/50 px-1.5 py-0.5 rounded mr-1">⚠️ BẮT BUỘC</span>
                                Để extension hoạt động trên Chrome, bạn cần kích hoạt <span className="font-bold underline">Developer Mode</span> theo các bước sau:
                                <ol className="list-decimal list-inside mt-2 space-y-1 ml-1 text-slate-700 dark:text-slate-300">
                                    <li>Mở một tab mới và truy cập địa chỉ: <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded font-mono text-[11px] text-amber-900 dark:text-amber-200">chrome://extensions</code></li>
                                    <li>Tìm công tắc <span className="font-bold">"Developer mode" (Chế độ dành cho nhà phát triển)</span> ở góc trên bên phải màn hình.</li>
                                    <li>Gạt công tắc sang trạng thái <span className="font-bold text-emerald-600 dark:text-emerald-400">BẬT (Màu xanh)</span> để kích hoạt.</li>
                                </ol>
                            </div>
                        </div>
                    }
                    action={
                        <Button variant="ghost" onClick={() => window.open(TAMPERMONKEY_STORE_URL, '_blank')} className="bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 border-0 rounded-lg h-auto w-auto px-3 py-1.5 text-inherit text-[11px] font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap mt-1">
                            Mở Chrome Web Store
                        </Button>
                    }
                />
                <StepRow
                    index={2}
                    title="Cài script"
                    description="Tampermonkey sẽ tự nhận diện file .user.js và hiện màn hình cài đặt — chỉ cần bấm Install."
                    action={
                        <Button variant="ghost" onClick={() => window.open(getScriptUrl(), '_blank')} className="bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 border-0 rounded-lg h-auto w-auto px-3 py-1.5 text-inherit text-[11px] font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                            Mở file cài đặt
                        </Button>
                    }
                />
                <StepRow
                    index={3}
                    title="Kiểm tra"
                    description={isChecking ? 'Đang kiểm tra...' : (isNotInstalled ? 'Chưa phát hiện được — cài xong bước 1-2 rồi bấm lại nút này.' : undefined)}
                    action={
                        <Button
                            variant="ghost"
                            disabled={isChecking}
                            onClick={onRetry}
                            className="bg-sky-600 dark:bg-sky-700 hover:bg-sky-700 dark:hover:bg-sky-800 disabled:opacity-60 border-0 rounded-lg h-auto w-auto px-3 py-1.5 text-white text-[11px] font-bold whitespace-nowrap"
                        >
                            {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
                        </Button>
                    }
                />
            </div>
        </Modal>
    );
};

export default AutoBonusInstallGuideModal;
