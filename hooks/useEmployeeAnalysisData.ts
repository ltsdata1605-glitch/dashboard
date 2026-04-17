import { useState, useEffect, useMemo } from 'react';
import { useDashboardContext } from '../contexts/DashboardContext';
import { getRowValue } from '../utils/dataUtils';
import { COL } from '../constants';
import { saveSetting, getSetting } from '../services/dbService';
import { isDateMatch } from '../services/filterService';

export const useEmployeeAnalysisData = () => {
    const { 
        employeeAnalysisData, 
        baseFilteredData, 
        productConfig, 
        originalData,
        filterState
    } = useDashboardContext();

    const [hideZeroRevenue, setHideZeroRevenueRaw] = useState(true);

    // Load persisted value from IndexedDB on mount
    useEffect(() => {
        getSetting<boolean>('hideZeroRevenue').then(saved => {
            if (saved !== null && saved !== undefined) {
                setHideZeroRevenueRaw(saved);
            }
        }).catch(console.error);
    }, []);

    // Wrapper that persists to IndexedDB (saveSetting auto-triggers Firebase sync)
    const setHideZeroRevenue = (value: boolean) => {
        setHideZeroRevenueRaw(value);
        saveSetting('hideZeroRevenue', value).catch(console.error);
    };

    const { 
        allIndustries, 
        allSubgroups, 
        allManufacturers, 
        allDepartments, 
    } = useMemo(() => {
        if (!productConfig || !originalData || !employeeAnalysisData) {
            return { 
                allIndustries: [], 
                allSubgroups: [], 
                allManufacturers: [], 
                allDepartments: [], 
            };
        }
        
        const industries = new Set(Object.values(productConfig.childToParentMap));
        const subgroups = new Set<string>();
        Object.values(productConfig.subgroups).forEach(parent => {
            Object.keys(parent).forEach(subgroup => subgroups.add(subgroup));
        });
        const manufacturers = new Set<string>(originalData.map(row => String(getRowValue(row, COL.MANUFACTURER) || '')).filter(Boolean));
        const depts = new Set<string>(employeeAnalysisData.fullSellerArray.map(emp => String(emp.department || '')).filter(Boolean));
        
        return { 
            allIndustries: Array.from(industries).sort(), 
            allSubgroups: Array.from(subgroups).sort(),
            allManufacturers: Array.from(manufacturers).sort(),
            allDepartments: Array.from(depts).sort(),
        };
    }, [productConfig, originalData, employeeAnalysisData]);

    const filteredEmployeeAnalysisData = useMemo(() => {
        if (!employeeAnalysisData) return null;

        const filterEmployee = (emp: any) => {
            // Check Zero Revenue
            if (hideZeroRevenue && (emp.doanhThuThuc || 0) === 0) return false;
            return true;
        };

        const filteredFullSellerArray = employeeAnalysisData.fullSellerArray.filter(filterEmployee);
        const filteredExploitationData = employeeAnalysisData.exploitationData.filter(filterEmployee);
        
        const mainStartDate = filterState.startDate ? new Date(filterState.startDate) : null;
        if (mainStartDate) mainStartDate.setHours(0, 0, 0, 0);
        const mainEndDate = filterState.endDate ? new Date(filterState.endDate) : null;
        if (mainEndDate) mainEndDate.setHours(23, 59, 59, 999);

        // Filter baseFilteredData as well
        const filteredBaseData = baseFilteredData.filter(row => {
            // Apply Date Filter!
            if (!isDateMatch(row, mainStartDate, mainEndDate, filterState.selectedMonths)) return false;

            const empName = getRowValue(row, COL.NGUOI_TAO);
            const empObj = empName ? employeeAnalysisData.fullSellerArray.find(e => e.name === empName) : null;
            if (!empObj) return !hideZeroRevenue; // If name not found, usually means 0 revenue info in this context, but follow filter
            return filterEmployee(empObj);
        });

        return {
            ...employeeAnalysisData,
            fullSellerArray: filteredFullSellerArray,
            exploitationData: filteredExploitationData,
            filteredBaseData
        } as any;
    }, [employeeAnalysisData, baseFilteredData, hideZeroRevenue, filterState]);

    return {
        allIndustries,
        allSubgroups,
        allManufacturers,
        allDepartments,
        hideZeroRevenue,
        setHideZeroRevenue,
        filteredEmployeeAnalysisData: filteredEmployeeAnalysisData ? {
            ...filteredEmployeeAnalysisData,
            filteredBaseData: filteredEmployeeAnalysisData.filteredBaseData
        } : null
    };
};
