import React, { useState, useMemo } from 'react';
import {
    Save,
    BarChart2,
    UserCheck,
    Plus,
    X,
    Terminal,
    Users,
    Sparkles,
    Zap,
    Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { LineBotConfig, InteractedUser } from '../types/lineBot.types';
import { SelectFilterUserModal } from './SelectFilterUserModal';
import { IPhoneChatPreview } from './IPhoneChatPreview';

interface SyntaxConfigTabProps {
    config: LineBotConfig | null;
    isSaving: boolean;
    onSaveConfig: (updates: Partial<LineBotConfig>) => Promise<boolean>;
    interactedUsers?: InteractedUser[];
    isInteractedLoading?: boolean;
    onRefreshInteracted?: () => void;
}

const DEFAULT_SYNTAX = `📝 FORM MẪU LẤY PMH
Loại PMH: Bếp gas đôi Sunhouse SHB3105MD
MĐH Áp dụng: 12345678`;

const DEFAULT_FILTER_NAMES = ['Lê Trường Sơn', 'Sơn'];

export const SyntaxConfigTab: React.FC<SyntaxConfigTabProps> = ({
    config,
    isSaving,
    onSaveConfig,
    interactedUsers = [],
    isInteractedLoading = false,
    onRefreshInteracted = () => {}
}) => {
    const [syntax, setSyntax] = useState<string>(config?.syntaxTemplate || DEFAULT_SYNTAX);
    const [autoApprove, setAutoApprove] = useState<boolean>(config?.autoApprove ?? true);
    const [previewTab, setPreviewTab] = useState<'filter' | 'tk' | 'issue'>('filter');
    const [tkMode, setTkMode] = useState<'all' | 'event' | 'gvgs'>('all');
    const [issueMode, setIssueMode] = useState<'event' | 'gvgs'>('event');
    const [isSelectUserModalOpen, setIsSelectUserModalOpen] = useState<boolean>(false);

    // Quản lý danh sách tên người để lọc
    const [filterNames, setFilterNames] = useState<string[]>(
        config?.filterUserNames && config.filterUserNames.length > 0
            ? config.filterUserNames
            : DEFAULT_FILTER_NAMES
    );
    const [newCandidateName, setNewCandidateName] = useState<string>('');

    // Gợi ý nhanh các user tương tác bot chưa có trong danh sách lọc
    const suggestedUsers = useMemo(() => {
        if (!interactedUsers || interactedUsers.length === 0) return [];
        const existing = new Set(filterNames.map(n => n.toLowerCase().trim()));
        return interactedUsers.filter(u => u.displayName && !existing.has(u.displayName.toLowerCase().trim()));
    }, [interactedUsers, filterNames]);

    React.useEffect(() => {
        if (config) {
            if (config.syntaxTemplate) setSyntax(config.syntaxTemplate);
            setAutoApprove(config.autoApprove ?? true);
            if (config.filterUserNames && config.filterUserNames.length > 0) {
                setFilterNames(config.filterUserNames);
            }
        }
    }, [config]);

    // Thêm một tên vào danh sách lọc
    const handleAddName = () => {
        const trimmed = newCandidateName.trim();
        if (!trimmed) return;
        if (filterNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            toast.error(`Tên "${trimmed}" đã có trong danh sách!`);
            return;
        }
        setFilterNames(prev => [...prev, trimmed]);
        setNewCandidateName('');
        toast.success(`Đã thêm "${trimmed}" vào danh sách lọc!`);
    };

    const handleAddDirectName = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (filterNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            toast.error(`Tên "${trimmed}" đã có trong danh sách!`);
            return;
        }
        setFilterNames(prev => [...prev, trimmed]);
        toast.success(`Đã thêm "${trimmed}" vào danh sách lọc!`);
    };

    // Xoá một tên khỏi danh sách lọc
    const handleRemoveName = (nameToRemove: string) => {
        if (filterNames.length <= 1) {
            toast.error('Cần giữ lại ít nhất 1 tên để Bot lọc mã!');
            return;
        }
        setFilterNames(prev => prev.filter(n => n !== nameToRemove));
    };

    // Lưu toàn bộ cấu hình (Cú pháp + Tên người lọc)
    const handleSave = async () => {
        const success = await onSaveConfig({
            syntaxTemplate: syntax.trim() || DEFAULT_SYNTAX,
            autoApprove,
            filterUserNames: filterNames
        });
        if (success) {
            toast.success('Đã lưu cấu hình cú pháp & danh sách tên lọc PMH!');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Editor column */}
            <div className="space-y-5">
                {/* 1. MỤC CẤU HÌNH TÊN NGƯỜI ĐỂ LỌC PMH (Theo yêu cầu) */}
                <div
                    onClick={() => {
                        setPreviewTab('filter');
                    }}
                    onFocusCapture={() => {
                        setPreviewTab('filter');
                    }}
                    title="Click vào khu vực này để xem trước mô phỏng lọc PMH trên iPhone"
                    className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                        previewTab === 'filter'
                            ? 'bg-white dark:bg-slate-800/90 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                            : 'bg-white/90 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <UserCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                                Cấu Hình Tên Người Để Lọc PMH
                            </h3>
                            {previewTab === 'filter' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-300/60 animate-in fade-in">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Đang xem trên iPhone</span>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setIsSelectUserModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl transition-all shadow-2xs"
                                title="Mở danh sách người dùng bot trong nhóm hoặc chat riêng để chọn nhanh"
                            >
                                <Users size={14} />
                                <span>Chọn từ tương tác Bot ({interactedUsers.length})</span>
                            </Button>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50">
                                {filterNames.length} tên đang kích hoạt
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Khi nhân viên hoặc bạn chuyển tiếp tin nhắn chứa danh sách hàng chục mã PMH của nhiều người vào nhóm hoặc tin nhắn Bot, Bot sẽ <strong>tự động nhận diện và chỉ lọc ra các mã thuộc về những tên này</strong>.
                    </p>

                    {/* Danh sách Tags tên người */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Danh sách tên người nhận hợp lệ:
                        </label>
                        <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]">
                            {filterNames.map((name) => (
                                <span
                                    key={name}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-semibold shadow-2xs group"
                                >
                                    <span>👤 {name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveName(name)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors"
                                        title={`Xoá "${name}"`}
                                    >
                                        <X size={13} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Ô thêm tên mới & Nút chọn từ Bot */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Thêm tên mới hoặc chọn từ người dùng BOT:
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCandidateName}
                                onChange={e => setNewCandidateName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddName();
                                    }
                                }}
                                placeholder="Nhập tên người nhận (ví dụ: Lê Sơn, Boss)..."
                                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <Button
                                variant="secondary"
                                onClick={handleAddName}
                                className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl"
                            >
                                <Plus size={14} />
                                <span>Thêm</span>
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setIsSelectUserModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl shadow-2xs whitespace-nowrap"
                                title="Mở danh sách thành viên trong nhóm hoặc nhắn riêng với Bot để chọn"
                            >
                                <Users size={14} />
                                <span>Tìm &amp; Chọn</span>
                            </Button>
                        </div>

                        {/* Gợi ý nhanh từ thành viên Bot chưa có trong danh sách */}
                        {suggestedUsers.length > 0 && (
                            <div className="pt-1 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Sparkles size={12} className="text-amber-500" />
                                        <span>Gợi ý thành viên Bot ({suggestedUsers.length}):</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsSelectUserModalOpen(true)}
                                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[10px]"
                                    >
                                        Xem tất cả &rarr;
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {suggestedUsers.slice(0, 5).map(u => (
                                        <button
                                            key={u.lineUserId}
                                            type="button"
                                            onClick={() => handleAddDirectName(u.displayName)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 rounded-lg text-[11px] font-medium transition-all group shadow-2xs"
                                            title={`Click để thêm nhanh: ${u.displayName}`}
                                        >
                                            <Plus size={11} className="text-slate-400 group-hover:text-emerald-600" />
                                            <span className="truncate max-w-[130px] font-semibold">{u.displayName}</span>
                                            <span className="text-[9px] text-slate-400">
                                                {u.lastInteractionType === 'GROUP' ? '(Nhóm)' : '(1-1)'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-1">
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                        >
                            <Save size={14} />
                            <span>{isSaving ? 'Đang lưu...' : 'Lưu Danh Sách Tên Lọc'}</span>
                        </Button>
                    </div>
                </div>



                {/* 2. CÚ PHÁP TRA CỨU TỒN KHO & NHẬN MÃ (Hệ thống "tk" Mới) */}
                <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal size={17} className="text-emerald-500" />
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                                Cú Pháp Tra Cứu Tồn Kho &amp; Nhận Mã (Lệnh &quot;tk&quot; Mới)
                            </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">Click vào ô để xem trước trên iPhone</span>
                    </div>

                    <div className="space-y-3">
                        {/* Command tk (All) */}
                        <div
                            onClick={() => {
                                setPreviewTab('tk');
                                setTkMode('all');
                            }}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                                previewTab === 'tk' && tkMode === 'all'
                                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/50 shadow-md shadow-amber-500/10'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/20'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                                    tk
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {previewTab === 'tk' && tkMode === 'all' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300/60 animate-in fade-in">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <span>Đang xem trên iPhone</span>
                                        </span>
                                    )}
                                    <BarChart2 size={14} className={previewTab === 'tk' && tkMode === 'all' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
                                </div>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Xem Toàn Bộ Tồn Kho Sản Phẩm
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Bot hiển thị danh sách tất cả các sản phẩm đang có mã khả dụng, kèm số lượng và hướng dẫn lấy mã trực tiếp.
                            </p>
                            <div className="text-[10px] text-slate-400 font-mono">
                                Lệnh tương đương: <code>thống kê</code>, <code>tk all</code>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Command tk event */}
                            <div
                                onClick={() => {
                                    setPreviewTab('tk');
                                    setTkMode('event');
                                }}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                                    previewTab === 'tk' && tkMode === 'event'
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/50 shadow-md shadow-emerald-500/10'
                                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/20'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                                        tk event
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {previewTab === 'tk' && tkMode === 'event' && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300/60 animate-in fade-in">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Đang xem trên iPhone</span>
                                            </span>
                                        )}
                                        <BarChart2 size={14} className={previewTab === 'tk' && tkMode === 'event' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                                    </div>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    PMH Event Cuối Tuần
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Bot lọc riêng danh sách Event. Cú pháp nhận mã: gõ <strong>e + STT [MĐH]</strong> (ví dụ: <code>e1 12345678</code> hoặc <code>e4</code>).
                                </p>
                                <div className="text-[10px] text-slate-400 font-mono">
                                    Lệnh tương đương: <code>tk e</code>
                                </div>
                            </div>

                            {/* Command tk gvgs */}
                            <div
                                onClick={() => {
                                    setPreviewTab('tk');
                                    setTkMode('gvgs');
                                }}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                                    previewTab === 'tk' && tkMode === 'gvgs'
                                        ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/50 shadow-md shadow-sky-500/10'
                                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/20'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300/60 dark:border-sky-700/60">
                                        tk gvgs
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {previewTab === 'tk' && tkMode === 'gvgs' && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-300/60 animate-in fade-in">
                                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                                <span>Đang xem trên iPhone</span>
                                            </span>
                                        )}
                                        <BarChart2 size={14} className={previewTab === 'tk' && tkMode === 'gvgs' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'} />
                                    </div>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    PMH Giờ Vàng Giá Sốc
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Bot lọc riêng danh sách Giờ Vàng. Cú pháp nhận mã: gõ <strong>gv + STT [MĐH]</strong> (ví dụ: <code>gv2 87654321</code> hoặc <code>gv1</code>).
                                </p>
                                <div className="text-[10px] text-slate-400 font-mono">
                                    Lệnh tương đương: <code>tk gv</code>
                                </div>
                            </div>
                        </div>

                        {/* Command Issue (Quick claim) */}
                        <div
                            onClick={() => {
                                setPreviewTab('issue');
                            }}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                                previewTab === 'issue'
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/50 shadow-md shadow-emerald-500/10'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/20'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewTab('issue');
                                            setIssueMode('event');
                                        }}
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold transition-all ${
                                            previewTab === 'issue' && issueMode === 'event'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 hover:bg-emerald-200'
                                        }`}
                                        title="Click xem trước lệnh e4 (Event) trên iPhone"
                                    >
                                        e4 12345678
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewTab('issue');
                                            setIssueMode('gvgs');
                                        }}
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold transition-all ${
                                            previewTab === 'issue' && issueMode === 'gvgs'
                                                ? 'bg-sky-600 text-white shadow-xs'
                                                : 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300/60 hover:bg-sky-200'
                                        }`}
                                        title="Click xem trước lệnh gv2 (Giờ Vàng) trên iPhone"
                                    >
                                        gv2 87654321
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {previewTab === 'issue' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300/60 animate-in fade-in">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Đang xem trên iPhone</span>
                                        </span>
                                    )}
                                    <Zap size={14} className={previewTab === 'issue' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                                </div>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Cú Pháp Nhận Mã PMH Siêu Tốc (Gõ &quot;e + STT&quot; hoặc &quot;gv + STT&quot;)
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Nhân viên chỉ cần gửi <strong>e + STT [MĐH]</strong> (Event) hoặc <strong>gv + STT [MĐH]</strong> (Giờ Vàng), Bot lập tức phát mã PMH và tag tên người nhận.
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Live Chat Preview Column (iPhone Mockup) */}
            <div id="iphone-preview-container" className="w-full flex justify-center lg:justify-start">
                <IPhoneChatPreview
                    previewTab={previewTab}
                    onTabChange={setPreviewTab}
                    tkMode={tkMode}
                    onTkModeChange={setTkMode}
                    issueMode={issueMode}
                    onIssueModeChange={setIssueMode}
                    filterNames={filterNames}
                />
            </div>

            {/* Modal chọn người dùng tương tác bot để lọc PMH */}
            <SelectFilterUserModal
                isOpen={isSelectUserModalOpen}
                onClose={() => setIsSelectUserModalOpen(false)}
                interactedUsers={interactedUsers}
                isLoading={isInteractedLoading}
                onRefresh={onRefreshInteracted}
                currentFilterNames={filterNames}
                onToggleName={(name) => {
                    const trimmed = name.trim();
                    if (filterNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
                        handleRemoveName(trimmed);
                    } else {
                        setFilterNames(prev => [...prev, trimmed]);
                    }
                }}
                onBatchAddNames={(names) => {
                    const newNames: string[] = [];
                    for (const n of names) {
                        const trimmed = n.trim();
                        if (
                            trimmed &&
                            !filterNames.some(existing => existing.toLowerCase() === trimmed.toLowerCase()) &&
                            !newNames.some(existing => existing.toLowerCase() === trimmed.toLowerCase())
                        ) {
                            newNames.push(trimmed);
                        }
                    }
                    if (newNames.length > 0) {
                        setFilterNames(prev => [...prev, ...newNames]);
                    }
                }}
            />
        </div>
    );
};
