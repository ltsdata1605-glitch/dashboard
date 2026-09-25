import { listManagedUsers, ManagedUserDoc, ListManagedUsersMode, MANAGED_USERS_CHANGED_EVENT } from './adminUserService';

/**
 * Cache dùng chung cho danh sách người dùng của màn "Phân quyền & Duyệt yêu cầu", tab **Hoạt động**
 * và **Hết hạn**.
 *
 * Vì sao KHÔNG làm giống `pendingApprovalsStore.ts` (có vòng poll nền): tab "Chờ duyệt" phải được
 * tải nền liên tục vì chuông thông báo và badge cần con số đó mọi lúc. Hai tab này thì KHÔNG ai
 * cần khi người dùng không mở màn Phân quyền — thêm vòng poll chỉ tốn hạn mức đọc Firestore vô ích
 * (xem CLAUDE.md mục 1.1 về trần hạn mức). Nên ở đây chỉ có cache + gộp request, KHÔNG có poll.
 *
 * Giải đúng 3 lãng phí ĐO ĐƯỢC ngày 2026-09-25 (Cloud Function giả có đếm lượt gọi):
 *  1. Bấm "Hết hạn" tốn **2 lượt gọi** — `expired` rồi `active` (nhánh gộp thêm khi không thấy ai
 *     hết hạn). Lượt `active` đó thường trùng đúng dữ liệu tab "Hoạt động" vừa lấy.
 *  2. Cache cũ nằm trong `useRef` của chính component nên chết theo mỗi lần view bị gỡ khỏi cây.
 *  3. Hai nơi gọi cùng lúc thì tạo 2 request cho cùng một câu hỏi.
 */

/** Kết quả mới hơn mốc này thì dùng lại, không gọi server. Bằng đúng `PENDING_APPROVALS_STALE_MS`
 *  để hành vi 3 tab giống nhau, người dùng không thấy tab này "tươi" hơn tab kia. */
export const MANAGED_USERS_STALE_MS = 60_000;

type Entry = { users: ManagedUserDoc[]; fetchedAt: number };

const cache = new Map<ListManagedUsersMode, Entry>();
const inFlight = new Map<ListManagedUsersMode, Promise<ManagedUserDoc[]>>();
let listenerBound = false;

/** Ai đó vừa duyệt/đổi quyền/thu hồi -> mọi tab đều có thể đã khác, bỏ hết cache. */
const invalidateAll = () => {
    cache.clear();
};

const bindListener = () => {
    if (listenerBound || typeof window === 'undefined') return;
    window.addEventListener(MANAGED_USERS_CHANGED_EVENT, invalidateAll);
    listenerBound = true;
};

/**
 * Lấy danh sách cho một tab. Gọi mạng ĐÚNG MỘT LẦN cho mỗi mốc 60 giây, và nhiều nơi gọi cùng lúc
 * thì dùng chung một request đang bay.
 * @param force bỏ qua cache (nút "Làm Mới").
 */
export const getManagedUsers = async (
    mode: ListManagedUsersMode,
    force = false,
): Promise<ManagedUserDoc[]> => {
    bindListener();

    if (!force) {
        const hit = cache.get(mode);
        if (hit && Date.now() - hit.fetchedAt < MANAGED_USERS_STALE_MS) return hit.users;
        const dangBay = inFlight.get(mode);
        if (dangBay) return dangBay;
    }

    const task = (async () => {
        try {
            const users = await listManagedUsers(mode);
            cache.set(mode, { users, fetchedAt: Date.now() });
            return users;
        } finally {
            inFlight.delete(mode);
        }
    })();
    inFlight.set(mode, task);
    return task;
};

/** Có sẵn trong cache và còn hạn hay không — để nơi gọi biết có phải chờ mạng không. */
export const hasFreshManagedUsers = (mode: ListManagedUsersMode): boolean => {
    const hit = cache.get(mode);
    return !!hit && Date.now() - hit.fetchedAt < MANAGED_USERS_STALE_MS;
};

/** Chỉ dùng cho test. */
export const __resetManagedUsersCacheForTests = () => {
    cache.clear();
    inFlight.clear();
};
