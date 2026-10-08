import React, { useState, useMemo, useRef } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { useModalBehavior } from '../../../components/shared/ui/Modal';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { InteractedUser, LineAdmin, AdminRole } from '../types/lineBot.types';

interface SelectInteractedUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    interactedUsers: InteractedUser[];
    isLoading: boolean;
    onRefresh: () => void;
    existingAdmins: LineAdmin[];
    onSelectUser: (user: InteractedUser, role: AdminRole) => Promise<any>;
}

export const SelectInteractedUserModal: React.FC<SelectInteractedUserModalProps> = ({
    isOpen,
    onClose,
    interactedUsers,
    isLoading,
    onRefresh,
    existingAdmins,
    onSelectUser
}) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [channelFilter, setChannelFilter] = useState<'ALL' | 'GROUP' | 'DIRECT' | 'NON_ADMIN'>('ALL');
    const [selectedRoles, setSelectedRoles] = useState<Record<string, AdminRole>>({});
    const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Map các admin đã có theo lineUserId để tra cứu nhanh O(1)
    const adminMap = useMemo(() => {
        const map = new Map<string, LineAdmin>();
        for (const a of existingAdmins) {
            if (a.lineUserId) {
                map.set(a.lineUserId, a);
            }
        }
        return map;
    }, [existingAdmins]);

    // Thống kê số lượng
    const counts = useMemo(() => {
        let groupCount = 0;
        let directCount = 0;
        let nonAdminCount = 0;

        for (const u of interactedUsers) {
            if (u.lastInteractionType === 'GROUP') groupCount++;
            if (u.lastInteractionType === 'DIRECT') directCount++;
            if (!adminMap.has(u.lineUserId)) nonAdminCount++;
        }

        return {
            all: interactedUsers.length,
            group: groupCount,
            direct: directCount,
            nonAdmin: nonAdminCount
        };
    }, [interactedUsers, adminMap]);

    // Lọc theo từ khóa tìm kiếm & tab kênh
    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return interactedUsers.filter(u => {
            // Lọc theo kênh
            if (channelFilter === 'GROUP' && u.lastInteractionType !== 'GROUP') return false;
            if (channelFilter === 'DIRECT' && u.lastInteractionType !== 'DIRECT') return false;
            if (channelFilter === 'NON_ADMIN' && adminMap.has(u.lineUserId)) return false;

            // Lọc theo từ khóa
            if (!term) return true;
            const matchName = (u.displayName || '').toLowerCase().includes(term);
            const matchId = (u.lineUserId || '').toLowerCase().includes(term);
            const matchGroup = (u.lastGroupName || '').toLowerCase().includes(term);
            const matchMsg = (u.lastMessage || '').toLowerCase().includes(term);

            return matchName || matchId || matchGroup || matchMsg;
        });
    }, [interactedUsers, searchTerm, channelFilter, adminMap]);

    // Modal tự dựng: gắn hành vi chuẩn (Escape, bẫy Tab, khoá cuộn theo ngăn xếp, trả focus) — audit A34.
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalBehavior(isOpen, onClose, dialogRef);
    if (!isOpen) return null;

    const handleCopy = (lineUserId: string) => {
        navigator.clipboard.writeText(lineUserId);
        setCopiedId(lineUserId);
        toast.success('Đã copy LINE User ID!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRoleChange = (lineUserId: string, role: AdminRole) => {
        setSelectedRoles(prev => ({
            ...prev,
            [lineUserId]: role
        }));
    };

    const handleAddAdmin = async (user: InteractedUser) => {
        const role = selectedRoles[user.lineUserId] || 'APPROVER';
        setSubmittingIds(prev => ({ ...prev, [user.lineUserId]: true }));
        try {
            const success = await onSelectUser(user, role);
            if (success) {
                toast.success(`Đã thêm "${user.displayName}" làm Admin thành công!`);
            }
        } finally {
            setSubmittingIds(prev => ({ ...prev, [user.lineUserId]: false }));
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            return `${time} ${date}`;
        } catch {
            return isoString;
        }
    };

    const getInitials = (name: string) => {
        const clean = (name || 'L').trim().replace(/[^\p{L}\s]/gu, '');
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div data-modal-overlay="" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Chọn admin từ tương tác LINE" tabIndex={-1} className="outline-none bg-white dark:bg-slate-900 w-full max-w-3xl rounded-overlay shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                            <AppIcon name="users" size="lg" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                    Chọn Admin Từ Tương Tác LINE
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                                    {counts.all} người
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Tự động phát hiện khi thành viên nhắn tin trong nhóm có BOT hoặc chat 1-1 riêng
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            onClick={onRefresh}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                            title="Làm mới danh sách"
                        >
                            <AppIcon name="refresh" size="md" className={isLoading ? 'animate-spin' : ''} />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-rose-500 rounded-xl"
                            title="Đóng"
                        >
                            <AppIcon name="close" size="md" />
                        </Button>
                    </div>
                </div>

                {/* Toolbar: Search & Filter Tabs */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3 bg-white dark:bg-slate-900">
                    {/* Search input */}
                    <div className="relative">
                        <AppIcon name="search" size="md" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm theo Tên, LINE User ID, Nhóm LINE..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                <AppIcon name="close" size="sm" />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
                        <button
                            onClick={() => setChannelFilter('ALL')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'ALL'
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span>Tất cả</span>
                            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                                channelFilter === 'ALL' ? 'bg-sky-700/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {counts.all}
                            </span>
                        </button>

                        <button
                            onClick={() => setChannelFilter('NON_ADMIN')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'NON_ADMIN'
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <AppIcon name="sparkles" size="sm" />
                            <span>Chưa là Admin</span>
                            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                                channelFilter === 'NON_ADMIN' ? 'bg-sky-700/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {counts.nonAdmin}
                            </span>
                        </button>

                        <button
                            onClick={() => setChannelFilter('GROUP')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'GROUP'
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <AppIcon name="message" size="sm" />
                            <span>Từ Nhóm LINE</span>
                            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                                channelFilter === 'GROUP' ? 'bg-sky-700/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {counts.group}
                            </span>
                        </button>

                        <button
                            onClick={() => setChannelFilter('DIRECT')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'DIRECT'
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <AppIcon name="message" size="sm" />
                            <span>Nhắn riêng 1-1</span>
                            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                                channelFilter === 'DIRECT' ? 'bg-sky-700/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {counts.direct}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Users List Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <AppIcon name="refresh" size="xl" spin className="text-sky-500" />
                            <span className="text-xs">Đang nạp danh sách người dùng tương tác...</span>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-12 px-4 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center mx-auto">
                                <AppIcon name="users" size="xl" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {searchTerm ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có dữ liệu tương tác'}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                    {searchTerm
                                        ? 'Vui lòng thử tìm với từ khoá khác hoặc xóa bộ lọc.'
                                        : 'Khi thành viên nhắn tin trong nhóm có BOT hoặc nhắn tin riêng cho BOT (ví dụ: gõ "tk" hoặc "id"), hệ thống sẽ tự động bắt ID và hiển thị đầy đủ tại đây!'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        filteredUsers.map(user => {
                            const existingAdmin = adminMap.get(user.lineUserId);
                            const isExisting = !!existingAdmin;
                            const isSubmitting = submittingIds[user.lineUserId] || false;
                            const currentRole = selectedRoles[user.lineUserId] || 'APPROVER';

                            return (
                                <div
                                    key={user.lineUserId}
                                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                        isExisting
                                            ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-90'
                                            : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-600 shadow-sm hover:shadow'
                                    }`}
                                >
                                    {/* Left info: Avatar & Details */}
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            {user.pictureUrl ? (
                                                <img
                                                    src={user.pictureUrl}
                                                    alt={user.displayName}
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                                                    onError={e => {
                                                        // Fallback nếu ảnh lỗi
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                                    {getInitials(user.displayName)}
                                                </div>
                                            )}

                                            {/* Online / Channel Icon Indicator */}
                                            <div
                                                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[11px] text-white ${
                                                    user.lastInteractionType === 'GROUP' ? 'bg-sky-500' : 'bg-emerald-500'
                                                }`}
                                                title={user.lastInteractionType === 'GROUP' ? 'Tương tác trong nhóm' : 'Nhắn tin trực tiếp'}
                                            >
                                                {user.lastInteractionType === 'GROUP' ? (
                                                    <AppIcon name="message" size="xs" />
                                                ) : (
                                                    <AppIcon name="message" size="xs" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Name & ID & Channel */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {user.displayName || 'Người dùng LINE'}
                                                </span>

                                                {/* Source Badge */}
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                                                        user.lastInteractionType === 'GROUP'
                                                            ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40'
                                                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                                    }`}
                                                >
                                                    {user.lastInteractionType === 'GROUP' ? (
                                                        <>
                                                            <AppIcon name="users" size="xs" />
                                                            <span className="truncate max-w-[140px]">
                                                                {user.lastGroupName || 'Nhóm LINE'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AppIcon name="message" size="xs" />
                                                            <span>Nhắn riêng 1-1</span>
                                                        </>
                                                    )}
                                                </span>
                                            </div>

                                            {/* LINE User ID + Copy Button */}
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                                <span className="truncate select-all">{user.lineUserId}</span>
                                                <button
                                                    onClick={() => handleCopy(user.lineUserId)}
                                                    className="text-slate-400 hover:text-sky-600 p-0.5 rounded transition-colors"
                                                    title="Sao chép LINE User ID"
                                                >
                                                    {copiedId === user.lineUserId ? (
                                                        <AppIcon name="check" size="xs" className="text-emerald-500" />
                                                    ) : (
                                                        <AppIcon name="copy" size="xs" />
                                                    )}
                                                </button>
                                            </div>

                                            {/* Last message snippet & time */}
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                                                {user.lastMessage && (
                                                    <span className="truncate max-w-[220px] italic text-slate-600 dark:text-slate-400">
                                                        “{user.lastMessage}”
                                                    </span>
                                                )}
                                                {user.lastInteractedAt && (
                                                    <span className="flex items-center gap-0.5 flex-shrink-0">
                                                        <AppIcon name="clock" size="xs" />
                                                        <span>{formatTime(user.lastInteractedAt)}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right action: Existing Badge or Add as Admin */}
                                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                                        {isExisting ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                                <AppIcon name="userCheck" size="sm" />
                                                <span>
                                                    Đã là Admin (
                                                    {existingAdmin.role === 'SUPER_ADMIN'
                                                        ? 'Toàn quyền'
                                                        : existingAdmin.role === 'APPROVER'
                                                        ? 'Duyệt đơn'
                                                        : 'Chỉ xem'}
                                                    )
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {/* Role selection dropdown */}
                                                <select
                                                    value={currentRole}
                                                    onChange={e =>
                                                        handleRoleChange(user.lineUserId, e.target.value as AdminRole)
                                                    }
                                                    className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-sky-500"
                                                >
                                                    <option value="APPROVER">Duyệt cấp mã</option>
                                                    <option value="SUPER_ADMIN">Toàn quyền</option>
                                                    <option value="VIEWER">Chỉ xem</option>
                                                </select>

                                                {/* Add button */}
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleAddAdmin(user)}
                                                    disabled={isSubmitting}
                                                    className="py-1.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                                                >
                                                    {isSubmitting ? (
                                                        <AppIcon name="refresh" size="sm" spin />
                                                    ) : (
                                                        <AppIcon name="add" size="sm" />
                                                    )}
                                                    <span>{isSubmitting ? 'Đang thêm...' : 'Thêm Admin'}</span>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Tip */}
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <AppIcon name="sparkles" size="sm" className="text-amber-500" />
                        <span>
                            Chưa thấy người cần thêm? Bảo họ nhắn chữ <strong>id</strong> vào nhóm hoặc chat riêng với BOT!
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="py-1 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
                    >
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
};
