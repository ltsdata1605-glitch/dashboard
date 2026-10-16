import { test, expect } from '@playwright/test';

test.describe('KPI Export Border Radius Verification', () => {
    test('Xác thực vạch màu đỉnh thẻ Industry KPI được bo góc cong 14.5px theo góc thẻ 16px khi xuất ảnh', async ({ page }) => {
        await page.goto('http://127.0.0.1:5173/tests/e2e/helpers/empty.html').catch(async () => {
            await page.goto('http://127.0.0.1:5173/');
        });

        const result = await page.evaluate(async () => {
            // @ts-ignore
            const { exportBiCore } = await import('/components/shared/export/presetBi.ts');

            const testContainer = document.createElement('div');
            testContainer.className = 'js-industry-view-container';
            testContainer.style.width = '800px';
            testContainer.style.padding = '16px';
            testContainer.style.background = '#ffffff';

            const card = document.createElement('div');
            card.className = 'industry-kpi-card preserve-rounded min-w-0 group relative bg-white border border-slate-200/90 rounded-2xl overflow-hidden';
            card.dataset.kpiBorder = '#7dd3fc';
            card.dataset.kpiTopBorder = '#0284c7';
            card.dataset.kpiTopColor = 'sky';

            const topBar = document.createElement('div');
            topBar.className = 'kpi-top-accent h-[3px] w-full shrink-0 rounded-t-[14.5px] bg-sky-500';
            card.appendChild(topBar);

            const content = document.createElement('div');
            content.className = 'p-2 flex flex-col justify-between';
            content.innerHTML = `
                <div class="industry-kpi-title">LAPTOP</div>
                <div class="industry-kpi-num">45</div>
                <div class="industry-kpi-label">SL</div>
                <div class="industry-kpi-sublabel">QĐ</div>
                <div class="industry-kpi-subnum">1.118 Tr</div>
            `;
            card.appendChild(content);
            testContainer.appendChild(card);
            document.body.appendChild(testContainer);

            let cloneTopLeftRadius = '';
            let cloneTopRightRadius = '';
            let cloneOverflow = '';
            let cloneCardRadius = '';
            let cloneTopBarMarginLeft = '';
            let cloneTopBarWidth = '';

            await exportBiCore(testContainer, 'test-export.png', {
                mode: 'blob-only',
                captureAsDisplayed: true,
                onBeforeCapture: (clone: HTMLElement) => {
                    const clonedCard = clone.querySelector('.industry-kpi-card') as HTMLElement;
                    const clonedTopBar = clone.querySelector('.kpi-top-accent') as HTMLElement;
                    if (clonedCard && clonedTopBar) {
                        cloneCardRadius = clonedCard.style.borderRadius;
                        cloneOverflow = clonedCard.style.overflow;
                        cloneTopLeftRadius = clonedTopBar.style.borderTopLeftRadius;
                        cloneTopRightRadius = clonedTopBar.style.borderTopRightRadius;
                        cloneTopBarMarginLeft = clonedTopBar.style.marginLeft;
                        cloneTopBarWidth = clonedTopBar.style.width;
                    }
                }
            }, () => {});

            document.body.removeChild(testContainer);

            return {
                cloneCardRadius,
                cloneOverflow,
                cloneTopLeftRadius,
                cloneTopRightRadius,
                cloneTopBarMarginLeft,
                cloneTopBarWidth
            };
        });

        expect(result.cloneCardRadius).toBe('16px');
        expect(result.cloneOverflow).toBe('hidden');
        expect(result.cloneTopLeftRadius).toBe('14.5px');
        expect(result.cloneTopRightRadius).toBe('14.5px');
        expect(result.cloneTopBarMarginLeft).toBe('0px');
        expect(result.cloneTopBarWidth).toBe('100%');
    });

    test('Xác thực thẻ Tổng quan KpiCard (.kpi-overview-card) giữ bo tròn 16px và vạch đỉnh cong khi xuất', async ({ page }) => {
        await page.goto('http://127.0.0.1:5173/tests/e2e/helpers/empty.html').catch(async () => {
            await page.goto('http://127.0.0.1:5173/');
        });

        const result = await page.evaluate(async () => {
            // @ts-ignore
            const { exportBiCore } = await import('/components/shared/export/presetBi.ts');

            const testContainer = document.createElement('div');
            testContainer.style.width = '800px';
            testContainer.style.padding = '16px';
            testContainer.style.background = '#ffffff';

            const card = document.createElement('div');
            card.className = 'kpi-overview-card preserve-rounded relative flex flex-col justify-between h-full rounded-2xl border border-slate-200/80 bg-white premium-card-shadow overflow-hidden';
            card.dataset.kpiBorder = '#7dd3fc';
            card.dataset.kpiTopBorder = '#0284c7';
            card.dataset.kpiTopColor = 'sky';

            const topBar = document.createElement('div');
            topBar.className = 'kpi-top-accent h-[3.5px] w-full shrink-0 rounded-t-[14.5px] bg-sky-500';
            card.appendChild(topBar);

            const inner = document.createElement('div');
            inner.innerHTML = '<h3>DOANH THU</h3><div>1.000 Tr</div>';
            card.appendChild(inner);
            testContainer.appendChild(card);
            document.body.appendChild(testContainer);

            let cloneCardRadius = '';
            let cloneOverflow = '';
            let cloneTopLeftRadius = '';
            let cloneTopRightRadius = '';
            let cloneTopBarMarginLeft = '';

            await exportBiCore(testContainer, 'test-overview-export.png', {
                mode: 'blob-only',
                captureAsDisplayed: true,
                onBeforeCapture: (clone: HTMLElement) => {
                    const clonedCard = clone.querySelector('.kpi-overview-card') as HTMLElement;
                    const clonedTopBar = clone.querySelector('.kpi-top-accent') as HTMLElement;
                    if (clonedCard && clonedTopBar) {
                        cloneCardRadius = clonedCard.style.borderRadius;
                        cloneOverflow = clonedCard.style.overflow;
                        cloneTopLeftRadius = clonedTopBar.style.borderTopLeftRadius;
                        cloneTopRightRadius = clonedTopBar.style.borderTopRightRadius;
                        cloneTopBarMarginLeft = clonedTopBar.style.marginLeft;
                    }
                }
            }, () => {});

            document.body.removeChild(testContainer);

            return {
                cloneCardRadius,
                cloneOverflow,
                cloneTopLeftRadius,
                cloneTopRightRadius,
                cloneTopBarMarginLeft
            };
        });

        expect(result.cloneCardRadius).toBe('16px');
        expect(result.cloneOverflow).toBe('hidden');
        expect(result.cloneTopLeftRadius).toBe('14.5px');
        expect(result.cloneTopRightRadius).toBe('14.5px');
        expect(result.cloneTopBarMarginLeft).toBe('0px');
    });
});
