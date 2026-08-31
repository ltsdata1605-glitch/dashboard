import { BonusMetrics } from '../types/nhanVienTypes';
import * as db from './db';

// Hành vi giữ nguyên như trước (2 nơi trước đây viết tay giống hệt nhau,
// gộp về đây để chỉ sửa 1 chỗ nếu cần đổi giới hạn sau này).
const MAX_BONUS_HISTORY_ENTRIES = 30;

/** Ghi 1 lần chạy vào lịch sử điểm thưởng của 1 nhân viên, chỉ giữ tối đa 30 lần gần nhất. */
export const appendBonusHistory = async (
    supermarketName: string,
    originalName: string,
    metrics: BonusMetrics
): Promise<void> => {
    const historyKey = `bonus-history-${supermarketName}-${originalName}` as const;
    const currentHistory = (await db.get<BonusMetrics[]>(historyKey)) || [];
    await db.set(historyKey, [...currentHistory, metrics].slice(-MAX_BONUS_HISTORY_ENTRIES));
};

// bonus-monthly-{siêu thị}-{yyyy-mm} là 1 KEY RIÊNG cho mỗi (siêu thị, tháng) — không phải
// mảng trong 1 key như competitionHistory.ts, nên không thể .slice() để giới hạn. Trước đây
// không có bất kỳ cơ chế dọn dẹp nào — mỗi tháng trôi qua tạo thêm N key mới vĩnh viễn (N =
// số siêu thị), các key này đều đồng bộ lên Firestore (isHeavySyncKey) nên phình cả 2 nơi.
const MAX_STORED_MONTHS = 12; // dư so với monthsWindow=6 mặc định đang hiển thị (useMonthlyBonusArchive)
const MONTHLY_KEY_PATTERN = /^bonus-monthly-.+-(\d{4}-\d{2})$/;

const yyyymmCutoff = (monthsBack: number): string => {
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    return `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
};

/** Xoá các key bonus-monthly-* cũ hơn MAX_STORED_MONTHS tháng. Gọi 1 lần/phiên lúc khởi động. */
export const pruneOldBonusMonthlyKeys = async (): Promise<void> => {
    const cutoff = yyyymmCutoff(MAX_STORED_MONTHS);
    const all = await db.getAll();
    const staleKeys = all
        .map(({ key }) => key.match(MONTHLY_KEY_PATTERN))
        .filter((m): m is RegExpMatchArray => m !== null && m[1] < cutoff)
        .map(m => m.input as string);

    if (staleKeys.length === 0) return;
    await Promise.all(staleKeys.map(key => db.deleteEntry(key as db.BIKey)));
    console.info(`[bonusHistory] Đã dọn ${staleKeys.length} key bonus-monthly-* cũ hơn ${MAX_STORED_MONTHS} tháng.`);
};
