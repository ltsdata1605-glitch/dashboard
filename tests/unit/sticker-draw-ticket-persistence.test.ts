import { describe, expect, it } from 'vitest';
import { isHeavySyncKey, isLightSyncKey } from '../../utils/localDbScope';
import { isHistoryDuplicate } from '../../features/sticker-event/stickerprinter/pageHtmlUtils';
import { PrintHistoryEntry, TicketDrawData } from '../../features/sticker-event/stickerprinter/types';
import { DEFAULT_DRAW_HISTORY_ENTRY } from '../../features/sticker-event/hooks/useStickerPrinterData';

describe('Sticker Persistence & Cloud Sync Classification', () => {
    it('stickerPrinterState, stickerPrintHistory, stickerSavedLists are heavy sync keys', () => {
        expect(isHeavySyncKey('stickerPrinterState')).toBe(true);
        expect(isHeavySyncKey('stickerPrintHistory')).toBe(true);
        expect(isHeavySyncKey('stickerSavedLists')).toBe(true);
    });

    it('sticker keys are not light sync keys (to prevent exceeding 1MB configuration doc)', () => {
        expect(isLightSyncKey('stickerPrinterState')).toBe(false);
        expect(isLightSyncKey('stickerPrintHistory')).toBe(false);
        expect(isLightSyncKey('stickerSavedLists')).toBe(false);
    });
});

describe('Ticket Draw History Duplicate and Content Tracking', () => {
    const ticketA: TicketDrawData = {
        id: '1',
        title: 'PHIẾU BỐC THĂM 20/10',
        code: '1',
        footer: 'ĐIỆN MÁY XANH',
        contentTop: 'TRÚNG NỒI CƠM',
        contentTopRight: 'MIỄN PHÍ',
        contentBottom: '100 Suất',
        contentBottomRight: 'NỒI CƠM',
        contentBottomRightSub: '1 suất/ngày'
    };

    const ticketB: TicketDrawData = {
        id: '1',
        title: 'PHIẾU BỐC THĂM MỚI 25/10',
        code: '1',
        footer: 'ĐIỆN MÁY XANH',
        contentTop: 'TRÚNG TỦ LẠNH',
        contentTopRight: 'MIỄN PHÍ',
        contentBottom: '10 Suất',
        contentBottomRight: 'TỦ LẠNH',
        contentBottomRightSub: '1 suất/ngày'
    };

    const baseEntry: PrintHistoryEntry = {
        id: 'hist_1',
        timestamp: 1000,
        label: 'Phiếu Rút Thăm',
        pageCount: 1,
        stickerType: 'draw',
        bgImage: '/frame/bg_phieu.png',
        headerTextSize: 8,
        batchItems: [],
        headerTextContent: '',
        subHeaderTextContent: '',
        footerTextContent: '',
        showBarcode: false,
        manualPages: [],
        drawTickets: [ticketA],
        drawStartNumber: 1,
        drawTotalTickets: 4,
        drawAutoIncrement: true,
    };

    it('DEFAULT_DRAW_HISTORY_ENTRY has drawTickets defined', () => {
        expect(DEFAULT_DRAW_HISTORY_ENTRY.drawTickets).toBeDefined();
        expect(DEFAULT_DRAW_HISTORY_ENTRY.drawTickets?.length).toBe(4);
    });

    it('identifies exact duplicate ticket entries correctly', () => {
        const entryClone = { ...baseEntry, id: 'hist_2', timestamp: 2000 };
        expect(isHistoryDuplicate(baseEntry, entryClone)).toBe(true);
    });

    it('distinguishes different ticket contents and avoids false duplicate matching', () => {
        const entryModified: PrintHistoryEntry = {
            ...baseEntry,
            id: 'hist_3',
            drawTickets: [ticketB]
        };
        expect(isHistoryDuplicate(baseEntry, entryModified)).toBe(false);
    });
});
