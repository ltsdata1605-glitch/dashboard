import { test, expect, type Page } from '@playwright/test';
import { auditIcons, type IconAuditResult } from './helpers/iconAudit';

/**
 * CHUẨN HOÁ ICON — audit icon BÊN TRONG MODAL (2026-10-07).
 *
 * Các bài audit màn chính (icon-audit-man-goc / icon-audit-bi) chỉ đo thứ đang hiện trên màn; modal ít mở thì
 * chưa ai đo. Spec này tự KHÁM PHÁ modal: ở mỗi tab, bấm lần lượt từng nút an toàn trên màn, nút nào làm hiện
 * một lớp nổi mới (hộp thoại, ngăn kéo — mọi phần tử `position: fixed` vừa xuất hiện) thì đo icon trong hộp đó bằng
 * cùng 4 tiêu chí (legacy / lệch / nút có chữ nhỏ hơn md / vùng chạm < 44px trên điện thoại), rồi đóng lại.
 *
 * Nút "nguy hiểm" (xoá, đăng xuất, gửi, xuất, tải, lưu, đồng bộ, chạy tự động…) KHÔNG bấm — chạy ở Chế độ
 * Dùng Thử nhưng vẫn tránh mọi hành động có tác dụng phụ (tải file, mở tab ngoài, gọi mạng).
 */
const TABS = ['analysis', 'check-thuong', 'reports', 'settings', 'tools-tax', 'tools-coupon', 'tools-price-compare',
    'help', 'tools-phanca', 'tools-print-sticker', 'tools-line-bot', 'tools-khai-thac', 'employees'];

const NGUY_HIEM = /xo[áa]|x[óo]a|delete|đăng xuất|logout|g[ửu]i|send|xuất|export|tải|download|upload|lưu|save|đồng bộ|sync|tự động|chạy|run|(^|\s)in(\s|$)|print|reset|khôi phục|đặt lại|làm mới|refresh|đăng nhập|login|google|chụp|camera|copy|sao chép|dán|paste|chia sẻ|share|duyệt|từ chối|nâng cấp|cài tiện ích|cài script|install|mở link|zalo|kích hoạt|dùng thử|bật|tắt|huỷ|hủy|thoát|đóng|close|quay lại|back|thu gọn|mở rộng|toàn màn|fullscreen|nhập file|chọn file/i;

const MODAL_SEL = '[role="dialog"], [aria-modal="true"], [data-audit-modal]';

async function vaoDungThu(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
}

/** Danh sách nút ứng viên (theo nhãn) đang hiện trên màn, ngoài thanh điều hướng và ngoài modal. */
async function nutUngVien(page: Page): Promise<string[]> {
    return page.evaluate((modalSel) => {
        const out: string[] = [];
        for (const b of Array.from(document.querySelectorAll('button, [role="button"]'))) {
            if (b.closest('nav, aside, [data-mobile-bottom-nav], ' + modalSel)) continue;
            const r = b.getBoundingClientRect();
            if (!r.width || !r.height || (b as HTMLButtonElement).disabled) continue;
            const nhan = ((b.textContent || '').replace(/\s+/g, ' ').trim() || b.getAttribute('aria-label') || b.getAttribute('title') || '').slice(0, 60);
            if (nhan && !out.includes(nhan)) out.push(nhan);
        }
        return out;
    }, MODAL_SEL);
}

/** Đánh dấu mọi lớp `position: fixed` đang có (trước khi bấm) để sau đó nhận ra lớp MỚI hiện ra. */
const danhDauLopCu = (page: Page) => page.evaluate(() => {
    document.querySelectorAll('[data-audit-modal]').forEach((e) => e.removeAttribute('data-audit-modal'));
    for (const e of Array.from(document.body.querySelectorAll('*'))) {
        if (getComputedStyle(e).position === 'fixed') e.setAttribute('data-audit-old', '1');
    }
});

/**
 * Hộp thoại / ngăn kéo / bảng nổi MỚI sau khi bấm: phần tử `position: fixed` chưa có trước đó, đủ lớn (> 150×100),
 * lấy lớp NGOÀI CÙNG. Không dựa vào `role="dialog"` vì nhiều ngăn kéo (Lịch sử Thuế…) không gắn role.
 */
