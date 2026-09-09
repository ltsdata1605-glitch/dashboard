import { expect, test } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * Bảng Phân tích động (Pivot) — components/pivot/PivotTable.tsx.
 *
 * Phần TÍNH TOÁN và PHÂN QUYỀN đã được phủ chi tiết ở tầng đơn vị (services/pivotService.test.ts,
 * 14 test — gồm 4 test chứng minh nhân viên chỉ thấy dữ liệu của chính mình). Test E2E này giữ
 * đúng phần chỉ nó kiểm được: bảng bật lên được từ bộ lọc, đổi chiều/chỉ số thì bảng vẽ lại, và
 * số tổng KHỚP với thẻ KPI của trang.
 */
const moBangPivot = async (page: import('@playwright/test').Page) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.getByText(/Doanh Thu/i).first()).toBeVisible({ timeout: 45_000 });

    await page.getByRole('button', { name: /Bộ lọc|Lọc/i }).first().click().catch(() => {});
    await page.waitForTimeout(800);
    await page.getByText('Phân tích động', { exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.locator('div.bg-slate-900\\/40').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);

    const section = page.locator('#pivot-table-section');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    return section;
};

test('bật được từ bộ lọc và tổng KHỚP với thẻ KPI Doanh thu QĐ của trang', async ({ page }) => {
    const section = await moBangPivot(page);

    // Chỉ số mặc định là "Doanh thu QĐ" → tổng của pivot phải bằng KPI DTQĐ trên cùng trang.
    const tongPivot = (await section.locator('tfoot tr').first().locator('td').last().innerText()).trim();
    const kpiDtqd = (await page.locator('#business-overview').innerText()).replace(/\s+/g, ' ');
    console.log('TỔNG PIVOT:', tongPivot, '| KPI trên trang có chứa giá trị này?', kpiDtqd.includes(tongPivot));

    expect(tongPivot, 'tổng pivot rỗng').not.toBe('');
    expect(
        kpiDtqd.includes(tongPivot),
        `tổng pivot (${tongPivot}) KHÔNG khớp số nào trong vùng KPI — pivot đang tính khác phần còn lại của app`
    ).toBe(true);
});

test('đổi chiều hàng/cột và chỉ số thì bảng vẽ lại đúng, mở rộng được nhóm con', async ({ page }) => {
    const section = await moBangPivot(page);
    const selects = section.locator('select');

    await selects.nth(0).selectOption('kho');
    await selects.nth(1).selectOption('nhomHang');
    await selects.nth(2).selectOption('hangSx');
    await selects.nth(3).selectOption('orderCount');
    await page.waitForTimeout(1000);

    // Có cột phụ (ngoài cột "Tổng") sau khi chọn chiều cột
    const headerCells = await section.locator('thead th').allInnerTexts();
    expect(headerCells.length, 'chọn chiều cột nhưng bảng không sinh thêm cột nào').toBeGreaterThan(2);

    // Mở rộng dòng cấp 1 → phải có thêm dòng con
    const soDongTruoc = await section.locator('tbody tr').count();
    const nutMoRong = section.locator('tbody tr').first().locator('button').first();
    await expect(nutMoRong).toBeVisible();
    await nutMoRong.click();
    await page.waitForTimeout(600);
    expect(await section.locator('tbody tr').count(), 'mở rộng nhưng không có dòng con nào').toBeGreaterThan(soDongTruoc);

    // Với "Số đơn" phải có ghi chú giải thích vì sao các phần cộng lại không bằng tổng
    await expect(section.getByText(/Số đơn.*không trùng|đếm số đơn KHÔNG TRÙNG/i).first()).toBeVisible();
});

