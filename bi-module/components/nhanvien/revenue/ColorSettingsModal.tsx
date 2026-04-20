import React, { useState, useEffect } from 'react';
import { CogIcon, XIcon } from '../../Icons';
import ModalWrapper from '../../../../components/modals/ModalWrapper';

// --- Vivid/Hot Color Palette ---
export const VIVID_COLORS = [
    { hex: '#22c55e', name: 'Xanh lá' },
    { hex: '#3b82f6', name: 'Xanh dương' },
    { hex: '#06b6d4', name: 'Xanh lơ' },
    { hex: '#eab308', name: 'Vàng' },
    { hex: '#f97316', name: 'Cam' },
    { hex: '#ef4444', name: 'Đỏ' },
    { hex: '#ec4899', name: 'Hồng' },
    { hex: '#a855f7', name: 'Tím' },
    { hex: '#475569', name: 'Xám' },
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
    ht: { good: { threshold: 100, color: '#22c55e' }, average: { threshold: 85, color: '#eab308' }, bad: { color: '#ef4444' } },
    hqqd: { good: { threshold: 35, color: '#22c55e' }, average: { threshold: 30, color: '#eab308' }, bad: { color: '#ef4444' } },
    tragop: { good: { threshold: 45, color: '#22c55e' }, average: { threshold: 40, color: '#eab308' }, bad: { color: '#ef4444' } },
    dtqd: { good: { threshold: 50, color: '#3b82f6' }, average: { threshold: 20, color: '#eab308' }, bad: { color: '#ef4444' } },
    dtthuc: { good: { threshold: 50, color: '#475569' }, average: { threshold: 20, color: '#eab308' }, bad: { color: '#ef4444' } },
    bankem: { good: { threshold: 20, color: '#22c55e' }, average: { threshold: 10, color: '#eab308' }, bad: { color: '#ef4444' } },
};

export const CompactColorPicker: React.FC<{ selected: string; onSelect: (hex: string) => void }> = ({ selected, onSelect }) => (
    <div className="flex gap-1">
        {VIVID_COLORS.map(c => (
            <button
                key={c.hex}
                onClick={() => onSelect(c.hex)}
                className={`w-5 h-5 rounded-full border transition-transform ${selected === c.hex ? 'border-slate-900 dark:border-white scale-125 z-10' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
            />
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
                <p className="text-[11px] font-black text-primary-600 uppercase mb-2 tracking-wider">{label} {isCurrency ? '(Tr)' : '(%)'}</p>
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
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Cấu Hình Màu Hiển Thị"
            subTitle="Tùy chỉnh ngưỡng phần trăm"
            maxWidthClass="max-w-lg"
        >
            <div className="flex flex-col max-h-[85vh] bg-white dark:bg-slate-800 rounded-b-2xl">
                <div className="overflow-y-auto pr-2 flex-1 scrollbar-thin p-5">
                    {renderRow("% Hoàn thành", "ht")}
                    {renderRow("Hiệu quả quy đổi", "hqqd")}
                    {renderRow("% Trả góp", "tragop")}
                    {renderRow("% Bán kèm", "bankem")}
                    {renderRow("Doanh thu quy đổi", "dtqd", true)}
                    {renderRow("Doanh thu thực", "dtthuc", true)}
                </div>
                <div className="flex gap-3 flex-shrink-0 p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                    <button onClick={() => setTemp(DEFAULT_COLOR_SETTINGS)} className="px-5 py-2 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white transition-colors">Mặc định</button>
                    <button onClick={() => { onSave(temp); onClose(); }} className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 active:scale-95 transition-all shadow-md shadow-primary-500/20">Lưu cấu hình</button>
                </div>
            </div>
        </ModalWrapper>
    );
};
