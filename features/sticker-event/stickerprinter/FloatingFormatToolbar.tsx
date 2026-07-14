import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';

interface FloatingFormatToolbarProps {
    // Không cần truyền handler phức tạp vì component tự lắng nghe selection change trên toàn document
    // và tự thay đổi style của selection
}

export const FloatingFormatToolbar: React.FC<FloatingFormatToolbarProps> = () => {
    const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<'font' | 'size' | null>(null);
    const savedRangeRef = useRef<Range | null>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                setToolbarPos(null);
                setActiveMenu(null);
                return;
            }

            const range = selection.getRangeAt(0);
            
            // Kiểm tra xem selection có nằm trong phần tử có contenteditable="true" không
            let parent = range.commonAncestorContainer;
            if (parent.nodeType === 3) parent = parent.parentNode || parent;
            let current: Node | null = parent;
            let isInsideEditable = false;
            while (current) {
                if (current.nodeType === 1 && (current as HTMLElement).getAttribute('contenteditable') === 'true') {
                    isInsideEditable = true;
                    break;
                }
                current = current.parentNode;
            }

            if (!isInsideEditable) {
                setToolbarPos(null);
                setActiveMenu(null);
                return;
            }

            // Cache range
            savedRangeRef.current = range.cloneRange();

            const rects = range.getClientRects();
            if (rects.length > 0) {
                const rect = rects[0];
                setToolbarPos({
                    top: rect.top + window.scrollY - 50,
                    left: rect.left + window.scrollX + rect.width / 2,
                });
            } else {
                setToolbarPos(null);
                setActiveMenu(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const applyStyleToSelection = (styleName: 'fontSize' | 'fontFamily', styleValue: string) => {
        let range = savedRangeRef.current;
        const selection = window.getSelection();
        
        if (!range && selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        }

        if (!range) return;

        let parent = range.commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode || parent;
        let current: Node | null = parent;
        let editableContainer: HTMLElement | null = null;
        while (current) {
            if (current.nodeType === 1 && (current as HTMLElement).getAttribute('contenteditable') === 'true') {
                editableContainer = current as HTMLElement;
                break;
            }
            current = current.parentNode;
        }

        if (!editableContainer) return;

        // Focus lại container soạn thảo
        editableContainer.focus();

        let cleanValue = styleValue;
        if (styleName === 'fontFamily') {
            cleanValue = styleValue.replace(/['"]/g, '');
        }

        if (range.collapsed) {
            try {
                const currentHTML = editableContainer.innerHTML;
                const propName = styleName === 'fontFamily' ? 'font-family' : styleName;
                editableContainer.innerHTML = `<span style="${propName}: ${styleValue}">${currentHTML}</span>`;
                
                const event = new Event('input', { bubbles: true });
                editableContainer.dispatchEvent(event);
                
                const newRange = document.createRange();
                newRange.selectNodeContents(editableContainer);
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
                savedRangeRef.current = newRange;
                return;
            } catch (e) {
                console.error('Error applying custom style to container:', e);
            }
        }

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        const span = document.createElement('span');
        span.style[styleName] = cleanValue;
        
        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
            savedRangeRef.current = newRange;

            const event = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(event);
        } catch (e) {
            console.error('Error applying custom style to selection:', e);
        }
    };

    const handleFormat = (command: string) => {
        let range = savedRangeRef.current;
        const selection = window.getSelection();
        
        if (range && selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        document.execCommand(command, false);
        
        if (selection && selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }

        const newSelection = window.getSelection();
        if (!newSelection || newSelection.rangeCount === 0) return;
        const newRange = newSelection.getRangeAt(0);
        let parent = newRange.commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode || parent;
        let current: Node | null = parent;
        while (current) {
            if (current.nodeType === 1 && (current as HTMLElement).getAttribute('contenteditable') === 'true') {
                const event = new Event('input', { bubbles: true });
                (current as HTMLElement).dispatchEvent(event);
                break;
            }
            current = current.parentNode;
        }
    };

    const getSelectedFontSize = (): number => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return 3.5;
        const range = selection.getRangeAt(0);
        let parent: HTMLElement | null = range.commonAncestorContainer as HTMLElement;
        if (parent.nodeType === Node.TEXT_NODE) {
            parent = parent.parentElement;
        }
        
        const span = parent?.closest('span[style*="font-size"]');
        if (span) {
            const fs = (span as HTMLElement).style.fontSize;
            const match = fs.match(/([\d.]+)/);
            if (match) return parseFloat(match[1]);
        }
        return 3.5;
    };

    const adjustFontSize = (amount: number) => {
        const current = getSelectedFontSize();
        const newVal = Math.max(0.5, Math.min(20, parseFloat((current + amount).toFixed(1))));
        applyStyleToSelection('fontSize', `${newVal}cqw`);
        
        if (savedRangeRef.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRangeRef.current);
            }
        }
    };

    const handleFontSizeInputChange = (valStr: string) => {
        const val = parseFloat(valStr);
        if (!isNaN(val) && val > 0) {
            applyStyleToSelection('fontSize', `${val}cqw`);
        }
    };

    const showDropdownBelow = toolbarPos ? (toolbarPos.top - window.scrollY < 180) : false;

    if (!toolbarPos) return null;

    return (
        <div 
            className="fixed z-[9999] -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 p-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 print:hidden"
            style={{ 
                top: `${toolbarPos.top}px`, 
                left: `${toolbarPos.left}px` 
            }}
            onMouseDown={(e) => {
                e.preventDefault();
            }}
        >
            {/* Font Custom Dropdown */}
            <div className="relative">
                <Button
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto text-white text-[11px] font-semibold px-2 py-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border-r border-slate-700/80 mr-0.5"
                >
                    Font <span className="text-[7px] opacity-75">▼</span>
                </Button>
                
                {activeMenu === 'font' && (
                    <div 
                        onMouseDown={(e) => e.preventDefault()}
                        className={`absolute left-0 mb-2 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 flex flex-col min-w-[150px] max-h-[200px] overflow-y-auto z-[10000] scrollbar-thin overflow-x-hidden ${
                            showDropdownBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}
                    >
                        {[
                            { name: 'UTM Avo', val: "UTM Avo, sans-serif" },
                            { name: 'Plus Jakarta Sans', val: "Plus Jakarta Sans, sans-serif" },
                            { name: 'Inter', val: "Inter, sans-serif" },
                            { name: 'Oswald', val: "Oswald, sans-serif" },
                            { name: 'Roboto Condensed', val: "Roboto Condensed, sans-serif" },
                            { name: 'Fjalla One', val: "Fjalla One, sans-serif" },
                            { name: 'Jost', val: "Jost, sans-serif" },
                            { name: 'Josefin Sans', val: "Josefin Sans, sans-serif" },
                            { name: 'Alata Regular', val: "Alata Regular, sans-serif" },
                            { name: 'Shopee Text', val: "Shopee Text, sans-serif" },
                            { name: 'SF Pro Display', val: "SF Pro Display, sans-serif" },
                            { name: 'Samsung Sharp Sans', val: "Samsung Sharp Sans, sans-serif" },
                            { name: 'Shopee Display', val: "Shopee Display, sans-serif" },
                            { name: 'UTM Colossalis', val: "UTM Colossalis, sans-serif" }
                        ].map(font => (
                            <Button
                                variant="ghost"
                                key={font.val}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    applyStyleToSelection('fontFamily', font.val);
                                    setActiveMenu(null);
                                }}
                                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto justify-start px-3 py-1.5 text-left text-[11px] text-slate-200 hover:text-white hover:bg-slate-800 transition-colors w-full whitespace-nowrap"
                                style={{ fontFamily: font.val }}
                            >
                                {font.name}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            {/* Size adjust controls: - [input] + */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700/50 mr-1 no-print">
                <Button
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adjustFontSize(-0.2)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                    title="Giảm size chữ"
                >
                    -
                </Button>
                <input 
                    type="text"
                    onMouseDown={(e) => e.stopPropagation()} 
                    onClick={(e) => e.stopPropagation()}
                    value={getSelectedFontSize().toFixed(1)}
                    onChange={(e) => handleFontSizeInputChange(e.target.value)}
                    className="w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500"
                    title="Kích thước cqw"
                />
                <Button
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adjustFontSize(0.2)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                    title="Tăng size chữ"
                >
                    +
                </Button>
            </div>

            {/* Bold button */}
            <Button
                variant="ghost"
                onClick={() => handleFormat('bold')}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="In đậm (Bold)"
            >
                <Bold size={13} className="stroke-[2.5]" />
            </Button>

            {/* Italic button */}
            <Button
                variant="ghost"
                onClick={() => handleFormat('italic')}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="In nghiêng (Italic)"
            >
                <Italic size={13} className="stroke-[2.5]" />
            </Button>

            {/* Underline button */}
            <Button
                variant="ghost"
                onClick={() => handleFormat('underline')}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Gạch chân (Underline)"
            >
                <Underline size={13} className="stroke-[2.5]" />
            </Button>

            {/* Tooltip arrow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900/95" />
        </div>
    );
};
