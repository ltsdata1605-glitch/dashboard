import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';

// Bảng màu chọn nhanh — giới hạn đúng 6 họ màu semantic đã duyệt (CLAUDE.md mục 2),
// cấm tự thêm màu ngoài palette (vd cyan/vàng/cam/hồng/tím trước đây).
export const VIVID_COLORS = [
    { hex: '#10b981', name: 'Emerald (Tốt)' },
    { hex: '#0ea5e9', name: 'Sky (Chính)' },
    { hex: '#f59e0b', name: 'Amber (Cảnh báo)' },
    { hex: '#f43f5e', name: 'Rose (Xấu)' },
    { hex: '#6366f1', name: 'Indigo' },
    { hex: '#64748b', name: 'Slate' },
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
    bankem: CriterionConfig;
}

export const DEFAULT_COLOR_SETTINGS: ColorSettings = {
    ht: { good: { threshold: 100, color: '#10b981' }, average: { threshold: 85, color: '#f59e0b' }, bad: { color: '#f43f5e' } },
    hqqd: { good: { threshold: 35, color: '#10b981' }, average: { threshold: 30, color: '#f59e0b' }, bad: { color: '#f43f5e' } },
    tragop: { good: { threshold: 45, color: '#10b981' }, average: { threshold: 40, color: '#f59e0b' }, bad: { color: '#f43f5e' } },
    dtqd: { good: { threshold: 50, color: '#0ea5e9' }, average: { threshold: 20, color: '#f59e0b' }, bad: { color: '#f43f5e' } },
    dtthuc: { good: { threshold: 50, color: '#64748b' }, average: { threshold: 20, color: '#f59e0b' }, bad: { color: '#f43f5e' } },
    bankem: { good: { threshold: 20, color: '#10b981' }, average: { threshold: 10, color: '#f59e0b' }, bad: { color: '#f43f5e' } },
};

export const CompactColorPicker: React.FC<{ selected: string; onSelect: (hex: string) => void }> = ({ selected, onSelect }) => (
    <div className="flex gap-1">
        {VIVID_COLORS.map(c => (
            <Button
                variant="ghost"
                key={c.hex}
                onClick={() => onSelect(c.hex)}
                className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-5 h-5 rounded-full border transition-transform ${selected === c.hex ? 'border-slate-900 dark:border-white scale-125 z-10' : 'border-transparent hover:scale-110'}`}
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tốt (≥)</span>
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase">TB (≥)</span>
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Yếu (&lt;)</span>
                            <div className="w-12 text-[10px] text-slate-400 italic">Auto</div>
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
                    <Button variant="ghost" onClick={() => setTemp(DEFAULT_COLOR_SETTINGS)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-5 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white transition-colors">Mặc định</Button>
                    <Button variant="ghost" onClick={() => { onSave(temp); onClose(); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all shadow-md shadow-sky-500/20">Lưu cấu hình</Button>
                </div>
            }
        >
            {renderRow("% Hoàn thành", "ht")}
            {renderRow("Hiệu quả quy đổi", "hqqd")}
            {renderRow("% Trả góp", "tragop")}
            {renderRow("% Bán kèm", "bankem")}
            {renderRow("Doanh thu quy đổi", "dtqd", true)}
            {renderRow("Doanh thu thực", "dtthuc", true)}
        </Modal>
    );
};
