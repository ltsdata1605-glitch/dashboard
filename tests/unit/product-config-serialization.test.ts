import { describe, expect, it } from 'vitest';
import { fromCloudProductConfig, isProductConfigComplete, toCloudProductConfig } from '../../services/productConfigSerialization';
import type { ProductConfig } from '../../types';

// productConfig qua Firestore (2026-09-28): Firestore biến Set thành {} — code cũ chỉ đổi `groups`, làm
// mất 2 tập hình thức xuất (835 + 1062 mục trên dữ liệu thật) → máy mới tính DTQĐ/đơn quá hạn sai.
const cauHinh = (): ProductConfig => ({
    groups: { ICT: new Set(['Laptop', 'Tablet']) },
    subgroups: {}, childToParentMap: {}, childToSubgroupMap: {}, quantityMultiplierMap: { A: 2 },
    revenueEligibleHTX: new Set(['xuat ban', 'tra gop']),
    nonRevenueEligibleHTX: new Set(['xuat doi']),
});
/** Giả lập đúng cách Firestore/JSON đối xử với Set. */
const quaFirestore = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe('productConfig qua Cloud', () => {
    it('mã CŨ (chỉ đổi groups) làm mất 2 tập hình thức xuất — điều kiện tái hiện lỗi', () => {
        const c = cauHinh();
        const cu = quaFirestore({ ...c, groups: { ICT: Array.from(c.groups.ICT) } });
        expect(cu.revenueEligibleHTX).toEqual({});
    });
    it('toCloud → Firestore → fromCloud giữ nguyên mọi Set', () => {
        const ve = fromCloudProductConfig(quaFirestore(toCloudProductConfig(cauHinh())));
        expect(ve.groups.ICT).toEqual(new Set(['Laptop', 'Tablet']));
        expect(ve.revenueEligibleHTX).toEqual(new Set(['xuat ban', 'tra gop']));
        expect(ve.nonRevenueEligibleHTX).toEqual(new Set(['xuat doi']));
        expect(ve.quantityMultiplierMap).toEqual({ A: 2 });
        expect(isProductConfigComplete(ve)).toBe(true);
    });
    it('toCloud không đụng tới object gốc', () => {
        const c = cauHinh();
        toCloudProductConfig(c);
        expect(c.revenueEligibleHTX).toBeInstanceOf(Set);
    });
    it('bản Cloud đã hỏng ({} ở 2 tập HTX) → Set rỗng và bị coi là KHÔNG dùng được', () => {
        const hong = { ...toCloudProductConfig(cauHinh()), revenueEligibleHTX: {}, nonRevenueEligibleHTX: {} };
        const ve = fromCloudProductConfig(quaFirestore(hong));
        expect(ve.revenueEligibleHTX?.size).toBe(0);
        expect(isProductConfigComplete(ve)).toBe(false);
    });
    it('không có groups → không dùng được', () => {
        expect(isProductConfigComplete({ ...cauHinh(), groups: {} })).toBe(false);
        expect(isProductConfigComplete(null)).toBe(false);
    });
});
