import { describe, expect, it } from 'vitest';
import { decideLightSync } from '../../services/heavySyncPolicy';

// Cấu hình nhẹ lúc mở app: lấy về hay đẩy lên (2026-09-28). Lỗi gốc: trên máy mới, dấu thời gian
// local luôn "mới hơn" vì mọi saveSetting lúc khởi động đều đóng dấu → cấu hình trên Cloud không
// bao giờ về máy, cấu hình mặc định của máy bị đẩy đè lên.
const NOW = 1_790_562_904_980;
const CLOUD = 1_790_560_192_917;

describe('decideLightSync', () => {
    it('máy MỚI (chưa từng kéo) — Cloud thắng dù dấu local mới hơn', () => {
        expect(decideLightSync({ hasCloudDoc: true, hasBackup: true, cloudLastMod: CLOUD, localLastMod: NOW, pulledBefore: false })).toBe('pull');
    });
    it('mã CŨ ra "push" ở đúng tình huống trên (điều kiện tái hiện lỗi)', () => {
        const maCu = (c: number, l: number) => (c < l ? 'push' : 'pull');
        expect(maCu(CLOUD, NOW)).toBe('push');
    });
    it('máy đã từng kéo + local mới hơn → đẩy lên (giữ hành vi cũ)', () => {
        expect(decideLightSync({ hasCloudDoc: true, hasBackup: true, cloudLastMod: CLOUD, localLastMod: NOW, pulledBefore: true })).toBe('push');
    });
    it('máy đã từng kéo + Cloud mới hơn → lấy về', () => {
        expect(decideLightSync({ hasCloudDoc: true, hasBackup: true, cloudLastMod: NOW, localLastMod: CLOUD, pulledBefore: true })).toBe('pull');
    });
    it('chưa có doc trên Cloud → đẩy lên để tạo', () => {
        expect(decideLightSync({ hasCloudDoc: false, hasBackup: false, cloudLastMod: 0, localLastMod: NOW, pulledBefore: false })).toBe('push');
    });
    it('đọc Cloud LỖI → không làm gì (không coi là Cloud trống mà đẩy đè)', () => {
        expect(decideLightSync({ cloudReadFailed: true, hasCloudDoc: false, hasBackup: false, cloudLastMod: 0, localLastMod: NOW, pulledBefore: false })).toBe('none');
    });
    it('máy mới nhưng doc Cloud không có bản sao lưu → không làm gì', () => {
        expect(decideLightSync({ hasCloudDoc: true, hasBackup: false, cloudLastMod: CLOUD, localLastMod: NOW, pulledBefore: false })).toBe('none');
    });
});
