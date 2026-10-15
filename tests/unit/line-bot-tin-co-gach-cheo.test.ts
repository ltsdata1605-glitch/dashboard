import { describe, it, expect } from 'vitest';
import { laIdDocHopLe } from '../../functions/src/firestoreDocId';

/** Bot LINE: tin nhắn có "/" từng làm webhook văng 500 khi tra lệnh báo cáo (log 12–14/10/2026). */
describe('ID document Firestore hợp lệ', () => {
    it('tin nhắn thật trong log có "/" → không tra lệnh (không văng lỗi)', () => {
        for (const t of ['em1bộkmss9/10', 'iphonevềnhaanh/chị', 'ngày8/10nhậnhàngrồigiờhàngđâu', 'laptop:lenovo/máytínhbảngmới', '6giờsáng16/10hếthạn.', '//']) {
            expect(laIdDocHopLe(t)).toBe(false);
        }
    });
    it('lệnh báo cáo bình thường vẫn tra được', () => {
        for (const t of ['bc', 'cttk', 'dt', 'thidua', 'ngày12:300825:456', 'báocáo']) expect(laIdDocHopLe(t)).toBe(true);
    });
    it('chuỗi Firestore cấm khác', () => {
        for (const t of ['', '.', '..', '__abc__', 'x'.repeat(1501)]) expect(laIdDocHopLe(t)).toBe(false);
        expect(laIdDocHopLe(undefined)).toBe(false);
    });
});
