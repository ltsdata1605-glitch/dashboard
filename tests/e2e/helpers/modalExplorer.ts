import type { Page } from '@playwright/test';
import { auditIcons, type IconAuditResult } from './iconAudit';

/**
 * TỰ KHÁM PHÁ MODAL để audit icon (2026-10-07) — dùng cho `icon-audit-modal.spec.ts`.
 *
 * Ở một "màn" (mở được lại bằng `veMan`), bấm lần lượt từng nút AN TOÀN đang hiện. Nút nào làm hiện một lớp nổi mới
 * (mọi phần tử `position: fixed` vừa xuất hiện: modal, ngăn kéo, bảng nổi — không dựa vào `role="dialog"` vì nhiều
 * ngăn kéo không gắn role) thì đo icon trong lớp đó, rồi KHÁM PHÁ TIẾP các nút an toàn bên trong lớp đó (modal con),
 * tối đa `doSau` tầng. Mỗi lượt bấm đều mở lại màn từ đầu bằng `veMan` + bấm lại đường đi, nên lượt trước không làm
 * bẩn lượt sau.
 */
export const NUT_NGUY_HIEM = /xo[áa]|x[óo]a|delete|đăng xuất|logout|g[ửu]i|send|xuất|export|tải|download|upload|lưu|save|đồng bộ|sync|tự động|chạy|run|(^|\s)in(\s|$)|print|reset|khôi phục|đặt lại|làm mới|refresh|đăng nhập|login|google|chụp|camera|copy|sao chép|dán|paste|chia sẻ|share|duyệt|từ chối|nâng cấp|cài tiện ích|cài script|install|mở link|zalo|kích hoạt|dùng thử|bật|tắt|huỷ|hủy|thoát|đóng|close|quay lại|back|thu gọn|mở rộng|toàn màn|fullscreen|nhập file|chọn file|xác nhận|đồng ý|áp dụng|hoàn tất|cập nhật|nạp|^-$|tăng|giảm|^\d+$|^[<>]$/i;

export type KetQuaModal = Record<string, IconAuditResult>;

const NGOAI_TRU = 'nav, aside, [data-mobile-bottom-nav]';

/** Nhãn các nút đang HIỆN trong `pham vi` (lớp nổi trên cùng đã đánh dấu, hoặc cả trang ngoài mọi lớp nổi). */
async function nhanNut(page: Page, trongLop: boolean): Promise<string[]> {
    return page.evaluate(({ trongLop, ngoaiTru }) => {
        const out: string[] = [];
        const goc: ParentNode[] = trongLop ? Array.from(document.querySelectorAll('[data-audit-modal]')) : [document];
        for (const g of goc) for (const b of Array.from(g.querySelectorAll('button, [role="button"]'))) {
            if (!trongLop && b.closest(ngoaiTru + ', [role="dialog"], [aria-modal="true"]')) continue;
            const r = b.getBoundingClientRect();
            if (!r.width || !r.height || (b as HTMLButtonElement).disabled) continue;
            const nhan = ((b.textContent || '').replace(/\s+/g, ' ').trim() || b.getAttribute('aria-label') || b.getAttribute('title') || '').slice(0, 60);
            if (nhan && !out.includes(nhan)) out.push(nhan);
        }
        return out;
    }, { trongLop, ngoaiTru: NGOAI_TRU });
}

/** Bấm nút ĐANG HIỆN có đúng nhãn; ưu tiên bản nằm SAU CÙNG trong DOM (modal render ở cuối body → bản trong modal). */
async function bamNhan(page: Page, nhan: string): Promise<boolean> {
    const co = await page.evaluate(({ nhan, ngoaiTru }) => {
        document.querySelectorAll('[data-audit-target]').forEach((e) => e.removeAttribute('data-audit-target'));
        const ds = Array.from(document.querySelectorAll('button, [role="button"]')).filter((b) => {
            if (b.closest(ngoaiTru)) return false;
            const r = b.getBoundingClientRect();
            if (!r.width || !r.height) return false;
            const n = ((b.textContent || '').replace(/\s+/g, ' ').trim() || b.getAttribute('aria-label') || b.getAttribute('title') || '').slice(0, 60);
            return n === nhan;
        });
        const b = ds[ds.length - 1];
        if (!b) return false;
        b.setAttribute('data-audit-target', '1');
        return true;
    }, { nhan, ngoaiTru: NGOAI_TRU });
    if (!co) return false;
    await page.locator('[data-audit-target]').first().click({ timeout: 2500 }).catch(() => undefined);
    await page.waitForTimeout(700);
    return true;
}

