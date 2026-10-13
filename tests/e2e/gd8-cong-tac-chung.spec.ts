import { expect, test } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';
/**
 * GĐ8 (2026-10-13): 17 công tắc tự vẽ → `Switch` dùng chung. Hai cách gắn cần khoá hành vi:
 *  1. Công tắc NẰM TRONG <label> (popover "Hiển thị màn hình thi đua"): bấm vào chữ hay bấm thẳng công tắc đều đổi ĐÚNG MỘT lần
 *     (Switch chặn nổi bọt nên label không bấm lặp).
 *  2. Công tắc CHỈ ĐỂ NHÌN trong hàng bấm được (popover "Tùy chọn hiển thị cột"): bấm hàng → công tắc phản ánh trạng thái mới.
 */
test.use({ viewport: { width: 1366, height: 900 } });
test('công tắc dùng chung trong 2 popover Phân tích', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?tab=analysis');
  await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
  await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
  await page.getByText('Tệp Realtime (Xem nhanh)').last().click();
  await expect(page.getByText(/chi tiết theo kho/i).first()).toBeVisible({ timeout: 90_000 });

  // 1) Phân tích nhân viên › bánh răng → "Hiển thị màn hình thi đua": công tắc nằm trong <label>
  const tieuDeNV = page.getByText('Phân tích nhân viên', { exact: true }).first();
  await tieuDeNV.scrollIntoViewIfNeeded();
  await tieuDeNV.locator('xpath=ancestor::*[.//button[@title="Tùy chọn hiển thị"]][1]').getByTitle('Tùy chọn hiển thị').first().click();
  const pop = page.getByText('Hiển thị màn hình thi đua').locator('..');
  const sw = pop.getByRole('switch').first();
  await expect(sw).toBeVisible();
  const truoc = await sw.getAttribute('aria-checked');
  const ten = (await sw.getAttribute('aria-label'))!;
  await pop.locator('label').filter({ hasText: ten }).locator('span').first().click(); // bấm CHỮ
  await expect(sw).toHaveAttribute('aria-checked', truoc === 'true' ? 'false' : 'true');
  await sw.click(); // bấm thẳng công tắc
  await expect(sw).toHaveAttribute('aria-checked', truoc!);
  await page.keyboard.press('Escape');

  // 2) Chi tiết ngành hàng › bánh răng → "Tùy chọn hiển thị cột": cả hàng là nút, công tắc chỉ để nhìn
  const gear2 = page.locator('[title="Tùy chọn hiển thị cột"]').first();
  await gear2.scrollIntoViewIfNeeded();
  await gear2.click();
  await expect(page.getByText('Tùy chọn hiển thị cột')).toBeVisible();
  const popCot = page.getByText('Tùy chọn hiển thị cột').locator('..').locator('..');
  const hang = popCot.getByRole('button', { name: /TrB SL/ }).first();
  const swCot = hang.locator('[role="switch"]');
  const t2 = await swCot.getAttribute('aria-checked');
  await hang.click();
  await expect(swCot).toHaveAttribute('aria-checked', t2 === 'true' ? 'false' : 'true');
  await page.screenshot({ path: test.info().outputPath('cong-tac-chung.png') });
});
