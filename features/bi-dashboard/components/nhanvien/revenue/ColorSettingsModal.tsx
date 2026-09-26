import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';

// Bảng màu chọn nhanh — dùng các mã màu đậm nét, độ tương phản cao, nổi bật
export const VIVID_COLORS = [
    { hex: '#059669', name: 'Emerald đậm (Tốt)' },
    { hex: '#0284c7', name: 'Sky đậm (Chính)' },
    { hex: '#ea580c', name: 'Cam đậm (Cảnh báo)' },
    { hex: '#dc2626', name: 'Đỏ đậm (Xấu)' },
    { hex: '#2563eb', name: 'Xanh dương đậm' },
    { hex: '#4f46e5', name: 'Indigo đậm' },
    { hex: '#475569', name: 'Slate' },
];

export interface RangeConfig {
    threshold: number;
    color: string;
}

export interface CriterionConfig {
    good: RangeConfig;
    average: RangeConfig;
    bad: { color: string };
}

export interface ColorSettings {
    ht: CriterionConfig;
    hqqd: CriterionConfig;
    tragop: CriterionConfig;
    dtqd: CriterionConfig;
    dtthuc: CriterionConfig;
    bankem?: CriterionConfig;
}

export const DEFAULT_COLOR_SETTINGS: ColorSettings = {
    ht: { good: { threshold: 100, color: '#059669' }, average: { threshold: 85, color: '#ea580c' }, bad: { color: '#dc2626' } },
    hqqd: { good: { threshold: 35, color: '#059669' }, average: { threshold: 30, color: '#ea580c' }, bad: { color: '#dc2626' } },
    tragop: { good: { threshold: 45, color: '#059669' }, average: { threshold: 40, color: '#ea580c' }, bad: { color: '#dc2626' } },
    dtqd: { good: { threshold: 50, color: '#0284c7' }, average: { threshold: 20, color: '#ea580c' }, bad: { color: '#dc2626' } },
    dtthuc: { good: { threshold: 50, color: '#475569' }, average: { threshold: 20, color: '#ea580c' }, bad: { color: '#dc2626' } },
};

/**
 * Chuyển các mã màu cũ/nhạt sang tone màu đậm và nổi bật hơn để phân biệt rõ ràng
 */
export const toBoldVividColor = (hex?: string): string | undefined => {
    if (!hex) return undefined;
    const lower = hex.toLowerCase();
    switch (lower) {
        case '#10b981': return '#059669'; // Emerald đậm nổi bật
        case '#f59e0b':
        case '#eab308':
        case '#ca8a04':
        case '#d97706':
        case '#fbbf24': return '#ea580c'; // Cam đậm nổi bật (thay cho vàng nhạt)
        case '#f43f5e': return '#dc2626'; // Đỏ đậm nổi bật
        case '#0ea5e9': return '#0284c7'; // Sky đậm
        case '#6366f1': return '#4f46e5'; // Indigo đậm
        default: return hex;
    }
};

/**
 * Phân khúc màu cho cột %DKHT:
 * - < 80%: Đỏ đậm nổi bật (#dc2626)
 * - 80% <= dữ liệu < 100%: Cam đậm nổi bật (#ea580c)
 * - 100% <= dữ liệu < 120%: Xanh lá đậm nổi bật (#059669)
 * - >= 120%: Xanh dương đậm xuất sắc (#2563eb)
 * - Không có target: Xám (#94a3b8)
 */
export const getDkhtColor = (val?: number | null, hasTarget: boolean = true): string => {
    if (!hasTarget || val == null || isNaN(val)) return '#94a3b8';
    if (val < 80) return '#dc2626';
    if (val < 100) return '#ea580c';
    if (val < 120) return '#059669';
    return '#2563eb';
};

/**
 * Phân khúc màu cho cột HQQĐ và %T.Chậm dựa theo Target ở tab Cập nhật:
 * - Đạt / Vượt (val >= target): Xanh lá đậm nổi bật (#059669)
 * - Tiệm cận Target (85% <= val / target < 100%): Cam đậm nổi bật (#ea580c)
 * - Kém hơn Target (val / target < 85%): Đỏ đậm nổi bật (#dc2626)
 * - Không có target hoặc dữ liệu không hợp lệ: Xám (#94a3b8)
 */
