import { describe, it, expect } from 'vitest';
import { buildReportText, fmtTr } from '../../features/khai-thac/utils/reportText';
import { evaluateExpression, sanitizeExpressionInput } from '../../features/khai-thac/utils/expression';
import { summarize, streakWarnings, isInRange, localDateKey, startOfWeek } from '../../features/khai-thac/utils/aggregate';
import { createEmptyDraft, isValidStaffName, migrateAmounts, parseTr, resolveTraGop } from '../../features/khai-thac/catalog';
import type { SavedReport, CustomField } from '../../features/khai-thac/types';

/**
 * Logic thuần của "Báo cáo khai thác". Văn bản báo cáo phải GIỐNG HỆT app gốc
 * (Bao-Cao-Khai-Thac) vì nhân viên đang gửi mẫu này lên nhóm Zalo/Line.
 */

const draftFull = () => {
    const d = createEmptyDraft('21707 - Sơn');
    d.revenueTotal = '8.5';
    d.traGop = true;
    d.moVi = true;
    d.priceWar = true;
    d.counts.products = { tivi: 1, tuLanh: 2 };
    d.counts.services = { kaspersky: 1 };
    d.counts.insurance = { sim: 1, dongHo: 1 };
    d.counts.accessories = { camera: 1, taiNghe: 2 };
    d.counts.household = { mln: 1, noiChien: 1, bepGas: 1, dcnb: 3 };
    d.amounts = { bhDmx: '1.2', bhKhac: '0.5' };
    d.others.products = { name: 'Máy sấy', count: 1 };
    d.notes = 'Khách hẹn giao chiều';
    return d;
};

describe('buildReportText — đúng mẫu app gốc', () => {
    it('đủ 5 nhóm, đúng thứ tự S.Phẩm → Vas → Ư.Tiên → P.Kiện → G.Dụng, nhãn tắt, ghi chú cách 1 dòng trống', () => {
        expect(buildReportText(draftFull(), [])).toBe(
            [
                '📊 BÁO CÁO KHAI THÁC',
                '',
                '💰 Doanh thu: 8.5tr',
                '   - Trả góp: ✓ | Mở Ví: ✓',
                '📦 S.Phẩm: Tivi: 1 | TL: 2 | Máy sấy: 1',
                '🛠 Vas: Kaspersky: 1',
                '⭐ Ư.Tiên: SIM: 1 | ĐH: 1 | BH Khác: 0.5 | BH ĐMX: 1.2',
                '🎧 P.Kiện: Cam: 1 | T.Nghe: 2',
                '🏠 G.Dụng: MLN: 1 | N.Chiên: 1 | B.Gas: 1 | DCNB: 3',
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
        expect(buildReportText(d, fields)).toContain('🛠 Vas: Mở thẻ: 2.5');
    });

    it('bản ghi cũ có Ví (Tr) → không hiện nữa, Mở Ví vẫn theo cờ moVi', () => {
        const d = createEmptyDraft('1 - A');
        d.revenueTotal = '5'; d.moVi = true; d.amounts = { vi: '0.3' };
        const t = buildReportText(d, []);
        expect(t).toContain('| Mở Ví: ✓');
        expect(t).not.toContain('Ví: 0.3');
    });

    it('bản ghi cũ có BHMR (`amounts.insurance`) → hiện ở nhóm Ưu tiên như BH ĐMX', () => {
        const d = createEmptyDraft('1 - A');
        d.amounts = { insurance: '1.2' };
        expect(buildReportText(d, [])).toBe('📊 BÁO CÁO KHAI THÁC\n\n⭐ Ư.Tiên: BH ĐMX: 1.2');
        expect(migrateAmounts({ insurance: '1.2', bhDmx: '0.7' })).toEqual({ bhDmx: '0.7' }); // đã có ĐMX thì không ghi đè
    });

    it('đơn cũ có số trả chậm > 0 → coi là Trả góp ✓; doanh thu là phép tính thì tính ra số', () => {
        const d = createEmptyDraft('1 - A');
        d.revenueTotal = '5+3+4';
        (d as unknown as { installment: string }).installment = '0.3';
        (d as unknown as { traGop?: boolean }).traGop = undefined;
        expect(resolveTraGop(d)).toBe(true);
        expect(buildReportText(d, [])).toContain('💰 Doanh thu: 12tr\n   - Trả góp: ✓ | Mở Ví: ✗');
    });

    it('fmtTr', () => {
        expect(fmtTr(8.2000000001)).toBe('8.2');
        expect(fmtTr(8)).toBe('8');
    });
});

describe('evaluateExpression / parseTr — ô doanh thu nhận phép tính', () => {
    it('tính đúng + - * / ( ), ưu tiên nhân chia, dấu phẩy thập phân, khoảng trắng', () => {
        expect(evaluateExpression('5+ 3+ 4')).toBe(12);
        expect(evaluateExpression('2+3*4')).toBe(14);
        expect(evaluateExpression('(2+3)*4')).toBe(20);
        expect(evaluateExpression('10/4')).toBe(2.5);
        expect(evaluateExpression('1,5+0,5')).toBe(2);
        expect(evaluateExpression('0.1+0.2')).toBe(0.3);
        expect(evaluateExpression('-2+5')).toBe(3);
        expect(evaluateExpression('8.5')).toBe(8.5);
    });
    it('biểu thức dở/sai → null, không ném lỗi', () => {
        for (const bad of ['', '5+', '+', '(2+3', '2+*3', '5/0', '1..2', 'abc']) expect(evaluateExpression(bad)).toBeNull();
    });
    it('sanitize chỉ giữ số, dấu thập phân, khoảng trắng và + - * / ( )', () => {
        expect(sanitizeExpressionInput('5e+3 abc(2,5)*x/1')).toBe('5+3 (2,5)*/1');
    });
    it('parseTr: phép tính hoàn chỉnh → giá trị; đang gõ dở → lấy phần số đầu như cũ', () => {
        expect(parseTr('5+3+4')).toBe(12);
        expect(parseTr('5+')).toBe(5);
        expect(parseTr('3-5')).toBe(0); // âm → 0
        expect(parseTr('8,5')).toBe(8.5);
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
            report('2026-09-21', { revenueTotal: '10', traGop: true, moVi: true, counts: { ...createEmptyDraft().counts, products: { tivi: 1, mayLanh: 3 }, accessories: { cf_x: 2 } } }),
            report('2026-09-21', { revenueTotal: '5', priceWar: true, counts: { ...createEmptyDraft().counts, products: { mayLanh: 1 } }, amounts: { vi: '0.3', insurance: '1' } }),
            // đơn cũ: không có cờ traGop, chỉ có số trả chậm > 0 → tính là trả góp
            { ...report('2026-09-21', { revenueTotal: '2', amounts: { bhKhac: '0.4', bhDmx: '0.6' } }), traGop: undefined as unknown as boolean, installment: '0.5' },
        ], fields);
        expect(s.orders).toBe(3);
        expect(s.revenueTotal).toBe(17);
        expect(s.traGopCount).toBe(2);
        expect(s.moViCount).toBe(1);
        expect(s.priceWarCount).toBe(1);
        expect(s.insuranceTr).toBe(2);          // 1 (BHMR cũ → ĐMX) + 0.4 + 0.6
        expect(s.amounts.bhDmx).toBe(1.6);
        expect(s.amounts.bhKhac).toBe(0.4);
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
