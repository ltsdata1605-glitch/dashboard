import { isMobileLikeDevice, capPixelRatioForArea } from '../../../utils/dataUtils';
import { deliverImage } from '../ui/imageDelivery';
import { getActiveExportJob, startExportJob, type ExportJob } from './exportProgress';
import { fitTablesToContent, appendExportFooter, fixCircularAvatars } from './exportLayout';
import './ExportProgressHost';

/**
 * BỘ CHỤP ẢNH DUY NHẤT của toàn dự án (kế hoạch "Hợp nhất xuất ảnh", 2026-10-01).
 *
 * Gốc: bản đầy đủ nhất trong 4 bản sao (services/uiService.ts — Phân tích), chuyển nguyên logic sang
 * đây. Thêm 3 thứ áp cho MỌI nơi:
 *  - co cột vừa nội dung trước khi chụp (exportLayout.fitTablesToContent) — mặc định bật;
 *  - chân ảnh "Dashboard YCX · xuất HH:mm dd/mm" (chủ dự án chốt bật);
 *  - báo tiến trình qua bảng chung (exportProgress / ExportProgressHost).
 * Bề rộng ảnh tối thiểu 680px (chủ dự án chốt) — đọc vừa trên điện thoại.
 */

export type ExportMode = 'download' | 'share' | 'blob-only';

export interface ExportImageOptions {
    /** Bộ chọn phần tử bỏ khỏi ảnh. Mặc định ['.hide-on-export'] */
    elementsToHide?: string[];
    forceOpenDetails?: boolean;
    /** Độ nét (pixelRatio). Mặc định 2 (điện thoại 1.5, tự hạ theo trần canvas iOS) */
    scale?: number;
    isCompactTable?: boolean;
    /** Chụp đúng như đang hiển thị (khoá bề rộng theo khối gốc) — tắt co cột */
    captureAsDisplayed?: boolean;
    /** Ép bề rộng cố định (px) — tắt co cột */
    forcedWidth?: number | null;
    fitCategoryColumn?: boolean;
    fitAllColumns?: boolean;
    fitWidthToTable?: boolean;
    /** Co mọi cột bảng vừa nội dung trước khi chụp. Mặc định BẬT (trừ captureAsDisplayed / forcedWidth) */
    fitColumns?: boolean;
    /** Chân ảnh. Mặc định bật; false để tắt, chuỗi để thay nội dung */
    footer?: boolean | string;
    mode?: ExportMode;
    /** Sửa bản sao trước khi chụp */
    onCloneReady?: ((clone: HTMLElement) => void) | null;
    /** Gọi NGAY TRƯỚC khi chụp, bản sao đã đúng bố cục cuối (dùng cho test / chẩn đoán) */
    onBeforeCapture?: ((clone: HTMLElement, size: { width: number; height: number }) => void) | null;
    /** Tiêu đề hiện trên bảng tiến trình khi xuất lẻ (mặc định suy từ tên file) */
    progressTitle?: string;
    /** Không tự hiện bảng tiến trình (nơi gọi tự quản lý) */
    silent?: boolean;
    /**
     * Bộ quy tắc trình bày: 'standard' (Phân tích, Phân Ca, In Sticker, Thuế…), 'bi' (Report BI — presetBi.ts),
     * 'raw' (giữ NGUYÊN bố cục: mẫu HTML đã thiết kế sẵn của Check thưởng, chụp màn Khai thác).
     */
    preset?: 'standard' | 'bi' | 'raw';
    /** Màu nền ảnh (mặc định trắng) */
    backgroundColor?: string;
    /** [bi] Bỏ bo góc mọi khung */
    squareBorders?: boolean;
    /** [bi] Thu gọn lưới thẻ KPI */
    compactKpiCards?: boolean;
    /** Cờ cũ của luồng hàng loạt — giữ để tương thích, không còn ý nghĩa */
    isBatchExporting?: boolean;
}

export const EXPORT_MIN_WIDTH = 680;

