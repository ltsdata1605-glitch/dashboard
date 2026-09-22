import { describe, expect, it } from 'vitest';
import { isRelistUnusedCommand, getVnMonthStartIso, selectUnusedThisMonth } from '../../functions/src/relistUnused';

describe('csd — nhận diện lệnh', () => {
    it('cú pháp chính "csd" và các biến thể', () => {
        for (const t of ['csd', 'CSD', ' csd ', '.csd', 'chưa sử dụng', 'chua su dung', 'chưa dùng']) {
            expect(isRelistUnusedCommand(t), t).toBe(true);
        }
    });
    it('vẫn nhận cú pháp cũ "loc csd" (không phá thói quen người dùng)', () => {
        for (const t of ['loc csd', 'Loc CSD', 'lọc csd', '.loc csd', 'loc chưa sử dụng', 'lọc chưa dùng', '  loc csd  ']) {
            expect(isRelistUnusedCommand(t), t).toBe(true);
        }
    });
    it('không nhận nhầm lệnh lọc thường / tk / huy', () => {
        for (const t of ['loc', 'lọc', 'csd abc', 'loc csd abc', 'tk', 'huy ABC123', 'loc PMH MM200', 'csdx']) {
            expect(isRelistUnusedCommand(t), t).toBe(false);
        }
    });
});

describe('csd — đầu tháng theo giờ VN', () => {
    it('22/09 10:00 VN -> đầu tháng 01/09 00:00 VN = 31/08 17:00 UTC', () => {
        const r = getVnMonthStartIso(new Date('2026-09-22T03:00:00Z'));
        expect(r.iso).toBe('2026-08-31T17:00:00.000Z');
        expect(r.label).toBe('9/2026');
    });
    it('01/10 01:00 VN (= 30/09 18:00 UTC) đã là tháng 10 theo VN', () => {
        const r = getVnMonthStartIso(new Date('2026-09-30T18:00:00Z'));
        expect(r.label).toBe('10/2026');
        expect(r.iso).toBe('2026-09-30T17:00:00.000Z');
    });
});

describe('csd — chọn thẻ chưa dùng trong tháng', () => {
    const now = new Date('2026-09-22T03:00:00Z');
    const docs = [
        { id: 'a', code: 'AAA', status: 'UNUSED', filteredAt: '2026-09-10T02:00:00.000Z' },
        { id: 'b', code: 'BBB', status: 'USED', filteredAt: '2026-09-11T02:00:00.000Z' },
        { id: 'c', code: 'CCC', status: 'UNUSED', filteredAt: '2026-08-31T10:00:00.000Z' }, // tháng trước
        { id: 'd', code: 'DDD', status: 'UNUSED', filteredAt: '2026-09-01T02:00:00.000Z' },
        { id: 'e', code: '', status: 'UNUSED', filteredAt: '2026-09-12T02:00:00.000Z' },       // thiếu mã
        { id: 'f', code: 'FFF', status: 'UNUSED', filteredAt: '2026-08-31T17:30:00.000Z' }, // 00:30 01/09 VN -> trong tháng
        { id: 'g', code: 'GGG', status: 'UNUSED' },                                         // không có filteredAt
    ];
    it('chỉ giữ UNUSED có mã, trong tháng VN, cũ nhất trước', () => {
        expect(selectUnusedThisMonth(docs, now).map(d => d.id)).toEqual(['f', 'd', 'a']);
    });
    it('rỗng khi không có gì', () => {
        expect(selectUnusedThisMonth([], now)).toEqual([]);
    });
});
