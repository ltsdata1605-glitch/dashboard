// Barrel re-export — giữ nguyên 1 điểm import duy nhất `services/dbService` cho ~30 file
// đang dùng (kể cả features/* dù trái quy tắc kiến trúc lý tưởng, xem CLAUDE.md mục 3),
// bên trong tách theo domain: core (kết nối + đọc/ghi setting nguyên thuỷ), salesData,
// kpiConfig, warehouseConfig, settings (các domain setting còn lại).
export {
    getDb,
    saveSetting,
    saveSettingFromCloud,
    getAllSettings,
    clearAllSettings,
    importAllSettings,
    mergeSettings,
    getSetting,
    getValue,
    setValue,
    cleanupGarbageKeys,
} from './dbService/core';

export * from './dbService/salesData';
export * from './dbService/kpiConfig';
export * from './dbService/warehouseConfig';
export * from './dbService/settings';
