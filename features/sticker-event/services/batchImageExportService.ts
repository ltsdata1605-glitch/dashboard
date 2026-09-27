import { Product } from '../types';
import { exportElementAsImage, downloadBlob, showExportOverlay, updateExportOverlay, hideExportOverlay } from './uiService';
import { formatCurrency, calculateDiscountPercent } from '../utils/format';

export interface BatchExportOptions {
    chunkSize?: number;
    storeId?: string;
    onProgress?: (current: number, total: number, start: number, end: number) => void;
}

const parsePriceNum = (priceStr: string | undefined): number => {
    if (!priceStr) return 0;
    return parseInt(String(priceStr).replace(/[^\d]/g, ''), 10) || 0;
};

/**
 * Tạo container DOM hoàn chỉnh cho 1 đợt 50 sản phẩm để chụp ảnh chất lượng cao
 */
export function createBatchExportElement(
    products: Product[],
    batchIndex: number,
    totalBatches: number,
    startIndex: number,
    endIndex: number,
    totalCount: number,
    storeId?: string
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'batch-export-container';
    container.style.cssText = `
        width: 960px;
        background-color: #ffffff;
        padding: 24px;
        border-radius: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        box-sizing: border-box;
    `;

    // 1. Header
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 16px;
        margin-bottom: 16px;
        border-bottom: 2px solid #e2e8f0;
    `;
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #2563eb); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
                IN
            </div>
            <div>
                <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; text-transform: uppercase; letter-spacing: -0.01em;">
                    Danh Sách Sản Phẩm In Sticker
                </h1>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12px; color: #64748b; font-weight: 500;">
                    ${storeId ? `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 700; color: #334155;">Kho/ST: ${storeId}</span>` : ''}
                    <span>Xuất lúc: ${timeStr} ${dateStr}</span>
                </div>
            </div>
        </div>
        <div style="text-align: right;">
            <div style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 800; border: 1px solid #bae6fd;">
                Phần ${batchIndex + 1} / ${totalBatches}
            </div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 4px;">
                Dòng ${startIndex} - ${endIndex} (${products.length} / ${totalCount} SP)
            </div>
        </div>
    `;
    container.appendChild(header);

    // 2. Product List (tối đa 50 items)
    const list = document.createElement('div');
    list.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    products.forEach((product, idx) => {
        const itemNumber = startIndex + idx;
        const giaGocNum = parsePriceNum(product.giaGoc);
        const giaGiamNum = parsePriceNum(product.giaGiam);
        const discountPercent = calculateDiscountPercent(giaGocNum, giaGiamNum);

        const card = document.createElement('div');
        card.style.cssText = `
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            box-sizing: border-box;
        `;

        // Left info: STT + MSP + Tên + KM + Tồn kho
        const leftHtml = `
            <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0;">
                <div style="width: 26px; height: 26px; border-radius: 8px; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px;">
                    ${itemNumber}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 800; color: #0369a1; background: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">
                            ${product.msp}
                        </span>
                        ${(product.tonKho !== undefined && product.tonKho !== null && product.tonKho !== '') ? `
                            <span style="font-size: 11px; font-weight: 700; color: #047857; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
                                Tồn: ${product.tonKho}
                            </span>
                        ` : ''}
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 3px; line-height: 1.35; word-break: break-word;">
                        ${product.sanPham}
                    </div>
                    ${product.khuyenMai && product.khuyenMai.trim() ? `
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px; color: #b45309; background: #fffbeb; padding: 2px 8px; border-radius: 4px; border: 1px solid #fef3c7;">
                            <span style="font-weight: 800; background: #fde68a; padding: 1px 4px; border-radius: 3px; font-size: 10px;">KM</span>
                            <span>${product.khuyenMai}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Right info: Giá + Thưởng
        const rightHtml = `
            <div style="display: flex; align-items: center; gap: 14px; text-align: right; flex-shrink: 0;">
                <div>
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                        <span style="font-size: 15px; font-weight: 900; color: #e11d48; letter-spacing: -0.01em;">
                            ${product.giaGiam || (giaGiamNum > 0 ? formatCurrency(giaGiamNum) : '')}
                        </span>
                        ${discountPercent > 0 ? `
                            <span style="font-size: 10px; font-weight: 900; color: #ffffff; background: #f43f5e; padding: 2px 5px; border-radius: 4px;">
                                -${discountPercent}%
                            </span>
                        ` : ''}
                    </div>
                    ${product.giaGoc ? `
                        <div style="font-size: 11px; color: #94a3b8; text-decoration: line-through; margin-top: 1px;">
                            ${product.giaGoc}
                        </div>
                    ` : ''}
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px 10px; min-width: 110px;">
                    <div style="font-size: 12px; font-weight: 800; color: #0284c7;">
                        ${formatCurrency(product.tongThuong)}
                    </div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px; white-space: nowrap;">
                        <span style="color: #059669; font-weight: 600;">ERP: ${formatCurrency(product.thuongERP)}</span> | 
                        <span style="color: #e11d48; font-weight: 600;">Nóng: ${formatCurrency(product.thuongNong)}</span>
                    </div>
                </div>
            </div>
        `;

        card.innerHTML = leftHtml + rightHtml;
        list.appendChild(card);
    });

    container.appendChild(list);

    // 3. Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
    `;
    footer.innerHTML = `
        <span>Hệ thống Quản lý Bán lẻ & In Sticker — dashboard.pro.vn</span>
        <span style="font-family: ui-monospace, SFMono-Regular, monospace;">Trang ${batchIndex + 1}/${totalBatches} • Đợt 50 sản phẩm</span>
    `;
    container.appendChild(footer);

    return container;
}

/**
 * Chia danh sách thành các đợt (chunk) mỗi đợt 50 dòng kèm metadata tên file và số thứ tự
 */
export function getBatchChunks<T>(items: T[], chunkSize = 50, dateStr?: string): {
    chunk: T[];
    batchIndex: number;
    totalBatches: number;
    startIndex: number;
    endIndex: number;
    filename: string;
}[] {
    if (!items || items.length === 0) return [];
    const totalCount = items.length;
    const totalBatches = Math.ceil(totalCount / chunkSize);
    const dateSlug = dateStr || new Date().toISOString().slice(0, 10);
    const result = [];

    for (let i = 0; i < totalBatches; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalCount);
        const batchNum = i + 1;
        result.push({
            chunk: items.slice(start, end),
            batchIndex: i,
            totalBatches,
            startIndex: start + 1,
            endIndex: end,
            filename: `Danh Sach San Pham - Phan ${batchNum}-${totalBatches} (Dong ${start + 1}-${end}) - ${dateSlug}.png`
        });
    }

    return result;
}

