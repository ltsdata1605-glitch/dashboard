import { test, devices, type Page } from '@playwright/test';
import * as fs from 'fs';
import { SUMMARY_REALTIME, SUMMARY_LUYKE, COMPETITION_LUYKE } from './helpers/seed';

/**
 * BỘ KHẢO SÁT iPhone (không phải test hồi quy — test hồi quy là mobile-iphone-6-module.spec.ts):
 * đi qua 13 màn, tự bấm từng nút/tab (bỏ qua nút phá huỷ) để mở modal/popup/menu con, rồi đo ở
 * MỌI trạng thái: chữ <11px, vùng chạm <44px (tính cả ::after và CHẠM THỬ bằng elementFromPoint),
 * phần tử tràn khỏi màn, chữ bị cắt không "…", chữ chồng chữ (theo từng dòng getClientRects),
 * modal tràn, trang tràn ngang, cỡ icon. Ghi JSON + ảnh chụp ra AUDIT_OUT (mặc định
 * test-results/audit-iphone/<rộng>[-du-lieu]/).
 *
 * Chỉ chạy khi gọi riêng:
 *   AUDIT_IPHONE=1 npx playwright test tests/e2e/audit-iphone-toan-du-an.spec.ts
 * Biến tuỳ chọn: AUDIT_W/AUDIT_H (mặc định 393x852; iPhone SE 375x667), AUDIT_TAB=tab1,tab2,
 * AUDIT_MAX (số nút bấm tối đa mỗi màn, mặc định 70), AUDIT_SEED=1 (nạp dữ liệu giả cho Phân tích +
 * Report BI — nạp ở khung desktop rồi thu về iPhone), AUDIT_XLSX (file Excel doanh số có sẵn, bỏ
 * trống thì tự tạo bằng helpers/salesFixture), AUDIT_OUT.
 * Dùng lần đầu 2026-09-27 (đợt 3 tối ưu iPhone toàn dự án — xem implementation_plan.md).
 */
