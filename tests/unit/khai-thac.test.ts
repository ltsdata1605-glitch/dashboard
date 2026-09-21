import { describe, it, expect } from 'vitest';
import { buildReportText, installmentRate, fmtTr } from '../../features/khai-thac/utils/reportText';
import { summarize, streakWarnings, isInRange, localDateKey, startOfWeek } from '../../features/khai-thac/utils/aggregate';
import { createEmptyDraft, isValidStaffName } from '../../features/khai-thac/catalog';
import type { SavedReport, CustomField } from '../../features/khai-thac/types';

/**
 * Logic thuần của "Báo cáo khai thác". Văn bản báo cáo phải GIỐNG HỆT app gốc
 * (Bao-Cao-Khai-Thac) vì nhân viên đang gửi mẫu này lên nhóm Zalo/Line.
 */

const draftFull = () => {
    const d = createEmptyDraft('21707 - Sơn');
    d.revenueTotal = '8.5';
    d.installment = '0.3';
    d.moVi = true;
    d.priceWar = true;
    d.counts.products = { tivi: 1, tuLanh: 2 };
    d.counts.services = { sim: 1 };
    d.counts.accessories = { camera: 1 };
    d.counts.household = { mln: 1, noiChien: 1 };
    d.amounts = { vi: '0.3', insurance: '1.2' };
    d.others.products = { name: 'Máy sấy', count: 1 };
    d.notes = 'Khách hẹn giao chiều';
    return d;
};

describe('buildReportText — đúng mẫu app gốc', () => {
    it('đủ 4 nhóm, đúng thứ tự S.Phẩm → D.Vụ → P.Kiện → G.Dụng, nhãn tắt, ghi chú cách 1 dòng trống', () => {
        expect(buildReportText(draftFull(), [])).toBe(
            [
                '📊 BÁO CÁO KHAI THÁC',
                '',
                '💰 Doanh thu: 8.5tr',
                '   - T.Mặt: 8.2tr',
                '   - T.Chậm: 0.3Tr ~ 4% | Mở Ví: ✓',
                '📦 S.Phẩm: Tivi: 1 | TL: 2 | Máy sấy: 1',
                '🛠 D.Vụ: Ví: 0.3 | SIM: 1 | BH: 1.2',
                '🎧 P.Kiện: Cam: 1',
                '🏠 G.Dụng: MLN: 1 | N.Chiên: 1',
                '⚔️ Chiến giá: ✓',
                '',
                '📝 Khách hẹn giao chiều',
            ].join('\n'),
        );
    });

    it('bỏ qua nhóm rỗng, không có doanh thu thì không có khối 💰', () => {
        const d = createEmptyDraft('1 - A');
        d.counts.products = { laptop: 1 };
        expect(buildReportText(d, [])).toBe('📊 BÁO CÁO KHAI THÁC\n\n📦 S.Phẩm: LT: 1');
    });

    it('mục tuỳ chỉnh dạng đếm và tiền hiện theo tên, tiền chỉ hiện khi > 0', () => {
        const fields: CustomField[] = [
            { id: 'cf_tainghe', name: 'Tai nghe', group: 'accessories', type: 'count' },
            { id: 'cf_mothe', name: 'Mở thẻ', group: 'services', type: 'revenue' },
        ];
        const d = createEmptyDraft('1 - A');
        d.counts.accessories = { cf_tainghe: 3 };
        d.amounts = { cf_mothe: '0' };
        expect(buildReportText(d, fields)).toBe('📊 BÁO CÁO KHAI THÁC\n\n🎧 P.Kiện: Tai nghe: 3');
        d.amounts = { cf_mothe: '2.5' };
        expect(buildReportText(d, fields)).toContain('🛠 D.Vụ: Mở thẻ: 2.5');
    });

    it('installmentRate/fmtTr', () => {
        expect(installmentRate(8.5, 0.3)).toBe(4);
        expect(installmentRate(0, 1)).toBe(0);
        expect(fmtTr(8.2000000001)).toBe('8.2');
        expect(fmtTr(8)).toBe('8');
    });
});

describe('isValidStaffName', () => {
    it('đúng dạng "Mã - Tên"', () => {
        expect(isValidStaffName('21707 - Sơn')).toBe(true);
        expect(isValidStaffName('21707-Sơn Lê')).toBe(true);
        expect(isValidStaffName('Sơn')).toBe(false);
        expect(isValidStaffName('21707 -')).toBe(false);
    });
});