/**
 * Xuất danh sách sản phẩm lần lượt thành các file ảnh PNG (mỗi ảnh đúng 50 dòng)
 */
export async function exportProductsInBatches(
    products: Product[],
    options: BatchExportOptions = {}
): Promise<{ success: boolean; exportedCount: number; batchCount: number }> {
    if (!products || products.length === 0) {
        throw new Error('Không có sản phẩm nào để xuất ảnh.');
    }

    const CHUNK_SIZE = options.chunkSize || 50;
    const batches = getBatchChunks(products, CHUNK_SIZE);
    const totalCount = products.length;
    const totalBatches = batches.length;

    showExportOverlay(
        `Đang chuẩn bị xuất ${totalBatches} ảnh...`,
        `Tổng cộng ${totalCount} sản phẩm (mỗi ảnh ${CHUNK_SIZE} dòng)`
    );

    try {
        for (const batch of batches) {
            const batchNum = batch.batchIndex + 1;

            updateExportOverlay(
                `Đang xuất ảnh ${batchNum}/${totalBatches}...`,
                `Đang xử lý dòng ${batch.startIndex} - ${batch.endIndex} (${batch.chunk.length} sản phẩm)`
            );

            if (options.onProgress) {
                options.onProgress(batchNum, totalBatches, batch.startIndex, batch.endIndex);
            }

            // Dựng DOM container
            const container = createBatchExportElement(
                batch.chunk,
                batch.batchIndex,
                totalBatches,
                batch.startIndex,
                batch.endIndex,
                totalCount,
                options.storeId
            );

            // Gắn vào DOM tạm thời ngoài màn hình
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.zIndex = '-9999';
            document.body.appendChild(container);

            // Chờ ổn định layout và phông chữ
            await new Promise(r => setTimeout(r, 120));

            // Chụp xuất ảnh
            const blob = await exportElementAsImage(container, batch.filename, {
                scale: 2,
                captureAsDisplayed: true,
                mode: 'blob-only',
                forcedWidth: 960,
            });

            // Gỡ khỏi DOM ngay sau khi chụp
            container.remove();

            if (blob) {
                downloadBlob(blob, batch.filename, true);
            }

            // Khoảng nghỉ nhỏ giữa các lượt để trình duyệt tải file mượt mà
            if (batch.batchIndex < totalBatches - 1) {
                await new Promise(r => setTimeout(r, 450));
            }
        }

        hideExportOverlay();
        return {
            success: true,
            exportedCount: totalCount,
            batchCount: totalBatches,
        };
    } catch (err) {
        hideExportOverlay();
        throw err;
    }
}
