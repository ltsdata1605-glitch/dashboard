/**
 * Dịch vụ thăm dò ngầm (probe) phiên bản Userscript trong Tampermonkey.
 * Cho phép Dashboard tự động phát hiện khi người dùng đã bấm Cập nhật trong Tampermonkey
 * mà KHÔNG cần người dùng phải bấm F5 tải lại trang hay bấm lại nút.
 */
import { compareVersions } from './biAutoSyncService';

const STORAGE_KEY = 'ycx_userscript_installed_version';
const PROBE_IFRAME_ID = '__ycx_userscript_probe_frame__';

export function getStoredUserscriptVersion(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function setStoredUserscriptVersion(ver: string): void {
    if (!ver) return;
    try {
        localStorage.setItem(STORAGE_KEY, ver);
    } catch {}
}

/** Đảm bảo có iframe ẩn thăm dò trong trang */
function ensureProbeIframe(): HTMLIFrameElement | null {
    if (typeof document === 'undefined') return null;
    let iframe = document.getElementById(PROBE_IFRAME_ID) as HTMLIFrameElement | null;
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = PROBE_IFRAME_ID;
        iframe.style.position = 'fixed';
        iframe.style.width = '4px';
        iframe.style.height = '4px';
        iframe.style.bottom = '0px';
        iframe.style.right = '0px';
        iframe.style.border = 'none';
        iframe.style.opacity = '0.01';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-9999';
        iframe.src = '/userscript-probe.html?t=' + Date.now();
        if (document.body) {
            document.body.appendChild(iframe);
        }
    }
    return iframe;
}

/** Tải lại iframe probe để Tampermonkey nạp bản userscript mới nhất */
export function reloadProbeIframe(): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById(PROBE_IFRAME_ID);
    if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
    }
    ensureProbeIframe();
}

/**
 * Bắt đầu vòng lặp kiểm tra ngầm liên tục khi Dashboard đang ở trạng thái 'outdated'.
 * Ngay khi phát hiện bản mới >= targetVersion, gọi callback onUpdated và tự dọn dẹp.
 */
export function startUserscriptUpdateWatcher(
    targetVersion: string,
    onUpdated: (installedVersion: string) => void
): () => void {
    let stopped = false;
    let timer: any = null;

    function cleanupListeners() {
        window.removeEventListener('message', onMessage);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('focus', onTabRevisit);
        window.removeEventListener('ycx-bonus-bridge:pong', onPong as EventListener);
        document.removeEventListener('visibilitychange', onTabRevisit);
    }

    const checkAndTrigger = (ver: string | null) => {
        if (stopped || !ver) return;
        if (compareVersions(ver, targetVersion) >= 0) {
            stopped = true;
            if (timer) clearInterval(timer);
            cleanupListeners();
            onUpdated(ver);
        }
    };

    // 1. Kiểm tra ngay trong localStorage
    const currentStored = getStoredUserscriptVersion();
    if (currentStored && compareVersions(currentStored, targetVersion) >= 0) {
        setTimeout(() => checkAndTrigger(currentStored), 20);
        return () => { stopped = true; };
    }

    // 2. Khởi tạo iframe probe
    ensureProbeIframe();

    // 3. Lắng nghe postMessage từ probe iframe
    function onMessage(e: MessageEvent) {
        if (e.data && e.data.type === 'ycx-probe-version' && typeof e.data.version === 'string') {
            setStoredUserscriptVersion(e.data.version);
            checkAndTrigger(e.data.version);
        }
    }

    // 4. Lắng nghe storage event (khi tab khác hoặc iframe ghi vào localStorage)
    function onStorage(e: StorageEvent) {
        if (e.key === STORAGE_KEY && e.newValue) {
            checkAndTrigger(e.newValue);
        }
    }

    // 5. Lắng nghe sự kiện CustomEvent pong từ userscript
    function onPong(e: Event) {
        const detail = (e as CustomEvent)?.detail;
        if (detail && detail.source === 'ycx-bonus-bridge' && typeof detail.version === 'string') {
            setStoredUserscriptVersion(detail.version);
            checkAndTrigger(detail.version);
        }
    }

    // 6. Khi người dùng quay lại tab (focus hoặc visibilitychange) -> tải lại probe ngay
    function onTabRevisit() {
        if (document.visibilityState === 'visible' && !stopped) {
            reloadProbeIframe();
            const stored = getStoredUserscriptVersion();
            checkAndTrigger(stored);
            try {
                window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:ping', {
                    detail: { source: 'ycx-bonus-bridge', type: 'ping', nonce: 'tab_revisit_' + Date.now() }
                }));
            } catch {}
        }
    }

    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onTabRevisit);
    window.addEventListener('ycx-bonus-bridge:pong', onPong as EventListener);
    document.addEventListener('visibilitychange', onTabRevisit);

    // 7. Polling ngầm định kỳ mỗi 1.2 giây: ping probe, ping bridge và đọc lại localStorage
    timer = setInterval(() => {
        if (stopped) return;
        const stored = getStoredUserscriptVersion();
        checkAndTrigger(stored);

        // Ping iframe
        const iframe = document.getElementById(PROBE_IFRAME_ID) as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage({ type: 'ycx-probe-ping' }, '*');
            } catch {}
        }

        // Ping main bridge
        try {
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:ping', {
                detail: { source: 'ycx-bonus-bridge', type: 'ping', nonce: 'probe_loop_' + Date.now() }
            }));
        } catch {}
    }, 1200);

    return () => {
        stopped = true;
        if (timer) clearInterval(timer);
        cleanupListeners();
    };
}
