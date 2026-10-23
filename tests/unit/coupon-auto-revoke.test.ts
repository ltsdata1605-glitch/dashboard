import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isCouponStale, formatRevokeNotification, autoRevokeStaleCouponsForBot } from '../../functions/src/couponAutoRevoke';

type Doc = Record<string, any>;
const store = new Map<string, Doc>();

const docRef = (path: string): any => ({
    id: path.split('/').pop(),
    path,
    get: async () => ({ exists: store.has(path), id: path.split('/').pop(), ref: docRef(path), data: () => store.get(path), get: (k: string) => store.get(path)?.[k] }),
    set: async (v: Doc) => { store.set(path, { ...v }); },
    update: async (v: Doc) => { store.set(path, { ...(store.get(path) ?? {}), ...v }); },
    collection: (c: string) => colRef(`${path}/${c}`),
});

const colRef = (path: string, filters: [string, unknown][] = []): any => ({
    doc: (id: string) => docRef(`${path}/${id}`),
    where: (k: string, _op: string, v: unknown) => colRef(path, [...filters, [k, v]]),
    get: async () => {
        const docs = [...store.entries()]
            .filter(([p]) => p.startsWith(`${path}/`) && !p.slice(path.length + 1).includes('/'))
            .filter(([, d]) => filters.every(([k, v]) => d[k] === v))
            .map(([p, d]) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => d, get: (k: string) => d[k] }));
        return { empty: docs.length === 0, docs, size: docs.length };
    },
});

vi.mock('../../functions/src/firebaseAdmin', () => ({
    db: {
        collection: (c: string) => colRef(c),
        batch: () => {
            const ops: (() => Promise<void>)[] = [];
            return {
                update: (r: any, v: Doc) => ops.push(() => r.update(v)),
                commit: async () => { for (const o of ops) await o(); }
            };
        },
    },
}));

