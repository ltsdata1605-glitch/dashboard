import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pencil, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs } from '../../components/shared/ui/Tabs';
import { Button } from '../../components/shared/ui/Button';
import { Input } from '../../components/shared/ui/Input';
import type { ReportDraft, SavedReport, Lead, CustomField, ItemGroup, DashboardRange } from './types';
import { createEmptyDraft, emptyCounts, emptyOthers, isValidStaffName } from './catalog';
import { khaiThacDb, newId } from './services/khaiThacDb';
import { buildReportText } from './utils/reportText';
import { streakWarnings, localDateKey } from './utils/aggregate';
import { copyText } from './utils/exportImage';
import { ReportEntryTab } from './components/ReportEntryTab';
import { LeadsTab, isOverdue } from './components/LeadsTab';
import { DashboardTab } from './components/DashboardTab';
import { HistoryTab } from './components/HistoryTab';
import { CustomFieldModal } from './components/CustomFieldModal';

type SubTab = 'entry' | 'leads' | 'dashboard' | 'history';

/** Nháp cũ có thể thiếu trường (bản lưu trước khi thêm nhóm) — vá lại cho đủ hình. */
function normalizeDraft(raw: Partial<ReportDraft> | null, fallbackName: string): ReportDraft {
    const base = createEmptyDraft(fallbackName);
    if (!raw) return base;
    return {
        ...base,
        ...raw,
        staffName: raw.staffName || fallbackName,
        counts: { ...emptyCounts(), ...(raw.counts ?? {}) },
        others: { ...emptyOthers(), ...(raw.others ?? {}) },
        amounts: { ...(raw.amounts ?? {}) },
    };
}

/**
 * "Báo cáo khai thác" — thay cho link ngoài Bao-Cao-Khai-Thac. Mỗi lần bấm Báo cáo = 1 đơn hàng:
 * copy văn bản chuẩn Zalo/Line, ghi Nhật ký, làm sạch form. Dữ liệu lưu IndexedDB trên máy.
 */