async function danhDauModalMoi(page: Page): Promise<string | null> {
    return page.evaluate(() => {
        const moi = Array.from(document.body.querySelectorAll('*')).filter((e) => {
            if (e.hasAttribute('data-audit-old') || getComputedStyle(e).position !== 'fixed') return false;
            const r = e.getBoundingClientRect();
            return r.width > 150 && r.height > 100 && getComputedStyle(e).visibility !== 'hidden';
        });
        const ngoai = moi.filter((e) => !moi.some((o) => o !== e && o.contains(e)));
        if (!ngoai.length) return null;
        ngoai.forEach((e) => e.setAttribute('data-audit-modal', '1'));
        const tieuDe = ngoai[0].querySelector('h1, h2, h3, [id$="title"]') || ngoai[0];
        return ((tieuDe.textContent || '').replace(/\s+/g, ' ').trim()).slice(0, 50) || '(không tiêu đề)';
    });
}

for (const [label, width] of [['điện thoại 390', 390], ['laptop 1366', 1366]] as const) {
    test(`audit icon trong modal — ${label}`, async ({ page, context }) => {
        test.setTimeout(900_000);
        // Không cho rời trang / mở tab mới / tải file trong lúc khám phá.
        context.on('page', (p) => { void p.close(); });
        page.on('download', (d) => { void d.cancel(); });
        page.on('dialog', (d) => { void d.dismiss(); });
        await page.setViewportSize({ width, height: 900 });
        await vaoDungThu(page);

        const ketQua: Record<string, IconAuditResult> = {};
        for (const tab of TABS) {
            await page.goto(`/?tab=${tab}`);
            await page.waitForTimeout(2000);
            const tatCa = await nutUngVien(page);
            const nut = tatCa.filter((n) => !NGUY_HIEM.test(n)).slice(0, 40);
            console.log(`[${tab}] bấm thử ${nut.length}/${tatCa.length}: ${nut.join(' | ')}\n   bỏ qua: ${tatCa.filter((n) => NGUY_HIEM.test(n)).join(' | ')}`);
            for (const nhan of nut) {
                await danhDauLopCu(page);
                // Nút trùng nhãn (bản desktop + bản mobile) thì bản đầu có thể đang ẩn → đánh dấu đúng bản ĐANG HIỆN.
                const coNut = await page.evaluate(({ nhan, modalSel }) => {
                    document.querySelectorAll('[data-audit-target]').forEach((e) => e.removeAttribute('data-audit-target'));
                    for (const b of Array.from(document.querySelectorAll('button, [role="button"]'))) {
                        if (b.closest('nav, aside, [data-mobile-bottom-nav], ' + modalSel)) continue;
                        const r = b.getBoundingClientRect();
                        if (!r.width || !r.height) continue;
                        const n = ((b.textContent || '').replace(/\s+/g, ' ').trim() || b.getAttribute('aria-label') || b.getAttribute('title') || '').slice(0, 60);
                        if (n === nhan) { b.setAttribute('data-audit-target', '1'); return true; }
                    }
                    return false;
                }, { nhan, modalSel: MODAL_SEL });
                if (!coNut) continue;
                await page.locator('[data-audit-target]').first().click({ timeout: 2000 }).catch(() => undefined);
                await page.waitForTimeout(700);
                const ten = await danhDauModalMoi(page);
                if (ten) {
                    const khoa = `${tab} › ${nhan} → ${ten}`;
                    ketQua[khoa] = await auditIcons(page, width < 1024, '[data-audit-modal]');
                }
                // Trả màn về trạng thái gốc cho nút kế tiếp.
                if (ten || !page.url().includes(`tab=${tab}`)) {
                    await page.goto(`/?tab=${tab}`);
                    await page.waitForTimeout(1500);
                }
            }
        }
        console.log(`AUDIT MODAL ${label} — ${Object.keys(ketQua).length} modal\n` + JSON.stringify(ketQua, null, 1));
        expect(Object.keys(ketQua).length, 'phải mở được ít nhất vài modal, nếu 0 là spec hỏng').toBeGreaterThan(5);
        for (const [k, r] of Object.entries(ketQua)) {
            expect(r.legacy, `${k}: icon chưa qua AppIcon`).toEqual([]);
            expect(r.lech, `${k}: icon lệch dọc trong nút`).toEqual([]);
            expect(r.nutChuNhoHon, `${k}: icon trong nút có chữ nhỏ hơn md`).toEqual([]);
            expect(r.vungCham, `${k}: nút chỉ có icon dưới 44px trên điện thoại`).toEqual([]);
        }
    });
}
