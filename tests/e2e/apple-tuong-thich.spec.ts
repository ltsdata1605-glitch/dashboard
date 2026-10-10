import { expect, test, type Page } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * TƯƠNG THÍCH iPhone + laptop — lưới an toàn của kế hoạch giao diện chuẩn Apple (KE_HOACH_GIAO_DIEN_APPLE.md, GĐ0).
 *
 * Quét KHUNG APP (thanh trên, thanh tab dưới, thanh tiêu đề laptop) ở mọi tab chính, 6 khung màn hình, với dữ liệu mẫu
 * (Dùng thử + file bán hàng tự tạo — có dữ liệu thì thanh trên Phân tích mới hiện đủ nút):
 *   - trang không tràn ngang;
 *   - nút trên một thanh không đè lên nhau, không lọt ra ngoài màn;
 *   - thiết bị cảm ứng: nút trên 2 thanh có vùng chạm ≥ 44px; chữ trên 2 thanh ≥ 11px;
 *   - không phần tử `position: fixed` nào đè lên thanh tab (toast, thẻ nổi…).
 *
 * Lỗi ĐÃ BIẾT nằm trong `DA_BIET` (mẫu vi phạm + lỗi số mấy trong kế hoạch + giai đoạn sẽ sửa). Có vi phạm MỚI → test đỏ.
 * Mẫu đã biết KHÔNG còn khớp vi phạm nào → test cũng đỏ, nhắc gỡ khỏi danh sách (giống lint-ratchet: chỉ được giảm).
 * Chạy khảo sát (in hết vi phạm, không so): KHAO_SAT=1; chụp ảnh từng tab/khung: CHUP=1 (test-results/apple-tuong-thich/).
 */

const TABS = ['analysis', 'employees', 'check-thuong', 'reports', 'tools-print-sticker', 'tools-phanca', 'tools-line-bot', 'tools-tax', 'tools-coupon', 'settings', 'help'] as const;

const KHUNG_CAM_UNG = [
    { ten: 'iPhone SE', w: 375, h: 667 },
    { ten: 'iPhone 16', w: 393, h: 852 },
    { ten: 'iPhone 16 Pro Max', w: 440, h: 956 },
    { ten: 'iPad', w: 820, h: 1180 },
];
const KHUNG_LAPTOP = [
    { ten: 'Laptop', w: 1366, h: 768 },
    { ten: 'Màn lớn', w: 1920, h: 1080 },
];

/**
 * Vi phạm ĐÃ BIẾT lúc lập kế hoạch (2026-10-10, khảo sát 4 khung cảm ứng + 2 khung laptop) → giai đoạn sẽ sửa.
 * Vi phạm có dạng `<tab>@<rộng>:<thanh>:<loại>:<tên nút>`. Gỡ từng mẫu khi giai đoạn tương ứng xong.
 */
const DA_BIET: { mau: RegExp; lyDo: string }[] = [
    { mau: /^[a-z-]+@\d+:topbar:vung-cham-nho:Thông báo$/, lyDo: 'Chuông 32px trên thanh trên — GĐ4 (lỗi #1)' },
    { mau: /^analysis@\d+:topbar:(vung-cham-nho|de-nhau|ngoai-man):/, lyDo: '7 nút thanh trên Phân tích đè nhau / lọt khỏi màn / 32px — GĐ4 (lỗi #1)' },
    { mau: /^analysis@(375|393):trang-tran-ngang:/, lyDo: 'Thanh trên Phân tích đẩy trang tràn ngang ở iPhone SE / iPhone 16 — GĐ4 (lỗi #1)' },
    { mau: /^analysis@(375|393):tabbar:ngoai-man:Khác$/, lyDo: 'Hệ quả trang tràn ngang: nút "Khác" lọt khỏi màn — GĐ4 (lỗi #1)' },
    { mau: /^employees@\d+:topbar:vung-cham-nho:/, lyDo: 'Report BI: 4 icon không chữ 32px trên thanh trên — GĐ6 (lỗi #12)' },
    { mau: /^settings@\d+:topbar:(vung-cham-nho|de-nhau):/, lyDo: 'Phân quyền: nút Đăng xuất trên thanh trên đè chuông — GĐ7' },
    { mau: /^tools-print-sticker@\d+:topbar:/, lyDo: 'In Sticker: dải chế độ + cỡ chữ nhét vào thanh trên — GĐ7' },
];

const KHAO_SAT = !!process.env.KHAO_SAT; // KHAO_SAT=1 → chỉ in vi phạm, không so DA_BIET (dùng khi cập nhật danh sách)

