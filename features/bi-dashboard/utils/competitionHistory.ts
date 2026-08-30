import { SupermarketCompetitionData, parseCompetitionDataBySupermarket, shortenSupermarketName } from './dashboardHelpers';
import * as db from './db';

export interface CompetitionHistorySnapshot extends SupermarketCompetitionData {
    /** YYYY-MM-DD theo giờ địa phương của lần dán cuối cùng trong ngày đó. */
    date: string;
}

// Giữ khoảng 2 tháng — đủ để so sánh "tuần trước"/"tháng trước", không phình vô hạn.
const MAX_HISTORY_DAYS = 60;

export const getLocalDateKey = (d: Date = new Date()): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Lưu snapshot Thi đua Luỹ kế của TỪNG siêu thị vào lịch sử theo ngày (khắc phục mục
 * "Thi đua không lưu lịch sử" — trước đây dán dữ liệu mới là mất trắng bảng xếp hạng cũ).
 * Upsert theo getLocalDateKey(): dán nhiều lần trong cùng 1 ngày chỉ giữ lần dán CUỐI của
 * ngày đó (đại diện trạng thái cuối ngày); qua ngày mới, ngày trước được giữ nguyên vĩnh
 * viễn (trong giới hạn MAX_HISTORY_DAYS). Gọi ngay sau khi có dữ liệu Luỹ kế mới, đọc
 * thẳng từ rawText vừa dán — không phụ thuộc state đã lưu ở nơi gọi.
 */
export const archiveCompetitionLuyKeSnapshot = async (rawText: string): Promise<void> => {
    if (!rawText) return;
    const bySupermarket = parseCompetitionDataBySupermarket(rawText);
    const dateKey = getLocalDateKey();

    await Promise.all(Object.entries(bySupermarket).map(async ([smName, data]) => {
        if (!data.programs || data.programs.length === 0) return;
        const safeName = shortenSupermarketName(smName);
        const historyKey = `competition-history-${safeName}` as const;
        const current = (await db.get<CompetitionHistorySnapshot[]>(historyKey)) || [];
        const withoutToday = current.filter(s => s.date !== dateKey);
        const next = [...withoutToday, { date: dateKey, headers: data.headers, programs: data.programs }]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-MAX_HISTORY_DAYS);
        await db.set(historyKey, next);
    }));
};

/** Danh sách ngày có lịch sử của 1 siêu thị, mới nhất trước. */
export const getCompetitionHistory = async (supermarketName: string): Promise<CompetitionHistorySnapshot[]> => {
    const safeName = shortenSupermarketName(supermarketName);
    const list = (await db.get<CompetitionHistorySnapshot[]>(`competition-history-${safeName}`)) || [];
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
};
