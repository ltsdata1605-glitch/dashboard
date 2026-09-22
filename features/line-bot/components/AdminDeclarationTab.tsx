import React, { useState } from 'react';
import {
    ShieldCheck,
    Plus,
    Trash2,
    Send,
    UserCheck,
    HelpCircle,
    Copy,
    Check,
    RefreshCw,
    Users,
    Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { LineAdmin, AdminRole, InteractedUser } from '../types/lineBot.types';
import { lineMessagingService } from '../services/lineMessagingService';
import { SelectInteractedUserModal } from './SelectInteractedUserModal';

interface AdminDeclarationTabProps {
    admins: LineAdmin[];
    isLoading: boolean;
    botToken?: string;
    onSaveAdmin: (admin: Partial<LineAdmin>) => Promise<string | null>;
    onDeleteAdmin: (id: string) => Promise<void>;
    onToggleActive: (admin: LineAdmin) => Promise<void>;
    onRefresh: () => void;
    interactedUsers?: InteractedUser[];
    isInteractedLoading?: boolean;
    onRefreshInteracted?: () => void;
    onAddAdminFromInteracted?: (user: InteractedUser, role: AdminRole) => Promise<any>;
}

export const AdminDeclarationTab: React.FC<AdminDeclarationTabProps> = ({
    admins,
    isLoading,
    botToken,
    onSaveAdmin,
    onDeleteAdmin,
    onToggleActive,
    onRefresh,
    interactedUsers = [],
    isInteractedLoading = false,
    onRefreshInteracted,
    onAddAdminFromInteracted
}) => {
    const [name, setName] = useState<string>('');
    const [lineUserId, setLineUserId] = useState<string>('');
    const [role, setRole] = useState<AdminRole>('APPROVER');
    const [phone, setPhone] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [isSelectModalOpen, setIsSelectModalOpen] = useState<boolean>(false);

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Vui lòng nhập tên Admin');
            return;
        }
        const cleanId = lineUserId.trim();
        if (!cleanId.startsWith('U') || cleanId.length < 30) {
            toast.error('LINE User ID không hợp lệ (phải bắt đầu bằng chữ U và dài 33 ký tự)');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSaveAdmin({
                name: name.trim(),
                lineUserId: cleanId,
                role,
                phone: phone.trim(),
                active: true
            });
            setName('');
            setLineUserId('');
            setPhone('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestPush = async (admin: LineAdmin) => {
        if (!botToken) {
            toast.error('Chưa cấu hình Token Bot');
            return;
        }

        setTestingId(admin.id);
        try {
            const res = await lineMessagingService.sendTestPush(
                botToken,
                admin.lineUserId,
                `👋 Xin chào ${admin.name}!\nBạn đã được khai báo quyền Admin trên Bot LINE thành công.`
            );
            if (res.success) {
                toast.success(`Đã gửi tin nhắn test tới ${admin.name}!`);
            } else {
                toast.error(`Gửi thất bại: ${res.error}`);
            }
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* Guide box */}
            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    <HelpCircle size={15} />
                    <span>Cách lấy LINE User ID của Quản lý / Admin</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                    <p>1. Thêm bạn (Add Friend) với Bot LINE của bạn trên ứng dụng điện thoại.</p>
                    <p>2. Nhắn tin riêng cho Bot chữ <strong>admin</strong> hoặc <strong>id</strong>.</p>
                    <p>3. Bot sẽ lập tức trả về chuỗi LINE User ID cá nhân dạng: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-purple-600 font-bold">U272dcb226f96e4e17e561b19ba8ab...</code></p>
                    <p>4. Copy chuỗi đó dán vào ô bên dưới để cấp quyền điều khiển cho Admin.</p>
                </div>
            </div>

            {/* Add form */}
            <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span>Khai Báo Admin Mới</span>
                    </h4>

                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsSelectModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 border border-sky-200 dark:border-sky-800/80 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
                    >
                        <Users size={14} className="text-sky-600 dark:text-sky-400" />
                        <span>Chọn từ tương tác BOT</span>
                        {interactedUsers.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-600 text-white">
                                {interactedUsers.length}
                            </span>
                        )}
                    </Button>
                </div>

                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Tên Admin / Quản lý <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ví dụ: Sơn (QL K910)"
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                            required
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                LINE User ID (Bắt đầu bằng U...) <span className="text-rose-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsSelectModalOpen(true)}
                                className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                title="Chọn người từ lịch sử tương tác của BOT"
                            >
                                <Users size={11} />
                                <span>Chọn người</span>
                            </button>
                        </div>
                        <input
                            type="text"
                            value={lineUserId}
                            onChange={e => setLineUserId(e.target.value)}
                            placeholder="U272dcb226f9..."
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Vai trò phân quyền
                        </label>
                        <select
                            value={role}
                            onChange={e => setRole(e.target.value as AdminRole)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                            <option value="APPROVER">Duyệt cấp mã (Lệnh DUYỆT)</option>
                            <option value="SUPER_ADMIN">Toàn quyền (Quản trị cao nhất)</option>
                            <option value="VIEWER">Chỉ xem báo cáo (.tk)</option>
                        </select>
                    </div>

                    <div>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Plus size={15} />
                            <span>{isSubmitting ? 'Đang thêm...' : 'Thêm Admin'}</span>
                        </Button>
                    </div>
                </form>
            </div>

            {/* Admin Table */}
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                        Danh Sách Admin Được Cấp Quyền ({admins.length})
                    </span>
                    <Button variant="ghost" onClick={onRefresh} className="p-1 text-slate-400 rounded-lg hover:text-sky-600" title="Làm mới">
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                </div>

                <div className="overflow-x-auto max-h-[calc(100vh-320px)] [scrollbar-width:thin]">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/90 dark:border-slate-700/90 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider shadow-2xs">
                            <tr>
                                <th className="py-2.5 px-3 pl-4 border-r border-slate-200/70 dark:border-slate-700/70">Tên Admin</th>
                                <th className="py-2.5 px-3 border-r border-slate-200/70 dark:border-slate-700/70">LINE User ID</th>
                                <th className="py-2.5 px-3 text-center border-r border-slate-200/70 dark:border-slate-700/70">Phân Quyền</th>
                                <th className="py-2.5 px-3 text-center border-r border-slate-200/70 dark:border-slate-700/70">Trạng Thái</th>
                                <th className="py-2.5 px-3 pr-4 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {admins.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                                        Chưa có Admin nào được khai báo.
                                    </td>
                                </tr>
                            ) : (
                                admins.map(a => (
                                    <tr key={a.id} className="odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-800/90 dark:even:bg-slate-800/50 hover:bg-sky-50/70 dark:hover:bg-sky-950/30 transition-colors border-b border-slate-100 dark:border-slate-800/70">
                                        <td className="py-2 px-3 pl-4 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800/60">{a.name}</td>
                                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all border-r border-slate-100 dark:border-slate-800/60">{a.lineUserId}</td>
                                        <td className="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800/60">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                a.role === 'SUPER_ADMIN'
                                                    ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                                                    : a.role === 'APPROVER'
                                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}>
                                                {a.role === 'SUPER_ADMIN' ? 'Toàn quyền' : (a.role === 'APPROVER' ? 'Duyệt đơn' : 'Chỉ xem')}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-center border-r border-slate-100 dark:border-slate-800/60">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={a.active}
                                                    onChange={() => onToggleActive(a)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                                            </label>
                                        </td>
                                        <td className="p-3 pr-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleTestPush(a)}
                                                    disabled={testingId === a.id}
                                                    className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg"
                                                    title="Gửi tin nhắn test"
                                                >
                                                    <Send size={14} className={testingId === a.id ? 'animate-spin' : ''} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => onDeleteAdmin(a.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                                    title="Xoá"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Chọn người dùng tương tác */}
            <SelectInteractedUserModal
                isOpen={isSelectModalOpen}
                onClose={() => setIsSelectModalOpen(false)}
                interactedUsers={interactedUsers}
                isLoading={isInteractedLoading}
                onRefresh={() => {
                    onRefresh();
                    onRefreshInteracted?.();
                }}
                existingAdmins={admins}
                onSelectUser={async (user, selectedRole) => {
                    if (onAddAdminFromInteracted) {
                        return await onAddAdminFromInteracted(user, selectedRole);
                    } else {
                        return await onSaveAdmin({
                            name: user.displayName || 'Admin LINE',
                            lineUserId: user.lineUserId,
                            role: selectedRole,
                            active: true
                        });
                    }
                }}
            />
        </div>
    );
};
