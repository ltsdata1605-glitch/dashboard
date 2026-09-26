import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from './Card';
import { TrashIcon, PencilIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
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
    summaryRealtime?: string;
    competitionRealtime?: string;
    userId?: string;
}

/**
 * Ô nhập Mã Kho — component ĐỘC LẬP ở module scope tránh unmount / mất focus khi gõ
 */
const KhoInput: React.FC<{
    isAdmin?: boolean;
    allowedKhos?: string[];
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    className?: string;
}> = ({ value, onChange, disabled, className }) => {
    return (
        <Input
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
            placeholder="Mã Kho"
            inputMode="numeric"
            fullWidth={false}
            className={className || "text-xs w-24"}
            disabled={disabled}
        />
    );
};

/**
 * Màn quản trị bảng map "tên siêu thị trong báo cáo Report BI" → "Mã Kho" — cấu hình ĐỘC LẬP THEO TỪNG TÀI KHOẢN.
 * Mỗi tài khoản quản lý bảng map của riêng mình, không ảnh hưởng đến tài khoản khác.
 */
const BiSupermarketMapAdmin: React.FC<BiSupermarketMapAdminProps> = ({
    isAdmin,
    allowedKhos,
    summaryLuyKe,
    competitionLuyKe,
    summaryRealtime,
    competitionRealtime,
    userId
}) => {
    const [map, setMap] = useState<SupermarketToKhoMap>({});
    const [isLoading, setIsLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const [isExpanded, setIsExpanded] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [tableOpen, setTableOpen] = useState(true); // Mặc định mở danh sách để người dùng xem trực quan

    const [newName, setNewName] = useState('');
    const [newKho, setNewKho] = useState('');

    const [editingName, setEditingName] = useState<string | null>(null);
    const [editingKho, setEditingKho] = useState('');

    const [unmappedKho, setUnmappedKho] = useState<Record<string, string>>({});
    const [deletingName, setDeletingName] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        fetchSupermarketMap(userId)
            .then(setMap)
            .catch(err => {
                console.error('[BiSupermarketMapAdmin] Lỗi tải bảng map:', err);
                toast.error('Không tải được bảng map siêu thị.');
            })
            .finally(() => setIsLoading(false));
    }, [userId]);

    // Lắng nghe sự kiện đồng bộ realtime khi tài khoản cập nhật cấu hình map
    useEffect(() => {
        const handleMapChange = (e: CustomEvent<{ userId: string; map: SupermarketToKhoMap }>) => {
            if (!userId || e.detail?.userId === userId) {
                setMap(e.detail.map || {});
            }
        };
        const handleDbChange = (e: CustomEvent<{ key?: string }>) => {
            if (e.detail?.key === 'ALL') {
                setMap({});
            }
        };
        window.addEventListener('bi-supermarket-map-changed', handleMapChange as EventListener);
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => {
            window.removeEventListener('bi-supermarket-map-changed', handleMapChange as EventListener);
            window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
        };
    }, [userId]);

    // Tên siêu thị xuất hiện trong dữ liệu Báo cáo vừa dán (quét cả LK và RT)
    const pastedNames = useMemo(() => {
        const fromSummary = extractSupermarketList(summaryLuyKe || '');
        const fromSummaryRT = extractSupermarketList(summaryRealtime || '');
        const fromCompetition = Object.keys(parseCompetitionDataBySupermarket(competitionLuyKe || ''))
            .filter(n => n.toUpperCase() !== 'TỔNG' && !isEmployeeName(n));
        const fromCompetitionRT = Object.keys(parseCompetitionDataBySupermarket(competitionRealtime || ''))
            .filter(n => n.toUpperCase() !== 'TỔNG' && !isEmployeeName(n));
        return Array.from(new Set([...fromSummary, ...fromSummaryRT, ...fromCompetition, ...fromCompetitionRT])).filter(n => !isEmployeeName(n));
    }, [summaryLuyKe, summaryRealtime, competitionLuyKe, competitionRealtime]);

    const unmappedNames = useMemo(() => pastedNames.filter(name => !map[name]), [pastedNames, map]);

    const handleSaveUnmapped = async (name: string) => {
        const maKho = (unmappedKho[name] ?? (allowedKhos[0] || '')).trim();
        if (!maKho) {
            toast.error('Nhập Mã Kho.');
            return;
        }
        setSavingKey(name);
        try {
            await addSupermarketNameToKho(maKho, name, userId);
            setUnmappedKho(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
            toast.success(`Đã lưu "${name}" → Kho ${maKho}.`);
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi lưu:', err);
            toast.error('Lỗi khi lưu cấu hình.');
        } finally {
            setSavingKey(null);
        }
    };

    const handleAdd = async () => {
        const name = newName.trim();
        const maKho = (newKho || allowedKhos[0] || '').trim();
        if (!name || !maKho) {
            toast.error('Nhập đủ tên siêu thị và Mã Kho.');
            return;
        }
        if (map[name]) {
            toast.error('Tên siêu thị này đã có trong bảng map.');
            return;
        }
        setSavingKey(name);
        try {
            await addSupermarketNameToKho(maKho, name, userId);
            setNewName('');
            setNewKho('');
            toast.success('Đã thêm vào bảng map.');
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi thêm:', err);
            toast.error('Lỗi khi lưu cấu hình.');
        } finally {
            setSavingKey(null);
        }
    };

    const handleSaveEdit = async (name: string) => {
        const oldKho = map[name];
        const newKhoVal = editingKho.trim();
        if (!newKhoVal) {
            toast.error('Mã Kho không được để trống.');
            return;
        }
        if (newKhoVal === oldKho) {
            setEditingName(null);
            return;
        }
        setSavingKey(name);
        try {
            await moveSupermarketNameToKho(oldKho, newKhoVal, name, userId);
            toast.success('Đã cập nhật Mã Kho.');
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi sửa:', err);
            toast.error('Lỗi khi lưu cấu hình.');
        } finally {
            setSavingKey(null);
            setEditingName(null);
        }
    };

    const handleDelete = async () => {
        if (!deletingName) return;
        const nameToDelete = deletingName;
        const maKho = map[nameToDelete];
        setSavingKey(nameToDelete);
        try {
            await removeSupermarketNameFromKho(maKho, nameToDelete, userId);
            setMap(prev => {
                const next = { ...prev };
                delete next[nameToDelete];
                return next;
            });
            toast.success('Đã xoá khỏi bảng map.');
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi xoá:', err);
            toast.error('Lỗi khi xoá cấu hình.');
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
                <KhoInput
                    isAdmin={isAdmin}
                    allowedKhos={allowedKhos}
                    value={editingKho}
                    onChange={setEditingKho}
                    disabled={savingKey === row.name}
                />
            ) : (
                <span className="text-[11px] font-black tabular-nums text-sky-700 dark:text-sky-400">{row.maKho}</span>
            ),
        },
        {
            id: 'action',
            header: '',
            width: '90px',
            align: 'center',
            cell: (row) => (
                <div className="flex items-center justify-center gap-1">
                    {editingName === row.name ? (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => handleSaveEdit(row.name)}
                            className="px-2 py-1 text-[11px] font-bold text-sky-600 hover:bg-sky-50 rounded-md"
                            disabled={savingKey === row.name}
                        >
                            Lưu
                        </Button>
                    ) : (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => { setEditingName(row.name); setEditingKho(row.maKho); }}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md"
                            title="Sửa Mã Kho"
                        >
                            <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={() => setDeletingName(row.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                        title="Xoá"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    const hasUnmapped = unmappedNames.length > 0;

    return (
        <Card
            title="Cập nhật mã kho"
            noPadding
            onHeaderClick={() => setIsExpanded(v => !v)}
            actionButton={
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(v => !v);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors shadow-xs ${
                        hasUnmapped
                            ? 'border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-600 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-400'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                    title={isExpanded ? 'Thu gọn' : 'Mở rộng cấu hình'}
                >
                    <span className="text-[11px] font-bold">
                        {isLoading ? 'Đang tải...' : hasUnmapped ? `${unmappedNames.length} siêu thị chưa có Mã Kho` : 'Đã cấu hình đủ Mã Kho'}
                    </span>
                    {isExpanded ? <ChevronUpIcon className="h-3.5 w-3.5 shrink-0" /> : <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />}
                </Button>
            }
        >
            {isExpanded && !isLoading && (
                <div className="p-2 space-y-1.5">
                    {hasUnmapped && (
                        <div className="rounded-md border border-rose-200/90 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-1 space-y-1">
                            {unmappedNames.map(name => (
                                <div key={name} className="flex items-center justify-between gap-2 py-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                        <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={name}>
                                            {name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <KhoInput
                                            isAdmin={isAdmin}
                                            allowedKhos={allowedKhos}
                                            value={unmappedKho[name] ?? ''}
                                            onChange={(v) => setUnmappedKho(prev => ({ ...prev, [name]: v }))}
                                            disabled={savingKey === name}
                                            className="text-xs w-20 h-7 py-0.5 px-2"
                                        />
                                        <Button
                                            size="none"
                                            variant="primary"
                                            onClick={() => handleSaveUnmapped(name)}
                                            disabled={savingKey === name}
                                            className="shrink-0 h-7 px-3 text-xs font-semibold rounded-md shadow-2xs"
                                        >
                                            {savingKey === name ? '...' : 'Lưu'}
                                        </Button>
                                    </div>
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
                                {tableOpen ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                                {tableOpen ? 'Thu gọn danh sách đã map' : `Xem tất cả ${rows.length} dòng đã map`}
                            </Button>
                            {tableOpen && (
                                <DataTable columns={columns} data={rows} rowKey={(row) => row.name} compact maxHeight="300px" className="rounded-none" />
                            )}
                        </>
                    )}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deletingName}
                onClose={() => setDeletingName(null)}
                onConfirm={handleDelete}
                title="Xoá khỏi bảng map?"
                message={`Xoá "${deletingName}" khỏi bảng map của tài khoản. Dữ liệu siêu thị này sẽ không được map với Mã Kho tương ứng cho tới khi thêm lại.`}
                confirmText="Xoá"
                variant="danger"
            />
        </Card>
    );
};

export default BiSupermarketMapAdmin;
