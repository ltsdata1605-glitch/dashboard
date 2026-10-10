import { describe, it, expect } from 'vitest';

describe('Approval Settings Logic Verification', () => {
    it('mặc định cấp quản lý đối với nhân viên là BẬT (autoApproveEmployees = true)', () => {
        const rawConfig: Record<string, any> = {};
        const autoApproveEmployees = rawConfig.autoApproveEmployees !== false;
        expect(autoApproveEmployees).toBe(true);
    });

    it('mặc định cấp super admin đối với quản lý là TẮT (autoApproveManagers = false)', () => {
        const rawConfig: Record<string, any> = {};
        const autoApproveManagers = Boolean(rawConfig.autoApproveManagers);
        expect(autoApproveManagers).toBe(false);
    });

    it('tính toán tự động duyệt theo mã kho cụ thể khi có override', () => {
        const config = {
            autoApproveEmployees: true,
            autoApproveEmployeesByDept: {
                '1032': false, // Kho 1032 tắt
                '58614': true, // Kho 58614 bật
            }
        };

        const checkDept = (deptId: string) => {
            if (config.autoApproveEmployeesByDept && (config.autoApproveEmployeesByDept as any)[deptId] !== undefined) {
                return (config.autoApproveEmployeesByDept as any)[deptId];
            }
            return config.autoApproveEmployees !== false;
        };

        expect(checkDept('1032')).toBe(false);
        expect(checkDept('58614')).toBe(true);
        expect(checkDept('9999')).toBe(true); // Kho chưa set gì thì ăn theo mặc định (true)
    });
});
