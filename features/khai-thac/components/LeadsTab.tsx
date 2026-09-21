import React, { useMemo, useRef, useState } from 'react';
import { Phone, Plus, Search, Share2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import { Select } from '../../../components/shared/ui/Select';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import type { Lead, LeadStatus } from '../types';
import { LEAD_STATUSES } from '../types';
import { COUNT_ITEMS } from '../catalog';
import { BandHeader } from './GroupSection';
import { shareElementAsImage } from '../utils/exportImage';

interface LeadsTabProps {
    leads: Lead[];
    staffName: string;
    onAdd: (lead: Pick<Lead, 'name' | 'phone' | 'product' | 'notes'>) => void;
    onUpdate: (lead: Lead) => void;
    onRemove: (id: string) => void;
}

export const OVERDUE_MS = 2 * 60 * 60 * 1000;
export const isOverdue = (l: Lead, now = Date.now()) => l.status === 'Chưa liên hệ' && now - l.createdAt > OVERDUE_MS;

/** Vạch 3px mép trái mã hoá trạng thái chăm sóc — thay cho pill, đúng chuẩn ca trực. */
const STATUS_STRIPE: Record<LeadStatus, string> = {
    'Chưa liên hệ': 'border-l-rose-500',
    'Đã liên hệ': 'border-l-sky-500',
    'Đã chốt': 'border-l-emerald-600',
    'Tham khảo': 'border-l-amber-500',
    'Từ chối': 'border-l-slate-400',
};

const DETAIL_LABEL: Partial<Record<LeadStatus, string>> = {
    'Đã liên hệ': 'Nội dung trao đổi',
    'Đã chốt': 'Thông tin chốt (giao chiều, cọc 500k…)',
    'Từ chối': 'Lý do từ chối',
};

const ago = (ts: number, now: number) => {
    const m = Math.max(0, Math.round((now - ts) / 60000));
    if (m < 60) return `${m} phút`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}g${String(m % 60).padStart(2, '0')}`;
    return `${Math.floor(h / 24)} ngày`;
};

export const LeadsTab: React.FC<LeadsTabProps> = ({ leads, staffName, onAdd, onUpdate, onRemove }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [picked, setPicked] = useState<string[]>([]);
    const [customProduct, setCustomProduct] = useState('');
    const [notes, setNotes] = useState('');
    const [search, setSearch] = useState('');
    const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const now = Date.now();

    const productOptions = COUNT_ITEMS.products.map(i => i.label);
    const togglePick = (label: string) => setPicked(p => (p.includes(label) ? p.filter(x => x !== label) : [...p, label]));

    const errors = {
        name: name.trim() ? '' : 'Nhập tên khách',
        phone: phone.trim() ? '' : 'Nhập số điện thoại',
        product: picked.length || customProduct.trim() ? '' : 'Chọn ít nhất 1 sản phẩm',
    };
    const canAdd = !errors.name && !errors.phone && !errors.product;

    const submit = () => {
        if (!canAdd) return;
        const products = [...picked, ...(customProduct.trim() ? [customProduct.trim()] : [])];
        onAdd({ name: name.trim(), phone: phone.trim(), product: products.join(', '), notes: notes.trim() });
        setName(''); setPhone(''); setPicked([]); setCustomProduct(''); setNotes('');
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = q
            ? leads.filter(l => l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.product.toLowerCase().includes(q) || l.status.toLowerCase().includes(q))
            : leads;
        return [...rows].sort((a, b) => b.createdAt - a.createdAt);
    }, [leads, search]);

    const overdueCount = leads.filter(l => isOverdue(l, now)).length;

    return (
        <div className="lg:grid lg:grid-cols-12 lg:gap-3 space-y-3 lg:space-y-0">
            {/* Form thêm khách */}
            <section className="lg:col-span-4 border border-slate-200 bg-white self-start" data-testid="lead-form">
                <BandHeader icon="user" title="Thêm khách hàng" />
                <div className="p-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label htmlFor="lead-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tên khách</label>
                            <Input id="lead-name" placeholder="Nguyễn Văn A" value={name} onChange={e => setName(e.target.value)} className="h-9 rounded text-[13px]" />
                        </div>
                        <div>
                            <label htmlFor="lead-phone" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Số điện thoại</label>
                            <Input id="lead-phone" type="tel" inputMode="numeric" placeholder="09xx…" value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="h-9 rounded text-[13px] tabular-nums" />
                        </div>
                    </div>
                    <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sản phẩm quan tâm</span>
                        <div className="flex flex-wrap gap-1.5">
                            {productOptions.map(label => {
                                const on = picked.includes(label);
                                return (
                                    <Button key={label} variant="secondary" size="sm" onClick={() => togglePick(label)} aria-pressed={on}
                                        className={`rounded h-8 px-2.5 text-[12px] ${on ? 'border-sky-400 bg-sky-50 text-sky-700' : ''}`}>
                                        {label}
                                    </Button>
                                );
                            })}
                        </div>
                        <Input placeholder="Sản phẩm khác…" value={customProduct} onChange={e => setCustomProduct(e.target.value)} className="h-8 rounded text-[13px] mt-1.5" aria-label="Sản phẩm khác" />
                    </div>
                    <div>
                        <label htmlFor="lead-notes" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Ghi chú</label>
                        <Input id="lead-notes" placeholder="Ghi chú khách hàng…" value={notes} onChange={e => setNotes(e.target.value)} className="h-8 rounded text-[13px]"
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
                    </div>
                    <Button variant="primary" onClick={submit} disabled={!canAdd} leftIcon={<Plus size={14} />} className="w-full rounded h-10 lg:h-9" data-testid="btn-add-lead"
                        title={canAdd ? undefined : Object.values(errors).filter(Boolean).join(' · ')}>
                        Thêm khách
                    </Button>
                </div>
            </section>

            {/* Danh sách */}
            <section className="lg:col-span-8 border border-slate-200 bg-white" data-testid="lead-list">
                <BandHeader
                    icon="users"
                    title={<>Danh sách khách hàng <span className="tabular-nums">({leads.length})</span>{staffName ? <span className="ml-2 font-normal normal-case tracking-normal text-slate-500">· {staffName}</span> : null}</>}
                    right={
                        <>
                            <div className="relative hidden sm:block">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input placeholder="Tìm nhanh…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Tìm khách hàng"
                                    className="h-6 w-40 rounded pl-6 pr-2 text-[12px]" fullWidth={false} />
                            </div>
                            {leads.length > 0 && (
                                <Button variant="secondary" size="sm" className="h-6 px-2 rounded text-[11px]" leftIcon={<Share2 size={12} />}
                                    onClick={() => shareElementAsImage(listRef.current, `khach-hang-${new Date().toISOString().slice(0, 10)}.png`, 'Danh sách khách hàng')}>
                                    Xuất ảnh
                                </Button>
                            )}
                        </>
                    }
                />
                {overdueCount > 0 && (
                    <div className="px-3 py-1.5 bg-rose-50 border-b border-rose-200 text-[12px] text-rose-700 flex items-center gap-2" role="alert">
                        <AlertTriangle size={14} /> {overdueCount} khách quá 2 giờ chưa cập nhật trạng thái chăm sóc.
                    </div>
                )}
                <div className="sm:hidden px-2 py-1.5 border-b border-slate-100">
                    <Input placeholder="Tìm nhanh…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 rounded text-[13px]" aria-label="Tìm khách hàng" />
                </div>
                <div ref={listRef} className="bg-white">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-8 text-center text-[13px] text-slate-400">{leads.length === 0 ? 'Chưa có khách hàng nào.' : 'Không tìm thấy khách phù hợp.'}</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {filtered.map((l, idx) => {
                                const overdue = isOverdue(l, now);
                                const detailLabel = DETAIL_LABEL[l.status];
                                return (
                                    <li key={l.id} className={`border-l-[3px] ${STATUS_STRIPE[l.status]} px-2.5 py-1.5 lg:py-1 hover:bg-slate-50`} data-testid="lead-row">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[11.5px] text-slate-400 tabular-nums">#{idx + 1}</span>
                                                    <span className="text-[13px] font-semibold text-slate-900 truncate">{l.name}</span>
                                                    <a href={`tel:${l.phone}`} className="text-[13px] tabular-nums text-sky-700 hover:underline" title="Gọi">{l.phone}</a>
                                                    {l.product && <span className="text-[12px] text-slate-500 truncate" title={l.product}>· {l.product}</span>}
                                                    <span className="text-[11.5px] text-slate-400 tabular-nums">· {ago(l.createdAt, now)} trước</span>
                                                    {overdue && <span className="text-[11px] font-bold text-rose-700">⚠ quá 2h</span>}
                                                </div>
                                                {l.notes && <p className="text-[12px] text-slate-500 truncate" title={l.notes}>Ghi chú: {l.notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <a href={`tel:${l.phone}`} title="Gọi điện" aria-label={`Gọi ${l.name}`}
                                                    className="h-7 w-7 lg:h-6 lg:w-6 inline-flex items-center justify-center border border-slate-300 rounded text-emerald-700 hover:bg-emerald-50">
                                                    <Phone size={12} />
                                                </a>
                                                <a href={`https://zalo.me/${l.phone}`} target="_blank" rel="noreferrer" title="Mở Zalo"
                                                    className="h-7 lg:h-6 px-1.5 inline-flex items-center justify-center border border-slate-300 rounded text-[11px] font-bold text-sky-700 hover:bg-sky-50">
                                                    Zalo
                                                </a>
                                                <Select value={l.status} onChange={e => onUpdate({ ...l, status: e.target.value as LeadStatus, statusDetails: DETAIL_LABEL[e.target.value as LeadStatus] ? l.statusDetails : '', updatedAt: Date.now() })}
                                                    aria-label="Trạng thái" fullWidth={false} className="h-7 lg:h-6 rounded px-2 pr-7 py-0 text-[12px] w-[122px]">
                                                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </Select>
                                                <Button variant="unstyled" size="none" onClick={() => setPendingDelete(l)} title="Xoá khách" aria-label={`Xoá ${l.name}`}
                                                    className="h-7 w-7 lg:h-6 lg:w-6 flex items-center justify-center text-slate-300 hover:text-rose-600">
                                                    <Trash2 size={13} />
                                                </Button>
                                            </div>
                                        </div>
                                        {detailLabel && (
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">{detailLabel}</span>
                                                <Input value={l.statusDetails} onChange={e => onUpdate({ ...l, statusDetails: e.target.value, updatedAt: Date.now() })}
                                                    placeholder="Nhập…" aria-label={detailLabel} className="h-7 lg:h-6 rounded text-[12px]" />
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </section>

            <ConfirmDialog
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={() => { if (pendingDelete) onRemove(pendingDelete.id); setPendingDelete(null); }}
                title="Xoá khách hàng?"
                message={pendingDelete ? <>Xoá <b>{pendingDelete.name}</b> ({pendingDelete.phone}) khỏi danh sách. Không hoàn tác được.</> : ''}
                confirmText="Xoá"
                variant="danger"
            />
        </div>
    );
};