describe('couponAutoRevoke — Tự động hoàn kho sau thời gian chờ', () => {
    beforeEach(() => {
        store.clear();
    });

    describe('isCouponStale', () => {
        it('trả về false nếu status không phải SENT', () => {
            expect(isCouponStale({ status: 'UNUSED', sentAt: '2026-10-23T08:00:00.000Z' })).toBe(false);
            expect(isCouponStale({ status: 'USED', sentAt: '2026-10-23T08:00:00.000Z' })).toBe(false);
            expect(isCouponStale({ status: undefined })).toBe(false);
        });

        it('trả về false nếu vừa mới phát (dưới 30 phút)', () => {
            const now = new Date('2026-10-23T09:30:00.000Z').getTime();
            // Phát lúc 09:10 (20 phút trước)
            const sentAt = new Date('2026-10-23T09:10:00.000Z').toISOString();
            expect(isCouponStale({ status: 'SENT', sentAt }, now)).toBe(false);
        });

        it('trả về true nếu phát từ 30 phút trở lên mà chưa chuyển USED', () => {
            const now = new Date('2026-10-23T09:30:00.000Z').getTime();
            // Đúng 30 phút trước
            const sentAt30 = new Date('2026-10-23T09:00:00.000Z').toISOString();
            expect(isCouponStale({ status: 'SENT', sentAt: sentAt30 }, now)).toBe(true);

            // 45 phút trước
            const sentAt45 = new Date('2026-10-23T08:45:00.000Z').toISOString();
            expect(isCouponStale({ status: 'SENT', sentAt: sentAt45 }, now)).toBe(true);
        });

        it('sử dụng updatedAt làm fallback nếu thiếu sentAt', () => {
            const now = new Date('2026-10-23T09:30:00.000Z').getTime();
            const updatedAt = new Date('2026-10-23T08:50:00.000Z').toISOString();
            expect(isCouponStale({ status: 'SENT', updatedAt }, now)).toBe(true);
        });
    });

    describe('formatRevokeNotification', () => {
        it('tạo thông báo nhẹ cho 1 mã đơn lẻ', () => {
            const text = formatRevokeNotification([{ productName: 'Nồi cơm điện Cuckoo', type: 'EVENT' }]);
            expect(text).toBe('ℹ️ Mã [Nồi cơm điện Cuckoo] đã tự động hoàn kho do chưa được sao chép sử dụng.');
        });

        it('tạo thông báo nhẹ cho nhiều mã trong cùng nhóm chat', () => {
            const text = formatRevokeNotification([
                { productName: 'Quạt đứng Senko', type: 'PMH' },
                { productName: 'Bếp từ Sunhouse', type: 'PMH' },
            ]);
            expect(text).toBe('ℹ️ Các mã [Quạt đứng Senko, Bếp từ Sunhouse] đã tự động hoàn kho do chưa được sao chép sử dụng.');
        });

        it('fallback sang type hoặc PMH nếu không có productName', () => {
            const text = formatRevokeNotification([{ type: 'GVGS' }]);
            expect(text).toBe('ℹ️ Mã [GVGS] đã tự động hoàn kho do chưa được sao chép sử dụng.');
        });
    });

    describe('autoRevokeStaleCouponsForBot', () => {
        it('thu hồi mã SENT quá 30 phút về UNUSED và gửi thông báo nhẹ vào nhóm', async () => {
            const botUid = 'bot123';
            const botToken = 'line-token-xyz';
            const now = new Date('2026-10-23T10:00:00.000Z').getTime();

            // Mã 1: SENT cách đây 35 phút (quá hạn)
            store.set(`line_bots/${botUid}/coupons/c1`, {
                code: 'PMH-OVERDUE-1',
                productName: 'Máy sấy tóc Philips',
                status: 'SENT',
                sentAt: new Date('2026-10-23T09:25:00.000Z').toISOString(),
                recipient: 'Nguyễn Văn A',
                recipientId: 'Uuser1',
                orderId: 'DH1001',
                chatId: 'Cgroup1',
            });

            // Mã 2: SENT cách đây 10 phút (chưa quá hạn)
            store.set(`line_bots/${botUid}/coupons/c2`, {
                code: 'PMH-RECENT-2',
                productName: 'Ấm đun siêu tốc',
                status: 'SENT',
                sentAt: new Date('2026-10-23T09:50:00.000Z').toISOString(),
                recipient: 'Trần Thị B',
                recipientId: 'Uuser2',
                orderId: 'DH1002',
                chatId: 'Cgroup1',
            });

            // Mã 3: UNUSED sẵn trong kho
            store.set(`line_bots/${botUid}/coupons/c3`, {
                code: 'PMH-STOCK-3',
                productName: 'Quạt Senko',
                status: 'UNUSED',
            });

            const sentMessages: Array<{ chatId: string; text: string }> = [];
            const pushFn = async (_tok: string, chatId: string, text: string) => {
                sentMessages.push({ chatId, text });
                return true;
            };

            const result = await autoRevokeStaleCouponsForBot(botUid, botToken, {
                nowMs: now,
                pushFn,
            });

            expect(result.revokedCount).toBe(1);
            expect(result.notifiedChats).toBe(1);

            // Kiểm tra mã c1 đã được hoàn về UNUSED, xoá người nhận và MĐH
            const c1 = store.get(`line_bots/${botUid}/coupons/c1`);
            expect(c1?.status).toBe('UNUSED');
            expect(c1?.recipient).toBe('');
            expect(c1?.recipientId).toBe('');
            expect(c1?.orderId).toBe('');
            expect(c1?.revokedAt).toBeDefined();
            expect(c1?.revokeReason).toContain('Tự động hoàn kho sau 30 phút');

            // Mã c2 vẫn giữ nguyên trạng thái SENT
            const c2 = store.get(`line_bots/${botUid}/coupons/c2`);
            expect(c2?.status).toBe('SENT');
            expect(c2?.recipient).toBe('Trần Thị B');

            // Kiểm tra nội dung tin nhắn gửi vào nhóm
            expect(sentMessages).toHaveLength(1);
            expect(sentMessages[0].chatId).toBe('Cgroup1');
            expect(sentMessages[0].text).toBe('ℹ️ Mã [Máy sấy tóc Philips] đã tự động hoàn kho do chưa được sao chép sử dụng.');
        });
    });
});
