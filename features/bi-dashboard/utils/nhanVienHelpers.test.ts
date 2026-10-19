import { describe, it, expect } from 'vitest';
import { computeColumnTiers } from './nhanVienHelpers';

describe('computeColumnTiers', () => {
    it('returns none for empty or all-zero array', () => {
        expect(computeColumnTiers([])).toEqual([]);
        expect(computeColumnTiers([0, 0, null, undefined])).toEqual(['none', 'none', 'none', 'none']);
    });

    it('returns top for a single positive value', () => {
        expect(computeColumnTiers([0, 15, 0])).toEqual(['none', 'top', 'none']);
    });

    it('splits 2 values into top and bot', () => {
        expect(computeColumnTiers([10, 50])).toEqual(['bot', 'top']);
        expect(computeColumnTiers([50, 10])).toEqual(['top', 'bot']);
        expect(computeColumnTiers([20, 20])).toEqual(['top', 'top']);
    });

    it('correctly splits multi-values into top, trung, bot', () => {
        // 9 values: top 3, trung 3, bot 3
        const values = [90, 80, 70, 60, 50, 40, 30, 20, 10];
        const tiers = computeColumnTiers(values);
        expect(tiers).toEqual([
            'top', 'top', 'top',
            'trung', 'trung', 'trung',
            'bot', 'bot', 'bot'
        ]);
    });

    it('handles equal values at boundary consistently', () => {
        const values = [50, 50, 50, 10, 10];
        const tiers = computeColumnTiers(values);
        expect(tiers[0]).toBe('top');
        expect(tiers[1]).toBe('top');
        expect(tiers[2]).toBe('top');
        expect(tiers[3]).toBe('bot');
        expect(tiers[4]).toBe('bot');
    });

    it('handles all equal values gracefully as trung', () => {
        const values = [20, 20, 20, 20];
        const tiers = computeColumnTiers(values);
        expect(tiers).toEqual(['trung', 'trung', 'trung', 'trung']);
    });

    it('handles realistic provider data with zeros', () => {
        // HPL sample: [27, 5, 9, 0, 9, 0, 2, 0, 0, 26, 10, 59, 25, 0, 11, 5, 0, 11]
        const sample = [27, 5, 9, 0, 9, 0, 2, 0, 0, 26, 10, 59, 25, 0, 11, 5, 0, 11];
        const tiers = computeColumnTiers(sample);
        
        expect(tiers[3]).toBe('none'); // 0
        expect(tiers[5]).toBe('none'); // 0
        expect(tiers[11]).toBe('top'); // 59 is max -> top
        expect(tiers[0]).toBe('top');  // 27 is top tier
        expect(tiers[9]).toBe('top');  // 26 is top tier
        expect(tiers[12]).toBe('top'); // 25 is top tier
        expect(tiers[6]).toBe('bot');  // 2 is min -> bot
        expect(tiers[1]).toBe('bot');  // 5 is bot tier
        expect(tiers[15]).toBe('bot'); // 5 is bot tier
    });
});

import { detectRevenueTableKind, mergeRevenueData, parseRevenueData } from './nhanVienHelpers';

describe('detectRevenueTableKind', () => {
    it('nhận diện chính xác bảng Realtime thực', () => {
        const sample = `NHÂN VIÊN\nSỐ LƯỢNG\nDOANH THU\n% TỈ TRỌNG\nTB 3 THÁNG\n% TT\nDT TRẢ THẲNG\nDT TRẢ GÓP\nDT NHẬP TRẢ\n276651 - Nguyễn Liễu Như Phụng\n1\n7\n50.2%\n0\n—\n0\n7\n0`;
        expect(detectRevenueTableKind(sample)).toBe('thuc');
    });

    it('nhận diện chính xác bảng Realtime quy đổi', () => {
        const sample = `NHÂN VIÊN\nSỐ LƯỢNG\nDOANH THU QĐ\n% TỈ TRỌNG\nTB 3 THÁNG\n% TT\nDT TRẢ THẲNG QĐ\nDT TRẢ GÓP QĐ\nDT NHẬP TRẢ QĐ\n276651 - Nguyễn Liễu Như Phụng\n1\n10\n54.7%\n0\n—\n0\n10\n0`;
        expect(detectRevenueTableKind(sample)).toBe('qd');
    });

    it('nhận diện bảng gộp cũ có cả DOANH THU QĐ và DOANH THU', () => {
        const sample = `NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\n276651 - Nguyễn Liễu Như Phụng\t1\t10\t54.7%\t7\t0`;
        expect(detectRevenueTableKind(sample)).toBe('combined');
    });
});

