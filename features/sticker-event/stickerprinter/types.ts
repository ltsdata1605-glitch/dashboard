export interface StickerPage {
    id: string;
    html: string;
    label: string;
    oldPrice: string;
    newPrice: string;
    percent: string;
    timestamp: number;
    discountDisplayMode?: 'percent' | 'amount';
    salePrice?: string;
    servicePrice?: string;
    header?: string;
    subHeader?: string;
    footer?: string;
    code?: string;
    selected?: boolean;
}

export interface SavedStickerList {
    id: string;
    name: string;
    pages: StickerPage[];
    timestamp: number;
    stickerType: 'gia_soc' | 'gio_vang' | 'draw';
    headerTextContent: string;
}

export interface PrintHistoryEntry {
    id: string;
    timestamp: number;
    label: string;
    pageCount: number;
    stickerType: 'gia_soc' | 'gio_vang' | 'draw';
    bgImage: string;
    headerTextSize: number;
    subHeaderTextSize?: number;
    percentTextSize?: number;
    oldPriceTextSize?: number;
    nameTextSize?: number;
    newPriceTextSize?: number;
    footerTextSize?: number;
    batchItems: BatchItem[];
    headerTextContent: string;
    subHeaderTextContent: string;
    footerTextContent: string;
    showBarcode: boolean;
    manualPages: StickerPage[];
    discountDisplayMode?: 'percent' | 'amount';
    drawContentTopLeftSize?: number;
    drawContentTopRightSize?: number;
    drawContentBottomLeftSize?: number;
    drawContentBottomRightSize?: number;
    drawTitleSize?: number;
    drawCodeSize?: number;
    drawFooterSize?: number;
}

export interface BatchItem {
    id: string;
    name: string;
    oldPrice: string;
    newPrice: string;
    percent: string;
    imei: string;
    selected: boolean;
}

export interface TicketDrawData {
    id: string;
    title: string;
    code: string;
    footer: string;
    contentTop?: string;
    contentTopRight?: string;
    contentBottom?: string;
    contentBottomRight?: string;
}


