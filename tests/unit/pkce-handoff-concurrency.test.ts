import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    prewarmPwaHandoff,
    takePrewarmedPwaHandoff,
    getOrPreparePwaHandoff,
    preparePwaHandoff,
    _resetPkcePrewarmForTesting,
} from '../../services/firebase';

describe('PKCE Prewarming & Concurrency Protection', () => {
    beforeEach(() => {
        _resetPkcePrewarmForTesting();
    });

    it('khử trùng lặp (deduplication): nhiều yêu cầu prewarm đồng thời chia sẻ chung 1 Promise', async () => {
        const p1 = prewarmPwaHandoff();
        const p2 = prewarmPwaHandoff();
        const p3 = prewarmPwaHandoff();

        // Cả 3 Promise phải là cùng 1 instance (tham chiếu giống nhau)
        expect(p1).toBe(p2);
        expect(p2).toBe(p3);

        const [res1, res2, res3] = await Promise.all([p1, p2, p3]);
        expect(res1.code).toBe(res2.code);
        expect(res2.code).toBe(res3.code);
        expect(res1.verifier).toBe(res2.verifier);
    });

    it('bảo đảm mã PKCE là single-use: takePrewarmedPwaHandoff() chỉ trả về 1 lần rồi xóa cache', async () => {
        await prewarmPwaHandoff();

        const firstTake = takePrewarmedPwaHandoff();
        expect(firstTake).not.toBeNull();
        expect(firstTake?.verifier).toBeDefined();
        expect(firstTake?.code).toBeDefined();

        // Lần lấy thứ hai ngay sau đó phải trả về null (mã không bao giờ được dùng lại)
        const secondTake = takePrewarmedPwaHandoff();
        expect(secondTake).toBeNull();
    });

    it('nhiều consumer gọi getOrPreparePwaHandoff() đồng thời luôn nhận các cặp mã ĐỘC NHẤT', async () => {
        // 5 consumer gọi cùng một tích tắc
        const promises = Array.from({ length: 5 }, () => getOrPreparePwaHandoff());
        const results = await Promise.all(promises);

        // Tất cả kết quả đều hợp lệ
        for (const res of results) {
            expect(res.verifier).toBeTruthy();
            expect(res.code).toBeTruthy();
        }

        // Không có bất kỳ 2 consumer nào nhận trùng code hoặc verifier
        const verifiers = results.map(r => r.verifier);
        const codes = results.map(r => r.code);

        const uniqueVerifiers = new Set(verifiers);
        const uniqueCodes = new Set(codes);

        expect(uniqueVerifiers.size).toBe(5);
        expect(uniqueCodes.size).toBe(5);
    });

    it('tự động làm đầy cache (refill) trong nền sau khi tiêu thụ', async () => {
        await prewarmPwaHandoff();
        const taken = takePrewarmedPwaHandoff();
        expect(taken).not.toBeNull();

        // Chờ lượt prewarm ngầm hoàn thành
        await new Promise(r => setTimeout(r, 50));

        const nextPrewarmed = takePrewarmedPwaHandoff();
        expect(nextPrewarmed).not.toBeNull();
        // Mã mới phải hoàn toàn khác mã cũ đã lấy
        expect(nextPrewarmed?.code).not.toBe(taken?.code);
        expect(nextPrewarmed?.verifier).not.toBe(taken?.verifier);
    });

    it('xử lý an toàn khi crypto digest thất bại và giải phóng in-flight promise để retry', async () => {
        const digestSpy = vi.spyOn(crypto.subtle, 'digest');
        try {
            // Giả lập Web Crypto digest bị lỗi
            digestSpy.mockRejectedValueOnce(new Error('Subtle digest error'));

            await expect(prewarmPwaHandoff()).rejects.toThrow('Subtle digest error');

            // Lượt gọi tiếp theo phải retry thành công mà không bị kẹt promise cũ
            const retryRes = await prewarmPwaHandoff();
            expect(retryRes.code).toBeTruthy();
            expect(retryRes.verifier).toBeTruthy();
        } finally {
            digestSpy.mockRestore();
        }
    });

    it('bảo đảm sequence tag: kết quả Promise cũ giải quyết trễ KHÔNG ghi đè mã mới', async () => {
        // Khởi tạo prewarm đầu tiên
        const p1 = prewarmPwaHandoff();
        const res1 = await p1;

        // Tiêu thụ mã 1
        const taken1 = takePrewarmedPwaHandoff();
        expect(taken1?.code).toBe(res1.code);

        // Chờ prewarm thứ hai (seq 2) hoàn thành
        await new Promise(r => setTimeout(r, 50));
        const taken2 = takePrewarmedPwaHandoff();
        expect(taken2).not.toBeNull();
        expect(taken2?.code).not.toBe(taken1?.code);
    });
});

