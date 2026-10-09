import React, { useState, useMemo } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Modal } from '../../../components/shared/ui/Modal';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { Coupon, ParsedImportItem } from '../types/lineBot.types';
import { parsePastedCouponList, extractProductSyntax, extractLatestDateFromText, getVietnamTodayString } from '../services/couponParser';
import { downloadCouponSampleTemplate, readCouponExcelFile } from '../services/couponTemplateService';

interface CouponImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (items: ParsedImportItem[]) => Promise<{ added: number; skipped: number }>;
    existingTypes: string[];
    coupons?: Coupon[];
    onDeleteBatch?: (couponIds: string[]) => Promise<number>;
}

interface ImportBatch {
    id: string;
    importedAt: string;
    rawDate: string;
    total: number;
    unused: number;
    sent: number;
    revoked: number;
    types: string[];
    productSummary: string;
    sampleCodes: string[];
    expiryDate?: string;
    couponIds: string[];
}

const DEFAULT_TYPES = ['Event', 'Giờ Vàng Giá Sốc', 'CUSTOM'];

export const CouponImportModal: React.FC<CouponImportModalProps> = ({
    isOpen,
    onClose,
    onImport,
    coupons = [],
    onDeleteBatch
}) => {
    const [mode, setMode] = useState<'paste' | 'history'>('paste');
    const [selectedType, setSelectedType] = useState<string>('Event');
    const [customType, setCustomType] = useState<string>('');
    const [pasteText, setPasteText] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>('');
    const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
    const [duplicateCount, setDuplicateCount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isExportingTemplate, setIsExportingTemplate] = useState<boolean>(false);
    const [isReadingExcel, setIsReadingExcel] = useState<boolean>(false);

    const handleExportTemplate = async () => {
        try {
            setIsExportingTemplate(true);
            await downloadCouponSampleTemplate();
            toast.success('Đã tải xuống file Excel mẫu nạp mã PMH!');
        } catch (error) {
            console.error('[CouponImportModal] Lỗi xuất file mẫu:', error);
            toast.error('Không thể xuất file mẫu. Vui lòng thử lại!');
        } finally {
            setIsExportingTemplate(false);
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsReadingExcel(true);
            const tsvText = await readCouponExcelFile(file);
            if (!tsvText.trim()) {
                toast.error('File Excel không có dữ liệu mã PMH hợp lệ!');
                return;
            }
            setPasteText(tsvText);
            autoParseText(tsvText, effectiveType);
            toast.success(`Đã nạp dữ liệu từ file Excel: ${file.name}`);
        } catch (error) {
            console.error('[CouponImportModal] Lỗi đọc file Excel:', error);
            toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file!');
        } finally {
            setIsReadingExcel(false);
            e.target.value = '';
        }
    };

    // State cho xoá đợt nạp
    const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
    const [batchToDelete, setBatchToDelete] = useState<ImportBatch | null>(null);

    // Bóc tách & nhóm danh sách mã theo Tên Sản Phẩm (Mỗi sản phẩm 1 dòng đại diện khi nạp)
    const groupedProducts = useMemo(() => {
        const map = new Map<string, {
            productName: string;
            count: number;
            sampleCodes: string[];
            syntax: string;
        }>();

        for (const item of parsedItems) {
            const rawName = (item.productName || '').trim();
            const displayName = rawName || 'Sản phẩm chung / Chưa đặt tên';
            const key = displayName.toLowerCase();

            if (!map.has(key)) {
                map.set(key, {
                    productName: displayName,
                    count: 1,
                    sampleCodes: [item.code],
                    syntax: item.syntax !== undefined ? item.syntax : (extractProductSyntax(displayName) || displayName)
                });
            } else {
                const g = map.get(key)!;
                g.count++;
                if (g.sampleCodes.length < 3) {
                    g.sampleCodes.push(item.code);
                }
                if (g.syntax === undefined && item.syntax !== undefined) {
                    g.syntax = item.syntax;
                }
            }
        }

        return Array.from(map.values());
    }, [parsedItems]);

    // Bóc tách và nhóm các đợt nạp từ kho coupons hiện tại
    const importBatches = useMemo(() => {
        if (!coupons || coupons.length === 0) return [];

        const map = new Map<string, {
            batchKey: string;
            importedAt: string;
            coupons: Coupon[];
        }>();

        for (const c of coupons) {
            // Nhóm theo importBatchId nếu có, hoặc theo createdAt cắt đến phút
            let key = c.importBatchId;
            if (!key) {
                key = c.createdAt ? c.createdAt.slice(0, 16) : 'batch_legacy';
            }
            if (!map.has(key)) {
                map.set(key, {
                    batchKey: key,
                    importedAt: c.createdAt || new Date().toISOString(),
                    coupons: []
                });
            }
            map.get(key)!.coupons.push(c);
        }

        const batches: ImportBatch[] = [];
        for (const [key, val] of map.entries()) {
            const batchCoupons = val.coupons;
            const total = batchCoupons.length;
            let unused = 0;
            let sent = 0;
            let revoked = 0;
            const typeSet = new Set<string>();
            const productCounts = new Map<string, number>();
            const sampleCodes: string[] = [];
            let expDate = '';

            for (const c of batchCoupons) {
                if (c.status === 'UNUSED' || !c.status) unused++;
                else if (c.status === 'SENT') sent++;
                else if (c.status === 'REVOKED') revoked++;

                if (c.type) typeSet.add(c.type);
                const pName = c.productName?.trim() || 'Sản phẩm chung';
                productCounts.set(pName, (productCounts.get(pName) || 0) + 1);

                if (sampleCodes.length < 4 && c.code) {
                    sampleCodes.push(c.code);
                }
                if (!expDate && c.expiryDate) {
                    expDate = c.expiryDate;
                }
            }

            const productSummary = Array.from(productCounts.entries())
                .map(([name, count]) => `${name} (${count} mã)`)
                .join(', ');

            batches.push({
                id: key,
                importedAt: val.importedAt,
                rawDate: val.importedAt,
                total,
                unused,
                sent,
                revoked,
                types: Array.from(typeSet),
                productSummary: productSummary || 'Mã PMH',
                sampleCodes,
                expiryDate: expDate,
                couponIds: batchCoupons.map(c => c.id)
            });
        }

        // Sắp xếp đợt mới nhất lên trên
        batches.sort((a, b) => (b.rawDate > a.rawDate ? 1 : -1));
        return batches;
    }, [coupons]);

    const effectiveType = selectedType === 'CUSTOM' ? (customType.trim() || 'Event') : selectedType;

    // Tự động bóc tách mã khi dán hoặc sửa nội dung
    const autoParseText = (text: string, type: string, explicitExpiry?: string) => {
        if (!text.trim()) {
            setParsedItems([]);
            setDuplicateCount(0);
            return;
        }

        let dup = 0;
        const activeExpiry = explicitExpiry !== undefined ? explicitExpiry : expiryDate;
        const items = parsePastedCouponList(text, type, () => { dup++; }, activeExpiry);

        if (explicitExpiry === undefined && !expiryDate) {
            const detectedDate = extractLatestDateFromText(text);
            if (detectedDate) {
                const todayVN = getVietnamTodayString();
                if (detectedDate >= todayVN) {
                    setExpiryDate(detectedDate);
                    let dupRe = 0;
                    const reParsed = parsePastedCouponList(text, type, () => { dupRe++; }, detectedDate);
                    setParsedItems(reParsed);
                    setDuplicateCount(dupRe);
                    return;
                }
            }
        }

        setParsedItems(items);
        setDuplicateCount(dup);
    };

    // Khi người dùng thay đổi loại PMH
    const handleTypeChange = (newType: string) => {
        setSelectedType(newType);
        const resolvedType = newType === 'CUSTOM' ? (customType.trim() || 'Event') : newType;
        if (pasteText.trim()) {
            autoParseText(pasteText, resolvedType);
        }
    };

    // Khi người dùng thay đổi ngày hết hạn
    const handleExpiryDateChange = (newDate: string) => {
        setExpiryDate(newDate);
        if (pasteText.trim()) {
            autoParseText(pasteText, effectiveType, newDate);
        }
    };

    // Chỉnh sửa cú pháp cho 1 nhóm sản phẩm
    const handleSyntaxChange = (productName: string, newSyntax: string) => {
        setParsedItems(prev => prev.map(item => {
            const curName = (item.productName || '').trim() || 'Sản phẩm chung / Chưa đặt tên';
            if (curName.toLowerCase() === productName.toLowerCase()) {
                return { ...item, syntax: newSyntax.trim() };
            }
            return item;
        }));
    };

    // Xoá 1 nhóm sản phẩm khỏi danh sách chuẩn bị nạp
    const handleRemoveProductGroup = (productName: string) => {
        setParsedItems(prev => prev.filter(item => {
            const curName = (item.productName || '').trim() || 'Sản phẩm chung / Chưa đặt tên';
            return curName.toLowerCase() !== productName.toLowerCase();
        }));
    };

    // Xác nhận nạp mã vào kho
    const handleConfirmImport = async () => {
        if (parsedItems.length === 0) {
            toast.error('Không có mã nào để nạp!');
            return;
        }

        setIsSubmitting(true);
        try {
            const itemsWithExpiry = parsedItems.map(item => ({
                ...item,
                expiryDate: item.expiryDate || expiryDate || undefined
            }));

            const res = await onImport(itemsWithExpiry);
            if (res.added > 0) {
                toast.success(`Đã nạp thành công ${res.added} mã vào kho!${res.skipped > 0 ? ` (Bỏ qua ${res.skipped} mã trùng)` : ''}`);
            } else {
                toast.error('Tất cả các mã đều đã tồn tại trong kho!');
            }
            setPasteText('');
            setParsedItems([]);
            setCustomType('');
            setExpiryDate('');
            onClose();
        } catch (err: any) {
            toast.error('Lỗi khi nạp mã: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xoá nhanh 1 đợt nạp
    const handleDeleteBatch = async (batch: ImportBatch) => {
        if (!onDeleteBatch) {
            toast.error('Tính năng xoá đợt nạp chưa được hỗ trợ');
            return;
        }

        setDeletingBatchId(batch.id);
        try {
            await onDeleteBatch(batch.couponIds);
            setBatchToDelete(null);
        } catch (err: any) {
            toast.error('Lỗi khi xoá đợt nạp: ' + err.message);
        } finally {
            setDeletingBatchId(null);
        }
    };

    return (
        <>
        <Modal
            isOpen={isOpen}
            onClose={() => { if (!isSubmitting) onClose(); }}
            maxWidth="xl"
            ariaLabel="Nạp mã giảm giá"
            title={
                <span className="flex items-center gap-2 min-w-0">
                    <AppIcon name="upload" size="md" className="text-emerald-500 shrink-0" />
                    <span className="truncate">Nạp Mã PMH &amp; Quản Lý Lần Nạp</span>
                </span>
            }
            controls={
                <>
                        {/* Nút 1: Xuất File Mẫu */}
                        <button
                            type="button"
                            onClick={handleExportTemplate}
                            disabled={isExportingTemplate}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] disabled:opacity-50"
                            title="Tải file Excel mẫu (.xlsx) chuẩn để soạn danh sách mã PMH"
                        >
                            <AppIcon name="download" size="xs" className="text-emerald-600 dark:text-emerald-400" />
                            <span>{isExportingTemplate ? 'Đang xuất...' : 'Xuất File Mẫu'}</span>
                        </button>

                        {/* Nút 2: Nhập từ File Excel */}
                        <label
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] ${
                                isReadingExcel ? 'opacity-50 pointer-events-none' : ''
                            }`}
                            title="Chọn file Excel (.xlsx, .xls, .csv) để nạp trực tiếp danh sách mã"
                        >
                            <AppIcon name="upload" size="xs" className="text-emerald-600 dark:text-emerald-400" />
                            <span>{isReadingExcel ? 'Đang nạp file...' : 'Nhập từ File Excel'}</span>
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                onChange={handleExcelUpload}
                                disabled={isReadingExcel}
                            />
                        </label>
                </>
            }
            footer={
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    {mode === 'paste' ? (
                        <>
                            {/* Widget Chọn Ngày Hết Hạn */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-emerald-500/50 transition-colors">
                                    <AppIcon name="calendar" size="md" className="text-emerald-600" />
                                    <label htmlFor="import-expiry-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none whitespace-nowrap">
                                        Hạn dùng:
                                    </label>
                                    <input
                                        id="import-expiry-date"
                                        type="date"
                                        value={expiryDate}
                                        onChange={e => handleExpiryDateChange(e.target.value)}
                                        className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                                        title="Mã sẽ tự động xoá khỏi kho khi bước sang 00:00 ngày hôm sau"
                                    />
                                    {expiryDate && (
                                        <button
                                            type="button"
                                            onClick={() => handleExpiryDateChange('')}
                                            className="p-0.5 text-slate-400 hover:text-rose-500 transition-colors rounded"
                                            title="Xoá hạn dùng (không thời hạn)"
                                        >
                                            <AppIcon name="close" size="sm" />
                                        </button>
                                    )}
                                </div>
                                {expiryDate ? (
                                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                                        Tự xoá khi sang ngày mới
                                    </span>
                                ) : (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                        (Để trống nếu không giới hạn)
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 shrink-0">
                                <Button variant="ghost" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">
                                    Huỷ
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleConfirmImport}
                                    disabled={isSubmitting || parsedItems.length === 0}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                                >
                                    {isSubmitting ? 'Đang nạp...' : `Xác nhận nạp (${parsedItems.length})`}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Đang hiển thị <strong className="text-slate-800 dark:text-white">{importBatches.length}</strong> đợt nạp trong kho
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="secondary" onClick={onClose} className="px-5 py-2 text-xs font-bold rounded-lg">
                                    Đóng
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            }
        >
                <div className="space-y-4">
                    {/* Tab Navigation: Dán mã vs Lịch sử các lần nạp */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setMode('paste')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                mode === 'paste'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <AppIcon name="sparkles" size="sm" />
                            <span>Dán Danh Sách Mã (Tự Động Bóc Tách)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('history')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                mode === 'history'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <AppIcon name="history" size="sm" />
                            <span>Lịch Sử Các Lần Nạp ({importBatches.length} đợt)</span>
                        </button>
                    </div>

                    {/* TAB 1: DÁN DANH SÁCH MÃ */}
                    {mode === 'paste' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            {/* Default Type Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Loại PMH Mặc Định
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DEFAULT_TYPES.map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleTypeChange(t)}
                                            className={`min-h-11 sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                                selectedType === t
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                            }`}
                                        >
                                            {t === 'CUSTOM' ? 'Loại khác...' : t}
                                        </button>
                                    ))}
                                </div>
                                {selectedType === 'CUSTOM' && (
                                    <input
                                        type="text"
                                        value={customType}
                                        onChange={e => {
                                            setCustomType(e.target.value);
                                            if (pasteText.trim()) {
                                                autoParseText(pasteText, e.target.value.trim() || 'Event');
                                            }
                                        }}
                                        placeholder="Nhập tên loại (ví dụ: PMH 50K, PMH Tri Ân)..."
                                        className="min-h-11 sm:min-h-0 mt-2 w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="relative">
                                    <textarea
                                        rows={5}
                                        value={pasteText}
                                        onChange={e => {
                                            const text = e.target.value;
                                            setPasteText(text);
                                            autoParseText(text, effectiveType);
                                        }}
                                        placeholder={`Dán danh sách mã vào đây (Hệ thống sẽ TỰ ĐỘNG TRÍCH XUẤT NGAY sau khi dán):\nNgày 18/09/2026 : Mã Phiếu mua hàng 1 - dùng cho Bếp gas đôi Sunhouse SHB3105MD: CG5BBSGXJ9\nNgày 18/09/2026 : Mã Phiếu mua hàng 2 - dùng cho Bếp gas đôi Sunhouse SHB3105MD: 4P1DXFTUM8`}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                                    />
                                    {pasteText && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPasteText('');
                                                setParsedItems([]);
                                                setDuplicateCount(0);
                                                setExpiryDate('');
                                            }}
                                            className="absolute right-3 top-3 text-[11px] text-slate-400 hover:text-rose-500 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                                            title="Xoá nội dung ô dán"
                                        >
                                            <AppIcon name="delete" size="xs" />
                                            <span>Xoá nội dung</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Bảng xem trước danh sách sản phẩm trích xuất */}
                            {parsedItems.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AppIcon name="success" size="md" className="text-emerald-500" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                                                Đã nhận diện: <strong className="text-emerald-600">{parsedItems.length} mã hợp lệ</strong> ({groupedProducts.length} sản phẩm)
                                            </span>
                                        </div>
                                        {duplicateCount > 0 && (
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                                                Đã tự động loại bỏ {duplicateCount} mã trùng
                                            </span>
                                        )}
                                    </div>

                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                                                    <th className="p-2.5 pl-3 font-semibold">Tên Sản Phẩm ({groupedProducts.length})</th>
                                                    <th className="p-2.5 font-semibold w-44">Cú Pháp Đăng Ký (Gợi ý)</th>
                                                    <th className="p-2.5 font-semibold w-24 text-center">Số Lượng</th>
                                                    <th className="p-2.5 pr-3 font-semibold w-12 text-center">Xoá</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {groupedProducts.map((g, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="p-2.5 pl-3">
                                                            <div className="font-semibold text-slate-800 dark:text-white">
                                                                {g.productName}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                                                                <span>Mã mẫu:</span>
                                                                {g.sampleCodes.slice(0, 2).map((c, i) => (
                                                                    <span key={i} className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-600 dark:text-slate-300">
                                                                        {c}
                                                                    </span>
                                                                ))}
                                                                {g.count > 2 && <span className="text-slate-400">+{g.count - 2} mã</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5">
                                                            <input
                                                                type="text"
                                                                value={g.syntax}
                                                                onChange={e => handleSyntaxChange(g.productName, e.target.value)}
                                                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                                                                placeholder="Nhập cú pháp..."
                                                            />
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full font-bold text-[11px]">
                                                                {g.count} mã
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 pr-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveProductGroup(g.productName)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                                                title={`Xoá toàn bộ ${g.count} mã của sản phẩm này`}
                                                            >
                                                                <AppIcon name="delete" size="sm" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: LỊCH SỬ CÁC LẦN NẠP & XOÁ NHANH */}
                    {mode === 'history' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            {/* Summary banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                                        <AppIcon name="layers" size="md" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-white">
                                            Tổng cộng: {importBatches.length} đợt nạp mã
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Ghi nhận danh sách các lần nạp vào kho để quản lý và xoá nhanh từng đợt khi cần
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40 shrink-0 text-center">
                                    {importBatches.reduce((sum, b) => sum + b.total, 0)} mã tổng cộng
                                </div>
                            </div>

                            {/* Danh sách các đợt nạp */}
                            {importBatches.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                                    <AppIcon name="history" size="state" className="text-slate-300 mb-1" />
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chưa có lịch sử đợt nạp nào trong kho</p>
                                    <p className="text-xs max-w-sm text-slate-400">
                                        Khi bạn dán và nạp mã, các đợt nạp sẽ được lưu trữ và hiển thị tại đây để bạn kiểm soát và xoá nhanh khi cần.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                                    {importBatches.map((batch, index) => (
                                        <div
                                            key={batch.id}
                                            className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                                                        Đợt #{importBatches.length - index}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1">
                                                        <AppIcon name="clock" size="sm" className="text-slate-400" />
                                                        {new Date(batch.importedAt).toLocaleString('vi-VN')}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                                        {batch.total} mã nạp
                                                    </span>
                                                    {batch.unused > 0 && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                                                            {batch.unused} khả dụng
                                                        </span>
                                                    )}
                                                    {batch.sent > 0 && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400">
                                                            {batch.sent} đã cấp
                                                        </span>
                                                    )}
                                                    {batch.expiryDate && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                                                            Hạn: {batch.expiryDate}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium truncate">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                                        [{batch.types.join(', ')}]
                                                    </span>
                                                    <span className="truncate">{batch.productSummary}</span>
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                                    <span className="text-[11px] text-slate-400">Mã mẫu:</span>
                                                    {batch.sampleCodes.map(code => (
                                                        <span key={code} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded font-mono text-[11px]">
                                                            {code}
                                                        </span>
                                                    ))}
                                                    {batch.total > batch.sampleCodes.length && (
                                                        <span className="text-[11px] text-slate-400 font-medium">
                                                            +{batch.total - batch.sampleCodes.length} mã khác
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-2">
                                                <Button
                                                    variant="danger"
                                                    onClick={() => setBatchToDelete(batch)}
                                                    disabled={deletingBatchId === batch.id}
                                                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all flex items-center gap-1.5"
                                                    title="Xoá toàn bộ mã thuộc đợt nạp này"
                                                >
                                                    {deletingBatchId === batch.id ? (
                                                        <AppIcon name="refresh" size="sm" spin />
                                                    ) : (
                                                        <AppIcon name="delete" size="sm" />
                                                    )}
                                                    <span>Xoá đợt này</span>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

        </Modal>

        {/* Xác nhận xoá đợt nạp — ConfirmDialog dùng chung; Escape/đóng không hoạt động khi đang xoá dở */}
        <ConfirmDialog
            isOpen={!!batchToDelete}
            onClose={() => { if (!deletingBatchId) setBatchToDelete(null); }}
            onConfirm={() => { if (batchToDelete) handleDeleteBatch(batchToDelete); }}
            isLoading={!!batchToDelete && deletingBatchId === batchToDelete.id}
            variant="danger"
            zIndex="z-[60]"
            title="Xác nhận xoá đợt nạp?"
            confirmText="Đồng ý xoá đợt này"
            cancelText="Hủy bỏ"
            message={batchToDelete ? (
                <div className="space-y-2 text-left">
                    <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-xs space-y-1.5 text-slate-700">
                            <div>• Đợt nạp: <strong>{new Date(batchToDelete.importedAt).toLocaleString('vi-VN')}</strong></div>
                            <div>• Số lượng mã: <strong className="text-rose-600 font-bold">{batchToDelete.total} mã</strong> ({batchToDelete.unused} khả dụng, {batchToDelete.sent} đã phát)</div>
                            <div>• Sản phẩm: <strong>{batchToDelete.productSummary}</strong></div>
                    </div>
                </div>
            ) : null}
        />
        </>
    );
};
