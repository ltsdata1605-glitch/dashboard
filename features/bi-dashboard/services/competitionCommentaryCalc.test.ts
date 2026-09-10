import { describe, it, expect } from 'vitest';
import { 
    calculateCompetitionCommentary, 
    generateZaloCommentaryMessage,
    getGroupSticker,
    extractProgramNumbers
} from './competitionCommentaryCalc';
import type { ProcessedProgram } from './competitionViewCalc';

describe('competitionCommentaryCalc', () => {
    const mockHeaders = [
        'L.Kế',
        'Target',
        '%HT',
        '%DKHT',
        'Target V.Trội',
        '%HT V.Trội',
        '%DKHT V.Trội',
        'Còn Lại'
    ];

    const mockProgramsGroup1: ProcessedProgram[] = [
        {
            name: 'MANGO/CALLME',
            data: [202, 150, '135%', '505%', 200, '101%', '400%', 52],
            metric: 'SLLK',
            conLai: 52
        },
        {
            name: 'VAS',
            data: [308, 293, '106%', '395%', 350, '88%', '320%', 15],
            metric: 'SLLK',
            conLai: 15
        },
        {
            name: 'VAY TIỀN MẶT',
            data: [0, 164, '0%', '0%', 200, '0%', '0%', -164],
            metric: 'SLLK',
            conLai: -164
        }
    ];

    const mockProgramsGroup2: ProcessedProgram[] = [
        {
            name: 'TAI NGHE',
            data: [36, 50, '71%', '241%', 60, '60%', '200%', -14],
            metric: 'SLLK',
            conLai: -14
        },
        {
            name: 'SẠC DỰ PHÒNG',
            data: [64, 129, '50%', '170%', 150, '43%', '140%', -64],
            metric: 'SLLK',
            conLai: -64
        }
    ];

    it('should assign appropriate stickers to different group types', () => {
        expect(getGroupSticker('DỊCH VỤ')).toBe('📱');
        expect(getGroupSticker('P.KIỆN - Đ.HỒ')).toBe('🎧');
        expect(getGroupSticker('GIA DỤNG')).toBe('🍳');
        expect(getGroupSticker('CE TIVI')).toBe('📺');
        expect(getGroupSticker('ICT')).toBe('💻');
        expect(getGroupSticker('SLLK')).toBe('📦');
        expect(getGroupSticker('DTLK')).toBe('💰');
        expect(getGroupSticker('DTQĐ')).toBe('⭐');
    });

    it('should extract correct actual, target, remaining and rate for program', () => {
        const p = mockProgramsGroup1[0]; // MANGO/CALLME
        const visibleColumns = ['L.Kế', 'Target', '%HT', 'Còn Lại'];
        const nums = extractProgramNumbers(p, mockHeaders, visibleColumns, false);

        expect(nums.actual).toBe(202);
        expect(nums.target).toBe(150);
        expect(nums.remaining).toBe(52);
        expect(nums.rate).toBe(135);
    });

    it('should calculate group summary and commentary accurately', () => {
        const grouped = {
            'DỊCH VỤ': mockProgramsGroup1,
            'P.KIỆN - Đ.HỒ': mockProgramsGroup2
        };
        const visibleColumns = ['L.Kế', 'Target', '%HT', 'Còn Lại'];
        const result = calculateCompetitionCommentary(
            grouped,
            mockHeaders,
            visibleColumns,
            false,
            'Hùng Vương'
        );

        expect(result.supermarketName).toBe('Hùng Vương');
        expect(result.groups.length).toBe(2);

        // Group 1 (Dịch Vụ):
        const g1 = result.groups[0];
        expect(g1.groupKey).toBe('DỊCH VỤ');
        expect(g1.totalActual).toBe(202 + 308 + 0); // 510
        expect(g1.totalTarget).toBe(150 + 293 + 164); // 607
        expect(g1.over100Count).toBe(2);
        expect(g1.under100Count).toBe(1);
        expect(g1.topPerformers.length).toBe(2);
        expect(g1.neededPrograms.length).toBe(1);
        expect(g1.neededPrograms[0].name).toBe('VAY TIỀN MẶT');

        // Group 2 (Phụ Kiện):
        const g2 = result.groups[1];
        expect(g2.groupKey).toBe('P.KIỆN - Đ.HỒ');
        expect(g2.totalActual).toBe(36 + 64); // 100
        expect(g2.totalTarget).toBe(50 + 129); // 179
        expect(g2.over100Count).toBe(0);
        expect(g2.under100Count).toBe(2);
        expect(g2.unreachedPrograms.length).toBe(2);
        expect(result.zeroGroupsCount).toBe(0);
    });

    it('should generate a concise Zalo commentary message with stickers matching user requested format', () => {
        const grouped = {
            'DỊCH VỤ': mockProgramsGroup1
        };
        const visibleColumns = ['L.Kế', 'Target', '%HT', 'Còn Lại'];
        const commentary = calculateCompetitionCommentary(
            grouped,
            mockHeaders,
            visibleColumns,
            false,
            'ĐML_STR_STR - 99 HÙNG VƯƠNG'
        );

        const zaloText = generateZaloCommentaryMessage(commentary);
        expect(zaloText).toContain('🔥 BẢN TIN ĐÁNH GIÁ THI ĐUA ĐML_STR_STR - 99 HÙNG VƯƠNG 🎯');
        expect(zaloText).toContain('⏰ Chế độ: LUỸ KẾ | Target: CƠ BẢN');
        expect(zaloText).toContain('📊 TỔNG QUAN THI ĐUA:');
        expect(zaloText).toContain('• Tiến độ chung:');
        expect(zaloText).toContain('• Nhóm đạt ≥100%:');
        expect(zaloText).toContain('• Nhóm chưa khai thác:');
        expect(zaloText).toContain('1. 📱 DỊCH VỤ: 2/3  (>100%)');
        expect(zaloText).toContain('VAY TIỀN MẶT: 0% thiếu 164');
        expect(zaloText).toContain('💪 TOÀN THỂ ANH EM SIÊU THỊ CÙNG DỒN LỰC VỀ ĐÍCH NHÉ! 🚀🏆');

        // Test realtime mode
        const realtimeCommentary = calculateCompetitionCommentary(
            grouped,
            mockHeaders,
            visibleColumns,
            true,
            'ĐML_STR_STR - 99 HÙNG VƯƠNG'
        );
        const realtimeText = generateZaloCommentaryMessage(realtimeCommentary);
        expect(realtimeText).toContain('⏰ Chế độ: REALTIME');
        expect(realtimeText).toContain('VAY TIỀN MẶT: thiếu 164');
    });
});

