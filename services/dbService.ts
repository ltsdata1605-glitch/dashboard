
import type {
    DataRow,
    StoredSalesData,
    ProductConfig,
    ContestTableConfig,
    CustomContestTab,
    WarehouseColumnConfig,
    AnalysisRecord,
    Employee,
    HeadToHeadTableConfig,
    FilterState
} from '../types';
import { DepartmentMap } from './dataService';

const DB_NAME = 'BI_HUB_DATABASE_V2';
const DB_VERSION = 3;
const APP_STORE = 'appStorage';
const SETTINGS_STORE = 'settings';

export const DEDUPLICATION_SETTING_KEY = 'isDeduplicationEnabled';
export const SUMMARY_TABLE_CONFIG_KEY = 'summaryTableConfig';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(APP_STORE)) db.createObjectStore(APP_STORE);
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
}

export async function saveSetting(key: string, value: any): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(SETTINGS_STORE, 'readwrite');
            const store = tx.objectStore(SETTINGS_STORE);
            store.put(value, key);
            if (key !== 'localSettingsLastModified') {
                store.put(Date.now(), 'localSettingsLastModified');
            }
            tx.oncomplete = () => {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key } }));
                    // Nếu key thuộc BI module (có prefix bi_), bắn thêm event indexeddb-change
                    // để BI module nội bộ cập nhật UI khi dữ liệu được kéo từ Cloud về
                    if (key.startsWith('bi_')) {
                        const originalKey = key.slice(3); // Bỏ prefix 'bi_'
                        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: originalKey } }));
                    }
                }
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        } catch (error) {
            console.error(`IndexedDB Error while saving setting '${key}':`, error);
            reject(error);
        }
    });
}

export async function getAllSettings(): Promise<Record<string, any>> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const request = store.getAll();
        const keysRequest = store.getAllKeys();
        
        tx.oncomplete = () => {
            const keys = keysRequest.result;
            const values = request.result;
            const settings: Record<string, any> = {};
            for (let i = 0; i < keys.length; i++) {
                settings[keys[i] as string] = values[i];
            }
            resolve(settings);
        };
        tx.onerror = () => reject(tx.error);
    });
}

export async function clearAllSettings(): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = tx.objectStore(SETTINGS_STORE);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function importAllSettings(settings: Record<string, any>): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(SETTINGS_STORE, 'readwrite');
            const store = tx.objectStore(SETTINGS_STORE);
            // Clear first
            store.clear();
            for (const [key, value] of Object.entries(settings)) {
                store.put(value, key);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        } catch (error) {
            console.error('IndexedDB Error in importAllSettings:', error);
            reject(error);
        }
    });
}

export async function getSetting<T>(key: string): Promise<T | null> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result === undefined ? null : request.result);
        request.onerror = () => reject(request.error);
    });
}

// Alias for compatibility
export const getValue = getSetting;
export const setValue = saveSetting;

// --- Sales Data ---
export async function saveSalesData(data: DataRow[], filename: string, fileLastModified?: number): Promise<void> {
    const stored: StoredSalesData = { data, filename, savedAt: new Date(), fileLastModified };
    const db = await getDb();
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(APP_STORE, 'readwrite');
            tx.objectStore(APP_STORE).put(stored, 'salesData');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        } catch (error) {
            console.error('IndexedDB Error in saveSalesData:', error);
            reject(error);
        }
    });
}

export async function getSalesData(): Promise<StoredSalesData | null> {
    const db = await getDb();
    return new Promise((resolve) => {
        const tx = db.transaction(APP_STORE, 'readonly');
        const request = tx.objectStore(APP_STORE).get('salesData');
        request.onsuccess = () => resolve(request.result || null);
    });
}

export async function clearSalesData(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(APP_STORE, 'readwrite');
    tx.objectStore(APP_STORE).delete('salesData');
}

// --- Department Map ---
export async function saveDepartmentMap(map: DepartmentMap): Promise<void> {
    return saveSetting('departmentMap', map);
}

export async function getDepartmentMap(): Promise<DepartmentMap | null> {
    return getSetting<DepartmentMap>('departmentMap');
}

