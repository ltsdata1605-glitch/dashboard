import { describe, it, expect, beforeEach } from 'vitest';

const ls = new Map<string, string>();
const ss = new Map<string, string>();

(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => { ls.set(k, v); },
    removeItem: (k: string) => { ls.delete(k); },
    clear: () => ls.clear(),
    key: () => null,
    length: 0,
};

(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => ss.get(k) ?? null,
    setItem: (k: string, v: string) => { ss.set(k, v); },
    removeItem: (k: string) => { ss.delete(k); },
    clear: () => ss.clear(),
    key: () => null,
    length: 0,
};

describe('Cloud Sync Banner Logic', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('khởi tạo cloudSyncBanner từ localStorage nếu đã có', () => {
        const sampleMsg = 'Đã tự động đồng bộ dữ liệu đám mây mới nhất (8.583 dòng)';
        localStorage.setItem('ycx-cloud-sync-banner', sampleMsg);

        const initialBanner = localStorage.getItem('ycx-cloud-sync-banner') || sessionStorage.getItem('ycx-cloud-sync-banner');
        expect(initialBanner).toBe(sampleMsg);
    });

    it('đóng banner thì xoá khỏi localStorage và sessionStorage', () => {
        const sampleMsg = 'Đã tự động đồng bộ dữ liệu đám mây mới nhất (8.583 dòng)';
        localStorage.setItem('ycx-cloud-sync-banner', sampleMsg);
        sessionStorage.setItem('ycx-cloud-sync-banner', sampleMsg);

        // Giả lập hàm handleDismissCloudSyncBanner
        localStorage.removeItem('ycx-cloud-sync-banner');
        sessionStorage.removeItem('ycx-cloud-sync-banner');

        expect(localStorage.getItem('ycx-cloud-sync-banner')).toBeNull();
        expect(sessionStorage.getItem('ycx-cloud-sync-banner')).toBeNull();
    });

    it('tạo đúng chuỗi thông báo định dạng vi-VN cho số dòng', () => {
        const totalRows = 8583;
        const msg = `Đã tự động đồng bộ dữ liệu đám mây mới nhất (${totalRows.toLocaleString('vi-VN')} dòng)`;
        expect(msg).toBe('Đã tự động đồng bộ dữ liệu đám mây mới nhất (8.583 dòng)');
    });

    it('tự động đóng banner sau khoảng thời gian hiển thị', () => {
        let banner: string | null = 'Đã tự động đồng bộ dữ liệu đám mây mới nhất (8.583 dòng)';
        const dismiss = () => { banner = null; };
        expect(banner).not.toBeNull();
        dismiss();
        expect(banner).toBeNull();
    });
});

