import React, { useState, useMemo, useEffect } from 'react';
import { Product } from './types';
import { parseCurrency } from './services/fileParser';
import { XIcon, TrashIcon, MinusCircleIcon, PlusCircleIcon } from './Icons';
import { formatCurrency as formatCurrencyForDisplay } from './utils/format';
import { ManualProductDoc } from './services/firebaseService';

export interface ManualProductWithId extends Product {
    firebaseId?: string; // ID from Firestore document
}

interface ManualInputModalProps {
    onClose: () => void;
    onPrintSelected: (products: Product[]) => void;
    onSaveProduct: (product: ManualProductWithId) => Promise<string>; // returns docId
    onDeleteProduct: (docId: string) => void;
    onUpdateProduct: (product: ManualProductWithId) => Promise<void>;
    manualProducts: ManualProductWithId[];
}

const initialFormData = {
    sanPham: '',
    msp: '',
    giaGoc: '',
    giaGiam: '',
    thuongERP: '',
    thuongNong: '',
    khuyenMai: ''
};

interface InputFieldProps {
    name: keyof Omit<typeof initialFormData, 'khuyenMai'>;
    label: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    type?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

const InputField: React.FC<InputFieldProps> = ({ name, label, placeholder, value, onChange, error, required = false, type = 'text', inputMode }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            inputMode={inputMode}
            className={`w-full px-3 py-2 text-base border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${error ? 'border-red-500' : 'border-slate-300'}`}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
);

const ManualInputModal: React.FC<ManualInputModalProps> = ({
    onClose,
    onPrintSelected,
    onSaveProduct,
    onDeleteProduct,
    onUpdateProduct,
    manualProducts,
}) => {
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState<Partial<typeof formData>>({});
    const [editingId, setEditingId] = useState<string | null>(null); // Firebase doc ID being edited
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    const tongThuong = useMemo(() => {
        const erp = parseCurrency(formData.thuongERP);
        const nong = parseCurrency(formData.thuongNong);
        return nong * 0.4 + erp;
    }, [formData.thuongERP, formData.thuongNong]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = new Set(['msp', 'giaGoc', 'giaGiam', 'thuongERP', 'thuongNong']);
        let processedValue = value;
        if (numericFields.has(name)) {
            processedValue = value.replace(/\D/g, '');
        }
        if (name === 'msp' && processedValue === '') {
            setFormData(initialFormData);
        } else {
            setFormData(prev => ({ ...prev, [name]: processedValue }));
        }
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<typeof formData> = {};
        if (!formData.sanPham.trim()) newErrors.sanPham = 'Tên sản phẩm là bắt buộc.';
        if (!formData.msp.trim()) newErrors.msp = 'Mã sản phẩm là bắt buộc.';
        if (!formData.giaGiam.trim()) newErrors.giaGiam = 'Giá bán là bắt buộc.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ADD new product
    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || isSaving) return;
        setIsSaving(true);

        const newProduct: ManualProductWithId = {
            sanPham: formData.sanPham.trim(),
            msp: formData.msp.trim(),
            giaGoc: formatCurrencyForDisplay(parseCurrency(formData.giaGoc)),
            giaGiam: formatCurrencyForDisplay(parseCurrency(formData.giaGiam)),
            khuyenMai: formData.khuyenMai.trim(),
            thuongERP: parseCurrency(formData.thuongERP),
            thuongNong: parseCurrency(formData.thuongNong),
            tongThuong: tongThuong,
            ngayIn: new Date().toLocaleDateString('vi-VN'),
            selected: false,
            quantity: 1,
        };

        // Call parent handler (non-blocking — UI updates immediately)
        onSaveProduct(newProduct);
        setFormData(initialFormData);
        setErrors({});
        setIsSaving(false);
    };

