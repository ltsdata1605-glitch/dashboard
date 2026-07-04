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
    stickerType: 'gia_soc' | 'gio_vang';
    headerTextContent: string;
}

export interface PrintHistoryEntry {
    id: string;
    timestamp: number;
    label: string;
    pageCount: number;
    stickerType: 'gia_soc' | 'gio_vang';
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

