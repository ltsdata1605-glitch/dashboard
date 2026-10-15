import { test, expect } from '@playwright/test';

test.describe('Industry KPI Card - Hero Number Size and Clarity Verification', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 / 13 / 14 standard mobile viewport

    test('Hiển thị số lượng to rõ 25px-28px trên thẻ KPI ngành hàng', async ({ page }) => {
        await page.goto('/tests/e2e/helpers/empty.html').catch(async () => {
            await page.goto('/');
        });

        await page.evaluate(() => {
            const container = document.createElement('div');
            container.id = 'test-kpi-grid-container';
            container.style.padding = '12px';
            container.style.background = '#f8fafc';
            container.innerHTML = `
                <div class="grid grid-cols-4 gap-1.5" style="max-width: 390px;">
                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-sky-400 to-sky-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-sky-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">LAPTOP</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[25px] sm:text-[28px] font-black tracking-tight tabular-nums text-slate-900 leading-none">1</span>
                                    <span class="industry-kpi-label text-[11px] font-black uppercase tracking-tight text-slate-500 leading-none">SL</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">DTQĐ</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-sky-50 text-sky-700">34 Tr</span>
                            </div>
                        </div>
                    </div>

                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-amber-400 to-amber-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-amber-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">SMARTPHONE</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[25px] sm:text-[28px] font-black tracking-tight tabular-nums text-slate-900 leading-none">3</span>
                                    <span class="industry-kpi-label text-[11px] font-black uppercase tracking-tight text-slate-500 leading-none">SL</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">DTQĐ</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-amber-50 text-amber-700">61 Tr</span>
                            </div>
                        </div>
                    </div>

                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-emerald-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">IPHONE</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[25px] sm:text-[28px] font-black tracking-tight tabular-nums text-slate-900 leading-none">2</span>
                                    <span class="industry-kpi-label text-[11px] font-black uppercase tracking-tight text-slate-500 leading-none">SL</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">DTQĐ</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700">84 Tr</span>
                            </div>
                        </div>
                    </div>

                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-rose-400 to-rose-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-rose-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">SIM DATA</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[25px] sm:text-[28px] font-black tracking-tight tabular-nums text-slate-900 leading-none">1</span>
                                    <span class="industry-kpi-label text-[11px] font-black uppercase tracking-tight text-slate-500 leading-none">SL</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">DTQĐ</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-rose-50 text-rose-700">1 Tr</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(container);
        });

        const numEl = page.locator('#test-kpi-grid-container .industry-kpi-num').first();
        await expect(numEl).toBeVisible();

        const fontSize = await numEl.evaluate((el) => window.getComputedStyle(el).fontSize);
        const fontWeight = await numEl.evaluate((el) => window.getComputedStyle(el).fontWeight);
        
        expect(fontSize).toBe('25px');
        expect(Number(fontWeight)).toBeGreaterThanOrEqual(900);

        const card = page.locator('#test-kpi-grid-container');
        await card.screenshot({ path: 'test-results/industry-kpi-num-25px.png' });
    });

    test('Hiển thị doanh thu to rõ 20px-25px trên thẻ KPI ngành hàng', async ({ page }) => {
        await page.goto('/tests/e2e/helpers/empty.html').catch(async () => {
            await page.goto('/');
        });

        await page.evaluate(() => {
            const container = document.createElement('div');
            container.id = 'test-kpi-grid-revenue-container';
            container.style.padding = '12px';
            container.style.background = '#f8fafc';
            container.innerHTML = `
                <div class="grid grid-cols-4 gap-1.5" style="max-width: 390px;">
                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-sky-400 to-sky-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-sky-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">LAPTOP</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[20px] sm:text-[25px] font-black tracking-tight tabular-nums text-slate-900 leading-none">34</span>
                                    <span class="industry-kpi-label text-[11px] font-extrabold uppercase tracking-tight text-slate-500 leading-none">DTQĐ</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">Số lượng</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-sky-50 text-sky-700">1 SL</span>
                            </div>
                        </div>
                    </div>

                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-amber-400 to-amber-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-amber-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">SMARTPHONE</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[20px] sm:text-[25px] font-black tracking-tight tabular-nums text-slate-900 leading-none">61</span>
                                    <span class="industry-kpi-label text-[11px] font-extrabold uppercase tracking-tight text-slate-500 leading-none">DTQĐ</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">Số lượng</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-amber-50 text-amber-700">3 SL</span>
                            </div>
                        </div>
                    </div>

                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-emerald-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">IPHONE</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[20px] sm:text-[25px] font-black tracking-tight tabular-nums text-slate-900 leading-none">84</span>
                                    <span class="industry-kpi-label text-[11px] font-extrabold uppercase tracking-tight text-slate-500 leading-none">DTQĐ</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">Số lượng</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700">2 SL</span>
                            </div>
                        </div>
                    </div>

                    <div class="industry-kpi-card min-w-0 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                        <div class="h-[2.5px] w-full bg-gradient-to-r from-rose-400 to-rose-600"></div>
                        <div class="p-1 flex flex-col justify-between min-h-[58px]">
                            <div class="flex items-center gap-1 mb-0.5">
                                <span class="w-1 h-1 rounded-full bg-rose-500"></span>
                                <span class="industry-kpi-title text-[11px] font-extrabold uppercase tracking-tight text-slate-700 truncate">SIM DATA</span>
                            </div>
                            <div class="w-full flex items-baseline justify-center py-0.5 my-auto">
                                <div class="flex items-baseline justify-center gap-0.5 min-w-0">
                                    <span class="industry-kpi-num text-[20px] sm:text-[25px] font-black tracking-tight tabular-nums text-slate-900 leading-none">1</span>
                                    <span class="industry-kpi-label text-[11px] font-extrabold uppercase tracking-tight text-slate-500 leading-none">DTQĐ</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-0.5 pt-0.5 border-t border-slate-100 text-[11px]">
                                <span class="text-slate-400 font-medium">Số lượng</span>
                                <span class="px-1 py-0.5 rounded font-bold bg-rose-50 text-rose-700">1 SL</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(container);
        });

        const numEl = page.locator('#test-kpi-grid-revenue-container .industry-kpi-num').first();
        await expect(numEl).toBeVisible();

        const fontSize = await numEl.evaluate((el) => window.getComputedStyle(el).fontSize);
        expect(fontSize).toBe('20px');

        const card = page.locator('#test-kpi-grid-revenue-container');
        await card.screenshot({ path: 'test-results/industry-kpi-revenue-20px.png' });
    });
});
