/**
 * Audit 2026-10-07 — GĐ2a (D02/D03). Chạy THẬT uploadKhoSalesData / fetchAllowedKhoData trên Firestore
 * giả trong bộ nhớ:
 *  - Đồng bộ CÙNG dữ liệu nhiều lần → tổng doanh thu Kho KHÔNG đổi (trước: x2, x3...).
 *  - Dữ liệu cũ đã bị nhân bản từ trước (nhiều bản chụp auto-id) → đọc ra KHÔNG trùng.
 *  - Thiếu chunk → báo lỗi, không trả về "thành công" với một nửa dữ liệu.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DataRow } from '../../types';

interface Ref { path: string; id: string }
const store = new Map<string, Record<string, unknown>>();
const settings = new Map<string, unknown>();

vi.mock('../../services/firebase', () => ({ db: { __isDb: true }, auth: { currentUser: null }, functions: {}, app: {} }));
vi.mock('../../services/dbService', () => ({
    getSetting: async (k: string) => settings.get(k) ?? null,
    saveSetting: async (k: string, v: unknown) => { settings.set(k, v); },
    deleteSetting: async (k: string) => { settings.delete(k); },
    getAllSettings: async () => Object.fromEntries(settings),
}));
let autoId = 0;
vi.mock('firebase/firestore', () => {
    const join = (first: unknown, rest: string[]) => {
        const base = (first as Ref)?.path;
        return base ? [base, ...rest].join('/') : rest.join('/');
    };
    const mkRef = (path: string): Ref => ({ path, id: path.split('/').pop()! });
    return {
        doc: (first: unknown, ...rest: string[]) => mkRef(rest.length ? join(first, rest) : `${(first as Ref).path}/auto${++autoId}`),
        collection: (first: unknown, ...rest: string[]) => mkRef(join(first, rest)),
        getDoc: async (ref: Ref) => ({ exists: () => store.has(ref.path), data: () => store.get(ref.path) }),
        getDocs: async (ref: Ref) => {
            const docs = [...store.entries()]
                .filter(([p]) => p.startsWith(`${ref.path}/`) && !p.slice(ref.path.length + 1).includes('/'))
                .map(([p, d]) => ({ id: p.split('/').pop()!, ref: mkRef(p), data: () => d }));
            return { docs, empty: docs.length === 0, forEach: (fn: (d: unknown) => void) => docs.forEach(fn) };
        },
        updateDoc: async (ref: Ref, v: Record<string, unknown>) => { store.set(ref.path, { ...store.get(ref.path), ...v }); },
        deleteDoc: async (ref: Ref) => { store.delete(ref.path); },
        writeBatch: () => {
            const q: Array<() => void> = [];
            return {
                set: (ref: Ref, v: Record<string, unknown>) => q.push(() => store.set(ref.path, JSON.parse(JSON.stringify(v)))),
                delete: (ref: Ref) => q.push(() => store.delete(ref.path)),
                commit: async () => q.forEach((f) => f()),
            };
        },
        serverTimestamp: () => 'ts',
    };
});

const kho = await import('../../services/khoDataService');
const user = { uid: 'mgrA', email: 'a@x' } as never;

const row = (date: string, revenue: number): DataRow => ({ 'Mã kho tạo': '910', 'Ngày tạo': date, parsedDate: new Date(date), 'Doanh thu': revenue } as unknown as DataRow);
const DATA = [row('2026-09-03', 1_000_000), row('2026-09-20', 2_000_000), row('2026-10-01', 500_000)];
const total = (rows: DataRow[]) => rows.reduce((s, r) => s + Number((r as unknown as Record<string, number>)['Doanh thu']), 0);

beforeEach(() => { store.clear(); settings.clear(); autoId = 0; });

describe('D02 — đồng bộ Kho không nhân đôi', () => {
    it('đồng bộ cùng dữ liệu 5 lần: tổng doanh thu vẫn 3,5 triệu', async () => {
        for (let i = 0; i < 5; i++) await kho.uploadKhoSalesData(user, '910', DATA, 'bc.xlsx', 1, false);
        const { data } = await kho.fetchAllowedKhoData('910');
        expect(total(data)).toBe(3_500_000);
        expect(data).toHaveLength(3);
    });

    it('A rồi A+B: không nhân A, có thêm B', async () => {
        await kho.uploadKhoSalesData(user, '910', DATA.slice(0, 2), 'thang9.xlsx', 1, false);
        await kho.uploadKhoSalesData(user, '910', DATA, 'thang9+10.xlsx', 2, false);
        const { data } = await kho.fetchAllowedKhoData('910');
        expect(total(data)).toBe(3_500_000);
    });

    it('nhiều dòng GIỐNG HỆT nhau hợp lệ trong cùng 1 lần tải vẫn giữ đủ (không xoá trùng tuỳ tiện)', async () => {
        const same = [row('2026-09-05', 100), row('2026-09-05', 100), row('2026-09-05', 100)];
        await kho.uploadKhoSalesData(user, '910', same, 'x.xlsx', 1, false);
        await kho.uploadKhoSalesData(user, '910', same, 'x.xlsx', 1, false);
        const { data } = await kho.fetchAllowedKhoData('910');
        expect(data).toHaveLength(3);
    });

    it('dữ liệu CŨ đã bị nhân bản (3 bản chụp auto-id của cùng người) → đọc ra chỉ 1 bản', async () => {
        const legacy = (id: string, at: number) => {
            store.set(`khoData/910/salesFiles/${id}`, { maKho: '910', filename: 'old', uploadedByUid: 'mgrA', uploadedAt: at, fileLastModified: at, totalRows: 3, chunkCount: 1, isRealtime: false, isActive: true, version: 1 });
            store.set(`khoData/910/salesFiles/${id}/chunks/chunk_0`, { rows: JSON.parse(JSON.stringify(DATA)) });
        };
        legacy('old1', 100); legacy('old2', 200); legacy('old3', 300);
        const { data } = await kho.fetchAllowedKhoData('910');
        expect(total(data)).toBe(3_500_000);
    });

    it('bản mới theo tháng thay bản chụp cũ cho đúng các tháng đó, tháng khác vẫn lấy từ bản cũ', async () => {
        store.set('khoData/910/salesFiles/old1', { maKho: '910', uploadedByUid: 'mgrB', uploadedAt: 100, fileLastModified: 100, chunkCount: 1, isActive: true });
        store.set('khoData/910/salesFiles/old1/chunks/chunk_0', { rows: JSON.parse(JSON.stringify([row('2026-08-10', 7), row('2026-09-10', 999)])) });
        await kho.uploadKhoSalesData(user, '910', [row('2026-09-03', 1)], 'thang9.xlsx', 1, false);
        const { data } = await kho.fetchAllowedKhoData('910');
        expect(total(data)).toBe(8); // tháng 8 (7) từ bản cũ + tháng 9 (1) từ bản mới, bỏ 999 của tháng 9 cũ
    });
});

describe('D03 — dữ liệu chưa đầy đủ', () => {
    it('thiếu chunk → báo lỗi thay vì trả nửa dữ liệu', async () => {
        await kho.uploadKhoSalesData(user, '910', DATA, 'bc.xlsx', 1, false);
        const chunkPath = [...store.keys()].find((p) => p.includes('/chunks/'))!;
        store.delete(chunkPath);
        settings.clear();
        await expect(kho.fetchAllowedKhoData('910')).rejects.toThrow(/Thiếu/);
    });

    it('lần ghi lại: chunk phiên bản cũ được dọn, metadata trỏ đúng phiên bản mới', async () => {
        await kho.uploadKhoSalesData(user, '910', DATA, 'bc.xlsx', 1, false);
        await new Promise((r) => setTimeout(r, 2));
        await kho.uploadKhoSalesData(user, '910', DATA, 'bc.xlsx', 1, false);
        const metas = [...store.entries()].filter(([p]) => /salesFiles\/[^/]+$/.test(p)).map(([, d]) => d);
        for (const m of metas) {
            const chunkKeys = [...store.keys()].filter((p) => p.includes(`/chunks/`) && p.includes(String(m.month).replace('-', '')));
            expect(chunkKeys.every((p) => p.split('/').pop()!.startsWith(`${m.rev}_`))).toBe(true);
        }
    });
});
