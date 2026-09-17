import { listManagedUsers, ManagedUserDoc, MANAGED_USERS_CHANGED_EVENT } from './adminUserService';

/**
 * Nguồn DUY NHẤT cho danh sách yêu cầu cấp quyền đang chờ (`listManagedUsers('pending')`).
 *
 * QUOTA FIX (2026-09-17, audit hạn mức Firestore — xem implementation_plan.md mục "Audit hạn mức
 * đọc/ghi Firestore"): trước bản sửa này có tới 3 vòng polling ĐỘC LẬP cùng gọi đúng 1 Cloud
 * Function, mỗi vòng 45 giây:
 *   - `components/layout/NotificationDropdown.tsx` (dựng thông báo)
 *   - `hooks/usePendingApprovalCount.ts` mount ở `components/layout/PendingApprovalBanner.tsx`
 *   - và MOUNT LẦN 2 của cùng hook đó ở `components/views/DashboardView.tsx`
 * → 240 lượt gọi/giờ cho mỗi admin/manager đang mở tab, mỗi lượt đọc toàn bộ user `status ==
 * 'pending'` (với manager, `functions/src/admin.ts` còn đọc TOÀN CỤC rồi mới lọc Kho).
 *
 * Nay cả 3 chung 1 vòng poll, 1 cache, và 1 request đang bay:
 *   - `POLL_INTERVAL_MS` 120s thay vì 45s.
 *   - `STALE_MS`: component mount thêm trong vòng 60s dùng luôn cache → 0 lượt đọc.
 *   - `inFlight`: nhiều nơi gọi cùng lúc thì dùng chung ĐÚNG 1 request.
 *   - Tự dừng khi tab ẩn, fetch bù 1 lần khi tab hiện lại (giữ đúng hành vi cũ).
 *   - Không còn subscriber nào thì dừng hẳn vòng poll.
 *
 * Module này CỐ Ý không biết gì về auth: nơi gọi tự quyết có subscribe hay không (chỉ admin/
 * manager, không ở chế độ Dùng Thử), nên không subscribe thì store nằm im, không tốn gì.
 */

export const PENDING_APPROVALS_POLL_INTERVAL_MS = 120_000;

/** Kết quả mới hơn mốc này thì coi là còn dùng được, không gọi lại server. */
export const PENDING_APPROVALS_STALE_MS = 60_000;

/**
 * @param loaded `false` khi đây chỉ là cache phát ngay lúc đăng ký mà CHƯA có lượt fetch nào
 *   thành công. Nơi gọi cần phân biệt "chưa tải" với "đã tải, không có yêu cầu nào" — cả hai đều
 *   là mảng rỗng (NotificationDropdown dựa vào đây để không bắn toast hàng loạt lúc mở app).
 */
type Listener = (users: ManagedUserDoc[], loaded: boolean) => void;

const listeners = new Set<Listener>();
let cachedUsers: ManagedUserDoc[] = [];
let fetchedAt = 0;
let inFlight: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let listenersBound = false;
/** Khoá phạm vi (uid + vai trò + Kho). Đổi người dùng thì cache cũ không còn đúng. */
let currentScopeKey: string | null = null;

const isTabVisible = (): boolean =>
    typeof document === 'undefined' || document.visibilityState === 'visible';

/**
 * Gọi server nếu cần.
 * @param force `true` = bỏ qua `STALE_MS` (dùng sau khi admin vừa duyệt/đổi quyền ai đó).
 */
export const refreshPendingApprovals = async (force = false): Promise<void> => {
    if (!force && fetchedAt > 0 && Date.now() - fetchedAt < PENDING_APPROVALS_STALE_MS) return;
    // Đã có request đang bay → dùng chung, không tạo request thứ 2.
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const users = await listManagedUsers('pending');
            cachedUsers = users;
            fetchedAt = Date.now();
            listeners.forEach((listener) => listener(cachedUsers, true));
        } catch (error) {
            // Giữ nguyên hành vi cũ của cả 3 nơi gọi: log rồi bỏ qua, không dựng UI lỗi cho 1 con
            // số badge. KHÔNG cập nhật `fetchedAt` để lượt sau thử lại ngay.
            console.error('Pending approvals fetch error:', error);
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
};

const handleVisibilityChange = () => {
    if (isTabVisible()) {
        startTimer();
        void refreshPendingApprovals();
    } else {
        stopTimer();
    }
};

/** `adminUpdateUser()` vừa đổi quyền ai đó → bỏ qua STALE_MS, lấy số mới ngay. */
const handleManagedUsersChanged = () => {
    void refreshPendingApprovals(true);
};

function startTimer() {
    if (timer || !isTabVisible()) return;
    timer = setInterval(() => {
        void refreshPendingApprovals();
    }, PENDING_APPROVALS_POLL_INTERVAL_MS);
}

function stopTimer() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
}

function unbindListeners() {
    if (!listenersBound) return;
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
        window.removeEventListener(MANAGED_USERS_CHANGED_EVENT, handleManagedUsersChanged);
    }
    listenersBound = false;
}

/** Số liệu đã cache, dùng để hiển thị ngay lúc mount mà không chờ mạng. */
export const getPendingApprovalsSnapshot = (): ManagedUserDoc[] => cachedUsers;

/**
 * Đăng ký nhận danh sách. Trả về hàm hủy đăng ký.
 * @param scopeKey uid + vai trò + Kho của người dùng hiện tại — đổi thì cache bị xoá.
 */
export const subscribeToPendingApprovals = (scopeKey: string, listener: Listener): (() => void) => {
    if (scopeKey !== currentScopeKey) {
        currentScopeKey = scopeKey;
        cachedUsers = [];
        fetchedAt = 0;
    }

    listeners.add(listener);
    listener(cachedUsers, fetchedAt > 0); // phát ngay cache hiện có — 0 lượt đọc

    if (!listenersBound) {
        // Kiểm RIÊNG từng đối tượng: `document` cho visibilitychange, `window` cho custom event.
        // Gộp 2 lần gọi vào chung 1 guard `typeof document` là sai về nguyên tắc (môi trường không
        // có DOM thì thiếu cả hai, nhưng đừng để code phụ thuộc vào trùng hợp đó).
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }
        if (typeof window !== 'undefined') {
            window.addEventListener(MANAGED_USERS_CHANGED_EVENT, handleManagedUsersChanged);
        }
        listenersBound = true;
    }
    startTimer();
    void refreshPendingApprovals(); // tôn trọng STALE_MS nên mount thêm không tốn lượt đọc

    return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        stopTimer();
        unbindListeners();
    };
};

/** Chỉ dùng cho test — đưa store về trạng thái ban đầu. */
export const __resetPendingApprovalsStoreForTests = () => {
    listeners.clear();
    cachedUsers = [];
    fetchedAt = 0;
    inFlight = null;
    stopTimer();
    unbindListeners();
    currentScopeKey = null;
};
