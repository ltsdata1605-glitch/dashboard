import { describe, it, expect } from 'vitest';
import { getDkhtColor, toBoldVividColor, DEFAULT_COLOR_SETTINGS, getMetricColorByTarget } from './ColorSettingsModal';

describe('Color Settings and Segment Thresholds', () => {
    describe('getDkhtColor', () => {
        it('should return slate color when hasTarget is false', () => {
            expect(getDkhtColor(90, false)).toBe('#94a3b8');
            expect(getDkhtColor(130, false)).toBe('#94a3b8');
        });

        it('should return deep red (#dc2626) for < 80%', () => {
            expect(getDkhtColor(0, true)).toBe('#dc2626');
            expect(getDkhtColor(6, true)).toBe('#dc2626');
            expect(getDkhtColor(61, true)).toBe('#dc2626');
            expect(getDkhtColor(79.9, true)).toBe('#dc2626');
        });

        it('should return deep orange (#ea580c) for 80% <= x < 100%', () => {
            expect(getDkhtColor(80, true)).toBe('#ea580c');
            expect(getDkhtColor(83, true)).toBe('#ea580c');
            expect(getDkhtColor(96, true)).toBe('#ea580c');
            expect(getDkhtColor(99.9, true)).toBe('#ea580c');
        });

        it('should return deep emerald (#059669) for 100% <= x < 120%', () => {
            expect(getDkhtColor(100, true)).toBe('#059669');
            expect(getDkhtColor(101, true)).toBe('#059669');
            expect(getDkhtColor(110, true)).toBe('#059669');
            expect(getDkhtColor(119.9, true)).toBe('#059669');
        });

        it('should return deep royal blue (#2563eb) for >= 120%', () => {
            expect(getDkhtColor(120, true)).toBe('#2563eb');
            expect(getDkhtColor(135, true)).toBe('#2563eb');
            expect(getDkhtColor(200, true)).toBe('#2563eb');
        });
    });

    describe('toBoldVividColor', () => {
        it('should upgrade pale colors to saturated bold colors', () => {
            expect(toBoldVividColor('#10b981')).toBe('#059669');
            expect(toBoldVividColor('#f59e0b')).toBe('#ea580c');
            expect(toBoldVividColor('#f43f5e')).toBe('#dc2626');
            expect(toBoldVividColor('#0ea5e9')).toBe('#0284c7');
        });

        it('should preserve already custom or bold colors', () => {
            expect(toBoldVividColor('#2563eb')).toBe('#2563eb');
            expect(toBoldVividColor('#059669')).toBe('#059669');
            expect(toBoldVividColor(undefined)).toBeUndefined();
        });
    });

    describe('DEFAULT_COLOR_SETTINGS', () => {
        it('should use vivid bold colors by default for hqqd and tragop', () => {
            expect(DEFAULT_COLOR_SETTINGS.hqqd.good.color).toBe('#059669');
            expect(DEFAULT_COLOR_SETTINGS.hqqd.average.color).toBe('#ea580c');
            expect(DEFAULT_COLOR_SETTINGS.hqqd.bad.color).toBe('#dc2626');

            expect(DEFAULT_COLOR_SETTINGS.tragop.good.color).toBe('#059669');
            expect(DEFAULT_COLOR_SETTINGS.tragop.average.color).toBe('#ea580c');
            expect(DEFAULT_COLOR_SETTINGS.tragop.bad.color).toBe('#dc2626');
        });
    });

    describe('getMetricColorByTarget', () => {
        const target = 60; // Target = 60% như trong ảnh người dùng

        it('should return gray for missing or invalid target/val', () => {
            expect(getMetricColorByTarget(null, target)).toBe('#94a3b8');
            expect(getMetricColorByTarget(55, 0)).toBe('#94a3b8');
            expect(getMetricColorByTarget(55, null)).toBe('#94a3b8');
        });

        it('should return deep emerald (#059669) when val >= target', () => {
            expect(getMetricColorByTarget(60, target)).toBe('#059669');
            expect(getMetricColorByTarget(65, target)).toBe('#059669');
            expect(getMetricColorByTarget(72, target)).toBe('#059669');
        });

        it('should return deep orange (#ea580c) when 85% <= val / target < 100%', () => {
            // Với target = 60%, 85% là 51%
            expect(getMetricColorByTarget(51, target)).toBe('#ea580c');
            expect(getMetricColorByTarget(55, target)).toBe('#ea580c');
            expect(getMetricColorByTarget(58, target)).toBe('#ea580c');
            expect(getMetricColorByTarget(59.9, target)).toBe('#ea580c');
        });

        it('should return deep red (#dc2626) when val / target < 85%', () => {
            expect(getMetricColorByTarget(50.9, target)).toBe('#dc2626');
            expect(getMetricColorByTarget(47, target)).toBe('#dc2626');
            expect(getMetricColorByTarget(45, target)).toBe('#dc2626');
            expect(getMetricColorByTarget(32, target)).toBe('#dc2626');
            expect(getMetricColorByTarget(19, target)).toBe('#dc2626');
        });
    });
});
