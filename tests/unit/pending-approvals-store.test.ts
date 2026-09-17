/**
 * Đếm số lượt gọi Cloud Function `listManagedUsers('pending')` — bản sửa hạn mức Firestore
 * 2026-09-17, mục 4 (xem implementation_plan.md mục "Audit hạn mức đọc/ghi Firestore").
 *
 * Trước bản sửa có 3 vòng polling ĐỘC LẬP 45s cùng gọi đúng 1 Cloud Function này
 * (NotificationDropdown + usePendingApprovalCount mount ở PendingApprovalBanner + mount lần 2 ở
 * DashboardView) → 240 lượt gọi/giờ cho mỗi admin/manager, mỗi lượt server đọc toàn bộ user
 * `status == 'pending'`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let callCount = 0;
let resolveNext: ((users: unknown[]) => void) | null = null;

vi.mock('../../services/firebase', () => ({ functions: {}, db: {}, app: {} }));
vi.mock('firebase/functions', () => ({
    httpsCallable: () => async () => ({ data: { users: [] } }),
    getFunctions: () => ({}),
}));
vi.mock('../../services/adminUserService', () => ({
    MANAGED_USERS_CHANGED_EVENT: 'ycx-managed-users-changed',
    listManagedUsers: async () => {
        callCount += 1;
        if (resolveNext) {
            return new Promise((resolve) => {
                const r = resolveNext!;
                resolveNext = null;
                r(([] as unknown[]));
                resolve([{ id: `u${callCount}` }]);
            });
        }
        return [{ id: `u${callCount}` }];
    },
}));

const store = await import('../../services/pendingApprovalsStore');
const {
    subscribeToPendingApprovals,
    refreshPendingApprovals,
    PENDING_APPROVALS_POLL_INTERVAL_MS,
    PENDING_APPROVALS_STALE_MS,
    __resetPendingApprovalsStoreForTests,
} = store;

const flush = () => new Promise((r) => setTimeout(r, 0));

// vitest.config.ts dùng `environment: 'node'` (không có jsdom trong dự án), nên dựng tối thiểu
// `document`/`window` bằng EventTarget sẵn có của Node để kiểm ĐÚNG đường đi thật của store:
// tạm dừng theo visibilitychange + làm mới ngay khi nhận event ycx-managed-users-changed.
class FakeDocument extends EventTarget {
    visibilityState: 'visible' | 'hidden' = 'visible';
}
const fakeDocument = new FakeDocument();
const fakeWindow = new EventTarget();
(globalThis as unknown as { document: unknown }).document = fakeDocument;
(globalThis as unknown as { window: unknown }).window = fakeWindow;

describe('pendingApprovalsStore — 1 nguồn dùng chung thay cho 3 vòng poll', () => {
    beforeEach(() => {
        callCount = 0;
        resolveNext = null;
        __resetPendingApprovalsStoreForTests();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
        __resetPendingApprovalsStoreForTests();
        vi.useRealTimers();
    });

    it('chu kỳ poll là 120s (trước bản sửa: 45s ở MỖI nơi)', () => {
        expect(PENDING_APPROVALS_POLL_INTERVAL_MS).toBe(120_000);
        expect(PENDING_APPROVALS_STALE_MS).toBeLessThan(PENDING_APPROVALS_POLL_INTERVAL_MS);
    });

    it('3 component mount cùng lúc → ĐÚNG 1 lượt gọi (trước: 3)', async () => {
        const unsubs = [
            subscribeToPendingApprovals('scope1', () => {}),
            subscribeToPendingApprovals('scope1', () => {}),
            subscribeToPendingApprovals('scope1', () => {}),
        ];
        await flush();

        expect(callCount).toBe(1);
        unsubs.forEach((u) => u());
    });

    it('mount thêm trong thời gian STALE → 0 lượt gọi thêm', async () => {
        const u1 = subscribeToPendingApprovals('scope1', () => {});
        await flush();
        expect(callCount).toBe(1);

        vi.advanceTimersByTime(PENDING_APPROVALS_STALE_MS - 1000);
        const u2 = subscribeToPendingApprovals('scope1', () => {});
        await flush();

        expect(callCount).toBe(1);
        u1(); u2();
    });

    it('mọi subscriber đều nhận được dữ liệu, kèm cờ loaded', async () => {
        const seen: Array<{ n: number; loaded: boolean }> = [];
        const u = subscribeToPendingApprovals('scope1', (users, loaded) => {
            seen.push({ n: users.length, loaded });
        });
        await flush();

        expect(seen[0]).toEqual({ n: 0, loaded: false }); // phát cache ngay lúc đăng ký
        expect(seen[seen.length - 1]).toEqual({ n: 1, loaded: true });
        u();
    });

    it('1 giờ với 3 subscriber: 30 lượt gọi (trước bản sửa: 240)', async () => {
        const unsubs = [
            subscribeToPendingApprovals('scope1', () => {}),
            subscribeToPendingApprovals('scope1', () => {}),
            subscribeToPendingApprovals('scope1', () => {}),
        ];
        await flush();

        for (let i = 0; i < 30; i++) {
            vi.advanceTimersByTime(PENDING_APPROVALS_POLL_INTERVAL_MS);
            await flush();
        }

        // 1 lượt lúc mount + 29 tick trong 1 giờ (tick thứ 30 đúng mốc 3600s).
        expect(callCount).toBeLessThanOrEqual(31);
        expect(callCount).toBeGreaterThanOrEqual(29);
        unsubs.forEach((u) => u());
    });

    it('hủy hết subscriber → vòng poll dừng hẳn', async () => {
        const u = subscribeToPendingApprovals('scope1', () => {});
        await flush();
        const afterMount = callCount;
        u();

        vi.advanceTimersByTime(PENDING_APPROVALS_POLL_INTERVAL_MS * 5);
        await flush();

        expect(callCount).toBe(afterMount);
    });

    it('đổi người dùng (scopeKey khác) → xoá cache, gọi lại ngay', async () => {
        const u1 = subscribeToPendingApprovals('scope1', () => {});
        await flush();
        expect(callCount).toBe(1);
        u1();

        const u2 = subscribeToPendingApprovals('scope2', () => {});
        await flush();

        expect(callCount).toBe(2); // KHÔNG dùng cache của người dùng trước
        u2();
    });

    it('tab ẩn → dừng poll; tab hiện lại → fetch bù 1 lần rồi chạy tiếp', async () => {
        const u = subscribeToPendingApprovals('scope1', () => {});
        await flush();
        expect(callCount).toBe(1);

        fakeDocument.visibilityState = 'hidden';
        fakeDocument.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(PENDING_APPROVALS_POLL_INTERVAL_MS * 4);
        await flush();
        expect(callCount).toBe(1); // không gọi gì khi tab ẩn

        fakeDocument.visibilityState = 'visible';
        fakeDocument.dispatchEvent(new Event('visibilitychange'));
        await flush();
        expect(callCount).toBe(2); // fetch bù đúng 1 lần

        u();
    });

    it('refreshPendingApprovals(true) bỏ qua STALE (dùng sau khi admin vừa duyệt)', async () => {
        const u = subscribeToPendingApprovals('scope1', () => {});
        await flush();
        expect(callCount).toBe(1);

        await refreshPendingApprovals();        // còn trong STALE → bỏ qua
        expect(callCount).toBe(1);

        await refreshPendingApprovals(true);    // cưỡng chế
        expect(callCount).toBe(2);
        u();
    });

    it('event ycx-managed-users-changed làm mới ngay, không chờ hết chu kỳ', async () => {
        const u = subscribeToPendingApprovals('scope1', () => {});
        await flush();
        expect(callCount).toBe(1);

        fakeWindow.dispatchEvent(new CustomEvent('ycx-managed-users-changed'));
        await flush();

        expect(callCount).toBe(2);
        u();
    });
});
