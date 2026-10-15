import { describe, it, expect } from 'vitest';
import { isBiConfigKey, restoreNestedArrays } from './biCloudSyncService';

describe('biCloudSyncService', () => {
    describe('isBiConfigKey', () => {
        it('identifies BI prefixed keys', () => {
            expect(isBiConfigKey('bi_summary-realtime')).toBe(true);
            expect(isBiConfigKey('bi_competition-luy-ke')).toBe(true);
            expect(isBiConfigKey('bi_summary-realtime-ts')).toBe(true);
            expect(isBiConfigKey('bi_config-HÙNG VƯƠNG-industry-realtime')).toBe(true);
            expect(isBiConfigKey('bi_last-updates-list')).toBe(true);
        });

        it('identifies un-prefixed BI keys', () => {
            expect(isBiConfigKey('summary-realtime')).toBe(true);
            expect(isBiConfigKey('summary-luy-ke')).toBe(true);
            expect(isBiConfigKey('competition-realtime')).toBe(true);
            expect(isBiConfigKey('competition-luy-ke')).toBe(true);
            expect(isBiConfigKey('summary-realtime-ts')).toBe(true);
            expect(isBiConfigKey('competition-realtime-ts')).toBe(true);
            expect(isBiConfigKey('config-DMX123-industry-realtime')).toBe(true);
            expect(isBiConfigKey('config-DMX123-industry-luyke')).toBe(true);
            expect(isBiConfigKey('biSupermarketMap')).toBe(true);
            expect(isBiConfigKey('supermarket-map-12345')).toBe(true);
            expect(isBiConfigKey('last-updates-list')).toBe(true);
            expect(isBiConfigKey('analysis-employees-list')).toBe(true);
            // Column customization keys
            expect(isBiConfigKey('hidden-cols-summary-realtime')).toBe(true);
            expect(isBiConfigKey('hidden-cols-summary-luyke')).toBe(true);
            expect(isBiConfigKey('hidden-supermarkets-summary-realtime')).toBe(true);
            expect(isBiConfigKey('hidden-supermarkets-summary-luyke')).toBe(true);
            expect(isBiConfigKey('global-hidden-cols-industry-v2')).toBe(true);
            expect(isBiConfigKey('global-hidden-industries')).toBe(true);
            expect(isBiConfigKey('global-hidden-sub-industries')).toBe(true);
            expect(isBiConfigKey('global-industry-kpi-cards-v1')).toBe(true);
            expect(isBiConfigKey('global-industry-kpi-focus-metric-v1')).toBe(true);
            expect(isBiConfigKey('competition-visible-cols-realtime-v6')).toBe(true);
            expect(isBiConfigKey('competition-visible-cols-luyke-v6')).toBe(true);
        });

        it('rejects non-BI keys', () => {
            expect(isBiConfigKey('productConfig')).toBe(false);
            expect(isBiConfigKey('salesData_2026_10')).toBe(false);
            expect(isBiConfigKey('themePreference')).toBe(false);
            expect(isBiConfigKey('random_setting')).toBe(false);
        });
    });

    describe('restoreNestedArrays', () => {
        it('restores primitive values and standard arrays', () => {
            expect(restoreNestedArrays('hello')).toBe('hello');
            expect(restoreNestedArrays(123)).toBe(123);
            expect(restoreNestedArrays([1, 2, 3])).toEqual([1, 2, 3]);
        });

        it('restores nested arrays encoded with _is_nested_array_', () => {
            const encoded = {
                _is_nested_array_: true,
                _data_: [
                    { _is_nested_array_: true, _data_: ['row1-col1', 'row1-col2'] },
                    { _is_nested_array_: true, _data_: ['row2-col1', 'row2-col2'] }
                ]
            };
            const expected = [
                ['row1-col1', 'row1-col2'],
                ['row2-col1', 'row2-col2']
            ];
            expect(restoreNestedArrays(encoded)).toEqual(expected);
        });
    });
});
