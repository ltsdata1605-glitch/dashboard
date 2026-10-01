import { test, expect, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * Bộ xuất ảnh CHUNG (components/shared/export) — kế hoạch "Hợp nhất xuất ảnh" 2026-10-01.
 * Chạy code thật trong Chromium (html-to-image thật, DOM thật), nạp module qua Vite.
 */
type Mod = typeof import('../../components/shared/export');
const MOD = '/components/shared/export/index.ts';

async function datBang(page: Page) {
    await page.goto('/');
    await page.evaluate(() => {
        const ten = ['Nguyễn Văn An', 'Trần Thị Bích Ngọc Hạnh', 'Lê Hoàng Phúc', 'Phạm Minh Châu'];
        const cot = ['DOANH THU QUY ĐỔI', 'SL', '% HOÀN THÀNH TARGET', 'TRẢ GÓP', 'TB 3 THÁNG', '%TT', 'D.THU', 'TARGET', 'DỰ KIẾN', 'HIỆU QUẢ QĐ'];
        const host = document.createElement('div');
        host.id = 'vung-xuat';
        host.style.cssText = 'width:420px;background:#fff;padding:12px';
        host.className = 'text-slate-800';
        host.innerHTML = `
          <h2 style="font-size:16px;margin:0 0 8px">Báo cáo thử</h2>
          <div class="overflow-x-auto" style="overflow-x:auto;width:100%">
            <table class="w-full border-collapse" style="width:100%;table-layout:fixed">
              <thead><tr><th class="sticky left-0 w-[90px] bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wider border border-slate-200" style="position:sticky;left:0;width:90px">NHÂN VIÊN</th>${cot.map((c) => `<th class="bg-slate-100 text-[11px] font-bold uppercase tracking-wider border border-slate-200" style="width:40px">${c}</th>`).join('')}</tr></thead>
              <tbody>${ten.map((t, i) => `<tr><td class="truncate max-w-[90px] border border-slate-200" style="max-width:90px;overflow:hidden;text-overflow:ellipsis">${100000 + i} - ${t}</td>${cot.map((_, j) => `<td class="text-right border border-slate-200">${(1234567.89 * (i + 1) * (j + 1)).toLocaleString('vi-VN')}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>
          <button class="hide-on-export">Nút không được lọt vào ảnh</button>`;
        document.body.appendChild(host);
    });
}

test('co cột vừa nội dung: ô dữ liệu 1 dòng, không cột nào bị cắt; ảnh rộng đúng bằng bảng', async ({ page }) => {
    await datBang(page);
    const r = await page.evaluate(async (path) => {
        const m = (await import(/* @vite-ignore */ path)) as Mod;
        // 1) Hàm co cột trên một bản sao đặt trong DOM — kiểm từng ô
        const src = document.getElementById('vung-xuat')!;
        const box = document.createElement('div');
        box.style.cssText = 'position:absolute;left:-9999px;top:0;width:fit-content';
        const copy = src.cloneNode(true) as HTMLElement;
        box.appendChild(copy);
        document.body.appendChild(box);
        const w = m.fitTablesToContent(copy);
        const tds = Array.from(copy.querySelectorAll('tbody td')) as HTMLElement[];
        const motDong = tds.every((td) => td.getBoundingClientRect().height <= 30);
        const khongTran = tds.every((td) => td.scrollWidth <= td.clientWidth + 1);
        const bang = copy.querySelector('table')!.getBoundingClientRect().width;
        box.remove();
        // 2) Xuất thật (blob-only) — đo BẢN SAO đúng lúc chụp và đo ảnh
        let trongAnh = { bang: 0, khung: 0, motDong: false, khongTran: false, coNut: true };
        const blob = await m.exportElementAsImage(src, 'bang-thu.png', {
            mode: 'blob-only', scale: 1,
            onBeforeCapture: (clone, size) => {
                const cells = Array.from(clone.querySelectorAll('tbody td')) as HTMLElement[];
                const h0 = cells[1].getBoundingClientRect().height;
                trongAnh = {
                    bang: clone.querySelector('table')!.getBoundingClientRect().right - clone.getBoundingClientRect().left,
                    khung: size.width,
                    motDong: cells.every((c) => c.getBoundingClientRect().height <= h0 + 1),
                    khongTran: cells.every((c) => c.scrollWidth <= c.clientWidth + 1),
                    coNut: !!clone.querySelector('.hide-on-export'),
                };
            },
        });
        const bmp = await createImageBitmap(blob!);
        const blobKhongChan = await m.exportElementAsImage(src, 'bang-thu.png', { mode: 'blob-only', scale: 1, footer: false });
        const bmp2 = await createImageBitmap(blobKhongChan!);
        const buf = new Uint8Array(await blob!.arrayBuffer()); let b64 = ''; buf.forEach((x) => { b64 += String.fromCharCode(x); });
        return { w, motDong, khongTran, bang, trongAnh, anhRong: bmp.width, anhCao: bmp.height, anhCaoKhongChan: bmp2.height, png: btoa(b64) };
    }, MOD);
    writeFileSync(test.info().outputPath('anh-xuat.png'), Buffer.from(r.png, 'base64'));
    console.log('CO CỘT:', JSON.stringify({ ...r, png: undefined }));
    expect(r.motDong, 'mọi ô dữ liệu nằm trên 1 dòng').toBe(true);
    expect(r.khongTran, 'không ô nào bị cắt chữ').toBe(true);
    expect(r.bang, 'bảng phải nở theo nội dung, không bó trong khung 420px').toBeGreaterThan(700);
    // Trong ảnh thật: ô 1 dòng, không cắt chữ, bảng nằm TRỌN trong khung, khung không thừa trắng quá 16px
    expect(r.trongAnh.motDong, 'trong ảnh: mọi ô dữ liệu 1 dòng').toBe(true);
    expect(r.trongAnh.khongTran, 'trong ảnh: không ô nào bị cắt chữ').toBe(true);
    expect(r.trongAnh.coNut, 'nút .hide-on-export không lọt vào ảnh').toBe(false);
    expect(r.trongAnh.bang, 'bảng không vượt khung ảnh').toBeLessThanOrEqual(r.trongAnh.khung);
    expect(r.trongAnh.khung - r.trongAnh.bang, 'không thừa trắng bên phải').toBeLessThanOrEqual(16);
    expect(r.anhRong).toBe(r.trongAnh.khung);
    // Chân ảnh làm ảnh cao thêm
    expect(r.anhCao).toBeGreaterThan(r.anhCaoKhongChan + 10);
});

test('bảng hẹp vẫn ra ảnh tối thiểu 680px', async ({ page }) => {
    await page.goto('/');
    const rong = await page.evaluate(async (path) => {
        const m = (await import(/* @vite-ignore */ path)) as Mod;
        const el = document.createElement('div');
        el.innerHTML = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>';
        document.body.appendChild(el);
        const b = await m.exportElementAsImage(el, 'nho.png', { mode: 'blob-only', scale: 1 });
        return (await createImageBitmap(b!)).width;
    }, MOD);
    expect(rong).toBe(688);
});

test('xuất lẻ: hiện bảng chờ "Đang chụp ảnh…" rồi tự tắt', async ({ page }) => {
    await datBang(page);
    await page.evaluate(async (path) => {
        const m = (await import(/* @vite-ignore */ path)) as Mod;
        (window as unknown as { __p: Promise<unknown> }).__p = m.exportElementAsImage(document.getElementById('vung-xuat')!, 'bao-cao-thu.png', { mode: 'blob-only', progressTitle: 'Xuất ảnh Báo cáo thử' });
    }, MOD);
    const bang = page.getByTestId('export-progress');
    await expect(bang).toBeVisible();
    await expect(bang).toContainText('Xuất ảnh Báo cáo thử');
    await expect(page.getByTestId('export-progress-stage')).toContainText('Đang chụp ảnh');
    await page.screenshot({ path: test.info().outputPath('xuat-le-dang-chup.png') });
    await page.evaluate(() => (window as unknown as { __p: Promise<unknown> }).__p);
    await expect(bang).toHaveCount(0, { timeout: 3000 });
});

test('hàng loạt: thanh tiến trình, tên mục, Huỷ dừng vòng lặp, tổng kết liệt kê mục lỗi', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async (path) => {
        const m = (await import(/* @vite-ignore */ path)) as Mod;
        const w = window as unknown as { __job: ReturnType<Mod['startExportJob']>; __m: Mod };
        w.__m = m;
        w.__job = m.startExportJob({ title: 'Xuất ảnh theo nhân viên', total: 5 });
        w.__job.item(0, 'Nguyễn Văn An'); w.__job.result('Nguyễn Văn An', 'ok');
        w.__job.item(1, 'Trần Thị Bích'); w.__job.result('Trần Thị Bích', 'failed', 'ảnh trắng');
        w.__job.item(2, 'Lê Hoàng Phúc');
    }, MOD);
    const bang = page.getByTestId('export-progress');
    await expect(bang).toContainText('Xuất ảnh theo nhân viên');
    await expect(page.getByTestId('export-progress-count')).toContainText('2/5');
    await expect(bang).toContainText('Lê Hoàng Phúc');
    await page.screenshot({ path: test.info().outputPath('hang-loat-dang-chay.png') });

    await bang.getByRole('button', { name: 'Huỷ' }).click();
    expect(await page.evaluate(() => (window as unknown as { __job: { cancelled: boolean } }).__job.cancelled)).toBe(true);
    await page.evaluate(() => (window as unknown as { __job: { finish: () => void } }).__job.finish());
    await expect(page.getByTestId('export-progress-stage')).toContainText('Đã huỷ — xuất được 1/5 ảnh');
    await expect(page.getByTestId('export-progress-failed')).toContainText('Trần Thị Bích — ảnh trắng');
    await page.screenshot({ path: test.info().outputPath('hang-loat-tong-ket.png') });
    await bang.getByRole('button', { name: 'Đóng' }).click();
    await expect(bang).toHaveCount(0);
});

test('API cũ showExportOverlay/updateExportOverlay/hideExportOverlay dùng bảng chung', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async (path) => {
        const m = (await import(/* @vite-ignore */ path)) as Mod;
        m.showExportOverlay('Đang xuất ảnh hàng loạt...', '0/4');
        m.updateExportOverlay('Đang xuất: Kho A', '3/4');
    }, MOD);
    await expect(page.getByTestId('export-progress')).toContainText('Đang xuất ảnh hàng loạt');
    await expect(page.getByTestId('export-progress-count')).toContainText('2/4');
    await page.evaluate(async (path) => ((await import(/* @vite-ignore */ path)) as Mod).hideExportOverlay(), MOD);
    await expect(page.getByTestId('export-progress')).toHaveCount(0);
});