export async function clearDepartmentMap(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    tx.objectStore(SETTINGS_STORE).delete('departmentMap');
}

// --- Product Config ---
export async function saveProductConfig(config: ProductConfig, url: string): Promise<void> {
    // Safari/WebKit embedded webviews (like Zalo/FB) might throw DataCloneError for Sets.
    const safeConfig = { ...config, groups: {} as any };
    if (config.groups) {
        for (const [key, value] of Object.entries(config.groups)) {
            safeConfig.groups[key] = value instanceof Set ? Array.from(value) : value;
        }
    }
    await saveSetting('productConfig', { config: safeConfig, url, fetchedAt: new Date() });
}

export async function getProductConfig(): Promise<{ config: ProductConfig, url: string, fetchedAt: Date } | null> {
    const data = await getSetting<{ config: ProductConfig, url: string, fetchedAt: Date }>('productConfig');
    if (data && data.config && data.config.groups) {
        const restoredGroups: { [key: string]: Set<string> } = {};
        for (const [key, value] of Object.entries(data.config.groups)) {
            restoredGroups[key] = new Set(value as any);
        }
        data.config.groups = restoredGroups;
    }
    return data;
}

export async function clearProductConfig(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    tx.objectStore(SETTINGS_STORE).delete('productConfig');
}

// --- KPI Targets ---
export async function saveKpiTargets(targets: { hieuQua: number, traGop: number, doanhThu?: number, gtdh?: number, doanhThuThuc?: number }): Promise<void> {
    return saveSetting('kpiTargets', targets);
}

export async function getKpiTargets(): Promise<{ hieuQua: number, traGop: number, doanhThu?: number, gtdh?: number, doanhThuThuc?: number } | null> {
    return getSetting('kpiTargets');
}

// --- KPI Cards Config ---
export async function saveKpiCardConfig(config: import('../types').KpiCardConfig[]): Promise<void> {
    return saveSetting('kpiCardConfig', config);
}

export async function getKpiCardConfig(): Promise<import('../types').KpiCardConfig[] | null> {
    return getSetting('kpiCardConfig');
}

// --- Warehouse Targets ---
export async function saveWarehouseTargets(targets: Record<string, number>): Promise<void> {
    return saveSetting('warehouseTargets', targets);
}

export async function getWarehouseTargets(): Promise<Record<string, number> | null> {
    return getSetting('warehouseTargets');
}

// --- Top Seller Analysis ---
export async function saveTopSellerAnalysis(analysis: string, dataUsed: Employee[]): Promise<void> {
    const record: AnalysisRecord = { timestamp: Date.now(), type: 'topSeller', analysis, dataUsed };
    const history = (await getSetting<AnalysisRecord[]>('topSellerAnalysisHistory')) || [];
    history.unshift(record);
    if (history.length > 20) history.pop();
    await saveSetting('topSellerAnalysisHistory', history);
}

export async function getTopSellerAnalysisHistory(): Promise<AnalysisRecord[]> {
    return (await getSetting<AnalysisRecord[]>('topSellerAnalysisHistory')) || [];
}

// --- Theme Map ---
export async function saveThemeMap(type: string, map: Record<string, number>): Promise<void> {
    return saveSetting(`themeMap_${type}`, map);
}

export async function getThemeMap(type: string): Promise<Record<string, number> | null> {
    return getSetting(`themeMap_${type}`);
}

// --- Daily Target ---
export async function saveDailyTarget(target: number): Promise<void> {
    return saveSetting('dailyTarget', target);
}

export async function getDailyTarget(): Promise<number | null> {
    return getSetting('dailyTarget');
}

// --- GTĐH Targets ---
export async function saveGtdhTargets(targets: Record<string, number>): Promise<void> {
    return saveSetting('gtdhTargets', targets);
}

export async function getGtdhTargets(): Promise<Record<string, number> | null> {
    return getSetting('gtdhTargets');
}

// --- Cross Selling Table Config ---
export async function saveCrossSellingConfig(config: any): Promise<void> {
    return saveSetting('crossSellingConfig', config);
}

export async function getCrossSellingConfig(): Promise<any | null> {
    return getSetting('crossSellingConfig');
}

