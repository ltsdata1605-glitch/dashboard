import type { Page } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Bộ đồ nghề CHỤP ẢNH SỐ LIỆU màn hình, để so TRƯỚC/SAU khi đổi code.
 *
 * Sinh ra trong Đợt 1 của dự án làm lại Report BI, và là điều kiện cần cho Đợt 3: khi dựng lại
 * giao diện, cách duy nhất chứng minh "giữ nguyên chức năng" là chụp toàn bộ con số màn hình cũ
 * đang hiển thị, dựng màn hình mới, rồi đối chiếu từng ô.
 *
 * Chụp NỘI DUNG CHỮ của bảng chứ không phải ảnh pixel — vì mục tiêu là số liệu không đổi, còn giao
 * diện thì CỐ Ý đổi. So ảnh pixel sẽ đỏ toàn bộ và vô dụng cho việc này.
 */

export interface TableSnapshot {
    index: number;
    headers: string[];
    rows: string[][];
    foot: string[][];
}

/** Đọc mọi <table> đang hiển thị trên trang thành dữ liệu chữ. */
export async function captureTables(page: Page): Promise<TableSnapshot[]> {
    return page.evaluate(() => {
        const clean = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('table')).map((t, index) => ({
            index,
            headers: Array.from(t.querySelectorAll('thead th')).map(clean),
            rows: Array.from(t.querySelectorAll('tbody tr')).map(tr =>
                Array.from(tr.querySelectorAll('td')).map(clean)
            ),
            foot: Array.from(t.querySelectorAll('tfoot tr')).map(tr =>
                Array.from(tr.querySelectorAll('td,th')).map(clean)
            ),
        }));
    });
}

/**
 * Ảnh chụp lưu ở `.ui-baseline/` NGOÀI `test-results/`.
 *
 * QUAN TRỌNG: Playwright XOÁ SẠCH `test-results/` trước mỗi lần chạy. Để baseline ở đó thì ảnh
 * "before" bị mất, `loadSnapshot` trả null, và phép so bị BỎ QUA ÂM THẦM — test xanh dù số liệu
 * đã lệch. Đã mắc đúng lỗi này một lần khi dựng công cụ; đừng chuyển ngược lại.
 */
const snapPath = (label: string, name: string) =>
    resolve(process.cwd(), '.ui-baseline', label, `${name}.json`);

/** Ghi ảnh chụp ra `.ui-baseline/<label>/<name>.json`. `label` thường là 'before' / 'after'. */
export function saveSnapshot(label: string, name: string, data: TableSnapshot[]): string {
    const p = snapPath(label, name);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    return p;
}

export function loadSnapshot(label: string, name: string): TableSnapshot[] | null {
    const p = snapPath(label, name);
    return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf-8')) as TableSnapshot[]) : null;
}

export const countCells = (s: TableSnapshot[]): number =>
    s.reduce((n, t) => n + t.rows.reduce((a, r) => a + r.length, 0), 0);

/**
 * So 2 ảnh chụp, trả về danh sách khác biệt ở dạng đọc được.
 * Rỗng = giống hệt.
 */
export function diffSnapshots(before: TableSnapshot[], after: TableSnapshot[]): string[] {
    const out: string[] = [];
    if (before.length !== after.length) {
        out.push(`số bảng: ${before.length} → ${after.length}`);
    }
    const n = Math.min(before.length, after.length);
    for (let i = 0; i < n; i++) {
        const b = before[i], a = after[i];
        if (b.headers.join('|') !== a.headers.join('|')) {
            out.push(`bảng ${i} — cột: [${b.headers.join(', ')}] → [${a.headers.join(', ')}]`);
        }
        if (b.rows.length !== a.rows.length) {
            out.push(`bảng ${i} — số dòng: ${b.rows.length} → ${a.rows.length}`);
        }
        const rn = Math.min(b.rows.length, a.rows.length);
        for (let r = 0; r < rn; r++) {
            const cn = Math.max(b.rows[r].length, a.rows[r].length);
            for (let c = 0; c < cn; c++) {
                const bv = b.rows[r][c] ?? '(thiếu)';
                const av = a.rows[r][c] ?? '(thiếu)';
                if (bv !== av) {
                    const col = b.headers[c] ?? `cột ${c}`;
                    out.push(`bảng ${i} dòng ${r} [${col}]: "${bv}" → "${av}"`);
                }
            }
        }
    }
    return out;
}
