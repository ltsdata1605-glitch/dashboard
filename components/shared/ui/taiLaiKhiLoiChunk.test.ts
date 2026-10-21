import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tự tải lại khi lỗi chunk — trừ khi trang đang rời đi (2026-10-20: CI WebKit "Frame load interrupted" — WebKit huỷ import dở
 * dang lúc bắt đầu điều hướng, app tưởng là bản mới nên tự tải lại, giành mất lượt điều hướng).
 */
type Nghe = Record<string, Array<() => void>>;
const G = globalThis as unknown as { window?: unknown; __ycxDangRoiTrang?: boolean; __ycxNgheRoiTrang?: boolean };

let nghe: Nghe;
let reload: ReturnType<typeof vi.fn>;
const phat = (ten: string) => (nghe[ten] || []).forEach((f) => f());

const napModule = async () => {
    vi.resetModules();
    return import('./taiLaiKhiLoiChunk');
};

beforeEach(() => {
    vi.useFakeTimers();
    nghe = {};
    reload = vi.fn();
    G.window = {
        addEventListener: (ten: string, f: () => void) => { (nghe[ten] ||= []).push(f); },
        location: { reload },
    };
    delete G.__ycxDangRoiTrang;
    delete G.__ycxNgheRoiTrang;
});

afterEach(() => {
    vi.useRealTimers();
    delete G.window;
    delete G.__ycxDangRoiTrang;
    delete G.__ycxNgheRoiTrang;
});

describe('taiLaiKhiLoiChunk', () => {
    it('trang đang sống: chờ một nhịp rồi tải lại, chạy việc trước khi tải lại', async () => {
        const { taiLaiKhiLoiChunk } = await napModule();
        const truocKhi = vi.fn();
        taiLaiKhiLoiChunk(truocKhi);
        expect(reload).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(800);
        expect(truocKhi).toHaveBeenCalledTimes(1);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('beforeunload trước khi lỗi (người dùng tải lại / chuyển trang) → không tải lại', async () => {
        const { taiLaiKhiLoiChunk } = await napModule();
        phat('beforeunload');
        taiLaiKhiLoiChunk();
        await vi.advanceTimersByTimeAsync(2000);
        expect(reload).not.toHaveBeenCalled();
    });

    it('rời trang TRONG lúc chờ (iOS: lỗi tới trước pagehide) → không tải lại', async () => {
        const { taiLaiKhiLoiChunk } = await napModule();
        const truocKhi = vi.fn();
        taiLaiKhiLoiChunk(truocKhi);
        await vi.advanceTimersByTimeAsync(300);
        phat('pagehide');
        await vi.advanceTimersByTimeAsync(1000);
        expect(truocKhi).not.toHaveBeenCalled();
        expect(reload).not.toHaveBeenCalled();
    });

    it('quay lại từ bfcache (pageshow) hoặc hộp "rời trang?" bị huỷ (sau 3 s) → tự tải lại khi lỗi chunk hoạt động lại', async () => {
        const { taiLaiKhiLoiChunk, dangRoiTrang } = await napModule();
        phat('pagehide');
        expect(dangRoiTrang()).toBe(true);
        phat('pageshow');
        expect(dangRoiTrang()).toBe(false);

        phat('beforeunload');
        await vi.advanceTimersByTimeAsync(3000);
        expect(dangRoiTrang()).toBe(false);
        taiLaiKhiLoiChunk();
        await vi.advanceTimersByTimeAsync(800);
        expect(reload).toHaveBeenCalledTimes(1);
    });
});

describe('duocTuTaiLai — chặn vòng tự tải lại (2026-10-21)', () => {
    beforeEach(() => {
        const m = new Map<string, string>();
        (globalThis as unknown as { sessionStorage: Pick<Storage, 'getItem' | 'setItem'> }).sessionStorage = {
            getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); },
        };
    });
    afterEach(() => { delete (globalThis as { sessionStorage?: unknown }).sessionStorage; });

    it('tối đa 2 lần trong 5 phút, cách nhau ≥ 10 giây', async () => {
        const { duocTuTaiLai } = await import('./taiLaiKhiLoiChunk');
        const t = 1_000_000_000;
        expect(duocTuTaiLai(t)).toBe(true);
        expect(duocTuTaiLai(t + 5_000)).toBe(false);   // chưa đủ 10 giây
        expect(duocTuTaiLai(t + 11_000)).toBe(true);
        expect(duocTuTaiLai(t + 22_000)).toBe(false);  // hết 2 lượt — trước đây cứ mỗi 10 giây lại tải lại
        expect(duocTuTaiLai(t + 120_000)).toBe(false);
        expect(duocTuTaiLai(t + 301_000)).toBe(true);  // qua 5 phút: lượt đầu đã hết hạn
    });

    it('khớp đúng khoá với public/reload-on-chunk-error.js', async () => {
        const fs = await import('node:fs');
        const src = fs.readFileSync('public/reload-on-chunk-error.js', 'utf8');
        expect(src).toContain("'ycx_chunk_reloads'");
        expect(src).toContain('ds.length >= 2');
        expect(src).not.toMatch(/now - Number\(lastReload\) > 10000\)\s*\{\s*sessionStorage/);
    });
});
