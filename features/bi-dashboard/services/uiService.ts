import { isAbortError } from '../../../utils/dataUtils';

export type ExportMode = 'download' | 'share' | 'blob-only';

/** Download a blob as a file */
export function downloadBlob(blob: Blob, filename: string, forceDownload = false) {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile && blob.type.startsWith('image/') && !forceDownload) {
        shareBlob(blob, filename);
        return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Check if Web Share API with file sharing is available */
export function canShareFiles(): boolean {
    if (!navigator.share || !navigator.canShare) return false;
    try {
        const testFile = new File(['test'], 'test.png', { type: 'image/png' });
        return navigator.canShare({ files: [testFile] });
    } catch {
        return false;
    }
}

/** Share a blob via Web Share API (LINE, Zalo, Telegram, etc.) */
export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
    try {
        const file = new File([blob], filename, { type: 'image/png' });
        
        // Chuyển đổi tên file thành tên bảng hiển thị tiếng Việt
        let displayName = filename.replace('.png', '').replace(/_/g, ' ');
        displayName = displayName.replace(/Bonus Report/i, 'Báo Cáo Thưởng');
        displayName = displayName.replace(/ChiTiet/i, 'Báo Cáo Chi Tiết');
        displayName = displayName.replace(/BC DoanhThu/i, 'Báo Cáo Doanh Thu');
        displayName = displayName.replace(/BC CrossSelling/i, 'Báo Cáo Bán Kèm');
        displayName = displayName.replace(/BC Installment/i, 'Báo Cáo Trả Góp');
        displayName = displayName.replace(/Competition/i, 'Báo Cáo Thi Đua');
        
        const shareData = { 
            files: [file], 
            title: displayName,
            text: displayName
        };
        
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return true;
        } else {
            console.warn('Web Share API không hỗ trợ chia sẻ file trên trình duyệt này.');
            // Fallback: download instead
            downloadBlob(blob, filename, true);
            return false;
        }
    } catch (error: unknown) {
        // User cancelled share — not an error
        if (isAbortError(error)) return false;
        console.error('Lỗi khi chia sẻ:', error);
        // Fallback: download
        downloadBlob(blob, filename, true);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT OVERLAY — Full-screen overlay with progress during image export
// ═══════════════════════════════════════════════════════════════════════
let _overlayEl: HTMLDivElement | null = null;

export function showExportOverlay(message = 'Đang xuất ảnh...', progress?: string) {
    if (!_overlayEl) {
        _overlayEl = document.createElement('div');
        _overlayEl.id = 'export-overlay';
        _overlayEl.style.cssText = `
            position: fixed; inset: 0; z-index: 9999999;
            background: rgba(15,23,42,.65); backdrop-filter: blur(4px);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            opacity: 0; transition: opacity .2s ease;
        `;
        _overlayEl.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px;border-radius:16px;background:rgba(30,41,59,.9);box-shadow:0 8px 32px rgba(0,0,0,.3);">
                <div id="export-spinner" style="width:40px;height:40px;border:3px solid rgba(255,255,255,.15);border-top-color:#818cf8;border-radius:50%;animation:exportSpin .8s linear infinite;"></div>
                <p id="export-msg" style="color:#e2e8f0;font-size:15px;font-weight:600;text-align:center;margin:0;"></p>
                <p id="export-progress" style="color:#94a3b8;font-size:13px;font-weight:500;text-align:center;margin:0;"></p>
            </div>
        `;
        const style = document.createElement('style');
        style.textContent = '@keyframes exportSpin { to { transform: rotate(360deg); } }';
        _overlayEl.appendChild(style);
        document.body.appendChild(_overlayEl);
    }
    const msgEl = _overlayEl.querySelector('#export-msg') as HTMLElement;
    const progressEl = _overlayEl.querySelector('#export-progress') as HTMLElement;
    if (msgEl) msgEl.textContent = message;
    if (progressEl) progressEl.textContent = progress || '';
    requestAnimationFrame(() => { if (_overlayEl) _overlayEl.style.opacity = '1'; });
}

export function updateExportOverlay(message?: string, progress?: string) {
    if (!_overlayEl) return;
    if (message) {
        const msgEl = _overlayEl.querySelector('#export-msg') as HTMLElement;
        if (msgEl) msgEl.textContent = message;
    }
    if (progress !== undefined) {
        const progressEl = _overlayEl.querySelector('#export-progress') as HTMLElement;
        if (progressEl) progressEl.textContent = progress;
    }
}

export function hideExportOverlay() {
    if (_overlayEl) {
        _overlayEl.style.opacity = '0';
        setTimeout(() => {
            _overlayEl?.remove();
            _overlayEl = null;
        }, 200);
    }
}

const waitForImages = (element: HTMLElement): Promise<void[]> => {
    const images = Array.from(element.querySelectorAll('img'));
    const promises = images.map(img => {
        if (img.complete && img.naturalHeight !== 0) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            const timer = setTimeout(() => resolve(), 1500); // 1.5s safety timeout for slow network images
            img.onload = () => {
                clearTimeout(timer);
                resolve();
            };
            img.onerror = () => {
                clearTimeout(timer);
                resolve();
            };
        });
    });
    return Promise.all(promises);
};

// any: được gọi từ 13+ file khác nhau trong features/bi-dashboard với các field options khác nhau;
// siết kiểu ở đây sẽ kéo theo sửa hàng loạt file gọi nó — để lại cho đợt sau khi xử lý các file đó.
export async function exportElementAsImage(element: HTMLElement, filename: string, options: any = {}): Promise<Blob | null> {
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    const defaultScale = isMobileDevice ? 1.5 : 2; // Giảm scale mobile → tiết kiệm ~44% CPU/memory
    const { elementsToHide = ['.hide-on-export'], forceOpenDetails = false, scale = defaultScale, isCompactTable = false, captureAsDisplayed = false, forcedWidth = null, fitCategoryColumn = false, fitAllColumns = false, mode = 'download' as ExportMode, onCloneReady = null } = options;

    const clone = element.cloneNode(true) as HTMLElement;

    elementsToHide.forEach((s: string) => {
        clone.querySelectorAll<HTMLElement>(s).forEach((e) => {
            e.remove(); // Remove hidden elements completely to reduce DOM tree size and boost performance
        });
    });

    // Allow caller to modify clone before capture
    if (typeof onCloneReady === 'function') {
        onCloneReady(clone);
    }

    // Force-show elements marked with 'export-always-show' (e.g. section headers that are hidden on mobile)
    clone.querySelectorAll<HTMLElement>('.export-always-show').forEach((e) => {
        e.style.setProperty('display', 'flex', 'important');
    });

    // For industry grid/pie exports: show desktop layout, hide mobile duplicates
    // Desktop pie chart uses 'hidden lg:block', mobile uses 'lg:hidden'
    const allDivs = clone.querySelectorAll<HTMLElement>('div');
    allDivs.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const cls = el.getAttribute('class') || '';
        // Hide mobile-only chart containers (they have lg:hidden)
        if (cls.includes('lg:hidden') && !cls.includes('export-always-show')) {
            el.remove();
        }
        // Show desktop-only chart containers (they have hidden lg:block)  
        if (cls.includes('hidden') && cls.includes('lg:block')) {
            el.style.setProperty('display', 'block', 'important');
        }
        // Show desktop-only flex containers (they have hidden lg:flex)
        if (cls.includes('hidden') && cls.includes('lg:flex')) {
            el.style.setProperty('display', 'flex', 'important');
        }
    });

    // Remove all truly hidden elements (e.g. display: none or class hidden) to avoid processing them
    clone.querySelectorAll<HTMLElement>('.hidden').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const cls = el.getAttribute('class') || '';
        
        // Check if there are any responsive display classes that override 'hidden' on larger viewports
        const hasResponsiveOverride = /\b(sm|md|lg|xl|2xl):(block|flex|grid|inline|inline-block|table|table-row|table-cell)\b/.test(cls);
        
        // If it has no responsive override and is not forced display, it's truly hidden and safe to remove
        const isForcedDisplay = el.style.display === 'block' || el.style.display === 'flex' || el.style.display === 'grid' || el.style.display === 'inline-block';
        
        if (!isForcedDisplay && !hasResponsiveOverride) {
            el.remove();
        }
    });

    // Also remove elements with style containing display: none
    clone.querySelectorAll<HTMLElement>('[style*="display: none"]').forEach((el) => {
        el.remove();
    });

    // Fix employee names and truncated elements to prevent clipping or wrapping during export
    const isEmployeeNamePattern = (text: string) => {
        return text.includes(' - ') && /\d+/.test(text);
    };

    clone.querySelectorAll<HTMLElement>('td, span, button, div, th').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        
        // Skip table headers and elements inside thead to allow them to wrap naturally
        if (el.closest('thead') || el.tagName.toUpperCase() === 'TH') {
            return;
        }

        const text = el.textContent?.trim() || '';
        const isInTable = !!el.closest('table, .compact-export-table');

        if (isInTable) {
            if (el.classList.contains('truncate')) {
                el.classList.remove('truncate');
                el.style.setProperty('white-space', 'normal', 'important');
                el.style.setProperty('word-break', 'break-word', 'important');
                el.style.setProperty('overflow', 'visible', 'important');
            }
            return;
        }
        
        // Target elements with truncate class or matching employee name pattern
        if (el.classList.contains('truncate') || isEmployeeNamePattern(text)) {
            el.classList.remove('truncate');
            el.style.setProperty('white-space', 'nowrap', 'important');
            el.style.setProperty('overflow', 'visible', 'important');
            el.style.setProperty('text-overflow', 'clip', 'important');
            el.style.setProperty('width', 'auto', 'important');
            el.style.setProperty('max-width', 'none', 'important');
            el.style.setProperty('min-width', 'max-content', 'important');

            // Walk up parents to ensure width container doesn't force wrapping/clipping
            let parent = el.parentElement;
            while (parent && parent !== clone) {
                if (parent instanceof HTMLElement) {
                    const tagName = parent.tagName.toUpperCase();
                    if (tagName === 'TABLE' || tagName === 'TBODY' || tagName === 'THEAD' || tagName === 'TR') {
                        break;
                    }
                    if (parent.classList.contains('min-w-0') || parent.classList.contains('w-full') || parent.style.width === '100%') {
                        parent.style.setProperty('min-width', 'max-content', 'important');
                        parent.style.setProperty('width', 'auto', 'important');
                    }
                }
                parent = parent.parentElement;
            }
        }
    });



    // --- RETAINED LAYOUT FIXES FOR EXPORT PRESENTATION ---
    // These are kept because they explicitly change how the data looks in the export format.

    // 1. KPI Cards: Add padding AND FORCE GRID LAYOUT
    const kpiGrid = clone.querySelector('.kpi-grid-for-export');
    if (kpiGrid && kpiGrid instanceof HTMLElement) {
        const cardCount = kpiGrid.children.length;
        const cols = cardCount === 5 ? 5 : (cardCount >= 3 ? 3 : 2);
        kpiGrid.style.setProperty('display', 'grid', 'important');
        kpiGrid.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');
        kpiGrid.style.setProperty('gap', '0.75rem', 'important');
        kpiGrid.style.setProperty('width', '100%', 'important');
        kpiGrid.style.setProperty('margin-bottom', '0px', 'important');
        kpiGrid.style.setProperty('padding-bottom', '0px', 'important');

        if (kpiGrid.parentElement instanceof HTMLElement) {
            kpiGrid.parentElement.style.setProperty('padding-bottom', '0.25rem', 'important');
            kpiGrid.parentElement.style.setProperty('margin-bottom', '0px', 'important');
        }
    }

    const kpiCardElements = clone.querySelectorAll('.kpi-grid-for-export > .chart-card');
    kpiCardElements.forEach(el => {
        if (el instanceof HTMLElement) {
            el.style.paddingBottom = 'calc(0.75rem + 2px)';
        }
    });

    const traGopAuxElements = clone.querySelectorAll('.chart-card .flex-shrink-0 > .text-xs');
    traGopAuxElements.forEach(el => {
        if (el instanceof HTMLElement) el.style.paddingBottom = '2px';
    });

    // 1b. KPI Cards: Shorten titles for compact export
    const kpiTitles = clone.querySelectorAll('.kpi-grid-for-export h3');
    const titleShortMap: Record<string, string> = {
        'Doanh Thu Thực': 'DT Thực',
        'Doanh Thu Q.Đổi': 'DT Q.Đổi',
        'Hiệu Quả Q.Đổi': 'HQ Q.Đổi',
        'Tỷ Lệ Trả Góp': 'Trả Góp',
        'DT Chưa Xuất': 'Chờ Xuất',
        'Doanh Thu Thực Chờ Xuất': 'DT Chờ Xuất',
    };
    kpiTitles.forEach(el => {
        if (el instanceof HTMLElement) {
            const text = el.textContent?.trim() || '';
            if (titleShortMap[text]) el.textContent = titleShortMap[text];
        }
    });

    // 1d. KPI "Chờ Xuất" card: clean up trend area for export
    // Remove "⚠ Cảnh báo" label, simplify "N đơn chờ xuất" → "N Chờ xuất"
    const kpiCards = clone.querySelectorAll('.kpi-grid-for-export > div');
    kpiCards.forEach(card => {
        if (!(card instanceof HTMLElement)) return;
        const titleEl = card.querySelector('h3');
        const titleText = titleEl?.textContent?.trim() || '';
        if (titleText === 'Chờ Xuất' || titleText === 'DT Chưa Xuất') {
            // Find and simplify the trend label ("⚠ Cảnh báo" -> remove)
            const trendLabels = card.querySelectorAll('span');
            trendLabels.forEach(span => {
                if (span instanceof HTMLElement) {
                    const text = span.textContent?.trim() || '';
                    if (text.includes('Cảnh báo')) {
                        span.style.display = 'none';
                    }
                    // "N đơn chờ xuất" -> "N Chờ xuất"
                    if (text.includes('đơn chờ xuất')) {
                        // Find the text node containing "đơn chờ xuất" and replace
                        const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
                        let node: Text | null;
                        while ((node = walker.nextNode() as Text | null)) {
                            if (node.textContent?.includes('đơn chờ xuất')) {
                                node.textContent = node.textContent.replace('đơn chờ xuất', 'Chờ xuất');
                            }
                        }
                    }
                }
            });
        }
    });

    // 1c. Hide all alert/warning banners from exported KPI summary image by removing them from DOM
    clone.querySelectorAll('[class*="bg-amber-50"], [class*="bg-rose-50"], [class*="bg-amber-955"]').forEach(banner => {
        if (banner instanceof HTMLElement) {
            const text = banner.textContent?.trim() || '';
            if (text.includes('CHƯA HỦY') || text.includes('CÔNG NỢ') || text.includes('CHƯA CẤU HÌNH') || text.includes('QUÁ HẠN XUẤT')) {
                banner.remove();
            }
        }
    });

    // 2. Industry Grid: Fix layout for narrow export
    if (forcedWidth) {
        // Convert 50:50 side-by-side layout to vertical stack at narrow widths
        // Target the flex-row container that holds cards grid (left) and pie chart (right)
        const industryFlexRows = clone.querySelectorAll('.flex.flex-row.gap-5.items-start');
        industryFlexRows.forEach(row => {
            if (row instanceof HTMLElement) {
                row.style.setProperty('flex-direction', 'column', 'important');
                row.style.setProperty('gap', '1rem', 'important');
            }
        });
        
        // Also fix the header row above the content (both side headers)
        const industryHeaderRows = clone.querySelectorAll('.mb-3.flex.flex-row.items-center.gap-5');
        industryHeaderRows.forEach(row => {
            if (row instanceof HTMLElement) {
                row.style.setProperty('flex-direction', 'column', 'important');
                row.style.setProperty('gap', '0.5rem', 'important');
                row.style.setProperty('align-items', 'flex-start', 'important');
            }
        });
        
        // Make w-1/2 children full-width (use class list check since / in selectors can be tricky)
        clone.querySelectorAll('div').forEach(el => {
            if (el instanceof HTMLElement && el.classList.contains('w-1/2')) {
                el.style.setProperty('width', '100%', 'important');
                el.style.setProperty('flex-shrink', '1', 'important');
            }
        });

        // Constrain the pie chart <img> (converted from SVG) to fit the container
        const pieContainers = clone.querySelectorAll('[style*="min-height: 340"]');
        pieContainers.forEach(container => {
            if (container instanceof HTMLElement) {
                container.style.setProperty('min-height', 'auto', 'important');
                // Find any img inside (our SVG-to-img conversion)
                const pieImg = container.querySelector('img');
                if (pieImg) {
                    pieImg.style.setProperty('max-width', '100%', 'important');
                    pieImg.style.setProperty('height', 'auto', 'important');
                    pieImg.style.setProperty('margin', '0 auto', 'important');
                }
            }
        });

        // Also constrain the card grid from 4 columns to 3 for narrower export
        const cardGrids = clone.querySelectorAll('.grid.grid-cols-4.gap-2');
        cardGrids.forEach(grid => {
            if (grid instanceof HTMLElement) {
                grid.style.setProperty('grid-template-columns', 'repeat(3, minmax(0, 1fr))', 'important');
            }
        });
    }

    // 2b. Industry Grid Cards: Force desktop layout (4 cols, desktop gap) for all exports 
    const industryCardGrids = clone.querySelectorAll('.industry-cards-grid');
    industryCardGrids.forEach(grid => {
        if (grid instanceof HTMLElement) {
            grid.style.setProperty('grid-template-columns', 'repeat(4, minmax(0, 1fr))', 'important');
            grid.style.setProperty('gap', '0.5rem', 'important');
        }
    });

    if (filename.startsWith('ty-trong-nganh-hang') || filename.startsWith('tong-quan-kinh-doanh')) {
        const industryCardTitles = clone.querySelectorAll('.industry-cards-grid .font-bold.truncate.w-full');
        industryCardTitles.forEach(el => {
            if (el instanceof HTMLElement) el.style.paddingBottom = '5px';
        });
    }

    // 3. Top Seller List Items
    if (filename.startsWith('top-ban-chay') || filename.startsWith('tong-quan-kinh-doanh') || filename.startsWith('phan-tich-nhan-vien-topSellers')) {
        const topSellerElementsToPad = [
            ...clone.querySelectorAll('.flex-grow.min-w-0 > .font-bold.truncate'),
            ...clone.querySelectorAll('.flex-grow.min-w-0 > .text-xs'),
            ...clone.querySelectorAll('.w-8.text-2xl'),
            ...clone.querySelectorAll('.w-8.text-xs.font-bold'),
            ...clone.querySelectorAll('.text-right.flex-shrink-0')
        ];
        topSellerElementsToPad.forEach(el => {
            if (el instanceof HTMLElement) el.style.paddingBottom = '5px';
        });
    }

    // 4. Warehouse Summary & Summary Table Fix
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('bao-cao-kho') || lowerFilename.includes('chi-tiet-nganh-hang')) {
        const elementsToPad = [
            ...clone.querySelectorAll('tbody > tr'),
            ...clone.querySelectorAll('tfoot')
        ];

        elementsToPad.forEach(el => {
            if (el instanceof HTMLElement) el.style.paddingBottom = '5px';
        });

        const mainHeaderCell = clone.querySelector('thead tr:first-child th:first-child');
        
        if (mainHeaderCell && mainHeaderCell instanceof HTMLElement) {
            mainHeaderCell.style.setProperty('position', 'relative', 'important');
            mainHeaderCell.style.setProperty('z-index', '9999', 'important');

            const isDark = document.documentElement.classList.contains('dark');
            let bgColor = isDark ? '#1f2937' : '#f8fafc';
            
            if (lowerFilename.includes('chi-tiet-nganh-hang')) {
                bgColor = isDark ? '#1f2937' : '#eef2ff';
            } else if (lowerFilename.includes('bao-cao-kho')) {
                bgColor = isDark ? '#881337' : '#fecdd3';
            }
            
            mainHeaderCell.style.setProperty('background-color', bgColor, 'important');
            mainHeaderCell.style.setProperty('background-image', 'none', 'important');
        }

        const headerRows = clone.querySelectorAll('thead tr');
        if (headerRows.length > 1) {
            const secondHeaderRow = headerRows[1] as HTMLElement;
            secondHeaderRow.style.setProperty('position', 'relative', 'important');
            secondHeaderRow.style.setProperty('z-index', '0', 'important');
        }
    }

    // 5. Compact Warehouse Summary for Export
    if (lowerFilename.includes('bao-cao-kho')) {
        const headerContainer = clone.querySelector('.px-8.py-6');
        if (headerContainer instanceof HTMLElement) {
            headerContainer.style.setProperty('padding-top', '15px', 'important');
            headerContainer.style.setProperty('padding-bottom', '10px', 'important');
        }
        
        const tableContainer = clone.querySelector('.overflow-x-auto.p-4');
        if (tableContainer instanceof HTMLElement) {
            tableContainer.style.setProperty('padding-top', '0', 'important');
            tableContainer.style.setProperty('padding-bottom', '10px', 'important');
        }
    }

    if (forceOpenDetails) {
        const detailsToOpen = [
            ...(clone.tagName.toLowerCase() === 'details' ? [clone as HTMLDetailsElement] : []),
            ...Array.from(clone.querySelectorAll('details'))
        ];
        detailsToOpen.forEach(detail => {
            (detail as HTMLDetailsElement).open = true;
        });
    }
    
    // 7. COMPACT EXPORT TABLE WIDTH CONSTRAINTS & WORD WRAP
    clone.querySelectorAll('.compact-export-table, table').forEach(table => {
        if (!(table instanceof HTMLElement)) return;
        table.style.setProperty('table-layout', 'auto', 'important');
        table.style.setProperty('width', '100%', 'important');
        table.style.setProperty('min-width', 'auto', 'important');

        // Tìm index của cột "NHÓM THI ĐUA" trong bảng
        let nhomThiDuaColIdx = -1;
        const ths = table.querySelectorAll('thead th');
        ths.forEach((th, idx) => {
            const text = th.textContent?.trim().replace(/\s+/g, ' ').toUpperCase().normalize('NFC') || '';
            if (text.includes('NHÓM THI ĐUA') || text === 'NHÓM') {
                nhomThiDuaColIdx = idx;
            }
        });

        // Xử lý các thẻ th của bảng
        table.querySelectorAll('thead th').forEach((th, idx) => {
            if (!(th instanceof HTMLElement)) return;
            const isFirstCol = th.previousElementSibling === null;
            const isNhomThiDuaCol = idx === nhomThiDuaColIdx;

            // Ép cỡ chữ (11px) và line-height vừa đủ, cân đối với nội dung
            th.style.setProperty('font-size', '11px', 'important');
            th.style.setProperty('line-height', '1.25', 'important');
            th.style.setProperty('padding', '3px 5px', 'important');

            if (isNhomThiDuaCol || (isFirstCol && nhomThiDuaColIdx === -1)) {
                th.style.setProperty('min-width', '100px', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
                th.style.setProperty('max-width', 'none', 'important');
                
                // Bọc thẻ span con để tránh bug html2canvas/html-to-image ngắt dòng text thô
                if (!th.querySelector('.export-nowrap-wrapper')) {
                    const content = th.innerHTML;
                    th.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-block !important; width: max-content !important; line-height: 1.25 !important;">${content}</span>`;
                }
            } else {
                th.style.setProperty('white-space', 'normal', 'important');
                th.style.setProperty('word-break', 'break-word', 'important');
                th.style.setProperty('max-width', '80px', 'important');
                th.style.setProperty('min-width', '55px', 'important');
            }
            
            th.querySelectorAll('span').forEach(span => {
                span.classList.remove('truncate');
                span.style.setProperty('line-height', '1.25', 'important');
                if (!isFirstCol && !isNhomThiDuaCol) {
                    span.style.setProperty('white-space', 'normal', 'important');
                    span.style.setProperty('word-break', 'break-word', 'important');
                } else {
                    span.style.setProperty('white-space', 'nowrap', 'important');
                }
            });
        });

        // Xử lý các thẻ td của bảng
        table.querySelectorAll('tbody tr').forEach((tr) => {
            tr.querySelectorAll('td').forEach((td, idx) => {
                if (!(td instanceof HTMLElement)) return;
                const isFirstCol = td.previousElementSibling === null;
                const isNhomThiDuaCol = idx === nhomThiDuaColIdx;

                // Ép cỡ chữ chuẩn 13px và padding 3px 5px giúp hàng gọn gàng, siêu sắc nét chuẩn như bảng Trả Góp
                td.style.setProperty('font-size', '13px', 'important');
                td.style.setProperty('line-height', '1.25', 'important');
                td.style.setProperty('padding', '3px 5px', 'important');

                // Đồng bộ cỡ chữ các thẻ con bên trong td (span, div, button, p) trừ badge siêu nhỏ
                td.querySelectorAll<HTMLElement>('div, span, button, p, a').forEach(child => {
                    const childCls = child.getAttribute('class') || '';
                    if (!childCls.includes('text-[8px]') && !childCls.includes('text-[9px]')) {
                        child.style.setProperty('font-size', '13px', 'important');
                    }
                    child.style.setProperty('line-height', '1.25', 'important');

                    // Thu gọn các badge tròn (w-5 h-5, w-6 h-6) trong ô dữ liệu để không bị phồng chiều cao dòng khi xuất
                    if (childCls.includes('w-5') || childCls.includes('w-6') || childCls.includes('h-5') || childCls.includes('h-6')) {
                        const txt = child.textContent?.trim() || '';
                        if (/^[0-9\-+%]+$/.test(txt)) {
                            child.style.setProperty('width', 'auto', 'important');
                            child.style.setProperty('height', 'auto', 'important');
                            child.style.setProperty('min-width', '0px', 'important');
                            child.style.setProperty('min-height', '0px', 'important');
                            child.style.setProperty('padding', '0px 2px', 'important');
                        }
                    }

                    if (child.tagName === 'DIV' || child.tagName === 'P') {
                        child.style.setProperty('padding-top', '0px', 'important');
                        child.style.setProperty('padding-bottom', '0px', 'important');
                        child.style.setProperty('margin-top', '0px', 'important');
                        child.style.setProperty('margin-bottom', '0px', 'important');
                    }
                });

                if (isNhomThiDuaCol || (isFirstCol && nhomThiDuaColIdx === -1)) {
                    td.style.setProperty('white-space', 'nowrap', 'important');
                    td.style.setProperty('min-width', '100px', 'important');
                    td.style.setProperty('max-width', 'none', 'important');
                    
                    // Bọc thẻ span con chống ngắt dòng
                    if (!td.querySelector('.export-nowrap-wrapper')) {
                        const content = td.innerHTML;
                        td.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-block !important; width: max-content !important; line-height: 1.25 !important;">${content}</span>`;
                    }
                } else {
                    if (!td.classList.contains('sticky') && !isFirstCol) {
                        td.style.setProperty('min-width', '45px', 'important');
                        td.style.setProperty('max-width', '80px', 'important');

                        // Tự động nhận diện các ô số, phần trăm hoặc ProgressBar để chống ngắt dòng
                        const text = td.textContent?.trim() || '';
                        const isNumeric = /^[0-9%\s.,+\-/]+$/.test(text);
                        if (isNumeric || td.querySelector('.w-10')) {
                            td.style.setProperty('white-space', 'nowrap', 'important');
                            if (!td.querySelector('.export-nowrap-wrapper')) {
                                const content = td.innerHTML;
                                td.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-block !important; width: max-content !important; line-height: 1.25 !important;">${content}</span>`;
                            }
                        } else {
                            td.style.setProperty('white-space', 'normal', 'important');
                            td.style.setProperty('word-break', 'break-all', 'important');
                        }
                    }
                }
            });
        });
    });

    // FIX FOR SCROLLABLE CONTENT (Expand scrollable tables for export)
    const scrollableContainers = clone.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-y-auto, .custom-scrollbar, [class*="max-h-"], [class*="overflow-"]');
    const hideScrollbarStyle = document.createElement('style');
    hideScrollbarStyle.textContent = `
        .clone-no-scrollbar::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .clone-no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    `;
    clone.appendChild(hideScrollbarStyle);
    // Hide scrollbar on the root clone element itself
    clone.style.scrollbarWidth = 'none';
    clone.classList.add('clone-no-scrollbar');

    if (captureAsDisplayed) {
        // Only expand VERTICAL overflow — keep horizontal clipped to match viewport width
        scrollableContainers.forEach((container) => {
            container.style.maxHeight = 'none';
            container.style.overflowY = 'visible';
            if (container instanceof HTMLElement) {
                container.style.scrollbarWidth = 'none';
                container.classList.add('clone-no-scrollbar');
            }
        });
    } else {
        // Full expansion — expand both directions for maximum content capture
        scrollableContainers.forEach((container) => {
            container.style.maxHeight = 'none';
            container.style.maxWidth = 'none';
            container.style.overflow = 'visible';
            container.style.overflowX = 'visible';
            container.style.overflowY = 'visible';
            if (container instanceof HTMLElement) {
                container.style.scrollbarWidth = 'none';
                container.classList.add('clone-no-scrollbar');
            }
        });
    }

    // 6. FIX CHART SVG RENDERING (convert Recharts SVGs to inline images for reliable export)
    // html-to-image has trouble with nested SVGs in foreignObject. Convert them to <img> tags.
    const liveSvgs = element.querySelectorAll('svg');
    const cloneSvgs = clone.querySelectorAll('svg');
    cloneSvgs.forEach((svg: SVGSVGElement, idx: number) => {
        // Handle Google Charts SVGs
        if (svg.hasAttribute('aria-label') && svg.getAttribute('aria-label') === 'A chart.') {
            const currentWidthStr = svg.getAttribute('width');
            const currentHeightStr = svg.getAttribute('height');
            
            if (currentWidthStr && currentWidthStr !== '100%') {
                const w = parseFloat(currentWidthStr);
                const h = parseFloat(currentHeightStr || '0');
                if (w && h && !svg.hasAttribute('viewBox')) {
                    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
                    svg.setAttribute('width', '100%');
                    svg.setAttribute('height', '100%');
                }
            }
        }
    });

    // Convert Recharts SVGs to inline <img> for reliable export
    // Use the LIVE element's SVGs (which have correct content) as the source
    const liveRechartsSvgs = element.querySelectorAll('svg.recharts-surface');
    const cloneRechartsSvgs = clone.querySelectorAll('svg.recharts-surface');
    cloneRechartsSvgs.forEach((cloneSvg: Element, idx: number) => {
        const liveSvg = idx < liveRechartsSvgs.length ? liveRechartsSvgs[idx] : null;
        const sourceSvg = liveSvg || cloneSvg;
        
        let w = parseFloat(sourceSvg.getAttribute('width') || '0');
        let h = parseFloat(sourceSvg.getAttribute('height') || '0');
        if (w <= 0 || h <= 0) return;

        try {
            // Clone from the live SVG to get the correct rendering
            const svgClone = sourceSvg.cloneNode(true) as SVGElement;
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            if (!svgClone.hasAttribute('viewBox')) {
                svgClone.setAttribute('viewBox', `0 0 ${w} ${h}`);
            }
            // Inline computed styles for text elements (fonts, fills) 
            const liveTexts = sourceSvg.querySelectorAll('text, tspan');
            svgClone.querySelectorAll('text, tspan').forEach((textEl: SVGElement, idx: number) => {
                const liveText = liveTexts[idx];
                if (liveText) {
                    const computed = window.getComputedStyle(liveText);
                    if (computed.fontFamily) textEl.style.fontFamily = computed.fontFamily;
                    if (computed.fontSize) textEl.style.fontSize = computed.fontSize;
                    
                    // Only apply fill if it's explicitly set in CSS, otherwise rely on the SVG 'fill' attribute
                    const fill = computed.getPropertyValue('fill');
                    if (fill && fill !== 'none' && fill !== 'rgba(0, 0, 0, 0)') {
                        textEl.style.fill = fill;
                    }
                }
            });
            const svgData = new XMLSerializer().serializeToString(svgClone);
            const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
            const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.width = `${w}px`;
            img.style.height = `${h}px`;
            img.style.maxWidth = '100%';
            img.style.display = 'block';

            // Replace the SVG with the img in the clone
            const parent = cloneSvg.parentElement;
            if (parent) {
                parent.replaceChild(img, cloneSvg);
            }
        } catch (e) {
            console.warn('Failed to convert Recharts SVG to image:', e);
        }
    });

    // 7. FIT CATEGORY COLUMN — shrink "DANH MỤC" to content width for export
    if (fitCategoryColumn) {
        // Target the header th (sticky first column) and all body/footer first-column cells
        const stickyHeaders = clone.querySelectorAll('thead th:first-child');
        const stickyCells = clone.querySelectorAll('tbody td:first-child, tfoot td:first-child');
        const allFirstCols = [...Array.from(stickyHeaders), ...Array.from(stickyCells)];
        
        allFirstCols.forEach(el => {
            if (el instanceof HTMLElement) {
                // Remove Tailwind fixed-width classes
                el.classList.forEach(cls => {
                    if (cls.startsWith('w-[') || cls.startsWith('md:w-') || cls.startsWith('lg:w-')) {
                        el.classList.remove(cls);
                    }
                });
                el.style.setProperty('width', 'auto', 'important');
                el.style.setProperty('min-width', '0', 'important');
                el.style.setProperty('max-width', 'none', 'important');
                el.style.setProperty('white-space', 'nowrap', 'important');
            }
        });

        // Also set the table layout to auto so columns can shrink
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            table.style.setProperty('table-layout', 'auto', 'important');
        });
    }

    // 8. FIT ALL COLUMNS — shrink every column to content width for compact export
    if (fitAllColumns) {
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            table.style.setProperty('table-layout', 'auto', 'important');
            table.style.setProperty('width', 'auto', 'important');
            // Remove w-full, min-w-max classes that force full width
            table.classList.remove('w-full');
            table.classList.forEach(cls => {
                if (cls.startsWith('min-w-') || cls.startsWith('w-')) {
                    table.classList.remove(cls);
                }
            });
        });

        // Make all cells shrink to content
        const allCells = clone.querySelectorAll('th, td');
        allCells.forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.setProperty('width', 'auto', 'important');
                el.style.setProperty('min-width', '0', 'important');
                el.style.setProperty('white-space', 'nowrap', 'important');
                // Remove any fixed width / padding classes safely
                const classesToRemove = Array.from(el.classList).filter(cls => 
                    cls.startsWith('w-[') || cls.startsWith('w-') || cls.startsWith('min-w-') || 
                    cls.startsWith('lg:w-') || cls.startsWith('md:w-') || cls.startsWith('px-') || 
                    cls.startsWith('py-') || cls.startsWith('sm:px-') || cls.startsWith('sm:py-') || 
                    cls.startsWith('p-')
                );
                classesToRemove.forEach(cls => el.classList.remove(cls));
            }
        });

        // Apply differentiated padding: headers keep comfortable spacing, data rows are compact
        clone.querySelectorAll('thead th').forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.setProperty('padding', '4px 10px', 'important');
                el.style.setProperty('font-size', '13px', 'important');
            }
        });
        clone.querySelectorAll('tbody td').forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.setProperty('padding', '2px 6px', 'important');
            }
        });
        clone.querySelectorAll('tfoot td').forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.setProperty('padding', '3px 8px', 'important');
                el.style.setProperty('font-size', '13px', 'important');
            }
        });

        // Remove w-full from table container divs
        const tableContainers = clone.querySelectorAll('.overflow-x-auto');
        tableContainers.forEach(container => {
            if (container instanceof HTMLElement) {
                container.style.setProperty('width', 'fit-content', 'important');
            }
        });
    }

    // PRE-CLONE FIX: Capture Recharts dimensions BEFORE moving clone off-screen
    // Recharts ResponsiveContainer reads dimensions from DOM. Once off-screen, it renders at 0x0.
    // We must bake in explicit dimensions from the live element.
    const liveRechartsContainers = element.querySelectorAll('.recharts-responsive-container');
    const cloneRechartsContainers = clone.querySelectorAll('.recharts-responsive-container');
    liveRechartsContainers.forEach((liveEl, idx) => {
        const cloneEl = cloneRechartsContainers[idx] as HTMLElement;
        if (cloneEl && liveEl instanceof HTMLElement) {
            const liveRect = liveEl.getBoundingClientRect();
            if (liveRect.width > 0 && liveRect.height > 0) {
                cloneEl.style.setProperty('width', `${liveRect.width}px`, 'important');
                cloneEl.style.setProperty('height', `${liveRect.height}px`, 'important');
            }
        }
    });
    // Also bake in Recharts wrapper dimensions
    const liveWrappers = element.querySelectorAll('.recharts-wrapper');
    const cloneWrappers = clone.querySelectorAll('.recharts-wrapper');
    liveWrappers.forEach((liveEl, idx) => {
        const cloneEl = cloneWrappers[idx] as HTMLElement;
        if (cloneEl && liveEl instanceof HTMLElement) {
            const liveRect = liveEl.getBoundingClientRect();
            if (liveRect.width > 0 && liveRect.height > 0) {
                cloneEl.style.setProperty('width', `${liveRect.width}px`, 'important');
                cloneEl.style.setProperty('height', `${liveRect.height}px`, 'important');
            }
        }
    });

    const captureContainer = document.createElement('div');
    captureContainer.style.position = 'absolute';
    captureContainer.style.left = '-9999px';
    captureContainer.style.top = '0';
    
    if (forcedWidth) {
        captureContainer.style.width = `${forcedWidth}px`;
        captureContainer.style.height = 'auto';
        clone.style.width = `${forcedWidth}px`;
        clone.style.maxWidth = `${forcedWidth}px`;
        clone.style.minWidth = `${forcedWidth}px`;
        clone.style.overflow = 'hidden';
        // Force all responsive containers to scale down to forced width
        clone.querySelectorAll<HTMLElement>('.recharts-responsive-container, .recharts-wrapper').forEach((el) => {
            el.style.setProperty('max-width', `${forcedWidth - 48}px`, 'important'); // 48px for padding
        });
    } else if (captureAsDisplayed) {
        // Lock width to viewport display width, but allow full content height
        const viewportWidth = element.clientWidth;
        captureContainer.style.width = `${viewportWidth}px`;
        captureContainer.style.height = 'auto';
        clone.style.width = `${viewportWidth}px`;
        clone.style.minWidth = `${viewportWidth}px`;
        clone.style.maxWidth = `${viewportWidth}px`;
        clone.style.overflowX = 'hidden';
    } else {
        captureContainer.style.width = 'fit-content';
        captureContainer.style.height = 'auto';
    }
    
    const shouldCompactTable = captureAsDisplayed ? false : isCompactTable;
    if (shouldCompactTable) {
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            table.classList.add('compact-export-table');
        });
    }

    captureContainer.appendChild(clone);
    document.body.appendChild(captureContainer);
    
    // Clean scripts
    clone.querySelectorAll('script').forEach(s => s.remove());

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT PADDING OPTIMIZATION: Strip excessive inner padding for thin borders
    // ═══════════════════════════════════════════════════════════════════════
    const isDarkForBorder = document.documentElement.classList.contains('dark');
    const borderColor = isDarkForBorder ? '#334155' : '#e2e8f0';

    // Add thin border around the entire exported image
    clone.style.border = `1px solid ${borderColor}`;
    clone.style.borderRadius = '0';

    // Strip padding from .chart-card elements (they have p-6 = 24px by default)
    clone.querySelectorAll<HTMLElement>('.chart-card').forEach((el) => {
        if (el instanceof HTMLElement) {
            el.style.setProperty('padding', '4px', 'important');
            el.style.setProperty('border-radius', '0', 'important');
            el.style.setProperty('border', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        }
    });

    // Strip padding from .surface-card elements 
    clone.querySelectorAll<HTMLElement>('.surface-card').forEach((el) => {
        if (el instanceof HTMLElement) {
            el.style.setProperty('padding', '4px', 'important');
            el.style.setProperty('border-radius', '0', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        }
    });

    // Strip large padding from content containers (p-6, p-2.5, lg:p-6, lg:pt-8, etc.)
    clone.querySelectorAll<HTMLElement>('div, header, section').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const cls = el.getAttribute('class') || '';
        if (cls.includes('lg:pt-8') || cls.includes('lg:pt-6') || cls.includes('pt-8')) {
            el.style.setProperty('padding-top', '6px', 'important');
        }
        if ((cls.includes('p-6') || cls.includes('lg:p-6') || cls.includes('p-5') || cls.includes('py-5') || cls.includes('lg:px-4') || cls.includes('lg:pb-4')) && !cls.includes('kpi-grid')) {
            el.style.setProperty('padding-top', '4px', 'important');
            el.style.setProperty('padding-bottom', '4px', 'important');
            el.style.setProperty('padding-left', '6px', 'important');
            el.style.setProperty('padding-right', '6px', 'important');
        }
    });

    // Strip border-radius from the clone root itself
    clone.style.borderRadius = '0';
    clone.style.padding = '0';

    try {
        await document.fonts.ready;
        await waitForImages(clone);

        // FIX: Convert oklch() → rgb() inline trước khi capture
        fixOklchColors(clone);

        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise(resolve => setTimeout(resolve, 200));

        // Use exact bounding dimensions of clone after DOM modifications
        const rect = clone.getBoundingClientRect();
        const exportPadding = 4; // px on each side — must match the padding in htmlToImage style below
        const contentHeight = Math.ceil(clone.offsetHeight || clone.scrollHeight || rect.height);
        const contentWidth = captureAsDisplayed ? element.clientWidth : (rect.width || clone.scrollWidth);

        const finalWidth = Math.ceil(contentWidth) + exportPadding * 2;
        let finalHeight = contentHeight + exportPadding * 2;

        let finalScale = scale;
        if (finalHeight * scale > 32000) {
            finalScale = Math.max(1, 32000 / finalHeight);
            console.warn(`Cảnh báo: Ảnh quá dài (${finalHeight}px). Tự động giảm tỉ lệ xuống ${finalScale.toFixed(2)} để tránh lỗi trình duyệt.`);
        }

        const isDark = document.documentElement.classList.contains('dark');
        const defaultBg = isDark ? '#0f172a' : '#ffffff';
        const isTransparentTable = lowerFilename.includes('bao-cao-kho') || lowerFilename.includes('chi-tiet-nganh-hang');

        const htmlToImage = await import('html-to-image');
        const blob = await htmlToImage.toBlob(clone, {
            pixelRatio: finalScale,
            backgroundColor: isTransparentTable ? undefined : defaultBg,
            width: finalWidth,
            height: finalHeight,
            style: {
                margin: '0',
                padding: '4px',
            },
            // GIỮ font embedding mặc định (skipFonts: false) để text render đúng.
            // Trước đây tắt font để "tránh treo" nhưng điều này khiến text mất hoàn toàn.
        });

        if (!blob) {
            throw new Error("Không thể tạo ảnh từ DOM (kết quả trả về trống).");
        }

        // Handle based on export mode
        if (mode === 'blob-only') {
            return blob;
        } else if (mode === 'share') {
            await shareBlob(blob, filename);
            return blob;
        } else {
            // Default: download
            downloadBlob(blob, filename);
            return blob;
        }
        
    } catch (error) {
        console.error(`Lỗi khi xuất ảnh: ${filename}`, error);
        return null;
    } finally {
        if (document.body.contains(captureContainer)) {
            document.body.removeChild(captureContainer);
        }
    }
}

