import React, { useMemo, useState, forwardRef, useEffect, useRef } from 'react';
import type { Employee, EmployeeData } from '../../types';
import { Icon } from '../common/Icon';
import { getDailyTarget, saveDailyTarget } from '../../services/dbService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { GroupType, SortDirection, safeSort } from './performance/PerformanceTableUtils';
import { PerformanceSingleTable } from './performance/PerformanceSingleTable';

type SortKey = keyof Employee | 'name' | 'percentHT' | 'dtVuot' | 'target' | 'dtTraChamPercent_CE_ICT' | 'traChamPercent_CE_ICT';

interface PerformanceTableProps {
    employeeData: EmployeeData | null | undefined;
    onEmployeeClick: (employeeName: string) => void;
    onExport?: () => void;
    isExporting?: boolean;
}



// ── Main PerformanceTable ─────────────────────────────────────────────────────
const PerformanceTable = React.memo(forwardRef<HTMLDivElement, PerformanceTableProps>(({
    employeeData, onEmployeeClick, onExport, isExporting,
}, ref) => {
    const { kpiTargets } = useDashboardContext() || {};
    const [activeTab, setActiveTab] = useState<GroupType>('doanhThu');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: 'doanhThuQD', direction: 'desc' });
    const [targetPerEmployee, setTargetPerEmployee] = useState(150_000_000);
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [tempTarget, setTempTarget] = useState('150');
    const [showSortArrow, setShowSortArrow] = useState(true);
    const targetInputRef = useRef<HTMLInputElement>(null);
    const sortTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        getDailyTarget().then(t => {
            if (t) { setTargetPerEmployee(t); setTempTarget(String(Math.round(t / 1_000_000))); }
        });
        return () => {
            if (sortTimerRef.current) clearTimeout(sortTimerRef.current);
        };
    }, []);

    const handleBatchPerformanceExport = async () => {
        const tabs: GroupType[] = ['doanhThu', 'khaiThac', 'vuotTroi'];
        for (const tab of tabs) {
            setActiveTab(tab);
            // Wait for tab switch and render
            await new Promise(resolve => setTimeout(resolve, 800));
            if (onExport) onExport();
            // Wait between exports
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        // Return to original tab or stay on last? Let's stay on last or return to first.
        setActiveTab('doanhThu');
    };

    const handleSaveTarget = () => {
        const raw = tempTarget.replace(/[^\d.]/g, '');
        const shortVal = parseFloat(raw);
        if (!isNaN(shortVal) && shortVal > 0) {
            const fullVal = Math.round(shortVal * 1_000_000);
            setTargetPerEmployee(fullVal);
            saveDailyTarget(fullVal);
            setTempTarget(String(Math.round(shortVal)));
        } else {
            setTempTarget(String(Math.round(targetPerEmployee / 1_000_000)));
        }
        setIsEditingTarget(false);
    };

    const handleTabChange = (tab: GroupType) => {
        setActiveTab(tab);
        let newKey: SortKey = 'doanhThuQD';
        if (tab === 'doanhThu') newKey = 'doanhThuQD';
        else if (tab === 'khaiThac') newKey = 'dtTraChamPercent_CE_ICT';
        else newKey = 'percentHT';
        
        setSortConfig({ key: newKey, direction: 'desc' });
        setShowSortArrow(true);
        if (sortTimerRef.current) clearTimeout(sortTimerRef.current);
        sortTimerRef.current = setTimeout(() => setShowSortArrow(false), 3000);
    };

    const { groupedData, outstandingData, sellerCount } = useMemo(() => {
        const sellers = [...(employeeData?.fullSellerArray || [])].filter(Boolean);

        const sorted = sellers.sort((a, b) =>
            safeSort(a, b, sortConfig.key, sortConfig.direction)
        );

        const grouped: { [dept: string]: Employee[] } = {};
        sorted.forEach(emp => {
            if (!emp) return;
            if (!grouped[emp.department]) grouped[emp.department] = [];
            grouped[emp.department].push(emp);
        });

        const outstanding: { [dept: string]: any[] } = {};
        const fullOutstanding = sorted.map(emp => {
            if (!emp) return null;
            const percentHT = targetPerEmployee > 0 ? (emp.doanhThuQD / targetPerEmployee) * 100 : 0;
            const dtVuot = Math.max(0, emp.doanhThuQD - targetPerEmployee);
            return { ...emp, target: targetPerEmployee, percentHT, dtVuot };
        }).filter(Boolean) as any[];

        if (['target', 'percentHT', 'dtVuot'].includes(sortConfig.key)) {
            fullOutstanding.sort((a, b) => safeSort(a, b, sortConfig.key, sortConfig.direction));
        }

        fullOutstanding.forEach(emp => {
            if (!emp) return;
            if (!outstanding[emp.department]) outstanding[emp.department] = [];
            outstanding[emp.department].push(emp);
        });

        return { groupedData: grouped, outstandingData: outstanding, sellerCount: sellers.length };
    }, [employeeData, sortConfig, targetPerEmployee]);

    const trueGrandTotal = useMemo(() => {
        const all = employeeData?.fullSellerArray || [];
        const totalDTThuc = all.reduce((s, e) => s + Number(e.doanhThuThuc || 0), 0);
        const totalDTQD   = all.reduce((s, e) => s + Number(e.doanhThuQD || 0), 0);
        const totalSlTC   = all.reduce((s, e) => s + Number(e.slTiepCan || 0), 0);
        const totalSlICT = all.reduce((s, e) => s + Number(e.slICT || 0), 0);
        const totalSlCE_main = all.reduce((s, e) => s + Number(e.slCE_main || 0), 0);
        const totalSlCE_ICT = all.reduce((s, e) => s + Number(e.slCE_ICT || 0), 0);
        const totalSlTraCham_CE_ICT = all.reduce((s, e) => s + Number(e.slTraCham_CE_ICT || 0), 0);
        const totalRevCE_ICT = all.reduce((s, e) => s + Number(e.doanhThu_CE_ICT || 0), 0);
        const totalRevTraCham_CE_ICT = all.reduce((s, e) => s + Number(e.doanhThuTraCham_CE_ICT || 0), 0);
        
        const totalTarget = targetPerEmployee * all.length;
        
        return {
            doanhThuThuc: totalDTThuc,
            doanhThuQD: totalDTQD,
            slTiepCan: totalSlTC,
            slICT: totalSlICT,
            slCE_main: totalSlCE_main,
            slCE_ICT: totalSlCE_ICT,
            slTraCham_CE_ICT: totalSlTraCham_CE_ICT,
            hieuQuaValue: totalDTThuc > 0 ? ((totalDTQD - totalDTThuc) / totalDTThuc) * 100 : 0,
            traChamPercent_CE_ICT: totalSlCE_ICT > 0 ? (totalSlTraCham_CE_ICT / totalSlCE_ICT) * 100 : 0,
            dtTraChamPercent_CE_ICT: totalRevCE_ICT > 0 ? (totalRevTraCham_CE_ICT / totalRevCE_ICT) * 100 : 0,
            target: totalTarget,
            percentHT: totalTarget > 0 ? (totalDTQD / totalTarget) * 100 : 0,
            dtVuot: Math.max(0, totalDTQD - totalTarget)
        };
    }, [employeeData, targetPerEmployee]);

    const handleSort = (key: SortKey) => {
        setSortConfig(cur => ({ key, direction: cur.key === key && cur.direction === 'desc' ? 'asc' : 'desc' }));
        setShowSortArrow(true);
        if (sortTimerRef.current) clearTimeout(sortTimerRef.current);
        sortTimerRef.current = setTimeout(() => setShowSortArrow(false), 3000);
    };

    if (!employeeData) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Icon name="loader-2" className="animate-spin text-indigo-500" size={8} />
                <span className="ml-3 text-slate-500 font-medium">Đang tải dữ liệu...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-transparent">
            <PerformanceSingleTable
                groupType={activeTab}
                handleTabChange={handleTabChange}
                sortConfig={sortConfig}
                onSort={handleSort}
                tableRef={ref as any}
                onSingleExport={onExport || (() => {})}
                isExporting={isExporting}
                groupedData={groupedData}
                outstandingData={outstandingData}
                grandTotal={trueGrandTotal}
                targetPerEmployee={targetPerEmployee}
                onEmployeeClick={onEmployeeClick}
                isEditingTarget={isEditingTarget}
                targetInputRef={targetInputRef}
                setTargetPerEmployee={setTargetPerEmployee}
                handleSaveTarget={handleSaveTarget}
                setIsEditingTarget={setIsEditingTarget}
                tempTarget={tempTarget}
                setTempTarget={setTempTarget}
                fullSellerArrayLength={sellerCount}
                showSortArrow={showSortArrow}
                onBatchExport={handleBatchPerformanceExport}
                kpiTargets={kpiTargets}
            />
        </div>
    );
}));

PerformanceTable.displayName = 'PerformanceTable';
export default PerformanceTable;
