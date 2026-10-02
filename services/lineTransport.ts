/**
 * Cắm cách gửi LINE của GỐC vào cổng gửi dùng chung `components/shared/export/lineDelivery.ts` (2026-10-02).
 *
 * Report BI / Khai thác / Phân Ca không được import `services/` gốc (CLAUDE.md mục 1) nên không gọi thẳng
 * `lineReportDelivery` được. App gọi `registerRootLineTransport(uid, departmentId)` mỗi khi tài khoản đổi; mọi khu
 * vực gửi qua cổng chung. `lineReportDelivery` (kéo Firestore + dịch vụ Bot LINE) chỉ được tải khi gửi thật.
 *
 * Nhóm đã chọn theo từng khu vực lưu bằng saveSetting (IndexedDB riêng theo tài khoản, đồng bộ cloud).
 */
import { registerLineTransport, type LineGroup } from '../components/shared/export/lineDelivery';
import { getSetting, saveSetting } from './dbService';

const MEMORY_KEY = 'line_send_group_memory';
type Memory = Record<string, LineGroup[]>;

const docMemory = async (): Promise<Memory> => {
    const m = await getSetting<Memory>(MEMORY_KEY).catch(() => null);
    return m && typeof m === 'object' ? m : {};
};

export function registerRootLineTransport(uid: string | null | undefined, departmentId?: string | null): () => void {
    if (!uid) { registerLineTransport(null); return () => {}; }
    registerLineTransport({
        async loadGroups() {
            const { resolveLineBot, listLineGroups } = await import('./lineReportDelivery');
            const bot = await resolveLineBot(uid, departmentId);
            if (!bot) throw new Error('Tài khoản chưa có Bot LINE — vào mục Bot LINE để kết nối bot, rồi thêm bot vào nhóm cần nhận ảnh.');
            return { botName: bot.botName, groups: await listLineGroups(bot.botId) };
        },
        async sendImage({ blob, fileName, caption, groups }) {
            const { sendReportImageToLineGroups } = await import('./lineReportDelivery');
            const res = await sendReportImageToLineGroups({ blob, fileName, caption, groups, uid, departmentId });
            return { ok: res.ok, failed: res.failedGroups };
        },
        async getRememberedGroups(areaKey) {
            const m = await docMemory();
            return Array.isArray(m[areaKey]) ? m[areaKey] : [];
        },
        async rememberGroups(areaKey, groups) {
            const m = await docMemory();
            await saveSetting(MEMORY_KEY, { ...m, [areaKey]: groups.map((g) => ({ groupId: g.groupId, groupName: g.groupName })) });
        },
    });
    return () => registerLineTransport(null);
}
