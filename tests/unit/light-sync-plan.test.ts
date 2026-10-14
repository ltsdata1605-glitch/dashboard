import { describe, it, expect } from 'vitest';
import { planLightSync, docToLightState, cloudKeyTime } from '../../services/lightSyncPlan';

const laNhe = (k: string) => !k.startsWith('cached_');

describe('Đồng bộ cấu hình nhẹ — mới nhất thắng theo TỪNG khoá', () => {
    it('máy A sửa X, máy B sửa Y: B chỉ đẩy Y, lấy X về — không đè X của A', () => {
        // Cloud sau khi A đẩy X lúc 9:00 (Y trên Cloud cũ từ 8:00).
        const cloud = docToLightState({
            settingsStoreBackup: { X: 'A-moi', Y: 'cu' },
            settingsMeta: { X: 900, Y: 800 },
            updatedAt: 900,
        });
        // Máy B: X còn bản cũ (8:00), Y vừa sửa lúc 9:05.
        const plan = planLightSync(cloud, { X: 800, Y: 905 }, ['X', 'Y'], laNhe);
        expect(plan.pull).toEqual(['X']);
        expect(plan.push).toEqual(['Y']);
    });

    it('doc cũ chưa có settingsMeta: dùng updatedAt của doc cho mọi khoá', () => {
        const cloud = docToLightState({ settingsStoreBackup: { X: 1, Y: 2 }, updatedAt: { toMillis: () => 1000 } });
        expect(cloudKeyTime(cloud, 'X')).toBe(1000);
        expect(cloudKeyTime(cloud, 'Z')).toBe(0); // không có trên Cloud
        const plan = planLightSync(cloud, { X: 1500, Y: 500, Z: 10 }, ['X', 'Y', 'Z'], laNhe);
        expect(plan.pull).toEqual(['Y']);
        expect(plan.push.sort()).toEqual(['X', 'Z']);
    });

    it('bằng mốc (tiếng vọng của chính lượt ghi vừa đẩy) → không lấy, không đẩy', () => {
        const cloud = docToLightState({ settingsStoreBackup: { X: 1 }, settingsMeta: { X: 700 }, updatedAt: 9999 });
        expect(planLightSync(cloud, { X: 700 }, ['X'], laNhe)).toEqual({ pull: [], push: [] });
    });

    it('bỏ qua khoá không thuộc bộ cấu hình nhẹ, khoá chưa có mốc thì không đẩy', () => {
        const cloud = docToLightState({ settingsStoreBackup: { cached_a: 1 }, settingsMeta: { cached_a: 5 }, updatedAt: 5 });
        expect(planLightSync(cloud, { cached_a: 0, B: 0 }, ['cached_a', 'B'], laNhe)).toEqual({ pull: [], push: [] });
    });
});
