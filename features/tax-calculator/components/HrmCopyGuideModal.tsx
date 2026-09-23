import React from 'react';
import { ClipboardPaste, ExternalLink, Keyboard, MousePointerClick } from 'lucide-react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';

const HRM_DAY5_URL = 'https://newinsite.thegioididong.com/hrm/chi-tiet-luong-dmx';
const HRM_DAY20_URL = 'https://newinsite.thegioididong.com/hrm/xem-chi-tiet-thuong';

interface HrmCopyGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const Step: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => (
    <li className="flex gap-2.5">
        <span className="w-5 h-5 shrink-0 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
            {index}
        </span>
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{children}</div>
    </li>
);

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">
        {children}
    </kbd>
);

/** Hướng dẫn copy dữ liệu 2 đợt lương/thưởng từ HRM rồi dán vào app */
export const HrmCopyGuideModal: React.FC<HrmCopyGuideModalProps> = ({ isOpen, onClose }) => (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cách lấy dữ liệu từ HRM"
        subTitle="Copy cả trang rồi dán — không cần chụp ảnh"
        maxWidth="lg"
        footer={
            <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={onClose}>
                    Đã hiểu
                </Button>
            </div>
        }
    >
        <div className="space-y-3.5">
            {/* Đợt 1 */}
            <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-sky-800 dark:text-sky-300">1. Lương ngày 5</h4>
                    <a
                        href={HRM_DAY5_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                        Mở trang Chi tiết lương
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <ol className="space-y-2">
                    <Step index={1}>
                        Mở HRM › <strong>Chi tiết lương</strong>, chọn đúng <strong>tháng</strong> rồi bấm{' '}
                        <strong>Tìm</strong>.
                    </Step>
                    <Step index={2}>
                        Bấm <Kbd>Ctrl</Kbd> + <Kbd>A</Kbd> để chọn cả trang, rồi <Kbd>Ctrl</Kbd> + <Kbd>C</Kbd> để
                        copy. <span className="text-slate-500">(Máy Mac: <Kbd>⌘</Kbd> + <Kbd>A</Kbd> / <Kbd>⌘</Kbd> + <Kbd>C</Kbd>)</span>
                    </Step>
                    <Step index={3}>
                        Quay lại đây, bấm nút <strong>Dán dữ liệu</strong> ở ô <strong>1. Lương ngày 5</strong> — app
                        tự đọc và điền.
                    </Step>
                </ol>
            </div>

            {/* Đợt 2 */}
            <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300">2. Thưởng ngày 20</h4>
                    <a
                        href={HRM_DAY20_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        aria-label="Mở trang Xem chi tiết thưởng"
                    >
                        Mở trang Xem chi tiết thưởng
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <ol className="space-y-2">
                    <Step index={1}>
                        Mở HRM › <strong>Xem chi tiết thưởng</strong>, chọn đúng <strong>tháng</strong>.
                    </Step>
                    <Step index={2}>
                        Bấm mũi tên <MousePointerClick className="w-3 h-3 inline text-indigo-500" /> ở{' '}
                        <strong>Thưởng nóng</strong> và <strong>Thưởng chính</strong> để <strong>mở rộng</strong> danh
                        sách — có mở ra thì app mới lấy được từng khoản thưởng.
                    </Step>
                    <Step index={3}>
                        <Kbd>Ctrl</Kbd> + <Kbd>A</Kbd> rồi <Kbd>Ctrl</Kbd> + <Kbd>C</Kbd>, quay lại bấm{' '}
                        <strong>Dán dữ liệu</strong> ở ô <strong>2. Thưởng ngày 20</strong>.
                    </Step>
                </ol>
            </div>

            {/* Lưu ý */}
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 space-y-1.5">
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    Lưu ý
                </h4>
                <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1 list-disc pl-4 leading-relaxed">
                    <li>
                        Lần đầu bấm <strong>Dán dữ liệu</strong>, trình duyệt sẽ hỏi quyền đọc bộ nhớ tạm — chọn{' '}
                        <strong>Cho phép</strong>. Nếu trình duyệt chặn, app sẽ hiện ô để bạn tự bấm{' '}
                        <Kbd>Ctrl</Kbd> + <Kbd>V</Kbd>.
                    </li>
                    <li>
                        Khối <strong>Tổng tiền giảm trừ</strong> đang thu gọn cũng không sao — app tự suy ra số người
                        phụ thuộc từ tổng giảm trừ.
                    </li>
                    <li>
                        Dán nhầm ô (thưởng vào ô lương) app sẽ báo ngay và <strong>giữ nguyên</strong> dữ liệu cũ.
                    </li>
                    <li className="flex items-start gap-1">
                        <ClipboardPaste className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
                        <span>
                            Chỉ có ảnh chụp? Dùng <strong>“hoặc tải ảnh (AI)”</strong> — chậm hơn và phụ thuộc hạn mức
                            AI.
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    </Modal>
);
