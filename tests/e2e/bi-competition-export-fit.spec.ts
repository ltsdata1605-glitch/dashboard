import { expect, test } from '@playwright/test';
import { openReportBi, seedCompetitionData, openCompetitionTable, TEST_SUPERMARKET, pasteIntoTile, TILE, SUMMARY_REALTIME, SUMMARY_LUYKE } from './helpers/seed';

const HEADER = 'SLLK\tTarget\t% HT Target Tháng\t% HT Dự Kiến\tTarget V.Trội\t%HTDK V.Trội';
const program = (name: string, row: string) => [`${name}\t${HEADER}`, `${TEST_SUPERMARKET}\t${row}`, `Tổng\t${row}`];
const NAMES = ['VAS', 'SIM TỔNG', 'MỞ THẺ TÍN DỤNG TPBANK EVO VÀ VPBANK MWG', 'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG', 'OTT MANGO+, ICALLME -', 'BẢO HIỂM THỢ ĐMX', 'BẢO HIỂM TỔNG', 'TRẢ CHẬM HOMECREDIT', 'TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG', 'VAY TIỀN MẶT', 'TAI NGHE', 'SẠC DỰ PHÒNG', 'CAMERA', 'CÁP - SẠC', 'PHỤ KIỆN IT VÀ NHÓM KHÁC', 'ĐỒNG HỒ', 'MÁY GIẶT', 'TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT', 'MÁY LỌC NƯỚC', 'NỒI CƠM - NỒI CHIÊN', 'LAPTOP (TRỪ APPLE)', 'ĐIỆN THOẠI & TABLET ANDROID'];
const BIG_COMPETITION = ['Chương trình thi đua tháng 9', ...NAMES.flatMap((n, i) => program(n, `${1000 + i * 137}\t${800 + i * 111}\t${90 + i}\t${95 + i}\t-\t-`))].join('\n');

const ctRow = (store: string, group: string, tong: number) => ['', 'Sóc Trăng', 'QL', 'ĐML', store, group, 1.2, 0, 7, 3, '', 0, tong, tong];
const CT = { competitionData: NAMES.map((n, i) => ctRow(`910 - ${TEST_SUPERMARKET}`, n, i % 3 === 0 ? 0 : (i + 1) * 317000)).concat(NAMES.map(n => ctRow('649 - ĐML_AGI_CMO - 02 Tỉnh Lộ 942', n, 2849000))), fileName: 'TNB - Du Kien Thuong Thi Dua 2209.xlsx', uploadTime: '2026-09-22T08:00:00.000Z', code1: '910', code2: '', singleViewMode: 'list', lastModified: Date.now() };

/**
 * Xuất ảnh bảng Thi đua siêu thị: cột co vừa nội dung (fitAllColumns) và dải thẻ KPI rộng ĐÚNG
 * bằng bảng (fitWidthToTable, services/uiService.ts). Đo ngay trên bản sao off-screen mà
 * exportElementAsImage dựng trong DOM lúc chụp — cách duy nhất kiểm được bề rộng thật của ảnh.
 */
test('xuất ảnh Thi đua: thẻ KPI rộng bằng bảng, cột vừa nội dung', async ({ page }) => {
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    await page.waitForTimeout(800);
    await pasteIntoTile(page, TILE.DOANH_THU_REALTIME, SUMMARY_REALTIME);
    await pasteIntoTile(page, TILE.DOANH_THU_LUYKE, SUMMARY_LUYKE);
    await pasteIntoTile(page, TILE.THI_DUA_LUYKE, BIG_COMPETITION);
    await page.evaluate(async (payload) => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise<void>((res, rej) => { const tx = db.transaction(['settings'], 'readwrite'); tx.objectStore('settings').put(payload, 'checkthuong_data'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
        db.close();
        window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'checkthuong_data' } }));
    }, CT);
    await openCompetitionTable(page);
    await page.getByText('NHÓM THI ĐUA').waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1200);

    // Bắt bản sao off-screen (left:-9999px) mà uiService dựng ra để đo bề rộng bảng vs dải KPI
    await page.evaluate(() => {
        (window as unknown as { __fit?: unknown }).__fit = null;
        const obs = new MutationObserver(() => {
            document.querySelectorAll<HTMLElement>('div[style*="-9999px"]').forEach(box => {
                const table = box.querySelector('table');
                const kpi = box.querySelector('.competition-kpi-container');
                if (table && kpi) {
                    (window as unknown as { __fit: unknown }).__fit = {
                        table: Math.round(table.getBoundingClientRect().width),
                        kpi: Math.round(kpi.getBoundingClientRect().width),
                        box: Math.round(box.getBoundingClientRect().width),
                    };
                }
            });
        });
        obs.observe(document.body, { childList: true, subtree: true });
    });

    const dl = page.waitForEvent('download', { timeout: 90_000 });
    await page.getByTitle(/Xuất ảnh|Chụp ảnh|Tải ảnh/i).first().click();
    const file = await dl;
    await file.saveAs('test-results/competition-export.png');

    const fit = await page.evaluate(() => (window as unknown as { __fit: { table: number; kpi: number; box: number } | null }).__fit);
    console.log('BỀ RỘNG LÚC CHỤP:', JSON.stringify(fit), '| file:', file.suggestedFilename());
    expect(fit, 'không bắt được bản sao off-screen lúc chụp').not.toBeNull();
    expect(fit!.table).toBeGreaterThan(300);
    // Dải KPI phải bằng bảng (sai số ≤ 2px do làm tròn) — trước khi sửa, KPI rộng theo khung ngoài.
    expect(Math.abs(fit!.kpi - fit!.table), `KPI ${fit!.kpi}px vs bảng ${fit!.table}px`).toBeLessThanOrEqual(2);
    // Khung chụp = bảng + đệm 2 mép của các khối bọc (~36px), không được rộng hơn nhiều hơn thế.
    expect(fit!.box - fit!.table, `khung ${fit!.box}px vs bảng ${fit!.table}px`).toBeLessThanOrEqual(64);
    expect(fit!.box).toBeGreaterThanOrEqual(fit!.table);
});
