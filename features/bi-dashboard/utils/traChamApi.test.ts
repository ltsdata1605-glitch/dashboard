import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseInstallmentData } from './nhanVienHelpers';

/**
 * Trả chậm Luỹ kế theo NHÂN VIÊN — userscript 7.9 (acpSerializeInstallmentStaff) dựng bảng từ API
 * tra-cham-matrix-get (VIEWLEVEL STAFF). Dữ liệu là TRÍCH ĐÚNG mẫu API thật chủ dự án gửi 2026-10-01 (kho 910, 09/2026).
 * Đưa qua ĐÚNG bộ đọc của ô Trả chậm (parseInstallmentData) và đối chiếu số.
 */
const SRC = readFileSync(resolve(__dirname, '../../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');
const start = SRC.indexOf('  function acpSerializeInstallmentStaff(rows) {');
const end = SRC.indexOf('  // Luỹ kế: điền Target & % HT nếu API có');
const serialize = new Function(`${SRC.slice(start, end)}; return acpSerializeInstallmentStaff;`)() as (rows: unknown[]) => string;

const MAU = [
    { group_id: 'administrator', group_name: 'Admin', partnerinstallmentname: null, revenue_tg: null, ratio_tg: null, total_revenue_tg: '0.0000', revenue_store: '42.5605', installment_ratio: null },
    { group_id: '95970', group_name: 'Chế Thị Út', partnerinstallmentname: 'HomeCredit(HC)', revenue_tg: '417.6129', ratio_tg: '60.23', total_revenue_tg: '693.3567', revenue_store: '1403.7400', installment_ratio: '49.39' },
    { group_id: '95970', group_name: 'Chế Thị Út', partnerinstallmentname: 'Trả góp KREDIVO', revenue_tg: '110.7213', ratio_tg: '15.97', total_revenue_tg: '693.3567', revenue_store: '1403.7400', installment_ratio: '49.39' },
    { group_id: '95970', group_name: 'Chế Thị Út', partnerinstallmentname: 'Trả góp HPL-Home Credit', revenue_tg: '66.1271', ratio_tg: '9.54', total_revenue_tg: '693.3567', revenue_store: '1403.7400', installment_ratio: '49.39' },
    { group_id: '95970', group_name: 'Chế Thị Út', partnerinstallmentname: 'MWG PAYLATER', revenue_tg: '63.4690', ratio_tg: '9.15', total_revenue_tg: '693.3567', revenue_store: '1403.7400', installment_ratio: '49.39' },
    { group_id: '95970', group_name: 'Chế Thị Út', partnerinstallmentname: 'Thẻ tín dụng - SMARTPOS', revenue_tg: '22.8611', ratio_tg: '3.30', total_revenue_tg: '693.3567', revenue_store: '1403.7400', installment_ratio: '49.39' },
    { group_id: '95970', group_name: 'Chế Thị Út', partnerinstallmentname: 'FECredit(FE)', revenue_tg: '12.5653', ratio_tg: '1.81', total_revenue_tg: '693.3567', revenue_store: '1403.7400', installment_ratio: '49.39' },
    { group_id: '21707', group_name: 'Lê Trường Sơn', partnerinstallmentname: 'Kim Ngân Pay', revenue_tg: '38.8796', ratio_tg: '100.00', total_revenue_tg: '38.8796', revenue_store: '38.8796', installment_ratio: '100.00' },
    { group_id: '64748', group_name: 'Hồng Thơ', partnerinstallmentname: null, revenue_tg: null, ratio_tg: null, total_revenue_tg: '0.0000', revenue_store: '1.9074', installment_ratio: null },
    { group_id: '28679', group_name: 'Nguyễn Hải Đăng', partnerinstallmentname: 'HomeCredit(HC)', revenue_tg: '148.4977', ratio_tg: '70.38', total_revenue_tg: '211.0038', revenue_store: '545.2931', installment_ratio: '38.70' },
    { group_id: '28679', group_name: 'Nguyễn Hải Đăng', partnerinstallmentname: 'Samsung Finance +', revenue_tg: '28.6478', ratio_tg: '13.58', total_revenue_tg: '211.0038', revenue_store: '545.2931', installment_ratio: '38.70' },
    { group_id: '24754', group_name: 'Lý Thị Thu Ngân', partnerinstallmentname: 'Shinhan Finance', revenue_tg: '8.1389', ratio_tg: '2.22', total_revenue_tg: '366.1575', revenue_store: '839.9863', installment_ratio: '43.59' },
];

describe('Trả chậm theo nhân viên từ API → ô Trả chậm', () => {
    const text = serialize(MAU);
    const nv = { '95970 - Chế Thị Út': 'BP A', '21707 - Lê Trường Sơn': 'BP A', '64748 - Hồng Thơ': 'BP A', '28679 - Nguyễn Hải Đăng': 'BP A', '24754 - Lý Thị Thu Ngân': 'BP A' };
    const rows = parseInstallmentData(text, nv);
    const theoTen = (ten: string) => rows.find(r => r.type === 'employee' && (r.originalName || r.name).includes(ten));

    it('bỏ dòng Admin; mỗi nhân viên một dòng', () => {
        expect(text).not.toContain('Admin');
        expect(rows.filter(r => r.type === 'employee').length).toBe(5);
    });

    it('DT siêu thị & tỷ trọng & DT từng đối tác đọc ĐÚNG cột (không lệch vì đối tác lạ "Kim Ngân Pay")', () => {
        const ut = theoTen('Chế Thị Út')!;
        expect(ut.totalDtSieuThi).toBeCloseTo(1403.74, 2);
        const p = (s: string) => ut.providers.find(x => x.shortName === s)!;
        expect(p('HC').dt).toBeCloseTo(417.61, 2);
        expect(p('HC').percent).toBeCloseTo(60.23, 2);
        expect(p('KRE').dt).toBeCloseTo(110.72, 2);
        expect(p('HPL').dt).toBeCloseTo(66.13, 2);
        expect(p('MWG').dt).toBeCloseTo(63.47, 2);
        expect(p('POS').dt).toBeCloseTo(22.86, 2);
        expect(p('FE').dt).toBeCloseTo(12.57, 2);
        const dang = theoTen('Nguyễn Hải Đăng')!;
        expect(dang.providers.find(x => x.shortName === 'SSF')!.dt).toBeCloseTo(28.65, 2);
        expect(dang.providers.find(x => x.shortName === 'HC')!.dt).toBeCloseTo(148.50, 2);
    });

    it('nhân viên không có trả chậm vẫn có dòng, các đối tác = 0', () => {
        const tho = theoTen('Hồng Thơ')!;
        expect(tho.totalDtSieuThi).toBeCloseTo(1.91, 2);
        expect(tho.providers.every(x => x.dt === 0)).toBe(true);
    });
});
