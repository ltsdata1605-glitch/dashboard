import { test, expect } from '@playwright/test';

test.describe('Column Settings Firebase Sync Verification (Silent Real-User)', () => {
    test('Thiết lập hiển thị cột được lưu và phát sự kiện đồng bộ Firebase', async ({ page }) => {
        await page.goto('http://127.0.0.1:5173/');
        await page.waitForLoadState('domcontentloaded');

        const verification = await page.evaluate(async () => {
            const capturedEvents: string[] = [];
            const listener = (e: any) => {
                if (e.detail?.key) {
                    capturedEvents.push(e.detail.key);
                }
            };
            window.addEventListener('ycx-setting-changed', listener);

            // Import db from bi-dashboard utils
            // @ts-ignore
            const { set, get } = await import('/features/bi-dashboard/utils/db.ts');
            // @ts-ignore
            const { isHeavySyncKey, isLightSyncKey } = await import('/utils/localDbScope.ts');
            // @ts-ignore
            const { isBiConfigKey } = await import('/features/bi-dashboard/services/biCloudSyncService.ts');

            // 1. Test Summary table column setting
            const testColsSummary = ['Lượt Khách LK', 'TB 3T', '%TT'];
            await set('hidden-cols-summary-realtime', testColsSummary);
            const savedSummaryCols = await get('hidden-cols-summary-realtime');

            // 2. Test Industry table column setting
            const testColsIndustry = ['% Tỉ trọng', 'Target (QĐ)', 'TB 3T'];
            await set('global-hidden-cols-industry-v2', testColsIndustry);
            const savedIndustryCols = await get('global-hidden-cols-industry-v2');

            // 3. Test Competition table column setting
            const testColsCompetition = ['Realtime', 'Còn Lại'];
            await set('competition-visible-cols-realtime-v6', testColsCompetition);
            const savedCompCols = await get('competition-visible-cols-realtime-v6');

            window.removeEventListener('ycx-setting-changed', listener);

            return {
                savedSummaryCols,
                savedIndustryCols,
                savedCompCols,
                capturedEvents,
                summaryIsHeavy: isHeavySyncKey('bi_hidden-cols-summary-realtime'),
                summaryIsNotLight: !isLightSyncKey('bi_hidden-cols-summary-realtime'),
                summaryIsBiConfig: isBiConfigKey('bi_hidden-cols-summary-realtime'),
                industryIsHeavy: isHeavySyncKey('bi_global-hidden-cols-industry-v2'),
                compIsHeavy: isHeavySyncKey('bi_competition-visible-cols-realtime-v6')
            };
        });

        expect(verification.savedSummaryCols).toEqual(['Lượt Khách LK', 'TB 3T', '%TT']);
        expect(verification.savedIndustryCols).toEqual(['% Tỉ trọng', 'Target (QĐ)', 'TB 3T']);
        expect(verification.savedCompCols).toEqual(['Realtime', 'Còn Lại']);
        expect(verification.capturedEvents).toContain('bi_hidden-cols-summary-realtime');
        expect(verification.capturedEvents).toContain('bi_global-hidden-cols-industry-v2');
        expect(verification.capturedEvents).toContain('bi_competition-visible-cols-realtime-v6');
        expect(verification.summaryIsHeavy).toBe(true);
        expect(verification.summaryIsNotLight).toBe(true);
        expect(verification.summaryIsBiConfig).toBe(true);
        expect(verification.industryIsHeavy).toBe(true);
        expect(verification.compIsHeavy).toBe(true);
    });
});
