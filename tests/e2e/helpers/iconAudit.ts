import type { Page } from '@playwright/test';

/**
 * Bài AUDIT ICON dùng chung cho các spec chuẩn hoá icon (icon-audit-man-goc, icon-audit-bi…).
 * Đo trên trình duyệt thật màn đang hiển thị:
 *   - `legacy`: svg icon KHÔNG đi qua AppIcon (không có lớp .ycx-icon) — phải về 0;
 *   - `lech`: icon trong nút lệch tâm dọc > 1px so với nút (bỏ qua nút xếp dọc icon-trên-chữ);
 *   - `nutChuNhoHon`: icon nằm trong nút CÓ CHỮ nhưng nhỏ hơn token md (trừ vai trò phụ: mũi tên, đóng, sắp xếp, tích; trừ thanh
 *     capsule — chủ dự án chốt giữ 16px, 2026-10-15);
 *   - `vungCham`: nút chỉ có icon (kể cả nút thanh capsule), vùng chạm (kể cả `after:-inset-*`) dưới 44px trên điện thoại.
 */
export type IconAuditResult = { legacy: string[]; lech: string[]; nutChuNhoHon: string[]; vungCham: string[] };

/**
 * Chủ dự án CHỦ ĐỘNG hạ icon md → sm ở các nút dưới đây (f0a5558, 2026-10-10 "resolve mobile icon squishing") — SAU khi luật
 * `nutChuNhoHon` ra đời (2026-10-07). GĐ9 (2026-10-13) ghi nhận quyết định đó thay vì đổi ngược: khai HẸP theo [icon] + nhãn nên
 * vi phạm MỚI ở chỗ khác vẫn đỏ. Vùng chạm các nút này vẫn đủ 44 (bộ lọc cao 44px trên điện thoại). Chủ dự án muốn theo luật cũ:
 * đổi lại `size="md"` ở 3 file rồi xoá dòng tương ứng.
 */
const CHU_DU_AN_CHON_ICON_NHO: RegExp[] = [
    // Report BI: bộ lọc Siêu thị / Bộ phận (features/bi-dashboard/components/NhanVien.tsx, dashboard/DashboardHeader.tsx). Cỡ có thể
    // là số lẻ (vd 14.4px — chế độ mật độ gọn của Report BI thu cả nút) → `[\d.]+px`.
    / \[(store|restore)\] [\d.]+px$/,
    // In Sticker laptop: dải chế độ Giá sốc / Giờ vàng / Phiếu / Sticker (features/sticker-event/stickerprinter/StickerModeToolbar.tsx)
    /^(Giá Sốc|Giờ Vàng|Phiếu|Sticker)+ \[(success|product)\] [\d.]+px$/,
];

export async function auditIcons(page: Page, mobile: boolean, rootSelector?: string): Promise<IconAuditResult> {
    const r = await doIcons(page, mobile, rootSelector);
    return { ...r, nutChuNhoHon: r.nutChuNhoHon.filter(x => !CHU_DU_AN_CHON_ICON_NHO.some(re => re.test(x))) };
}