/** Helper to convert oklch() color values to standard rgb/rgba/hex format for html2canvas */
export function fixOklchColors(root: HTMLElement) {
    const cvs = document.createElement('canvas');
    cvs.width = 1;
    cvs.height = 1;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    function resolveOklch(val: string): string | null {
        if (!val || typeof val !== 'string' || val.indexOf('oklch') === -1) return null;
        try {
            // Sentinel KHÔNG được là đen — trước đây dùng '#000000' làm mốc rồi coi
            // "fillStyle không đổi sau khi gán val" là "màu này vốn đen", nhưng nếu canvas
            // không parse được cú pháp màu (vd biến thể oklch/color-mix mà html-to-image/một
            // số trình duyệt export không hỗ trợ), gán thất bại cũng khiến fillStyle giữ
            // nguyên '#000000' — bị hiểu nhầm thành "màu đen thật" và tô nhầm viền/nền/chữ
            // thành đen khi xuất ảnh. Đổi sang màu không thể trùng màu thiết kế thật để phân
            // biệt rạch ròi "parse được" vs "không parse được".
            const SENTINEL = '#ff00fe';
            ctx!.clearRect(0, 0, 1, 1);
            ctx!.fillStyle = SENTINEL;
            ctx!.fillStyle = val;
            if (ctx!.fillStyle === SENTINEL) return null; // Không parse được — giữ nguyên màu gốc, không đoán mò.

            ctx!.fillRect(0, 0, 1, 1);
            const px = ctx!.getImageData(0, 0, 1, 1).data;
            if (px[3] > 0) {
                return 'rgba(' + px[0] + ',' + px[1] + ',' + px[2] + ',' + (px[3] / 255).toFixed(2) + ')';
            }
            return ctx!.fillStyle;
        } catch (e) {
            return null;
        }
    }

    const els = [root, ...Array.from(root.querySelectorAll('*'))];
    type ColorStyleProp = 'color' | 'backgroundColor' | 'borderColor' | 'borderTopColor' | 'borderRightColor' | 'borderBottomColor' | 'borderLeftColor' | 'outlineColor' | 'textDecorationColor' | 'caretColor';
    const colorProps: [ColorStyleProp, string][] = [
        ['color', 'color'],
        ['backgroundColor', 'background-color'],
        ['borderColor', 'border-color'],
        ['borderTopColor', 'border-top-color'],
        ['borderRightColor', 'border-right-color'],
        ['borderBottomColor', 'border-bottom-color'],
        ['borderLeftColor', 'border-left-color'],
        ['outlineColor', 'outline-color'],
        ['textDecorationColor', 'text-decoration-color'],
        ['caretColor', 'caret-color']
    ];

    for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!(el instanceof HTMLElement)) continue;
        try {
            const cs = window.getComputedStyle(el);
            for (let j = 0; j < colorProps.length; j++) {
                const val = cs[colorProps[j][0]];
                if (val && typeof val === 'string' && val.indexOf('oklch') !== -1) {
                    const rgb = resolveOklch(val);
                    if (rgb) el.style.setProperty(colorProps[j][1], rgb, 'important');
                }
            }
            const shadow = cs.boxShadow;
            if (shadow && shadow.indexOf('oklch') !== -1) {
                const fixed = shadow.replace(/oklch\([^)]+\)/g, (match) => {
                    return resolveOklch(match) || 'transparent';
                });
                el.style.setProperty('box-shadow', fixed, 'important');
            }
        } catch (e) {
            // ignore
        }
    }
}
