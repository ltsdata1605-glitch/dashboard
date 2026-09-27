/**
 * Super Admin gắn thêm Mã Kho thật (2026-09-27) — chủ dự án báo "Không nhập được mã kho cho
 * Super Admin": resolveSession ghi đè cứng departmentId = "ALL (Super Admin)" ở mọi lần đăng nhập,
 * nên Super Admin không bao giờ dùng chung được dữ liệu Kho (khoData/biData) với tài khoản khác.
 */
import { describe, it, expect } from 'vitest';
import { normalizeSuperAdminDept, SUPER_ADMIN_DEPT } from '../../functions/src/superAdminDept';
import { parseKhoList } from '../../utils/dataUtils';

/** Mô phỏng đúng `myKhos()` trong firestore.rules: bỏ MỌI khoảng trắng rồi tách theo dấu phẩy. */
const myKhosTheoRules = (claim: string) => claim.replace(/\s+/g, '').split(',');

describe('normalizeSuperAdminDept (resolveSession dùng ở mỗi lần đăng nhập)', () => {
    it('chưa gắn Kho nào → chỉ còn nhãn, đúng như hành vi cũ', () => {
        expect(normalizeSuperAdminDept(null)).toBe(SUPER_ADMIN_DEPT);
        expect(normalizeSuperAdminDept('')).toBe(SUPER_ADMIN_DEPT);
        expect(normalizeSuperAdminDept(SUPER_ADMIN_DEPT)).toBe(SUPER_ADMIN_DEPT);
        expect(normalizeSuperAdminDept('ALL')).toBe(SUPER_ADMIN_DEPT);
    });

    it('GIỮ Kho đã gắn thay vì ghi đè (lỗi gốc)', () => {
        expect(normalizeSuperAdminDept('ALL (Super Admin),910')).toBe('ALL (Super Admin),910');
    });

    it('lỡ mất nhãn (vd sửa ở danh sách Phân quyền thành "910") → tự gắn lại nhãn, vẫn giữ Kho', () => {
        expect(normalizeSuperAdminDept('910')).toBe('ALL (Super Admin),910');
    });

    it('bỏ khoảng trắng, rỗng, trùng; nhãn luôn đứng đầu', () => {
        expect(normalizeSuperAdminDept(' 910 , 910,,ALL (Super Admin), 58614 ')).toBe('ALL (Super Admin),910,58614');
    });

    it('chạy lại nhiều lần không đổi kết quả (mỗi lần đăng nhập đều gọi)', () => {
        const once = normalizeSuperAdminDept('58614, 910');
        expect(normalizeSuperAdminDept(once)).toBe(once);
    });
});

describe('Firestore Rules nhận Kho gắn thêm của Super Admin', () => {
    it('myKhos() chứa "910" → đọc/ghi được khoData/910 và biData/910', () => {
        expect(myKhosTheoRules(normalizeSuperAdminDept('910'))).toContain('910');
    });
    it('chỉ có nhãn → myKhos() không chứa Kho thật nào (như cũ)', () => {
        expect(myKhosTheoRules(SUPER_ADMIN_DEPT)).toEqual(['ALL(SuperAdmin)']);
    });
});

describe('parseKhoList (client tách Kho để đọc/ghi dữ liệu dùng chung)', () => {
    it('bỏ nhãn Super Admin — nhãn không phải Kho, Rules sẽ từ chối và làm hỏng cả lượt tải', () => {
        expect(parseKhoList('ALL (Super Admin),910')).toEqual(['910']);
        expect(parseKhoList('ALL (Super Admin)')).toEqual([]);
        expect(parseKhoList('ALL')).toEqual([]);
    });
    it('Kho thường giữ nguyên như cách tách cũ', () => {
        expect(parseKhoList('58614, 910')).toEqual(['58614', '910']);
        expect(parseKhoList(' 1032 ,, ')).toEqual(['1032']);
        expect(parseKhoList(undefined)).toEqual([]);
        expect(parseKhoList(null)).toEqual([]);
    });
});
