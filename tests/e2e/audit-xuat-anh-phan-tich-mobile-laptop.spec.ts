import { test, expect } from './helpers/realDataContext';
import type { Page } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type ExportMod = typeof import('../../components/shared/export');
const EXPORT_MODULE_PATH = '/components/shared/export/index.ts';

interface TableAuditResult {
    areaName: string;
    mode: 'laptop' | 'mobile';
    imageWidth: number;
    imageHeight: number;
    containerWidth: number;
    tableWidth: number;
    excessWhitespace: number; // containerWidth - tableWidth
    isTooWide: boolean;
    hasOverlappingColumns: boolean;
    overlappingDetails: string[];
    totalRowsChecked: number;
    totalColumnsChecked: number;
    cellOverflowCount: number;
}

// Hàm trợ giúp kiểm tra chồng cột & khoảng thừa của bảng trong bản sao xuất ảnh
async function auditElementExport(
    page: Page,
    elementSelector: string,
    areaName: string,
    mode: 'laptop' | 'mobile',
    exportOptions: Record<string, any> = {}
): Promise<TableAuditResult> {
    const result = await page.evaluate(async ({ selector, name, devMode, opts, modPath }) => {
        const m = (await import(/* @vite-ignore */ modPath)) as ExportMod;
        const target = document.querySelector(selector) as HTMLElement;
        if (!target) {
            throw new Error(`Không tìm thấy phần tử xuất ảnh với selector: ${selector}`);
        }

        let captureInfo = {
            containerWidth: 0,
            containerHeight: 0,
            tableWidth: 0,
            excessWhitespace: 0,
            isTooWide: false,
            hasOverlappingColumns: false,
            overlappingDetails: [] as string[],
            totalRowsChecked: 0,
            totalColumnsChecked: 0,
            cellOverflowCount: 0,
        };

        const mergedOpts = {
            mode: 'blob-only' as const,
            scale: 1,
            isCompactTable: true,
            fitAllColumns: true,
            ...opts,
            onBeforeCapture: (clone: HTMLElement, size: { width: number; height: number }) => {
                captureInfo.containerWidth = size.width;
                captureInfo.containerHeight = size.height;

                const tables = Array.from(clone.querySelectorAll('table')) as HTMLTableElement[];
                if (tables.length > 0) {
                    // Lấy bảng chính / rộng nhất
                    let maxTableWidth = 0;
                    let mainTable = tables[0];
                    for (const tbl of tables) {
                        const w = tbl.getBoundingClientRect().width;
                        if (w > maxTableWidth) {
                            maxTableWidth = w;
                            mainTable = tbl;
                        }
                    }
                    captureInfo.tableWidth = maxTableWidth;
                    captureInfo.excessWhitespace = Math.max(0, size.width - maxTableWidth);
                    // Bảng ôm sát nội dung: khoảng đệm thông thường của card bọc ngoài là px-4 đến px-6 (32px-48px).
                    // Nếu thừa trắng quá 60px (bị kéo giãn 100% màn hình thừa mênh mông) thì mới coi là quá rộng.
                    captureInfo.isTooWide = captureInfo.excessWhitespace > 60;

                    // Kiểm tra chồng cột trên tất cả các bảng trong bản sao
                    for (const tbl of tables) {
                        const rows = Array.from(tbl.querySelectorAll('tr')) as HTMLTableRowElement[];
                        captureInfo.totalRowsChecked += rows.length;

                        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
                            const row = rows[rIdx];
                            const cells = Array.from(row.querySelectorAll<HTMLElement>('th, td'));
                            if (cells.length < 2) continue;

                            captureInfo.totalColumnsChecked = Math.max(captureInfo.totalColumnsChecked, cells.length);

                            for (let cIdx = 0; cIdx < cells.length - 1; cIdx++) {
                                const currentCell = cells[cIdx];
                                const nextCell = cells[cIdx + 1];

                                const rectCurrent = currentCell.getBoundingClientRect();
                                const rectNext = nextCell.getBoundingClientRect();

                                // Nếu cả 2 ô đều hiển thị (width > 0)
                                if (rectCurrent.width > 0 && rectNext.width > 0) {
                                    // Kiểm tra chồng lấn: cột hiện tại lấn sang tọa độ bên trái của cột tiếp theo quá 0.5px
                                    if (rectCurrent.right > rectNext.left + 0.5) {
                                        captureInfo.hasOverlappingColumns = true;
                                        captureInfo.overlappingDetails.push(
                                            `Hàng ${rIdx + 1}, Cột ${cIdx + 1} ("${currentCell.textContent?.trim().slice(0, 15)}") lấn Cột ${cIdx + 2} ("${nextCell.textContent?.trim().slice(0, 15)}"): right=${rectCurrent.right.toFixed(1)}px > nextLeft=${rectNext.left.toFixed(1)}px (đè ${(rectCurrent.right - rectNext.left).toFixed(1)}px)`
                                        );
                                    }
                                }

                                // Kiểm tra cắt chữ / tràn nội dung ô
                                if (currentCell.scrollWidth > currentCell.clientWidth + 1) {
                                    captureInfo.cellOverflowCount++;
                                }
                            }
                        }
                    }
                } else {
                    // Không có bảng (ví dụ cụm thẻ KPI), container width chính là nội dung
                    captureInfo.tableWidth = size.width;
                    captureInfo.excessWhitespace = 0;
                    captureInfo.isTooWide = false;
                }
            }
        };

        const blob = await m.exportElementAsImage(target, `${name}-${devMode}.png`, mergedOpts);
        if (!blob) throw new Error(`Không tạo được blob ảnh cho ${name}`);

        const bmp = await createImageBitmap(blob);
        const arrayBuf = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let binaryStr = '';
        for (let i = 0; i < bytes.length; i++) binaryStr += String.fromCharCode(bytes[i]);
        const base64 = btoa(binaryStr);

        return {
            areaName: name,
            mode: devMode,
            imageWidth: bmp.width,
            imageHeight: bmp.height,
            containerWidth: captureInfo.containerWidth,
            tableWidth: captureInfo.tableWidth,
            excessWhitespace: captureInfo.excessWhitespace,
            isTooWide: captureInfo.isTooWide,
            hasOverlappingColumns: captureInfo.hasOverlappingColumns,
            overlappingDetails: captureInfo.overlappingDetails.slice(0, 5), // Giới hạn 5 lỗi đầu nếu có
            totalRowsChecked: captureInfo.totalRowsChecked,
            totalColumnsChecked: captureInfo.totalColumnsChecked,
            cellOverflowCount: captureInfo.cellOverflowCount,
            pngBase64: base64,
        };
    }, {
        selector: elementSelector,
        name: areaName,
        devMode: mode,
        opts: exportOptions,
        modPath: EXPORT_MODULE_PATH
    });

    // Lưu ảnh kiểm tra vào thư mục test-results để lưu vết
    const outDir = join(process.cwd(), 'test-results', 'audit-export-phan-tich');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `${areaName}-${mode}.png`), Buffer.from(result.pngBase64, 'base64'));

    return {
        areaName: result.areaName,
        mode: result.mode,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        containerWidth: result.containerWidth,
        tableWidth: result.tableWidth,
        excessWhitespace: result.excessWhitespace,
        isTooWide: result.isTooWide,
        hasOverlappingColumns: result.hasOverlappingColumns,
        overlappingDetails: result.overlappingDetails,
        totalRowsChecked: result.totalRowsChecked,
        totalColumnsChecked: result.totalColumnsChecked,
        cellOverflowCount: result.cellOverflowCount,
    };
}