/** Tải file / chia sẻ (điện thoại) — dùng khâu giao chung imageDelivery. */
export function downloadBlob(blob: Blob, filename: string, forceDownload = false) {
    void deliverImage(blob, filename, { share: forceDownload ? false : undefined });
}

/** Trình duyệt chia sẻ được tệp ảnh không (Web Share API Level 2). */
export function canShareFiles(): boolean {
    if (!navigator.share || !navigator.canShare) return false;
    try {
        const testFile = new File(['test'], 'test.png', { type: 'image/png' });
        return navigator.canShare({ files: [testFile] });
    } catch {
        return false;
    }
}

/** Chia sẻ ảnh (LINE, Zalo, Lưu ảnh…). true = đã mở bảng chia sẻ và người dùng chọn đích. */
export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
    return (await deliverImage(blob, filename, { share: true })) === 'shared';
}

/** "bao-cao-kho_Hung-Vuong.png" → "bao cao kho Hung Vuong" — tiêu đề bảng tiến trình khi nơi gọi không đặt. */
const tieuDeTuTenFile = (filename: string) =>
    filename.replace(/\.png$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'ảnh';

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

export async function exportElementAsImage(element: HTMLElement, filename: string, options: ExportImageOptions = {}): Promise<Blob | null> {
    // Bảng tiến trình: lượt lẻ tự mở bảng; nằm trong lượt hàng loạt (đã có bảng) thì chỉ đổi dòng trạng thái
    const outer = getActiveExportJob();
    const own: ExportJob | null = options.silent || outer ? null : startExportJob({ title: options.progressTitle || `Xuất ảnh ${tieuDeTuTenFile(filename)}` });
    const stage = (t: string) => { if (own) own.stage(t); };
    let ok = false;
    try {
        const core = options.preset === 'bi' ? (await import('./presetBi')).exportBiCore
            : options.preset === 'raw' ? exportRawCore
                : exportElementAsImageCore;
        const blob = await core(element, filename, options, stage);
        ok = !!blob;
        return blob;
    } finally {
        if (own) {
            own.result(tieuDeTuTenFile(filename), ok ? 'ok' : 'failed', ok ? undefined : 'Không dựng được ảnh');
            own.finish();
        }
    }
}

/**
 * Bộ quy tắc 'raw': KHÔNG đổi bố cục (không co chữ / bỏ bo góc / ép lưới…). Chỉ phần dùng chung: bản sao
 * off-screen đúng bề rộng khối gốc, co cột nếu nơi gọi bật `fitColumns`, chân ảnh, chờ phông/ảnh, đổi màu
 * oklch, độ nét có trần canvas iOS, giao ảnh.
 */
async function exportRawCore(element: HTMLElement, filename: string, options: ExportImageOptions, stage: (t: string) => void): Promise<Blob | null> {
    const isMobileDevice = isMobileLikeDevice();
    const { elementsToHide = ['.hide-on-export'], mode = 'download', footer = true } = options;
    const clone = element.cloneNode(true) as HTMLElement;
    elementsToHide.forEach((sel) => clone.querySelectorAll(sel).forEach((e) => e.remove()));
    options.onCloneReady?.(clone);

    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:-9999px;top:0;background:#fff';
    for (let a: HTMLElement | null = element; a; a = a.parentElement) {
        a.classList.forEach((c) => { if (/-root$/.test(c)) box.classList.add(c); });
    }
    const w0 = Math.ceil(options.forcedWidth || element.offsetWidth || element.getBoundingClientRect().width || EXPORT_MIN_WIDTH);
    clone.style.setProperty('width', `${w0}px`, 'important');
    clone.style.setProperty('max-width', 'none', 'important');
    clone.style.setProperty('margin', '0', 'important');
    box.appendChild(clone);
    document.body.appendChild(box);
    try {
        stage('Đang chụp ảnh…');
        let width = w0;
        if (options.fitColumns) {
            const fitted = fitTablesToContent(clone);
            if (fitted > 0) {
                width = Math.max(EXPORT_MIN_WIDTH, fitted);
                clone.style.setProperty('width', `${width}px`, 'important');
            }
        }
        if (footer) appendExportFooter(clone, typeof footer === 'string' ? footer : undefined);
        await document.fonts.ready;
        await waitForImages(clone);
        fixOklchColors(clone);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const height = Math.ceil(clone.offsetHeight || clone.getBoundingClientRect().height);
        let scale = options.scale ?? (isMobileDevice ? 1.5 : 2);
        if (height * scale > 32000) scale = Math.max(1, 32000 / height);
        if (isMobileDevice) scale = Math.min(scale, capPixelRatioForArea(width, height, scale));
        fixCircularAvatars(clone);
        options.onBeforeCapture?.(clone, { width, height });
        const htmlToImage = await import('html-to-image');
        const blob = await htmlToImage.toBlob(clone, {
            pixelRatio: scale, width, height, backgroundColor: options.backgroundColor || '#ffffff', cacheBust: true,
        });
        if (!blob) throw new Error('Không thể tạo ảnh từ DOM (kết quả trả về trống).');
        if (mode === 'blob-only') return blob;
        stage(isMobileDevice ? 'Đang mở chia sẻ…' : 'Đang lưu ảnh…');
        if (mode === 'share') await shareBlob(blob, filename);
        else downloadBlob(blob, filename);
        return blob;
    } catch (error) {
        console.error(`Lỗi khi xuất ảnh: ${filename}`, error);
        return null;
    } finally {
        box.remove();
    }
}

async function exportElementAsImageCore(element: HTMLElement, filename: string, options: ExportImageOptions, stage: (t: string) => void): Promise<Blob | null> {
    const isMobileDevice = isMobileLikeDevice();
    const defaultScale = isMobileDevice ? 1.5 : 2; // Giảm scale mobile → tiết kiệm ~44% CPU/memory
    const { elementsToHide = ['.hide-on-export'], forceOpenDetails = false, scale = defaultScale, isCompactTable = false, captureAsDisplayed = false, forcedWidth = null, fitCategoryColumn = false, fitAllColumns = false, fitWidthToTable = false, mode = 'download' as ExportMode, onCloneReady = null, footer = true } = options;
    // Co cột vừa nội dung: mặc định BẬT, trừ khi nơi gọi khoá bề rộng (chụp như đang hiển thị / ép bề rộng)
    const doFit = options.fitColumns ?? (!captureAsDisplayed && !forcedWidth);

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
        
        // Target elements with truncate class or matching employee name pattern.
        // Chỉ xét pattern tên nhân viên trên phần tử LÁ (không có element con): textContent của
        // một div bọc gộp cả text các con, nên div cha/ông chứa 1 nhãn "12345 - Tên NV" ở đâu đó
        // cũng khớp pattern và bị ép `white-space: nowrap` + `min-width: max-content`, khiến toàn
        // bộ khối nội dung nở ngang vượt bề rộng chụp và bị cắt mất phần bên phải.
        const matchesEmployeeName = isEmployeeNamePattern(text) && el.children.length === 0;
        if (el.classList.contains('truncate') || matchesEmployeeName) {
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
    
    // Bỏ bo góc cho toàn bộ khung viền theo yêu cầu: "VIỀN KHÔNG CẦN BO GỐC"
    clone.style.setProperty('border-radius', '0px', 'important');
    clone.querySelectorAll<HTMLElement>('*').forEach(el => {
        const cls = el.getAttribute('class') || '';
        // Giữ lại pill tròn cho badge/icon nếu có class rounded-full/preserve-rounded, không ép vuông vức các khối avatar
        const isAvatarOrRounded = cls.includes('rounded-full') ||
            cls.includes('preserve-rounded') ||
            el.closest('.rounded-full, .preserve-rounded') !== null ||
            (el.style.clipPath && el.style.clipPath.includes('circle')) ||
            el.querySelector('img.rounded-full, img[class*="rounded-full"], [data-avatar]') !== null;
        if (!isAvatarOrRounded) {
            el.style.setProperty('border-radius', '0px', 'important');
        }
    });

    // 7. COMPACT EXPORT TABLE WIDTH CONSTRAINTS & WORD WRAP
    clone.querySelectorAll('.compact-export-table, table').forEach(table => {
        if (!(table instanceof HTMLElement)) return;
        table.style.setProperty('table-layout', 'auto', 'important');
        table.style.setProperty('width', '100%', 'important');
        table.style.setProperty('min-width', 'auto', 'important');

        // Tìm index của cột "NHÓM THI ĐUA" và các cột thanh tiến độ ProgressBar (%HT, %DKHT)
        let nhomThiDuaColIdx = -1;
        const progressBarColIndices = new Set<number>();
        const ths = table.querySelectorAll('thead th');
        // Cột đầu chỉ là cột STT khi tiêu đề của nó rỗng / "#" / "STT". Trước đây mọi cột đầu
        // (idx === 0) đều bị ép 36px như STT — bảng "Chi tiết theo kho" (dọc) có cột đầu là NHÃN
        // "NHÓM / CHỈ SỐ" (LỌC/H.BỤI, M/ICALL…) nên chữ tràn đè lên cột M.TIÊU khi xuất ảnh
        // (chủ dự án báo 2026-09-22). Cột đầu mang nhãn chữ → xử lý như cột "NHÓM THI ĐUA":
        // không xuống dòng, rộng theo nội dung.
        const isSttHeaderText = (t: string) => t === '' || t === '#' || t === 'STT' || t === 'TT';
        const firstThText = ths[0]?.textContent?.trim().replace(/\s+/g, ' ').toUpperCase().normalize('NFC') || '';
        const firstColIsStt = isSttHeaderText(firstThText);
        if (!firstColIsStt && ths[0] && (ths[0] as HTMLTableCellElement).colSpan <= 1) nhomThiDuaColIdx = 0;
        ths.forEach((th, idx) => {
            const text = th.textContent?.trim().replace(/\s+/g, ' ').toUpperCase().normalize('NFC') || '';
            if (text.includes('NHÓM THI ĐUA') || text === 'NHÓM') {
                nhomThiDuaColIdx = idx;
            }
            if (text.includes('%HT') || text.includes('%DKHT') || text.includes('%HTDK')) {
                progressBarColIndices.add(idx);
            }
        });

        // Xử lý các thẻ th của bảng
        table.querySelectorAll('thead th').forEach((th, idx) => {
            if (!(th instanceof HTMLElement)) return;
            const text = th.textContent?.trim() || '';
            const isSttCol = (idx === 0 && firstColIsStt) || text === '#' || text === 'STT';
            const isNhomThiDuaCol = idx === nhomThiDuaColIdx;
            const isProgressBarCol = progressBarColIndices.has(idx);

            // Ép cỡ chữ (11px) và line-height vừa đủ, cân đối với nội dung
            th.style.setProperty('font-size', '11px', 'important');
            th.style.setProperty('line-height', '1.25', 'important');
            th.style.setProperty('padding', '3px 5px', 'important');

            if (isSttCol) {
                th.style.setProperty('min-width', '36px', 'important');
                th.style.setProperty('width', '36px', 'important');
                th.style.setProperty('max-width', '42px', 'important');
                th.style.setProperty('text-align', 'center', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
            } else if (isNhomThiDuaCol) {
                th.style.setProperty('min-width', '140px', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
                th.style.setProperty('max-width', 'none', 'important');
                
                // Bọc thẻ span con để tránh bug html2canvas/html-to-image ngắt dòng text thô
                if (!th.querySelector('.export-nowrap-wrapper')) {
                    const content = th.innerHTML;
                    th.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-block !important; width: max-content !important; line-height: 1.25 !important;">${content}</span>`;
                }
            } else if (isProgressBarCol) {
                // Cột có thanh tiến độ ProgressBar (%HT, %DKHT, ...) cần tối thiểu 105px đồng bộ với td để không bị lệch cột
                th.style.setProperty('min-width', '105px', 'important');
                th.style.setProperty('width', '105px', 'important');
                th.style.setProperty('white-space', 'nowrap', 'important');
                th.style.setProperty('max-width', 'none', 'important');
            } else {
                th.style.setProperty('white-space', 'normal', 'important');
                th.style.setProperty('word-break', 'break-word', 'important');
                th.style.setProperty('min-width', '55px', 'important');
            }
            
            th.querySelectorAll('span').forEach(span => {
                span.classList.remove('truncate');
                span.style.setProperty('line-height', '1.25', 'important');
                if (!isSttCol && !isNhomThiDuaCol && !isProgressBarCol) {
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
                const isSttCol = idx === 0 && firstColIsStt;
                const isNhomThiDuaCol = idx === nhomThiDuaColIdx;
                const isProgressBarCol = progressBarColIndices.has(idx) || !!td.querySelector('.w-10') || !!td.querySelector('[class*="progress"]');

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

                    if (child.tagName === 'DIV' || child.tagName === 'P' || child.tagName === 'BUTTON') {
                        child.style.setProperty('margin-top', '0px', 'important');
                        child.style.setProperty('margin-bottom', '0px', 'important');
                    }
                    if (child.tagName === 'BUTTON') {
                        child.style.setProperty('min-height', '0px', 'important');
                        child.style.setProperty('height', 'auto', 'important');
                        child.style.setProperty('vertical-align', 'baseline', 'important');
                        child.style.setProperty('border', '0', 'important');
                        child.style.setProperty('background', 'transparent', 'important');
                    }
                });

                if (isSttCol) {
                    td.style.setProperty('min-width', '36px', 'important');
                    td.style.setProperty('width', '36px', 'important');
                    td.style.setProperty('max-width', '42px', 'important');
                    td.style.setProperty('text-align', 'center', 'important');
                    td.style.setProperty('white-space', 'nowrap', 'important');
                } else if (isNhomThiDuaCol) {
                    td.style.setProperty('white-space', 'nowrap', 'important');
                    td.style.setProperty('min-width', '140px', 'important');
                    td.style.setProperty('max-width', 'none', 'important');
                    
                    // Bọc thẻ span con chống ngắt dòng
                    if (!td.querySelector('.export-nowrap-wrapper')) {
                        const content = td.innerHTML;
                        td.innerHTML = `<span class="export-nowrap-wrapper" style="white-space: nowrap !important; display: inline-block !important; width: max-content !important; line-height: 1.25 !important;">${content}</span>`;
                    }
                } else if (isProgressBarCol) {
                    // Cột có thanh tiến độ ProgressBar (%HT, %DKHT...): kích thước đồng bộ 105px với th, KHÔNG set max-width 80px và KHÔNG bọc wrap span inline-block
                    td.style.setProperty('min-width', '105px', 'important');
                    td.style.setProperty('width', '105px', 'important');
                    td.style.setProperty('max-width', 'none', 'important');
                    td.style.setProperty('white-space', 'nowrap', 'important');
                } else {
                    if (!td.classList.contains('sticky')) {
                        td.style.setProperty('min-width', '45px', 'important');
                        td.style.setProperty('max-width', '80px', 'important');

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
            svgClone.querySelectorAll('text, tspan').forEach((el: Element, idx: number) => {
                const textEl = el as SVGElement;
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
    // Bản sao gắn thẳng vào <body>, nằm NGOÀI các khối gốc của khu vực (vd .phanca-root) — biến CSS khai báo
    // theo khối đó (--cell-kho-bg, --cell-gh-bg…) sẽ không còn, màu nền ô mất trong ảnh. Mang theo mọi class
    // "*-root" của tổ tiên (bản vá riêng của Phân Ca, nay áp chung).
    for (let a: HTMLElement | null = element; a; a = a.parentElement) {
        a.classList.forEach((c) => { if (/-root$/.test(c)) captureContainer.classList.add(c); });
    }
    
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
        // Lock width to viewport display width, but allow full content height.
        // offsetWidth (không phải clientWidth): clientWidth bỏ đường viền nên bản sao hẹp hơn khối
        // gốc 2px, viền phải bị cắt mất trong ảnh (thấy ở ảnh xuất màn Tính Thuế).
        const viewportWidth = element.offsetWidth || element.clientWidth;
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
    // Remove artificial outer border box on clone root to prevent nested double borders
    clone.style.border = 'none';
    clone.style.borderRadius = '0';

    // Gỡ bỏ overflow-hidden và overflow-x: auto trên các wrapper bọc table để không cắt mất các cột bên phải
    // NHƯNG GIỮ NGUYÊN viền bao quanh bảng nếu wrapper vốn có viền (như border border-slate-200 / dark:border-slate-700)
    clone.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-hidden').forEach((el) => {
        if (el instanceof HTMLElement) {
            const hasTable = !!el.querySelector('table');
            const hasBorder = /(?:^|\s)border(?:-|\s|$)/.test(el.className || '') || el.style.borderWidth !== '' || el.style.border !== '';
            if (hasTable && hasBorder) {
                const isDark = document.documentElement.classList.contains('dark');
                const borderColor = isDark ? '#334155' : '#e2e8f0';
                el.style.setProperty('border', `1px solid ${borderColor}`, 'important');
                el.style.setProperty('box-sizing', 'border-box', 'important');
            } else {
                el.style.setProperty('border', 'none', 'important');
            }
            el.style.setProperty('box-shadow', 'none', 'important');
        }
    });

    // Remove redundant box-shadows from all cloned children for crisp single-border rendering
    clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el instanceof HTMLElement && el.style) {
            el.style.setProperty('box-shadow', 'none', 'important');
        }
    });

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

        const isDarkMode = document.documentElement.classList.contains('dark');
        const cardBorderColor = isDarkMode ? '#334155' : '#cbd5e1';
        kpiGrid.children && Array.from(kpiGrid.children).forEach((child) => {
            if (!(child instanceof HTMLElement)) return;
            child.style.setProperty('padding', '6px 8px', 'important');
            child.style.setProperty('border-radius', '0', 'important');
            child.style.setProperty('border', `1px solid ${cardBorderColor}`, 'important');
            child.style.setProperty('box-sizing', 'border-box', 'important');

            child.querySelectorAll<HTMLElement>('.text-xl, .text-2xl, .text-3xl').forEach((numEl) => {
                numEl.style.setProperty('font-size', '18px', 'important');
                numEl.style.setProperty('line-height', '1.2', 'important');
            });
            child.querySelectorAll<HTMLElement>('span, div').forEach((textEl) => {
                const textCls = textEl.getAttribute('class') || '';
                if (textCls.includes('tracking-wider') || textCls.includes('uppercase') || textCls.includes('text-[11px]')) {
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
        container.style.setProperty('padding-top', '12px', 'important');
        container.style.setProperty('padding-bottom', '6px', 'important');
        container.style.setProperty('padding-left', '0px', 'important');
        container.style.setProperty('padding-right', '0px', 'important');
        container.style.setProperty('margin-top', '4px', 'important');
        container.style.setProperty('margin-bottom', '10px', 'important');
    });

    clone.querySelectorAll<HTMLElement>('.industry-kpi-grid').forEach((grid) => {
        grid.style.setProperty('display', 'grid', 'important');
        grid.style.setProperty('grid-template-columns', 'repeat(6, minmax(0, 1fr))', 'important');
        grid.style.setProperty('gap', '5px', 'important');
    });

    clone.querySelectorAll<HTMLElement>('.industry-kpi-card').forEach((card) => {
        card.style.setProperty('padding', '6px 8px', 'important');
        card.style.setProperty('border-radius', '6px', 'important');
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

    // Strip border-radius from the clone root itself
    clone.style.borderRadius = '0';
    clone.style.padding = '0';

    // FIT WIDTH TO TABLE — ảnh xuất ra cân xứng: cột co vừa nội dung (fitAllColumns) rồi ĐO bề rộng
    // THẬT của bảng và ép cả khối (tiêu đề, quỹ thời gian, dải thẻ KPI `w-full`) về đúng bề rộng đó,
    // thay vì để mỗi thứ tự giãn theo nội dung dài nhất (trước đây thẻ KPI/tiêu đề rộng hơn bảng).
    // Phải chạy SAU khi clone đã nằm trong DOM thì đo mới ra số thật.
    if (fitWidthToTable) {
        const tableEl = clone.querySelector('table');
        if (tableEl instanceof HTMLElement) {
            const tableWidth = tableEl.getBoundingClientRect().width;
            if (tableWidth > 0) {
                // Cộng thêm phần đệm/viền của mọi khối bọc giữa bảng và gốc clone, nếu không bảng
                // sẽ rộng hơn khung và bị cắt mép phải.
                let extra = 0;
                let node: HTMLElement | null = tableEl.parentElement;
                while (node && node !== clone) {
                    const cs = window.getComputedStyle(node);
                    extra += parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0')
                        + parseFloat(cs.borderLeftWidth || '0') + parseFloat(cs.borderRightWidth || '0');
                    node = node.parentElement;
                }
                const csClone = window.getComputedStyle(clone);
                extra += parseFloat(csClone.paddingLeft || '0') + parseFloat(csClone.paddingRight || '0');
                const finalW = Math.ceil(tableWidth + extra);
                clone.style.setProperty('width', `${finalW}px`, 'important');
                clone.style.setProperty('max-width', `${finalW}px`, 'important');
                clone.style.setProperty('min-width', `${finalW}px`, 'important');
                captureContainer.style.width = `${finalW}px`;
            }
        }
    }

    // CO CỘT VỪA NỘI DUNG (mặc định) — fix độ rộng từng cột vừa khít nội dung thực tế trước khi xuất
    let fittedWidth = 0;
    if (doFit) {
        fittedWidth = fitTablesToContent(clone);
        if (fittedWidth > 0) {
            const hasKpiGrid = !!clone.querySelector('.kpi-grid, .kpi-grid-for-export, .kpi-overview-card');
            const w = Math.max(hasKpiGrid ? EXPORT_MIN_WIDTH : 0, fittedWidth);
            clone.style.setProperty('width', `${w}px`, 'important');
            clone.style.setProperty('max-width', `${w}px`, 'important');
            clone.style.setProperty('min-width', `${w}px`, 'important');
            captureContainer.style.width = `${w}px`;
        }
    }

    // Chân ảnh (chủ dự án chốt 2026-10-01: bật, chữ xám nhỏ)
    if (footer) appendExportFooter(clone, typeof footer === 'string' ? footer : undefined);

    try {
        stage('Đang chụp ảnh…');
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
        // Đã co cột ở trên thì bề rộng bảng là số đo thật — KHÔNG đo lại kiểu max-content (tiêu đề duỗi
        // một hàng sẽ làm ảnh rộng hơn bảng, thừa trắng bên phải).
        const tables = fittedWidth > 0 ? [] : Array.from(clone.querySelectorAll('table'));
        tables.forEach((t) => {
            const prevW = t.style.width;
            t.style.setProperty('width', 'max-content', 'important');
            const w = Math.ceil(t.getBoundingClientRect().width || t.scrollWidth || 0);
            t.style.setProperty('width', prevW || '100%', 'important');
            maxTableWidth = Math.max(maxTableWidth, w);
        });

        // Bề rộng tối ưu:
        // Với bảng có cột: giữ nguyên độ rộng vừa khít của các cột (fittedWidth), không kéo dãn thừa khoảng trắng.
        // Chỉ áp dụng trần EXPORT_MIN_WIDTH khi có cụm thẻ KPI grid.
        const hasKpiGrid = !!clone.querySelector('.kpi-grid, .kpi-grid-for-export, .kpi-overview-card');
        const minWidthThreshold = hasKpiGrid ? EXPORT_MIN_WIDTH : 0;
        const optimalWidth = fittedWidth > 0
            ? Math.max(minWidthThreshold, fittedWidth)
            : maxTableWidth > 0
                ? Math.max(minWidthThreshold, maxTableWidth + 16)
                : Math.max(EXPORT_MIN_WIDTH, Math.min(Math.ceil(rect.width || 0), 1000));

        const contentWidth = captureAsDisplayed
            ? (element.offsetWidth || element.clientWidth)
            : (forcedWidth || optimalWidth);

        const finalWidth = Math.ceil(contentWidth) + exportPadding * 2;
        let finalHeight = contentHeight + exportPadding * 2;

        clone.style.setProperty('width', `${finalWidth}px`, 'important');
        clone.style.setProperty('min-width', `${finalWidth}px`, 'important');
        clone.style.setProperty('max-width', `${finalWidth}px`, 'important');
        clone.style.setProperty('overflow', 'visible', 'important');
        if (captureContainer) {
            captureContainer.style.setProperty('width', `${finalWidth}px`, 'important');
            captureContainer.style.setProperty('min-width', `${finalWidth}px`, 'important');
            captureContainer.style.setProperty('max-width', `${finalWidth}px`, 'important');
        }

        // Đảm bảo wrapper trực tiếp bao quanh bảng giữ viền xám bao quanh bảng
        clone.querySelectorAll('table').forEach((t) => {
            const parent = t.parentElement;
            if (parent instanceof HTMLElement && (/(?:^|\s)border(?:-|\s|$)/.test(parent.className || '') || parent.classList.contains('overflow-x-auto'))) {
                const isDark = document.documentElement.classList.contains('dark');
                const borderColor = isDark ? '#334155' : '#e2e8f0';
                parent.style.setProperty('border', `1px solid ${borderColor}`, 'important');
                parent.style.setProperty('box-sizing', 'border-box', 'important');
            }
        });

        let finalScale = scale;
        if (finalHeight * scale > 32000) {
            finalScale = Math.max(1, 32000 / finalHeight);
            console.warn(`Cảnh báo: Ảnh quá dài (${finalHeight}px). Tự động giảm tỉ lệ xuống ${finalScale.toFixed(2)} để tránh lỗi trình duyệt.`);
        }
        // Safari iOS trả ảnh TRẮNG (không báo lỗi) khi canvas vượt ~16,7 triệu px — bảng rộng × scale
        // 1.5 dễ vượt. Chỉ áp trên thiết bị di động; desktop giữ nguyên độ nét.
        if (isMobileDevice) {
            const capped = capPixelRatioForArea(finalWidth, finalHeight, finalScale);
            if (capped < finalScale) {
                console.warn(`Ảnh ${finalWidth}×${finalHeight}px vượt trần canvas iOS — giảm tỉ lệ ${finalScale.toFixed(2)} → ${capped.toFixed(2)}.`);
                finalScale = capped;
            }
        }

        const isDark = document.documentElement.classList.contains('dark');
        const defaultBg = isDark ? '#0f172a' : '#ffffff';
        const isTransparentTable = lowerFilename.includes('bao-cao-kho') || lowerFilename.includes('chi-tiet-nganh-hang');

        fixCircularAvatars(clone);
        options.onBeforeCapture?.(clone, { width: finalWidth, height: finalHeight });
        const htmlToImage = await import('html-to-image');
        let blob: Blob | null = null;
        try {
            blob = await htmlToImage.toBlob(clone, {
                pixelRatio: finalScale,
                backgroundColor: isTransparentTable ? undefined : defaultBg,
                width: finalWidth,
                height: finalHeight,
                style: {
                    margin: '0',
                    padding: '4px',
                },
                // GIỮ font embedding mặc định để text render đúng.
            });
        } catch (fontErr) {
            console.warn('html-to-image capture failed with fonts, retrying with skipFonts: true', fontErr);
            blob = await htmlToImage.toBlob(clone, {
                pixelRatio: finalScale,
                backgroundColor: isTransparentTable ? undefined : defaultBg,
                width: finalWidth,
                height: finalHeight,
                style: {
                    margin: '0',
                    padding: '4px',
                },
                skipFonts: true,
            });
        }

        if (!blob) {
            throw new Error("Không thể tạo ảnh từ DOM (kết quả trả về trống).");
        }
        if (mode !== 'blob-only') stage(isMobileDevice ? 'Đang mở chia sẻ…' : 'Đang lưu ảnh…');

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