function doIcons(page: Page, mobile: boolean, rootSelector?: string): Promise<IconAuditResult> {
    return page.evaluate(({ mobile, rootSelector }) => {
        // `rootSelector`: chỉ đo bên trong vùng này (vd modal đang mở `[role="dialog"]`), mặc định cả trang.
        const roots: ParentNode[] = rootSelector ? Array.from(document.querySelectorAll(rootSelector)) : [document];
        const tim = (sel: string) => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));
        const nhin = (el: Element) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            const cs = getComputedStyle(el);
            return cs.visibility !== 'hidden' && cs.opacity !== '0';
        };
        const ten = (el: Element) => (el.getAttribute('data-icon') || el.getAttribute('class') || '').slice(0, 40);
        const legacy: string[] = [], lech: string[] = [], nutChuNhoHon: string[] = [], vungCham: string[] = [];
        // svg icon "trần" (lucide hoặc tự vẽ 24x24 viewBox) không qua AppIcon. Bỏ qua svg biểu đồ (recharts) và logo.
        for (const svg of tim('svg')) {
            if (!nhin(svg) || svg.closest('.recharts-wrapper, .recharts-surface')) continue;
            if (svg.classList.contains('ycx-icon')) continue;
            if (svg.getAttribute('viewBox') !== '0 0 24 24') continue;
            const r = svg.getBoundingClientRect();
            if (r.width > 64) continue;
            legacy.push(`${ten(svg)} ${Math.round(r.width)}px`);
        }
        const md = mobile ? 18 : 16;
        for (const btn of tim('button, [role="button"], a')) {
            if (!nhin(btn)) continue;
            const icons = Array.from(btn.querySelectorAll(':scope svg.ycx-icon')).filter(nhin);
            if (icons.length === 0) continue;
            const b = btn.getBoundingClientRect();
            const chu = (btn.textContent || '').replace(/\s+/g, ' ').trim();
            const nhan = (chu || btn.getAttribute('aria-label') || btn.getAttribute('title') || '?').slice(0, 30);
            // Thanh capsule (components/shared/ui/CapsuleBar.tsx, `[data-capsule-bar]`): chủ dự án CHỐT giữ icon 16px (2026-10-15, "Icon
            // thanh capsule: giữ"). Nút trông như nút ICON (nhãn chỉ để trình đọc màn hình đọc) → miễn luật icon md của nút có chữ, nhưng
            // VẪN đo vùng chạm 44 như nút icon (cuối vòng lặp).
            const thanhCapsule = !!btn.closest('[data-capsule-bar]');
            // Dòng danh sách kiểu Cài đặt iOS (ListRow): icon `sm` trong ô màu 28px — chủ dự án chốt (c9bfa6d, 2026-10-17), không
            // phải icon của nút có chữ thường. Nhận ra bằng `data-list-row-icon` (components/shared/ui/ListGroup.tsx).
            for (const ic of icons) {
                const r = ic.getBoundingClientRect();
                // chỉ xét icon là "con trực tiếp về bố cục" của nút: cùng hàng với nút (nút 1 hàng, cao < 60px)
                // nút xếp dọc (icon trên, chữ dưới — thanh điều hướng dưới) thì lệch dọc là đúng thiết kế
                const doc = getComputedStyle(btn).flexDirection.startsWith('column');
                if (b.height < 60 && !doc) {
                    // Thẳng hàng = icon cân giữa NÚT, hoặc cân giữa DÒNG CHỮ của nút (tab gạch chân chỉ đệm dưới:
                    // cả icon lẫn chữ cùng lệch khỏi tâm nút một khoảng như nhau — vẫn thẳng hàng với nhau).
                    let dyChu = Infinity;
                    const duyet = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
                    for (let n = duyet.nextNode(); n; n = duyet.nextNode()) {
                        if (!(n.textContent || '').trim()) continue;
                        const rg = document.createRange();
                        rg.selectNodeContents(n);
                        for (const tr of Array.from(rg.getClientRects())) {
                            dyChu = Math.min(dyChu, Math.abs((r.top + r.height / 2) - (tr.top + tr.height / 2)));
                        }
                    }
                    const dy = Math.min(dyChu, Math.abs((r.top + r.height / 2) - (b.top + b.height / 2)));
                    if (dy > 1.01) lech.push(`${nhan} [${ten(ic)}] lệch ${dy.toFixed(1)}px`);
                }
                const vaiTroPhu = /chevron|close|sort|check$/.test(ic.getAttribute('data-icon') || '');
                // Liên kết NẰM TRONG CÂU (<a> trong <p>/<li>) đi theo cỡ chữ của câu — không phải nút thanh công cụ.
                const lienKetTrongCau = btn.tagName === 'A' && !!btn.closest('p, li');
                // Dòng phụ dưới tiêu đề thanh trên ("↻ Cập nhật: 15:13" — chạm để đồng bộ, chủ dự án thêm 2026-10-11 ở Report BI /
                // Check thưởng) là dòng CHÚ THÍCH 12px: icon đi theo cỡ chữ của dòng như liên kết trong câu, không phải nút thanh công
                // cụ. Vùng chạm của nó do styles.css (.ycx-navbar #mobile-topbar-subtitle) nới đủ 44 — mục `vungCham` vẫn đo.
                const dongPhuThanhTren = !!btn.closest('#mobile-topbar-subtitle, #desktop-header-subtitle');
                const oIconDongDanhSach = !!ic.closest('[data-list-row-icon]');
                if (chu && !vaiTroPhu && !lienKetTrongCau && !dongPhuThanhTren && !thanhCapsule && !oIconDongDanhSach && b.height < 60 && r.width < md) nutChuNhoHon.push(`${nhan} [${ten(ic)}] ${r.width}px`);
            }
            // Vùng chạm thật = hộp nút + vùng mở rộng vô hình `after:-inset-*` (mẫu dùng ở dòng dữ liệu dày)
            const af = getComputedStyle(btn, '::after');
            const mo = af.content !== 'none' && af.position === 'absolute';
            const vw = mo ? b.width - (parseFloat(af.left) || 0) - (parseFloat(af.right) || 0) : b.width;
            const vh = mo ? b.height - (parseFloat(af.top) || 0) - (parseFloat(af.bottom) || 0) : b.height;
            if (mobile && (!chu || thanhCapsule) && Math.min(vw, vh) < 43.5) vungCham.push(`${nhan} ${Math.round(vw)}x${Math.round(vh)} ${btn.outerHTML.slice(0, 160)}`);
        }
        return { legacy, lech, nutChuNhoHon, vungCham };
    }, { mobile, rootSelector });
}
