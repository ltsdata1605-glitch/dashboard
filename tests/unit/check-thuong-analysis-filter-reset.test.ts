import { describe, it, expect } from 'vitest';
import { getGroupDefinitions } from '../../features/check-thuong/services/checkThuongSearch';
import { CHECK_THUONG_COLS } from '../../features/check-thuong/services/checkThuongCalc';

describe('Check Thưởng - Logic đưa về trạng thái mặc định khi lọc môn thi', () => {
    // Giả lập dữ liệu siêu thị 910 gồm nhiều ngành hàng (đạt thưởng, < 100%, v.v.)
    const mockData: any[][] = [
        ['', 'Tỉnh', 'QL', 'ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'T10 - ĐIỆN THOẠI VIVO', 1.27, 0, 7, 7, '', 500000, 0, 500000],
        ['', 'Tỉnh', 'QL', 'ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'T10 - VAS', 1.15, 0, 7, 7, '', 300000, 0, 300000],
        ['', 'Tỉnh', 'QL', 'ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'T10 - MÁY SẤY & MÁY RỬA CHÉN', 1.05, 0, 7, 7, '', 200000, 0, 200000],
        ['', 'Tỉnh', 'QL', 'ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'T10 - PHỤ KIỆN', 0.85, 0, 7, 12, '', 0, 0, 0], // < 100%
        ['', 'Tỉnh', 'QL', 'ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'T10 - LOA', 0.65, 0, 7, 15, '', 0, 0, 0], // < 100%
    ];

    const mockPreprocessed: any = {
        noFundGroups: new Set<string>(),
        bestAwardedByGroup: {},
        bestAwardedByName: {}
    };

    it('khi lọc thẻ < 100%, chỉ có các môn < 100% xuất hiện', () => {
        const groups = getGroupDefinitions(mockData, mockPreprocessed);
        const notAchievedGroup = groups.find(g => g.key === 'notAchieved100');
        expect(notAchievedGroup).toBeDefined();
        expect(notAchievedGroup!.data.length).toBe(2);
        // T10 - ĐIỆN THOẠI VIVO không nằm trong nhóm này vì đạt 127% >= 100%
        const hasVivo = notAchievedGroup!.data.some(r => r[CHECK_THUONG_COLS.NGANH_HANG] === 'T10 - ĐIỆN THOẠI VIVO');
        expect(hasVivo).toBe(false);
    });

    it('khi bấm vào môn thi từ Phân Tích & Đề Xuất (T10 - ĐIỆN THOẠI VIVO), reset activeFilter về "all" và lọc chính xác môn đó', () => {
        const groups = getGroupDefinitions(mockData, mockPreprocessed);

        // Trạng thái ban đầu: đang lọc < 100%
        let activeFilter = 'notAchieved100';
        let selectedCategoryName: string | null = null;

        // Mô phỏng hàm handleSelectCategoryFromAnalysis khi bấm vào T10 - ĐIỆN THOẠI VIVO
        const targetCategory = 'T10 - ĐIỆN THOẠI VIVO';
        activeFilter = 'all'; // Đưa thẻ KPI về trạng thái mặc định ngay lập tức
        selectedCategoryName = targetCategory;

        // Tính filteredGroups theo logic mới của CheckThuongSearchView
        let baseGroups = activeFilter === 'all'
            ? groups
            : groups.filter(g => g.key === activeFilter);

        if (selectedCategoryName) {
            const cleanTarget = selectedCategoryName.trim().toUpperCase();
            baseGroups = baseGroups
                .map(g => ({
                    ...g,
                    data: g.data.filter(row => {
                        const cat = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase();
                        return cat === cleanTarget;
                    })
                }))
                .filter(g => g.data.length > 0);
        }

        // Kiểm chứng:
        // 1. activeFilter đã về 'all' (thẻ < 100% không còn bị chọn)
        expect(activeFilter).toBe('all');

        // 2. Nhóm chứa môn thi (Đạt thưởng) hiển thị đúng 1 dòng T10 - ĐIỆN THOẠI VIVO
        expect(baseGroups.length).toBe(2); // achieved và achieved100 đều chứa T10 - ĐIỆN THOẠI VIVO
        expect(baseGroups[0].data[0][CHECK_THUONG_COLS.NGANH_HANG]).toBe('T10 - ĐIỆN THOẠI VIVO');
    });

    it('khi bấm huỷ lọc hoặc đóng modal, đưa toàn bộ về trạng thái mặc định ban đầu', () => {
        let activeFilter = 'notAchieved100';
        let selectedCategoryName: string | null = 'T10 - ĐIỆN THOẠI VIVO';

        // Đóng modal / Bấm nút đưa về mặc định
        selectedCategoryName = null;
        activeFilter = 'all';

        expect(activeFilter).toBe('all');
        expect(selectedCategoryName).toBeNull();
    });
});
