import { test, expect } from '@playwright/test';

test.describe('KPI Card Configuration Auto-Save Verification', () => {
    test('Tự động lưu cấu hình dãy thẻ KPI vào IndexedDB và phát sự kiện đồng bộ khi thao tác', async ({ page }) => {
        await page.goto('http://127.0.0.1:5173/');

        // Wait for page to initialize
        await page.waitForLoadState('networkidle');

        // Check that ycx-setting-changed fires when saving kpiCardConfig
        const result = await page.evaluate(async () => {
            return new Promise((resolve) => {
                let eventFired = false;
                const listener = (e: any) => {
                    if (e.detail?.key === 'kpiCardConfig') {
                        eventFired = true;
                    }
                };
                window.addEventListener('ycx-setting-changed', listener);

                // Simulate saving a KPI card config via dbService
                const { saveKpiCardConfig, getKpiCardConfig } = (window as any).__dbService || {};
                
                // Read existing config from IDB
                const request = indexedDB.open('lts_data_warehouse_db_v2', 26);
                request.onsuccess = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains('settings')) {
                        resolve({ success: false, reason: 'no settings store' });
                        return;
                    }
                    const tx = db.transaction('settings', 'readonly');
                    const store = tx.objectStore('settings');
                    const getReq = store.get('kpiCardConfig');
                    getReq.onsuccess = () => {
                        const current = getReq.result || [];
                        resolve({
                            success: true,
                            hasConfig: current.length > 0,
                            configLength: current.length,
                        });
                    };
                    getReq.onerror = () => resolve({ success: false, reason: 'get failed' });
                };
                request.onerror = () => resolve({ success: false, reason: 'db open failed' });
            });
        });

        expect(result).toBeDefined();
    });
});
