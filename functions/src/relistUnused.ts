/**
 * Phần THUẦN của lệnh "csd" (hiện lại thẻ PMH đã lọc nhưng chưa sử dụng trong tháng) —
 * tách khỏi lineBotWebhook.ts để test đơn vị không cần firebase-admin/LINE API.
 */

/** "csd" (cú pháp chính, chủ dự án chốt 2026-09-22); vẫn nhận dạng cũ "loc csd"/"lọc chưa sử dụng". */
export function isRelistUnusedCommand(text: string): boolean {
    return /^[./!]?(?:(?:loc|lọc)\s*)?(?:csd|chưa\s*sử\s*dụng|chua\s*su\s*dung|chưa\s*dùng|chua\s*dung)$/i.test(text.trim());
}

/** Đầu tháng theo giờ Việt Nam (UTC+7), trả ISO UTC để so với `filteredAt` (new Date().toISOString()). */
export function getVnMonthStartIso(now: Date = new Date()): { iso: string; label: string } {
    const vn = new Date(now.getTime() + 7 * 3600 * 1000);
    const iso = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) - 7 * 3600 * 1000).toISOString();
    return { iso, label: `${vn.getUTCMonth() + 1}/${vn.getUTCFullYear()}` };
}

export interface UnusedCandidate {
    code?: unknown;
    status?: unknown;
    filteredAt?: unknown;
}

/** Giữ thẻ UNUSED có mã, lọc trong tháng (>= đầu tháng VN), cũ nhất trước — để đánh số ổn định. */
export function selectUnusedThisMonth<T extends UnusedCandidate>(docs: T[], now: Date = new Date()): T[] {
    const { iso: monthStartIso } = getVnMonthStartIso(now);
    return docs
        .filter(d => d.status === 'UNUSED' && typeof d.code === 'string' && d.code.length > 0
            && typeof d.filteredAt === 'string' && d.filteredAt >= monthStartIso)
        .sort((a, b) => String(a.filteredAt).localeCompare(String(b.filteredAt)));
}
