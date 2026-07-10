import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../common/Icon';
import { saveGlobalFont, getGlobalFont } from '../../services/dbService';
import { createPortal } from 'react-dom';
import { Button } from '../shared/ui/Button';

interface FontOption {
    label: string;
    value: string;
    style?: React.CSSProperties;
    className?: string;
}

const FONTS: FontOption[] = [
    { label: 'Mặc định (UTM Avo)', value: 'UTM Avo', style: { fontFamily: "'UTM Avo', sans-serif" } },
    { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans', style: { fontFamily: "'Plus Jakarta Sans', sans-serif" } },
    { label: 'Inter', value: 'Inter', style: { fontFamily: "'Inter', sans-serif" } },
    { label: 'Oswald', value: 'Oswald', style: { fontFamily: "'Oswald', sans-serif" } },
    { label: 'Roboto Condensed', value: 'Roboto Condensed', style: { fontFamily: "'Roboto Condensed', sans-serif" } },
    { label: 'Fjalla One', value: 'Fjalla One', style: { fontFamily: "'Fjalla One', sans-serif" } },
    { label: 'Jost', value: 'Jost', style: { fontFamily: "'Jost', sans-serif" } },
    { label: 'Josefin Sans', value: 'Josefin Sans', style: { fontFamily: "'Josefin Sans', sans-serif" } },

    { label: 'Alata Regular', value: 'Alata Regular', style: { fontFamily: "'Alata Regular', sans-serif" } },
    { label: 'Shopee Text', value: 'Shopee Text', style: { fontFamily: "'Shopee Text', sans-serif" } },
    { label: 'SF Pro Display', value: 'SF Pro Display', style: { fontFamily: "'SF Pro Display', sans-serif" } },
    { label: 'Samsung Sharp Sans', value: 'Samsung Sharp Sans', style: { fontFamily: "'Samsung Sharp Sans', sans-serif" } },
    { label: 'Shopee Display', value: 'Shopee Display', style: { fontFamily: "'Shopee Display', sans-serif" } },

    { label: 'UTM Colossalis', value: 'UTM Colossalis', style: { fontFamily: "'UTM Colossalis', sans-serif" } }
];

const FontSelector: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentFont, setCurrentFont] = useState<string>('UTM Avo');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});

    useEffect(() => {
        getGlobalFont().then(font => {
            const activeFont = font || 'UTM Avo';
            setCurrentFont(activeFont);

            // Apply on mount
            let styleEl = document.getElementById('dynamic-font-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'dynamic-font-style';
                document.head.appendChild(styleEl);
            }
            if (activeFont !== 'UTM Avo') {
                document.documentElement.style.setProperty('--font-sans', `'${activeFont}', sans-serif`);
                styleEl.innerHTML = `body, div, span, p, a, h1, h2, h3, h4, h5, h6, table, th, td, button, input, label, select, textarea, strong, em, b, i { font-family: '${activeFont}', sans-serif !important; }`;
            } else {
                document.documentElement.style.setProperty('--font-sans', `'UTM Avo', sans-serif`);
                styleEl.innerHTML = `body, div, span, p, a, h1, h2, h3, h4, h5, h6, table, th, td, button, input, label, select, textarea, strong, em, b, i { font-family: 'UTM Avo', sans-serif !important; }`;
            }
        });
    }, []);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Align right edge of dropdown with right edge of button
            const minW = 200;
            let leftPos = rect.right - minW;

            // Prevent going out of screen on the left
            if (leftPos < 10) {
                leftPos = 10;
            }

            setDropdownStyles({
                position: 'fixed',
                top: `${rect.bottom + 6}px`,
                left: `${leftPos}px`,
                width: `${minW}px`,
                zIndex: 9999
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const handleScroll = (e: Event) => {
                const target = e.target as Node;
                // Don't close if scroll originated inside the dropdown itself
                if (dropdownRef.current && dropdownRef.current.contains(target)) return;
                setIsOpen(false);
            };
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleScroll);
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleScroll);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isOutsideBtn = buttonRef.current && !buttonRef.current.contains(event.target as Node);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
            if (isOutsideBtn && isOutsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectFont = async (fontValue: string) => {
        const activeFont = fontValue || 'UTM Avo';
        setCurrentFont(activeFont);
        await saveGlobalFont(activeFont);

        let styleEl = document.getElementById('dynamic-font-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-font-style';
            document.head.appendChild(styleEl);
        }

        // Apply instantly using a style block with !important to override tailwind utilities
        if (activeFont && activeFont !== 'UTM Avo') {
            document.documentElement.style.setProperty('--font-sans', `'${activeFont}', sans-serif`);
            styleEl.innerHTML = `body, div, span, p, a, h1, h2, h3, h4, h5, h6, table, th, td, button, input, label, select, textarea, strong, em, b, i { font-family: '${activeFont}', sans-serif !important; }`;
        } else {
            document.documentElement.style.setProperty('--font-sans', `'UTM Avo', sans-serif`);
            styleEl.innerHTML = `body, div, span, p, a, h1, h2, h3, h4, h5, h6, table, th, td, button, input, label, select, textarea, strong, em, b, i { font-family: 'UTM Avo', sans-serif !important; }`;
        }

        setIsOpen(false);
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const currentFontLabel = FONTS.find(f => f.value === currentFont)?.label || 'Font Chữ';

    return (
        <div className="relative flex items-center bg-emerald-50/30 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30">
            <Button
                variant="unstyled" size="none"
                ref={buttonRef}
                onClick={toggleOpen}
                className={`p-2.5 transition-colors border-r border-emerald-100 dark:border-emerald-900/30 ${isOpen ? 'bg-emerald-200/50 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'}`}
                title={`Font hiện tại: ${currentFontLabel}`}
            >
                <Icon name="type" size={4} />
            </Button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyles}
                    className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col backdrop-blur-sm overflow-hidden"
                >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tùy chọn Font</span>
                    </div>
                    <div className="flex flex-col p-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {[...FONTS].sort((a, b) => {
                            if (a.label.includes('Mặc định')) return -1;
                            if (b.label.includes('Mặc định')) return 1;
                            return a.label.localeCompare(b.label);
                        }).map(font => {
                            const isSelected = currentFont === font.value;
                            return (
                                <Button
                                    variant="unstyled" size="none"
                                    key={font.value}
                                    onClick={() => handleSelectFont(font.value)}
                                    className={`justify-start flex items-center gap-2 px-3 py-2 w-full text-left rounded-lg transition-colors ${isSelected
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                        }`}
                                    style={font.style}
                                >
                                    <div className={`flex items-center justify-center w-4 h-4 rounded-full border ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {isSelected && <Icon name="check" size={2.5} className="text-white" />}
                                    </div>
                                    <span className={`text-[13px] ${isSelected ? 'font-bold' : ''} ${font.className || ''}`}>{font.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default FontSelector;