const danhDauLopCu = (page: Page) => page.evaluate(() => {
    document.querySelectorAll('[data-audit-modal]').forEach((e) => e.removeAttribute('data-audit-modal'));
    for (const e of Array.from(document.body.querySelectorAll('*'))) {
        if (getComputedStyle(e).position === 'fixed') e.setAttribute('data-audit-old', '1');
    }
});

/** Đánh dấu lớp nổi MỚI (ngoài cùng) vừa hiện; trả tiêu đề hoặc null. */
const danhDauLopMoi = (page: Page): Promise<string | null> => page.evaluate(() => {
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

/** Mở lại màn rồi bấm lại đường đi `duong`; trả tiêu đề lớp nổi của bước cuối (null nếu không mở được). */
async function diLai(page: Page, veMan: () => Promise<void>, duong: string[]): Promise<string | null> {
    await veMan();
    let ten: string | null = null;
    for (const nhan of duong) {
        await danhDauLopCu(page);
        if (!(await bamNhan(page, nhan))) return null;
        ten = await danhDauLopMoi(page);
        if (!ten) return null;
    }
    return ten;
}

export async function khamPhaModal(page: Page, opts: {
    ten: string; veMan: () => Promise<void>; mobile: boolean; ketQua: KetQuaModal;
    doSau?: number; toiDa?: number; log?: (s: string) => void;
    /** Màn gốc đã là một lớp nổi đang mở (đánh dấu `data-audit-modal`) → chỉ tìm nút trong lớp đó. */
    gocLaLop?: boolean;
}) {
    const { ten, veMan, mobile, ketQua, doSau = 2, toiDa = 40, log = console.log, gocLaLop = false } = opts;
    const duyet = async (duong: string[], tenDuong: string[]) => {
        if (duong.length) {
            const tieuDe = await diLai(page, veMan, duong);
            if (!tieuDe) return;
        } else {
            await veMan();
        }
        const tatCa = await nhanNut(page, gocLaLop || duong.length > 0);
        const nut = tatCa.filter((n) => !NUT_NGUY_HIEM.test(n)).slice(0, duong.length ? 15 : toiDa);
        if (!duong.length) log(`[${ten}] bấm thử ${nut.length}/${tatCa.length}`);
        for (const nhan of nut) {
            const tieuDe = await diLai(page, veMan, [...duong, nhan]);
            if (!tieuDe) continue;
            const khoa = [ten, ...tenDuong, `${nhan} → ${tieuDe}`].join(' › ');
            if (Object.keys(ketQua).some((k) => k.endsWith(`→ ${tieuDe}`))) continue; // modal này đã đo qua đường khác
            ketQua[khoa] = await auditIcons(page, mobile, '[data-audit-modal]');
            if (duong.length + 1 < doSau) await duyet([...duong, nhan], [...tenDuong, `${nhan} → ${tieuDe}`]);
        }
    };
    await duyet([], []);
}

/** Lớp nổi mở bằng thao tác KHÔNG phải nút (bấm dòng bảng…): mở rồi đo, rồi khám phá tiếp bên trong 1 tầng. */
export async function doLopMoBang(page: Page, opts: {
    ten: string; veMan: () => Promise<void>; mo: () => Promise<void>; mobile: boolean; ketQua: KetQuaModal;
}) {
    const { ten, veMan, mo, mobile, ketQua } = opts;
    const veLop = async () => {
        await veMan();
        await danhDauLopCu(page);
        await mo();
        await page.waitForTimeout(900);
        if (!(await danhDauLopMoi(page))) throw new Error(`${ten}: không mở được lớp nổi`);
    };
    await veLop();
    const tieuDe = await page.evaluate(() => (document.querySelector('[data-audit-modal] h1, [data-audit-modal] h2, [data-audit-modal] h3')?.textContent || '').trim().slice(0, 50));
    ketQua[`${ten} → ${tieuDe}`] = await auditIcons(page, mobile, '[data-audit-modal]');
    await khamPhaModal(page, { ten: `${ten} → ${tieuDe}`, veMan: veLop, mobile, ketQua, doSau: 1, toiDa: 15, gocLaLop: true });
}
