import { describe, it, expect, vi } from 'vitest';
import { validateThiDuaData } from '../utils/nhanVienHelpers';

describe('Data Validation & Data Preservation (Bảo toàn dữ liệu ban đầu)', () => {
    it('khi dữ liệu dán vào SAI định dạng, dataSetter KHÔNG được gọi và dữ liệu ban đầu được giữ nguyên', () => {
        let currentStoredData = 'DỮ LIỆU BAN ĐẦU HỢP LỆ CỦA SIÊU THỊ';
        const mockDataSetter = vi.fn((val: string) => {
            currentStoredData = val;
        });
        const mockTsSetter = vi.fn();

        // Mô phỏng logic handleUpdate bảo vệ dữ liệu
        const handleUpdate = (
            val: string,
            validator: (s: string) => boolean,
            dataSetter: (value: string) => void,
            tsSetter: (value: string | null) => void
        ): boolean => {
            if (val === '') {
                dataSetter('');
                tsSetter(null);
                return false;
            }
            if (validator(val)) {
                dataSetter(val);
                tsSetter('12:00 18/09');
                return true;
            } else {
                // Sai định dạng: KHÔNG gọi dataSetter, giữ nguyên dữ liệu
                return false;
            }
        };

        const invalidPastedData = 'Văn bản linh tinh không đúng định dạng báo cáo MWG 123456';
        const isSuccess = handleUpdate(invalidPastedData, validateThiDuaData, mockDataSetter, mockTsSetter);

        expect(isSuccess).toBe(false);
        expect(mockDataSetter).not.toHaveBeenCalled();
        expect(mockTsSetter).not.toHaveBeenCalled();
        // Dữ liệu ban đầu không bị mất
        expect(currentStoredData).toBe('DỮ LIỆU BAN ĐẦU HỢP LỆ CỦA SIÊU THỊ');
    });

    it('khi dữ liệu dán vào ĐÚNG định dạng, dataSetter được gọi và cập nhật dữ liệu mới', () => {
        let currentStoredData = 'DỮ LIỆU BAN ĐẦU';
        const mockDataSetter = vi.fn((val: string) => {
            currentStoredData = val;
        });
        const mockTsSetter = vi.fn();

        const handleUpdate = (
            val: string,
            validator: (s: string) => boolean,
            dataSetter: (value: string) => void,
            tsSetter: (value: string | null) => void
        ): boolean => {
            if (val === '') {
                dataSetter('');
                tsSetter(null);
                return false;
            }
            if (validator(val)) {
                dataSetter(val);
                tsSetter('12:00 18/09');
                return true;
            } else {
                return false;
            }
        };

        const validThiDuaData = 'Phòng ban\tDOANH THU\tHẠNG TRONG ST\n276650 - Nguyễn Văn A\t100\t1';
        const isSuccess = handleUpdate(validThiDuaData, validateThiDuaData, mockDataSetter, mockTsSetter);

        expect(isSuccess).toBe(true);
        expect(mockDataSetter).toHaveBeenCalledWith(validThiDuaData);
        expect(mockTsSetter).toHaveBeenCalledWith('12:00 18/09');
        expect(currentStoredData).toBe(validThiDuaData);
    });

    it('validateThiDuaData từ chối các chuỗi không chứa thông tin thi đua', () => {
        expect(validateThiDuaData('')).toBe(false);
        expect(validateThiDuaData('abc xyz 123')).toBe(false);
        expect(validateThiDuaData('Doanh thu hôm nay rất tốt')).toBe(false);
    });
});
