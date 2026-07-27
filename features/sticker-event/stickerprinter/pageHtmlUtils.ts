import { generateBarcodeDataUrl } from '../../../components/views/BarcodeCanvas';
import { StickerPage, PrintHistoryEntry, TicketDrawData } from './types';
import { formatPriceChangePercent, normalizeStickerPriceUnit } from '../utils/format';
import { sanitizeTicketHtml } from './ticketSanitize';

/**
 * Sinh HTML in cho tất cả trang phiếu rút thăm từ data (không phụ thuộc DOM).
 * Dùng khi preview chỉ render 1 trang nhưng cần in đầy đủ tất cả.
 */
export interface DrawPrintOptions {
    drawTickets: TicketDrawData[];
    bgImage: string;
    drawTitleSize?: number;
    drawCodeSize?: number;
    drawFooterSize?: number;
    drawContentTopLeftSize?: number;
    drawContentTopRightSize?: number;
    drawContentBottomLeftSize?: number;
    drawContentBottomRightSize?: number;
    isAutoIncrement?: boolean;
}

export const generateDrawPagesHtml = (opts: DrawPrintOptions): string => {
    const {
        drawTickets, bgImage,
        drawTitleSize = 2.5, drawCodeSize = 3.8, drawFooterSize = 3.8,
        drawContentTopLeftSize = 3.5, drawContentTopRightSize = 3.5,
        drawContentBottomLeftSize = 2.2, drawContentBottomRightSize = 2.2,
        isAutoIncrement = true,
    } = opts;

    if (!drawTickets.length) return '';

    const firstTicket = drawTickets[0];
    const pages: string[] = [];

    for (let pageIdx = 0; pageIdx < Math.ceil(drawTickets.length / 4); pageIdx++) {
        const pageTickets = drawTickets.slice(pageIdx * 4, pageIdx * 4 + 4);
        const ticketBlocks = pageTickets.map((ticket, index) => {
            const totalIndex = pageIdx * 4 + index;
            const isFirst = totalIndex === 0;
            const src = isFirst ? ticket : firstTicket;

            const titleHtml = `<div class="${isFirst ? 'input-title-single' : 'display-title-single'}" style="font-size:${Math.min(drawTitleSize, 3.0)}cqw">${sanitizeTicketHtml(src.title)}</div>`;
            const contentTopLeftHtml = `<div class="${isFirst ? 'input-content-top-left' : 'display-content-top-left'}" style="font-size:${drawContentTopLeftSize}cqw">${sanitizeTicketHtml(src.contentTop)}</div>`;
            const contentTopRightHtml = `<div class="${isFirst ? 'input-content-top-right' : 'display-content-top-right'}" style="font-size:${drawContentTopRightSize}cqw">${sanitizeTicketHtml(src.contentTopRight)}</div>`;
            const codeLeftHtml = `<div class="${isAutoIncrement ? 'display-code-left' : 'input-code-left'}" style="font-size:${drawCodeSize}cqw">${ticket.code}</div>`;
            const codeRightHtml = `<div class="display-code-right" style="font-size:${drawCodeSize}cqw">${ticket.code}</div>`;
            const contentBottomLeftHtml = `<div class="${isFirst ? 'input-content-bottom-left' : 'display-content-bottom-left'}" style="font-size:${drawContentBottomLeftSize}cqw">${sanitizeTicketHtml(src.contentBottom)}</div>`;
            const contentBottomRightHtml = `<div class="${isFirst ? 'input-content-bottom-right' : 'display-content-bottom-right'}" style="font-size:${drawContentBottomRightSize}cqw">${sanitizeTicketHtml(src.contentBottomRight)}</div>`;
            const footerHtml = `<div class="${isFirst ? 'input-footer-left' : 'display-footer-left'}" style="font-size:${drawFooterSize}cqw">${sanitizeTicketHtml(src.footer)}</div>`;

            return `<div class="draw-ticket-block" data-index="${index}">${titleHtml}${contentTopLeftHtml}${contentTopRightHtml}${codeLeftHtml}${codeRightHtml}${contentBottomLeftHtml}${contentBottomRightHtml}${footerHtml}</div>`;
        }).join('');

        const isLast = pageIdx === Math.ceil(drawTickets.length / 4) - 1;
        pages.push(`<div class="sticker-container draw-page active-preview-page" data-type="draw" style="background-image:url('${bgImage}');page-break-after:${isLast ? 'auto' : 'always'};margin-bottom:${isLast ? '0' : '20px'}">${ticketBlocks}</div>`);
    }

    return pages.join('');
};

export const cleanWaterPurifierName = (nameStr: string): string => {
    if (!nameStr) return '';
    let cleaned = nameStr;
    cleaned = cleaned.replace(/Máy lọc nước/gi, 'MLN');
    const removeSubstrings = [
        'RO nóng lạnh tủ đứng',
        '\\(IMEI\\)',
        'nước nóng lạnh',
        'RO âm tủ',
        'RO tủ đứng',
        'điện giải nóng nguội',
        'nóng lạnh RO',
        'RO nóng nguội lạnh tủ đứng'
    ];
    for (const sub of removeSubstrings) {
        const regex = new RegExp(sub, 'gi');
        cleaned = cleaned.replace(regex, '');
    }
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
};

