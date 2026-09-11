import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import type { Page } from '@playwright/test';

/**
 * ĐƯỜNG KẺ DỌC CỦA CÁC BẢNG DÀY — lưới an toàn cho chuẩn "Bảng điều khiển ca trực".
 *
 * Chuẩn (xem CLAUDE.md §2 và `colEdge` trong CompetitionSummaryView.tsx): sau khi BỎ nền màu phân
 * nhóm cột, việc phân nhóm chuyển hết sang VIỀN — 2px ở đầu mỗi nhóm và ở mép cột ghim, 1px giữa
 * các cột. Lỗi đã tái diễn BỐN lần vì cùng một dạng sai: ô có MÀU viền (`border-slate-200`) nhưng
 * không bật CẠNH nào (`border-r`), nên không vẽ gì cả. Test này chặn nó quay lại.
 *
 * ⚠️ PHÉP ĐO PHẢI LÀ HÌNH HỌC 2 CHIỀU, KHÔNG PHẢI THEO HÀNG.
 * Hai lần đo trước đều sai vì so ô cạnh nhau trong cùng `<tr>`:
 *   - Lần 1 chỉ đếm `border-right` ⇒ báo nhầm 8 ô ở hàng tiêu đề nhóm, vì chúng phân tách bằng
 *     `border-left` của ô kế tiếp — `border-collapse` khiến hai cái đó là CÙNG MỘT NÉT.
 *   - Lần 2 so theo cặp trong một hàng ⇒ mù với ô `rowSpan`: ô ghim "Nhân viên" nằm ở hàng 0 nhưng
 *     phủ cả hàng 1, nên vừa bỏ sót nét đứt thật ở hàng 1, vừa BÁO NHẦM nét đứt ở chỗ có nét.
 * Cách đúng: gom mọi cạnh viền dọc thành các ĐOẠN THẲNG (x, y0, y1) rồi kiểm xem tại mỗi ranh giới
 * cột, các đoạn có phủ kín chiều cao bảng hay không. Cách này không quan tâm ô nằm ở hàng nào.
 */
test.skip(!hasRealDataProfile(), 'cần .e2e-chrome-profile — chạy node scripts/e2e-auth-setup.mjs');

/** Dung sai gộp toạ độ x (px) — trình duyệt trả về toạ độ lẻ do zoom/scale. */
const X_TOL = 1.5;
/** Khe hở dọc bỏ qua (px) — viền vẽ theo biên ô nên luôn lệch vài phần mười pixel. */
const GAP_TOL = 2;

type Gap = { after: string; widths: number[]; gaps: string[] };

async function auditTable(page: Page): Promise<{ table: number; bounds: number; w2: number; w1: number; broken: Gap[] }[]> {
    return page.evaluate(({ X_TOL, GAP_TOL }) => {
        const results: { table: number; bounds: number; w2: number; w1: number; broken: Gap[] }[] = [];
        type Gap = { after: string; widths: number[]; gaps: string[] };

        document.querySelectorAll('table').forEach((table, ti) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length < 2) return;

            const rowBands = rows.map(tr => {
                const r = tr.getBoundingClientRect();
                const first = tr.querySelector('th,td');
                return { top: r.top, bottom: r.bottom, label: (first?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14) };
            });

            // Mọi cạnh viền DỌC thực sự được vẽ, dưới dạng đoạn thẳng.
            const segs: { x: number; y0: number; y1: number; w: number }[] = [];
            const cells = Array.from(table.querySelectorAll('th,td'));
            cells.forEach(el => {
                const b = el.getBoundingClientRect();
                const s = getComputedStyle(el);
                const bl = s.borderLeftStyle === 'none' ? 0 : parseFloat(s.borderLeftWidth) || 0;
                const br = s.borderRightStyle === 'none' ? 0 : parseFloat(s.borderRightWidth) || 0;
                if (bl >= 1) segs.push({ x: b.left, y0: b.top, y1: b.bottom, w: bl });
                if (br >= 1) segs.push({ x: b.right, y0: b.top, y1: b.bottom, w: br });
            });

            // Mốc ranh giới lấy từ hàng có NHIỀU ô nhất (hàng đủ mọi cột).
            const widest = rows
                .map(tr => Array.from(tr.querySelectorAll('th,td')))
                .reduce((a, b) => (b.length > a.length ? b : a));
            const bounds = widest.slice(0, -1).map(el => ({
                x: el.getBoundingClientRect().right,
                after: (el.textContent || '').trim().replace(/\s+/g, ' ').replace(/^⋮⋮/, '').slice(0, 14),
            }));

            const top = Math.min(...rowBands.map(r => r.top));
            const bottom = Math.max(...rowBands.map(r => r.bottom));

            let w2 = 0, w1 = 0;
            const broken: Gap[] = [];

            bounds.forEach(({ x, after }) => {
                const here = segs.filter(s => Math.abs(s.x - x) <= X_TOL);
                const widths = [...new Set(here.map(s => s.w))].sort((a, b) => a - b);

                // Vùng MIỄN TRỪ: ô `colSpan` trải NGANG qua ranh giới này (tiêu đề nhóm gộp nhiều
                // cột). Bên trong một ô như vậy thì KHÔNG được có nét dọc — đó mới là đúng chuẩn.
                const spanned = cells
                    .map(el => el.getBoundingClientRect())
                    .filter(b => b.left < x - X_TOL && b.right > x + X_TOL)
                    .map(b => ({ y0: b.top, y1: b.bottom }));
                const exempt = (y0: number, y1: number) =>
                    spanned.some(s => s.y0 <= y0 + GAP_TOL && s.y1 >= y1 - GAP_TOL);

                // Gộp các đoạn chồng lấn rồi tìm khe hở so với chiều cao bảng.
                const merged: { y0: number; y1: number }[] = [];
                here.slice().sort((a, b) => a.y0 - b.y0).forEach(s => {
                    const last = merged[merged.length - 1];
                    if (last && s.y0 <= last.y1 + GAP_TOL) last.y1 = Math.max(last.y1, s.y1);
                    else merged.push({ y0: s.y0, y1: s.y1 });
                });

                const raw: { y0: number; y1: number }[] = [];
                let cur = top;
                merged.forEach(m => {
                    if (m.y0 - cur > GAP_TOL) raw.push({ y0: cur, y1: m.y0 });
                    cur = Math.max(cur, m.y1);
                });
                if (bottom - cur > GAP_TOL) raw.push({ y0: cur, y1: bottom });

                // Bỏ khe hở nào nằm trọn trong vùng miễn trừ, và cắt bớt phần chồng lấn.
                const holes = raw.flatMap(h => {
                    let parts = [h];
                    spanned.forEach(s => {
                        parts = parts.flatMap(p => {
                            const segsOut: { y0: number; y1: number }[] = [];
                            if (p.y0 < s.y0 - GAP_TOL) segsOut.push({ y0: p.y0, y1: Math.min(p.y1, s.y0) });
                            if (p.y1 > s.y1 + GAP_TOL) segsOut.push({ y0: Math.max(p.y0, s.y1), y1: p.y1 });
                            return s.y0 <= p.y1 && s.y1 >= p.y0 ? segsOut : [p];
                        });
                    });
                    return parts.filter(p => p.y1 - p.y0 > GAP_TOL && !exempt(p.y0, p.y1));
                });

                if (holes.length) {
                    broken.push({
                        after,
                        widths,
                        gaps: holes.map(h => {
                            const hit = rowBands
                                .map((r, i) => ({ i, r }))
                                .filter(({ r }) => r.bottom > h.y0 + GAP_TOL && r.top < h.y1 - GAP_TOL)
                                .map(({ i, r }) => `hàng ${i} "${r.label}"`);
                            return hit.length ? hit.join(', ') : `y ${Math.round(h.y0)}→${Math.round(h.y1)}`;
                        }),
                    });
                } else if (widths.some(w => w >= 2)) w2++;
                else w1++;
            });

            results.push({ table: ti, bounds: bounds.length, w2, w1, broken });
        });
        return results;
    }, { X_TOL, GAP_TOL });
}

