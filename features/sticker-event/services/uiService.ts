/**
 * Xuất ảnh của khu vực In Sticker — nay CHỈ chuyển tiếp sang bộ xuất ảnh chung `components/shared/export`
 * (kế hoạch "Hợp nhất xuất ảnh", 2026-10-01). Bản sao ~1.050 dòng cũ là bản gốc ĐỜI CŨ (thiếu các bản vá
 * cột STT / cột thanh tiến độ / tên NV / trần canvas iOS của bản gốc); bản vá riêng duy nhất — mang class
 * `.phanca-root` theo bản sao để giữ màu ô — đã đưa vào bộ chung (mọi class "*-root").
 */
export {
    exportElementAsImage, downloadBlob, shareBlob, canShareFiles, fixOklchColors,
    showExportOverlay, updateExportOverlay, hideExportOverlay,
    type ExportMode, type ExportImageOptions,
} from '../../../components/shared/export';
