import React, { useState } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Modal } from '../../../components/shared/ui/Modal';

import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';

interface LineBotOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    webhookUrl: string;
}

export const LineBotOnboardingModal: React.FC<LineBotOnboardingModalProps> = ({
    isOpen,
    onClose,
    webhookUrl
}) => {
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopiedUrl(true);
        toast.success('Đã sao chép Webhook URL!');
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const steps = [
        {
            step: 1,
            title: 'Tạo Provider & Channel trên LINE Developers',
            icon: 'web' as const,
            desc: 'Truy cập LINE Developers Console để khởi tạo Channel cho Bot của bạn.',
            content: (
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>1. Mở trang quản trị của LINE dành cho lập trình viên:</p>
                    <a
                        href="https://developers.line.biz/console/"
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-11 sm:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                        <span>Mở LINE Developers Console</span>
                        <AppIcon name="externalLink" size="md" />
                    </a>
                    <p>2. Đăng nhập bằng tài khoản LINE cá nhân hoặc LINE Business.</p>
                    <p>3. Chọn <strong>Create a new provider</strong> ➔ Đặt tên (Ví dụ: <em>QL_Kho910</em> hoặc Tên của bạn).</p>
                    <p>4. Tại mục Channels, chọn <strong>Create a Messaging API channel</strong>.</p>
                    <p>5. Điền thông tin Bot: Tên hiển thị (ví dụ: <em>Bot PMH Tây Nam Bộ</em>), Ảnh đại diện, Email liên hệ ➔ Bấm <strong>Create</strong>.</p>
                </div>
            )
        },
        {
            step: 2,
            title: 'Lấy Channel Access Token (Dài hạn)',
            icon: 'apiKey' as const,
            desc: 'Tạo mã Token để Dashboard kết nối và điều khiển Bot gửi tin nhắn.',
            content: (
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>1. Trong Channel vừa tạo, chuyển sang tab <strong>Messaging API</strong>.</p>
                    <p>2. Kéo xuống dưới cùng đến mục <strong>Channel access token (long-lived)</strong>.</p>
                    <p>3. Bấm nút <strong>Issue</strong> để hệ thống LINE sinh ra mã Token dài hạn.</p>
                    <p>4. Bấm nút <strong>Copy</strong> đoạn mã Token này (dài khoảng 170 ký tự).</p>
                    <p>5. Dán mã này vào ô <strong>Channel Access Token</strong> trong tab Cấu hình trên Dashboard.</p>
                </div>
            )
        },
        {
            step: 3,
            title: 'Lấy Channel Secret (Bảo mật)',
            icon: 'sparkles' as const,
            desc: 'Lấy mã bí mật của Channel để xác thực các yêu cầu gửi đến Bot.',
            content: (
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>1. Chuyển sang tab <strong>Basic settings</strong> trên LINE Developers Console.</p>
                    <p>2. Kéo xuống mục <strong>Channel secret</strong>.</p>
                    <p>3. Copy chuỗi ký tự bí mật (khoảng 32 ký tự).</p>
                    <p>4. Dán chuỗi này vào ô <strong>Channel Secret</strong> trong tab Cấu hình.</p>
                </div>
            )
        },
        {
            step: 4,
            title: 'Cấu hình Webhook URL cá nhân hoá',
            icon: 'bot' as const,
            desc: 'Dán đường dẫn Webhook do hệ thống cấp riêng cho tài khoản của bạn.',
            content: (
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>Đường dẫn Webhook URL riêng biệt của bạn là:</p>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs break-all">
                        <span className="flex-1 text-sky-600 dark:text-sky-400 font-medium">{webhookUrl || 'Đang tạo URL...'}</span>
                        <Button
                            variant="ghost"
                            onClick={handleCopyWebhook}
                            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-xs rounded-md shadow-sm hover:bg-slate-50 shrink-0"
                        >
                            {copiedUrl ? <AppIcon name="check" size="sm" className="text-emerald-600" /> : <AppIcon name="copy" size="sm" />}
                            <span className="ml-1">{copiedUrl ? 'Đã copy' : 'Copy'}</span>
                        </Button>
                    </div>
                    <p>1. Quay lại tab <strong>Messaging API</strong> trên LINE Developers.</p>
                    <p>2. Tại mục <strong>Webhook URL</strong>, bấm nút <strong>Edit</strong> và dán đường link trên vào.</p>
                    <p>3. Gạt công tắc <strong>Use webhook</strong> sang <strong>ON</strong>.</p>
                    <p>4. Bấm nút <strong>Verify</strong> ➔ Nhận thông báo <strong>Success</strong> màu xanh lá là hoàn tất!</p>
                </div>
            )
        },
        {
            step: 5,
            title: 'Thêm bạn & Mời Bot vào nhóm chat',
            icon: 'success' as const,
            desc: 'Hoàn tất và bắt đầu sử dụng Bot để phát mã PMH và nhận thông báo.',
            content: (
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>1. Trong tab <strong>Messaging API</strong>, dùng ứng dụng LINE trên điện thoại quét mã QR của Bot để <strong>Thêm bạn (Add Friend)</strong>.</p>
                    <p>2. Mời Bot vào nhóm chat Zalo/LINE nội bộ nơi nhân viên gửi form xin mã PMH.</p>
                    <p>3. Tại mục <strong>LINE Official Account features</strong> trên Console:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-slate-500 dark:text-slate-400">
                        <li><strong>Auto-reply messages</strong>: Chọn <em>Disabled</em> (để Bot tự xử lý qua mã nguồn).</li>
                        <li><strong>Greeting messages</strong>: Chọn <em>Disabled</em>.</li>
                    </ul>
                    <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"><AppIcon name="sparkles" size="sm" />Chúc mừng! Bot của bạn đã sẵn sàng hoạt động 24/7!</p>
                </div>
            )
        }
    ];

    const currentData = steps[currentStep - 1];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="lg"
            ariaLabel="Hướng dẫn tạo và cấu hình BOT LINE"
            subTitle={<>Bước {currentStep} / {steps.length}: {currentData.title}</>}
            title={
                <span className="flex items-center gap-2">
                    <AppIcon name="bot" size="md" className="text-emerald-600" />
                    <span>Hướng dẫn tự tạo &amp; Cấu hình BOT LINE</span>
                </span>
            }
            footer={
                <div className="flex items-center justify-between">

                    <Button
                        variant="ghost"
                        onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                        disabled={currentStep === 1}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-30"
                    >
                        <AppIcon name="chevronLeft" size="md" />
                        <span>Bước trước</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                        {steps.map(s => (
                            <button
                                key={s.step}
                                onClick={() => setCurrentStep(s.step)}
                                className={`relative after:absolute after:-inset-[17px] after:content-[''] w-2.5 h-2.5 rounded-full transition-all ${
                                    s.step === currentStep ? 'bg-emerald-500 w-6' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>

                    {currentStep < steps.length ? (
                        <Button
                            variant="primary"
                            onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
                            className="flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg"
                        >
                            <span>Tiếp theo</span>
                            <AppIcon name="chevronRight" size="md" />
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={onClose}
                            className="flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                        >
                            <span>Đã hiểu & Bắt đầu</span>
                            <AppIcon name="check" size="md" />
                        </Button>
                    )}
                </div>
            }
        >
                {/* Progress Bar */}
                <div className="-mx-3 sm:-mx-5 -mt-3 sm:-mt-5 mb-4 bg-slate-100 h-1.5 flex">
                    {steps.map(s => (
                        <div
                            key={s.step}
                            className={`h-full flex-1 transition-all duration-300 ${
                                s.step <= currentStep ? 'bg-emerald-500' : 'bg-transparent'
                            }`}
                        />
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <div className="p-2 bg-emerald-500 text-white rounded-lg">
                            <AppIcon name={currentData.icon} size="lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{currentData.title}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{currentData.desc}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        {currentData.content}
                    </div>
                </div>

        </Modal>
    );
};
