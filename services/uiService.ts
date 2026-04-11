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
    const { elementsToHide = ['.hide-on-export'], forceOpenDetails = false, scale = 2, isCompactTable = false, captureAsDisplayed = false, forcedWidth = null, fitCategoryColumn = false } = options;

    const clone = element.cloneNode(true) as HTMLElement;

    elementsToHide.forEach((s: string) => {
        clone.querySelectorAll(s).forEach((e: any) => {
            e.style.setProperty('display', 'none', 'important');
        });
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

    // 1c. Fix overdue orders banner — change from absolute to relative so it flows in export layout
    const overdueBanner = clone.querySelector('[class*="absolute"][class*="bg-rose-50"]');
    if (overdueBanner && overdueBanner instanceof HTMLElement) {
        overdueBanner.style.setProperty('position', 'relative', 'important');
        overdueBanner.style.setProperty('border-radius', '0', 'important');
    }

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
    
    // FIX FOR SCROLLABLE CONTENT (Expand scrollable tables for export)
    const scrollableContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .custom-scrollbar, [class*="max-h-"], [class*="overflow-"]');
    const hideScrollbarStyle = document.createElement('style');
    hideScrollbarStyle.textContent = `.clone-no-scrollbar::-webkit-scrollbar { display: none !important; }`;
    clone.appendChild(hideScrollbarStyle);

    if (captureAsDisplayed) {
        // Only expand VERTICAL overflow — keep horizontal clipped to match viewport width
        scrollableContainers.forEach((container: any) => {
            container.style.maxHeight = 'none';
            container.style.overflowY = 'visible';
            if (container instanceof HTMLElement) {
                container.style.scrollbarWidth = 'none';
                container.classList.add('clone-no-scrollbar');
            }
        });
    } else {
        // Full expansion — expand both directions for maximum content capture
        scrollableContainers.forEach((container: any) => {
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
    cloneSvgs.forEach((svg: any, idx: number) => {
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
    cloneRechartsSvgs.forEach((cloneSvg: any, idx: number) => {
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
            svgClone.querySelectorAll('text, tspan').forEach((textEl: any) => {
                const computed = window.getComputedStyle(textEl);
                textEl.style.fontFamily = computed.fontFamily;
                textEl.style.fontSize = computed.fontSize;
                textEl.style.fill = computed.fill;
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
        clone.querySelectorAll('.recharts-responsive-container, .recharts-wrapper').forEach((el: any) => {
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

    try {
        await document.fonts.ready;
        await waitForImages(clone);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log(`Bắt đầu chụp ảnh bằng html-to-image: ${filename}...`);

        // Use getBoundingClientRect for better accuracy on scaled/cloned elements
        const rect = clone.getBoundingClientRect();
        const finalWidth = captureAsDisplayed ? element.clientWidth : (rect.width || clone.scrollWidth);
        let finalHeight = rect.height || clone.scrollHeight;
        
        // Safety: Add padding-bottom to the clone to ensure footer is not clipped
        clone.style.paddingBottom = '40px';
        finalHeight += 40;

        let finalScale = scale;
        if (finalHeight * scale > 15000) {
            finalScale = Math.max(1, 15000 / finalHeight);
            console.warn(`Cảnh báo: Ảnh quá dài (${finalHeight}px). Tự động giảm tỉ lệ xuống ${finalScale.toFixed(2)} để tránh lỗi trình duyệt.`);
        }

        const isDark = document.documentElement.classList.contains('dark');
        const defaultBg = isDark ? '#0f172a' : '#f8fafc';
        const isTransparentTable = lowerFilename.includes('bao-cao-kho') || lowerFilename.includes('chi-tiet-nganh-hang');

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
        
    } catch (error) {
        console.error(`Lỗi khi xuất ảnh: ${filename}`, error);
    } finally {
        if (document.body.contains(captureContainer)) {
            document.body.removeChild(captureContainer);
        }

    }
}