function report(name: string, res: Awaited<ReturnType<typeof auditTable>>) {
    const lines = res.map(r =>
        `  ${name} · bảng ${r.table}: ${r.bounds} ranh giới | ${r.w2} nét NHÓM 2px, ${r.w1} nét CỘT 1px | ` +
        (r.broken.length
            ? `⚠️ ĐỨT ${r.broken.length}\n` + r.broken.map(b => `      sau "${b.after}" (dày ${b.widths.join('/') || '0'}px) hở: ${b.gaps.join(' | ')}`).join('\n')
            : '✅ 0 đứt'));
    console.log(lines.join('\n'));
    return res.flatMap(r => r.broken.map(b => `bảng ${r.table} sau "${b.after}": ${b.gaps.join(' | ')}`));
}

async function openReportBi(page: Page) {
    await page.goto('/');
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 60_000 });
    await sidebar.locator('button:has(svg.lucide-users)').first().click();
    await page.getByRole('button', { name: /Tổng quan/i }).first().waitFor({ timeout: 30_000 });
}

const SCREENS: { name: string; go: (page: Page) => Promise<void> }[] = [
    {
        // CompetitionSummaryView — bảng 48 cột, nhiều nhóm cột nhất nên dễ lộ lỗi nhất.
        name: 'Bảng 48 cột (Nhân viên › Thi đua › Tổng)',
        go: async page => {
            await page.getByRole('button', { name: /Nhân viên/i }).first().click({ timeout: 40_000 });
            await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
            await page.getByRole('button', { name: 'Tổng', exact: true }).first().click({ timeout: 30_000 });
        },
    },
    {
        name: 'Thi đua Luỹ kế (Tổng quan › Thi đua)',
        go: async page => {
            await page.getByRole('button', { name: /Tổng quan/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click({ timeout: 30_000 });
            await page.getByText('Luỹ kế', { exact: true }).first().click();
        },
    },
    {
        // 2 bảng cùng màn: Tổng quan Siêu thị + Chi tiết Ngành hàng (pivot).
        name: 'Tổng quan Siêu thị (Tổng quan › Doanh thu)',
        go: async page => {
            await page.getByRole('button', { name: /Tổng quan/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Doanh thu', exact: true }).first().click({ timeout: 30_000 });
        },
    },
];

for (const screen of SCREENS) {
    test(`đường kẻ dọc liền mạch: ${screen.name}`, async ({ page }) => {
        await openReportBi(page);
        await screen.go(page);
        await page.locator('table tbody tr').first().waitFor({ timeout: 30_000 });
        // Bảng render theo nhiều nhịp (dữ liệu → nhóm cột → sticky); chờ cho layout ổn định
        // rồi mới đo toạ độ, nếu không sẽ đo nhầm lúc cột chưa đủ.
        await page.waitForTimeout(3_000);

        const broken = report(screen.name, await auditTable(page));
        expect(broken, 'mọi ranh giới cột phải được kẻ liền mạch suốt chiều cao bảng').toEqual([]);
    });
}
