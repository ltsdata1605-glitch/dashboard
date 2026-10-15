import { describe, it, expect } from 'vitest';
import { moTaLoiLine, laHetHanMuc, LINE_HET_HAN_MUC } from '../../functions/src/lineErrors';

/** Lịch "Gửi Notify" chạy đúng giờ nhưng LINE trả 429 hết hạn mức tháng (log 14–15/10/2026) — phải báo rõ, không im lặng "0/1 nhóm". */
describe('đổi lỗi LINE thành câu dễ hiểu', () => {
    it('429 hết hạn mức tháng (đúng nguyên văn log)', () => {
        expect(moTaLoiLine(429, 'You have reached your monthly limit.')).toBe(LINE_HET_HAN_MUC);
        expect(laHetHanMuc(429, 'You have reached your monthly limit.')).toBe(true);
    });
    it('429 khác = giới hạn tốc độ, không phải hết hạn mức', () => {
        expect(moTaLoiLine(429, 'Too Many Requests')).toMatch(/giới hạn tốc độ/);
        expect(laHetHanMuc(429, 'Too Many Requests')).toBe(false);
    });
    it('401 token, 400 nhóm, lỗi lạ giữ nguyên thông điệp', () => {
        expect(moTaLoiLine(401, 'Authentication failed')).toMatch(/Token/);
        expect(moTaLoiLine(400, "The property, 'to', in the request body is invalid")).toMatch(/không còn trong nhóm/);
        expect(moTaLoiLine(500, 'boom')).toBe('LINE báo lỗi (500): boom');
    });
});
