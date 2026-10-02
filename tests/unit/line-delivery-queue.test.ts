import { describe, it, expect, beforeEach } from 'vitest';
import {
    registerLineTransport, runWithLineDelivery, interceptImageDelivery, retryFailedLineSends, cancelLineSend,
    getLineSendState, isLineSendBusy, isLineDeliveryActive, buildLineCaption, reportNameFromFilename, sendBlobToLine,
    closeLineSendPanel, __resetLineSendForTest, type LineTransport, type LineGroup,
} from '../../components/shared/export/lineDelivery';

/** Hàng đợi "Gửi nhóm LINE" dùng chung — đo bằng cổng gửi giả (không mạng). */

const A: LineGroup = { groupId: 'Ca', groupName: 'Nhóm A' };
const B: LineGroup = { groupId: 'Cb', groupName: 'Nhóm B' };

function fakeTransport(failPlan: Record<string, string[]> = {}) {
    const sent: { fileName: string; groups: string[]; caption: string }[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const t: LineTransport = {
        loadGroups: async () => ({ botName: 'Bot', groups: [A, B] }),
        getRememberedGroups: async () => [],
        rememberGroups: async () => {},
        async sendImage({ fileName, caption, groups }) {
            inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((r) => setTimeout(r, 5));
            inFlight--;
            sent.push({ fileName, groups: groups.map((g) => g.groupId), caption });
            const plan = failPlan[fileName];
            const failIds = plan?.length ? [plan.shift() as string] : [];
            const failed = groups.filter((g) => failIds.includes(g.groupId) || failIds.includes('*')).map((group) => ({ group, error: 'LINE từ chối' }));
            return { ok: groups.length - failed.length, failed };
        },
    };
    return { t, sent, maxInFlight: () => maxInFlight };
}

const blob = (n: number) => new Blob([String(n)], { type: 'image/png' });

beforeEach(() => { __resetLineSendForTest(0); registerLineTransport(null); });

describe('chú thích + tên báo cáo', () => {
    it('bỏ tiền tố kho, BI_PRO_, ngày, gạch dưới', () => {
        expect(reportNameFromFilename('[910] - Tổng Quan Doanh Thu.png')).toBe('Tổng Quan Doanh Thu');
        expect(reportNameFromFilename('BI_PRO_Thi Đua Lũy Kế - ĐMX_HV_2026-10-02.png')).toBe('Thi Đua Lũy Kế - ĐMX HV');
        expect(buildLineCaption('a.png', new Date(2026, 9, 2, 8, 5))).toBe('📊 a — cập nhật 08:05 02/10');
    });
});

describe('runWithLineDelivery', () => {
    it('chặn ảnh ở khâu giao, gửi tuần tự từng ảnh, không tải về', async () => {
        const f = fakeTransport();
        registerLineTransport(f.t);
        const delivered: boolean[] = [];
        const res = await runWithLineDelivery({ title: 'Theo NV', groups: [A, B] }, async () => {
            expect(isLineDeliveryActive()).toBe(true);
            for (let i = 0; i < 4; i++) delivered.push(interceptImageDelivery(blob(i), `NV ${i}.png`));
        });
        expect(delivered).toEqual([true, true, true, true]);
        expect(res).toMatchObject({ total: 4, ok: 4, failed: 0 });
        expect(f.sent.map((s) => s.fileName)).toEqual(['NV 0.png', 'NV 1.png', 'NV 2.png', 'NV 3.png']);
        expect(f.maxInFlight()).toBe(1);
        expect(isLineDeliveryActive()).toBe(false);
        expect(getLineSendState()?.summary).toBe('Đã gửi đủ 4/4 ảnh vào 2 nhóm LINE');
    });

    it('"đồng thời tải về" → khâu giao vẫn tải; cùng 1 blob giao 2 lần chỉ gửi 1 lần', async () => {
        const f = fakeTransport();
        registerLineTransport(f.t);
        const b = blob(1);
        const r: boolean[] = [];
        await runWithLineDelivery({ title: 'x', groups: [A], alsoDownload: true }, () => {
            r.push(interceptImageDelivery(b, 'x.png'));
            r.push(interceptImageDelivery(b, 'x.png'));
        });
        expect(r).toEqual([false, false]);
        expect(f.sent).toHaveLength(1);
    });

    it('ngoài phạm vi gửi: khâu giao không bị chặn', () => {
        expect(interceptImageDelivery(blob(1), 'a.png')).toBe(false);
    });

    it('1 ảnh lỗi không làm hỏng cả lượt; thử lại chỉ gửi nhóm còn lỗi', async () => {
        const f = fakeTransport({ 'NV 1.png': ['Cb'] });
        registerLineTransport(f.t);
        const res = await runWithLineDelivery({ title: 'x', groups: [A, B] }, () => {
            for (let i = 0; i < 3; i++) interceptImageDelivery(blob(i), `NV ${i}.png`);
        });
        expect(res).toMatchObject({ total: 3, ok: 2, failed: 1 });
        expect(getLineSendState()?.items[1].error).toContain('Gửi được 1 nhóm');
        const again = await retryFailedLineSends();
        expect(again).toMatchObject({ ok: 3, failed: 0 });
        expect(f.sent.at(-1)).toMatchObject({ fileName: 'NV 1.png', groups: ['Cb'] });
    });

    it('cổng gửi ném lỗi (mất mạng/timeout) → ảnh lỗi có lý do, tổng kết thất bại', async () => {
        registerLineTransport({ ...fakeTransport().t, sendImage: async () => { throw new Error('LINE không phản hồi sau 40 giây'); } });
        const res = await sendBlobToLine({ blob: blob(1), fileName: 'a.png', groups: [A] });
        expect(res).toMatchObject({ total: 1, ok: 0, failed: 1 });
        expect(res.errors[0]).toContain('40 giây');
        expect(getLineSendState()?.summary).toBe('Gửi nhóm LINE thất bại');
    });

    it('hàm xuất ném lỗi → ghi lỗi xuất, ảnh đã xuất trước đó vẫn được gửi', async () => {
        const f = fakeTransport();
        registerLineTransport(f.t);
        const res = await runWithLineDelivery({ title: 'x', groups: [A] }, () => {
            interceptImageDelivery(blob(1), 'a.png');
            throw new Error('Không dựng được ảnh');
        });
        expect(res).toMatchObject({ ok: 1, exportError: 'Không dựng được ảnh' });
    });

    it('bấm liên tục: lượt thứ 2 bị từ chối khi lượt 1 chưa xong', async () => {
        registerLineTransport(fakeTransport().t);
        let mo!: () => void;
        const p1 = runWithLineDelivery({ title: 'x', groups: [A] }, () => new Promise<void>((r) => { mo = r; }));
        expect(isLineSendBusy()).toBe(true);
        await expect(runWithLineDelivery({ title: 'y', groups: [A] }, () => {})).rejects.toThrow('lượt trước');
        mo();
        await p1;
        expect(isLineSendBusy()).toBe(false);
    });

    it('dừng gửi: ảnh còn trong hàng đợi bị bỏ qua, gọi huỷ lượt xuất', async () => {
        const f = fakeTransport();
        registerLineTransport(f.t);
        let huyXuat = 0;
        const res = await runWithLineDelivery({ title: 'x', groups: [A] }, () => {
            for (let i = 0; i < 5; i++) interceptImageDelivery(blob(i), `NV ${i}.png`);
            cancelLineSend(() => { huyXuat++; });
        });
        expect(huyXuat).toBe(1);
        expect(res.skipped).toBeGreaterThan(0);
        expect(res.ok + res.skipped).toBe(5);
    });

    it('chưa đăng nhập / chưa chọn nhóm → từ chối, không chạy hàm xuất', async () => {
        let chay = 0;
        await expect(runWithLineDelivery({ title: 'x', groups: [A] }, () => { chay++; })).rejects.toThrow('đăng nhập');
        registerLineTransport(fakeTransport().t);
        await expect(runWithLineDelivery({ title: 'x', groups: [] }, () => { chay++; })).rejects.toThrow('nhóm');
        expect(chay).toBe(0);
    });

    it('đóng bảng giải phóng ảnh lỗi', async () => {
        registerLineTransport(fakeTransport({ 'a.png': ['*'] }).t);
        await sendBlobToLine({ blob: blob(1), fileName: 'a.png', groups: [A] });
        closeLineSendPanel();
        expect(getLineSendState()).toBeNull();
    });
});
