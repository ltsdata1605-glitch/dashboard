import * as db from '../utils/db';
import { configStore } from '../store/configStore';

const BI_VIEW_KEY = 'bi_active_view';

/**
 * Cập nhật các query parameters trên URL hiện tại mà không reload trang.
 * Dùng window.history.replaceState để hỗ trợ lưu bookmark hoặc copy link trực tiếp.
 */
export function updateUrlParams(params: Record<string, string | null | undefined>) {
    if (typeof window === 'undefined') return;
    try {
        const url = new URL(window.location.href);
        let changed = false;
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                if (url.searchParams.has(key)) {
                    url.searchParams.delete(key);
                    changed = true;
                }
            } else {
                if (url.searchParams.get(key) !== value) {
                    url.searchParams.set(key, value);
                    changed = true;
                }
            }
        });
        if (changed) {
            window.history.replaceState(null, '', url.toString());
        }
    } catch (e) {
        console.warn('[URL] Không thể cập nhật query params:', e);
    }
}

/**
 * 1. BI Realtime:
 * Mở tab Report BI (URL: ?tab=employees&view=dashboard&mode=realtime&sub=revenue),
 * phân hệ Siêu thị (dashboard), chế độ Realtime, tab con Doanh thu (revenue).
 */
export async function navigateToBiRealtime() {
    try {
        localStorage.setItem(BI_VIEW_KEY, 'dashboard');
    } catch {}

    await db.set('dashboard-main-tab', 'realtime');
    await db.set('dashboard-sub-tab', 'revenue');
    configStore.setCache('dashboard-main-tab', 'realtime');
    configStore.setCache('dashboard-sub-tab', 'revenue');

    updateUrlParams({
        tab: 'employees',
        view: 'dashboard',
        mode: 'realtime',
        sub: 'revenue',
    });

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: 'employees' } }));
        window.dispatchEvent(new CustomEvent('bi-switch-view', { detail: { view: 'dashboard' } }));
        window.dispatchEvent(new CustomEvent('dashboard-switch-tab', { detail: { mainTab: 'realtime', subTab: 'revenue' } }));
    }
}

/**
 * 2. BI Luỹ kế:
 * Mở tab Report BI (URL: ?tab=employees&view=dashboard&mode=cumulative&sub=competition),
 * phân hệ Siêu thị (dashboard), chế độ Luỹ kế (cumulative), tab con Thi đua (competition).
 */
export async function navigateToBiLuyKe() {
    try {
        localStorage.setItem(BI_VIEW_KEY, 'dashboard');
    } catch {}

    await db.set('dashboard-main-tab', 'cumulative');
    await db.set('dashboard-sub-tab', 'competition');
    configStore.setCache('dashboard-main-tab', 'cumulative');
    configStore.setCache('dashboard-sub-tab', 'competition');

    updateUrlParams({
        tab: 'employees',
        view: 'dashboard',
        mode: 'cumulative',
        sub: 'competition',
    });

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: 'employees' } }));
        window.dispatchEvent(new CustomEvent('bi-switch-view', { detail: { view: 'dashboard' } }));
        window.dispatchEvent(new CustomEvent('dashboard-switch-tab', { detail: { mainTab: 'cumulative', subTab: 'competition' } }));
    }
}

/**
 * 3. Đổ thưởng:
 * Mở tab Report BI (URL: ?tab=employees&view=employee&sub=revenue),
 * phân hệ Nhân viên (employee), tab con Doanh thu (revenue).
 */
export async function navigateToDoThuong() {
    try {
        localStorage.setItem(BI_VIEW_KEY, 'employee');
    } catch {}

    await db.set('nhanvien-active-tab', 'revenue');
    configStore.setCache('nhanvien-active-tab', 'revenue');

    updateUrlParams({
        tab: 'employees',
        view: 'employee',
        mode: null,
        sub: 'revenue',
    });

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
    updateUrlParams({
        tab: 'analysis',
        view: null,
        mode: null,
        sub: null,
    });

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab: 'analysis' } }));
    }
}