export default function KhaiThacView({ isActive }: { isActive?: boolean }) {
    const { employeeName } = useAuth();
    const [tab, setTab] = useState<SubTab>('entry');
    const [draft, setDraft] = useState<ReportDraft>(() => createEmptyDraft(''));
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [fields, setFields] = useState<CustomField[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [fieldModalGroup, setFieldModalGroup] = useState<ItemGroup | null>(null);
    const [range, setRange] = useState<DashboardRange>('today');
    const saveTimer = useRef<number | null>(null);

    // ── Nạp dữ liệu lần đầu ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [d, r, l, f] = await Promise.all([khaiThacDb.loadDraft(), khaiThacDb.listReports(), khaiThacDb.listLeads(), khaiThacDb.loadCustomFields()]);
                if (cancelled) return;
                const normalized = normalizeDraft(d, employeeName ?? '');
                setDraft(normalized);
                setReports(r);
                setLeads(l);
                setFields(f);
                setEditingName(!isValidStaffName(normalized.staffName));
                setNameInput(normalized.staffName);
            } catch (e) {
                console.error('[khai-thac] Không nạp được dữ liệu:', e);
                toast.error('Không đọc được dữ liệu Báo cáo khai thác trên máy này');
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
        // employeeName chỉ dùng làm tên mặc định lúc nạp — không nạp lại khi nó đổi.
    }, []);

    // ── Tự lưu nháp: gõ phím thì gộp 300ms để không ghi IndexedDB mỗi ký tự; thao tác một-nhát
    // (đếm, bật/tắt, Sửa lại, Làm mới) ghi ngay. Rời trang giữa chừng thì xả nốt phần đang chờ.
    const pendingDraft = useRef<ReportDraft | null>(null);
    const flushDraft = useCallback(() => {
        if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
        const next = pendingDraft.current;
        pendingDraft.current = null;
        if (next) khaiThacDb.saveDraft(next).catch(e => console.error('[khai-thac] saveDraft', e));
    }, []);
    const persistDraft = useCallback((next: ReportDraft, immediate: boolean) => {
        pendingDraft.current = next;
        if (immediate) { flushDraft(); return; }
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(flushDraft, 300);
    }, [flushDraft]);
    useEffect(() => {
        window.addEventListener('pagehide', flushDraft);
        return () => { window.removeEventListener('pagehide', flushDraft); flushDraft(); };
    }, [flushDraft]);

    const updateDraft = useCallback((updater: (prev: ReportDraft) => ReportDraft, immediate = true) => {
        setDraft(prev => {
            const next = updater(prev);
            persistDraft(next, immediate);
            return next;
        });
    }, [persistDraft]);

    const onPatch = useCallback((patch: Partial<ReportDraft>) => updateDraft(p => ({ ...p, ...patch }), false), [updateDraft]);
    const onCount = useCallback((group: ItemGroup, key: string, value: number) =>
        updateDraft(p => ({ ...p, counts: { ...p.counts, [group]: { ...p.counts[group], [key]: Math.max(0, value) } } })), [updateDraft]);
    const onAmount = useCallback((key: string, value: string) =>
        updateDraft(p => ({
            ...p,
            amounts: { ...p.amounts, [key]: value },
            // Gõ tiền Ví > 0 thì coi như có Mở Ví — đúng hành vi app gốc.
            moVi: key === 'vi' ? parseFloat(value) > 0 : p.moVi,
        }), false), [updateDraft]);
    const onOther = useCallback((group: ItemGroup, patch: Partial<{ name: string; count: number }>) =>
        updateDraft(p => ({ ...p, others: { ...p.others, [group]: { ...p.others[group], ...patch } } }), patch.name === undefined), [updateDraft]);

    // ── Mục tuỳ chỉnh ──
    const addField = (f: Omit<CustomField, 'id'>) => {
        const field: CustomField = { ...f, id: `cf_${newId()}` };
        const next = [...fields, field];
        setFields(next);
        khaiThacDb.saveCustomFields(next).catch(e => console.error('[khai-thac] saveCustomFields', e));
        toast.success(`Đã thêm mục "${field.name}"`);
    };
    const deleteField = (f: CustomField) => {
        const next = fields.filter(x => x.id !== f.id);
        setFields(next);
        khaiThacDb.saveCustomFields(next).catch(e => console.error('[khai-thac] saveCustomFields', e));
        updateDraft(p => {
            const counts = { ...p.counts, [f.group]: { ...p.counts[f.group] } };
            delete counts[f.group][f.id];
            const amounts = { ...p.amounts };
            delete amounts[f.id];
            return { ...p, counts, amounts };
        });
        toast.success(`Đã xoá mục "${f.name}"`);
    };

    // ── Tên nhân viên ──
    const commitName = () => {
        const v = nameInput.trim();
        if (!isValidStaffName(v)) {
            toast.error('Nhập đúng dạng "Mã - Tên", ví dụ: 21707 - Sơn');
            return;
        }
        onPatch({ staffName: v });
        setEditingName(false);
    };

    // ── Báo cáo (copy + lưu + làm sạch) ──
    const previewText = useMemo(() => buildReportText(draft, fields), [draft, fields]);
    const warnings = useMemo(() => streakWarnings(draft, reports, fields), [draft, reports, fields]);

    const resetForm = () => {
        updateDraft(p => ({ ...createEmptyDraft(p.staffName) }));
        toast.success('Đã làm sạch form, sẵn sàng nhập đơn mới');
    };

    const submitReport = async () => {
        if (!isValidStaffName(draft.staffName)) {
            toast.error('Nhập tên nhân viên dạng "Mã - Tên" trước khi báo cáo');
            setEditingName(true);
            return;
        }
        setIsSaving(true);
        try {
            const text = buildReportText(draft, fields);
            const copied = await copyText(text);
            const report: SavedReport = { ...draft, id: newId(), date: localDateKey(), savedAt: new Date().toISOString() };
            await khaiThacDb.saveReport(report);
            setReports(prev => [...prev, report]);
            updateDraft(p => createEmptyDraft(p.staffName));
            toast.success(copied ? 'Đã copy báo cáo & ghi nhật ký. Dán lên nhóm Zalo/Line nhé!' : 'Đã ghi nhật ký (không copy được — mở Nhật ký để sao chép lại)');
        } catch (e) {
            console.error('[khai-thac] submitReport', e);
            toast.error('Không lưu được đơn hàng');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Nhật ký ──
    const editReport = (r: SavedReport) => {
        const { id: _id, date: _date, savedAt: _savedAt, ...rest } = r;
        updateDraft(() => normalizeDraft(rest, draft.staffName));
        setTab('entry');
        toast.success('Đã tải lại đơn để sửa — bấm Báo cáo để ghi thành đơn mới');
    };
    const deleteReport = async (id: string) => {
        await khaiThacDb.deleteReport(id).catch(e => console.error('[khai-thac] deleteReport', e));
        setReports(prev => prev.filter(r => r.id !== id));
        toast.success('Đã xoá đơn hàng');
    };
    const clearAll = async () => {
        try {
            await khaiThacDb.clearAll();
            setReports([]); setLeads([]); setFields([]);
            setDraft(createEmptyDraft(draft.staffName));
            toast.success('Đã xoá toàn bộ dữ liệu Báo cáo khai thác trên máy này');
        } catch (e) {
            console.error('[khai-thac] clearAll', e);
            toast.error('Không xoá được dữ liệu');
        }
    };

    // ── Khách hàng ──
    const addLead = (l: Pick<Lead, 'name' | 'phone' | 'product' | 'notes'>) => {
        const lead: Lead = { ...l, id: newId(), status: 'Chưa liên hệ', statusDetails: '', createdAt: Date.now(), updatedAt: Date.now() };
        setLeads(prev => [...prev, lead]);
        khaiThacDb.saveLead(lead).catch(e => console.error('[khai-thac] saveLead', e));
        toast.success(`Đã thêm khách ${lead.name}`);
    };
    const updateLead = (lead: Lead) => {
        setLeads(prev => prev.map(x => (x.id === lead.id ? lead : x)));
        khaiThacDb.saveLead(lead).catch(e => console.error('[khai-thac] saveLead', e));
    };
    const removeLead = (id: string) => {
        setLeads(prev => prev.filter(x => x.id !== id));
        khaiThacDb.deleteLead(id).catch(e => console.error('[khai-thac] deleteLead', e));
        toast.success('Đã xoá khách hàng');
    };

    // Nhắc khách quá 2h chưa liên hệ — một lần mỗi lần mở tab (không lặp mỗi phút như app gốc).
    const overdueCount = leads.filter(l => isOverdue(l)).length;
    useEffect(() => {
        if (isActive === false || !loaded || overdueCount === 0) return;
        toast(`${overdueCount} khách quá 2 giờ chưa cập nhật trạng thái`, { id: 'khai-thac-overdue', icon: '⏰' });
        // Chỉ nhắc khi tab được mở, không nhắc lại khi số đổi.
    }, [isActive, loaded]);

    const tabItems = [
        { id: 'entry', label: 'Nhập báo cáo' },
        { id: 'leads', label: 'Khách hàng', badge: leads.length || undefined },
        { id: 'dashboard', label: 'Biểu đồ' },
        { id: 'history', label: 'Nhật ký', badge: reports.length || undefined },
    ];

    // Khung chung 960px với Report BI (BiWrapper main) và Check thưởng: rộng tối đa 960, đệm ngang 32px desktop, không đệm trên.
    return (
        <div className="w-full max-w-[960px] mx-auto px-2 sm:px-4 lg:px-8 pt-2 pb-4 lg:pb-8 space-y-3" data-testid="khai-thac-view">
            {/* Thanh điều hướng con + tên nhân viên */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <Tabs items={tabItems} activeId={tab} onChange={id => setTab(id as SubTab)} variant="underline" size="sm" />
                <div className="flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" />
                    {editingName ? (
                        <>
                            <Input autoFocus placeholder="Mã - Tên (VD: 21707 - Sơn)" value={nameInput} onChange={e => setNameInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') commitName(); }} fullWidth={false} aria-label="Tên nhân viên"
                                className="h-8 rounded w-56 text-[13px]" data-testid="staff-name-input" />
                            <Button variant="primary" size="icon" className="h-8 w-8 rounded" onClick={commitName} aria-label="Lưu tên"><Check size={14} /></Button>
                        </>
                    ) : (
                        <Button variant="secondary" size="sm" className="h-8 rounded gap-1.5" onClick={() => { setNameInput(draft.staffName); setEditingName(true); }} title="Đổi tên nhân viên" data-testid="staff-name">
                            <span className="font-semibold text-slate-800">{draft.staffName || 'Chưa có tên'}</span>
                            <Pencil size={12} className="text-slate-400" />
                        </Button>
                    )}
                </div>
            </div>

            {!loaded ? (
                <div className="border border-slate-200 bg-white h-40 animate-pulse" />
            ) : (
                <>
                    {tab === 'entry' && (
                        <ReportEntryTab draft={draft} fields={fields} warnings={warnings} previewText={previewText} isSaving={isSaving}
                            onPatch={onPatch} onCount={onCount} onAmount={onAmount} onOther={onOther}
                            onAddField={setFieldModalGroup} onDeleteField={deleteField} onReset={resetForm} onSubmit={submitReport} />
                    )}
                    {tab === 'leads' && <LeadsTab leads={leads} staffName={draft.staffName} onAdd={addLead} onUpdate={updateLead} onRemove={removeLead} />}
                    {tab === 'dashboard' && <DashboardTab reports={reports} fields={fields} staffName={draft.staffName} range={range} onRangeChange={setRange} />}
                    {tab === 'history' && <HistoryTab reports={reports} fields={fields} onEdit={editReport} onDelete={deleteReport} onClearAll={clearAll} />}
                </>
            )}

            <CustomFieldModal group={fieldModalGroup} onClose={() => setFieldModalGroup(null)} onSave={addField} />
        </div>
    );
}
