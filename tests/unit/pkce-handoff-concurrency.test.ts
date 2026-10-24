import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    prewarmPwaHandoff,
    takePrewarmedPwaHandoff,
    getOrPreparePwaHandoff,
    preparePwaHandoff,
    clearPendingPwaHandoff,
    readPendingHandoff,
    _resetPkcePrewarmForTesting,
} from '../../services/firebase';

function createDeferred<T>() {
    let resolve!: (val: T) => void;
    let reject!: (err?: any) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
    };
}

describe('PKCE Prewarming & Concurrency Protection', () => {
    beforeEach(() => {
        _resetPkcePrewarmForTesting();
        try {
            localStorage.removeItem('ycxPwaHandoff');
        } catch { /* bỏ qua */ }
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

    it('kiểm chứng sequence tag bằng Deferred Promises: Promise cũ hoàn thành muộn KHÔNG ghi đè Promise mới hoàn thành trước', async () => {
        const deferred1 = createDeferred<ArrayBuffer>();
        const deferred2 = createDeferred<ArrayBuffer>();

        const originalDigest = crypto.subtle.digest.bind(crypto.subtle);
        let callCount = 0;

        const digestSpy = vi.spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
            callCount++;
            if (callCount === 1) {
                return deferred1.promise;
            }
            if (callCount === 2) {
                return deferred2.promise;
            }
            return originalDigest(algorithm, data);
        });

        try {
            // 1. Khởi tạo Promise 1 (seq N) - bị giữ lại (deferred1)
            const p1 = prewarmPwaHandoff();

            // 2. Reset/bump sequence để bắt đầu lượt chuẩn bị mới (seq N + 1000)
            _resetPkcePrewarmForTesting();

            // 3. Khởi tạo Promise 2 (seq mới) - bị giữ lại (deferred2)
            const p2 = prewarmPwaHandoff();

            // 4. Cho Promise 2 giải quyết TRƯỚC bằng hash của mã 2
            const hashBuffer2 = new Uint8Array([2, 2, 2, 2, 2, 2, 2, 2]).buffer;
            deferred2.resolve(hashBuffer2);
            const res2 = await p2;

            // Bộ đệm đang giữ kết quả của Promise 2
            const prewarmedBeforeP1Resolves = takePrewarmedPwaHandoff();
            expect(prewarmedBeforeP1Resolves?.code).toBe(res2.code);

            // 5. Bây giờ Promise 1 mới giải quyết MUỘN HƠN bằng hash của mã 1
            const hashBuffer1 = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1]).buffer;
            deferred1.resolve(hashBuffer1);
            const res1 = await p1;
            expect(res1.code).not.toBe(res2.code);

            // 6. KIỂM CHỨNG: Kết quả của Promise 1 giải quyết muộn TUYỆT ĐỐI KHÔNG ghi đè vào cache!
            // Cache không được chứa res1, và vì res2 đã bị lấy đi (single-use) nên cache tiếp theo phải null
            const prewarmedAfterP1Resolves = takePrewarmedPwaHandoff();
            expect(prewarmedAfterP1Resolves).toBeNull();
        } finally {
            digestSpy.mockRestore();
        }
    });

    it('test reset cô lập triệt để: Promise dở dang từ bài test trước không làm ô nhiễm bộ đệm test mới', async () => {
        const deferredOld = createDeferred<ArrayBuffer>();
        const originalDigest = crypto.subtle.digest.bind(crypto.subtle);
        let firstCall = true;

        const digestSpy = vi.spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
            if (firstCall) {
                firstCall = false;
                return deferredOld.promise;
            }
            return originalDigest(algorithm, data);
        });

        try {
            // Giả lập Test A: bắt đầu prewarm nhưng unfulfilled
            prewarmPwaHandoff();

            // Kết thúc Test A, gọi reset dọn dẹp
            _resetPkcePrewarmForTesting();

            // Giả lập Test B: bắt đầu chạy và hoàn thành bình thường
            const testBRes = await prewarmPwaHandoff();
            expect(testBRes.code).toBeTruthy();

            // Lúc này Promise dở dang của Test A mới bất ngờ giải quyết
            deferredOld.resolve(new Uint8Array([9, 9, 9, 9]).buffer);
            await new Promise(r => setTimeout(r, 10));

            // Bộ đệm của Test B không hề bị ô nhiễm bởi Test A
            const currentCache = takePrewarmedPwaHandoff();
            expect(currentCache?.code).toBe(testBRes.code);
        } finally {
            digestSpy.mockRestore();
        }
    });

    it('xử lý race condition khi nhận phiên: clearPendingPwaHandoff(expectedVerifier) không xoá phiên mới B của người dùng', () => {
        const PWA_HANDOFF_KEY = 'ycxPwaHandoff';
        // 1. Người dùng mở phiên A
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_A', at: Date.now() }));
        expect(readPendingHandoff()).toBe('verifier_A');

        // 2. Trong lúc phiên A đang chờ máy chủ, người dùng bấm Mở lại -> tạo phiên B
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_B', at: Date.now() }));
        expect(readPendingHandoff()).toBe('verifier_B');

        // 3. Phiên A trả về muộn (hoặc gặp lỗi timeout) và cố gắng gọi clearPendingPwaHandoff('verifier_A')
        clearPendingPwaHandoff('verifier_A');

        // 4. KIỂM CHỨNG: Phiên B trong localStorage KHÔNG BỊ XOÁ!
        expect(readPendingHandoff()).toBe('verifier_B');

        // 5. Khi phiên B hoàn thành thật sự và gọi clearPendingPwaHandoff('verifier_B')
        clearPendingPwaHandoff('verifier_B');
        expect(readPendingHandoff()).toBeNull();

        // 6. Thao tác huỷ chủ động không truyền verifier sẽ xoá dứt điểm
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_C', at: Date.now() }));
        clearPendingPwaHandoff();
        expect(readPendingHandoff()).toBeNull();
    });

    it('kiểm chứng vòng đời React StrictMode: unmount kép không làm rò rỉ hoặc nhân đôi mã PKCE', async () => {
        // Mô phỏng chính xác logic useEffect trong LoginView.tsx:
        // Mount 1:
        let unmounted1 = false;
        let prepared1: any = null;
        getOrPreparePwaHandoff().then(p => {
            if (!unmounted1) prepared1 = p;
        });

        // StrictMode kích hoạt unmount ngay lập tức:
        unmounted1 = true;

        // Mount 2 (lần mount thật sự):
        let unmounted2 = false;
        let prepared2: any = null;
        getOrPreparePwaHandoff().then(p => {
            if (!unmounted2) prepared2 = p;
        });

        // Chờ cả 2 lượt giải quyết
        await new Promise(r => setTimeout(r, 50));

        // Lượt mount 1 đã bị huỷ nên không được gán vào state của component
        expect(prepared1).toBeNull();

        // Lượt mount 2 hợp lệ nhận cặp mã duy nhất, độc lập và sẵn sàng sử dụng
        expect(prepared2).not.toBeNull();
        expect(prepared2?.code).toBeTruthy();
        expect(prepared2?.verifier).toBeTruthy();
    });
});
