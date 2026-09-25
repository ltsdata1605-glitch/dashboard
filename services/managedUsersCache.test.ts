import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Đếm số lượt gọi Cloud Function thật sự xảy ra */
const goi: string[] = [];
let traVe: Array<{ id: string }> = [];

vi.mock('./adminUserService', () => ({
    MANAGED_USERS_CHANGED_EVENT: 'ycx-managed-users-changed',
    listManagedUsers: vi.fn(async (mode: string) => {
        goi.push(mode);
        await new Promise(r => setTimeout(r, 10));
        return traVe;
    }),
}));

// vitest.config.ts dùng `environment: 'node'` (dự án không có jsdom) nên phải dựng tối thiểu
// `window` bằng EventTarget sẵn có của Node — để kiểm ĐÚNG đường đi thật: cache tự bỏ khi nhận
// event `ycx-managed-users-changed` lúc ai đó vừa được duyệt/đổi quyền.
const fakeWindow = new EventTarget();
(globalThis as unknown as { window: unknown }).window = fakeWindow;

const nhapModule = async () => await import('./managedUsersCache');

describe('managedUsersCache — cache 60s + gộp request cho tab Hoạt động/Hết hạn', () => {
    beforeEach(async () => {
        goi.length = 0;
        traVe = [{ id: 'nv-1' }];
        const m = await nhapModule();
        m.__resetManagedUsersCacheForTests();
    });

    it('gọi lần đầu thì đi mạng, lần sau trong 60s dùng lại cache', async () => {
        const { getManagedUsers } = await nhapModule();
        await getManagedUsers('active');
        await getManagedUsers('active');
        await getManagedUsers('active');
        expect(goi).toEqual(['active']);
    });

    it('nhiều nơi gọi CÙNG LÚC chỉ tạo đúng 1 request', async () => {
        const { getManagedUsers } = await nhapModule();
        const [a, b, c] = await Promise.all([
            getManagedUsers('expired'),
            getManagedUsers('expired'),
            getManagedUsers('expired'),
        ]);
        expect(goi).toEqual(['expired']);
        expect(a).toBe(b);
        expect(b).toBe(c);
    });

    it('mỗi tab có cache riêng, không trả nhầm dữ liệu của tab khác', async () => {
        const { getManagedUsers } = await nhapModule();
        traVe = [{ id: 'dang-hoat-dong' }];
        const active = await getManagedUsers('active');
        traVe = [{ id: 'da-het-han' }];
        const expired = await getManagedUsers('expired');

        expect(goi).toEqual(['active', 'expired']);
        expect(active[0].id).toBe('dang-hoat-dong');
        expect(expired[0].id).toBe('da-het-han');
    });

    it('force = true (nút Làm Mới) thì bỏ qua cache', async () => {
        const { getManagedUsers } = await nhapModule();
        await getManagedUsers('active');
        await getManagedUsers('active', true);
        expect(goi).toEqual(['active', 'active']);
    });

    it('vừa duyệt/đổi quyền ai đó thì cache bị bỏ, lượt sau lấy dữ liệu mới', async () => {
        const { getManagedUsers } = await nhapModule();
        await getManagedUsers('active');
        fakeWindow.dispatchEvent(new Event('ycx-managed-users-changed'));
        await getManagedUsers('active');
        expect(goi).toEqual(['active', 'active']);
    });

    it('hasFreshManagedUsers cho biết có phải chờ mạng hay không', async () => {
        const { getManagedUsers, hasFreshManagedUsers } = await nhapModule();
        expect(hasFreshManagedUsers('active')).toBe(false);
        await getManagedUsers('active');
        expect(hasFreshManagedUsers('active')).toBe(true);
        expect(hasFreshManagedUsers('expired')).toBe(false);
    });
});
