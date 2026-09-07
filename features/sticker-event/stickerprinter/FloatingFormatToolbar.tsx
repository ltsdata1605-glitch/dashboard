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
    const [fontSizeInput, setFontSizeInput] = useState<string>('3.5');
    const [lineHeightInput, setLineHeightInput] = useState<string>('1.3');

    const savedRangeRef = useRef<Range | null>(null);
    // Ref mirror của activeMenu — dùng trong selectionchange handler để biết dropdown có đang mở hay không.
    const activeMenuRef = useRef<'font' | 'size' | null>(null);
    // Cờ báo người dùng đang focus gõ trong ô input trên toolbar để tránh selectionchange đóng toolbar
    const isTypingRef = useRef<boolean>(false);

    // Sync ref khi state thay đổi
    useEffect(() => { activeMenuRef.current = activeMenu; }, [activeMenu]);

    const getEditableContainer = (node: Node | null): HTMLElement | null => {
        let current: Node | null = node;
        while (current) {
            if (current.nodeType === 1 && (current as HTMLElement).getAttribute('contenteditable') === 'true') {
                return current as HTMLElement;
            }
            current = current.parentNode;
        }
        return null;
    };

    const detectFieldName = (editableEl: HTMLElement | null): string | undefined => {
        if (!editableEl) return undefined;
        const cl = editableEl.classList;
        if (cl.contains('input-title-single')) return 'drawTitle';
        if (cl.contains('input-content-top-left')) return 'drawContentTopLeft';
        if (cl.contains('input-content-top-right')) return 'drawContentTopRight';
        if (cl.contains('input-code-left')) return 'drawCode';
        if (cl.contains('input-content-bottom-left')) return 'drawContentBottomLeft';
        if (cl.contains('input-content-bottom-right')) return 'drawContentBottomRight';
        if (cl.contains('input-footer-left')) return 'drawFooter';
        return undefined;
    };

    const getSelectedFontSize = (explicitRange?: Range | null): number => {
        const range = explicitRange || savedRangeRef.current || (window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null);
        if (!range) return 3.5;
        let parent: HTMLElement | null = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
            ? range.commonAncestorContainer.parentElement
            : (range.commonAncestorContainer as HTMLElement);
        
        // 1. Tìm span gần nhất có inline style font-size
        const span = parent?.closest('span[style*="font-size"]');
        if (span) {
            const fs = (span as HTMLElement).style.fontSize;
            const match = fs.match(/([\d.]+)/);
            if (match) return parseFloat(match[1]);
        }

        // 2. Tìm container contenteditable để đọc font-size của ô
        const el = getEditableContainer(parent);
        if (el) {
            const fs = el.style.fontSize;
            const match = fs?.match(/([\d.]+)/);
            if (match) return parseFloat(match[1]);
            
            if (el.className.includes('bottom')) return 2.2;
            if (el.className.includes('title')) return 2.5;
            if (el.className.includes('code')) return 3.8;
            return 3.5;
        }
        return 3.5;
    };

    const getSelectedLineHeight = (explicitRange?: Range | null): number => {
        const range = explicitRange || savedRangeRef.current || (window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null);
        if (!range) return 1.3;
        let parent: HTMLElement | null = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
            ? range.commonAncestorContainer.parentElement
            : (range.commonAncestorContainer as HTMLElement);
        const span = parent?.closest('span[style*="line-height"]');
        if (span) {
            const lh = (span as HTMLElement).style.lineHeight;
            const match = lh.match(/([\d.]+)/);
            if (match) return parseFloat(match[1]);
        }
        if (parent) {
            const computed = window.getComputedStyle(parent);
            const fs = parseFloat(computed.fontSize);
            const lh = parseFloat(computed.lineHeight);
            if (!isNaN(fs) && !isNaN(lh) && fs > 0) return parseFloat((lh / fs).toFixed(2));
        }
        return 1.3;
    };

    useEffect(() => {
        const handleSelectionChange = () => {
            if (isTypingRef.current) return;
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                if (activeMenuRef.current) return;
                setToolbarPos(null);
                setActiveMenu(null);
                return;
            }

            const range = selection.getRangeAt(0);
            
            let parent = range.commonAncestorContainer;
            if (parent.nodeType === 3) parent = parent.parentNode || parent;
            const editableEl = getEditableContainer(parent);

            if (!editableEl) {
                if (activeMenuRef.current) return;
                setToolbarPos(null);
                setActiveMenu(null);
                return;
            }

            // Cache range
            savedRangeRef.current = range.cloneRange();

            // Cập nhật giá trị hiển thị trên toolbar
            const fs = getSelectedFontSize(range);
            setFontSizeInput(fs.toFixed(1));
            const lh = getSelectedLineHeight(range);
            setLineHeightInput(lh.toFixed(1));

            const rects = range.getClientRects();
            if (rects.length > 0) {
                const rect = rects[0];
                const containerRect = editableEl.getBoundingClientRect();
                const anchorTop = Math.min(Math.max(rect.top, containerRect.top), containerRect.bottom);
                const anchorLeft = Math.min(Math.max(rect.left + rect.width / 2, containerRect.left), containerRect.right);
                setToolbarPos({
                    top: anchorTop - 50,
                    left: anchorLeft,
                });
            } else {
                if (activeMenuRef.current) return;
                setToolbarPos(null);
                setActiveMenu(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const applyStyleToSelection = (styleName: 'fontSize' | 'fontFamily', styleValue: string, refocus: boolean = true) => {
        let range = savedRangeRef.current;
        const selection = window.getSelection();
        
        if (!range && selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        }

        if (!range) return;

        let parent = range.commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode || parent;
        const editableContainer = getEditableContainer(parent);

        if (!editableContainer) return;

        // Chỉ focus lại container soạn thảo nếu không phải đang gõ trong ô input trên toolbar
        if (refocus) {
            editableContainer.focus();
        }

        let cleanValue = styleValue;
        if (styleName === 'fontFamily') {
            cleanValue = styleValue.replace(/['"]/g, '');
        }

        const styleProp = styleName === 'fontFamily' ? 'font-family' : 'font-size';
        const selectedText = range.toString();

        if (range.collapsed) {
            try {
                const currentHTML = editableContainer.innerHTML;
                const propName = styleName === 'fontFamily' ? 'font-family' : 'font-size';
                editableContainer.innerHTML = `<span style="${propName}: ${styleValue}">${currentHTML}</span>`;
                
                const event = new Event('input', { bubbles: true });
                editableContainer.dispatchEvent(event);
                
                const newRange = document.createRange();
                newRange.selectNodeContents(editableContainer);
                if (selection && refocus) {
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
                savedRangeRef.current = newRange;
                return;
            } catch (e) {
                console.error('Error applying custom style to container:', e);
            }
        }

        let startEl: HTMLElement | null = range.commonAncestorContainer.nodeType === 3
            ? range.commonAncestorContainer.parentElement
            : range.commonAncestorContainer as HTMLElement;
        const innerMatch = startEl?.closest(`span[style*="${styleProp}"]`) as HTMLElement | null;

        // Nếu span hiện tại bao quanh toàn bộ vùng chọn, chỉ cần cập nhật style của nó
        // và dọn dẹp các span con lồng bên trong
        if (innerMatch && editableContainer.contains(innerMatch) && (
            innerMatch.textContent?.trim() === selectedText.trim() || 
            innerMatch === range.commonAncestorContainer
        )) {
            innerMatch.style[styleName] = cleanValue;

            // Xoá styleProp khỏi tất cả span con lồng bên trong để tránh conflict CSS
            innerMatch.querySelectorAll(`span[style*="${styleProp}"]`).forEach(child => {
                (child as HTMLElement).style.removeProperty(styleProp);
            });

            // Gỡ các span cha cùng styleProp thừa nếu có
            let ancestor = innerMatch.parentElement;
            while (
                ancestor && ancestor !== editableContainer && ancestor.tagName === 'SPAN' &&
                ancestor.style.getPropertyValue(styleProp) && ancestor.textContent?.trim() === selectedText.trim()
            ) {
                const toRemove = ancestor;
                ancestor = ancestor.parentElement;
                const p = toRemove.parentNode;
                if (p) {
                    while (toRemove.firstChild) p.insertBefore(toRemove.firstChild, toRemove);
                    p.removeChild(toRemove);
                }
            }

            const flatRange = document.createRange();
            flatRange.selectNodeContents(innerMatch);
            if (selection && refocus) {
                selection.removeAllRanges();
                selection.addRange(flatRange);
            }
            savedRangeRef.current = flatRange;

            const flatEvent = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(flatEvent);
            return;
        }

        // Trường hợp wrap vùng chọn vào span mới:
        if (selection && refocus) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        const span = document.createElement('span');
        span.style[styleName] = cleanValue;

        try {
            const fragment = range.extractContents();
            // CỰC KỲ QUAN TRỌNG: Dọn sạch mọi span lồng có cùng styleProp bên trong fragment!
            // Tránh việc span con (vd font-size: 0.5cqw) ghi đè lên span cha mới (font-size: 0.6cqw)
            fragment.querySelectorAll(`span[style*="${styleProp}"]`).forEach(child => {
                (child as HTMLElement).style.removeProperty(styleProp);
            });

            span.appendChild(fragment);
            range.insertNode(span);
            
            // Dọn dẹp bất kỳ span rỗng nào trong container
            editableContainer.querySelectorAll('span').forEach(s => {
                if ((!s.getAttribute('style') || s.getAttribute('style')?.trim() === '') && s.childNodes.length === 0) {
                    s.remove();
                }
            });

            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            if (selection && refocus) {
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
        const editableContainer = getEditableContainer(parent);
        if (editableContainer) {
            const event = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(event);
        }
    };

    const adjustFontSize = (amount: number) => {
        const parsed = parseFloat(fontSizeInput);
        const current = (!isNaN(parsed) && parsed > 0) ? parsed : getSelectedFontSize();
        const newVal = Math.max(0.5, Math.min(8, parseFloat((current + amount).toFixed(1))));
        
        setFontSizeInput(newVal.toFixed(1));
        applyStyleToSelection('fontSize', `${newVal}cqw`, true);

        // Phát hiện field đang sửa để event mang đúng field
        const parent = savedRangeRef.current?.commonAncestorContainer;
        const fieldName = detectFieldName(getEditableContainer(parent?.nodeType === 3 ? parent.parentNode : (parent || null)));

        document.dispatchEvent(new CustomEvent('draw-font-size-change', { detail: { size: newVal, field: fieldName } }));
        
        if (savedRangeRef.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRangeRef.current);
            }
        }
    };

    // --- Line Height ---
    const applyLineHeightToSelection = (value: string, refocus: boolean = true) => {
        let range = savedRangeRef.current;
        const selection = window.getSelection();
        if (!range && selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        }
        if (!range) return;

        let parent = range.commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode || parent;
        const editableContainer = getEditableContainer(parent);
        if (!editableContainer) return;
        if (refocus) {
            editableContainer.focus();
        }

        if (range.collapsed) {
            editableContainer.style.lineHeight = value;
            const event = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(event);
            return;
        }

        const selectedText = range.toString();
        let startEl: HTMLElement | null = range.commonAncestorContainer.nodeType === 3
            ? range.commonAncestorContainer.parentElement
            : range.commonAncestorContainer as HTMLElement;
        const innerMatch = startEl?.closest('span[style*="line-height"]') as HTMLElement | null;

        if (innerMatch && editableContainer.contains(innerMatch) && (
            innerMatch.textContent?.trim() === selectedText.trim() ||
            innerMatch === range.commonAncestorContainer
        )) {
            innerMatch.style.lineHeight = value;
            innerMatch.querySelectorAll('span[style*="line-height"]').forEach(child => {
                (child as HTMLElement).style.removeProperty('line-height');
            });
            const flatEvent = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(flatEvent);
            return;
        }

        if (selection && refocus) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
        const span = document.createElement('span');
        span.style.lineHeight = value;
        try {
            const fragment = range.extractContents();
            fragment.querySelectorAll('span[style*="line-height"]').forEach(child => {
                (child as HTMLElement).style.removeProperty('line-height');
            });
            span.appendChild(fragment);
            range.insertNode(span);
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            if (selection && refocus) {
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
            savedRangeRef.current = newRange;
            const event = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(event);
        } catch (e) {
            console.error('Error applying line-height:', e);
        }
    };

    const adjustLineHeight = (amount: number) => {
        const parsed = parseFloat(lineHeightInput);
        const current = (!isNaN(parsed) && parsed > 0) ? parsed : getSelectedLineHeight();
        const newVal = Math.max(0.6, Math.min(3.0, parseFloat((current + amount).toFixed(2))));
        
        setLineHeightInput(newVal.toFixed(1));
        applyLineHeightToSelection(String(newVal), true);

        if (savedRangeRef.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRangeRef.current);
            }
        }
    };

    const handleFontSizeInputChange = (valStr: string) => {
        setFontSizeInput(valStr);
        const val = parseFloat(valStr);
        if (!isNaN(val) && val >= 0.5 && val <= 8) {
            applyStyleToSelection('fontSize', `${val}cqw`, false);
            const parent = savedRangeRef.current?.commonAncestorContainer;
            const fieldName = detectFieldName(getEditableContainer(parent?.nodeType === 3 ? parent.parentNode : (parent || null)));
            document.dispatchEvent(new CustomEvent('draw-font-size-change', { detail: { size: val, field: fieldName } }));
        }
    };

    const handleFontSizeBlur = () => {
        isTypingRef.current = false;
        const val = parseFloat(fontSizeInput);
        const clamped = isNaN(val) ? 3.5 : Math.max(0.5, Math.min(8, val));
        setFontSizeInput(clamped.toFixed(1));
        applyStyleToSelection('fontSize', `${clamped}cqw`, false);
        const parent = savedRangeRef.current?.commonAncestorContainer;
        const fieldName = detectFieldName(getEditableContainer(parent?.nodeType === 3 ? parent.parentNode : (parent || null)));
        document.dispatchEvent(new CustomEvent('draw-font-size-change', { detail: { size: clamped, field: fieldName } }));
    };

    const handleLineHeightInputChange = (valStr: string) => {
        setLineHeightInput(valStr);
        const val = parseFloat(valStr);
        if (!isNaN(val) && val >= 0.6 && val <= 3.0) {
            applyLineHeightToSelection(String(val), false);
        }
    };

    const handleLineHeightBlur = () => {
        isTypingRef.current = false;
        const val = parseFloat(lineHeightInput);
        const clamped = isNaN(val) ? 1.3 : Math.max(0.6, Math.min(3.0, val));
        setLineHeightInput(clamped.toFixed(1));
        applyLineHeightToSelection(String(clamped), false);
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
                    onClick={() => adjustFontSize(-0.1)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                    title="Giảm size chữ"
                >
                    -
                </Button>
                <input 
                    type="text"
                    onMouseDown={(e) => e.stopPropagation()} 
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => { isTypingRef.current = true; }}
                    value={fontSizeInput}
                    onChange={(e) => handleFontSizeInputChange(e.target.value)}
                    onBlur={handleFontSizeBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    className="w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500"
                    title="Kích thước cqw (gõ số hoặc dùng +/-)"
                />
                <Button
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adjustFontSize(0.1)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                    title="Tăng size chữ"
                >
                    +
                </Button>
            </div>

            {/* Line Height controls: ↕ - [value] + */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700/50 mr-1 no-print">
                <span className="text-[9px] text-slate-400 font-bold select-none" title="Khoảng cách dòng">↕</span>
                <Button
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adjustLineHeight(-0.05)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                    title="Giảm khoảng cách dòng"
                >
                    -
                </Button>
                <input
                    type="text"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => { isTypingRef.current = true; }}
                    value={lineHeightInput}
                    onChange={(e) => handleLineHeightInputChange(e.target.value)}
                    onBlur={handleLineHeightBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    className="w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500"
                    title="Khoảng cách dòng (gõ số hoặc dùng +/-)"
                />
                <Button
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adjustLineHeight(0.05)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                    title="Tăng khoảng cách dòng"
                >
                    +
                </Button>
            </div>

            {/* Bold button */}
            <Button
                variant="ghost"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('bold')}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="In đậm (Bold)"
            >
                <Bold size={13} className="stroke-[2.5]" />
            </Button>

            {/* Italic button */}
            <Button
                variant="ghost"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('italic')}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="In nghiêng (Italic)"
            >
                <Italic size={13} className="stroke-[2.5]" />
            </Button>

            {/* Underline button */}
            <Button
                variant="ghost"
                onMouseDown={(e) => e.preventDefault()}
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
