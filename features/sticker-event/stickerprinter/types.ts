export interface StickerPage {
    id: string;
    html: string;
    label: string;
    oldPrice: string;
    newPrice: string;
    percent: string;
    timestamp: number;
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
    batchItems: BatchItem[];
    headerTextContent: string;
    subHeaderTextContent: string;
    footerTextContent: string;
    showBarcode: boolean;
    manualPages: StickerPage[];
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