test.skip(!process.env.AUDIT_IPHONE, 'Bộ khảo sát thủ công — đặt AUDIT_IPHONE=1 để chạy');
const MAN: { ten: string; tab: string }[] = [
    { ten: 'Phân tích', tab: 'analysis' },
    { ten: 'Report BI', tab: 'employees' },
    { ten: 'Check thưởng', tab: 'check-thuong' },
    { ten: 'Báo cáo', tab: 'reports' },
    { ten: 'Bot LINE', tab: 'tools-line-bot' },
    { ten: 'In Sticker', tab: 'tools-print-sticker' },
    { ten: 'Phân ca', tab: 'tools-phanca' },
    { ten: 'Rút gọn Coupon', tab: 'tools-coupon' },
    { ten: 'Tính thuế', tab: 'tools-tax' },
    { ten: 'So sánh giá', tab: 'tools-price-compare' },
    { ten: 'Phân quyền', tab: 'settings' },
    { ten: 'Duyệt user', tab: 'approval' },
    { ten: 'Giới thiệu', tab: 'help' },
];
const CHI = process.env.AUDIT_TAB ? MAN.filter(m => process.env.AUDIT_TAB!.split(',').includes(m.tab)) : MAN;
const RONG = Number(process.env.AUDIT_W || 393);
const CAO = Number(process.env.AUDIT_H || 852);
const IP = devices['iPhone 15'];
test.use({ userAgent: IP.userAgent, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const MAX_CLICK = Number(process.env.AUDIT_MAX || 70);
const NGUY_HIEM = /xo[áa]|x[óo]a|delete|đăng xuất|logout|sign out|đặt lại|reset|huỷ bỏ|làm mới dữ liệu|clear|dọn|gỡ|thu hồi|từ chối|duyệt|in ngay|print|tải xuống|download|xuất|export|chụp|copy|sao chép|dán|paste|đồng bộ|sync|lưu|save|gửi|send|cập nhật dữ liệu|upload|tải lên|chọn file|google/i;

/** Chạy trong trình duyệt: đo toàn trang, trả về danh sách vi phạm có chữ ký để khử trùng */
const DO = () => {
    const vw = document.documentElement.clientWidth;
    const nhin = (el: Element) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.left >= vw * 3) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.opacity === '0') return false;
        // view giữ trạng thái ẩn ở left:-9999px
        let n: Element | null = el;
        while (n) {
            if ((n.className?.toString?.() || '').includes('left-[-9999px]')) return false;
            const c = getComputedStyle(n);
            if (c.opacity === '0' || c.visibility === 'hidden' || c.display === 'none') return false;
            n = n.parentElement;
        }
        return true;
    };
    const ten = (el: Element) => {
        const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
        return `${el.tagName.toLowerCase()}"${t || el.getAttribute('title') || el.getAttribute('aria-label') || ''}"`;
    };
    const cls = (el: Element) => (el.getAttribute('class') || '').slice(0, 90);
    const trongKhungCuon = (el: Element) => {
        let n = el.parentElement;
        while (n && n !== document.body) {
            const o = getComputedStyle(n).overflowX;
            if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
            n = n.parentElement;
        }
        return false;
    };
    // Ngoại lệ có chủ đích: khung mô phỏng iPhone của Bot LINE và trang xem trước mẫu in sticker
    // (thu nhỏ của tờ giấy thật — đổi cỡ chữ ở đó là sai bản in).
    const ngoaiLe = (el: Element) => !!el.closest('.sticker-container, .active-preview-page, [class*="rounded-[50px]"]');
    const all = Array.from(document.querySelectorAll('body *')).filter(e => nhin(e) && !ngoaiLe(e));
    const la = all.filter(el => Array.from(el.childNodes).some(c => c.nodeType === 3 && c.textContent!.trim()));
    const v: { loai: string; ky: string; chiTiet: string }[] = [];
    const canThu: { el: Element; cw: number; ch: number }[] = [];

    for (const el of la) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 11) v.push({ loai: 'chu<11px', ky: ten(el) + cls(el), chiTiet: `${fs}px ${ten(el)} | ${cls(el)}` });
    }
    for (const el of all.filter(e => e.matches('button, a[role="button"], [role="tab"], a[href], select, input[type="checkbox"], input[type="radio"], [role="menuitem"], [role="option"]'))) {
        const r = el.getBoundingClientRect();
        if (el.matches('input[type="checkbox"], input[type="radio"]')) {
            // ô tick nằm trong <label> thì label là vùng chạm — đo label
            const lb = el.closest('label'); const rr = (lb || el).getBoundingClientRect();
            if (rr.height < 44) v.push({ loai: 'cham<44px', ky: ten(lb || el) + cls(lb || el), chiTiet: `${Math.round(rr.width)}x${Math.round(rr.height)} ${ten(lb || el)} | ${cls(lb || el)}` });
            continue;
        }
        if (el.matches('a[href]') && !el.closest('nav') && getComputedStyle(el).display === 'inline') continue; // link trong đoạn văn
        if ((el as HTMLButtonElement).disabled) continue; // nút vô hiệu (icon trang trí trong ô nhập…) không phải vùng chạm
        // vùng chạm vô hình mở rộng bằng ::after (position:absolute, inset âm) — tính vào kích thước chạm
        const af = getComputedStyle(el, '::after');
        let cw = r.width, ch = r.height;
        if (af.content !== 'none' && af.position === 'absolute') {
            const px = (v: string) => (v === 'auto' ? 0 : parseFloat(v) || 0);
            cw = Math.max(cw, r.width - px(af.left) - px(af.right));
            ch = Math.max(ch, r.height - px(af.top) - px(af.bottom));
            if (ch >= 44 && (cw >= 44 || (el.textContent || '').trim())) canThu.push({ el, cw, ch });
        }
        if (ch < 44 || (cw < 44 && !(el.textContent || '').trim()))
            v.push({ loai: 'cham<44px', ky: ten(el) + cls(el), chiTiet: `${Math.round(r.width)}x${Math.round(r.height)} ${ten(el)} | ${cls(el)}` });
    }
    for (const el of all) {
        const r = el.getBoundingClientRect();
        if ((r.right > vw + 1 || r.left < -1) && !trongKhungCuon(el) && getComputedStyle(el).position !== 'fixed')
            v.push({ loai: 'tran-man-hinh', ky: ten(el) + cls(el), chiTiet: `L${Math.round(r.left)} R${Math.round(r.right)} (vw ${vw}) ${ten(el)} | ${cls(el)}` });
    }
    for (const el of la) {
        const h = el as HTMLElement; const cs = getComputedStyle(h);
        const catNgang = h.scrollWidth > h.clientWidth + 1 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip');
        const catDoc = h.scrollHeight > h.clientHeight + 2 && (cs.overflowY === 'hidden' || cs.overflowY === 'clip') && !cs.webkitLineClamp?.match(/\d/);
        if (catNgang && cs.textOverflow !== 'ellipsis') v.push({ loai: 'chu-bi-cat', ky: ten(el) + cls(el), chiTiet: `${ten(el)} rộng ${h.scrollWidth}>${h.clientWidth} | ${cls(el)}` });
        else if (catNgang) v.push({ loai: 'chu-bi-rut-gon(...)', ky: ten(el) + cls(el), chiTiet: `${ten(el)} | ${cls(el)}` });
        if (catDoc) v.push({ loai: 'chu-bi-cat', ky: ten(el) + cls(el) + 'doc', chiTiet: `(dọc) ${ten(el)} cao ${h.scrollHeight}>${h.clientHeight} | ${cls(el)}` });
        // chữ tràn ra khỏi ô chứa (không cắt) → đè sang ô khác
        if (!catNgang && h.scrollWidth > h.clientWidth + 2 && cs.overflowX === 'visible' && cs.display !== 'inline')
            v.push({ loai: 'chu-tran-o', ky: ten(el) + cls(el), chiTiet: `${ten(el)} ${h.scrollWidth}>${h.clientWidth} | ${cls(el)}` });
    }
    // chữ chồng chữ: 2 lá văn bản khác nhánh giao nhau đáng kể
    // Đo theo TỪNG DÒNG chữ thật (getClientRects): phần tử nội dòng gãy qua 2 dòng có khung bao
    // phủ cả 2 dòng → so khung bao sẽ báo nhầm <strong> "chồng" lên chữ cùng đoạn văn.
    const hop = la.map(el => ({ el, r: el.getBoundingClientRect(), rs: Array.from(el.getClientRects()).filter(q => q.width > 2 && q.height > 2) })).filter(x => x.rs.length);
    const giao = (p: DOMRect, q: DOMRect) => {
        const w = Math.min(p.right, q.right) - Math.max(p.left, q.left);
        const hh = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
        return w > 2 && hh > 2 ? (w * hh) / Math.min(p.width * p.height, q.width * q.height) : 0;
    };
    for (let i = 0; i < hop.length; i++) for (let j = i + 1; j < hop.length; j++) {
        const a = hop[i], b = hop[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (!a.rs.some(p => b.rs.some(q => giao(p, q) >= 0.3))) continue;
        // khác "tầng" (popup/thanh fixed nổi lên trên nội dung) thì che nhau là đúng thiết kế
        const tang = (e: Element) => { let n: Element | null = e; while (n) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return n; n = n.parentElement; } return null; };
        if (tang(a.el) !== tang(b.el)) continue;
        const pa = getComputedStyle(a.el).position, pb = getComputedStyle(b.el).position;
        v.push({ loai: 'chu-chong-chu', ky: ten(a.el) + ten(b.el), chiTiet: `${ten(a.el)}[${pa}] ⨯ ${ten(b.el)}[${pb}] | ${cls(a.el)} || ${cls(b.el)}` });
    }
    // modal/popup: khối fixed lớn — kiểm có vượt màn hình, có cuộn được không
    for (const el of all) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < vw * 200) continue;
        for (const c of Array.from(el.querySelectorAll('*')).filter(nhin)) {
            const rc = c.getBoundingClientRect();
            if (rc.right > vw + 1 && !trongKhungCuon(c)) { v.push({ loai: 'modal-tran', ky: ten(c) + cls(c), chiTiet: `R${Math.round(rc.right)} ${ten(c)} | ${cls(c)}` }); break; }
        }
    }
    // Chạm thử vùng chạm vô hình (::after): cuộn nút ra giữa màn rồi elementFromPoint ở 4 mép
    // vùng 44px — mép nào không trúng nút (bị overflow cắt / bị thứ khác đè) là vùng chạm hỏng.
    const x0 = scrollX, y0 = scrollY;
    for (const { el, cw, ch } of canThu) {
        (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const diem = [[cx, cy - ch / 2 + 2], [cx, cy + ch / 2 - 2]];
        if (!(el.textContent || '').trim()) diem.push([cx - cw / 2 + 2, cy], [cx + cw / 2 - 2, cy]);
        // tâm nút không trúng chính nó = nút đang bị lớp khác (modal/popup) che → không xét
        const tam = document.elementFromPoint(cx, cy);
        if (!tam || !(tam === el || el.contains(tam))) continue;
        // mép rơi vào một nút/liên kết KHÁC ngay cạnh = 2 vùng chạm chia nhau (chấm phân trang, Lưu|Huỷ) → chấp nhận
        const hong = diem.filter(([x, y]) => { const h = document.elementFromPoint(x, y); if (h && (h === el || el.contains(h))) return false; return !(h && h.closest('button, a, [role="button"]')); });
        if (hong.length) v.push({ loai: 'cham<44px', ky: ten(el) + cls(el) + 'after', chiTiet: `vùng chạm ::after KHÔNG trúng (${hong.length}/${diem.length} mép) ${ten(el)} | ${cls(el)}` });
    }
    scrollTo({ left: x0, top: y0, behavior: 'instant' as ScrollBehavior });
    const svg = all.filter(e => e.tagName.toLowerCase() === 'svg' && e.closest('button, a, [role="tab"]') && !e.closest('.recharts-wrapper'))
        .map(e => Math.round(e.getBoundingClientRect().width));
    const icon: Record<string, number> = {};
    svg.forEach(s => { icon[s] = (icon[s] || 0) + 1; });
    const inputNho = all.filter(e => e.matches('input:not([type=checkbox]):not([type=radio]), textarea, select') && parseFloat(getComputedStyle(e).fontSize) < 16).length;
    return { v, icon, inputNho, tranNgang: document.documentElement.scrollWidth > document.documentElement.clientWidth, du: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

async function batDemo(page: Page) {
    await page.goto('/?tab=analysis');
    await page.waitForTimeout(1500);
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first();
    if (await demo.isVisible().catch(() => false)) { await demo.click(); await page.waitForTimeout(2500); }
}

async function doKhung(page: Page) {
    const kq = await page.evaluate(DO);
    for (const f of page.frames()) {
        if (f === page.mainFrame() || f.url() === 'about:blank') continue;
        try { const k = await f.evaluate(DO); kq.v.push(...k.v.map(x => ({ ...x, loai: x.loai + '(iframe)' }))); } catch { /* khác origin */ }
    }
    return kq;
}

for (const m of CHI) {
    test(`audit ${m.ten} @${RONG}`, async ({ page }) => {
        test.setTimeout(900_000);
        await page.setViewportSize({ width: RONG, height: CAO });
        await batDemo(page);
        const dir = `${process.env.AUDIT_OUT || "test-results/audit-iphone"}/${RONG}${process.env.AUDIT_SEED ? "-du-lieu" : ""}`;
        fs.mkdirSync(dir, { recursive: true });
        const coDuLieu = !!process.env.AUDIT_SEED;
        const napDuLieu = async () => {
            await page.setViewportSize({ width: 1280, height: 900 });
            await napDuLieuDesktop();
            await page.setViewportSize({ width: RONG, height: CAO });
            await page.waitForTimeout(1500);
            // Phân tích xử lý lại dữ liệu sau khi đổi khung → chờ lớp phủ "Đang gộp…" biến mất
            await page.getByText(/Đang gộp|AI ENGINE PROCESSING/i).first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
            await page.waitForTimeout(1500);
        };
        const napDuLieuDesktop = async () => {
            if (m.tab === 'analysis') {
                await page.goto('/?tab=analysis'); await page.waitForTimeout(1500);
                await page.locator('input[type="file"]').first().setInputFiles(process.env.AUDIT_XLSX || (await import('./helpers/salesFixture')).createSalesXlsx());
                await page.locator('.fixed.inset-0').getByText('Tệp Realtime (Xem nhanh)').first().click({ timeout: 15_000 });
                await page.getByText(/Doanh Thu/i).first().waitFor({ timeout: 45_000 }).catch(() => {});
                await page.waitForTimeout(2500);
            } else if (m.tab === 'employees') {
                await page.goto('/?tab=employees'); await page.waitForTimeout(2500);
                await page.getByRole('button', { name: /Cập nhật/i }).first().click();
                await page.waitForTimeout(800);
                await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
                const dan = async (ten: RegExp, idx: number, text: string) => {
                    await page.evaluate(t => navigator.clipboard.writeText(t), text);
                    await page.locator('h4').filter({ hasText: ten }).nth(idx).click();
                    await page.waitForTimeout(1500);
                };
                await dan(/Realtime/i, 0, SUMMARY_REALTIME);
                await dan(/Lu[ỹy] kế/i, 0, SUMMARY_LUYKE);
                await dan(/Lu[ỹy] kế/i, 1, COMPETITION_LUYKE);
                await page.getByRole('button', { name: /Siêu thị/i }).first().click().catch(() => {});
                await page.waitForTimeout(2500);
            }
        };
        const moMan = async () => {
            if (coDuLieu) { await napDuLieu(); return; }
            await page.goto(`/?tab=${m.tab}`); await page.waitForTimeout(3500);
        };
        await moMan();
        await page.screenshot({ path: `${dir}/${m.tab}.png`, fullPage: true });
        const goc = await doKhung(page);
        const gap = new Map<string, { loai: string; chiTiet: string; o: string[] }>();
        const ghi = (vs: { loai: string; ky: string; chiTiet: string }[], o: string) => vs.forEach(x => {
            const k = x.loai + x.ky; const g = gap.get(k);
            if (g) { if (g.o.length < 3 && !g.o.includes(o)) g.o.push(o); } else gap.set(k, { loai: x.loai, chiTiet: x.chiTiet, o: [o] });
        });
        ghi(goc.v, 'màn gốc');
        const icon = { ...goc.icon }; let inputNho = goc.inputNho; let tranNgang = goc.tranNgang ? [`màn gốc +${goc.du}px`] : [] as string[];

        // Danh sách nút có thể bấm (khử trùng theo nhãn)
        const daBam = new Set<string>(); let soBam = 0; let soModal = 0;
        for (let vong = 0; vong < MAX_CLICK; vong++) {
            const khung = page.frames().find(f => f !== page.mainFrame() && f.url().includes('check-thuong')) || page.mainFrame();
            const nut = await khung.evaluate((nguyHiem) => {
                const re = new RegExp(nguyHiem, 'i');
                const vw = document.documentElement.clientWidth;
                const cands = Array.from(document.querySelectorAll('button, [role="tab"], a[role="button"], [role="menuitem"], summary')) as HTMLElement[];
                return cands.map((el, i) => {
                    const r = el.getBoundingClientRect();
                    const nhan = ((el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) || el.getAttribute('title') || el.getAttribute('aria-label') || '[icon]') + '|' + (el.getAttribute('class') || '').slice(0, 40);
                    let an = false; let n: Element | null = el;
                    while (n) { if ((n.className?.toString?.() || '').includes('left-[-9999px]')) { an = true; break; } n = n.parentElement; }
                    const ok = !an && r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw && !(el as HTMLButtonElement).disabled && !re.test(nhan.split('|')[0]) && !el.closest('nav.fixed, [class*="bottom-0"][class*="fixed"]');
                    if (ok) el.setAttribute('data-audit-i', String(i));
                    return ok ? { i, nhan } : null;
                }).filter(Boolean) as { i: number; nhan: string }[];
            }, NGUY_HIEM.source);
            const tiep = nut.find(n => !daBam.has(n.nhan));
            if (!tiep) break;
            daBam.add(tiep.nhan);
            const url0 = page.url();
            const coModalTruoc = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width * e.getBoundingClientRect().height > innerWidth * innerHeight * 0.4).length);
            try {
                await khung.locator(`[data-audit-i="${tiep.i}"]`).first().click({ timeout: 2500 });
            } catch { continue; }
            soBam++;
            await page.waitForTimeout(800);
            if (page.url().split('?')[0] !== url0.split('?')[0] || !page.url().includes(m.tab)) { await moMan(); continue; }
            const k = await doKhung(page);
            const coModalSau = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width * e.getBoundingClientRect().height > innerWidth * innerHeight * 0.4).length);
            const nhanNgan = tiep.nhan.split('|')[0];
            if (coModalSau > coModalTruoc) {
                soModal++;
                await page.screenshot({ path: `${dir}/${m.tab}__modal-${soModal}.png` });
                ghi(k.v, `modal sau khi bấm "${nhanNgan}"`);
            } else ghi(k.v, `sau khi bấm "${nhanNgan}"`);
            Object.entries(k.icon).forEach(([s, c]) => { icon[s] = Math.max(icon[s] || 0, c); });
            inputNho = Math.max(inputNho, k.inputNho);
            if (k.tranNgang) tranNgang.push(`bấm "${nhanNgan}" +${k.du}px`);
            if (coModalSau > coModalTruoc) {
                await page.keyboard.press('Escape'); await page.waitForTimeout(300);
                const con = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width * e.getBoundingClientRect().height > innerWidth * innerHeight * 0.4).length);
                if (con > coModalTruoc) await moMan();
            }
        }
        tranNgang = tranNgang.slice(0, 10);
        const kq = { man: m.ten, tab: m.tab, rong: RONG, soBam, soModal, tranNgang, icon, inputNho, viPham: [...gap.values()] };
        fs.writeFileSync(`${dir}/${m.tab}.json`, JSON.stringify(kq, null, 1));
        const dem: Record<string, number> = {};
        kq.viPham.forEach(x => { dem[x.loai] = (dem[x.loai] || 0) + 1; });
        console.log(`[${m.ten}@${RONG}] bấm ${soBam}, modal ${soModal}, tràn ngang: ${tranNgang.length} ${JSON.stringify(dem)}`);
    });
}
