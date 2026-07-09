import React, { useRef } from 'react';
import { PrintSettings } from './services/printService';
import { TrashIcon } from './Icons';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';

interface PrintSettingsModalProps {
    settings: PrintSettings;
    onSettingsChange: (settings: PrintSettings) => void;
    onClose: () => void;
}

const CheckboxOption: React.FC<{
    id: keyof PrintSettings;
    label: string;
    checked: boolean;
    onChange: (id: keyof PrintSettings, value: boolean) => void;
}> = ({ id, label, checked, onChange }) => (
    <label htmlFor={id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onChange(id, e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
);

const FontUploadSection: React.FC<{
    title: string;
    fontName: string | null | undefined;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
}> = ({ title, fontName, onUpload, onRemove, inputRef }) => (
    <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-600 mb-2">{title}</h4>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            {fontName ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center font-bold text-xs">Aa</div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">{fontName}</p>
                            <p className="text-xs text-slate-500">Đã tải lên</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onRemove}
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                        title="Xóa font này"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </Button>
                </div>
            ) : (
                <div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={onUpload}
                        className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100
                        cursor-pointer"
                    />
                </div>
            )}
        </div>
    </div>
);


const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({ settings, onSettingsChange, onClose }) => {
    const primaryFontInputRef = useRef<HTMLInputElement>(null);
    const secondaryFontInputRef = useRef<HTMLInputElement>(null);

    const handleCheckboxChange = (id: keyof PrintSettings, value: boolean) => {
        onSettingsChange({ ...settings, [id]: value });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSettingsChange({ ...settings, tagsPerPage: parseInt(e.target.value, 10) as PrintSettings['tagsPerPage'] });
    }

    const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'primary' | 'secondary') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                if (type === 'primary') {
                    onSettingsChange({
                        ...settings,
                        customFontData: result,
                        customFontName: file.name
                    });
                } else {
                    onSettingsChange({
                        ...settings,
                        customSecondaryFontData: result,
                        customSecondaryFontName: file.name
                    });
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveFont = (type: 'primary' | 'secondary') => {
        if (type === 'primary') {
             onSettingsChange({
                ...settings,
                customFontData: null,
                customFontName: null
            });
            if (primaryFontInputRef.current) primaryFontInputRef.current.value = '';
        } else {
            onSettingsChange({
                ...settings,
                customSecondaryFontData: null,
                customSecondaryFontName: null
            });
            if (secondaryFontInputRef.current) secondaryFontInputRef.current.value = '';
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Thiết kế Mẫu In Sticker"
            titleColorClass="text-slate-900"
            maxWidth="sm"
            footer={
                <div className="text-right">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-indigo-50 hover:bg-indigo-700 h-10 px-6 py-2"
                    >
                        Xong
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-700 mb-2">Thông tin hiển thị</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <CheckboxOption id="showOriginalPrice" label="Giá gốc" checked={settings.showOriginalPrice} onChange={handleCheckboxChange} />
                        <CheckboxOption id="showPromotion" label="Khuyến mãi" checked={settings.showPromotion} onChange={handleCheckboxChange} />
                        <CheckboxOption id="showBonus" label="Thưởng" checked={settings.showBonus} onChange={handleCheckboxChange} />
                        <CheckboxOption id="showQrCode" label="Mã QR" checked={settings.showQrCode} onChange={handleCheckboxChange} />
                        <CheckboxOption id="showEmployeeName" label="Tên nhân viên" checked={settings.showEmployeeName} onChange={handleCheckboxChange} />
                    </div>
                </div>

                <div>
                    <label htmlFor="tagsPerPage" className="block text-base font-semibold text-slate-700 mb-2">Bố cục trang in (A4)</label>
                    <select
                        id="tagsPerPage"
                        value={settings.tagsPerPage}
                        onChange={handleSelectChange}
                        className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value={4}>4 sticker / trang (Lớn nhất)</option>
                        <option value={8}>8 sticker / trang</option>
                        <option value={16}>16 sticker / trang</option>
                        <option value={24}>24 sticker / trang (Nhỏ nhất)</option>
                        <option value={80}>Máy in Bill (K80 - Cuộn)</option>
                    </select>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-slate-700 mb-2">Font chữ tùy chỉnh</h3>
                    <p className="text-xs text-slate-500 mb-3">Tải lên font (.ttf, .otf, .woff) để thay thế font mặc định.</p>
                    
                    <FontUploadSection 
                        title="Font cho Giá bán & Khuyến mãi"
                        fontName={settings.customFontName}
                        onUpload={(e) => handleFontUpload(e, 'primary')}
                        onRemove={() => handleRemoveFont('primary')}
                        inputRef={primaryFontInputRef}
                    />
                    
                    <FontUploadSection 
                        title="Font cho Tên Sản phẩm & Giá gốc"
                        fontName={settings.customSecondaryFontName}
                        onUpload={(e) => handleFontUpload(e, 'secondary')}
                        onRemove={() => handleRemoveFont('secondary')}
                        inputRef={secondaryFontInputRef}
                    />
                </div>

                <div>
                    <h3 className="text-base font-semibold text-slate-700 mb-2">Tùy chọn Sắp xếp</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <CheckboxOption id="sortByName" label="Sắp xếp theo tên sản phẩm (A-Z)" checked={settings.sortByName} onChange={handleCheckboxChange} />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PrintSettingsModal;