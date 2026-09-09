import { describe, it, expect } from 'vitest';
import type { ProductConfig } from '../types';
import { evaluateAlerts, describeRule, createEmptyRule, type AlertRule } from './alertService';
import { computePivot } from './pivotService';
import { computeRbacFilteredData } from '../utils/dataUtils';

const cfg = (): ProductConfig => ({
    groups: {}, subgroups: {}, childToParentMap: {}, childToSubgroupMap: {}, quantityMultiplierMap: {},
});

const row = (o: Partial<Record<string, unknown>> = {}) => ({
    id: 'SO1', sp: 'San pham', sl: 1, gia: 1_000_000,
    kho: 'K01', nguoiTao: '111 - A', nhomHang: 'Smartphone',
    hangSx: 'Samsung', htx: 'Xuất bán hàng tại siêu thị', trangThai: 'Đã duyệt',
    thuTien: 'Đã thu', trangThaiHuy: 'Chưa hủy', nhapTra: 'Chưa trả',
    ...o,
});

const rule = (o: Partial<AlertRule> = {}): AlertRule => ({
    ...createEmptyRule(), id: 'r1', dimension: 'kho', metric: 'revenue', operator: 'lt', threshold: 1000, ...o,
});

describe('evaluateAlerts — bắt đúng đối tượng vi phạm', () => {
    const data = [
        row({ id: 'A', kho: 'K01', gia: 500 }),   // thấp
        row({ id: 'B', kho: 'K02', gia: 5000 }),  // cao
        row({ id: 'C', kho: 'K03', gia: 1000 }),  // ĐÚNG BẰNG ngưỡng
    ];

    it('"thấp hơn ngưỡng": chỉ bắt cái thật sự thấp hơn', () => {
        const hits = evaluateAlerts(data, [rule({ operator: 'lt', threshold: 1000 })], cfg());
        expect(hits.map(h => h.itemLabel)).toEqual(['K01']);
        expect(hits[0].value).toBe(500);
    });

    it('"vượt ngưỡng" hoạt động ngược lại', () => {
        const hits = evaluateAlerts(data, [rule({ operator: 'gt', threshold: 1000 })], cfg());
        expect(hits.map(h => h.itemLabel)).toEqual(['K02']);
    });

    it('giá trị ĐÚNG BẰNG ngưỡng KHÔNG bị cảnh báo (dùng < và > chứ không phải <= >=)', () => {
        const lt = evaluateAlerts(data, [rule({ operator: 'lt', threshold: 1000 })], cfg());
        const gt = evaluateAlerts(data, [rule({ operator: 'gt', threshold: 1000 })], cfg());
        expect(lt.map(h => h.itemLabel)).not.toContain('K03');
        expect(gt.map(h => h.itemLabel)).not.toContain('K03');
    });

    it('quy tắc bị TẮT thì không chạy', () => {
        expect(evaluateAlerts(data, [rule({ enabled: false })], cfg())).toEqual([]);
    });

    it('ngưỡng không hợp lệ (NaN do xoá trắng ô nhập) thì BỎ QUA, không cảnh báo loạn', () => {
        expect(evaluateAlerts(data, [rule({ threshold: NaN })], cfg())).toEqual([]);
    });

    it('nhiều quy tắc cùng chạy, kết quả gộp chung', () => {
        const hits = evaluateAlerts(data, [
            rule({ id: 'r1', operator: 'lt', threshold: 1000 }),
            rule({ id: 'r2', operator: 'gt', threshold: 1000 }),
        ], cfg());
        expect(hits.map(h => h.itemLabel).sort()).toEqual(['K01', 'K02']);
    });

    it('sắp xếp cái LỆCH NHIỀU NHẤT lên đầu', () => {
        const d = [row({ id: 'A', kho: 'K01', gia: 900 }), row({ id: 'B', kho: 'K02', gia: 100 })];
        const hits = evaluateAlerts(d, [rule({ operator: 'lt', threshold: 1000 })], cfg());
        expect(hits[0].itemLabel, 'K02 lệch 90% phải đứng trước K01 lệch 10%').toBe('K02');
    });

    it('soi được theo chiều khác (nhân viên), không chỉ Kho', () => {
        const d = [row({ id: 'A', nguoiTao: '111 - A', gia: 100 }), row({ id: 'B', nguoiTao: '222 - B', gia: 9000 })];
        const hits = evaluateAlerts(d, [rule({ dimension: 'nguoiTao', operator: 'lt', threshold: 1000 })], cfg());
        expect(hits.map(h => h.itemLabel)).toEqual(['111 - A']);
        expect(hits[0].dimensionLabel).toBe('Nhân viên');
    });
});

describe('KHỚP SỐ — cảnh báo dùng đúng con số của bảng, không có đường tính thứ hai', () => {
    it('giá trị trong cảnh báo bằng đúng giá trị computePivot cho ra', () => {
        const data = [
            row({ id: 'A', kho: 'K01', gia: 500, htx: 'Xuất bán hàng trả góp tại siêu thị' }),
            row({ id: 'B', kho: 'K01', gia: 200 }),
        ];
        const r = rule({ metric: 'revenueQD', operator: 'lt', threshold: 999_999_999 });
        const hits = evaluateAlerts(data, [r], cfg());
        const pivot = computePivot(data, { rowDims: ['kho'], colDim: null, metric: 'revenueQD' }, cfg());

        expect(hits[0].value).toBe(pivot.rows.find(x => x.label === 'K01')!.total);
    });

    it('dòng KHÔNG đủ điều kiện doanh thu bị loại giống hệt bảng', () => {
        const data = [row({ id: 'A', kho: 'K01', gia: 500 }), row({ id: 'B', kho: 'K01', gia: 9999, thuTien: 'Chưa thu' })];
        const hits = evaluateAlerts(data, [rule({ operator: 'lt', threshold: 1000 })], cfg());
        expect(hits[0].value, 'dòng chưa thu tiền không được cộng vào').toBe(500);
    });
});

describe('PHÂN QUYỀN — cảnh báo cũng chỉ trong phạm vi được phép', () => {
    it('NHÂN VIÊN chỉ nhận cảnh báo về số liệu của chính mình', () => {
        const toanCongTy = [
            row({ id: 'A', kho: 'K01', nguoiTao: '111 - A', gia: 100 }),
            row({ id: 'B', kho: 'K01', nguoiTao: '222 - B', gia: 200 }),
        ];
        const nguon = computeRbacFilteredData(toanCongTy, {
            isDemoMode: false, userRole: 'employee', departmentId: 'K01',
            employeeName: '111', userEmail: 'a@test.com',
        });
        const hits = evaluateAlerts(nguon, [rule({ dimension: 'nguoiTao', operator: 'lt', threshold: 1000 })], cfg());
        expect(hits.map(h => h.itemLabel), 'không được lộ số của đồng nghiệp qua cảnh báo').toEqual(['111 - A']);
    });
});

describe('describeRule — mô tả dễ hiểu khi người dùng không tự đặt tên', () => {
    it('sinh mô tả tiếng Việt từ cấu hình', () => {
        expect(describeRule(rule({ dimension: 'kho', metric: 'revenueQD', operator: 'lt', threshold: 1000 })))
            .toBe('Kho có Doanh thu QĐ thấp hơn 1.000');
        expect(describeRule(rule({ operator: 'gt', threshold: 50 })))
            .toContain('vượt');
    });

    it('ưu tiên tên người dùng tự đặt', () => {
        expect(describeRule(rule({ label: 'Kho yếu cần hỗ trợ' }))).toBe('Kho yếu cần hỗ trợ');
        expect(describeRule(rule({ label: '   ' })), 'tên toàn khoảng trắng thì vẫn dùng mô tả tự động').toContain('Kho có');
    });
});
