import { ExportMode, downloadBlob, shareBlob } from './blobUtils';
import { fixOklchColors } from './colorUtils';

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
                if (!isEmployeeNamePattern(text)) {
                    el.style.setProperty('white-space', 'normal', 'important');
                    el.style.setProperty('word-break', 'break-word', 'important');
                } else {
                    el.style.setProperty('white-space', 'nowrap', 'important');
                }
                el.style.setProperty('overflow', 'visible', 'important');
            }
            if (isEmployeeNamePattern(text)) {
                el.style.setProperty('white-space', 'nowrap', 'important');
                el.style.setProperty('word-break', 'normal', 'important');
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
            // Chuẩn "Bảng điều khiển ca trực" (2026-09-11): MỘT tông xám cho mọi tiêu đề, kể cả
            // khi xuất ảnh. Trước đây chỗ này ép ngược lại màu cũ theo tên file — indigo #eef2ff
            // cho Ngành hàng, hồng #fecdd3 cho Báo cáo kho — nên màn hình đã chuẩn mà ảnh xuất ra
            // thì chưa. Dùng đúng slate-100 (#f1f5f9) như GROUP_TONE_BG trên màn hình.
            const bgColor = isDark ? '#1f2937' : '#f1f5f9';

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

    // Bỏ bo góc cho toàn bộ khung viền theo yêu cầu: "VIỀN KHÔNG CẦN BO GỐC"
    clone.style.setProperty('border-radius', '0px', 'important');
    clone.querySelectorAll<HTMLElement>('*').forEach(el => {
        const cls = el.getAttribute('class') || '';
        // Giữ lại pill tròn cho badge/icon nếu có class rounded-full, còn lại tất cả khung viền/card/container đều ép vuông vức 0px
        if (!cls.includes('rounded-full')) {
            el.style.setProperty('border-radius', '0px', 'important');
        }
    });

    // 7. COMPACT EXPORT TABLE WIDTH CONSTRAINTS & WORD WRAP
    clone.querySelectorAll('.compact-export-table, table').forEach(table => {
        if (!(table instanceof HTMLElement)) return;
        table.style.setProperty('table-layout', 'auto', 'important');
        table.style.setProperty('width', '100%', 'important');
        table.style.setProperty('min-width', 'max-content', 'important');

        // Xây dựng ma trận thead để ánh xạ chính xác vị trí cột thị giác (visual column index)
        const grid: HTMLTableCellElement[][] = [];
        const theadRows = table.querySelectorAll('thead tr');
        theadRows.forEach((row, rowIndex) => {
            let colIndex = 0;
            row.querySelectorAll<HTMLTableCellElement>('th').forEach(th => {
                while (grid[rowIndex] && grid[rowIndex][colIndex]) {
                    colIndex++;
                }
                const rowSpan = th.rowSpan || 1;
                const colSpan = th.colSpan || 1;
                for (let r = 0; r < rowSpan; r++) {
                    if (!grid[rowIndex + r]) grid[rowIndex + r] = [];
                    for (let c = 0; c < colSpan; c++) {
                        grid[rowIndex + r][colIndex + c] = th;
                    }
                }
                colIndex += colSpan;
            });
        });

        const bottomRow = grid.length > 0 ? grid[grid.length - 1] : [];
        const sttColIndices = new Set<number>();
        const nameColIndices = new Set<number>();
        const progressBarColIndices = new Set<number>();
        const progressBarThSet = new Set<HTMLTableCellElement>();
        const snugNumericColIndices = new Set<number>();

        // Kiểm tra xem cột có chứa thanh tiến độ ProgressBar thực tế (w-10, h-1.5, progress) hay chỉ là text số phần trăm
        const colHasProgressBar = (cIdx: number): boolean => {
            const rows = table.querySelectorAll('tbody tr');
            for (let r = 0; r < Math.min(rows.length, 15); r++) {
                const cells = rows[r].querySelectorAll('td');
                if (cells[cIdx]) {
                    const cell = cells[cIdx];
                    if (cell.querySelector('[role="progressbar"], .w-10, [class*="progress"], div.rounded-full.overflow-hidden, div.h-1, div.h-1\\.5, div.h-2')) {
                        return true;
                    }
                }
            }
            return false;
        };

        bottomRow.forEach((th, colIdx) => {
            if (!th) return;
            const text = th.textContent?.trim().replace(/\s+/g, ' ').toUpperCase().normalize('NFC') || '';
            // Cột STT CHỈ được nhận diện khi tiêu đề rõ ràng là # hoặc STT (không tự gán bừa col 0)
            if (text === '#' || text === 'STT' || text === 'SỐ TT' || text === 'NO.') {
                sttColIndices.add(colIdx);
            } else if (
                text.includes('NHÂN VIÊN') || text.includes('NHÓM THI ĐUA') || text.includes('HỌ VÀ TÊN') ||
                text === 'NHÓM' || text === 'TÊN' || text.includes('SIÊU THỊ') || text.includes('DANH MỤC')
            ) {
                nameColIndices.add(colIdx);
            }

            if (text.includes('%HT') || text.includes('%DKHT') || text.includes('%HTDK')) {
                // CHỈ coi là cột ProgressBar nếu bên dưới có thanh tiến độ thật. Nếu chỉ là text % như bảng Tổng hợp thì co vừa khít số
                if (colHasProgressBar(colIdx)) {
                    progressBarColIndices.add(colIdx);
                    progressBarThSet.add(th);
                } else {
                    snugNumericColIndices.add(colIdx);
                }
            }

            if (
                text.includes('LUỸ KẾ') || text.includes('LUY KE') || text.includes('L.KẾ') ||
                text.includes('THỰC HIỆN') || text.includes('REALTIME') || text.includes('T.HIỆN') || text === 'THỰC' ||
                text.includes('TAR') || text.includes('M.TIÊU') ||
                text.includes('DTQĐ') || text.includes('D.KIẾN') ||
                text.includes('C.LẠI') || text.includes('CÒN LẠI') || text.includes('CON LAI') ||
                text.includes('S.LƯỢNG') || text.includes('SỐ LƯỢNG') ||
                text.includes('HQQĐ') || text.includes('%QĐ') || text.includes('%T.CHẬM') || text.includes('%T.GÓP') || text.includes('%TC') || text.includes('THƯỞNG') ||
                text === 'DT' || text === '%' || text === '%TT' || text === 'TB 3T'
            ) {
                snugNumericColIndices.add(colIdx);
            }
        });

        // Nếu bảng không có cột STT và chưa nhận diện được cột Tên, mặc định cột 0 là cột Tên/Nội dung chính
        if (nameColIndices.size === 0 && !sttColIndices.has(0) && bottomRow.length > 0) {
            nameColIndices.add(0);
        }

        // Xử lý các thẻ th của bảng
        table.querySelectorAll<HTMLTableCellElement>('thead th').forEach((th) => {
            const text = th.textContent?.trim() || '';
            const isMultiColGroup = (th.colSpan || 1) > 1;
            const isSttHeader = !isMultiColGroup && (text === '#' || text.toUpperCase() === 'STT' || text.toUpperCase() === 'SỐ TT');
            const isNameHeader = !isMultiColGroup && (
                text.toUpperCase().includes('NHÂN VIÊN') ||
                text.toUpperCase().includes('NHÓM THI ĐUA') ||
                text.toUpperCase().includes('HỌ VÀ TÊN') ||
                text.toUpperCase() === 'NHÓM' ||
                text.toUpperCase() === 'TÊN' ||
                text.toUpperCase().includes('SIÊU THỊ') ||
                text.toUpperCase().includes('DANH MỤC')
            );
            const isProgressBarHeader = !isMultiColGroup && progressBarThSet.has(th);
            const isSnugNumericHeader = !isMultiColGroup && (
                !isProgressBarHeader && (
                    text.includes('%HT') || text.includes('%DKHT') || text.includes('%HTDK') ||
                    text.includes('LUỸ KẾ') || text.includes('LUY KE') || text.includes('L.KẾ') ||
                    text.includes('THỰC HIỆN') || text.includes('REALTIME') || text.includes('T.HIỆN') || text === 'THỰC' ||
                    text.includes('TAR') || text.includes('M.TIÊU') ||
                    text.includes('DTQĐ') || text.includes('D.KIẾN') ||
                    text.includes('C.LẠI') || text.includes('CÒN LẠI') || text.includes('CON LAI') ||
                    text.includes('S.LƯỢNG') || text.includes('SỐ LƯỢNG') ||
                    text.includes('HQQĐ') || text.includes('%QĐ') || text.includes('%T.CHẬM') || text.includes('%T.GÓP') || text.includes('%TC') || text.includes('THƯỞNG') ||
                    text === 'DT' || text === '%' || text === '%TT' || text === 'TB 3T'
                )
            );

            // Ép cỡ chữ (11px) và line-height vừa đủ, cân đối với nội dung
            th.style.setProperty('font-size', '11px', 'important');
            th.style.setProperty('line-height', '1.25', 'important');
            th.style.setProperty('padding', '3px 6px', 'important');

            if (isMultiColGroup) {
                // Nhóm header gộp cột (colSpan > 1, ví dụ: Doanh thu, Hiệu suất)
                th.style.setProperty('width', 'auto', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
            } else if (isSttHeader) {
                th.style.setProperty('min-width', '32px', 'important');
                th.style.setProperty('width', '32px', 'important');
                th.style.setProperty('max-width', '40px', 'important');
                th.style.setProperty('text-align', 'center', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
            } else if (isNameHeader) {
                // Cột Tên nhân viên / Nhóm thi đua / Siêu thị / Ngành hàng: vừa khít nội dung, không bè ngang
                const isShortEntity = text.toUpperCase().includes('SIÊU THỊ') || text.toUpperCase().includes('NGÀNH') || text.toUpperCase().includes('DANH MỤC');
                const minW = isShortEntity ? '120px' : '160px';
                th.style.setProperty('width', 'auto', 'important');
                th.style.setProperty('min-width', minW, 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
                th.style.setProperty('max-width', 'none', 'important');

                if (!th.querySelector('.export-nowrap-wrapper')) {
                    const content = th.innerHTML;
                    th.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-block !important; width: max-content !important; line-height: 1.25 !important;">${content}</span>`;
                }
            } else if (isProgressBarHeader) {
                th.style.setProperty('min-width', '105px', 'important');
                th.style.setProperty('width', '105px', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
                th.style.setProperty('max-width', 'none', 'important');
            } else if (isSnugNumericHeader) {
                th.style.setProperty('width', 'auto', 'important');
                th.style.setProperty('min-width', '0px', 'important');
                th.style.setProperty('max-width', 'none', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
            } else {
                th.style.setProperty('white-space', 'normal', 'important');
                th.style.setProperty('word-break', 'break-word', 'important');
                th.style.setProperty('min-width', '40px', 'important');
            }

            th.querySelectorAll('span').forEach(span => {
                span.classList.remove('truncate');
                span.style.setProperty('line-height', '1.25', 'important');
                if (!isSttHeader && !isNameHeader && !isProgressBarHeader && !isSnugNumericHeader && !isMultiColGroup) {
                    span.style.setProperty('white-space', 'normal', 'important');
                    span.style.setProperty('word-break', 'break-word', 'important');
                } else {
                    span.style.setProperty('white-space', 'nowrap', 'important');
                }
            });
        });

        // Xử lý các thẻ td của bảng
        table.querySelectorAll('tbody tr').forEach((tr) => {
            // Bỏ qua dòng tiêu đề nhóm (colSpan > 1) để không làm vỡ layout
            const firstTd = tr.querySelector('td');
            if (firstTd && firstTd.colSpan > 1) return;

            tr.querySelectorAll('td').forEach((td, idx) => {
                if (!(td instanceof HTMLElement)) return;
                const isSttCol = sttColIndices.has(idx);
                const isNameCol = nameColIndices.has(idx) || td.querySelector('[class*="avatar"], img') !== null;
                const isProgressBarCol = progressBarColIndices.has(idx) || !!td.querySelector('.w-10') || !!td.querySelector('[class*="progress"]');
                const isSnugNumericCol = snugNumericColIndices.has(idx);

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

                if (isSttCol) {
                    td.style.setProperty('min-width', '32px', 'important');
                    td.style.setProperty('width', '32px', 'important');
                    td.style.setProperty('max-width', '40px', 'important');
                    td.style.setProperty('text-align', 'center', 'important');
                    td.style.setProperty('white-space', 'nowrap', 'important');
                } else if (isNameCol) {
                    // Cột Tên / Siêu thị / Ngành hàng: vừa khít nội dung, không ngắt dòng
                    const colText = td.textContent?.trim() || '';
                    const isShortEntity = isSttCol === false && (!colText.includes(' - ') || colText.length < 25);
                    const minW = isShortEntity ? '120px' : '160px';
                    td.style.setProperty('white-space', 'nowrap', 'important');
                    td.style.setProperty('width', 'auto', 'important');
                    td.style.setProperty('min-width', minW, 'important');
                    td.style.setProperty('max-width', 'none', 'important');

                    // Các thẻ con bên trong cột tên (avatar, name span, wrapper)
                    td.querySelectorAll<HTMLElement>('div, span, button, a').forEach(c => {
                        c.style.setProperty('white-space', 'nowrap', 'important');
                        c.style.setProperty('overflow', 'visible', 'important');
                    });

                    // Bọc thẻ span con chống ngắt dòng
                    if (!td.querySelector('.export-nowrap-wrapper')) {
                        const content = td.innerHTML;
                        td.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-flex !important; align-items: center !important; width: max-content !important; min-width: ${minW} !important; line-height: 1.25 !important;">${content}</span>`;
                    }
                } else if (isProgressBarCol) {
                    // Cột có thanh tiến độ ProgressBar (%HT, %DKHT...): kích thước đồng bộ 105px với th
                    td.style.setProperty('min-width', '105px', 'important');
                    td.style.setProperty('width', '105px', 'important');
                    td.style.setProperty('max-width', 'none', 'important');
                    td.style.setProperty('white-space', 'nowrap', 'important');
                } else if (isSnugNumericCol) {
                    // Cột số liệu: fix vừa khít với nội dung số
                    td.style.setProperty('white-space', 'nowrap', 'important');
                    td.style.setProperty('width', 'auto', 'important');
                    td.style.setProperty('min-width', '0px', 'important');
                    td.style.setProperty('max-width', 'none', 'important');
                    if (!td.querySelector('.export-nowrap-wrapper')) {
                        const content = td.innerHTML;
                        td.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-block !important; width: max-content !important; line-height: 1.25 !important;">${content}</span>`;
                    }
                } else {
                    if (!td.classList.contains('sticky')) {
                        td.style.setProperty('min-width', '35px', 'important');
                        td.style.setProperty('max-width', 'none', 'important');

                        // Tự động nhận diện các ô số, phần trăm để chống ngắt dòng
                        const text = td.textContent?.trim() || '';
                        const isNumeric = /^[0-9%\s.,+\-/]+$/.test(text);
                        if (isNumeric) {
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
    const cloneSvgs = clone.querySelectorAll('svg');
    cloneSvgs.forEach((svg: SVGSVGElement) => {
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

    // Remove artificial outer border box on clone root to prevent nested double borders,
    // trừ trường hợp clone chính là thẻ card cần viền (competition-group-card)
    if (!clone.classList.contains('competition-group-card')) {
        clone.style.border = 'none';
    }
    clone.style.borderRadius = '0';

    // Remove redundant inner borders ONLY on table overflow wrappers inside cards (keep card borders intact)
    clone.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-hidden').forEach((el) => {
        if (el instanceof HTMLElement && el.querySelector('table')) {
            el.style.setProperty('border', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        }
    });

    // Remove redundant box-shadows from all cloned children for crisp single-border rendering
    clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el instanceof HTMLElement && el.style) {
            el.style.setProperty('box-shadow', 'none', 'important');
        }
    });

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
        if ((cls.includes('p-6') || cls.includes('lg:p-6') || cls.includes('p-5') || cls.includes('py-5') || cls.includes('lg:px-4') || cls.includes('lg:pb-4')) && !cls.includes('kpi-grid') && !cls.includes('competition-kpi-container')) {
            el.style.setProperty('padding-top', '4px', 'important');
            el.style.setProperty('padding-bottom', '4px', 'important');
            el.style.setProperty('padding-left', '6px', 'important');
            el.style.setProperty('padding-right', '6px', 'important');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // THI ĐUA: THU GỌN CÁC THẺ KPI VÀ CO VỪA THEO BẢNG CỘT
    // ═══════════════════════════════════════════════════════════════════════
    clone.querySelectorAll<HTMLElement>('.competition-kpi-container').forEach((kpiGrid) => {
        kpiGrid.style.setProperty('margin-left', '0', 'important');
        kpiGrid.style.setProperty('margin-right', '0', 'important');
        kpiGrid.style.setProperty('padding-left', '0', 'important');
        kpiGrid.style.setProperty('padding-right', '0', 'important');
        kpiGrid.style.setProperty('border', 'none', 'important');
        kpiGrid.style.setProperty('background', 'transparent', 'important');
        kpiGrid.style.setProperty('box-shadow', 'none', 'important');
        kpiGrid.style.setProperty('margin-bottom', '8px', 'important');
        kpiGrid.style.setProperty('gap', '6px', 'important');
        kpiGrid.style.setProperty('width', '100%', 'important');

        // Thu gọn từng thẻ KPI & đảm bảo giữ viền sắc nét
        const isDarkMode = document.documentElement.classList.contains('dark');
        const cardBorderColor = isDarkMode ? '#334155' : '#cbd5e1';
        kpiGrid.children && Array.from(kpiGrid.children).forEach((child) => {
            if (!(child instanceof HTMLElement)) return;
            child.style.setProperty('padding', '6px 8px', 'important');
            child.style.setProperty('border-radius', '0', 'important');
            child.style.setProperty('border', `1px solid ${cardBorderColor}`, 'important');
            child.style.setProperty('box-sizing', 'border-box', 'important');

            // Cỡ số chính trong thẻ KPI
            child.querySelectorAll<HTMLElement>('.text-xl, .text-2xl, .text-3xl').forEach((numEl) => {
                numEl.style.setProperty('font-size', '18px', 'important');
                numEl.style.setProperty('line-height', '1.2', 'important');
            });
            // Cỡ icon trong thẻ KPI
            child.querySelectorAll<HTMLElement>('.w-6.h-6').forEach((iconWrap) => {
                iconWrap.style.setProperty('width', '18px', 'important');
                iconWrap.style.setProperty('height', '18px', 'important');
            });
            child.querySelectorAll<HTMLElement>('svg').forEach((svgEl) => {
                svgEl.style.setProperty('width', '12px', 'important');
                svgEl.style.setProperty('height', '12px', 'important');
            });
            // Cỡ chữ tiêu đề & nhãn
            child.querySelectorAll<HTMLElement>('span, div').forEach((textEl) => {
                const textCls = textEl.getAttribute('class') || '';
                if (textCls.includes('tracking-wider') || textCls.includes('uppercase')) {
                    textEl.style.setProperty('font-size', '9.5px', 'important');
                    textEl.style.setProperty('line-height', '1.2', 'important');
                }
                if (textCls.includes('text-[11px]')) {
                    textEl.style.setProperty('font-size', '9.5px', 'important');
                    textEl.style.setProperty('line-height', '1.2', 'important');
                }
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // THU GỌN LƯỚI THẺ KPI NGÀNH HÀNG KHI XUẤT ẢNH
    // ═══════════════════════════════════════════════════════════════════════
    clone.querySelectorAll<HTMLElement>('.industry-kpi-container').forEach((container) => {
        container.style.setProperty('padding', '6px 8px', 'important');
        container.style.setProperty('margin-bottom', '6px', 'important');
    });

    clone.querySelectorAll<HTMLElement>('.industry-kpi-grid').forEach((grid) => {
        grid.style.setProperty('display', 'grid', 'important');
        grid.style.setProperty('grid-template-columns', 'repeat(6, minmax(0, 1fr))', 'important');
        grid.style.setProperty('gap', '4px', 'important');
    });

    clone.querySelectorAll<HTMLElement>('.industry-kpi-card').forEach((card) => {
        card.style.setProperty('padding', '4px 6px', 'important');
        card.style.setProperty('min-height', 'auto', 'important');

        // Tiêu đề thẻ (tên ngành/nhóm hàng)
        card.querySelectorAll<HTMLElement>('.industry-kpi-title').forEach((el) => {
            el.style.setProperty('font-size', '9.5px', 'important');
            el.style.setProperty('line-height', '1.15', 'important');
            el.style.setProperty('margin-bottom', '2px', 'important');
        });

        // Số chính (Doanh thu hoặc Số lượng lớn hơn)
        card.querySelectorAll<HTMLElement>('.industry-kpi-num').forEach((el) => {
            el.style.setProperty('font-size', '13.5px', 'important');
            el.style.setProperty('line-height', '1.1', 'important');
        });

        // Nhãn số chính (SL hoặc DTQĐ)
        card.querySelectorAll<HTMLElement>('.industry-kpi-label').forEach((el) => {
            el.style.setProperty('font-size', '8.5px', 'important');
            el.style.setProperty('line-height', '1', 'important');
        });

        // Số phụ (Doanh thu hoặc Số lượng nhỏ hơn)
        card.querySelectorAll<HTMLElement>('.industry-kpi-subnum').forEach((el) => {
            el.style.setProperty('font-size', '10px', 'important');
            el.style.setProperty('line-height', '1.1', 'important');
        });

        // Nhãn số phụ (SL: hoặc DTQĐ:)
        card.querySelectorAll<HTMLElement>('.industry-kpi-sublabel').forEach((el) => {
            el.style.setProperty('font-size', '8.5px', 'important');
            el.style.setProperty('line-height', '1', 'important');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // THU GỌN 8 THẺ KPI TỔNG QUAN ĐỈNH MÀN HÌNH KHI XUẤT ẢNH
    // ═══════════════════════════════════════════════════════════════════════
    clone.querySelectorAll<HTMLElement>('.kpi-overview-container').forEach((container) => {
        container.style.setProperty('padding-left', '4px', 'important');
        container.style.setProperty('padding-right', '4px', 'important');
        container.style.setProperty('padding-top', '2px', 'important');
        container.style.setProperty('padding-bottom', '2px', 'important');
        container.style.setProperty('margin-bottom', '4px', 'important');
    });

    clone.querySelectorAll<HTMLElement>('.kpi-overview-grid').forEach((grid) => {
        grid.style.setProperty('display', 'grid', 'important');
        grid.style.setProperty('grid-template-columns', 'repeat(4, minmax(0, 1fr))', 'important');
        grid.style.setProperty('gap', '4px', 'important');
        grid.style.setProperty('margin-bottom', '4px', 'important');
    });

    clone.querySelectorAll<HTMLElement>('.kpi-overview-card, .premium-card-shadow').forEach((card) => {
        // Thu gọn padding trong thẻ
        card.querySelectorAll<HTMLElement>('.px-3\\.5, .py-2, [class*="px-3"], [class*="py-2"]').forEach((inner) => {
            inner.style.setProperty('padding-left', '6px', 'important');
            inner.style.setProperty('padding-right', '6px', 'important');
            inner.style.setProperty('padding-top', '4px', 'important');
            inner.style.setProperty('padding-bottom', '4px', 'important');
        });

        // Thu nhỏ con số chính (từ 30px-48px xuống 19px)
        card.querySelectorAll<HTMLElement>('[class*="text-\\[26px\\]"], [class*="text-\\[24px\\]"], [class*="text-\\[30px\\]"], [class*="text-\\[34px\\]"], [class*="text-\\[38px\\]"], [class*="text-\\[42px\\]"], [class*="text-\\[48px\\]"], [class*="text-2xl"], [class*="text-3xl"], [class*="text-4xl"]').forEach((numEl) => {
            numEl.style.setProperty('font-size', '19px', 'important');
            numEl.style.setProperty('line-height', '1.15', 'important');
        });

        // Đơn vị (Tr, tỷ, %, SL)
        card.querySelectorAll<HTMLElement>('[class*="text-\\[14px\\]"], [class*="text-\\[15px\\]"], [class*="text-\\[16px\\]"], [class*="text-\\[17px\\]"], [class*="text-\\[19px\\]"]').forEach((unitEl) => {
            unitEl.style.setProperty('font-size', '11.5px', 'important');
            unitEl.style.setProperty('line-height', '1.15', 'important');
        });

        // Tiêu đề thẻ (DT THỰC, DTQĐ, HQQĐ...)
        card.querySelectorAll<HTMLElement>('h3, .kpi-overview-title').forEach((h3) => {
            h3.style.setProperty('font-size', '10px', 'important');
            h3.style.setProperty('line-height', '1.2', 'important');
        });

        // Icon thẻ
        card.querySelectorAll<HTMLElement>('svg').forEach((svg) => {
            svg.style.setProperty('width', '13px', 'important');
            svg.style.setProperty('height', '13px', 'important');
        });

        // Subtext / Trend / Footer
        card.querySelectorAll<HTMLElement>('.text-\\[11px\\], .text-xs, [class*="tracking-wide"], .kpi-overview-footer').forEach((subEl) => {
            subEl.style.setProperty('font-size', '9px', 'important');
            subEl.style.setProperty('line-height', '1.15', 'important');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // KPI CARDS: ĐẢM BẢO VIỀN TẤT CẢ CÁC THẺ KPI CÓ MÀU CÙNG TÔNG VỚI VẠCH TOP NHƯNG NHẠT HƠN
    // ═══════════════════════════════════════════════════════════════════════
    const isDarkTheme = document.documentElement.classList.contains('dark');
    const colorBorderMap: Record<string, string> = {
        emerald: isDarkTheme ? '#065f46' : '#86efac',
        sky: isDarkTheme ? '#075985' : '#7dd3fc',
        blue: isDarkTheme ? '#075985' : '#7dd3fc',
        amber: isDarkTheme ? '#92400e' : '#fcd34d',
        orange: isDarkTheme ? '#92400e' : '#fcd34d',
        rose: isDarkTheme ? '#9f1239' : '#fda4af',
        red: isDarkTheme ? '#9f1239' : '#fda4af',
        indigo: isDarkTheme ? '#3730a3' : '#a5b4fc',
        slate: isDarkTheme ? '#334155' : '#cbd5e1',
    };
    const defaultKpiBorder = isDarkTheme ? '#334155' : '#cbd5e1';
    const warnKpiBorder = isDarkTheme ? '#9f1239' : '#fda4af'; // rose-300 cho thẻ chưa đạt
    const warnKpiBg = isDarkTheme ? 'rgba(76, 5, 25, 0.25)' : 'rgba(255, 241, 242, 0.5)';

    clone.querySelectorAll<HTMLElement>('div').forEach((el) => {
        const cls = el.getAttribute('class') || '';
        // Nhận diện KpiCard qua class premium-card-shadow hoặc cấu trúc thẻ card flex-col có vạch màu
        const isKpiCard = cls.includes('premium-card-shadow') ||
            (cls.includes('touch-feedback') && cls.includes('border') && cls.includes('flex-col')) ||
            (el.firstElementChild instanceof HTMLElement && el.firstElementChild.className && (String(el.firstElementChild.className).includes('h-[3') || String(el.firstElementChild.className).includes('kpi-top-accent')));

        if (isKpiCard) {
            const text = el.textContent || '';
            const isNotGood = text.includes('Chưa đạt') || text.includes('CHƯA ĐẠT') || cls.includes('border-rose') || cls.includes('bg-rose');

            // Xác định màu vạch top bar
            let topColorKey = el.dataset.kpiTopColor || '';
            if (!topColorKey) {
                const topBar = el.querySelector<HTMLElement>('.kpi-top-accent, .h-\\[3px\\], .h-\\[3\\.5px\\]') || 
                    (el.firstElementChild instanceof HTMLElement && (String(el.firstElementChild.className || '').includes('h-[3') || String(el.firstElementChild.className || '').includes('kpi-top-accent')) ? el.firstElementChild : null);
                const topCls = topBar?.getAttribute('class') || '';
                if (topCls.includes('bg-emerald') || topCls.includes('bg-teal')) topColorKey = 'emerald';
                else if (topCls.includes('bg-sky') || topCls.includes('bg-blue')) topColorKey = 'sky';
                else if (topCls.includes('bg-amber') || topCls.includes('bg-orange')) topColorKey = 'amber';
                else if (topCls.includes('bg-rose') || topCls.includes('bg-red')) topColorKey = 'rose';
                else if (topCls.includes('bg-indigo')) topColorKey = 'indigo';
                else if (topCls.includes('bg-slate')) topColorKey = 'slate';
            }

            const topColorMap: Record<string, string> = {
                emerald: '#059669',
                sky: '#0284c7',
                blue: '#0284c7',
                amber: '#d97706',
                orange: '#d97706',
                rose: '#e11d48',
                red: '#e11d48',
                indigo: '#4f46e5',
                slate: '#475569',
            };

            const targetBorder = isNotGood
                ? warnKpiBorder
                : (colorBorderMap[topColorKey] || (!isDarkTheme && el.dataset.kpiBorder ? el.dataset.kpiBorder : defaultKpiBorder));

            const topBorderColor = isNotGood
                ? (topColorMap.rose || warnKpiBorder)
                : (el.dataset.kpiTopBorder || topColorMap[topColorKey] || targetBorder);

            el.style.setProperty('position', 'relative', 'important');
            el.style.setProperty('border-radius', '0px', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
            el.style.setProperty('border', `1.5px solid ${targetBorder}`, 'important');
            el.style.setProperty('border-top', 'none', 'important');
            el.style.setProperty('overflow', 'visible', 'important');

            const topBar = el.querySelector<HTMLElement>('.kpi-top-accent, .h-\\[3px\\], .h-\\[3\\.5px\\]') || 
                (el.firstElementChild instanceof HTMLElement && (String(el.firstElementChild.className || '').includes('h-[3') || String(el.firstElementChild.className || '').includes('progressFill') || String(el.firstElementChild.className || '').includes('kpi-top-accent')) ? el.firstElementChild : null);
            if (topBar) {
                topBar.style.setProperty('display', 'block', 'important');
                topBar.style.setProperty('height', '3.5px', 'important');
                topBar.style.setProperty('margin-top', '0px', 'important');
                topBar.style.setProperty('margin-left', '-1.5px', 'important');
                topBar.style.setProperty('margin-right', '-1.5px', 'important');
                topBar.style.setProperty('width', 'calc(100% + 3px)', 'important');
                topBar.style.setProperty('background-color', topBorderColor, 'important');
                topBar.style.setProperty('border-radius', '0px', 'important');
            }

            if (isNotGood) {
                el.style.setProperty('background-color', warnKpiBg, 'important');
            } else {
                el.style.setProperty('background-color', isDarkTheme ? '#0f172a' : '#ffffff', 'important');
            }
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
        
        // Đo chiều rộng chính xác nhất theo nội dung thực tế của bảng và thẻ
        let maxTableWidth = 0;
        const tables = clone.querySelectorAll('table');
        tables.forEach((t) => {
            const prevW = t.style.width;
            t.style.setProperty('width', 'max-content', 'important');
            const w = Math.ceil(t.getBoundingClientRect().width || t.scrollWidth || 0);
            t.style.setProperty('width', prevW || '100%', 'important');
            maxTableWidth = Math.max(maxTableWidth, w);
        });

        // Bề rộng tối ưu vừa xem trên điện thoại:
        // Với báo cáo thông thường (Tổng quan siêu thị ~620px, Chi tiết ngành hàng ~580px):
        // Chọn bề rộng ~680px để các thẻ KPI trên đỉnh và lưới 6 cột hiển thị cân đối nhất,
        // các cột dữ liệu không bị bè ngang thừa khoảng trắng, mở trên điện thoại đọc rõ mồn một.
        // Với bảng nhiều cột (Thi Đua 30+ cột), tự động mở rộng theo maxTableWidth để không mất cột.
        const optimalWidth = maxTableWidth > 0 
            ? Math.max(680, maxTableWidth + 16) 
            : Math.max(680, Math.min(Math.ceil(rect.width || 0), 1000));

        const contentWidth = captureAsDisplayed 
            ? element.clientWidth 
            : (forcedWidth || optimalWidth);

        const finalWidth = Math.ceil(contentWidth) + exportPadding * 2;
        let finalHeight = contentHeight + exportPadding * 2;

        // Đảm bảo clone và captureContainer có bề rộng tối ưu vừa xem trên điện thoại
        clone.style.setProperty('width', `${finalWidth}px`, 'important');
        clone.style.setProperty('min-width', `${finalWidth}px`, 'important');
        clone.style.setProperty('max-width', `${finalWidth}px`, 'important');
        clone.style.setProperty('overflow', 'visible', 'important');
        if (captureContainer) {
            captureContainer.style.setProperty('width', `${finalWidth}px`, 'important');
            captureContainer.style.setProperty('min-width', `${finalWidth}px`, 'important');
            captureContainer.style.setProperty('max-width', `${finalWidth}px`, 'important');
        }

        // Đảm bảo tất cả các khối con (title bar, header, table container) phủ kín 100% finalWidth
        Array.from(clone.children).forEach((child) => {
            if (child instanceof HTMLElement) {
                child.style.setProperty('width', '100%', 'important');
                child.style.setProperty('min-width', '100%', 'important');
                child.style.setProperty('box-sizing', 'border-box', 'important');
            }
        });
        clone.querySelectorAll<HTMLElement>('.competition-group-card').forEach((card) => {
            card.style.setProperty('width', '100%', 'important');
            card.style.setProperty('box-sizing', 'border-box', 'important');
            const titleBar = card.firstElementChild as HTMLElement;
            if (titleBar) {
                titleBar.style.setProperty('width', '100%', 'important');
                titleBar.style.setProperty('min-width', '100%', 'important');
                titleBar.style.setProperty('box-sizing', 'border-box', 'important');
            }
        });
        if (clone.classList.contains('competition-group-card')) {
            const isDark = document.documentElement.classList.contains('dark');
            clone.style.setProperty('border', `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, 'important');
            clone.style.setProperty('box-sizing', 'border-box', 'important');
        }
        clone.querySelectorAll('table').forEach((t) => {
            t.style.setProperty('width', '100%', 'important');
            t.style.setProperty('min-width', '100%', 'important');
            t.style.setProperty('box-sizing', 'border-box', 'important');
        });

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