export const resolvePagePrices = (page: StickerPage, priceSource: 'sale' | 'service') => {
    let newPrice = page.newPrice;
    let percent = page.percent;

    if (priceSource === 'service' && page.servicePrice) {
        newPrice = page.servicePrice;
        if (page.oldPrice && page.servicePrice) {
            percent = formatPriceChangePercent(page.oldPrice, page.servicePrice);
        }
    } else if (page.salePrice) {
        newPrice = page.salePrice;
        if (page.oldPrice && page.salePrice) {
            percent = formatPriceChangePercent(page.oldPrice, page.salePrice);
        }
    }
    return { newPrice, percent };
};

export const generatePageHtml = (
    page: StickerPage,
    priceSource: 'sale' | 'service',
    stickerType: 'gia_soc' | 'gio_vang' | 'draw',
    bgImage: string,
    discountDisplayMode: 'percent' | 'amount' = 'percent'
) => {
    if (stickerType === 'draw') {
        return `<div class="sticker-container" data-type="${stickerType}" style="background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:2482/3512;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;"></div>`;
    }

    let { newPrice, percent } = resolvePagePrices(page, priceSource);

    // Fallback parsing for header, subHeader, and footer from page.html
    let header = page.header;
    let subHeader = page.subHeader;
    let footer = page.footer;

    if (page.html && (!header || !subHeader || !footer)) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page.html, 'text/html');
            const headerEl = doc.querySelector('.header-text');
            const subHeaderEl = doc.querySelector('.sub-header');
            const footerEl = doc.querySelector('.footer-text');

            if (header === undefined && headerEl) header = headerEl.textContent || '';
            if (subHeader === undefined && subHeaderEl) subHeader = subHeaderEl.textContent || '';
            if (footer === undefined && footerEl) footer = footerEl.textContent || '';
        } catch (e) {
            console.error('Error parsing fallback fields from page.html:', e);
        }
    }

    let barcodeHtml = '';
    if (page.code) {
        try {
            const url = generateBarcodeDataUrl(page.code);
            barcodeHtml = `<div class="barcode"><img src="${url}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${page.code}" /></div>`;
        } catch (e) {
            console.error('Barcode error:', e);
        }
    }

    const subHeaderHtml = stickerType === 'gio_vang'
        ? `<div class="sub-header">${subHeader || ''}</div>` : '';

    const priceHtml = `<div class="extra2">${newPrice}</div>`;

    if (discountDisplayMode === 'amount') {
        const oldVal = Number(String(page.oldPrice).replace(/\D/g, ''));
        let newVal = Number(String(newPrice).replace(/\D/g, ''));
        if (oldVal > 0 && newVal > 0) {
            newVal = normalizeStickerPriceUnit(oldVal, newVal);
            const diff = oldVal - newVal;
            if (diff > 0) {
                percent = `-${(diff/1000).toLocaleString('vi-VN')}K`;
            }
        }
    }

    return `<div class="sticker-container" data-type="${stickerType}" style="background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
        ${barcodeHtml}
        <div class="header-text">${header || ''}</div>
        ${subHeaderHtml}
        <div class="extra1">${percent}</div>
        <div class="old">${page.oldPrice}</div>
        <div class="name">${page.label}</div>
        ${priceHtml}
        <div class="footer-text">${footer || ''}</div>
    </div>`;
};

export const isHistoryDuplicate = (a: PrintHistoryEntry, b: PrintHistoryEntry): boolean => {
    if (a.stickerType !== b.stickerType) return false;
    if (a.headerTextContent !== b.headerTextContent) return false;
    if (a.subHeaderTextContent !== b.subHeaderTextContent) return false;
    if (a.footerTextContent !== b.footerTextContent) return false;
    if (a.showBarcode !== b.showBarcode) return false;
    if (a.discountDisplayMode !== b.discountDisplayMode) return false;
    if (a.pageCount !== b.pageCount) return false;

    // Compare batchItems (exact content fields)
    if (a.batchItems.length !== b.batchItems.length) return false;
    for (let i = 0; i < a.batchItems.length; i++) {
        const itemA = a.batchItems[i];
        const itemB = b.batchItems[i];
        if (itemA.name !== itemB.name ||
            itemA.oldPrice !== itemB.oldPrice ||
            itemA.newPrice !== itemB.newPrice ||
            itemA.percent !== itemB.percent ||
            itemA.imei !== itemB.imei ||
            itemA.selected !== itemB.selected) {
            return false;
        }
    }

    // Compare manualPages (exact content fields)
    if (a.manualPages.length !== b.manualPages.length) return false;
    for (let i = 0; i < a.manualPages.length; i++) {
        const pA = a.manualPages[i];
        const pB = b.manualPages[i];
        if (pA.label !== pB.label ||
            pA.oldPrice !== pB.oldPrice ||
            pA.newPrice !== pB.newPrice ||
            pA.percent !== pB.percent ||
            pA.code !== pB.code ||
            pA.header !== pB.header ||
            pA.subHeader !== pB.subHeader ||
            pA.footer !== pB.footer ||
            pA.selected !== pB.selected) {
            return false;
        }
    }

    return true;
};
