import * as db from '../utils/db';
import { configStore } from '../store/configStore';

const BI_VIEW_KEY = 'bi_active_view';

/**
 * 1. BI Realtime:
 * Mở tab Report BI (URL: ?tab=employees), phân hệ Siêu thị (dashboard),
 * chế độ Realtime, tab con Doanh thu (revenue).
 */
export async function navigateToBiRealtime() {
    try {
        localStorage.setItem(BI_VIEW_KEY, 'dashboard');
    } catch {}

    await db.set('dashboard-main-tab', 'realtime');
    await db.set('dashboard-sub-tab', 'revenue');
    configStore.setCache('dashboard-main-tab', 'realtime');
    configStore.setCache('dashboard-sub-tab', 'revenue');

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: 'employees' } }));
        window.dispatchEvent(new CustomEvent('bi-switch-view', { detail: { view: 'dashboard' } }));
        window.dispatchEvent(new CustomEvent('dashboard-switch-tab', { detail: { mainTab: 'realtime', subTab: 'revenue' } }));
    }
}

/**
 * 2. BI Luỹ kế:
 * Mở tab Report BI (URL: ?tab=employees), phân hệ Siêu thị (dashboard),
 * chế độ Luỹ kế (cumulative), tab con Doanh thu (revenue).
 */
export async function navigateToBiLuyKe() {
    try {
        localStorage.setItem(BI_VIEW_KEY, 'dashboard');
    } catch {}

    await db.set('dashboard-main-tab', 'cumulative');
    await db.set('dashboard-sub-tab', 'revenue');
    configStore.setCache('dashboard-main-tab', 'cumulative');
    configStore.setCache('dashboard-sub-tab', 'revenue');

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: 'employees' } }));
        window.dispatchEvent(new CustomEvent('bi-switch-view', { detail: { view: 'dashboard' } }));
        window.dispatchEvent(new CustomEvent('dashboard-switch-tab', { detail: { mainTab: 'cumulative', subTab: 'revenue' } }));
    }
}

/**
 * 3. Đổ thưởng:
 * Mở tab Report BI (URL: ?tab=employees), phân hệ Nhân viên (employee),
 * tab con Doanh thu (revenue).
 */
export async function navigateToDoThuong() {
    try {
        localStorage.setItem(BI_VIEW_KEY, 'employee');
    } catch {}

    await db.set('nhanvien-active-tab', 'revenue');
    configStore.setCache('nhanvien-active-tab', 'revenue');

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: 'employees' } }));
        window.dispatchEvent(new CustomEvent('bi-switch-view', { detail: { view: 'employee' } }));
        window.dispatchEvent(new CustomEvent('nhanvien-switch-tab', { detail: { tab: 'revenue' } }));
    }
}

/**
 * 4. YCX Realtime / Luỹ kế:
 * Mở tab Phân tích (URL: ?tab=analysis).
 */
export function navigateToYcxAnalysis() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: 'analysis' } }));
    }
}
