import React, { useState, useEffect, useRef } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';

import { toast } from '../../../components/shared/ui/toast';
import { Button } from '../../../components/shared/ui/Button';
import { Switch } from '../../../components/shared/ui/Switch';
import { LineBotConfig, LineGroup, botHasToken } from '../types/lineBot.types';
import { LineBotInfo } from '../services/lineMessagingService';
import { LineBotStatusCard } from './LineBotStatusCard';
import { useAuth } from '../../../contexts/AuthContext';

interface LineBotSettingsTabProps {
    config: LineBotConfig | null;
    botInfo: LineBotInfo | null;
    groups?: LineGroup[];
    isSaving: boolean;
    isVerifying: boolean;
    personalWebhookUrl: string;
    onVerifyToken: (token?: string) => Promise<boolean>;
    onSaveConfig: (updates: Partial<LineBotConfig>) => Promise<boolean>;
    onOpenGuide: () => void;
}

export const LineBotSettingsTab: React.FC<LineBotSettingsTabProps> = ({
    config,
    botInfo,
    groups = [],
    isSaving,
    isVerifying,
    personalWebhookUrl,
    onVerifyToken,
    onSaveConfig,
    onOpenGuide
}) => {
    const { user, departmentId } = useAuth();
    // Token/Secret đã lưu nằm ở server — ô nhập để TRỐNG, chỉ gõ khi muốn thay (audit S13).
    const [token, setToken] = useState<string>('');
    const [secret, setSecret] = useState<string>('');
    const [liffId, setLiffId] = useState<string>(config?.liffId || '2011679071-BclvutpD');
    const [deptId, setDeptId] = useState<string>(config?.departmentId || departmentId || '');
    const [isWarehouseShared, setIsWarehouseShared] = useState<boolean>(config?.isWarehouseShared ?? true);
    const [autoApprove, setAutoApprove] = useState<boolean>(config?.autoApprove ?? true);
    const [approvalCmd, setApprovalCmd] = useState<string>(config?.approvalCommand || 'DUYỆT');
    const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
    const [tokenFocused, setTokenFocused] = useState<boolean>(false);
    const [secretFocused, setSecretFocused] = useState<boolean>(false);
    const tokenInputRef = useRef<HTMLTextAreaElement>(null);
    const secretInputRef = useRef<HTMLInputElement>(null);
    const tokenSaved = botHasToken(config);
    const secretSaved = Boolean(config?.hasSecret || config?.channelSecret);

    useEffect(() => {
        if (config) {
            setLiffId(config.liffId || '2011679071-BclvutpD');
            setDeptId(config.departmentId || departmentId || '');
            setIsWarehouseShared(config.isWarehouseShared ?? true);
            setAutoApprove(config.autoApprove ?? true);
            setApprovalCmd(config.approvalCommand || 'DUYỆT');
        }
    }, [config, departmentId]);

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(personalWebhookUrl);
        setCopiedUrl(true);
        toast.success('Đã sao chép Webhook URL vào clipboard');
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleSave = async () => {
        await onSaveConfig({
            channelAccessToken: token.trim(),
            channelSecret: secret.trim(),
            liffId: liffId.trim() || '2011679071-BclvutpD',
            autoApprove,
            approvalCommand: approvalCmd.trim() || 'DUYỆT',
            departmentId: deptId.trim(),
            isWarehouseShared
        });
    };

    return (
        <div className="space-y-5 w-full">
            {/* Top Bot Card Status */}
            <LineBotStatusCard
                config={config}
                botInfo={botInfo}
                isVerifying={isVerifying}
                token={token}
                hasSavedToken={tokenSaved}
                onOpenGuide={onOpenGuide}
                onVerifyToken={onVerifyToken}
            />

            {/* Google Account & Warehouse Linkage Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50/90 via-sky-50/50 to-sky-50/40 dark:from-sky-950/30 dark:via-sky-950/20 dark:to-sky-950/20 border border-sky-200/80 dark:border-sky-800/60 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs shrink-0">
                            <AppIcon name="department" size="lg" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                                    Liên kết tài khoản Google & mã kho
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                                    Multi-Tenant
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Google User: <strong className="text-slate-700 dark:text-slate-300">{user?.email || 'Chưa đăng nhập'}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 shadow-2xs w-full sm:w-auto">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Mã Kho:</span>
                            <input
                                type="text"
                                value={deptId}
                                onChange={e => setDeptId(e.target.value)}
                                placeholder="Ví dụ: 910"
                                className="w-24 px-1.5 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400 bg-transparent border-0 focus:outline-none focus:ring-0 text-center font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
                        <span id="bot-dung-chung-kho" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Cho phép các quản lý cùng mã kho <strong>{deptId || 'này'}</strong> kế thừa và dùng chung Bot
                        </span>
                        <Switch checked={isWarehouseShared} onChange={setIsWarehouseShared} aria-labelledby="bot-dung-chung-kho" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                        {isWarehouseShared
                            ? <><AppIcon name="check" size="xs" className="text-emerald-600" />Tài khoản cùng kho sẽ được dùng chung kho coupon & bot</>
                            : <><AppIcon name="lock" size="xs" />Bot hoạt động riêng cho tài khoản này</>}
                    </span>
                </div>
            </div>

            {/* Webhook URL Box */}
            <div className="p-5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                    <a
                        href="https://manager.line.biz/account/@428gkuok/setting/messaging-api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-11 sm:min-h-0 text-[13px] font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 hover:underline inline-flex items-center gap-1.5 transition-colors group"
                        title="Mở cài đặt Messaging API trên LINE Official Account Manager (@428gkuok)"
                    >
                        <span>Webhook URL cá nhân hoá (dán vào LINE Developers Console)</span>
                        <AppIcon name="externalLink" size="sm" className="text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                </div>

                {/* Ô Webhook URL có nút sao chép bên trong và bấm vào ô tự động copy */}
                <div
                    onClick={handleCopyWebhook}
                    className="relative group cursor-pointer bg-white dark:bg-slate-900 rounded-xl border border-sky-200/80 dark:border-sky-800/80 p-3 pr-28 transition-all hover:border-sky-400 dark:hover:border-sky-500 shadow-xs"
                    title="Bấm vào để tự động sao chép Webhook URL"
                >
                    <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
                        {personalWebhookUrl}
                    </div>
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopyWebhook();
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                            copiedUrl
                                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                : 'bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 dark:hover:bg-sky-800 text-sky-700 dark:text-sky-300'
                        }`}
                        title="Sao chép URL vào clipboard"
                    >
                        {copiedUrl ? <AppIcon name="check" size="sm" /> : <AppIcon name="copy" size="sm" />}
                        <span>{copiedUrl ? 'Đã chép' : 'Sao chép'}</span>
                    </Button>
                </div>

                <p className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <AppIcon name="idea" size="xs" className="mt-0.5 shrink-0 text-sky-600" /><span>Vào LINE Developers Console ➔ Channel của bạn ➔ Tab <strong>Messaging API</strong> ➔ Dán link này vào mục <strong>Webhook URL</strong>, bật <strong>Use webhook (ON)</strong> và bấm <strong>Verify</strong>.</span>
                </p>
            </div>

            {/* Form Fields */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <AppIcon name="apiKey" size="md" className="text-emerald-500" />
                    <span>Khoá API & Bí mật Channel</span>
                </h4>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <a
                            href="https://developers.line.biz/console/channel/2011672044/messaging-api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-11 sm:min-h-0 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline inline-flex items-center gap-1.5 transition-colors group"
                            title="Mở tab Messaging API trên LINE Developers Console để lấy Token"
                        >
                            <span>Channel Access Token (Dài hạn)</span>
                            <span className="text-rose-500">*</span>
                            <AppIcon name="externalLink" size="xs" className="text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                        <a
                            href="https://developers.line.biz/console/channel/2011672044/messaging-api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-11 sm:min-h-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                            <span>Mở LINE Developers</span>
                            <AppIcon name="externalLink" size="xs" />
                        </a>
                    </div>
                    <div className="relative">
                        <textarea
                            ref={tokenInputRef}
                            rows={3}
                            value={token}
                            onFocus={() => setTokenFocused(true)}
                            onBlur={() => setTokenFocused(false)}
                            onChange={e => setToken(e.target.value)}
                            placeholder={tokenFocused ? (tokenSaved ? 'Dán Channel access token mới vào đây để thay (để trống thì giữ nguyên)...' : 'Dán Channel access token (long-lived) từ LINE Developers...') : ''}
                            className={`w-full p-3 rounded-xl text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                tokenSaved && !token.trim() && !tokenFocused
                                    ? 'bg-emerald-50 border border-emerald-300 dark:bg-slate-900 dark:border-emerald-700/80 text-slate-800 dark:text-slate-200'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                        />
                        {tokenSaved && !token.trim() && !tokenFocused && (
                            <div
                                data-testid="line-token-saved"
                                onClick={() => tokenInputRef.current?.focus()}
                                className="absolute inset-0 rounded-xl p-3 bg-emerald-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 flex items-start gap-2.5 cursor-text select-none shadow-xs"
                            >
                                <AppIcon name="success" size="md" className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div className="leading-snug">
                                    <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-200">
                                        Đã lưu an toàn trên máy chủ — không hiển thị lại để tránh lộ.
                                    </p>
                                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 mt-0.5">
                                        Nhấp vào đây và dán Token mới nếu muốn thay; để trống thì giữ nguyên.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    {tokenSaved && token.trim() && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300 px-1">
                            <span className="font-semibold">Sẽ thay bằng Token mới khi bấm &quot;Lưu cấu hình Bot&quot;.</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => setToken('')}
                                className="!h-auto !py-0.5 !px-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline font-medium text-[11px]"
                            >
                                Huỷ thay đổi (giữ Token cũ)
                            </Button>
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <a
                            href="https://developers.line.biz/console/channel/2011672044/basics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-11 sm:min-h-0 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline inline-flex items-center gap-1.5 transition-colors group"
                            title="Mở tab Basic settings trên LINE Developers Console để lấy Channel Secret"
                        >
                            <span>Channel Secret</span>
                            <span className="text-rose-500">*</span>
                            <AppIcon name="externalLink" size="xs" className="text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                        <div className="flex items-center gap-2">
                            <a
                                href="https://developers.line.biz/console/channel/2011672044/basics"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-11 sm:min-h-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                title="Lấy Channel Secret tại Basic settings"
                            >
                                <span>LINE Developers (Basics)</span>
                                <AppIcon name="externalLink" size="xs" />
                            </a>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <a
                                href="https://manager.line.biz/account/@428gkuok/setting"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-11 sm:min-h-0 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                                title="Mở Cài đặt trên LINE Official Account Manager"
                            >
                                <span>LINE Manager (@428gkuok)</span>
                                <AppIcon name="externalLink" size="xs" />
                            </a>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            ref={secretInputRef}
                            type="text"
                            value={secret}
                            onFocus={() => setSecretFocused(true)}
                            onBlur={() => setSecretFocused(false)}
                            onChange={e => setSecret(e.target.value)}
                            placeholder={secretFocused ? (secretSaved ? 'Dán Channel secret mới vào đây để thay (để trống thì giữ nguyên)...' : 'Dán Channel secret từ tab Basic settings...') : ''}
                            className={`w-full p-3 rounded-xl text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                secretSaved && !secret.trim() && !secretFocused
                                    ? 'bg-emerald-50 border border-emerald-300 dark:bg-slate-900 dark:border-emerald-700/80 text-slate-800 dark:text-slate-200'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                        />
                        {secretSaved && !secret.trim() && !secretFocused && (
                            <div
                                data-testid="line-secret-saved"
                                onClick={() => secretInputRef.current?.focus()}
                                className="absolute inset-0 rounded-xl px-3 py-2 bg-emerald-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 flex items-center gap-2 cursor-text select-none shadow-xs"
                            >
                                <AppIcon name="success" size="md" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div className="leading-snug truncate">
                                    <span className="text-[12px] font-bold text-emerald-800 dark:text-emerald-200">
                                        Đã lưu an toàn trên máy chủ (không hiển thị lại).
                                    </span>
                                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 ml-1.5 hidden sm:inline">
                                        Nhấp vào và dán Secret mới để thay; để trống thì giữ nguyên.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {secretSaved && secret.trim() && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300 px-1">
                            <span className="font-semibold">Sẽ thay bằng Secret mới khi bấm &quot;Lưu cấu hình Bot&quot;.</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => setSecret('')}
                                className="!h-auto !py-0.5 !px-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline font-medium text-[11px]"
                            >
                                Huỷ thay đổi (giữ Secret cũ)
                            </Button>
                        </div>
                    )}
                    {/* Từ 2026-10-02 webhook KIỂM CHỮ KÝ bằng secret này — thiếu hoặc sai thì bot bỏ qua mọi tin nhắn. */}
                    {!secret.trim() && !secretSaved ? (
                        <p data-testid="line-secret-warning" className="mt-1.5 text-[12px] font-semibold text-rose-700 leading-snug">
                            Bắt buộc: chưa có Channel secret thì bot KHÔNG nhận tin nhắn nào (máy chủ không kiểm được tin có thật từ LINE hay bị giả).
                        </p>
                    ) : (
                        <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">
                            Dùng để kiểm chữ ký mọi tin LINE gửi tới — nhập sai thì bot sẽ bỏ qua tin nhắn. Bấm Lưu sau khi dán.
                        </p>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>LINE LIFF ID (Tự động 1-Chạm Copy & Gửi phản hồi)</span>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300/40">1-Touch LIFF</span>
                        </label>
                    </div>
                    <input
                        type="text"
                        value={liffId}
                        onChange={e => setLiffId(e.target.value)}
                        placeholder="2011679071-BclvutpD"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        <AppIcon name="idea" size="xs" className="mt-0.5 shrink-0 text-sky-600" /><span>Giúp nhân viên chạm vào ô mã là tự động copy vào bàn phím và gửi ngay tin nhắn: <em>"👉 PMH 1 đã được sử dụng lúc HH:mm!\n↳ User: [Tên]"</em></span>
                    </p>
                </div>
            </div>

            {/* Automation & Rules */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <AppIcon name="viewOptions" size="md" className="text-sky-500" />
                    <span>Quy tắc tự động hoá & Cấp phát mã</span>
                </h4>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                        <span id="bot-tu-duyet" className="text-xs font-bold text-slate-800 dark:text-white block">Tự động duyệt đơn (Auto-Approve)</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Khi nhân viên gửi đúng cú pháp form xin mã PMH, Bot sẽ tự động kiểm tra kho và phát mã ngay mà không cần Quản lý gõ lệnh duyệt.
                        </span>
                    </div>
                    <Switch checked={autoApprove} onChange={setAutoApprove} aria-labelledby="bot-tu-duyet" className="ml-4 shrink-0" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Lệnh duyệt đơn thủ công (khi tắt Auto-Approve)
                    </label>
                    <input
                        type="text"
                        value={approvalCmd}
                        onChange={e => setApprovalCmd(e.target.value)}
                        placeholder="DUYỆT"
                        className="w-full sm:w-64 p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold uppercase text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-slate-500 block mt-1">
                        Chỉ các Admin được khai báo mới có quyền gửi lệnh này để Bot phát mã.
                    </span>
                </div>

            </div>

            {/* Mục "Thông báo & báo cáo định kỳ (6h00 & 22h00)" ĐÃ XOÁ 2026-10-20 (chủ dự án chốt): báo cáo tồn kho 06:00 và
                tổng kết 22:00 tự đẩy vào nhóm, tốn hạn mức tin LINE. Xem tồn kho: gõ "tk" trong nhóm (bot trả lời, miễn phí). */}

            {/* Nút lưu — nút chính chuẩn (GĐ7: trước tự tô xanh lá); iPhone trải hết bề ngang cho dễ bấm */}
            <div className="flex justify-end pt-2">
                <Button
                    variant="primary"
                    icon="save"
                    onClick={handleSave}
                    isLoading={isSaving}
                    className="w-full sm:w-auto px-6"
                >
                    {isSaving ? 'Đang lưu…' : 'Lưu cấu hình Bot'}
                </Button>
            </div>
        </div>
    );
};
