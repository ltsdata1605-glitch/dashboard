import { describe, it, expect, vi } from 'vitest';
import { RevenueRow } from '../types/nhanVienTypes';
import { isSameEmployee, extractEmployeeId, standardizeEmployeeName, formatEmployeeName } from '../utils/nhanVienHelpers';

// Mock react useMemo and useCallback to run synchronously without renderHook
vi.mock('react', async () => {
    const actual = await vi.importActual<typeof import('react')>('react');
    return {
        ...actual,
        useMemo: (fn: () => unknown) => fn(),
        useCallback: (fn: () => unknown) => fn()
    };
});

import { useRevenueData } from './useRevenueData';

describe('Revenue Matching and Display with Analysis Employees', () => {
    describe('isSameEmployee matching rules for Phân Tích vs MWG raw report', () => {
        it('matches user screenshot case: ID - Name with Name - ID', () => {
            // User screenshot shows: '7587 - Nguyễn Thị Tùy' in modal
            const analysisEmp = '7587 - Nguyễn Thị Tùy';
            const rawReportEmp = 'Nguyễn Thị Tùy - 7587';
            expect(isSameEmployee(analysisEmp, rawReportEmp)).toBe(true);
            expect(extractEmployeeId(analysisEmp)).toBe('7587');
            expect(extractEmployeeId(rawReportEmp)).toBe('7587');
        });

        it('standardizeEmployeeName converts ID - Name to Name - ID', () => {
            expect(standardizeEmployeeName('7587 - Nguyễn Thị Tùy')).toBe('Nguyễn Thị Tùy - 7587');
            expect(formatEmployeeName('7587 - Nguyễn Thị Tùy')).toBe('7587 - T.Tùy');
        });
    });

    describe('useRevenueData integration with Phân Tích employees', () => {
        const mockEmployeesFromAnalysis: RevenueRow[] = [
            {
                type: 'employee',
                name: 'Nguyễn Thị Tùy',
                originalName: '7587 - Nguyễn Thị Tùy',
                department: 'BP All In One - ĐMX',
                dtlk: 0,
                dtqd: 0,
                hieuQuaQD: 0,
                soLuong: 0
            },
            {
                type: 'employee',
                name: 'Trần Văn An',
                originalName: '12345 - Trần Văn An',
                department: 'BP All In One - ĐMX',
                dtlk: 150000000,
                dtqd: 180000000,
                hieuQuaQD: 0.2,
                soLuong: 12
            }
        ];

        const departmentRows: RevenueRow[] = [
            {
                type: 'department',
                name: 'BP All In One - ĐMX',
                dtlk: 150000000,
                dtqd: 180000000,
                hieuQuaQD: 0.2
            },
            ...mockEmployeesFromAnalysis
        ];

        it('renders all employees configured from Phân Tích even when some have 0 revenue', () => {
            const result = useRevenueData({
                rows: departmentRows,
                departmentNames: ['BP All In One - ĐMX'],
                sortConfig: { key: 'dtqd', direction: 'desc' },
                prevMonthRows: [],
                departmentWeights: { 'BP All In One - ĐMX': 100 },
                deptEmployeeCounts: { 'BP All In One - ĐMX': 2 },
                supermarketTarget: 200000000,
                employeeInstallmentMap: new Map(),
                viewMode: 'group',
                exportDeptFilter: null,
                isActive: true
            });

            const list = result.displayList;
            expect(list.length).toBeGreaterThan(0);

            // Should contain department row + 2 employee rows + total row
            const employeeRows = list.filter(r => r.type === 'employee');
            expect(employeeRows.length).toBe(2);

            // Employee with 0 revenue must be displayed with their calculated target
            const zeroRevEmp = employeeRows.find(e => e.originalName === '7587 - Nguyễn Thị Tùy');
            expect(zeroRevEmp).toBeDefined();
            expect(zeroRevEmp?.calculatedTarget).toBe(100000000); // 200M * 100% / 2
            expect(zeroRevEmp?.dtlk).toBe(0);
            expect(zeroRevEmp?.dtqd).toBe(0);

            // Employee with sales
            const salesEmp = employeeRows.find(e => e.originalName === '12345 - Trần Văn An');
            expect(salesEmp).toBeDefined();
            expect(salesEmp?.calculatedTarget).toBe(100000000);
            expect(salesEmp?.dtlk).toBe(150000000);
            expect(salesEmp?.dtqd).toBe(180000000);
        });

        it('renders list view sorted correctly with all configured employees', () => {
            const result = useRevenueData({
                rows: departmentRows,
                departmentNames: ['all'],
                sortConfig: { key: 'dtqd', direction: 'desc' },
                prevMonthRows: [],
                departmentWeights: { 'BP All In One - ĐMX': 100 },
                deptEmployeeCounts: { 'BP All In One - ĐMX': 2 },
                supermarketTarget: 200000000,
                employeeInstallmentMap: new Map(),
                viewMode: 'list',
                exportDeptFilter: null,
                isActive: true
            });

            const list = result.displayList;
            const employeeRows = list.filter(r => r.type === 'employee');
            expect(employeeRows.length).toBe(2);
            // Sorted desc by dtqd: Trần Văn An (180M) first, Nguyễn Thị Tùy (0) second
            expect(employeeRows[0].originalName).toBe('12345 - Trần Văn An');
            expect(employeeRows[1].originalName).toBe('7587 - Nguyễn Thị Tùy');
        });

        it('correctly matches employee installment percentage even with differing name formats (ID - Name vs Name - ID)', () => {
            const installmentMap = new Map<string, number>();
            // Raw BI installment table format: "Nguyễn Thị Tùy - 7587" or ID "7587"
            installmentMap.set('Nguyễn Thị Tùy - 7587', 45.5);
            installmentMap.set('7587', 45.5);
            installmentMap.set('Trần Văn An - 12345', 68.2);

            const result = useRevenueData({
                rows: departmentRows,
                departmentNames: ['BP All In One - ĐMX'],
                sortConfig: { key: 'dtqd', direction: 'desc' },
                prevMonthRows: [],
                departmentWeights: { 'BP All In One - ĐMX': 100 },
                deptEmployeeCounts: { 'BP All In One - ĐMX': 2 },
                supermarketTarget: 200000000,
                employeeInstallmentMap: installmentMap,
                viewMode: 'group',
                exportDeptFilter: null,
                isActive: true
            });

            const employeeRows = result.displayList.filter(r => r.type === 'employee');
            const empTuy = employeeRows.find(e => e.originalName === '7587 - Nguyễn Thị Tùy');
            const empAn = employeeRows.find(e => e.originalName === '12345 - Trần Văn An');

            expect(empTuy).toBeDefined();
            expect(empTuy?.calculatedInstallment).toBe(45.5);

            expect(empAn).toBeDefined();
            expect(empAn?.calculatedInstallment).toBe(68.2);
        });
    });
});

