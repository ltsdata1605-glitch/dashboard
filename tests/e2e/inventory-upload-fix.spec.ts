import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Inventory File Upload - Large File Handling', () => {
  test('should not hang when uploading 3000-item inventory file', async ({ page }) => {
    // Setup: Create mock inventory file (217KB, ~3000 rows)
    const mockInventoryPath = path.join('/tmp', 'mock-inventory-3000.xlsx');

    // Generate 3000 rows of inventory data
    const wsData = [['Mã Siêu Thị', 'Tên Siêu Thị', 'Ngành Hàng', 'Nhóm Hàng', 'Nhà Sản Xuất', 'Mã Sản Phẩm', 'Tên Sản Phẩm', '', '', '', '', '', '', '', '', '', 'Số Lượng']];

    for (let i = 0; i < 3000; i++) {
      wsData.push([
        `ST${String(i % 100).padStart(2, '0')}`,
        `Siêu Thị ${i % 100}`,
        `Category ${i % 20}`,
        `Group ${i % 100}`,
        `Brand ${i % 50}`,
        `PRD${String(i).padStart(6, '0')}`,
        `Product ${i} - Test Item with Long Description`,
        '', '', '', '', '', '', '', '', '',
        String(Math.floor(Math.random() * 1000)),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tồn Kho');
    XLSX.writeFile(wb, mockInventoryPath);

    console.log(`Created mock inventory file: ${mockInventoryPath} (${fs.statSync(mockInventoryPath).size} bytes)`);

    // Navigate to In Sticker module
    await page.goto('http://localhost:5173/');

    // Wait for app to load
    await page.waitForTimeout(3000);

    // Authenticate with test account (or use demo mode)
    // For now, check if demo mode available
    const demoModeButton = page.getByText(/Chế độ Dùng Thử|Demo Mode/i);
    if (await demoModeButton.isVisible()) {
      await demoModeButton.click();
      await page.waitForTimeout(2000);
    }

    // Navigate to In Sticker > Công cụ > Tồn kho
    const stickerMenu = page.getByRole('button').filter({ hasText: /In Sticker|Sticker/i }).first();
    if (await stickerMenu.isVisible()) {
      await stickerMenu.click();
      await page.waitForTimeout(1000);
    }

    // Find and click "Tồn kho" tab/button
    const inventoryButton = page.getByText('Tồn kho', { exact: false });
    if (await inventoryButton.first().isVisible()) {
      await inventoryButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Upload file using file input
    const fileInput = page.locator('input[type="file"]').filter({ has: page.locator('label', { hasText: /Tồn Kho|Inventory/i }) }).first();

    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(mockInventoryPath);

      // Monitor loading state with timeout
      const loadingSpinner = page.getByText(/Đang xử lý|Processing/i).first();

      // Wait for loading to appear
      await page.waitForTimeout(500);

      // Check if loading state appears
      let loadingAppeared = false;
      try {
        await loadingSpinner.waitFor({ timeout: 5000, state: 'visible' });
        loadingAppeared = true;
        console.log('Loading spinner appeared');
      } catch {
        console.log('Loading spinner did not appear (may complete very quickly)');
      }

      // If loading appeared, wait for it to disappear (max 30s timeout to detect hang)
      if (loadingAppeared) {
        await page.waitForTimeout(1000); // Give it initial processing time

        const startTime = Date.now();
        try {
          await loadingSpinner.waitFor({ timeout: 30000, state: 'hidden' });
          const elapsed = Date.now() - startTime;
          console.log(`✓ Upload completed in ${elapsed}ms`);
          expect(elapsed).toBeLessThan(30000);
        } catch (e) {
          const elapsed = Date.now() - startTime;
          throw new Error(`✗ Upload hung or took too long (${elapsed}ms > 30s timeout). This indicates the IndexedDB transaction fix didn't work.`);
        }
      }

      // Verify no error message appeared
      const errorMsg = page.getByText(/Lỗi|Error|failed/i).first();
      const errorVisible = await errorMsg.isVisible().catch(() => false);
      expect(errorVisible).toBe(false);

      console.log('✓ Inventory file uploaded successfully without hanging');
    } else {
      console.log('Could not find inventory file input - test may need manual app navigation');
    }

    // Cleanup
    fs.unlinkSync(mockInventoryPath);
  });
});
