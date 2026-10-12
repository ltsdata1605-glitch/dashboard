import { describe, it, expect } from 'vitest';
import { parseEmployeeCompetitionTargets, findCompetitionSlider } from './employeeParser';
import type { Employee as NhanVienEmployee } from '../types/nhanVienTypes';

describe('parseEmployeeCompetitionTargets — lấy dữ liệu target thi đua chuẩn xác', () => {
    const mockEmployees: NhanVienEmployee[] = Array.from({ length: 28 }, (_, i) => ({
        originalName: `${1000 + i} - Nhân Viên ${i + 1}`,
        name: `NV ${i + 1}`,
        department: `NHÓM ${(i % 4) + 1}`
    }));

    const luyKeText = `
Siêu thị
910 - ĐML_STR_STR - 99 Hùng Vương
T09/T10 IPHONE 18 SERIES, IPHONE DUO
DOANH THU\tTARGET\t% HT THÁNG\t% DỰ BÁO\tHẠNG VÙNG\tTOP/BOTTOM VÙNG
ĐML_STR_STR - 99 Hùng Vương
726.22\t2,713.00\t26.8%\t39%\t280\t-
T10/AUDIO
DOANH THU\tTARGET\t% HT THÁNG\t% DỰ BÁO\tHẠNG VÙNG\tTOP/BOTTOM VÙNG
ĐML_STR_STR - 99 Hùng Vương
52.00\t123.00\t42.3%\t50%\t100\t-
`;

    const realtimeText = `
Siêu thị
910 - ĐML_STR_STR - 99 Hùng Vương
T09/T10 IPHONE 18 SERIES, IPHONE DUO
DOANH THU\tTARGET\t% HT THÁNG\t% DỰ BÁO\tHẠNG VÙNG\tTOP/BOTTOM VÙNG
ĐML_STR_STR - 99 Hùng Vương
0.00\t61.66\t0%\t-\t6\t-
T10/AUDIO
DOANH THU\tTARGET\t% HT THÁNG\t% DỰ BÁO\tHẠNG VÙNG\tTOP/BOTTOM VÙNG
ĐML_STR_STR - 99 Hùng Vương
0.00\t1.67\t0%\t-\t10\t-
`;

    const sm = '910 - ĐML_STR_STR - 99 Hùng Vương';
    const smDataMap = new Map();
    smDataMap.set(sm, {
        competitionTargets: {
            'T09/T10 IPHONE 18 SERIES, IPHONE DUO': 100,
            'T10/AUDIO': 100
        }
    });

    it('tính đúng target mỗi nhân viên = Target siêu thị / Tổng số NV khi có Luỹ Kế', () => {
        const targets = parseEmployeeCompetitionTargets(
            luyKeText,
            [sm],
            smDataMap,
            mockEmployees
        );

        const iphoneMap = targets.get('T09/T10 IPHONE 18 SERIES, IPHONE DUO');
        expect(iphoneMap).toBeDefined();

        // Target siêu thị = 2.713 Tr, 28 NV -> mỗi NV = 2713 / 28 = 96.8928... Tr
        const emp0Target = iphoneMap!.get(mockEmployees[0].originalName);
        expect(emp0Target).toBeCloseTo(96.89, 1);

        const audioMap = targets.get('T10/AUDIO');
        expect(audioMap).toBeDefined();

        // Target siêu thị = 123 Tr, 28 NV -> mỗi NV = 123 / 28 = 4.3928... Tr
        const emp0Audio = audioMap!.get(mockEmployees[0].originalName);
        expect(emp0Audio).toBeCloseTo(4.39, 1);
    });

    it('không bị Realtime (target ngày) đè mất Target tháng của Luỹ Kế', () => {
        // Cả khi truyền Luỹ Kế làm primary và Realtime làm fallback
        const targets = parseEmployeeCompetitionTargets(
            luyKeText,
            [sm],
            smDataMap,
            mockEmployees,
            realtimeText
        );

        const iphoneMap = targets.get('T09/T10 IPHONE 18 SERIES, IPHONE DUO');
        const emp0Target = iphoneMap!.get(mockEmployees[0].originalName);
        // Không bị tụt xuống 61.66 / 28 = 2.2 Tr
        expect(emp0Target).toBeGreaterThan(90);
        expect(emp0Target).toBeCloseTo(96.89, 1);
    });

    it('kể cả khi truyền mảng lines nối nhau (Luỹ Kế + Realtime), Luỹ Kế vẫn được bảo vệ', () => {
        const joinedLines = [...luyKeText.split('\n'), ...realtimeText.split('\n')];
        const targets = parseEmployeeCompetitionTargets(
            joinedLines,
            [sm],
            smDataMap,
            mockEmployees
        );

        const iphoneMap = targets.get('T09/T10 IPHONE 18 SERIES, IPHONE DUO');
        const emp0Target = iphoneMap!.get(mockEmployees[0].originalName);
        expect(emp0Target).toBeCloseTo(96.89, 1);
    });
});
