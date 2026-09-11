
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from './Card';
import { TrashIcon, PencilIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import { Select } from '../../../components/shared/ui/Select';
import { Badge } from '../../../components/shared/ui/Badge';
import { DataTable, type DataTableColumn } from '../../../components/shared/ui/DataTable';
import { EmptyState } from '../../../components/shared/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { extractSupermarketList, parseCompetitionDataBySupermarket, isEmployeeName } from '../utils/dashboardHelpers';
import {
    fetchSupermarketMap,
    addSupermarketNameToKho,
    removeSupermarketNameFromKho,
    moveSupermarketNameToKho,
    type SupermarketToKhoMap,
} from '../services/biSupermarketMapService';

interface BiSupermarketMapAdminProps {
    isAdmin: boolean;
    allowedKhos: string[];
    summaryLuyKe: string;
    competitionLuyKe: string;
}

interface KhoInputProps {
    isAdmin: boolean;
    allowedKhos: string[];
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}

/**
 * Ô chọn Mã Kho theo role — component ĐỘC LẬP ở module scope (KHÔNG được định nghĩa lồng bên
 * trong BiSupermarketMapAdmin — nếu lồng bên trong, mỗi lần component cha re-render (VD mỗi
 * keystroke khi gõ) sẽ tạo ra 1 function reference MỚI cho "KhoInput", khiến React coi đây là
 * 1 loại component khác, unmount rồi mount lại <input> DOM — mất focus ngay sau khi gõ đúng 1
 * ký tự. Bug này đã xảy ra thật, user báo cáo "vừa gõ 1 số bị văng ra").
 */
const KhoInput: React.FC<KhoInputProps> = ({ isAdmin, allowedKhos, value, onChange, disabled }) => {
    if (isAdmin) {
        return (
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
                placeholder="Mã Kho"
                inputMode="numeric"
                fullWidth={false}
                className="text-xs w-24"
                disabled={disabled}
            />
        );
    }
    if (allowedKhos.length <= 1) {
        return <Badge variant="info" size="md">{allowedKhos[0] ?? '—'}</Badge>;
    }
    return (
        <Select
            value={value || allowedKhos[0]}
            onChange={(e) => onChange(e.target.value)}
            options={allowedKhos.map(k => ({ value: k, label: k }))}
            fullWidth={false}
            className="text-xs w-24"
            disabled={disabled}
        />
    );
};

/**
 * Màn quản trị bảng map "tên siêu thị trong báo cáo Report BI" → "Mã Kho" — hiển thị cho
 * admin/manager (gate canManageSharedBiData ở component cha DataUpdater.tsx). Admin sửa/xoá
 * được mọi dòng; Quản lý chỉ sửa/xoá được dòng thuộc ĐÚNG (các) Mã Kho của mình (allowedKhos —
 * Firestore Rules là lớp chặn thật sự, kiểm tra client-side ở đây chỉ để UX phản hồi nhanh).
 * implementation_plan.md mục "Đợt 4" + "Quản lý tự cấu hình bảng map". biDataService.ts dùng
 * bảng này để biết dán dữ liệu chia sẻ vào biData/{maKho} nào — thiếu mục nào thì siêu thị đó
 * bị BỎ QUA khi dán (cảnh báo qua skippedNames).
 */
const BiSupermarketMapAdmin: React.FC<BiSupermarketMapAdminProps> = ({ isAdmin, allowedKhos, summaryLuyKe, competitionLuyKe }) => {
    const [map, setMap] = useState<SupermarketToKhoMap>({});
    const [isLoading, setIsLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    // Mặc định thu gọn toàn bộ khu vực cấu hình — chỉ hiện 1 dòng trạng thái (cảnh báo đỏ nếu
    // có siêu thị chưa khai báo Mã Kho, im lặng nếu đã đủ), bấm vào mới mở ra để cấu hình.
    const [isExpanded, setIsExpanded] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [tableOpen, setTableOpen] = useState(false);

    const [newName, setNewName] = useState('');
    const [newKho, setNewKho] = useState('');

    const [editingName, setEditingName] = useState<string | null>(null);
    const [editingKho, setEditingKho] = useState('');

    const [unmappedKho, setUnmappedKho] = useState<Record<string, string>>({});

    const [deletingName, setDeletingName] = useState<string | null>(null);

    useEffect(() => {
        fetchSupermarketMap()
            .then(setMap)
            .catch(err => { console.error('[BiSupermarketMapAdmin] Lỗi tải bảng map:', err); toast.error('Không tải được bảng map siêu thị.'); })
            .finally(() => setIsLoading(false));
    }, []);

    // Tên siêu thị đã xuất hiện trong dữ liệu Báo cáo Tổng hợp/Thi đua vừa dán ở DataUpdater.tsx
    // (state IndexedDB, truyền xuống qua props) mà CHƯA có trong bảng map — hiển thị nổi bật để
    // admin/manager chỉ cần điền Mã Kho + Lưu, không cần gõ tay tên (giảm rủi ro gõ sai khiến
    // không khớp nguyên văn cột đầu báo cáo).
    const pastedNames = useMemo(() => {
        const fromSummary = extractSupermarketList(summaryLuyKe);
        const fromCompetition = Object.keys(parseCompetitionDataBySupermarket(competitionLuyKe))
            .filter(n => n.toUpperCase() !== 'TỔNG' && !isEmployeeName(n));
        return Array.from(new Set([...fromSummary, ...fromCompetition])).filter(n => !isEmployeeName(n));
    }, [summaryLuyKe, competitionLuyKe]);

    const unmappedNames = useMemo(() => pastedNames.filter(name => !map[name]), [pastedNames, map]);

    const canEditRow = (maKho: string) => isAdmin || allowedKhos.includes(maKho);

    // Manager chỉ chọn được trong đúng (các) Kho đã đăng ký (departmentId) — không gõ tay tự do
    // như admin, tránh gõ nhầm Mã Kho không phải của mình.
    const resolveKhoForManager = (typed: string) => (isAdmin ? typed.trim() : (typed || allowedKhos[0] || ''));

    const handleSaveUnmapped = async (name: string) => {
        const maKho = resolveKhoForManager(unmappedKho[name] ?? '');
        if (!maKho) { toast.error('Nhập Mã Kho.'); return; }
        if (!isAdmin && !allowedKhos.includes(maKho)) { toast.error('Bạn chỉ được map vào Kho của mình.'); return; }
        setSavingKey(name);
        try {
            await addSupermarketNameToKho(maKho, name);
            setMap(prev => ({ ...prev, [name]: maKho }));
            setUnmappedKho(prev => { const next = { ...prev }; delete next[name]; return next; });
            toast.success(`Đã map "${name}" → Kho ${maKho}.`);
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi lưu:', err);
            toast.error('Lỗi khi lưu — kiểm tra lại quyền của bạn với Kho này.');
        } finally {
            setSavingKey(null);
        }
    };

    const handleAdd = async () => {
        const name = newName.trim();
        const maKho = resolveKhoForManager(newKho);
        if (!name || !maKho) { toast.error('Nhập đủ tên siêu thị và Mã Kho.'); return; }
        if (map[name]) { toast.error('Tên siêu thị này đã có trong bảng map.'); return; }
        if (!isAdmin && !allowedKhos.includes(maKho)) { toast.error('Bạn chỉ được map vào Kho của mình.'); return; }
        setSavingKey(name);
        try {
            await addSupermarketNameToKho(maKho, name);
            setMap(prev => ({ ...prev, [name]: maKho }));
            setNewName('');
            setNewKho('');
            toast.success('Đã thêm vào bảng map.');
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi thêm:', err);
            toast.error('Lỗi khi lưu — kiểm tra lại quyền của bạn với Kho này.');
        } finally {
            setSavingKey(null);
        }
    };

    const handleSaveEdit = async (name: string) => {
        const oldKho = map[name];
        const newKhoVal = resolveKhoForManager(editingKho);
        if (!newKhoVal) { toast.error('Mã Kho không được để trống.'); return; }
        if (!isAdmin && (!allowedKhos.includes(oldKho) || !allowedKhos.includes(newKhoVal))) {
            toast.error('Bạn chỉ được sửa dòng thuộc Kho của mình.');
            return;
        }
        if (newKhoVal === oldKho) { setEditingName(null); return; }
        setSavingKey(name);
        try {
            await moveSupermarketNameToKho(oldKho, newKhoVal, name);
            setMap(prev => ({ ...prev, [name]: newKhoVal }));
            toast.success('Đã cập nhật Mã Kho.');
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi sửa:', err);
            toast.error('Lỗi khi lưu — kiểm tra lại quyền của bạn với Kho này.');
        } finally {
            setSavingKey(null);
            setEditingName(null);
        }
    };

    const handleDelete = async () => {
        if (!deletingName) return;
        const maKho = map[deletingName];
        if (!isAdmin && !allowedKhos.includes(maKho)) { toast.error('Không có quyền xoá dòng này.'); setDeletingName(null); return; }
        setSavingKey(deletingName);
        try {
            await removeSupermarketNameFromKho(maKho, deletingName);
            setMap(prev => { const next = { ...prev }; delete next[deletingName]; return next; });
            toast.success('Đã xoá khỏi bảng map.');
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi xoá:', err);
            toast.error('Lỗi khi xoá — kiểm tra lại quyền của bạn với Kho này.');
        } finally {
            setSavingKey(null);
            setDeletingName(null);
        }
    };

    const rows = Object.entries(map).map(([name, maKho]) => ({ name, maKho }));

    const columns: DataTableColumn<{ name: string; maKho: string }>[] = [
        {
            id: 'name',
            header: 'Tên siêu thị (đúng nguyên văn trong báo cáo BI)',
            minWidth: '280px',
            cell: (row) => <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{row.name}</span>,
        },
        {
            id: 'maKho',
            header: 'Mã Kho',
            width: '160px',
            cell: (row) => editingName === row.name ? (
                <KhoInput isAdmin={isAdmin} allowedKhos={allowedKhos} value={editingKho} onChange={setEditingKho} disabled={savingKey === row.name} />
            ) : (
                <span className="text-[11px] font-black tabular-nums text-sky-700 dark:text-sky-400">{row.maKho}</span>
            ),
        },
        {
            id: 'action',
            header: '',
            width: '90px',
            align: 'center',
            cell: (row) => !canEditRow(row.maKho) ? (
                <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>
            ) : (
                <div className="flex items-center justify-center gap-1">
                    {editingName === row.name ? (
                        <Button variant="unstyled" size="none" onClick={() => handleSaveEdit(row.name)} className="px-2 py-1 text-[11px] font-bold text-sky-600 hover:bg-sky-50 rounded-md" disabled={savingKey === row.name}>Lưu</Button>
                    ) : (
                        <Button variant="unstyled" size="none" onClick={() => { setEditingName(row.name); setEditingKho(row.maKho); }} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md" title="Sửa Mã Kho">
                            <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button variant="unstyled" size="none" onClick={() => setDeletingName(row.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" title="Xoá">
                        <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    const hasUnmapped = unmappedNames.length > 0;

    return (
        <Card title="Bảng map Siêu thị → Mã Kho" icon="settings-2" noPadding>
            <div className="p-2.5">
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setIsExpanded(v => !v)}
                    className="w-full flex items-center justify-between gap-2 py-1"
                >
                    <span className={`text-[11px] font-bold ${hasUnmapped ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {isLoading ? 'Đang tải...' : hasUnmapped ? `${unmappedNames.length} siêu thị chưa có Mã Kho` : 'Đã cấu hình đủ Mã Kho'}
                    </span>
                    {isExpanded ? <ChevronUpIcon className="h-3 w-3 text-slate-400 shrink-0" /> : <ChevronDownIcon className="h-3 w-3 text-slate-400 shrink-0" />}
                </Button>

                {isExpanded && !isLoading && (
                    <div className="mt-2 space-y-2">
                        {hasUnmapped && (
                            <div className="rounded-md border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/10 p-2 space-y-1.5">
                                {unmappedNames.map(name => (
                                    <div key={name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5">
                                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate" title={name}>{name}</span>
                                        <KhoInput
                                            isAdmin={isAdmin}
                                            allowedKhos={allowedKhos}
                                            value={unmappedKho[name] ?? ''}
                                            onChange={(v) => setUnmappedKho(prev => ({ ...prev, [name]: v }))}
                                            disabled={savingKey === name}
                                        />
                                        <Button size="sm" variant="primary" onClick={() => handleSaveUnmapped(name)} disabled={savingKey === name} className="shrink-0 h-8">
                                            Lưu
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button variant="ghost" size="sm" onClick={() => setManualOpen(v => !v)} leftIcon={<PlusIcon className="h-3.5 w-3.5" />}>
                            {manualOpen ? 'Ẩn thêm thủ công' : 'Thêm siêu thị khác'}
                        </Button>
                        {manualOpen && (
                            <div className="flex flex-col sm:flex-row gap-1.5">
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tên siêu thị (đúng nguyên văn báo cáo BI)" className="text-xs h-8" />
                                <KhoInput isAdmin={isAdmin} allowedKhos={allowedKhos} value={newKho} onChange={setNewKho} disabled={savingKey !== null} />
                                <Button variant="primary" size="sm" onClick={handleAdd} disabled={savingKey !== null} className="shrink-0 h-8">Thêm</Button>
                            </div>
                        )}

                        {rows.length === 0 ? (
                            <EmptyState compact title="Chưa có siêu thị nào trong bảng map" description="Dán dữ liệu Báo cáo để tự nhận diện, hoặc thêm thủ công ở trên." />
                        ) : (
                            <>
                                <Button variant="unstyled" size="none" onClick={() => setTableOpen(v => !v)} className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 py-1">
                                    {tableOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                                    {tableOpen ? 'Thu gọn' : `Xem tất cả ${rows.length} dòng đã map`}
                                </Button>
                                {tableOpen && (
                                    <DataTable columns={columns} data={rows} rowKey={(row) => row.name} compact maxHeight="300px" className="rounded-none" />
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deletingName}
                onClose={() => setDeletingName(null)}
                onConfirm={handleDelete}
                title="Xoá khỏi bảng map?"
                message={`Xoá "${deletingName}" khỏi bảng map. Lần dán tiếp theo, dữ liệu siêu thị này sẽ KHÔNG được chia sẻ cho tới khi thêm lại.`}
                confirmText="Xoá"
                variant="danger"
            />
        </Card>
    );
};

export default BiSupermarketMapAdmin;
