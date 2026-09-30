import { test } from '@playwright/test';
import * as fs from 'node:fs';
/** Chụp ảnh trước/sau A13 — chạy tay: A13_OUT=<thư mục> npx playwright test anh-modal-a13 */
const TEN = ['DrillDownModal','PerformanceModal','UnconfiguredGroupsModal','ChangelogModal','EmployeeManagerModal','FileHistoryModal','CustomExploitationTabModal','ColumnConfigModal','HeadToHeadConfigModal','WarehouseSettingsModal','KpiCardConfigModal','phan-ca/GoogleSheetExportModal','phan-ca/HelpModal','phan-ca/AiSuggestPatternModal','phan-ca/EditPatternModal','phan-ca/SuggestionModal','phan-ca/BusyReportModal','phan-ca/ConflictListModal','phan-ca/ImportStaffModal','sticker/SuperAdminModal','sticker/UserManagementModal','sticker/PdfPreviewModal','sticker/FilterModal','sticker/UserGuideModal','sticker/LayoutSelectionModal','sticker/SavedListsModal','bi/BonusDataModal'];
test.use({ viewport: { width: 1366, height: 768 } });
test('chụp modal', async ({ page }) => {
    test.skip(!process.env.A13_OUT, 'chỉ chạy tay');
    test.setTimeout(600_000);
    const out = process.env.A13_OUT!;
    fs.mkdirSync(out, { recursive: true });
    const ketQua: Record<string, { loi: string; rong: number }> = {};
    await page.goto('/');
    await page.waitForTimeout(1500);
    for (const ten of TEN) {
        const loi = await page.evaluate(async (n) => {
            const m = await import('/tests/e2e/helpers/modalSizeHarness.tsx' as string);
            return m.mountModal(n);
        }, ten);
        const hop = page.locator('[role="dialog"]').last();
        const rong = await hop.count() ? Math.round((await hop.boundingBox())?.width || 0) : 0;
        ketQua[ten] = { loi, rong };
        if (rong) await page.screenshot({ path: `${out}/${ten.replace('/', '__')}.png` });
    }
    fs.writeFileSync(`${out}/ket-qua.json`, JSON.stringify(ketQua, null, 1));
    console.log(JSON.stringify(ketQua));
});
