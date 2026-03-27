import { useState, useEffect, useMemo } from 'react';
import { useDashboardContext } from '../contexts/DashboardContext';
import { getRowValue } from '../utils/dataUtils';
import { COL } from '../constants';
import { saveSetting, getSetting } from '../services/dbService';

export const useEmployeeAnalysisData = () => {
    const { 
        employeeAnalysisData, 
        baseFilteredData, 
        productConfig, 
        originalData 
    } = useDashboardContext();

    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

    // Load saved filters
    useEffect(() => {
        const loadSavedFilters = async () => {
            const savedDepts = await getSetting<string[]>('employee_analysis_selected_departments');
            if (savedDepts) setSelectedDepartments(savedDepts);
        };
        loadSavedFilters();
    }, []);

    // Save filters when they change
    useEffect(() => {
        if (selectedDepartments.length > 0) {
            saveSetting('employee_analysis_selected_departments', selectedDepartments);
        }
    }, [selectedDepartments]);
    
    const [deptSearchTerm, setDeptSearchTerm] = useState('');
    const [hideZeroRevenue, setHideZeroRevenue] = useState(false);

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

    // Restore selected departments
    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const saved = await getSetting<string[]>('employeeAnalysis_selectedDepartments');
                if (saved && Array.isArray(saved) && allDepartments.length > 0) {
                    const validDepts = saved.filter(d => allDepartments.includes(d));
                    setSelectedDepartments(validDepts);
                } else if (allDepartments.length > 0 && selectedDepartments.length === 0) {
                    setSelectedDepartments(allDepartments);
                }
            } catch (e) {
                console.error("Failed to load selected departments", e);
            }
        };
        loadDepartments();
    }, [allDepartments]);

    // Save filters
    useEffect(() => {
        saveSetting('employeeAnalysis_selectedDepartments', selectedDepartments);
    }, [selectedDepartments]);

    const filteredEmployeeAnalysisData = useMemo(() => {
        if (!employeeAnalysisData) return null;
        
        const isAllDepartments = selectedDepartments.length === 0 || selectedDepartments.length === allDepartments.length;

        const filterEmployee = (emp: any) => {
            // Check Department
            if (!isAllDepartments && !selectedDepartments.includes(emp.department)) return false;
            // Check Zero Revenue
            if (hideZeroRevenue && (emp.doanhThuThuc || 0) === 0) return false;
            return true;
        };

        const filteredFullSellerArray = employeeAnalysisData.fullSellerArray.filter(filterEmployee);
        const filteredExploitationData = employeeAnalysisData.exploitationData.filter(filterEmployee);
        
        // Filter baseFilteredData as well
        const filteredBaseData = baseFilteredData.filter(row => {
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
    }, [employeeAnalysisData, selectedDepartments, allDepartments, baseFilteredData, hideZeroRevenue]);

    return {
        allIndustries,
        allSubgroups,
        allManufacturers,
        allDepartments,
        selectedDepartments,
        setSelectedDepartments,
        deptSearchTerm,
        setDeptSearchTerm,
        hideZeroRevenue,
        setHideZeroRevenue,
        filteredEmployeeAnalysisData: filteredEmployeeAnalysisData ? {
            ...filteredEmployeeAnalysisData,
            filteredBaseData: filteredEmployeeAnalysisData.filteredBaseData
        } : null
    };
};
