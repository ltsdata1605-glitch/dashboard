import { exportElementAsImage as xuatAnhChung, type ExportImageOptions } from '../../../../components/shared/export';

/**
 * Xuất ảnh Report BI = bộ xuất ảnh CHUNG với bộ quy tắc trình bày 'bi' (components/shared/export/presetBi.ts).
 * Kế hoạch "Hợp nhất xuất ảnh" 2026-10-01: bản ~1.570 dòng cũ đã chuyển vào thư mục chung.
 */
export function exportElementAsImage(element: HTMLElement, filename: string, options: ExportImageOptions = {}): Promise<Blob | null> {
    return xuatAnhChung(element, filename, { preset: 'bi', ...options });
}
export type { ExportImageOptions };
