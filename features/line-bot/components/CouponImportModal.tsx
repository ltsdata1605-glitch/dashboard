import React, { useState } from 'react';
import { X, Upload, Download, Sparkles, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Button } from '../../../components/shared/ui/Button';
import { ParsedImportItem } from '../types/lineBot.types';
import { parsePastedCouponList, extractProductSyntax, extractLatestDateFromText, getVietnamTodayString } from '../services/couponParser';

interface CouponImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (items: ParsedImportItem[]) => Promise<{ added: number; skipped: number }>;
    existingTypes: string[];
}

const DEFAULT_TYPES = ['Event', 'Giờ Vàng Giá Sốc', 'CUSTOM'];

export const CouponImportModal: React.FC<CouponImportModalProps> = ({
    isOpen,
    onClose,
    onImport
}) => {
    const [mode, setMode] = useState<'file' | 'paste'>('paste');
    const [selectedType, setSelectedType] = useState<string>('Event');
    const [customType, setCustomType] = useState<string>('');
    const [pasteText, setPasteText] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>('');
    const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
    const [duplicateCount, setDuplicateCount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Nhóm danh sách mã theo Tên Sản Phẩm (Mỗi sản phẩm 1 dòng đại diện)
    const groupedProducts = React.useMemo(() => {
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

    if (!isOpen) return null;

    const effectiveType = selectedType === 'CUSTOM' ? (customType.trim() || 'Event') : selectedType;

    // Tải file mẫu Excel
    const handleDownloadTemplate = () => {
        const sampleData = [
            {
                'Mã Coupon': 'BNXOONE4CM',
                'Tên Sản Phẩm': 'Bộ 3 hộp nhựa chữ nhật Hokkaido',
                'Loại PMH': 'Giờ Vàng Giá Sốc'
            },
            {
                'Mã Coupon': '21UOZG9KHC',
                'Tên Sản Phẩm': 'Quạt đứng Midea FS40-10NAVN(K)',
                'Loại PMH': 'Event'
            },
            {
                'Mã Coupon': 'DMXT8K781T448KG',
                'Tên Sản Phẩm': 'Tủ lạnh Panasonic NR-DZ601VGKV',
                'Loại PMH': 'Event'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap');
        XLSX.writeFile(wb, 'Mau_Nhap_Coupon_PMH.xlsx');
        toast.success('Đã tải file mẫu Excel!');
    };

    // Đọc file Excel / CSV
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json<any>(ws);

                const items: ParsedImportItem[] = [];
                for (const row of data) {
                    const code = String(row['Mã Coupon'] || row['Mã'] || row['Code'] || row['code'] || Object.values(row)[0] || '').trim();
                    const type = String(row['Loại PMH'] || row['Loại'] || row['Type'] || row['type'] || effectiveType).trim();
                    const productName = String(row['Tên Sản Phẩm'] || row['Sản Phẩm'] || row['Tên SP'] || row['Product'] || '').trim();
                    const syntax = String(row['Cú Pháp PMH'] || row['Cú Pháp'] || row['Syntax'] || '').trim();
                    const autoSyntax = syntax || extractProductSyntax(productName) || productName;

                    if (code && code.length >= 3) {
                        items.push({
                            code: code.toUpperCase(),
                            type: type || effectiveType,
                            productName,
                            syntax: autoSyntax
                        });
                    }
                }

                if (items.length === 0) {
                    toast.error('Không tìm thấy mã hợp lệ trong file!');
                } else {
                    setParsedItems(items);
                    toast.success(`Đã đọc ${items.length} mã từ file Excel!`);
                }
            } catch (err) {
                toast.error('Lỗi khi đọc file. Vui lòng kiểm tra định dạng!');
            }
        };
        reader.readAsBinaryString(file);
    };

    // Tự động bóc tách mã khi dán hoặc sửa nội dung
    const autoParseText = (text: string, type: string, explicitExpiry?: string) => {
        if (!text.trim()) {
            setParsedItems([]);
            setDuplicateCount(0);
            return;
        }

        // Tự động dò ngày muộn nhất trong văn bản nếu chưa có ngày hết hạn
        let currentExpiry = explicitExpiry !== undefined ? explicitExpiry : expiryDate;
        if (!currentExpiry) {
            const detectedDate = extractLatestDateFromText(text);
            if (detectedDate) {
                currentExpiry = detectedDate;
                setExpiryDate(detectedDate);
            }
        }

        let dupCount = 0;
        const items = parsePastedCouponList(text, type, () => {
            dupCount++;
        }, currentExpiry);
        setDuplicateCount(dupCount);

        // Lưu giữ lại các cú pháp đã được người dùng gõ trước đó theo từng sản phẩm
        setParsedItems(prev => {
            const existingSyntaxMap = new Map<string, string>();
            for (const it of prev) {
                if (it.productName && it.syntax !== undefined) {
                    existingSyntaxMap.set(it.productName.trim().toLowerCase(), it.syntax);
                }
            }

            return items.map(it => {
                const key = (it.productName || '').trim().toLowerCase();
                const autoSyntax = extractProductSyntax(it.productName || '');
                const existing = existingSyntaxMap.get(key);
                return {
                    ...it,
                    syntax: existing !== undefined ? existing : (it.syntax || autoSyntax || it.productName || ''),
                    expiryDate: currentExpiry || it.expiryDate || undefined
                };
            });
        });
    };

    // Khi người dùng thay đổi ngày hết hạn từ ô chọn ngày
    const handleExpiryDateChange = (newDate: string) => {
        setExpiryDate(newDate);
        setParsedItems(prev => prev.map(item => ({
            ...item,
            expiryDate: newDate || undefined
        })));
    };

    // Khi người dùng thay đổi Loại PMH mặc định, đồng bộ lại loại cho các mã đã bóc tách
    const handleTypeChange = (newType: string) => {
        setSelectedType(newType);
        const nextEffective = newType === 'CUSTOM' ? (customType.trim() || 'Event') : newType;
        if (pasteText.trim()) {
            autoParseText(pasteText, nextEffective);
        } else if (parsedItems.length > 0) {
            setParsedItems(prev => prev.map(it => ({ ...it, type: nextEffective })));
        }
    };


    // Đổi tên sản phẩm cho toàn bộ mã thuộc sản phẩm đó
    const handleProductRename = (oldName: string, newName: string) => {
        const key = oldName.trim().toLowerCase();
        setParsedItems(prev => prev.map(item => {
            const itemProd = (item.productName || 'Sản phẩm chung / Chưa đặt tên').trim().toLowerCase();
            if (itemProd === key) {
                const oldAuto = extractProductSyntax(oldName);
                const shouldAutoUpdate = !item.syntax || item.syntax === oldName || item.syntax === oldAuto;
                const newSyntax = shouldAutoUpdate ? (extractProductSyntax(newName) || newName) : item.syntax;
                return { ...item, productName: newName, syntax: newSyntax };
            }
            return item;
        }));
    };

    // Xoá toàn bộ mã của một sản phẩm khỏi danh sách chuẩn bị nạp
    const handleRemoveProductGroup = (productName: string) => {
        const key = productName.trim().toLowerCase();
        setParsedItems(prev => prev.filter(item => {
            const itemProd = (item.productName || 'Sản phẩm chung / Chưa đặt tên').trim().toLowerCase();
            return itemProd !== key;
        }));
    };

    // Xác nhận nạp vào kho & Xoá sạch dữ liệu sau khi nạp thành công
    const handleConfirmImport = async () => {
        if (parsedItems.length === 0) {
            toast.error('Chưa có mã nào để nạp!');
            return;
        }

        setIsSubmitting(true);
        try {
            const finalItems = parsedItems.map(it => ({
                ...it,
                expiryDate: it.expiryDate || expiryDate || undefined
            }));
            const res = await onImport(finalItems);
            toast.success(`Đã thêm ${res.added} mã vào kho (bỏ qua ${res.skipped} mã trùng)!`);
            // Sau khi nạp thành công: Xoá sạch toàn bộ nội dung đã dán & đã bóc tách
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                        <Upload size={18} className="text-emerald-500" />
                        <span>Nạp Mã PMH Vào Kho</span>
                    </h3>
                    <Button variant="ghost" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
                        <X size={18} />
                    </Button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Mode selector */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setMode('paste')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                mode === 'paste' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                            Dán Danh Sách Mã (Tự Động Bóc Tách)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('file')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                mode === 'file' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                            Nhập Từ File Excel / CSV
                        </button>
                    </div>

                    {/* Default Type Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Loại PMH Mặc Định
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {DEFAULT_TYPES.map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleTypeChange(t)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
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
                                className="mt-2 w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                            />
                        )}
                    </div>

                    {mode === 'paste' ? (
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
                                        <Trash2 size={12} />
                                        <span>Xoá nội dung</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30 relative">
                                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Kéo thả file vào đây hoặc bấm để chọn file
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Hỗ trợ .xlsx, .xls, .csv (Cột: Mã Coupon, Tên Sản Phẩm, Loại PMH)</p>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                                >
                                    <Download size={13} />
                                    <span>Tải file mẫu Excel chuẩn</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grouped Product Preview Table: 1 DÒNG ĐẠI DIỆN CHO MỖI SẢN PHẨM */}
                    {parsedItems.length > 0 && (
                        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 flex-wrap">
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    <span>
                                        Đã sẵn sàng nạp: <strong className="text-emerald-700 dark:text-emerald-300 font-extrabold">{parsedItems.length} mã</strong> ({groupedProducts.length} sản phẩm) (Loại: {effectiveType})
                                    </span>
                                    {duplicateCount > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-800/60">
                                            ⚡ Tự động loại bỏ {duplicateCount} mã trùng lặp
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="max-h-64 overflow-y-auto border border-emerald-200/70 dark:border-emerald-900/30 rounded-lg bg-white dark:bg-slate-900 shadow-xs">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] z-10">
                                        <tr>
                                            <th className="p-2.5 pl-3 w-12 text-center">STT</th>
                                            <th className="p-2.5 min-w-[280px]">Tên sản phẩm đại diện</th>
                                            <th className="p-2.5 w-32 text-center">Số lượng mã</th>
                                            <th className="p-2.5 pr-3 w-12 text-center">Xoá</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {groupedProducts.map((g, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="p-2.5 pl-3 text-center text-slate-400 font-mono text-[11px]">
                                                    {idx + 1}
                                                </td>
                                                <td className="p-2.5">
                                                    <input
                                                        type="text"
                                                        value={g.productName}
                                                        onChange={e => handleProductRename(g.productName, e.target.value)}
                                                        placeholder="Tên sản phẩm..."
                                                        className="w-full px-2.5 py-1 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded font-semibold text-slate-800 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono">
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
                                                        <Trash2 size={14} />
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

                <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                    {/* Widget Chọn Ngày Hết Hạn - Đặt góc dưới bên trái đúng vị trí khoanh đỏ */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-emerald-500/50 transition-colors">
                            <Calendar size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                                    <X size={13} />
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
                </div>
            </div>
        </div>
    );
};
