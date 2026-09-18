import type { Page } from '@playwright/test';

/** Siêu thị dùng trong dữ liệu giả — phải bắt đầu bằng "ĐM" và chứa " - " để parser nhận diện. */
export const TEST_SUPERMARKET = 'ĐML_STR_STR - 99 Hùng Vương';

export const SUMMARY_REALTIME = [
    'Tên miền\tDTLK\tDTQĐ\tTarget (QĐ)\t% HT Target (QĐ)',
    `${TEST_SUPERMARKET}\t1200\t1400\t2000\t70`,
].join('\n');

export const SUMMARY_LUYKE = [
    'Tên miền\tDT Hôm Qua\tDTLK\tDT Dự Kiến\tDTQĐ',
    `${TEST_SUPERMARKET}\t150\t1200\t2400\t1400`,
].join('\n');

/**
 * Thi đua Luỹ kế. Cố ý để nguồn CÓ SẴN 2 cột "Target V.Trội"/"%HTDK V.Trội" nhưng bỏ trống ("-")
 * — đúng tình huống thật đã làm 2 cột đó luôn rỗng trước khi sửa `useDashboardLogic`.
 * Dòng đầu chứa "chương trình thi đua" để qua validate của DataUpdater (parser tự bỏ qua dòng này).
 */
const COMPETITION_HEADER = 'SLLK\tTarget\t% HT Target Tháng\t% HT Dự Kiến\tTarget V.Trội\t%HTDK V.Trội';
const COMPETITION_HEADER_DT = 'DTLK\tTarget\t% HT Target Tháng\t% HT Dự Kiến\tTarget V.Trội\t%HTDK V.Trội';

/** Mỗi khối chương trình phải kết thúc bằng 1 dòng "đệm" (ở đây là dòng `Tổng` như báo cáo thật):
 *  parser coi "dòng đứng ngay TRƯỚC một dòng header" là tên chương trình, nên nếu dòng dữ liệu
 *  siêu thị nằm sát header của chương trình kế tiếp thì nó bị nuốt mất. */
const program = (name: string, header: string, row: string) => [
    `${name}\t${header}`,
    `${TEST_SUPERMARKET}\t${row}`,
    `Tổng\t${row}`,
];

export const COMPETITION_LUYKE = [
    'Chương trình thi đua tháng 9',
    ...program('VAS', COMPETITION_HEADER, '224\t39\t574\t574\t-\t-'),
    ...program('SIM TỔNG', COMPETITION_HEADER, '56\t22\t252\t252\t-\t-'),
    ...program('NẠP/RÚT NH', COMPETITION_HEADER, '97\t540\t18\t18\t-\t-'),
    ...program('TC HOMECREDIT', COMPETITION_HEADER_DT, '1511\t1041\t145\t145\t-\t-'),
    ...program('LAPTOP (TRỪ APPLE)', COMPETITION_HEADER_DT, '656\t377\t174\t174\t-\t-'),
].join('\n');

/** Vào app ở Chế độ Dùng Thử (không cần đăng nhập Google) rồi mở Report BI.
 *  Sidebar mặc định thu gọn (chữ bị `display:none`), phải hover cho nó bung ra mới click theo tên
 *  được — click theo thứ tự icon rất dễ vỡ khi menu đổi. */
export async function openReportBi(page: Page) {
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();

    // Sidebar thu gọn: nhãn chữ bị ẩn (`display:none`) nên không tìm theo tên được, và hover cũng
    // không bung ra trong môi trường test. Nhận diện bằng icon lucide của từng mục — ổn định hơn
    // click theo thứ tự index vì không vỡ khi menu đổi thứ tự.
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 20_000 });
    await sidebar.locator('button:has(svg.lucide-users)').first().click();

    await page.getByRole('button', { name: /Cập nhật/i }).first().waitFor({ state: 'visible', timeout: 20_000 });
}

/** Thứ tự 4 ô dán ở màn "Cập nhật" — xem `pasteIntoTile()` để biết vì sao dùng chỉ số. */
export const TILE = {
    DOANH_THU_REALTIME: 0,
    DOANH_THU_LUYKE: 1,
    THI_DUA_REALTIME: 2,
    THI_DUA_LUYKE: 3,
} as const;

/**
 * Dán dữ liệu vào ô thứ `tileIndex` của màn "Cập nhật". Ô chỉ lắng nghe sự kiện `paste` thật (đọc
 * clipboardData), nên `fill()` không có tác dụng — phải dispatch ClipboardEvent.
 *
 * SỬA 2026-09-18 — hàm này TRƯỚC ĐÂY nhận (groupLabel, tileTitle) và tìm nhóm bằng
 * `//h3[contains(., "Báo cáo Tổng hợp")]`. Giao diện đã đổi: giờ chỉ có MỘT `<h2>` "DOANH THU &
 * THI ĐUA CỤM" chứa 4 ô `<h4>`. Selector cũ không khớp gì cả nên hàm **dán vào hư không mà KHÔNG
 * báo lỗi** — `bi-competition.spec.ts` (4 test) và `xss-header-sanitization.spec.ts` cùng hỏng
 * theo, mỗi test treo 1 phút rồi timeout. Dùng chỉ số ô là cách bền nhất với bố cục hiện tại.
 */
export async function pasteIntoTile(page: Page, tileIndex: number, text: string) {
    await page.locator('h4').nth(tileIndex).click();
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 10_000 });
    await textarea.evaluate((el, value) => {
        const dt = new DataTransfer();
        dt.setData('text', value);
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, text);
    await page.waitForTimeout(600);
}

/** Nạp đủ dữ liệu để bảng Thi đua có nội dung. Gọi SAU `openReportBi()`. */
export async function seedCompetitionData(page: Page, competitionLuyKe: string = COMPETITION_LUYKE) {
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    await page.waitForTimeout(800);
    await pasteIntoTile(page, TILE.DOANH_THU_REALTIME, SUMMARY_REALTIME);
    await pasteIntoTile(page, TILE.DOANH_THU_LUYKE, SUMMARY_LUYKE);
    await pasteIntoTile(page, TILE.THI_DUA_LUYKE, competitionLuyKe);
}

/**
 * Mở bảng Thi đua Luỹ kế của siêu thị trong dữ liệu giả.
 *
 * SỬA 2026-09-18 — đường điều hướng cũ (`Tổng quan` → `Thi đua` → `Luỹ kế`) không còn đúng:
 * thanh trên cùng giờ là "Siêu thị | Nhân viên | Cập nhật", bảng Thi đua nằm trong "Siêu thị".
 *
 * ⚠️ Nút chế độ là NÚT GẠT, không phải menu: bấm 1 lần là chuyển Realtime → Luỹ kế. Bấm thêm vào
 * chữ "Luỹ kế" sẽ gạt NGƯỢC về Realtime — đúng cái bẫy đã làm mất thời gian dò lỗi.
 */
export async function openCompetitionTable(page: Page) {
    await page.getByRole('button', { name: /Siêu thị/i }).first().click();
    await page.waitForTimeout(1500);
    await page.getByText('Thi đua', { exact: true }).first().click();
    await page.waitForTimeout(1500);

    // Chọn siêu thị cụ thể — dữ liệu thi đua giả không có ở mức "Tổng"/CỤM.
    const picker = page.getByText('CỤM', { exact: true }).first();
    if (await picker.isVisible().catch(() => false)) {
        await picker.click();
        await page.waitForTimeout(600);
        await page.getByText(/Hùng Vương/).first().click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
    }

    await page.getByRole('button', { name: /Realtime/i }).first().click();
    await page.getByText('NHÓM THI ĐUA').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(800);
}