    // EDIT: Load product data into form
    const handleEditProduct = (product: ManualProductWithId) => {
        if (!product.firebaseId) return;
        setEditingId(product.firebaseId);
        setFormData({
            sanPham: product.sanPham,
            msp: product.msp,
            giaGoc: String(parseCurrency(product.giaGoc)),
            giaGiam: String(parseCurrency(product.giaGiam)),
            thuongERP: String(product.thuongERP),
            thuongNong: String(product.thuongNong),
            khuyenMai: product.khuyenMai || '',
        });
        // Scroll form into view
        document.getElementById('manual-form-top')?.scrollIntoView({ behavior: 'smooth' });
    };

    // SAVE edited product
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !editingId || isSaving) return;
        setIsSaving(true);

        const updatedProduct: ManualProductWithId = {
            sanPham: formData.sanPham.trim(),
            msp: formData.msp.trim(),
            giaGoc: formatCurrencyForDisplay(parseCurrency(formData.giaGoc)),
            giaGiam: formatCurrencyForDisplay(parseCurrency(formData.giaGiam)),
            khuyenMai: formData.khuyenMai.trim(),
            thuongERP: parseCurrency(formData.thuongERP),
            thuongNong: parseCurrency(formData.thuongNong),
            tongThuong: tongThuong,
            ngayIn: new Date().toLocaleDateString('vi-VN'),
            selected: false,
            quantity: 1,
            firebaseId: editingId,
        };

        // Call parent handler (non-blocking — UI updates immediately)
        onUpdateProduct(updatedProduct);
        setFormData(initialFormData);
        setEditingId(null);
        setErrors({});
        setIsSaving(false);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData(initialFormData);
        setErrors({});
    };

    // SELECTION
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === manualProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(manualProducts.filter(p => p.firebaseId).map(p => p.firebaseId!)));
        }
    };

    // PRINT
    const handlePrintSelected = () => {
        const selected = manualProducts.filter(p => p.firebaseId && selectedIds.has(p.firebaseId));
        if (selected.length > 0) onPrintSelected(selected);
    };

    const handlePrintAll = () => {
        if (manualProducts.length > 0) onPrintSelected(manualProducts);
    };

    const selectedCount = selectedIds.size;
    const totalQuantity = manualProducts.reduce((acc, p) => {
        if (p.firebaseId && selectedIds.has(p.firebaseId)) return acc + (p.quantity || 1);
        return acc;
    }, 0);

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div
                className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 flex-shrink-0 border-b border-slate-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Nhập thông tin sản phẩm thủ công</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Ngành hàng: <b className="text-indigo-600">Nhóm thủ công</b> • Dữ liệu dùng chung cho mã kho</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors" aria-label="Đóng">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-grow overflow-y-auto">
                    {/* Form */}
                    <form id="manual-form-top" onSubmit={editingId ? handleSaveEdit : handleAddProduct} className="p-5 space-y-3 bg-slate-50 border-b border-slate-200">
                        {editingId && (
                            <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <span className="text-amber-700 font-medium">✏️ Đang chỉnh sửa sản phẩm — Thay đổi thông tin và bấm "Lưu thay đổi"</span>
                                <button type="button" onClick={handleCancelEdit} className="ml-auto text-amber-600 hover:text-amber-800 font-medium text-xs underline">Hủy sửa</button>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InputField name="sanPham" label="Tên sản phẩm" placeholder="Ví dụ: iPhone 15 Pro Max" required value={formData.sanPham} onChange={handleChange} error={errors.sanPham} />
                            <InputField name="msp" label="Mã sản phẩm (MSP)" placeholder="Ví dụ: 123456789" required value={formData.msp} onChange={handleChange} error={errors.msp} type="tel" inputMode="numeric" />
                            <InputField name="giaGoc" label="Giá gốc (nếu có)" placeholder="Nhập số, ví dụ: 34990000" value={formData.giaGoc} onChange={handleChange} error={errors.giaGoc} type="tel" inputMode="numeric" />
                            <InputField name="thuongERP" label="Thưởng ERP (nếu có)" placeholder="Nhập số, ví dụ: 50000" value={formData.thuongERP} onChange={handleChange} error={errors.thuongERP} type="tel" inputMode="numeric" />
                            <InputField name="thuongNong" label="Thưởng Nóng (nếu có)" placeholder="Nhập số, ví dụ: 100000" value={formData.thuongNong} onChange={handleChange} error={errors.thuongNong} type="tel" inputMode="numeric" />
                            <InputField name="giaGiam" label="Giá bán" placeholder="Nhập số, ví dụ: 29990000" required value={formData.giaGiam} onChange={handleChange} error={errors.giaGiam} type="tel" inputMode="numeric" />
                        </div>
                        <div>
                            <label htmlFor="khuyenMai" className="block text-sm font-medium text-slate-700 mb-1">Khuyến mãi (nếu có)</label>
                            <textarea
                                id="khuyenMai" name="khuyenMai" value={formData.khuyenMai} onChange={handleChange}
                                placeholder="Nội dung khuyến mãi..." rows={1}
                                className="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <div className="text-sm">
                                <span className="text-slate-600">Tổng thưởng tạm tính: </span>
                                <span className="font-bold text-violet-600">{formatCurrencyForDisplay(tongThuong)}</span>
                            </div>
                            {editingId ? (
                                <div className="flex gap-2">
                                    <button type="button" onClick={handleCancelEdit} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-100 h-10 px-4 py-2">
                                        Hủy sửa
                                    </button>
                                    <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 h-10 px-6 py-2 disabled:opacity-50">
                                        {isSaving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                                    </button>
                                </div>
                            ) : (
                                <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-blue-50 hover:bg-blue-700 h-10 px-6 py-2 disabled:opacity-50">
                                    {isSaving ? 'Đang lưu...' : 'Thêm sản phẩm'}
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Product list */}
                    <div className="px-5 py-4">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    Danh sách sản phẩm ({manualProducts.length})
                                </h3>
                                {manualProducts.length > 0 && (
                                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === manualProducts.length && manualProducts.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Chọn tất cả
                                    </label>
                                )}
                            </div>
                            <span className="text-xs text-indigo-600 font-medium">Lưu trên Firebase</span>
                        </div>

                        {manualProducts.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                <p>Chưa có sản phẩm nào. Nhập thông tin ở trên và bấm "Thêm sản phẩm".</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {manualProducts.map((p) => {
                                    const isSelected = p.firebaseId ? selectedIds.has(p.firebaseId) : false;
                                    const isEditing = p.firebaseId === editingId;
                                    return (
                                        <div
                                            key={p.firebaseId || p.msp}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                                                isEditing
                                                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                                                    : isSelected
                                                    ? 'bg-indigo-50 border-indigo-200'
                                                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => p.firebaseId && toggleSelection(p.firebaseId)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                                            />

                                            {/* Product info - clickable for edit */}
                                            <div
                                                className="flex-grow min-w-0"
                                                onClick={() => handleEditProduct(p)}
                                                title="Click để chỉnh sửa"
                                            >
                                                <p className="font-semibold text-slate-800 truncate">{p.sanPham}</p>
                                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                                                    <span>MSP: <b>{p.msp}</b></span>
                                                    {p.giaGoc && <span>Gốc: {p.giaGoc}</span>}
                                                    <span className="text-green-600 font-semibold">Bán: {p.giaGiam}</span>
                                                    {(p.thuongERP > 0 || p.thuongNong > 0) && (
                                                        <span className="text-violet-600">
                                                            Thưởng: {formatCurrencyForDisplay(p.tongThuong)}
                                                        </span>
                                                    )}
                                                    {p.khuyenMai && <span className="text-orange-500">KM: {p.khuyenMai}</span>}
                                                </div>
                                            </div>

                                            {/* Delete */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); p.firebaseId && onDeleteProduct(p.firebaseId); }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0"
                                                title="Xóa sản phẩm"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 flex justify-between items-center border-t border-slate-200 flex-shrink-0 bg-slate-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-white hover:bg-slate-100 h-10 px-4 py-2">
                        Đóng
                    </button>
                    <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                            <button
                                type="button"
                                onClick={handlePrintSelected}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-5 py-2"
                            >
                                In đã chọn ({selectedCount})
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handlePrintAll}
                            disabled={manualProducts.length === 0}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 h-10 px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            In tất cả ({manualProducts.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualInputModal;