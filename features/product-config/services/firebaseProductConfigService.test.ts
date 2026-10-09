import { describe, it, expect } from 'vitest';
import { computeConfigSummary } from './firebaseProductConfigService';
import { toCloudProductConfig, fromCloudProductConfig, isProductConfigComplete } from '../../../services/productConfigSerialization';
import type { ProductConfig } from '../../../types';

describe('firebaseProductConfigService & serialization', () => {
    const mockConfig: ProductConfig = {
        groups: {
            'Điện thoại': new Set(['IPHONE', 'SAMSUNG']),
            'Laptop': new Set(['MACBOOK', 'DELL']),
        },
        subgroups: {
            'Điện thoại': {
                'Apple': ['IPHONE'],
                'Android': ['SAMSUNG'],
            },
        },
        childToParentMap: {
            'IPHONE': 'Điện thoại',
            'SAMSUNG': 'Điện thoại',
            'MACBOOK': 'Laptop',
            'DELL': 'Laptop',
        },
        childToSubgroupMap: {
            'IPHONE': 'Apple',
            'SAMSUNG': 'Android',
        },
        quantityMultiplierMap: {
            'IPHONE': 1.2,
            'MACBOOK': 1.5,
        },
        vasMultiplierMap: {
            'VAS01': 2.0,
        },
        revenueEligibleHTX: new Set(['Bán lẻ', 'Bán góp']),
        nonRevenueEligibleHTX: new Set(['Xuất hủy', 'Điều chuyển']),
        htxClassification: {
            'Bán lẻ': 'tien_mat',
            'Bán góp': 'tra_gop',
        },
    };

    it('computes correct config summary', () => {
        const summary = computeConfigSummary(mockConfig);
        expect(summary.parentGroupCount).toBe(2);
        expect(summary.subgroupCount).toBe(2);
        expect(summary.categoryCodeCount).toBe(4);
        expect(summary.multiplierCount).toBe(2);
        expect(summary.vasMultiplierCount).toBe(1);
        expect(summary.revenueHtxCount).toBe(2);
        expect(summary.nonRevenueHtxCount).toBe(2);
    });

    it('serializes ProductConfig safely for Firestore and restores Sets properly', () => {
        const cloudData = toCloudProductConfig(mockConfig);
        expect(Array.isArray(cloudData.groups['Điện thoại'])).toBe(true);
        expect(Array.isArray(cloudData.revenueEligibleHTX)).toBe(true);
        expect(Array.isArray(cloudData.nonRevenueEligibleHTX)).toBe(true);

        const restored = fromCloudProductConfig(cloudData);
        expect(restored.groups['Điện thoại']).toBeInstanceOf(Set);
        expect(restored.groups['Điện thoại'].has('IPHONE')).toBe(true);
        expect(restored.revenueEligibleHTX).toBeInstanceOf(Set);
        expect(restored.revenueEligibleHTX?.has('Bán lẻ')).toBe(true);
        expect(restored.nonRevenueEligibleHTX).toBeInstanceOf(Set);
        expect(restored.nonRevenueEligibleHTX?.has('Xuất hủy')).toBe(true);
    });

    it('validates product config completeness', () => {
        expect(isProductConfigComplete(mockConfig)).toBe(true);

        const incompleteConfig: ProductConfig = {
            ...mockConfig,
            groups: {},
        };
        expect(isProductConfigComplete(incompleteConfig)).toBe(false);
    });
});
