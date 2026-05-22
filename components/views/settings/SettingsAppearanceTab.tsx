import React, { useState, useEffect } from 'react';
import { useLayout } from '../../../contexts/LayoutContext';
import * as dbService from '../../../services/dbService';
import { Icon } from '../../common/Icon';
import toast from 'react-hot-toast';

const FONTS = [
    { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Mặc định)' },
    { id: 'Inter', name: 'Inter' },
    { id: 'Oswald', name: 'Oswald' },
    { id: 'Roboto Condensed', name: 'Roboto Condensed' },
    { id: 'Fjalla One', name: 'Fjalla One' },
    { id: 'Archivo Narrow', name: 'Archivo Narrow' },
    { id: 'Jost', name: 'Jost' },
    { id: 'Josefin Sans', name: 'Josefin Sans' }
];

export const SettingsAppearanceTab: React.FC = () => {
    const { isDarkMode, toggleDarkMode } = useLayout();
    const [font, setFont] = useState('Plus Jakarta Sans');

    useEffect(() => {
        const loadFont = async () => {
            const savedFont = await dbService.getGlobalFont();
            if (savedFont) setFont(savedFont);
        };
        loadFont();
    }, []);

    const handleFontChange = async (newFont: string) => {
        setFont(newFont);
        await dbService.saveGlobalFont(newFont);
        if (newFont === 'Plus Jakarta Sans') {
            document.body.style.fontFamily = '';
        } else {
            document.body.style.fontFamily = `'${newFont}', sans-serif`;
        }
        toast.success(`Đã đổi font chữ thành ${newFont}`);
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Giao Diện Hệ Thống</h3>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-lg">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-base">Chế Độ Tối (Dark Mode)</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Chuyển sang giao diện Dark Mode để bảo vệ mắt.</p>
                    </div>
                    <button 
                        onClick={toggleDarkMode}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Phông Chữ (Font Style)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FONTS.map(f => (
                        <div 
                            key={f.id}
                            onClick={() => handleFontChange(f.id)}
                            className={`cursor-pointer p-4 border-2 transition-all rounded-lg ${
                                font === f.id 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className={`font-bold ${font === f.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{f.name}</span>
                                {font === f.id && <Icon name="check-circle-2" size={5} className="text-indigo-500" />}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400" style={{ fontFamily: f.id }}>Aa Bb Cc 123 - Trải nghiệm báo cáo tốt hơn.</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
