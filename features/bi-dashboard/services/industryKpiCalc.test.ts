import { describe, it, expect } from 'vitest';
import {
    normalizeKpiName,
    getAllAvailableIndustryItems,
    extractKpiMetric,
    DEFAULT_INDUSTRY_KPI_CARDS,
    IndustryKpiCardConfig,
} from './industryKpiCalc';
import { IndustryTreeNode } from '../utils/dashboardHelpers';

describe('industryKpiCalc', () => {
    describe('normalizeKpiName', () => {
        it('loại bỏ tiền tố số, mã ngành và chuẩn hoá tiếng Việt không dấu', () => {
            expect(normalizeKpiName('1491 - Smartphone')).toBe('smartphone');
            expect(normalizeKpiName('13 - Điện thoại')).toBe('dienthoai');
            expect(normalizeKpiName('Đồng hồ thời trang')).toBe('donghothoitrang');
            expect(normalizeKpiName('Tủ lạnh, đông, mát')).toBe('tulanhdongmat');
            expect(normalizeKpiName('Máy lạnh & máy nước nóng')).toBe('maylanhmaynuocnong');
            expect(normalizeKpiName('iPhone')).toBe('iphone');
        });
    });

    const mockHeaders = [
        'Nhóm ngành hàng',
        'Số lượng',
        'DTLK',
        'DTQĐ',
        '% Tỉ trọng',
        'Target (QĐ)',
        '% HT Target (QĐ)',
        'TB 3 Tháng',
        '% TT',
        'DT TRẢ GÓP',
        'Tỷ Trọng Trả Góp',
    ];

    const mockTree: IndustryTreeNode[] = [
        {
            name: '1 - Viễn thông di động',
            level: 0,
            values: ['1 - Viễn thông di động', '500', '3500', '4000', '25%', '5000', '80%', '3800', '15%', '1200', '30%'],
            children: [
                {
                    name: 'Smartphone',
                    level: 1,
                    values: ['Smartphone', '400', '3000', '3500', '85%', '4000', '87%', '3200', '18%', '1100', '31%'],
                    children: [],
                },
                {
                    name: 'Điện thoại di động',
                    level: 1,
                    values: ['Điện thoại di động', '100', '500', '500', '15%', '1000', '50%', '600', '-5%', '100', '20%'],
                    children: [],
                },
            ],
        },
        {
            name: '2 - Laptop',
            level: 0,
            values: ['2 - Laptop', '50', '1500', '1800', '15%', '2000', '90%', '1600', '20%', '800', '44%'],
            children: [
                {
                    name: 'Laptop Gaming',
                    level: 1,
                    values: ['Laptop Gaming', '20', '800', '900', '50%', '1000', '90%', '750', '25%', '400', '44%'],
                    children: [],
                },
            ],
        },
        {
            name: '3 - Apple',
            level: 0,
            values: ['3 - Apple', '100', '2000', '2500', '20%', '3000', '83%', '2300', '12%', '1300', '52%'],
            children: [
                {
                    name: 'Iphone',
                    level: 1,
                    values: ['Iphone', '80', '1800', '2200', '88%', '2500', '88%', '1900', '16%', '1200', '54%'],
                    children: [],
                },
            ],
        },
        {
            name: '6 - Tủ lạnh, đông, mát',
            level: 0,
            values: ['6 - Tủ lạnh, đông, mát', '30', '1200', '1400', '10%', '1500', '93%', '1300', '8%', '500', '35%'],
            children: [],
        },
    ];

    describe('getAllAvailableIndustryItems', () => {
        it('thu thập đúng danh sách ngành hàng (level 0) và nhóm hàng (level 1)', () => {
            const { industries, subIndustries } = getAllAvailableIndustryItems(mockTree);
            expect(industries.length).toBe(4);
            expect(industries.map(i => i.displayName)).toContain('Viễn thông di động');
            expect(industries.map(i => i.displayName)).toContain('Laptop');
            expect(industries.map(i => i.displayName)).toContain('Apple');
            expect(industries.map(i => i.displayName)).toContain('Tủ lạnh, đông, mát');

            expect(subIndustries.length).toBe(4);
            expect(subIndustries.map(s => s.displayName)).toContain('Smartphone');
            expect(subIndustries.map(s => s.displayName)).toContain('Iphone');
            expect(subIndustries.map(s => s.displayName)).toContain('Laptop gaming');
        });
    });

    describe('extractKpiMetric', () => {
        it('trích xuất chính xác số liệu cho Nhóm hàng (Smartphone)', () => {
            const config: IndustryKpiCardConfig = { id: 'test_sm', title: 'Smartphone', type: 'subIndustry' };
            const metric = extractKpiMetric(config, mockTree, mockHeaders, false);

            expect(metric.hasData).toBe(true);
            expect(metric.displayTitle).toBe('Smartphone');
            expect(metric.sl).toBe(400);
            expect(metric.dtThuc).toBe(3000);
            expect(metric.dtQd).toBe(3500);
            expect(metric.growth).toBe(18);
            expect(metric.ptHt).toBe(87);
            expect(metric.dtTraGop).toBe(1100);
            expect(metric.ptTraGop).toBe(31);
        });

        it('trích xuất chính xác số liệu cho Ngành hàng (Tủ lạnh, đông, mát)', () => {
            const config: IndustryKpiCardConfig = { id: 'test_tl', title: 'Tủ lạnh, đông, mát', type: 'industry' };
            const metric = extractKpiMetric(config, mockTree, mockHeaders, false);

            expect(metric.hasData).toBe(true);
            expect(metric.displayTitle).toBe('Tủ lạnh, đông, mát');
            expect(metric.sl).toBe(30);
            expect(metric.dtQd).toBe(1400);
            expect(metric.growth).toBe(8);
        });

        it('fallback gracefully khi ngành hàng không có trong cây', () => {
            const config: IndustryKpiCardConfig = { id: 'test_camera', title: 'Camera', type: 'subIndustry' };
            const metric = extractKpiMetric(config, mockTree, mockHeaders, false);

            expect(metric.hasData).toBe(false);
            expect(metric.sl).toBe(0);
            expect(metric.dtQd).toBe(0);
        });

        it('12 thẻ mặc định có cấu hình hợp lệ', () => {
            expect(DEFAULT_INDUSTRY_KPI_CARDS.length).toBe(12);
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Smartphone');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Laptop');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Iphone');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Đồng hồ thời trang');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Sim data');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Pin sạc dự phòng');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Camera');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Tai nghe');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Tủ lạnh, đông, mát');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Tivi');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Máy giặt, sấy');
            expect(DEFAULT_INDUSTRY_KPI_CARDS.map(c => c.title)).toContain('Máy lạnh & máy nước nóng');
        });
    });
});
