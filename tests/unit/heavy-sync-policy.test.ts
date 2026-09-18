/**
 * Lưới an toàn cho đường "lấy khoá nặng từ Cloud về máy" — `services/heavySyncPolicy.ts`.
 *
 * Đây là chỗ đã sinh ÍT NHẤT 3 bug do người dùng báo, trong đó bug self-echo (lượt ghi của CHÍNH
 * tab này vọng về rồi bị hiểu nhầm là "thiết bị khác vừa sửa") bị báo lại tới lần thứ 3 dù đã có
 * 2 lớp phòng thủ. Trước bản tách 2026-09-18, logic nằm lẫn trong một callback `onSnapshot` dài
 * nên KHÔNG CÓ CÁCH NÀO viết test. Bộ test này khoá lại từng lớp chặn.
 */
import { describe, it, expect } from 'vitest';
import {
    considerCloudDoc,
    isCloudNewer,
    extractCloudTimeMs,
    type CloudDocShape,
} from '../../services/heavySyncPolicy';

const okDoc: CloudDocShape = { value: { a: 1 }, updatedAt: 1_700_000_000_000 };

/** Đầu vào "mọi thứ đều thuận" — từng test chỉ đổi đúng một yếu tố để cô lập nguyên nhân. */
const baseInput = {
    isHeavyKey: true,
    hasPendingWrites: false,
    localWritePendingOrInFlight: false,
    data: okDoc as CloudDocShape | null | undefined,
};

describe('considerCloudDoc — các lớp chặn', () => {
    it('trường hợp thuận: cho phép xét, trả về mốc thời gian Cloud', () => {
        const r = considerCloudDoc(baseInput);
        expect(r).toEqual({ consider: true, cloudTimeMs: 1_700_000_000_000 });
    });

    it('không phải khoá nặng → bỏ qua', () => {
        expect(considerCloudDoc({ ...baseInput, isHeavyKey: false }))
            .toEqual({ consider: false, reason: 'not-heavy-key' });
    });

    it('SELF-ECHO: hasPendingWrites → bỏ qua (lớp chặn đáng tin cậy nhất)', () => {
        // Bug user báo LẦN 3. `hasPendingWrites = true` nghĩa là snapshot này đến từ cache cục bộ
        // của CHÍNH tab này cho lượt ghi chưa được server xác nhận → chắc chắn là tiếng vọng.
        expect(considerCloudDoc({ ...baseInput, hasPendingWrites: true }))
            .toEqual({ consider: false, reason: 'self-echo-pending-writes' });
    });

    it('SELF-ECHO: tab này đang có lượt ghi chờ/đang bay → bỏ qua (lớp dự phòng)', () => {
        expect(considerCloudDoc({ ...baseInput, localWritePendingOrInFlight: true }))
            .toEqual({ consider: false, reason: 'local-write-pending-or-in-flight' });
    });

    it('THỨ TỰ QUAN TRỌNG: hasPendingWrites phải thắng mọi yếu tố khác', () => {
        // Nếu ai đó đổi thứ tự kiểm tra, bug self-echo lần 4 sẽ quay lại. Test này chặn điều đó.
        const r = considerCloudDoc({
            ...baseInput,
            hasPendingWrites: true,
            localWritePendingOrInFlight: true,
            data: { value: { a: 2 }, updatedAt: 9_999_999_999_999 }, // cloud "rất mới"
        });
        expect(r).toEqual({ consider: false, reason: 'self-echo-pending-writes' });
    });

    it('không có dữ liệu → bỏ qua', () => {
        expect(considerCloudDoc({ ...baseInput, data: undefined }))
            .toEqual({ consider: false, reason: 'no-data' });
        expect(considerCloudDoc({ ...baseInput, data: null }))
            .toEqual({ consider: false, reason: 'no-data' });
    });

    it('document HỎNG (không chunk mà cũng không có value) → bỏ qua, KHÔNG ghi đè local', () => {
        expect(considerCloudDoc({ ...baseInput, data: { updatedAt: 1 } }))
            .toEqual({ consider: false, reason: 'malformed' });
    });

    it('document đã CHUNK vốn không có `value` — phải được xét, không bị coi là hỏng', () => {
        // Nếu nhầm nhánh này thành 'malformed' thì mọi cấu hình lớn (vd checkthuong_data ~4MB)
        // sẽ KHÔNG BAO GIỜ đồng bộ được về máy khác, mà không có lỗi nào báo ra.
        const r = considerCloudDoc({ ...baseInput, data: { chunked: true, chunkCount: 3, updatedAt: 555 } as CloudDocShape });
        expect(r).toEqual({ consider: true, cloudTimeMs: 555 });
    });
});

describe('extractCloudTimeMs — chịu được 3 dạng dữ liệu cùng tồn tại trong Firestore', () => {
    it('Firestore Timestamp (có .toMillis())', () => {
        expect(extractCloudTimeMs({ updatedAt: { toMillis: () => 12345 } })).toBe(12345);
    });

    it('số ms trực tiếp', () => {
        expect(extractCloudTimeMs({ updatedAt: 777 })).toBe(777);
    });

    it('bản ghi CŨ chỉ có savedAt', () => {
        expect(extractCloudTimeMs({ savedAt: 888 })).toBe(888);
    });

    it('không xác định được → 0, và 0 là an toàn (chỉ lấy khi máy chưa có dữ liệu)', () => {
        expect(extractCloudTimeMs({})).toBe(0);
        expect(extractCloudTimeMs({ updatedAt: null, savedAt: null })).toBe(0);
        // Với mốc 0, local đã có dữ liệu thì KHÔNG bị ghi đè.
        expect(isCloudNewer(0, true, 1)).toBe(false);
        expect(isCloudNewer(0, true, 0)).toBe(false);
    });

    it('ưu tiên updatedAt hơn savedAt khi có cả hai', () => {
        expect(extractCloudTimeMs({ updatedAt: 100, savedAt: 200 })).toBe(100);
    });
});

describe('isCloudNewer — so mốc thời gian', () => {
    it('máy CHƯA có dữ liệu → luôn lấy về, bất kể mốc thời gian', () => {
        // Thiếu nhánh này thì máy mới / máy vừa xoá dữ liệu trình duyệt sẽ kẹt vĩnh viễn ở trạng
        // thái rỗng khi cloud không có thay đổi nào mới.
        expect(isCloudNewer(0, false, 0)).toBe(true);
        expect(isCloudNewer(100, false, 999_999)).toBe(true);
    });

    it('cloud mới hơn → lấy về', () => {
        expect(isCloudNewer(200, true, 100)).toBe(true);
    });

    it('bằng nhau → KHÔNG lấy (local đã khớp đúng trạng thái đó)', () => {
        expect(isCloudNewer(100, true, 100)).toBe(false);
    });

    it('local mới hơn → KHÔNG ghi đè (chống mất dữ liệu người dùng vừa sửa)', () => {
        expect(isCloudNewer(100, true, 200)).toBe(false);
    });
});