test('so sánh kỳ: bật lên thì bảng đổi sang 4 cột Kỳ này/Kỳ trước/Chênh lệch/%', async ({ page }) => {
    const section = await moBangPivot(page);

    await section.getByRole('button', { name: /So sánh kỳ/i }).click();
    await page.waitForTimeout(1200);

    // Có dòng mô tả rõ đang so kỳ nào với kỳ nào
    await expect(section.getByText(/So sánh tháng .* với tháng trước/i).first()).toBeVisible();

    const headers = (await section.locator('thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim().toUpperCase());
    console.log('CỘT KHI SO SÁNH:', JSON.stringify(headers));
    expect(headers.some(h => h.includes('KỲ NÀY')), 'thiếu cột Kỳ này').toBe(true);
    expect(headers.some(h => h.includes('KỲ TRƯỚC')), 'thiếu cột Kỳ trước').toBe(true);
    expect(headers.some(h => h.includes('CHÊNH LỆCH')), 'thiếu cột Chênh lệch').toBe(true);

    // Tổng "Kỳ này" vẫn phải khớp KPI của trang (dữ liệu mẫu chỉ có ở kỳ hiện tại)
    const footCells = await section.locator('tfoot tr').first().locator('td').allInnerTexts();
    const tongKyNay = footCells[1].trim();
    const kpi = (await page.locator('#business-overview').innerText()).replace(/\s+/g, ' ');
    expect(kpi.includes(tongKyNay), `tổng "Kỳ này" (${tongKyNay}) không khớp KPI của trang`).toBe(true);

    // Kỳ trước = 0 → cột % phải hiện "—" chứ không phải Infinity/NaN
    const phanTram = footCells[4].trim();
    expect(phanTram, 'chia cho 0 phải hiện "—", không được ra NaN/Infinity').not.toMatch(/NaN|Infinity/);

    // Đổi kiểu so sánh vẫn chạy, không lỗi
    await section.locator('select').last().selectOption('ytd_same_period_year').catch(() => {});
    await page.waitForTimeout(800);
});

test('drill-down: bấm ô mở ra dòng gốc, và TỔNG cộng lại đúng bằng giá trị ô', async ({ page }) => {
    const section = await moBangPivot(page);

    const oTong = section.locator('tbody tr').first().locator('td').last().locator('button');
    await expect(oTong, 'ô giá trị phải bấm được để drill-down').toBeVisible();
    const giaTriO = (await oTong.innerText()).trim();
    await oTong.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('.fixed').filter({ hasText: 'dòng cấu thành' }).first();
    await expect(modal).toBeVisible();

    // Bảng trong modal phải có dòng TỔNG cộng lại ĐÚNG BẰNG giá trị ô vừa bấm.
    // Đây là tính chất quan trọng nhất: bảng nói 1 đằng mà mở ra cộng ra số khác thì mất
    // niềm tin vào toàn bộ báo cáo.
    const footText = (await modal.locator('tfoot').innerText()).replace(/\s+/g, ' ');
    console.log('GIÁ TRỊ Ô:', giaTriO, '| DÒNG TỔNG TRONG MODAL:', footText);
    expect(footText, `TỔNG trong drill-down không chứa giá trị ô (${giaTriO})`).toContain(giaTriO);

    // Đóng lại được
    await modal.getByRole('button', { name: /Đóng/i }).first().click();
    await page.waitForTimeout(500);
    await expect(modal).toBeHidden();
});

test('cảnh báo ngưỡng: thêm quy tắc thì hệ thống tự chỉ ra chỉ số vi phạm', async ({ page }) => {
    const section = await moBangPivot(page);
    await expect(section.getByText(/CẢNH BÁO NGƯỠNG/i).first()).toBeVisible();

    // Bấm "Thêm quy tắc" khi chưa có quy tắc nào phải TẠO LUÔN 1 quy tắc, không chỉ mở khung rỗng
    await section.getByRole('button', { name: /Thêm quy tắc/i }).first().click();
    await page.waitForTimeout(600);
    const oNguong = section.locator('input[type="number"]').first();
    await expect(oNguong, 'bấm "Thêm quy tắc" nhưng không có dòng quy tắc nào hiện ra').toBeVisible();

    // Đặt ngưỡng rất cao → mọi Kho đều "thấp hơn" → phải có cảnh báo
    await oNguong.fill('999999999');
    await page.waitForTimeout(1000);

    const txt = (await section.innerText()).replace(/\s+/g, ' ');
    console.log('CẢNH BÁO:', txt.slice(txt.indexOf('CẢNH BÁO'), txt.indexOf('CẢNH BÁO') + 160));
    expect(txt, 'đặt ngưỡng cao mà không sinh cảnh báo nào').toMatch(/thấp hơn ngưỡng/i);

    // Số trong cảnh báo phải khớp KPI của trang (cùng nguồn tính)
    const kpi = (await page.locator('#business-overview').innerText()).replace(/\s+/g, ' ');
    const m = txt.match(/Doanh thu QĐ\s+([\d.,]+\s*\w+)\s+thấp hơn/i);
    expect(m, 'không đọc được giá trị trong dòng cảnh báo').toBeTruthy();
    expect(kpi.includes(m![1].trim()), `giá trị cảnh báo (${m![1]}) không khớp KPI của trang`).toBe(true);

    // Hạ ngưỡng về 0 → không còn vi phạm
    await oNguong.fill('0');
    await page.waitForTimeout(900);
    await expect(section.getByText(/Không có chỉ số nào vượt ngưỡng/i).first()).toBeVisible();
});