const report = (date: string, patch: Partial<SavedReport>): SavedReport => ({
    ...createEmptyDraft('1 - A'),
    id: `${date}_${Math.random()}`,
    date,
    savedAt: `${date}T10:00:00.000Z`,
    ...patch,
});

describe('summarize', () => {
    it('cộng doanh thu, trả chậm, đếm Mở Ví/Chiến giá, xếp hạng mặt hàng giảm dần', () => {
        const fields: CustomField[] = [{ id: 'cf_x', name: 'Tai nghe', group: 'accessories', type: 'count' }];
        const s = summarize([
            report('2026-09-21', { revenueTotal: '10', installment: '2', moVi: true, counts: { ...createEmptyDraft().counts, products: { tivi: 1, mayLanh: 3 }, accessories: { cf_x: 2 } } }),
            report('2026-09-21', { revenueTotal: '5', installment: '0', priceWar: true, counts: { ...createEmptyDraft().counts, products: { mayLanh: 1 } }, amounts: { vi: '0.3', insurance: '1' } }),
        ], fields);
        expect(s.orders).toBe(2);
        expect(s.revenueTotal).toBe(15);
        expect(s.installment).toBe(2);
        expect(s.cash).toBe(13);
        expect(s.installmentRate).toBe(13);
        expect(s.moViCount).toBe(1);
        expect(s.priceWarCount).toBe(1);
        expect(s.viTr).toBe(0.3);
        expect(s.insuranceTr).toBe(1);
        expect(s.ranking.products[0]).toEqual({ key: 'mayLanh', label: 'Máy lạnh', count: 4 });
        expect(s.ranking.products[1]).toEqual({ key: 'tivi', label: 'Tivi', count: 1 });
        expect(s.ranking.accessories.find(r => r.key === 'cf_x')?.count).toBe(2);
    });
});

describe('isInRange / ngày giờ máy', () => {
    const now = new Date(2026, 8, 21, 22, 30); // Thứ Hai 21/09/2026, 22h30 (+7 sẽ lệch nếu dùng UTC)
    it('localDateKey không lệch ngày buổi tối', () => {
        expect(localDateKey(now)).toBe('2026-09-21');
    });
    it('tuần Thứ Hai → Chủ Nhật', () => {
        expect(localDateKey(startOfWeek(now))).toBe('2026-09-21');
        expect(localDateKey(startOfWeek(new Date(2026, 8, 27)))).toBe('2026-09-21'); // CN 27/9 vẫn thuộc tuần 21/9
        expect(isInRange('2026-09-27', 'week', now)).toBe(true);
        expect(isInRange('2026-09-20', 'week', now)).toBe(false);
        expect(isInRange('2026-09-01', 'month', now)).toBe(true);
        expect(isInRange('2026-08-31', 'month', now)).toBe(false);
        expect(isInRange('2026-09-21', 'today', now)).toBe(true);
    });
});

describe('streakWarnings — 3 ngày liên tiếp = 0, gộp theo ngày', () => {
    const now = new Date(2026, 8, 21, 9);
    const c = (products: Record<string, number>) => ({ ...createEmptyDraft().counts, products });
    it('cần đủ 2 ngày quá khứ có báo cáo mới cảnh báo', () => {
        expect(streakWarnings(createEmptyDraft(), [report('2026-09-20', {})], [], now)).toEqual([]);
    });
    it('mặt hàng bán được ở 1 trong 2 ngày trước hoặc hôm nay thì không cảnh báo', () => {
        const reports = [
            report('2026-09-19', { counts: c({ tivi: 0 }) }),
            report('2026-09-19', { counts: c({ tivi: 1 }) }), // cùng ngày, đơn thứ 2 có Tivi → gộp theo ngày = 1
            report('2026-09-20', { counts: c({ tuLanh: 1 }) }),
        ];
        const w = streakWarnings(createEmptyDraft(), reports, [], now);
        expect(w).not.toContain('Tivi');
        expect(w).not.toContain('Tủ lạnh');
        expect(w).toContain('Máy giặt');
        const draft = createEmptyDraft();
        draft.counts.products = { mayGiat: 1 };
        expect(streakWarnings(draft, reports, [], now)).not.toContain('Máy giặt');
    });
});