export const getMetricColorByTarget = (val?: number | null, target?: number | null): string => {
    if (val == null || isNaN(val)) return '#94a3b8';
    if (!target || target <= 0) return '#94a3b8';
    const ratio = (val / target) * 100;
    if (ratio >= 100) return '#059669'; // Đạt / Vượt
    if (ratio >= 85) return '#ea580c';  // Tiệm cận (85% - < 100% target)
    return '#dc2626';                   // Kém (< 85% target)
};

export const CompactColorPicker: React.FC<{ selected: string; onSelect: (hex: string) => void }> = ({ selected, onSelect }) => (
    <div className="flex gap-1">
        {VIVID_COLORS.map(c => (
            <Button
                variant="unstyled" size="none"
                key={c.hex}
                onClick={() => onSelect(c.hex)}
                className={`w-5 h-5 rounded-full border transition-transform ${selected === c.hex ? 'border-slate-900 dark:border-white scale-125 z-10' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
            >{null}</Button>
        ))}
    </div>
);

export const ColorSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settings: ColorSettings;
    onSave: (s: ColorSettings) => void;
}> = ({ isOpen, onClose, settings, onSave }) => {
    const [temp, setTemp] = useState<ColorSettings>(settings);
    
    // Đảm bảo temp luôn có đầy đủ keys từ settings
    useEffect(() => { 
        if (isOpen) {
            setTemp({ ...DEFAULT_COLOR_SETTINGS, ...settings });
        }
    }, [settings, isOpen]);

    if (!isOpen) return null;

    const renderRow = (label: string, key: keyof ColorSettings, isCurrency = false) => {
        const config = temp[key] || DEFAULT_COLOR_SETTINGS[key];
        
        return (
            <div className="py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <p className="text-[11px] font-black text-sky-600 uppercase mb-2 tracking-wider">{label} {isCurrency ? '(Tr)' : '(%)'}</p>
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                            <span className="text-[11px] font-bold text-slate-400 uppercase">Tốt (≥)</span>
                            <input 
                                type="number" 
                                value={config.good.threshold} 
                                onChange={e => setTemp({...temp, [key]: {...config, good: {...config.good, threshold: Number(e.target.value)}}})} 
                                className="w-12 p-1 text-xs border rounded bg-white dark:bg-slate-800" 
                            />
                        </div>
                        <CompactColorPicker 
                            selected={config.good.color} 
                            onSelect={hex => setTemp({...temp, [key]: {...config, good: {...config.good, color: hex}}})} 
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                            <span className="text-[11px] font-bold text-slate-400 uppercase">TB (≥)</span>
                            <input 
                                type="number" 
                                value={config.average.threshold} 
                                onChange={e => setTemp({...temp, [key]: {...config, average: {...config.average, threshold: Number(e.target.value)}}})} 
                                className="w-12 p-1 text-xs border rounded bg-white dark:bg-slate-800" 
                            />
                        </div>
                        <CompactColorPicker 
                            selected={config.average.color} 
                            onSelect={hex => setTemp({...temp, [key]: {...config, average: {...config.average, color: hex}}})} 
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                            <span className="text-[11px] font-bold text-slate-400 uppercase">Yếu (&lt;)</span>
                            <div className="w-12 text-[11px] text-slate-400 italic">Auto</div>
                        </div>
                        <CompactColorPicker 
                            selected={config.bad.color} 
                            onSelect={hex => setTemp({...temp, [key]: {...config, bad: {...config.bad, color: hex}}})} 
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cấu Hình Màu Hiển Thị"
            subTitle="Tùy chỉnh ngưỡng phần trăm"
            maxWidth="lg"
            footer={
                <div className="flex gap-3">
                    <Button variant="unstyled" size="none" onClick={() => setTemp(DEFAULT_COLOR_SETTINGS)} className="px-5 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white transition-colors">Mặc định</Button>
                    <Button variant="unstyled" size="none" onClick={() => { onSave(temp); onClose(); }} className="flex-1 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-md hover:bg-sky-700 active:scale-95 transition-all shadow-md shadow-sky-500/20">Lưu cấu hình</Button>
                </div>
            }
        >
            {renderRow("% Hoàn thành", "ht")}
            {renderRow("Hiệu quả quy đổi", "hqqd")}
            {renderRow("% Trả góp", "tragop")}
            {renderRow("Doanh thu quy đổi", "dtqd", true)}
            {renderRow("Doanh thu thực", "dtthuc", true)}
        </Modal>
    );
};
