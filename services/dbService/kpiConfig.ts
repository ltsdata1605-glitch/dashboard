import { getSetting, saveSetting } from './core';

// --- KPI Targets ---
export async function saveKpiTargets(targets: { hieuQua: number, traGop: number, doanhThu?: number, gtdh?: number, doanhThuThuc?: number }): Promise<void> {
    return saveSetting('kpiTargets', targets);
}

export async function getKpiTargets(): Promise<{ hieuQua: number, traGop: number, doanhThu?: number, gtdh?: number, doanhThuThuc?: number } | null> {
    return getSetting('kpiTargets');
}

// --- KPI Cards Config ---
export async function saveKpiCardConfig(config: import('../../types').KpiCardConfig[]): Promise<void> {
    return saveSetting('kpiCardConfig', config);
}

export async function getKpiCardConfig(): Promise<import('../../types').KpiCardConfig[] | null> {
    return getSetting('kpiCardConfig');
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

