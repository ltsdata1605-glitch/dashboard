import React, { useState, useMemo } from 'react';
import {
    X,
    Users,
    Search,
    RefreshCw,
    MessageSquare,
    MessageCircle,
    UserCheck,
    Plus,
    Check,
    Filter,
    Sparkles,
    CheckSquare,
    Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { InteractedUser } from '../types/lineBot.types';

interface SelectFilterUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    interactedUsers: InteractedUser[];
    isLoading: boolean;
    onRefresh: () => void;
    currentFilterNames: string[];
    onToggleName: (name: string) => void;
    onBatchAddNames: (names: string[]) => void;
}

export const SelectFilterUserModal: React.FC<SelectFilterUserModalProps> = ({
    isOpen,
    onClose,
    interactedUsers,
    isLoading,
    onRefresh,
    currentFilterNames,
    onToggleName,
    onBatchAddNames
}) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [channelFilter, setChannelFilter] = useState<'ALL' | 'NOT_ADDED' | 'ADDED' | 'GROUP' | 'DIRECT'>('ALL');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Tạo tập hợp chuẩn hóa chữ thường để kiểm tra nhanh O(1)
    const filterNamesSet = useMemo(() => {
        return new Set(currentFilterNames.map(n => n.trim().toLowerCase()));
    }, [currentFilterNames]);

    const isNameInFilter = (name: string) => {
        return filterNamesSet.has(name.trim().toLowerCase());
    };

    // Thống kê số lượng
    const counts = useMemo(() => {
        let groupCount = 0;
        let directCount = 0;
        let addedCount = 0;
        let notAddedCount = 0;

        for (const u of interactedUsers) {
            if (u.lastInteractionType === 'GROUP') groupCount++;
            if (u.lastInteractionType === 'DIRECT') directCount++;

            if (isNameInFilter(u.displayName)) {
                addedCount++;
            } else {
                notAddedCount++;
            }
        }

        return {
            all: interactedUsers.length,
            group: groupCount,
            direct: directCount,
            added: addedCount,
            notAdded: notAddedCount
        };
    }, [interactedUsers, filterNamesSet]);

    // Danh sách đã qua lọc
    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return interactedUsers.filter(u => {
            const inFilter = isNameInFilter(u.displayName);

            if (channelFilter === 'NOT_ADDED' && inFilter) return false;
            if (channelFilter === 'ADDED' && !inFilter) return false;
            if (channelFilter === 'GROUP' && u.lastInteractionType !== 'GROUP') return false;
            if (channelFilter === 'DIRECT' && u.lastInteractionType !== 'DIRECT') return false;

            if (!term) return true;
            const matchName = (u.displayName || '').toLowerCase().includes(term);
            const matchId = (u.lineUserId || '').toLowerCase().includes(term);
            const matchGroup = (u.lastGroupName || '').toLowerCase().includes(term);
            const matchMsg = (u.lastMessage || '').toLowerCase().includes(term);

            return matchName || matchId || matchGroup || matchMsg;
        });
    }, [interactedUsers, searchTerm, channelFilter, filterNamesSet]);

    if (!isOpen) return null;

    const handleToggleSelectId = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAllVisible = () => {
        // Chỉ chọn những người chưa có trong danh sách lọc
        const eligible = filteredUsers.filter(u => !isNameInFilter(u.displayName));
        if (selectedIds.size >= eligible.length && eligible.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(eligible.map(u => u.lineUserId)));
        }
    };

    const handleBatchAddSelected = () => {
        if (selectedIds.size === 0) return;
        const namesToAdd: string[] = [];
        for (const u of interactedUsers) {
            if (selectedIds.has(u.lineUserId) && !isNameInFilter(u.displayName)) {
                namesToAdd.push(u.displayName.trim());
            }
        }
        if (namesToAdd.length > 0) {
            onBatchAddNames(namesToAdd);
            toast.success(`Đã thêm ${namesToAdd.length} người vào danh sách lọc!`);
            setSelectedIds(new Set());
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                            <Users size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                    Chọn Người Dùng Bot Để Lọc PMH
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                    {counts.all} người tương tác
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Danh sách thành viên trong các nhóm LINE hoặc đã kết bạn / nhắn tin riêng với Bot
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
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-rose-500 rounded-xl"
                            title="Đóng"
                        >
                            <X size={18} />
                        </Button>
                    </div>
                </div>

                {/* Toolbar: Search & Filter Tabs */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3 bg-white dark:bg-slate-900">
                    {/* Search input */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm theo Tên hiển thị, Tên nhóm LINE, LINE ID..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
                        <button
                            onClick={() => setChannelFilter('ALL')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'ALL'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span>Tất cả</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                channelFilter === 'ALL' ? 'bg-emerald-700/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {counts.all}
                            </span>
                        </button>

                        <button
                            onClick={() => setChannelFilter('NOT_ADDED')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'NOT_ADDED'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Sparkles size={13} />
                            <span>Chưa thêm ({counts.notAdded})</span>
                        </button>

                        <button
                            onClick={() => setChannelFilter('ADDED')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'ADDED'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <UserCheck size={13} />
                            <span>Đã trong danh sách ({counts.added})</span>
                        </button>

                        <button
                            onClick={() => setChannelFilter('GROUP')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'GROUP'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <MessageSquare size={13} />
                            <span>Từ Nhóm LINE ({counts.group})</span>
                        </button>

                        <button
                            onClick={() => setChannelFilter('DIRECT')}
                            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                channelFilter === 'DIRECT'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <MessageCircle size={13} />
                            <span>Nhắn riêng / Bạn bè ({counts.direct})</span>
                        </button>
                    </div>

                    {/* Batch Actions Bar (nếu có item chưa thêm) */}
                    {counts.notAdded > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <button
                                type="button"
                                onClick={handleSelectAllVisible}
                                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-semibold transition-colors"
                            >
                                {selectedIds.size > 0 ? (
                                    <CheckSquare size={15} className="text-emerald-600" />
                                ) : (
                                    <Square size={15} className="text-slate-400" />
                                )}
                                <span>
                                    {selectedIds.size > 0
                                        ? `Đã chọn ${selectedIds.size} người`
                                        : 'Chọn tất cả người chưa thêm'}
                                </span>
                            </button>

                            {selectedIds.size > 0 && (
                                <Button
                                    variant="primary"
                                    onClick={handleBatchAddSelected}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs animate-in fade-in"
                                >
                                    <Plus size={14} />
                                    <span>Thêm {selectedIds.size} người đã chọn</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Users List Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <RefreshCw size={24} className="animate-spin text-emerald-500" />
                            <span className="text-xs">Đang nạp danh sách người dùng tương tác...</span>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-12 px-4 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto">
                                <Users size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {searchTerm ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có dữ liệu người dùng tương tác'}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                    {searchTerm
                                        ? 'Thử thay đổi từ khoá tìm kiếm theo tên, nhóm hoặc kênh tương tác.'
                                        : 'Khi có thành viên gửi tin nhắn trong nhóm hoặc chat riêng với BOT LINE, thông tin sẽ được tự động ghi nhận tại đây.'}
                                </p>
                            </div>
                            {searchTerm && (
                                <Button
                                    variant="secondary"
                                    onClick={() => setSearchTerm('')}
                                    className="text-xs font-semibold px-3 py-1.5"
                                >
                                    Xoá tìm kiếm
                                </Button>
                            )}
                        </div>
                    ) : (
                        filteredUsers.map(user => {
                            const inFilter = isNameInFilter(user.displayName);
                            const isSelected = selectedIds.has(user.lineUserId);

                            return (
                                <div
                                    key={user.lineUserId}
                                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                        inFilter
                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                                            : isSelected
                                                ? 'bg-slate-100 dark:bg-slate-800/90 border-emerald-400 dark:border-emerald-600 shadow-xs'
                                                : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Checkbox (chỉ hiện khi chưa thêm vào filter) */}
                                        {!inFilter ? (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleSelectId(user.lineUserId)}
                                                className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare size={18} className="text-emerald-600" />
                                                ) : (
                                                    <Square size={18} className="text-slate-300 dark:text-slate-600" />
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-[18px] shrink-0 flex items-center justify-center">
                                                <Check size={14} className="text-emerald-600" />
                                            </div>
                                        )}

                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            {user.pictureUrl ? (
                                                <img
                                                    src={user.pictureUrl}
                                                    alt={user.displayName}
                                                    className="w-10 h-10 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-2xs"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                                                    {getInitials(user.displayName)}
                                                </div>
                                            )}
                                            {/* Badge kênh */}
                                            <div
                                                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] text-white ${
                                                    user.lastInteractionType === 'GROUP'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-sky-500'
                                                }`}
                                                title={user.lastInteractionType === 'GROUP' ? 'Tương tác từ Nhóm' : 'Nhắn riêng / Bạn bè'}
                                            >
                                                {user.lastInteractionType === 'GROUP' ? 'G' : '1'}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {user.displayName}
                                                </h4>
                                                {inFilter && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
                                                        <Check size={10} />
                                                        <span>Đang lọc</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {user.lastInteractionType === 'GROUP' ? (
                                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                        <MessageSquare size={11} />
                                                        <span className="truncate">{user.lastGroupName || 'Nhóm LINE'}</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                                                        <MessageCircle size={11} />
                                                        <span>Nhắn riêng / Bạn bè</span>
                                                    </span>
                                                )}

                                                <span>•</span>
                                                <span className="font-mono text-[10px]">{formatTime(user.lastInteractedAt)}</span>
                                            </div>

                                            {user.lastMessage && (
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate italic">
                                                    &ldquo;{user.lastMessage}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="shrink-0 flex items-center gap-2">
                                        {inFilter ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    onToggleName(user.displayName);
                                                    toast.success(`Đã xoá "${user.displayName}" khỏi danh sách lọc`);
                                                }}
                                                className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-semibold transition-colors"
                                                title="Bỏ khỏi danh sách lọc"
                                            >
                                                Bỏ lọc
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                onClick={() => {
                                                    onToggleName(user.displayName);
                                                    toast.success(`Đã thêm "${user.displayName}" vào danh sách lọc!`);
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                                            >
                                                <Plus size={13} />
                                                <span>Thêm vào lọc</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Đang cấu hình: <strong className="text-emerald-600 dark:text-emerald-400">{currentFilterNames.length}</strong> tên người nhận hợp lệ
                    </span>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="px-4 py-2 font-bold rounded-xl text-xs"
                    >
                        Hoàn tất &amp; Đóng
                    </Button>
                </div>

            </div>
        </div>
    );
};
