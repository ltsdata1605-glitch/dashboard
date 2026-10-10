/**
 * Xuất ảnh của khu vực gốc (Phân tích, Thuế…) — nay CHỈ chuyển tiếp sang bộ xuất ảnh chung
 * `components/shared/export` (kế hoạch "Hợp nhất xuất ảnh", 2026-10-01). Bản sao ~1.400 dòng cũ đã
 * chuyển nguyên logic sang captureEngine.ts. Giữ file này để ~20 nơi gọi không phải đổi đường import.
 */
export {
    exportElementAsImage, downloadBlob, shareBlob, canShareFiles, copyBlobToClipboard, fixOklchColors,
    showExportOverlay, updateExportOverlay, hideExportOverlay,
    type ExportMode, type ExportImageOptions,
} from '../components/shared/export';
