import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Audit A27 (2026-09-29) — features/bi-dashboard/hooks/useWorker.ts (worker singleton của Report BI).
 * Trước đây: worker crash thì instance hỏng được giữ lại mãi (mọi lần gọi sau treo); postMessage ném
 * lỗi đồng bộ (DataCloneError) thì mục chờ nằm lại trong Map; không có hạn chờ.
 */
type Handler = ((e: { data: unknown }) => void) | null;
const created: FakeWorker[] = [];

class FakeWorker {
    onmessage: Handler = null;
    onerror: ((e: { message: string }) => void) | null = null;
    terminated = false;
    mode: 'ok' | 'hang' | 'throw' = 'ok';
    constructor() { created.push(this); }
    postMessage(msg: { id: number; type: string; payload: unknown }) {
        if (this.mode === 'throw') throw new DOMException('không clone được', 'DataCloneError');
        if (this.mode === 'hang') return;
        queueMicrotask(() => this.onmessage?.({ data: { id: msg.id, type: 'SUCCESS', result: `ok:${msg.type}` } }));
    }
    terminate() { this.terminated = true; }
}

beforeEach(() => {
    vi.resetModules();
    created.length = 0;
    (globalThis as unknown as { Worker: typeof FakeWorker }).Worker = FakeWorker;
});

const load = () => import('../../features/bi-dashboard/hooks/useWorker');

describe('runWorkerTask — phục hồi worker BI', () => {
    it('worker crash → các lệnh đang chờ bị từ chối và lần gọi sau dùng worker MỚI', async () => {
        const { runWorkerTask } = await load();
        await expect(runWorkerTask('A', 1)).resolves.toBe('ok:A');
        const w1 = created[0];
        w1.mode = 'hang';
        const dangCho = runWorkerTask('B', 1);
        w1.onerror?.({ message: 'crash' });
        await expect(dangCho).rejects.toThrow('crash');
        expect(w1.terminated).toBe(true);

        await expect(runWorkerTask('C', 1)).resolves.toBe('ok:C');
        expect(created.length).toBe(2);
    });

    it('postMessage ném lỗi → promise bị từ chối ngay, không treo, lệnh sau vẫn chạy', async () => {
        const { runWorkerTask } = await load();
        await runWorkerTask('A', 1);
        created[0].mode = 'throw';
        await expect(runWorkerTask('B', () => 1)).rejects.toThrow('không clone được');
        created[0].mode = 'ok';
        await expect(runWorkerTask('C', 1)).resolves.toBe('ok:C');
    });

    it('worker kẹt → hết hạn chờ thì báo lỗi thay vì treo mãi', async () => {
        vi.useFakeTimers();
        try {
            const { runWorkerTask } = await load();
            const p = runWorkerTask('A', 1);
            created[0].mode = 'hang';
            const p2 = runWorkerTask('KET', 1);
            await p;
            const assertion = expect(p2).rejects.toThrow('quá thời gian');
            await vi.advanceTimersByTimeAsync(60_001);
            await assertion;
        } finally {
            vi.useRealTimers();
        }
    });
});