// --- Industry Visible Groups ---
export async function saveIndustryVisibleGroups(groups: string[]): Promise<void> {
    return saveSetting('industryVisibleGroups', groups);
}

export async function getIndustryVisibleGroups(): Promise<string[] | null> {
    return getSetting('industryVisibleGroups');
}

// --- Head to Head Custom Tables ---
export async function saveHeadToHeadCustomTables(tables: HeadToHeadTableConfig[]): Promise<void> {
    return saveSetting('headToHeadTables', tables);
}

export async function getHeadToHeadCustomTables(): Promise<HeadToHeadTableConfig[] | null> {
    return getSetting('headToHeadTables');
}

// --- Warehouse Config ---
export async function saveWarehouseColumnConfig(config: WarehouseColumnConfig[]): Promise<void> {
    return saveSetting('warehouseColumnConfig', config);
}

export async function getWarehouseColumnConfig(): Promise<WarehouseColumnConfig[] | null> {
    return getSetting('warehouseColumnConfig');
}

// --- Employee Analysis Custom Columns ---
export async function saveEmployeeColumnConfig(config: WarehouseColumnConfig[]): Promise<void> {
    return saveSetting('employeeColumnConfig', config);
}

export async function getEmployeeColumnConfig(): Promise<WarehouseColumnConfig[] | null> {
    return getSetting('employeeColumnConfig');
}

// --- Summary Table Config ---
export async function saveSummaryTableConfig(config: FilterState['summaryTable']): Promise<void> {
    return saveSetting(SUMMARY_TABLE_CONFIG_KEY, config);
}

export async function getSummaryTableConfig(): Promise<FilterState['summaryTable'] | null> {
    return getSetting(SUMMARY_TABLE_CONFIG_KEY);
}

// --- Custom Tabs ---
export async function saveCustomTabs(tabs: CustomContestTab[]): Promise<void> {
    return saveSetting('customTabs', tabs);
}

export async function getCustomTabs(): Promise<CustomContestTab[] | null> {
    return getSetting('customTabs');
}

export async function clearCustomTabs(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    tx.objectStore(SETTINGS_STORE).delete('customTabs');
    tx.objectStore(SETTINGS_STORE).delete('industryAnalysisCustomTabs');
}

// --- Industry Analysis Custom Tabs ---
export async function saveIndustryAnalysisCustomTabs(tabs: CustomContestTab[]): Promise<void> {
    return saveSetting('industryAnalysisCustomTabs', tabs);
}

export async function getIndustryAnalysisCustomTabs(): Promise<CustomContestTab[] | null> {
    return getSetting('industryAnalysisCustomTabs');
}

// --- Industry Grid Filters ---
export async function saveIndustryGridFilters(filters: FilterState['industryGrid']): Promise<void> {
    return saveSetting('industryGridFilters', filters);
}

export async function getIndustryGridFilters(): Promise<FilterState['industryGrid'] | null> {
    return getSetting('industryGridFilters');
}

// --- Employee Analysis Filters ---
export async function saveEmployeeAnalysisFilters(filters: { warehouses: string[], departments: string[] }): Promise<void> {
    return saveSetting('employeeAnalysisFilters', filters);
}

export async function getEmployeeAnalysisFilters(): Promise<{ warehouses: string[], departments: string[] } | null> {
    return getSetting('employeeAnalysisFilters');
}

// --- Deduplication Setting ---
export async function getDeduplicationSetting(): Promise<boolean> {
    const value = await getSetting<boolean>(DEDUPLICATION_SETTING_KEY);
    return value !== null ? value : false;
}

export async function saveDeduplicationSetting(enabled: boolean): Promise<void> {
    return saveSetting(DEDUPLICATION_SETTING_KEY, enabled);
}

// --- Custom Calendars ---
export async function saveCustomCalendars(calendars: any[]): Promise<void> {
    return saveSetting('customCalendars', calendars);
}

export async function getCustomCalendars(): Promise<any[] | null> {
    return getSetting('customCalendars');
}

// --- Global Font ---
export async function saveGlobalFont(font: string): Promise<void> {
    return saveSetting('globalFont', font);
}

export async function getGlobalFont(): Promise<string | null> {
    return getSetting('globalFont');
}