describe('Tiến độ chung KHÔNG được cộng gộp các nhóm khác đơn vị (bug 2026-09-10)', () => {
    const headers = ['L.Kế', 'Target', '%HT', '%DKHT', 'Target V.Trội', '%HT V.Trội', '%DKHT V.Trội', 'Còn Lại'];
    const visible = ['L.Kế', 'Target', '%HT', 'Còn Lại'];

    // SLLK đo bằng *cái* (hàng trăm), DTLK đo bằng *VNĐ* (hàng trăm triệu).
    const sllkKem: ProcessedProgram[] = [
        { name: 'SIM MANGO', data: [120, 600, '20%', '0%', 700, '17%', '0%', -480], metric: 'SLLK', conLai: -480 },
        { name: 'VAY TIỀN MẶT', data: [80, 400, '20%', '0%', 500, '16%', '0%', -320], metric: 'SLLK', conLai: -320 },
    ];
    const dtlkDat: ProcessedProgram[] = [
        { name: 'ICT', data: [600_000_000, 600_000_000, '100%', '0%', 650_000_000, '92%', '0%', 0], metric: 'DTLK', conLai: 0 },
        { name: 'CE', data: [400_000_000, 400_000_000, '100%', '0%', 450_000_000, '89%', '0%', 0], metric: 'DTLK', conLai: 0 },
    ];

    it('nhóm SỐ LƯỢNG kém KHÔNG bị nhóm DOANH THU nhấn chìm', () => {
        const r = calculateCompetitionCommentary({ SLLK: sllkKem, DTLK: dtlkDat }, headers, visible, false, 'Test');

        expect(r.groups.find(g => g.groupKey === 'SLLK')!.completionRate).toBe(20);
        expect(r.groups.find(g => g.groupKey === 'DTLK')!.completionRate).toBe(100);

        // Trung bình (20 + 100) / 2 = 60. Công thức cũ (tổng/tổng) cho ra 100 vì 10^8 đè bẹp 10^2.
        expect(r.overallRate, 'phải là trung bình các nhóm, không phải tỷ lệ của tổng gộp').toBe(60);
        expect(r.generalAssessment.headline, 'không được khen "xuất sắc" khi 1 tiêu chí báo động đỏ')
            .not.toContain('XUẤT SẮC');
    });

    it('đổi đơn vị của nhóm KHÔNG làm đổi Tiến độ chung', () => {
        // Cùng tỷ lệ 20%/100%, nhưng doanh thu ghi bằng NGHÌN đồng thay vì đồng.
        const dtlkNghin: ProcessedProgram[] = dtlkDat.map(p => ({
            ...p,
            data: p.data.map(v => (typeof v === 'number' && v > 1000 ? v / 1000 : v)),
        }));
        const a = calculateCompetitionCommentary({ SLLK: sllkKem, DTLK: dtlkDat }, headers, visible, false, 'A');
        const b = calculateCompetitionCommentary({ SLLK: sllkKem, DTLK: dtlkNghin }, headers, visible, false, 'B');

        expect(b.overallRate, 'chỉ số đúng thì không phụ thuộc đơn vị đo').toBe(a.overallRate);
    });

    it('"Chưa khai thác" chỉ đếm nhóm THẬT SỰ chưa phát sinh, không đếm nhóm bị làm tròn về 0%', () => {
        const gan0: ProcessedProgram[] = [
            { name: 'MỚI CHẠY', data: [3, 1000, '0%', '0%', 1200, '0%', '0%', -997], metric: 'SLLK', conLai: -997 },
        ];
        const chuaCoGi: ProcessedProgram[] = [
            { name: 'CHƯA BÁN', data: [0, 500, '0%', '0%', 600, '0%', '0%', -500], metric: 'SLLK', conLai: -500 },
        ];
        const r = calculateCompetitionCommentary({ 'ĐÃ CHẠY': gan0, 'CHƯA CHẠY': chuaCoGi }, headers, visible, false, 'Test');

        expect(r.groups[0].completionRate, 'làm tròn 0,3% → 0%').toBe(0);
        expect(r.zeroGroupsCount, 'nhóm đã bán được 3 cái KHÔNG phải "chưa khai thác"').toBe(1);
    });

    it('đếm được tổng số ngành hàng chưa đạt (thay cho "Tổng Còn lại" cộng sai đơn vị)', () => {
        const r = calculateCompetitionCommentary({ SLLK: sllkKem, DTLK: dtlkDat }, headers, visible, false, 'Test');
        expect(r.unreachedProgramsCount).toBe(2); // 2 chương trình SLLK chưa đạt, 2 DTLK đã đạt
    });

    it('không vỡ khi không có nhóm nào', () => {
        const r = calculateCompetitionCommentary({}, headers, visible, false, 'Rỗng');
        expect(r.overallRate).toBe(0);
        expect(r.unreachedProgramsCount).toBe(0);
    });
});
