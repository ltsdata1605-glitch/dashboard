import React, { useState, useEffect } from 'react';
import {
    Save,
    Copy,
    Check,
    Key,
    Sliders,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { LineBotConfig, LineGroup } from '../types/lineBot.types';
import { LineBotInfo } from '../services/lineMessagingService';
import { LineBotStatusCard } from './LineBotStatusCard';
import { Clock, Users, Building2, ShieldCheck } from 'lucide-react';
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
    const [token, setToken] = useState<string>(config?.channelAccessToken || '');
    const [secret, setSecret] = useState<string>(config?.channelSecret || '');
    const [liffId, setLiffId] = useState<string>(config?.liffId || '2011679071-BclvutpD');
    const [deptId, setDeptId] = useState<string>(config?.departmentId || departmentId || '');
    const [isWarehouseShared, setIsWarehouseShared] = useState<boolean>(config?.isWarehouseShared ?? true);
    const [autoApprove, setAutoApprove] = useState<boolean>(config?.autoApprove ?? true);
    const [approvalCmd, setApprovalCmd] = useState<string>(config?.approvalCommand || 'DUYỆT');
    const [scheduledGroupId, setScheduledGroupId] = useState<string>(config?.scheduledGroupId || '');
    const [morningReport, setMorningReport] = useState<boolean>(config?.scheduledNotifications?.morningReport ?? true);
    const [eveningReport, setEveningReport] = useState<boolean>(config?.scheduledNotifications?.eveningReport ?? true);
    const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

    useEffect(() => {
        if (config) {
            setToken(config.channelAccessToken || '');
            setSecret(config.channelSecret || '');
            setLiffId(config.liffId || '2011679071-BclvutpD');
            setDeptId(config.departmentId || departmentId || '');
            setIsWarehouseShared(config.isWarehouseShared ?? true);
            setAutoApprove(config.autoApprove ?? true);
            setApprovalCmd(config.approvalCommand || 'DUYỆT');
            setScheduledGroupId(config.scheduledGroupId || '');
            setMorningReport(config.scheduledNotifications?.morningReport ?? true);
            setEveningReport(config.scheduledNotifications?.eveningReport ?? true);
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
            scheduledGroupId: scheduledGroupId.trim(),
            departmentId: deptId.trim(),
            isWarehouseShared,
            scheduledNotifications: {
                morningReport,
                eveningReport
            }
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
                onOpenGuide={onOpenGuide}
                onVerifyToken={onVerifyToken}
            />

            {/* Google Account & Warehouse Linkage Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50/90 via-sky-50/50 to-indigo-50/40 dark:from-sky-950/30 dark:via-sky-950/20 dark:to-indigo-950/20 border border-sky-200/80 dark:border-sky-800/60 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs shrink-0">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                                    Liên Kết Tài Khoản Google & Mã Kho
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
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
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={isWarehouseShared}
                            onChange={e => setIsWarehouseShared(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Cho phép các Quản lý cùng mã kho <strong>{deptId || 'này'}</strong> kế thừa và dùng chung Bot</span>
                    </label>
                    <span className="text-[10px] text-slate-400 italic">
                        {isWarehouseShared ? '✓ Tài khoản cùng kho sẽ được dùng chung kho coupon & bot' : '🔒 Bot hoạt động riêng cho tài khoản này'}
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
                        className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 hover:underline inline-flex items-center gap-1.5 transition-colors group"
                        title="Mở cài đặt Messaging API trên LINE Official Account Manager (@428gkuok)"
                    >
                        <span>Webhook URL Cá Nhân Hoá (Dán vào LINE Developers Console)</span>
                        <ExternalLink size={13} className="text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform" />
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
                    <button
                        type="button"
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
                        {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedUrl ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    💡 Vào LINE Developers Console ➔ Channel của bạn ➔ Tab <strong>Messaging API</strong> ➔ Dán link này vào mục <strong>Webhook URL</strong>, bật <strong>Use webhook (ON)</strong> và bấm <strong>Verify</strong>.
                </p>
            </div>

            {/* Form Fields */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Key size={16} className="text-emerald-500" />
                    <span>Khoá API & Bí mật Channel</span>
                </h4>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <a
                            href="https://developers.line.biz/console/channel/2011672044/messaging-api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline inline-flex items-center gap-1.5 transition-colors group"
                            title="Mở tab Messaging API trên LINE Developers Console để lấy Token"
                        >
                            <span>Channel Access Token (Dài hạn)</span>
                            <span className="text-rose-500">*</span>
                            <ExternalLink size={12} className="text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                        <a
                            href="https://developers.line.biz/console/channel/2011672044/messaging-api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                            <span>Mở LINE Developers</span>
                            <ExternalLink size={10} />
                        </a>
                    </div>
                    <textarea
                        rows={3}
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder="Dán Channel access token (long-lived) từ LINE Developers..."
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <a
                            href="https://developers.line.biz/console/channel/2011672044/basics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline inline-flex items-center gap-1.5 transition-colors group"
                            title="Mở tab Basic settings trên LINE Developers Console để lấy Channel Secret"
                        >
                            <span>Channel Secret</span>
                            <span className="text-rose-500">*</span>
                            <ExternalLink size={12} className="text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                        <div className="flex items-center gap-2">
                            <a
                                href="https://developers.line.biz/console/channel/2011672044/basics"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                title="Lấy Channel Secret tại Basic settings"
                            >
                                <span>LINE Developers (Basics)</span>
                                <ExternalLink size={10} />
                            </a>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <a
                                href="https://manager.line.biz/account/@428gkuok/setting"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                                title="Mở Cài đặt trên LINE Official Account Manager"
                            >
                                <span>LINE Manager (@428gkuok)</span>
                                <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                        placeholder="Dán Channel secret từ tab Basic settings..."
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>LINE LIFF ID (Tự động 1-Chạm Copy & Gửi phản hồi)</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300/40">1-Touch LIFF</span>
                        </label>
                    </div>
                    <input
                        type="text"
                        value={liffId}
                        onChange={e => setLiffId(e.target.value)}
                        placeholder="2011679071-BclvutpD"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        💡 Giúp nhân viên chạm vào ô mã là tự động copy vào bàn phím và gửi ngay tin nhắn: <em>"👉 PMH 1 đã được sử dụng lúc HH:mm!\n↳ User: [Tên]"</em>
                    </p>
                </div>
            </div>

            {/* Automation & Rules */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Sliders size={16} className="text-sky-500" />
                    <span>Quy tắc tự động hoá & Cấp phát mã</span>
                </h4>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Tự động duyệt đơn (Auto-Approve)</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Khi nhân viên gửi đúng cú pháp form xin mã PMH, Bot sẽ tự động kiểm tra kho và phát mã ngay mà không cần Quản lý gõ lệnh duyệt.
                        </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                            type="checkbox"
                            checked={autoApprove}
                            onChange={e => setAutoApprove(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
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

            {/* Thông Báo & Báo Cáo Định Kỳ (6h00 & 22h00) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={16} className="text-amber-500" />
                        <span>Thông Báo & Báo Cáo Định Kỳ (6h00 & 22h00)</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Chỉ gửi vào Nhóm
                    </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bot sẽ tự động gửi tin nhắn vào đúng Nhóm LINE được thiết lập dưới đây (tuyệt đối không gửi riêng tư).
                </p>

                {/* Chọn nhóm LINE */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Users size={14} className="text-sky-500" />
                        <span>Nhóm LINE nhận tin nhắn định kỳ:</span>
                    </label>
                    <select
                        value={scheduledGroupId}
                        onChange={e => setScheduledGroupId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">-- Chưa chọn nhóm (Tắt gửi định kỳ) --</option>
                        {groups && groups.length > 0 ? (
                            groups.map(g => (
                                <option key={g.groupId} value={g.groupId}>
                                    👥 {g.groupName || g.groupId} ({g.groupId.slice(0, 10)}...)
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>Chưa có nhóm LINE nào (Mời bot vào nhóm trước)</option>
                        )}
                    </select>
                    <span className="text-[10.5px] text-slate-400 block mt-1">
                        💡 Để xuất hiện nhóm trong danh sách này, hãy mời Bot vào nhóm LINE của bạn và nhắn 1 tin bất kỳ.
                    </span>
                </div>

                {/* Tùy chọn 6h00 sáng */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">🌅 06h00 Sáng: Báo cáo tồn kho ("tk")</span>
                            <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-mono">Tự ngắt nếu 0 mã</span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            Chỉ gửi khi trong kho còn tồn coupon (UNUSED). Nếu kho hết sạch mã, Bot tự động giữ im lặng để không làm phiền nhóm.
                        </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                            type="checkbox"
                            checked={morningReport}
                            onChange={e => setMorningReport(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>

                {/* Tùy chọn 22h00 tối */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">🌙 22h00 Tối: Tổng kết coupon đã dùng hôm nay</span>
                            <span className="text-[9px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono">Dạng Thẻ Flex</span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            Gửi Thẻ Flex tổng kết: Tổng số lượng phiếu PMH đã dùng hôm nay kèm danh sách chi tiết các bạn đã sử dụng.
                        </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                            type="checkbox"
                            checked={eveningReport}
                            onChange={e => setEveningReport(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                    <Save size={16} />
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình Bot'}</span>
                </Button>
            </div>
        </div>
    );
};