async function prepareApp(page: Page, url: string, viewport: { width: number; height: number }, isMobile: boolean) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await trialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trialBtn.click();
    }
    // Chờ giao diện chính (chọn phần tử hiển thị trên cả mobile và desktop)
    await page.locator('#employee-analysis-section, .kpi-overview-card, [data-modal-overlay], main, #root').first().waitFor({ state: 'attached', timeout: 30_000 });
    await page.waitForTimeout(1000);
}

test.describe('Kiểm thử toàn diện xuất ảnh Chức năng Phân Tích (Laptop & Mobile)', () => {

    const VIEWPORTS = [
        { mode: 'laptop' as const, name: 'LAPTOP (1440x900)', viewport: { width: 1440, height: 900 }, isMobile: false },
        { mode: 'mobile' as const, name: 'IPHONE 13 PRO MAX (428x926)', viewport: { width: 428, height: 926 }, isMobile: true, deviceName: 'iPhone 13 Pro Max' },
    ];

    for (const vp of VIEWPORTS) {
        test.describe(`Chế độ: ${vp.name}`, () => {

            test(`1. Tab "Top" (TopSellerList) - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=analysis', vp.viewport, vp.isMobile);

                // Chờ section phân tích nhân viên
                const section = page.locator('#employee-analysis-section');
                await expect(section).toBeVisible({ timeout: 25_000 });

                // Bấm tab "Top"
                const topTabBtn = section.locator('button').filter({ hasText: /^Top$/i }).first();
                if (await topTabBtn.isVisible()) {
                    await topTabBtn.click();
                    await page.waitForTimeout(500);
                }

                // Kiểm tra xuất ảnh
                const audit = await auditElementExport(page, '#employee-analysis-section', 'phan-tich-tab-top', vp.mode);
                console.log(`[Top - ${vp.mode}]`, audit);

                expect(audit.hasOverlappingColumns, `Tab Top (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                expect(audit.isTooWide, `Tab Top (${vp.mode}): ảnh không được thừa trắng quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
            });

            test(`2. Tab "Hiệu Suất" (PerformanceTable) - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=analysis', vp.viewport, vp.isMobile);

                const section = page.locator('#employee-analysis-section');
                await expect(section).toBeVisible({ timeout: 25_000 });

                // Bấm tab "Hiệu Suất"
                const perfTabBtn = section.locator('button').filter({ hasText: /Hiệu Suất/i }).first();
                await expect(perfTabBtn).toBeVisible({ timeout: 10_000 });
                await perfTabBtn.click();
                await page.waitForTimeout(800);

                const audit = await auditElementExport(
                    page,
                    '#employee-analysis-section',
                    'phan-tich-tab-hieu-suat',
                    vp.mode,
                    { isCompactTable: true, fitAllColumns: true }
                );
                console.log(`[Hiệu Suất - ${vp.mode}]`, audit);

                expect(audit.hasOverlappingColumns, `Tab Hiệu Suất (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                expect(audit.isTooWide, `Tab Hiệu Suất (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
            });

            test(`3. Tab "Khai Thác" - Chi Tiết (IndustryAnalysisTab) - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=analysis', vp.viewport, vp.isMobile);

                const section = page.locator('#employee-analysis-section');
                await expect(section).toBeVisible({ timeout: 25_000 });

                // Bấm tab "Khai Thác"
                const khaiThacTabBtn = section.locator('button').filter({ hasText: /Khai Thác/i }).first();
                await expect(khaiThacTabBtn).toBeVisible({ timeout: 10_000 });
                await khaiThacTabBtn.click();
                await page.waitForTimeout(800);

                // Đảm bảo chế độ Chi Tiết
                const chiTietBtn = section.locator('button').filter({ hasText: /Chi Tiết/i }).first();
                if (await chiTietBtn.isVisible()) {
                    await chiTietBtn.click();
                    await page.waitForTimeout(400);
                }

                const audit = await auditElementExport(
                    page,
                    '#employee-analysis-section',
                    'phan-tich-khai-thac-chi-tiet',
                    vp.mode,
                    { isCompactTable: true, fitAllColumns: true }
                );
                console.log(`[Khai Thác Chi Tiết - ${vp.mode}]`, audit);

                expect(audit.hasOverlappingColumns, `Khai Thác Chi Tiết (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                expect(audit.isTooWide, `Khai Thác Chi Tiết (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
            });

            test(`4. Tab "Khai Thác" - Hiệu Quả - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=analysis', vp.viewport, vp.isMobile);

                const section = page.locator('#employee-analysis-section');
                await expect(section).toBeVisible({ timeout: 25_000 });

                // Bấm tab "Khai Thác"
                const khaiThacTabBtn = section.locator('button').filter({ hasText: /Khai Thác/i }).first();
                await expect(khaiThacTabBtn).toBeVisible({ timeout: 10_000 });
                await khaiThacTabBtn.click();
                await page.waitForTimeout(800);

                // Chuyển sang chế độ Hiệu Quả
                const hieuQuaBtn = section.locator('button').filter({ hasText: /Hiệu Quả/i }).first();
                if (await hieuQuaBtn.isVisible()) {
                    await hieuQuaBtn.click();
                    await page.waitForTimeout(600);
                }

                const audit = await auditElementExport(
                    page,
                    '#employee-analysis-section',
                    'phan-tich-khai-thac-hieu-qua',
                    vp.mode,
                    { isCompactTable: true, fitAllColumns: true }
                );
                console.log(`[Khai Thác Hiệu Quả - ${vp.mode}]`, audit);

                expect(audit.hasOverlappingColumns, `Khai Thác Hiệu Quả (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                expect(audit.isTooWide, `Khai Thác Hiệu Quả (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
            });

            test(`5. Tab "7 Ngày" (HeadToHeadTab) - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=analysis', vp.viewport, vp.isMobile);

                const section = page.locator('#employee-analysis-section');
                await expect(section).toBeVisible({ timeout: 25_000 });

                // Bấm tab "7 Ngày"
                const bayNgayTabBtn = section.locator('button').filter({ hasText: /7 Ngày/i }).first();
                if (await bayNgayTabBtn.isVisible()) {
                    await bayNgayTabBtn.click();
                    await page.waitForTimeout(800);

                    const audit = await auditElementExport(
                        page,
                        '#employee-analysis-section',
                        'phan-tich-tab-7-ngay',
                        vp.mode,
                        { isCompactTable: true, fitAllColumns: true }
                    );
                    console.log(`[7 Ngày - ${vp.mode}]`, audit);

                    expect(audit.hasOverlappingColumns, `Tab 7 Ngày (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                    expect(audit.isTooWide, `Tab 7 Ngày (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
                }
            });

            test(`6. Modal "Phân Tích Hiệu Quả Cá Nhân" (PerformanceModal) - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=analysis', vp.viewport, vp.isMobile);

                const section = page.locator('#employee-analysis-section');
                await expect(section).toBeVisible({ timeout: 25_000 });

                // Mở tab Top hoặc Hiệu Suất để click nhân viên
                const topTabBtn = section.locator('button').filter({ hasText: /^Top$/i }).first();
                if (await topTabBtn.isVisible()) await topTabBtn.click();
                await page.waitForTimeout(500);

                // Tìm 1 hàng nhân viên và click để mở modal
                const employeeRow = section.locator('table tbody tr, .employee-row, [data-employee-name]').first();
                if (await employeeRow.isVisible()) {
                    await employeeRow.click();
                    // Chờ modal xuất hiện
                    const modal = page.locator('[data-modal-overlay], [role="dialog"], .performance-modal').filter({ hasText: /Phân Tích Hiệu Quả Cá Nhân|Chi Tiết/i }).first();
                    if (await modal.isVisible({ timeout: 8000 }).catch(() => false)) {
                        const modalContent = modal.locator('.modal-content, [data-modal-content]').first();
                        const targetSelector = await modalContent.isVisible() ? '[data-modal-content]' : '[role="dialog"]';

                        const audit = await auditElementExport(
                            page,
                            targetSelector,
                            'phan-tich-modal-ca-nhan',
                            vp.mode,
                            { isCompactTable: true }
                        );
                        console.log(`[Modal Cá Nhân - ${vp.mode}]`, audit);

                        expect(audit.hasOverlappingColumns, `Modal Cá Nhân (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                        expect(audit.isTooWide, `Modal Cá Nhân (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);

                        // Đóng modal
                        await page.keyboard.press('Escape');
                    }
                }
            });

            test(`7. Report BI - Phân Tích Nhân Viên: Bảng Doanh Thu - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=employees&view=dashboard&mode=realtime&sub=revenue', vp.viewport, vp.isMobile);

                // Chờ bảng doanh thu nhân viên trong Report BI
                const tableContainer = page.locator('.bi-nhanvien-table, table').first();
                await expect(tableContainer).toBeVisible({ timeout: 25_000 });

                const audit = await auditElementExport(
                    page,
                    'table',
                    'report-bi-nhan-vien-doanh-thu',
                    vp.mode,
                    { isCompactTable: true, fitAllColumns: true }
                );
                console.log(`[Report BI Doanh Thu - ${vp.mode}]`, audit);

                expect(audit.hasOverlappingColumns, `Report BI Doanh Thu (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                expect(audit.isTooWide, `Report BI Doanh Thu (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
            });

            test(`8. Report BI - Phân Tích Nhân Viên: Bảng Thưởng - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=employees&view=dashboard&mode=realtime&sub=bonus', vp.viewport, vp.isMobile);

                const tableContainer = page.locator('table').first();
                if (await tableContainer.isVisible({ timeout: 15_000 }).catch(() => false)) {
                    const audit = await auditElementExport(
                        page,
                        'table',
                        'report-bi-nhan-vien-thuong',
                        vp.mode,
                        { isCompactTable: true, fitAllColumns: true }
                    );
                    console.log(`[Report BI Thưởng - ${vp.mode}]`, audit);

                    expect(audit.hasOverlappingColumns, `Report BI Thưởng (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                    expect(audit.isTooWide, `Report BI Thưởng (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
                }
            });

            test(`9. Report BI - Phân Tích Nhân Viên: Bảng Trả Chậm - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=employees&view=dashboard&mode=realtime&sub=installment', vp.viewport, vp.isMobile);

                const tableContainer = page.locator('table').first();
                if (await tableContainer.isVisible({ timeout: 15_000 }).catch(() => false)) {
                    const audit = await auditElementExport(
                        page,
                        'table',
                        'report-bi-nhan-vien-tra-cham',
                        vp.mode,
                        { isCompactTable: true, fitAllColumns: true }
                    );
                    console.log(`[Report BI Trả Chậm - ${vp.mode}]`, audit);

                    expect(audit.hasOverlappingColumns, `Report BI Trả Chậm (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                    expect(audit.isTooWide, `Report BI Trả Chậm (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
                }
            });

            test(`10. Report BI - Phân Tích Nhân Viên: Bảng Thi Đua - ${vp.mode}`, async ({ page }) => {
                await prepareApp(page, '/?tab=employees&view=dashboard&mode=realtime&sub=competition', vp.viewport, vp.isMobile);

                const tableContainer = page.locator('table').first();
                if (await tableContainer.isVisible({ timeout: 15_000 }).catch(() => false)) {
                    const audit = await auditElementExport(
                        page,
                        'table',
                        'report-bi-nhan-vien-thi-dua',
                        vp.mode,
                        { isCompactTable: true, fitAllColumns: true }
                    );
                    console.log(`[Report BI Thi Đua - ${vp.mode}]`, audit);

                    expect(audit.hasOverlappingColumns, `Report BI Thi Đua (${vp.mode}): không được có cột chồng lên nhau`).toBe(false);
                    expect(audit.isTooWide, `Report BI Thi Đua (${vp.mode}): ảnh không được quá rộng (thừa: ${audit.excessWhitespace}px)`).toBe(false);
                }
            });

        });
    }
});
