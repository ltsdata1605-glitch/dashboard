import { describe, expect, it, vi, beforeEach } from 'vitest';

// Firestore giả: ghi lại các truy vấn và cho quyết định mỗi lần onSnapshot trả dữ liệu hay lỗi.
const truyVan: string[][] = [];
let hanhVi: ('ok' | 'thieu-chi-muc')[] = [];
const docs = [{ id: 'c1', data: { description: 'cấu hình khác' } }, { id: 'tb', data: { isSystemAnnouncement: true, content: 'Bảo trì 22h', active: true } }];
vi.mock('firebase/firestore', () => ({
    collection: () => 'shared_configs',
    where: (f: string, op: string, v: unknown) => `where(${f}${op}${v})`,
    orderBy: (f: string, d: string) => `orderBy(${f},${d})`,
    limit: (n: number) => `limit(${n})`,
    query: (_c: unknown, ...parts: string[]) => parts,
    onSnapshot: (q: string[], next: (s: unknown) => void, err: (e: unknown) => void) => {
        truyVan.push(q);
        const hv = hanhVi.shift() || 'ok';
        if (hv === 'thieu-chi-muc') err(Object.assign(new Error('The query requires an index. https://console.firebase.google.com/...'), { code: 'failed-precondition' }));
        else next({ forEach: (cb: (d: { id: string; data: () => unknown }) => void) => docs.forEach(d => cb({ id: d.id, data: () => d.data })) });
        return () => {};
    },
}));
vi.mock('../../services/firebase', () => ({ db: {} }));
const { listenSystemAnnouncement } = await import('../../services/systemAnnouncementService');

describe('listenSystemAnnouncement', () => {
    beforeEach(() => { truyVan.length = 0; });

    it('có chỉ mục: 1 truy vấn, lọc isSystemAnnouncement, limit(1)', () => {
        hanhVi = ['ok'];
        const cb = vi.fn();
        listenSystemAnnouncement(cb, vi.fn());
        expect(truyVan).toEqual([['where(isSystemAnnouncement==true)', 'orderBy(createdAt,desc)', 'limit(1)']]);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: 'tb', content: 'Bảo trì 22h' }));
    });

    it('thiếu chỉ mục: tự quay về cách cũ (limit 100), vẫn tìm ra thông báo, không báo lỗi', () => {
        hanhVi = ['thieu-chi-muc', 'ok'];
        const cb = vi.fn(); const loi = vi.fn();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        listenSystemAnnouncement(cb, loi);
        expect(truyVan[1]).toEqual(['orderBy(createdAt,desc)', 'limit(100)']);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: 'tb' }));
        expect(loi).not.toHaveBeenCalled();
    });
});
