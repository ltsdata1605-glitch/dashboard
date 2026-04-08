import * as htmlToImage from 'html-to-image';

const waitForImages = (element: HTMLElement): Promise<void[]> => {
    const images = Array.from(element.querySelectorAll('img'));
    const promises = images.map(img => {
        if (img.complete && img.naturalHeight !== 0) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
    });
    return Promise.all(promises);
};

export async function exportElementAsImage(element: HTMLElement, filename: string, options: any = {}) {
    const { elementsToHide = [], forceOpenDetails = false, scale = 2, isCompactTable = false, captureAsDisplayed = false, forcedWidth = null } = options;

    elementsToHide.forEach((s: string) => document.querySelectorAll(s).forEach((e: any) => e.style.visibility = 'hidden'));
    document.body.classList.add('is-capturing');

    const clone = element.cloneNode(true) as HTMLElement;

    // --- RETAINED LAYOUT FIXES FOR EXPORT PRESENTATION ---
    // These are kept because they explicitly change how the data looks in the export format.

    // 1. KPI Cards: Add padding AND FORCE GRID LAYOUT (2 Columns)
    const kpiGrid = clone.querySelector('.kpi-grid-for-export');
    if (kpiGrid && kpiGrid instanceof HTMLElement) {
        kpiGrid.style.setProperty('display', 'grid', 'important');
        kpiGrid.style.setProperty('grid-template-columns', 'repeat(2, minmax(0, 1fr))', 'important');
        kpiGrid.style.setProperty('gap', '1rem', 'important');
        kpiGrid.style.setProperty('width', '100%', 'important');
    }

    const kpiCardElements = clone.querySelectorAll('.kpi-grid-for-export > .chart-card');
    kpiCardElements.forEach(el => {
        if (el instanceof HTMLElement) {
            el.style.paddingBottom = 'calc(1rem + 5px)';
        }
    });

    const traGopAuxElements = clone.querySelectorAll('.chart-card .flex-shrink-0 > .text-xs');
    traGopAuxElements.forEach(el => {
        if (el instanceof HTMLElement) el.style.paddingBottom = '5px';
    });

    // 2. Industry Grid Cards
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
    if (filename.startsWith('bao-cao-kho') || filename.startsWith('chi-tiet-nganh-hang')) {
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
            
            if (filename.startsWith('chi-tiet-nganh-hang')) {
                bgColor = isDark ? '#1f2937' : '#eef2ff';
            } else if (filename.startsWith('bao-cao-kho')) {
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
    if (filename.startsWith('bao-cao-kho')) {
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
    
    // FIX FOR SCROLLABLE CONTENT (Expand scrollable tables for export)
    const scrollableContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .custom-scrollbar, [class*="max-h-"], [class*="overflow-"]');
    scrollableContainers.forEach((container: any) => {
        container.style.maxHeight = 'none';
        container.style.maxWidth = 'none';
        container.style.overflow = 'visible';
        container.style.overflowX = 'visible';
        container.style.overflowY = 'visible';
        // Force hide scrollbars in webkit
        if (container instanceof HTMLElement) {
            container.style.scrollbarWidth = 'none'; // Firefox
            const style = document.createElement('style');
            style.textContent = `
                .clone-no-scrollbar::-webkit-scrollbar { display: none !important; }
            `;
            container.classList.add('clone-no-scrollbar');
            container.appendChild(style);
        }
    });

    // 6. FIX GOOGLE CHARTS SVG SCALING (For TrendChart / IndustryGrid)
    // Make them responsive so they scale down to the exported format perfectly
    const svgs = clone.querySelectorAll('svg');
    svgs.forEach((svg: any) => {
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
    } else if (captureAsDisplayed) {
        captureContainer.style.width = `${element.clientWidth}px`;
        captureContainer.style.height = `${element.clientHeight}px`;
        captureContainer.style.overflow = 'hidden';
        clone.style.width = `${element.clientWidth}px`;
        clone.style.height = `${element.clientHeight}px`;
        clone.style.minWidth = `${element.clientWidth}px`;
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

    try {
        await document.fonts.ready;
        await waitForImages(clone);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 300 to 500ms

        console.log(`Bắt đầu chụp ảnh bằng html-to-image: ${filename}...`);

        // Use getBoundingClientRect for better accuracy on scaled/cloned elements
        const rect = clone.getBoundingClientRect();
        const finalWidth = captureAsDisplayed ? element.clientWidth : (rect.width || clone.scrollWidth);
        let finalHeight = captureAsDisplayed ? element.clientHeight : (rect.height || clone.scrollHeight);
        
        // Safety: Add padding-bottom to the clone to ensure footer is not clipped
        if (!captureAsDisplayed) {
            clone.style.paddingBottom = '40px';
            finalHeight += 40;
        }

        let finalScale = scale;
        if (finalHeight * scale > 15000) {
            finalScale = Math.max(1, 15000 / finalHeight);
            console.warn(`Cảnh báo: Ảnh quá dài (${finalHeight}px). Tự động giảm tỉ lệ xuống ${finalScale.toFixed(2)} để tránh lỗi trình duyệt.`);
        }

        const isDark = document.documentElement.classList.contains('dark');
        const defaultBg = isDark ? '#0f172a' : '#f8fafc';
        const isTransparentTable = filename.startsWith('bao-cao-kho') || filename.startsWith('chi-tiet-nganh-hang');

        // Capture using html-to-image which is faster and natively supports modern CSS (Tailwind v4, oklch, grid)
        const blob = await htmlToImage.toBlob(clone, {
            pixelRatio: finalScale,
            backgroundColor: isTransparentTable ? undefined : defaultBg,
            width: finalWidth,
            height: finalHeight,
            style: {
                margin: '0',
                padding: '0',
            }
        });

        if (!blob) {
            throw new Error("Không thể tạo ảnh từ DOM (kết quả trả về trống).");
        }

        console.log(`Đã tạo ảnh gốc. Đang tải xuống...`);

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`Đã hoàn tất xuất ảnh: ${filename}`);

    } catch (error) {
        console.error(`Lỗi khi xuất ảnh: ${filename}`, error);
    } finally {
        document.body.removeChild(captureContainer);
        document.body.classList.remove('is-capturing');
        elementsToHide.forEach((s: string) => document.querySelectorAll(s).forEach((e: any) => e.style.visibility = ''));
    }
}