describe('mergeRevenueData với dữ liệu thực tế mẫu của người dùng', () => {
    const realtimeThucSample = `
NHÂN VIÊN
SỐ LƯỢNG
DOANH THU
% TỈ TRỌNG
TB 3 THÁNG
% TT
DT TRẢ THẲNG
DT TRẢ GÓP
DT NHẬP TRẢ
276651 - Nguyễn Liễu Như Phụng
1
7
50.2%
0
—
0
7
0
106637 - Nguyễn Vũ Minh
1
7
45.1%
0
—
7
0
0
15887 - Thạch Ngọc Phụng
3
1
4.7%
0
—
1
0
0
281084 - Cao Thành Phúc
0
0
0.0%
0
—
0
0
0
Tổng (50 dòng)
5
15
100.0%
620
-97.6%
7
7
0
`;

    const realtimeQdSample = `
NHÂN VIÊN
SỐ LƯỢNG
DOANH THU QĐ
% TỈ TRỌNG
TB 3 THÁNG
% TT
DT TRẢ THẲNG QĐ
DT TRẢ GÓP QĐ
DT NHẬP TRẢ QĐ
276651 - Nguyễn Liễu Như Phụng
1
10
54.7%
0
—
0
10
0
106637 - Nguyễn Vũ Minh
1
7
37.9%
0
—
7
0
0
15887 - Thạch Ngọc Phụng
3
1
7.4%
0
—
1
0
0
281084 - Cao Thành Phúc
0
0
0.0%
0
—
0
0
0
Tổng (50 dòng)
5
18
100.0%
941
-98.1%
8
10
0
`;

    it('merge chuẩn xác Realtime Thực và Realtime Quy đổi', () => {
        const rows = mergeRevenueData(realtimeThucSample, realtimeQdSample);
        expect(rows.length).toBeGreaterThan(0);

        // Kiểm tra dòng Tổng
        const total = rows.find(r => r.type === 'total');
        expect(total).toBeDefined();
        expect(total?.soLuong).toBe(5);
        expect(total?.dtlk).toBe(15);
        expect(total?.dtqd).toBe(18);

        // Kiểm tra nhân viên Như Phụng: dtlk=7, dtqd=10, soLuong=1
        const phung = rows.find(r => r.type === 'employee' && (r.originalName?.includes('276651') || r.originalName?.includes('Như Phụng')));
        expect(phung).toBeDefined();
        expect(phung?.dtlk).toBe(7);
        expect(phung?.dtqd).toBe(10);
        expect(phung?.soLuong).toBe(1);

        // Kiểm tra nhân viên Vũ Minh: dtlk=7, dtqd=7, soLuong=1
        const minh = rows.find(r => r.type === 'employee' && (r.originalName?.includes('106637') || r.originalName?.includes('Vũ Minh')));
        expect(minh).toBeDefined();
        expect(minh?.dtlk).toBe(7);
        expect(minh?.dtqd).toBe(7);
        expect(minh?.soLuong).toBe(1);
    });

    const luyKeThucSample = `
NHÂN VIÊN
SỐ LƯỢNG
DOANH THU
% TỈ TRỌNG
TB 3 THÁNG
% TT
DT TRẢ THẲNG
DT TRẢ GÓP
DT NHẬP TRẢ
107617 - Phạm Anh Nhân
230
791
6.5%
0
—
491
314
13
95970 - Chế Thị Út
257
674
5.5%
0
—
214
490
30
17952 - Đinh Thị Mỹ Hương
229
655
5.4%
0
—
344
319
8
Tổng (50 dòng)
5,053
12,212
100.0%
11,155
+9.5%
6,501
6,279
568
`;

    const luyKeQdSample = `
NHÂN VIÊN
SỐ LƯỢNG
DOANH THU QĐ
% TỈ TRỌNG
TB 3 THÁNG
% TT
DT TRẢ THẲNG QĐ
DT TRẢ GÓP QĐ
DT NHẬP TRẢ QĐ
107617 - Phạm Anh Nhân
230
1,100
6.0%
0
—
684
436
19
95970 - Chế Thị Út
257
1,034
5.7%
0
—
416
661
43
17952 - Đinh Thị Mỹ Hương
229
999
5.5%
0
—
570
454
25
Tổng (50 dòng)
5,053
18,250
100.0%
16,943
+7.7%
10,322
8,849
921
`;

    it('merge chuẩn xác Luỹ kế Thực và Luỹ kế Quy đổi', () => {
        const rows = mergeRevenueData(luyKeThucSample, luyKeQdSample);
        expect(rows.length).toBeGreaterThan(0);

        // Kiểm tra dòng Tổng
        const total = rows.find(r => r.type === 'total');
        expect(total).toBeDefined();
        expect(total?.soLuong).toBe(5053);
        expect(total?.dtlk).toBe(12212);
        expect(total?.dtqd).toBe(18250);

        // Nhân viên Phạm Anh Nhân: dtlk=791, dtqd=1100, soLuong=230
        const nhan = rows.find(r => r.type === 'employee' && (r.originalName?.includes('107617') || r.originalName?.includes('Anh Nhân')));
        expect(nhan).toBeDefined();
        expect(nhan?.dtlk).toBe(791);
        expect(nhan?.dtqd).toBe(1100);
        expect(nhan?.soLuong).toBe(230);

        // Nhân viên Chế Thị Út: dtlk=674, dtqd=1034, soLuong=257
        const ut = rows.find(r => r.type === 'employee' && (r.originalName?.includes('95970') || r.originalName?.includes('Thị Út')));
        expect(ut).toBeDefined();
        expect(ut?.dtlk).toBe(674);
        expect(ut?.dtqd).toBe(1034);
        expect(ut?.soLuong).toBe(257);
    });

    it('tương thích ngược khi chỉ truyền một bảng', () => {
        // Chỉ truyền bảng thực
        const rowsThuc = parseRevenueData(luyKeThucSample);
        const nhanThuc = rowsThuc.find(r => r.type === 'employee' && r.originalName?.includes('107617'));
        expect(nhanThuc?.dtlk).toBe(791);
        expect(nhanThuc?.dtqd).toBe(0);

        // Chỉ truyền bảng qđ
        const rowsQd = parseRevenueData(luyKeQdSample);
        const nhanQd = rowsQd.find(r => r.type === 'employee' && r.originalName?.includes('107617'));
        expect(nhanQd?.dtlk).toBe(0);
        expect(nhanQd?.dtqd).toBe(1100);
    });
});
