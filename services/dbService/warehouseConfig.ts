import type { WarehouseColumnConfig } from '../../types';
import { getDb, getSetting, saveSetting } from './core';
import { DepartmentMap } from '../dataService';

const SETTINGS_STORE = 'settings';

// --- Department Map ---
export async function saveDepartmentMap(map: DepartmentMap): Promise<void> {
    return saveSetting('departmentMap', map);
}

export async function getDepartmentMap(): Promise<DepartmentMap | null> {
    return getSetting<DepartmentMap>('departmentMap');
}

export async function clearDepartmentMap(): Promise<void> {
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
                tx.objectStore(SETTINGS_STORE).delete('departmentMap');
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
        console.error('[IDB] clearDepartmentMap failed:', e);
    }
}

// --- Warehouse Targets ---
export async function saveWarehouseTargets(targets: Record<string, number>): Promise<void> {
    return saveSetting('warehouseTargets', targets);
}

export async function getWarehouseTargets(): Promise<Record<string, number> | null> {
    return getSetting('warehouseTargets');
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
