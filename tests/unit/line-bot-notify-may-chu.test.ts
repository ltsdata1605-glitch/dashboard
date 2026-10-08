import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Hàm hẹn giờ lineBotUserSchedules (functions/src/lineBotScheduler.ts) chạy THẬT trên Firestore giả + fetch giả:
 * gửi đúng nhóm, đúng nội dung (thay biến), giữ chỗ khe → chạy 2 lần không gửi trùng, ONCE gửi xong tự tắt.
 */
type Doc = Record<string, any>;
const db_: { schedules: Record<string, Doc>; groups: Doc[]; coupons: Doc[] } = { schedules: {}, groups: [], coupons: [] };
const pushes: { to: string; text: string }[] = [];

const schedRef = (id: string): any => ({
    id,
    update: async (p: Doc) => { Object.assign(db_.schedules[id], p); },
});
const botRef: any = {
    collection: (c: string) => ({
        where: () => ({
            get: async () => ({ docs: Object.entries(db_.schedules).filter(([, d]) => d.active !== false).map(([id, d]) => ({ id, ref: schedRef(id), data: () => ({ ...d }) })) }),
        }),
        get: async () => ({ docs: (c === 'groups' ? db_.groups : db_.coupons).map((d, i) => ({ id: String(i), data: () => d })) }),
    }),
};
vi.mock('../../functions/src/firebaseAdmin', () => ({
    db: {
        collection: () => ({ doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }), where: () => ({ get: async () => ({ docs: [{ id: 'uid1', ref: botRef, data: () => ({ active: true, channelAccessToken: 'tok', botName: 'Bot 910' }) }] }) }) }),
        runTransaction: async (fn: (tx: any) => Promise<boolean>) => fn({
            get: async (ref: any) => ({ data: () => ({ ...db_.schedules[ref.id] }) }),
            update: (ref: any, p: Doc) => { Object.assign(db_.schedules[ref.id], p); },
        }),
    },
    stickerDb: {},
}));

const { lineBotUserSchedules } = await import('../../functions/src/lineBotScheduler');
const chay = () => (lineBotUserSchedules as unknown as { run: (e: unknown) => Promise<void> }).run({});

beforeEach(() => {
    pushes.length = 0;
    // 2026-10-02 06:03 giờ VN (thứ Sáu)
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T23:03:00Z'));
    vi.stubGlobal('fetch', async (_u: string, init: any) => {
        const b = JSON.parse(init.body);
        pushes.push({ to: b.to, text: b.messages[0].text });
        return { ok: true, json: async () => ({}) };
    });
    db_.groups = [{ groupId: 'C_A', active: true }, { groupId: 'C_B' }, { groupId: 'C_OFF', active: false }];
    db_.coupons = [{ status: 'UNUSED' }, {}, { status: 'USED' }];
    db_.schedules = {
        s1: { name: 'Sáng', active: true, time: '06:00', repeatType: 'DAILY', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], targetType: 'ALL_GROUPS', targetGroupIds: [], messageTemplate: '[{date}] {bot_name} còn {ton_kho} mã' },
        s2: { name: 'Chưa tới', active: true, time: '07:00', repeatType: 'DAILY', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], targetType: 'ALL_GROUPS', targetGroupIds: [], messageTemplate: 'x' },
        s3: { name: 'Một lần', active: true, time: '06:00', repeatType: 'ONCE', specificDate: '2026-10-02', daysOfWeek: [5], targetType: 'SPECIFIC_GROUPS', targetGroupIds: ['C_X'], messageTemplate: 'Họp lúc 8h' },
    };
});

describe('lịch Gửi Notify tự gửi trên máy chủ', () => {
    it('gửi lịch đến giờ vào đúng nhóm, thay biến; bỏ qua nhóm tắt và lịch chưa tới giờ', async () => {
        await chay();
        expect(pushes).toEqual(expect.arrayContaining([
            { to: 'C_A', text: '[02/10/2026] Bot 910 còn 2 mã' },
            { to: 'C_B', text: '[02/10/2026] Bot 910 còn 2 mã' },
            { to: 'C_X', text: 'Họp lúc 8h' },
        ]));
        expect(pushes).toHaveLength(3);
        expect(db_.schedules.s1.lastAutoRunSlot).toBe('2026-10-02 06:00');
        expect(db_.schedules.s1.lastAutoRunResult).toBe('Đã gửi 2/2 nhóm lúc 2026-10-02 06:00');
        expect(db_.schedules.s2.lastAutoRunSlot).toBeUndefined();
    });
    it('chạy lần 2 (5 phút sau) → KHÔNG gửi trùng; ONCE đã tự tắt', async () => {
        await chay();
        vi.setSystemTime(new Date('2026-10-01T23:08:00Z'));
        await chay();
        expect(pushes).toHaveLength(3);
        expect(db_.schedules.s3.active).toBe(false);
    });
});
