import type {
    ProductConfig,
    AnalysisRecord,
    Employee,
    HeadToHeadTableConfig,
    FilterState,
    CustomContestTab,
    CrossSellingConfig,
    SavedCalendar
} from '../../types';
import { getDb, getSetting, saveSetting } from './core';

const SETTINGS_STORE = 'settings';

export const SUMMARY_TABLE_CONFIG_KEY = 'summaryTableConfig';

// --- Product Config ---
export async function saveProductConfig(config: ProductConfig, url: string): Promise<void> {
    // Safari/WebKit embedded webviews (like Zalo/FB) might throw DataCloneError for Sets.
    const safeConfig = { ...config, groups: {} as Record<string, string[]> };
    if (config.groups) {
        for (const [key, value] of Object.entries(config.groups)) {
            safeConfig.groups[key] = value instanceof Set ? Array.from(value) : value;
        }
    }
    await saveSetting('productConfig', { config: safeConfig, url, fetchedAt: new Date() });
}

export async function getProductConfig(): Promise<{ config: ProductConfig, url: string, fetchedAt: Date } | null> {
    const data = await getSetting<{ config: ProductConfig, url: string, fetchedAt: Date }>('productConfig');
    if (data && data.config) {
        if (data.config.groups) {
            const restoredGroups: { [key: string]: Set<string> } = {};
            for (const [key, value] of Object.entries(data.config.groups)) {
                // Lúc rehydrate, value thật sự là string[] (đã serialize), dù type ProductConfig.groups khai báo Set<string>
                restoredGroups[key] = new Set(value as unknown as string[]);
            }
            data.config.groups = restoredGroups;
        }
        // Backward compatibility: ensure quantityMultiplierMap exists
        if (!data.config.quantityMultiplierMap) {
            data.config.quantityMultiplierMap = {};
        }
        if (!data.config.vasMultiplierMap) {
            data.config.vasMultiplierMap = {};
        }
    }
    return data;
}

export async function clearProductConfig(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve();
                }
            }, 1000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                tx.objectStore(SETTINGS_STORE).delete('productConfig');
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearProductConfig failed:', e);
    }
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

// --- Cross Selling Table Config ---
export async function saveCrossSellingConfig(config: CrossSellingConfig): Promise<void> {
    return saveSetting('crossSellingConfig', config);
}

export async function getCrossSellingConfig(): Promise<CrossSellingConfig | null> {
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

// --- Summary Table Config ---
export async function saveSummaryTableConfig(config: FilterState['summaryTable']): Promise<void> {
    return saveSetting(SUMMARY_TABLE_CONFIG_KEY, config);
}

export async function getSummaryTableConfig(): Promise<FilterState['summaryTable'] | null> {
    return getSetting(SUMMARY_TABLE_CONFIG_KEY);
}

// --- Custom Tabs ---
export async function saveCustomTabs(tabs: CustomContestTab[], source?: string): Promise<void> {
    return saveSetting('customTabs', tabs, source);
}

export async function getCustomTabs(): Promise<CustomContestTab[] | null> {
    return getSetting('customTabs');
}

export async function clearCustomTabs(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve();
                }
            }, 10000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                tx.objectStore(SETTINGS_STORE).delete('customTabs');
                tx.objectStore(SETTINGS_STORE).delete('industryAnalysisCustomTabs');
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearCustomTabs failed:', e);
    }
}

// --- Industry Analysis Custom Tabs ---
export async function saveIndustryAnalysisCustomTabs(tabs: CustomContestTab[], source?: string): Promise<void> {
    return saveSetting('industryAnalysisCustomTabs', tabs, source);
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

// --- Custom Calendars ---
export async function saveCustomCalendars(calendars: SavedCalendar[]): Promise<void> {
    return saveSetting('customCalendars', calendars);
}

export async function getCustomCalendars(): Promise<SavedCalendar[] | null> {
    return getSetting('customCalendars');
}

// --- Global Font ---
export async function saveGlobalFont(font: string): Promise<void> {
    return saveSetting('globalFont', font);
}

export async function getGlobalFont(): Promise<string | null> {
    return getSetting('globalFont');
}