/** Chạy trong trang: đo khung app ở khung màn hiện tại. */
const DO_KHUNG = (camUng: boolean) => {
    const vw = document.documentElement.clientWidth;
    const loi: string[] = [];
    const hien = (el: Element) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05 && !el.closest('[inert]');
    };
    const giao = (a: DOMRect, b: DOMRect) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const ten = (el: Element) => (el.getAttribute('aria-label') || el.getAttribute('title') || (el.textContent || '').trim() || el.tagName.toLowerCase())
        .replace(/\s+/g, ' ').slice(0, 24);
    // Vùng chạm thật = khung ∪ ::after (một số nút nới vùng chạm vô hình bằng ::after).
    const vungCham = (el: Element) => {
        const r = el.getBoundingClientRect(); const af = getComputedStyle(el, '::after');
        if (af.content === 'none' || af.position !== 'absolute') return { w: r.width, h: r.height };
        const px = (v: string) => (v === 'auto' ? 0 : parseFloat(v) || 0);
        return { w: Math.max(r.width, r.width - px(af.left) - px(af.right)), h: Math.max(r.height, r.height - px(af.top) - px(af.bottom)) };
    };

    if (document.documentElement.scrollWidth - vw > 1) loi.push(`trang-tran-ngang:${document.documentElement.scrollWidth - vw}px`);

    const thanh = Array.from(document.querySelectorAll('[data-app-chrome]')).filter(hien);
    for (const bar of thanh) {
        const loai = bar.getAttribute('data-app-chrome');
        const nut = Array.from(bar.querySelectorAll('button, a[href], [role="button"], [role="tab"], select, input:not([type="hidden"])')).filter(hien);
        for (let i = 0; i < nut.length; i++) {
            const a = nut[i].getBoundingClientRect();
            if (a.left < -1 || a.right > vw + 1) loi.push(`${loai}:ngoai-man:${ten(nut[i])}`);
            if (camUng) {
                const c = vungCham(nut[i]);
                if (c.w < 43.5 || c.h < 43.5) loi.push(`${loai}:vung-cham-nho:${ten(nut[i])}`);
            }
            for (let j = i + 1; j < nut.length; j++) {
                if (nut[i].contains(nut[j]) || nut[j].contains(nut[i])) continue;
                if (giao(a, nut[j].getBoundingClientRect()) > 4) loi.push(`${loai}:de-nhau:${ten(nut[i])}+${ten(nut[j])}`);
            }
        }
        const chuNho = Array.from(bar.querySelectorAll('*')).filter(el => hien(el) && el.children.length === 0 && (el.textContent || '').trim()
            && parseFloat(getComputedStyle(el).fontSize) < 11);
        for (const el of chuNho) loi.push(`${loai}:chu-nho:${ten(el)}`);
    }

    // Thứ nổi (fixed) đè lên thanh tab dưới.
    const tabbar = thanh.find(t => t.getAttribute('data-app-chrome') === 'tabbar');
    if (tabbar) {
        const rTab = tabbar.getBoundingClientRect();
        const dienTichMan = window.innerWidth * window.innerHeight;
        for (const el of Array.from(document.querySelectorAll('body *'))) {
            if (tabbar.contains(el) || el.contains(tabbar) || !hien(el)) continue;
            const cs = getComputedStyle(el);
            if (cs.position !== 'fixed' || cs.pointerEvents === 'none') continue;
            const r = el.getBoundingClientRect();
            if (r.width * r.height > dienTichMan * 0.6) continue; // lớp phủ toàn màn (nền modal…) không tính
            if (giao(r, rTab) > 4) loi.push(`tabbar:bi-de:${ten(el)}`);
        }
    }
    return Array.from(new Set(loi));
};

async function napDuLieuMau(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first().click({ timeout: 30_000 });
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.getByText('Tệp Realtime (Xem nhanh)').last().click();
    await expect(page.getByText(/chi tiết theo kho/i).first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(1500);
}

async function quet(page: Page, khung: { ten: string; w: number; h: number }[], camUng: boolean) {
    const tatCa: string[] = [];
    for (const k of khung) {
        await page.setViewportSize({ width: k.w, height: k.h });
        for (const tab of TABS) {
            await page.evaluate((t) => window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: t } })), tab);
            await page.waitForTimeout(tab === 'analysis' ? 2500 : 1800);
            const loi = await page.evaluate(DO_KHUNG, camUng);
            for (const l of loi) tatCa.push(`${tab}@${k.w}:${l}`);
            if (process.env.CHUP) await page.screenshot({ path: `test-results/apple-tuong-thich/${k.w}-${tab}.png` });
        }
    }
    return tatCa;
}

function soVoiDaBiet(tatCa: string[], phamVi: (d: { mau: RegExp }) => boolean) {
    console.log(`\n── ${tatCa.length} vi phạm ──\n${tatCa.join('\n')}`);
    if (KHAO_SAT) return;
    const moi = tatCa.filter(l => !DA_BIET.some(d => d.mau.test(l)));
    const daHet = DA_BIET.filter(d => phamVi(d) && !tatCa.some(l => d.mau.test(l))).map(d => `${d.mau} — ${d.lyDo}`);
    expect(moi, `Vi phạm MỚI ở khung app:\n${moi.join('\n')}`).toEqual([]);
    expect(daHet, `Đã sửa xong — gỡ khỏi DA_BIET:\n${daHet.join('\n')}`).toEqual([]);
}

test.describe('cảm ứng (iPhone, iPad)', () => {
    test.use({
        isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 440, height: 956 },
    });
    test('khung app: không tràn, không đè, vùng chạm ≥ 44px, chữ ≥ 11px', async ({ page }) => {
        test.setTimeout(600_000);
        await napDuLieuMau(page);
        const tatCa = await quet(page, KHUNG_CAM_UNG, true);
        soVoiDaBiet(tatCa, () => true);
    });
});

test.describe('laptop', () => {
    test.use({ viewport: { width: 1366, height: 768 } });
    test('khung app: không tràn, không đè', async ({ page }) => {
        test.setTimeout(300_000);
        await napDuLieuMau(page);
        const tatCa = await quet(page, KHUNG_LAPTOP, false);
        soVoiDaBiet(tatCa, () => false); // laptop: hiện chưa có lỗi khung nào — mọi vi phạm đều là MỚI
    });
});
