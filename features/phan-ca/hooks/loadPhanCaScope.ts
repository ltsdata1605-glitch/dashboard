import type { StaffInitialData, SchedulingRules, DailyRequirements, ShiftDefinitions, StaffMember, ScheduleHistoryEntry, UnresolvedConflict, BusySchedule } from '../types';

type LoadKey = <T>(key: string, defaultValue: T) => Promise<T>;

export interface PhanCaScopeDefaults {
    rules: SchedulingRules;
    dailyRequirements: DailyRequirements;
    shiftDefinitions: ShiftDefinitions;
}

/**
 * Nạp toàn bộ dữ liệu của 1 phạm vi (siêu thị × tháng).
 *
 * Audit 2026-10-07 (GĐ3): trước đây 14 khoá nạp TUẦN TỰ, mỗi khoá = 2 lượt đọc IndexedDB + 1 lượt
 * Firestore → mở Phân ca chờ 14 vòng mạng (đo bằng độ trễ giả 150ms/lượt: ~2,1s). Các khoá độc lập
 * nhau nên nạp SONG SONG: chờ ~1 vòng mạng. Kết quả và thứ tự gán state không đổi.
 */
export async function loadPhanCaScope(load: LoadKey, getKey: (k: string) => string, monthYear: string, defaults: PhanCaScopeDefaults) {
    const scheduleKey = getKey(`schedule-${monthYear}`);
    const historyKey = getKey(`history-${monthYear}`);
    const unresolvedKey = getKey(`unresolved-${monthYear}`);
    const busyScheduleKey = getKey(`busySchedule-${monthYear}`);
    const [nams, nus, rules, departmentPatterns, dailyRequirements, shiftDefinitions, schedule, history, unresolved, busySchedule] = await Promise.all([
        load<StaffInitialData[]>(getKey('nams'), []),
        load<StaffInitialData[]>(getKey('nus'), []),
        load<SchedulingRules>(getKey('rules'), defaults.rules),
        load<{ [key: string]: string[] }>(getKey('departmentPatterns'), {}),
        load<DailyRequirements>(getKey('dailyRequirements'), defaults.dailyRequirements),
        load<ShiftDefinitions>(getKey('shiftDefinitions'), defaults.shiftDefinitions),
        load<StaffMember[]>(scheduleKey, []),
        load<ScheduleHistoryEntry[]>(historyKey, []),
        load<UnresolvedConflict[]>(unresolvedKey, []),
        load<BusySchedule>(busyScheduleKey, {}),
    ]);
    return {
        keys: { scheduleKey, historyKey, unresolvedKey, busyScheduleKey },
        nams, nus, rules, departmentPatterns, dailyRequirements, shiftDefinitions, schedule, history, unresolved, busySchedule,
    };
}
