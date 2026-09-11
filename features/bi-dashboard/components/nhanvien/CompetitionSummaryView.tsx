
import React, { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import Card from '../Card';
import toast from 'react-hot-toast';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { FilterIcon, TrashIcon, PencilIcon, XIcon, CheckCircleIcon, PercentIcon, HashIcon, ChevronDownIcon, DownloadAllIcon, SpinnerIcon } from '../Icons';
import { Columns3 } from 'lucide-react';
import { Employee, CompetitionHeader, Criterion } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString, shortenName } from '../../utils/nhanVienHelpers';
import {
    resolveEmployeeTarget,
    getMonthProgress,
    computeColumnAverages,
    computeColumnRankings,
    computeTongBotMap,
    computeNoSaleMap,
    computeDatMap,
    computeStoreDatPercent,
    computeStoreColumnDatCount,
    computeTongBotRedCutoff,
} from '../../services/competitionSummaryCalc';
import { getDefaultGroupLabel } from '../../utils/dashboardHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Switch } from '../dashboard/DashboardWidgets';
import { Button } from '../../../../components/shared/ui/Button';
import { Input } from '../../../../components/shared/ui/Input';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { ConfirmDialog } from '../../../../components/shared/ui/ConfirmDialog';

/**
 * Tiêu đề cột — chuẩn "Bảng điều khiển ca trực" (2026-09-11).
 *
 * Bản cũ xoay vòng 6 HỌ MÀU × 2 tầng sắc độ cho tiêu đề nhóm và tiêu đề cột con. Trên bảng 48 cột
 * thì thành 6 mảng màu chạy ngang suốt màn hình, cạnh tranh sự chú ý với chính con số bên dưới —
 * mà con số mới là thứ người dùng vào đây để đọc.
 *
 * Chuẩn mới: một tông xám cho mọi tiêu đề. Ranh giới giữa các nhóm cột thể hiện bằng VIỀN 2px
 * (xem `.grp-edge` ở dưới), không bằng nền màu. Màu chỉ dành cho DỮ LIỆU và cho vạch trạng thái.
 */
const HEADER_TONE_GROUP = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
/** Viền ngăn CỘT (mảnh) và ngăn NHÓM cột (dày 2px) — thay cho nền màu đã bỏ.
 *  Chuẩn: viền dày chỉ dùng đúng 2 chỗ — mép phải cột ghim, và đầu mỗi nhóm cột. */
const colEdge = (title: string, starts: Set<string>) =>
    starts.has(title)
        ? 'border-r border-r-slate-100 dark:border-r-slate-700/50 border-l-2 border-l-slate-300 dark:border-l-slate-600'
        : 'border-r border-r-slate-100 dark:border-r-slate-700/50';

const HEADER_TONE_COL   = 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b-slate-200 dark:border-b-slate-700';

interface CompetitionSummaryViewProps {
    employees: Employee[];
    selectedTitles: string[];
    onUpdateTitles: (titles: string[]) => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    supermarketName: string;
    tableName: string;
    /** Bảng cố định tự động hiển thị tất cả cột (tab "Tổng") — ẩn nút lọc/đổi tên/xoá,
     * chỉ dùng chung component với các bảng "Tuỳ chỉnh" do người dùng tự quản lý. */
    readOnly?: boolean;
}

export interface CompetitionSummaryViewHandle {
    handleExportPNG: (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null) => Promise<'download' | 'share' | 'cancel' | null>;
}

const CompetitionSummaryView = forwardRef<CompetitionSummaryViewHandle, CompetitionSummaryViewProps>(({
    employees,
    selectedTitles,
    onUpdateTitles,
    onDelete,
    onRename,
    allCompetitionsByCriterion,
    employeeDataMap,
    employeeCompetitionTargets,
    supermarketName,
    tableName,
    readOnly = false
}, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(tableName);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [draggedTitle, setDraggedTitle] = useState<string | null>(null);

    // States for sorting - mặc định luôn sắp xếp TĂNG DẦN theo cột BOT
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dat', direction: 'desc' });
    const [showPercent, setShowPercent] = useState(false);

    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    const avgFormatter = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

    useEffect(() => {
        setTempName(tableName);
    }, [tableName]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allHeaders = useMemo(() => {
        return (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[])
            .flatMap(c => c.headers);
    }, [allCompetitionsByCriterion]);

    const rawVisibleHeaders = useMemo(() => {
        const headerMap = new Map(allHeaders.map(h => [h.title, h]));
        return selectedTitles
            .map(title => headerMap.get(title))
            .filter((h): h is CompetitionHeader => !!h);
    }, [allHeaders, selectedTitles]);

    // Nhóm tiêu chí đã khai báo ở "Sửa cấu hình nhóm thi đua" (SupermarketConfig.tsx) — đọc
    // chung 1 nguồn IndexedDB (key theo originalTitle, giống cách SupermarketConfig tra cứu)
    // để hiển thị dòng tiêu đề nhóm gộp cột cùng nhóm phía trên dòng tên cột.
    const [groupOverrides] = useIndexedDBState<Record<string, string>>('competition-group-overrides', {});

    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
    const [exportGroupFilter, setExportGroupFilter] = useState<string | null>(null);
    const [isExportingByGroup, setIsExportingByGroup] = useState(false);
    const [exportGroupProgress, setExportGroupProgress] = useState({ current: 0, total: 0 });

    const activeGroupFilter = exportGroupFilter ?? (selectedGroupFilter !== 'all' ? selectedGroupFilter : null);

    const allAvailableGroups = useMemo(() => {
        const set = new Set<string>();
        rawVisibleHeaders.forEach(header => {
            const defaultGroup = getDefaultGroupLabel(header.metric);
            const group = groupOverrides[header.originalTitle] || defaultGroup;
            if (group) set.add(group);
        });
        return Array.from(set);
    }, [rawVisibleHeaders, groupOverrides]);

    useEffect(() => {
        if (selectedGroupFilter !== 'all' && !allAvailableGroups.includes(selectedGroupFilter)) {
            setSelectedGroupFilter('all');
        }
    }, [allAvailableGroups, selectedGroupFilter]);

    const visibleHeaders = useMemo(() => {
        if (!activeGroupFilter) return rawVisibleHeaders;
        return rawVisibleHeaders.filter(header => {
            const defaultGroup = getDefaultGroupLabel(header.metric);
            const group = groupOverrides[header.originalTitle] || defaultGroup;
            return group === activeGroupFilter;
        });
    }, [rawVisibleHeaders, activeGroupFilter, groupOverrides]);

    // Sắp lại cột để các cột CÙNG nhóm tiêu chí luôn đứng liền nhau (không rời rạc), rồi mới
    // gộp thành các ô colSpan cho dòng tiêu đề nhóm. Thứ tự nhóm lấy theo lần xuất hiện đầu
    // tiên trong visibleHeaders (tức là vẫn tôn trọng thứ tự kéo-thả của người dùng ở cấp
    // nhóm), thứ tự các cột bên trong 1 nhóm giữ nguyên tương đối (sort ổn định).
    // Gom cột liền kề cùng nhóm tiêu chí thành 1 ô tiêu đề `colSpan`. (Trước 2026-09-11 mỗi nhóm
    // còn được gán 1 MÀU riêng — đã bỏ, nay phân nhóm bằng viền, xem HEADER_TONE_GROUP.)
    // cột con dùng lại đúng màu của nhóm cha (sắc độ nhạt hơn, xem HEADER_COLUMN_THEMES vs
    // HEADER_GROUP_THEMES) để người dùng nhận biết ngay cột nào thuộc nhóm nào.
    const { groupedVisibleHeaders, headerGroupRuns, groupStartTitles } = useMemo(() => {
        const withGroups = visibleHeaders.map(header => {
            const defaultGroup = getDefaultGroupLabel(header.metric);
            const group = groupOverrides[header.originalTitle] || defaultGroup;
            return { header, group };
        });
        const groupOrder: string[] = [];
        withGroups.forEach(({ group }) => {
            if (!groupOrder.includes(group)) groupOrder.push(group);
        });
        const sorted = [...withGroups].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));

        const runs: { group: string; span: number }[] = [];
        sorted.forEach(({ group }) => {
            const last = runs[runs.length - 1];
            if (last && last.group === group) {
                last.span += 1;
            } else {
                runs.push({ group, span: 1 });
            }
        });

        // Cột MỞ ĐẦU mỗi nhóm — nơi vẽ viền dày 2px ngăn nhóm. Bỏ nhóm đầu tiên vì mép trái
        // của nó đã có viền của cột ghim "Nhân viên".
        const groupStartTitles = new Set<string>();
        let cursor = 0;
        runs.forEach((run, i) => {
            if (i > 0) groupStartTitles.add(sorted[cursor].header.title);
            cursor += run.span;
        });

        return { groupedVisibleHeaders: sorted.map(x => x.header), headerGroupRuns: runs, groupStartTitles };
    }, [visibleHeaders, groupOverrides]);

    // Map header title to originalTitle for target lookup
    const headerOriginalTitleMap = useMemo(() => {
        return new Map(allHeaders.map(h => [h.title, h.originalTitle]));
    }, [allHeaders]);

    // Helper tra cứu Target cho nhân viên an toàn & linh hoạt (chuẩn hoá tên, id, casing)
    const getTargetForEmployee = useCallback(
        (origTitle?: string, empOrigName?: string): number =>
            resolveEmployeeTarget(employeeCompetitionTargets, origTitle, empOrigName),
        [employeeCompetitionTargets]
    );

    // Compute column averages across all employees
    const columnAverages = useMemo(
        () => computeColumnAverages(visibleHeaders, employees, employeeDataMap, getTargetForEmployee),
        [visibleHeaders, employees, employeeDataMap, getTargetForEmployee]
    );

    const columnRankings = useMemo(
        () => computeColumnRankings(visibleHeaders, employees, employeeDataMap, getTargetForEmployee, showPercent),
        [visibleHeaders, employees, employeeDataMap, getTargetForEmployee, showPercent]
    );

    // "Tổng BOT" (số hạng mục dưới trung bình cột) và "NoSale" (số hạng mục actual=0) cho mỗi nhân
    // viên — tính 1 lần thành Map thay vì gọi lại hàm quét toàn bộ visibleHeaders ở ~5 nơi render
    // khác nhau mỗi lần re-render (sort cột, filter, đổi tên bảng...).
    const employeeTongBotMap = useMemo(
        () => computeTongBotMap(visibleHeaders, employees, employeeDataMap, getTargetForEmployee, columnAverages, showPercent),
        [employees, visibleHeaders, columnAverages, employeeDataMap, getTargetForEmployee, showPercent]
    );
    const getEmployeeTongBot = (empName: string, _empOriginalName: string) => employeeTongBotMap.get(empName) ?? 0;

    const employeeNoSaleMap = useMemo(
        () => computeNoSaleMap(visibleHeaders, employees, employeeDataMap),
        [employees, visibleHeaders, employeeDataMap]
    );
    const getEmployeeNoSale = (empName: string) => employeeNoSaleMap.get(empName) ?? 0;

    // Tổng số nhóm thi đua đang hiển thị — mẫu số cho cột "Đạt"/"%Đạt".
    const totalHeaderCount = visibleHeaders.length;

    // "Đạt" — số nhóm có % hoàn thành target >= 100% (theo %DKHT qua run rate hoặc thực tế >= target) cho mỗi nhân viên.
    const employeeDatMap = useMemo(() => {
        // Vẫn đọc đồng hồ TRONG memo như bản cũ để giữ nguyên hành vi.
        const { daysPassed, daysInMonth } = getMonthProgress();
        return computeDatMap(visibleHeaders, employees, employeeDataMap, getTargetForEmployee, daysPassed, daysInMonth);
    }, [employees, visibleHeaders, employeeDataMap, getTargetForEmployee]);
    const getEmployeeDat = (empName: string) => employeeDatMap.get(empName) ?? 0;

    // %Đạt trung bình của cả siêu thị (tổng số nhóm đạt / tổng số ô có thể đạt) — dùng làm
    // ngưỡng tô đỏ cho các nhân viên có tỉ lệ đạt thấp hơn mặt bằng chung.
    const storeDatPercent = useMemo(
        () => computeStoreDatPercent(employees, totalHeaderCount, employeeDatMap),
        [employees, totalHeaderCount, employeeDatMap]
    );

    // "Đạt" của dòng TỔNG — số NHÓM THI ĐUA mà số liệu tổng hợp cả siêu thị (tổng actual/tổng
    // target của TẤT CẢ nhân viên cộng lại cho từng nhóm) đạt >=100% (theo DKHT run rate hoặc thực tế), trên tổng số nhóm.
    const storeColumnDatCount = useMemo(() => {
        const { daysPassed, daysInMonth } = getMonthProgress();
        return computeStoreColumnDatCount(visibleHeaders, employees, employeeDataMap, getTargetForEmployee, daysPassed, daysInMonth);
    }, [visibleHeaders, employees, employeeDataMap, getTargetForEmployee]);

    // Calculate the threshold for TOP 30% of TỔNG BOT (excluding 0 values)
    const tongBotRedCutoff = useMemo(
        () => computeTongBotRedCutoff(employees, employeeTongBotMap),
        [employees, employeeTongBotMap]
    );

    // Sort employees list based on current sortConfig - Luôn mặc định quay về %Đạt desc
    const sortedEmployees = useMemo(() => {
        const { key, direction } = sortConfig || { key: 'dat', direction: 'desc' };
        const sorted = [...employees];
        sorted.sort((a, b) => {
            if (key === 'employee') {
                const cmp = a.name.localeCompare(b.name, 'vi');
                return direction === 'asc' ? cmp : -cmp;
            } else if (key === 'tongBot') {
                const botA = getEmployeeTongBot(a.name, a.originalName);
                const botB = getEmployeeTongBot(b.name, b.originalName);
                if (botA !== botB) {
                    return direction === 'asc' ? botA - botB : botB - botA;
                }
                return a.name.localeCompare(b.name, 'vi');
            } else if (key === 'noSale') {
                const valA = getEmployeeNoSale(a.name);
                const valB = getEmployeeNoSale(b.name);
                if (valA !== valB) {
                    return direction === 'asc' ? valA - valB : valB - valA;
                }
                return a.name.localeCompare(b.name, 'vi');
            } else if (key === 'dat') {
                const valA = getEmployeeDat(a.name);
                const valB = getEmployeeDat(b.name);
                if (valA !== valB) {
                    return direction === 'asc' ? valA - valB : valB - valA;
                }
                return a.name.localeCompare(b.name, 'vi');
            } else {
                const getVal = (emp: Employee) => {
                    const actual = employeeDataMap.get(emp.name)?.values[key] ?? 0;
                    if (showPercent) {
                        const origTitle = headerOriginalTitleMap.get(key) || '';
                        const target = getTargetForEmployee(origTitle, emp.originalName);
                        return target > 0 ? (actual / target) * 100 : 0;
                    }
                    return actual;
                };
                const valA = getVal(a);
                const valB = getVal(b);
                if (valA !== valB) {
                    return direction === 'asc' ? valA - valB : valB - valA;
                }
                return a.name.localeCompare(b.name, 'vi');
            }
        });
        return sorted;
    }, [employees, sortConfig, employeeDataMap, getTargetForEmployee, showPercent, headerOriginalTitleMap, columnAverages]);

    // Handle sort toggling - Luôn fallback về %Đạt desc (mặc định mới thay cho BOT asc)
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (!current || current.key !== key) {
                if (key === 'dat') return { key: 'dat', direction: 'desc' };
                if (key === 'employee') return { key: 'employee', direction: 'asc' };
                return { key, direction: 'desc' };
            }
            if (key === 'dat') {
                return { key: 'dat', direction: current.direction === 'desc' ? 'asc' : 'desc' };
            }
            if (key === 'employee') {
                if (current.direction === 'asc') return { key: 'employee', direction: 'desc' };
                return { key: 'dat', direction: 'desc' };
            }
            if (current.direction === 'desc') {
                return { key, direction: 'asc' };
            }
            return { key: 'dat', direction: 'desc' };
        });
    };

    // Render sort arrow indicators
    const getSortIndicator = (key: string) => {
        if (sortConfig?.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    // Calculate conditional cell coloring: Red (< avg), Green (TOP 1-3), Yellow (TOP 4-6)
    const getCellStyle = (actual: number, ht: number, headerTitle: string, empName: string) => {
        const value = showPercent ? ht : actual;
        const avg = showPercent ? (columnAverages[headerTitle]?.percent ?? 0) : (columnAverages[headerTitle]?.actual ?? 0);
        
        if (value <= 0) {
            if (avg > 0) {
                return 'text-rose-700 dark:text-rose-400 font-bold';
            }
            return 'text-slate-300 dark:text-slate-600';
        }

        const rank = columnRankings[headerTitle]?.get(empName) ?? 999;
        if (rank <= 3) {
            return 'text-emerald-700 dark:text-emerald-400 font-extrabold';
        }
        if (rank <= 6) {
            return 'text-amber-500 dark:text-amber-405 font-bold';
        }
        
        if (value < avg) {
            return 'text-rose-700 dark:text-rose-400 font-bold';
        }
        
        return 'text-slate-700 dark:text-slate-300 font-medium';
    };

    useImperativeHandle(ref, () => ({
        handleExportPNG
    }));

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        try {
            const currentGroup = activeGroupFilter ? ` - ${activeGroupFilter.replace(/[\\/:*?"<>|]/g, '')}` : '';
            const nameToUse = customFilename || `Thi Đua - ${(tableName || 'Báo Cáo').replace(/[\\/:*?"<>|]/g, '')}${currentGroup} - ${supermarketName}.png`;
            const filename = customFilename ? (customFilename.endsWith('.png') ? customFilename : `${customFilename}.png`) : nameToUse;
            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component'], isCompactTable: true
            });
            if (blob) {
                if (autoAction === 'download') {
                    downloadBlob(blob, filename);
                    return 'download';
                } else if (autoAction === 'share') {
                    await shareBlob(blob, filename);
                    return 'share';
                } else {
                    return await showExportOptions(blob, filename);
                }
            }
            return null;
        } catch (err) {
            console.error('Failed to export image', err);
            return null;
        }
    };

    const handleBatchExportByGroup = async () => {
        if (allAvailableGroups.length === 0) {
            toast.error('Không có nhóm tiêu chí nào để xuất ảnh.');
            return;
        }
        setIsExportingByGroup(true);
        setExportGroupProgress({ current: 0, total: allAvailableGroups.length });
        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        for (let i = 0; i < allAvailableGroups.length; i++) {
            const group = allAvailableGroups[i];
            setExportGroupFilter(group);
            setExportGroupProgress({ current: i + 1, total: allAvailableGroups.length });
            await new Promise(r => setTimeout(r, 450));
            const safeGroupName = group.replace(/[\\/:*?"<>|]/g, '');
            const nameToUse = tableName || 'Thi Đua';
            const filename = `Thi Đua - ${nameToUse.replace(/[\\/:*?"<>|]/g, '')} - ${safeGroupName} - ${supermarketName}.png`;
            const action = await handleExportPNG(filename, autoAction);
            if (action === 'cancel') break;
            autoAction = action;
        }
        setExportGroupFilter(null);
        setIsExportingByGroup(false);
    };

    // Xuất ảnh RÚT GỌN: chỉ giữ cột Nhân viên + 2 nhóm cố định "%HT 100%" (Đạt/%Đạt) và
    // "HIỆU QUẢ" (BOT/NoSale) — ẩn hết các cột ngành hàng động (groupedVisibleHeaders). Dùng lại
    // đúng cơ chế elementsToHide của exportElementAsImage (thao tác trên bản CLONE, không đụng gì
    // tới bảng đang hiển thị) nên không cần đổi selectedTitles hay bất kỳ state nào của bảng gốc.
    const handleExportSummaryPNG = async (): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        try {
            const nameToUse = tableName || 'Báo Cáo';
            const filename = `Thi Đua - Tóm Tắt - ${nameToUse.replace(/[\\/:*?"<>|]/g, '')} - ${supermarketName}.png`;
            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only',
                elementsToHide: ['.no-print', '.export-button-component', '.competition-dynamic-col'],
                isCompactTable: true
            });
            if (blob) {
                return await showExportOptions(blob, filename);
            }
            return null;
        } catch (err) {
            console.error('Failed to export summary image', err);
            return null;
        }
    };

    const handleToggleTitle = (title: string) => {
        const next = selectedTitles.includes(title) 
            ? selectedTitles.filter(t => t !== title)
            : [...selectedTitles, title];
        onUpdateTitles(next);
    };

    const handleDragStart = (e: React.DragEvent, title: string) => {
        setDraggedTitle(title);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Kéo-thả xác định theo tên cột (không theo index) vì thứ tự hiển thị đã được sắp lại
    // theo nhóm tiêu chí (groupedVisibleHeaders), khác với thứ tự lưu trong selectedTitles.
    const handleDrop = (e: React.DragEvent, targetTitle: string) => {
        e.preventDefault();
        if (draggedTitle === null || draggedTitle === targetTitle) return;

        const updatedTitles = [...selectedTitles];
        const fromIndex = updatedTitles.indexOf(draggedTitle);
        const targetIndex = updatedTitles.indexOf(targetTitle);
        if (fromIndex === -1 || targetIndex === -1) return;
        const [draggedItem] = updatedTitles.splice(fromIndex, 1);
        updatedTitles.splice(targetIndex, 0, draggedItem);

        onUpdateTitles(updatedTitles);
        setDraggedTitle(null);
    };

    const confirmDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1 w-full relative z-30">
            {isEditingName ? (
                <div className="flex items-center gap-2 no-print">
                    <Input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-48"
                        fullWidth={false}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && (onRename(tempName), setIsEditingName(false))}
                    />
                    <Button type="button" variant="unstyled" size="none" onClick={() => { onRename(tempName); setIsEditingName(false); }} className="p-0 text-emerald-700">
                        <CheckCircleIcon className="h-6 w-6" />
                    </Button>
                    <Button type="button" variant="unstyled" size="none" onClick={() => { setTempName(tableName); setIsEditingName(false); }} className="p-0 text-slate-400">
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
            ) : (
                <span className="js-report-title">
                    {tableName}{activeGroupFilter ? ` - ${activeGroupFilter}` : ''} - ĐẾN {getYesterdayDateString()}
                </span>
            )}
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold no-print">Dữ liệu thi đua được tổng hợp theo thời gian thực từ BI.</span>
        </div>
    );

    const headerActions = (
        <div className="flex items-center gap-2 relative z-30">
            {!readOnly && (
                <div className="relative" ref={filterRef}>
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title="Chọn cột hiển thị"
                    >
                        <FilterIcon className="h-5 w-5" />
                        {selectedTitles.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-sky-600 text-white font-black text-[11px] rounded-full w-4 h-4 flex items-center justify-center">
                                {selectedTitles.length}
                            </span>
                        )}
                    </Button>
                    {isFilterOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
                            <div className="px-2 py-[5px] border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                                <Input
                                    type="text"
                                    value={filterSearch}
                                    onChange={(e) => setFilterSearch(e.target.value)}
                                    placeholder="Tìm tiêu chí..."
                                    leftIcon="search"
                                    className="text-xs"
                                    autoFocus
                                />
                            </div>
                            {allHeaders
                                .filter(h => h.originalTitle.toLowerCase().includes(filterSearch.toLowerCase()))
                                .map(header => {
                                    const isSelected = selectedTitles.includes(header.title);
                                    return (
                                        <label key={header.title} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                                            <Switch
                                                checked={isSelected}
                                                onChange={() => handleToggleTitle(header.title)}
                                            />
                                            <span className="truncate uppercase">{shortenName(header.originalTitle, nameOverrides)}</span>
                                        </label>
                                    );
                                })}
                        </div>
                    )}
                </div>
            )}

            {!readOnly && (
                <Button
                    type="button"
                    variant="unstyled" size="none"
                    onClick={() => setIsEditingName(true)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Đổi tên bảng"
                >
                    <PencilIcon className="h-5 w-5" />
                </Button>
            )}

            {!readOnly && (
                <Button
                    type="button"
                    variant="unstyled" size="none"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                    title="Xóa bảng"
                >
                    <TrashIcon className="h-5 w-5" />
                </Button>
            )}

            {/* Bộ lọc nhóm tiêu chí */}
            {allAvailableGroups.length > 0 && (
                <div className="relative flex items-center no-print">
                    <select
                        value={selectedGroupFilter}
                        onChange={(e) => setSelectedGroupFilter(e.target.value)}
                        className="text-[11px] font-bold h-7.5 pl-2.5 pr-6 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer appearance-none shadow-sm hover:border-sky-300 dark:hover:border-sky-600 transition-colors"
                        title="Lọc theo nhóm tiêu chí"
                    >
                        <option value="all">Tất cả nhóm ({rawVisibleHeaders.length})</option>
                        {allAvailableGroups.map((group) => {
                            const count = rawVisibleHeaders.filter(h => {
                                const defaultGroup = getDefaultGroupLabel(h.metric);
                                return (groupOverrides[h.originalTitle] || defaultGroup) === group;
                            }).length;
                            return (
                                <option key={group} value={group}>
                                    {group} ({count})
                                </option>
                            );
                        })}
                    </select>
                    <ChevronDownIcon className="h-3.5 w-3.5 absolute right-1.5 text-slate-400 pointer-events-none" />
                </div>
            )}

            {/* Xuất ảnh theo từng nhóm tiêu chí */}
            {allAvailableGroups.length > 1 && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBatchExportByGroup}
                    disabled={isExportingByGroup}
                    title={isExportingByGroup ? `Đang xuất ${exportGroupProgress.current}/${exportGroupProgress.total}` : 'Xuất ảnh theo tiêu chí (tự động xuất từng nhóm)'}
                    className="text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 transition-colors no-print"
                >
                    {isExportingByGroup ? (
                        <SpinnerIcon className="h-4 w-4 animate-spin text-sky-700" />
                    ) : (
                        <DownloadAllIcon className="h-4 w-4" />
                    )}
                </Button>
            )}

            <div className="h-5 w-px bg-slate-200 dark:border-slate-700 mx-1" />

            <Button
                variant="unstyled" size="none"
                onClick={() => setShowPercent(!showPercent)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${showPercent ? 'text-sky-700 dark:text-sky-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350'}`}
                title={showPercent ? "Hiển thị giá trị thực tế" : "Hiển thị phần trăm hoàn thành"}
            >
                {showPercent ? <HashIcon className="h-5 w-5" /> : <PercentIcon className="h-5 w-5" />}
            </Button>

            <ExportButton
                onExportPNG={async () => { await handleExportSummaryPNG(); }}
                icon={<Columns3 className="h-5 w-5" />}
                title="Xuất ảnh rút gọn (chỉ Nhân viên, %HT 100%, Hiệu quả)"
                ariaLabel="Xuất ảnh rút gọn"
            />

            <ExportButton onExportPNG={async () => { await handleExportPNG(); }} />
        </div>
    );

    return (
        <div ref={cardRef} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card noPadding bordered={false} title={cardTitle} actionButton={headerActions} icon="trophy">
                {selectedTitles.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-900/30">
                        {readOnly ? (
                            'Không có dữ liệu thi đua để hiển thị.'
                        ) : (
                            <>Bấm biểu tượng lọc <FilterIcon className="inline h-4 w-4" /> để chọn các cột dữ liệu hiển thị cho bảng này.</>
                        )}
                    </div>
                ) : (
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div
                            /* `sticky` của <thead> tính theo VÙNG CUỘN gần nhất, mà container này đã
                               là vùng cuộn (overflow-x:auto ⇒ trình duyệt tự đặt overflow-y:auto).
                               Không giới hạn chiều cao thì nó không cuộn dọc ⇒ thead KHÔNG BAO GIỜ
                               dính. Cho max-height để đây thành vùng cuộn dọc thật. */
                            className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-13rem)] border border-slate-200 dark:border-slate-700"
                            style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                            <table className="min-w-max w-full table-auto border-collapse">
                                <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900">
                                    <tr className="text-[11px] font-black uppercase tracking-wider">
                                        <th
                                            rowSpan={2}
                                            onClick={() => handleSort('employee')}
                                            className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 px-2 py-[5px] text-center border-b-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 min-w-[120px] align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Nhân viên</span>
                                                <span className="text-sky-700 dark:text-sky-400 font-bold">{getSortIndicator('employee')}</span>
                                            </div>
                                        </th>
                                        <th
                                            colSpan={2}
                                            className={`px-1 py-1 text-center border-b border-l-2 border-l-slate-300 dark:border-l-slate-600 ${HEADER_TONE_GROUP} text-[11px] font-black tracking-wide whitespace-normal break-words leading-tight`}
                                            title="%HT 100%"
                                        >
                                            %HT 100%
                                        </th>
                                        <th
                                            colSpan={2}
                                            className={`px-1 py-1 text-center border-b border-l-2 border-l-slate-300 dark:border-l-slate-600 ${HEADER_TONE_GROUP} text-[11px] font-black tracking-wide whitespace-normal break-words leading-tight`}
                                            title="Hiệu quả"
                                        >
                                            HIỆU QUẢ
                                        </th>
                                        {headerGroupRuns.map((run, runIndex) => (
                                            <th
                                                key={`group-${runIndex}-${run.group}`}
                                                colSpan={run.span}
                                                className={`competition-dynamic-col px-1 py-1 text-center border-b border-l-2 border-l-slate-300 dark:border-l-slate-600 ${HEADER_TONE_GROUP} text-[11px] font-black tracking-wide whitespace-normal break-words leading-tight`}
                                                title={run.group}
                                            >
                                                {run.group}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="text-[11px] font-black uppercase tracking-wider">
                                        <th
                                            onClick={() => handleSort('dat')}
                                            className="px-1 py-1.5 text-center border-slate-200 dark:border-slate-700 border-r border-r-slate-100 dark:border-r-slate-700/50 border-b border-b-slate-200 dark:border-b-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 w-[56px] min-w-[52px] max-w-[64px] leading-tight align-middle cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Đạt</span>
                                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ml-0.5">{getSortIndicator('dat')}</span>
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('dat')}
                                            className="px-1 py-1.5 text-center border-slate-200 dark:border-slate-700 border-r border-r-slate-100 dark:border-r-slate-700/50 border-b border-b-slate-200 dark:border-b-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 w-[52px] min-w-[48px] max-w-[60px] leading-tight align-middle cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>%Đạt</span>
                                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ml-0.5">{getSortIndicator('dat')}</span>
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('tongBot')}
                                            className="px-1 py-1.5 text-center border-slate-200 dark:border-slate-700 border-r border-r-slate-100 dark:border-r-slate-700/50 border-b border-b-slate-200 dark:border-b-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 w-[48px] min-w-[44px] max-w-[56px] leading-tight align-middle cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>BOT</span>
                                                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 ml-0.5">{getSortIndicator('tongBot')}</span>
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('noSale')}
                                            className="px-1 py-1.5 text-center border-slate-200 dark:border-slate-700 border-r border-r-slate-100 dark:border-r-slate-700/50 border-b border-b-slate-200 dark:border-b-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 w-[52px] min-w-[48px] max-w-[60px] leading-tight align-middle cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>NoSale</span>
                                                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 ml-0.5">{getSortIndicator('noSale')}</span>
                                            </div>
                                        </th>
                                        {(() => {
                                            return groupedVisibleHeaders.map((header) => {
                                                const isDragging = draggedTitle === header.title;
                                                return (
                                                    <th
                                                        key={header.title}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, header.title)}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, header.title)}
                                                        onDragEnd={() => setDraggedTitle(null)}
                                                        onClick={() => handleSort(header.title)}
                                                        className={`competition-dynamic-col ${colEdge(header.title, groupStartTitles)} px-1 py-1.5 text-center border-slate-200 dark:border-slate-700 border-b-[3px] ${HEADER_TONE_COL} w-[52px] min-w-[48px] max-w-[64px] leading-tight align-middle cursor-pointer transition-all select-none ${isDragging ? 'opacity-30 scale-95 border-dashed border-sky-500' : ''}`}
                                                        title="Kéo thả để sắp xếp cột — Click để sắp xếp dòng"
                                                    >
                                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal no-print leading-none">⋮⋮</span>
                                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-none">{getSortIndicator(header.title)}</span>
                                                            </div>
                                                            <span className="whitespace-normal break-words leading-tight uppercase">{shortenName(header.originalTitle, nameOverrides)}</span>
                                                        </div>
                                                    </th>
                                                );
                                            });
                                        })()}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {sortedEmployees.map((emp, idx) => {
                                        const isEven = idx % 2 === 0;
                                        // Bỏ sọc ngựa vằn: mật độ 26px + kẻ mảnh đã đủ tách dòng, mà sọc thì làm nền
                                        // nhấp nhô khiến vạch trạng thái mép trái khó đọc thành khối.
                                        const zebraClass = 'bg-white dark:bg-slate-900';
                                        const tongBot = getEmployeeTongBot(emp.name, emp.originalName);

                                        // Vạch trạng thái mép trái. Ngưỡng lấy theo MẶT BẰNG CHUNG của siêu thị
                                        // (`storeDatPercent`), không phải mốc cứng — cùng một %Đạt có thể là giỏi ở
                                        // siêu thị này mà đuối ở siêu thị khác.
                                        const datPct = totalHeaderCount > 0 ? (getEmployeeDat(emp.name) / totalHeaderCount) * 100 : 0;
                                        const stripeClass = datPct >= storeDatPercent
                                            ? 'border-l-emerald-600'
                                            : datPct >= storeDatPercent * 0.7 ? 'border-l-amber-600' : 'border-l-rose-600';

                                        return (
                                            <tr key={emp.originalName} className={`border-l-[3px] ${stripeClass} ${zebraClass} hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700`}>
                                                <td 
                                                    className={`sticky left-0 z-10 ${zebraClass} px-2 py-[3px] font-bold border-slate-100 dark:border-slate-700/50 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-[13px] text-left leading-tight min-w-[120px]`}
                                                    /* Tên NV là NHÃN, không phải dữ liệu — dùng mực đậm, nhường màu cho con số. */
                                                    style={{ color: 'var(--color-slate-800)' }}
                                                >
                                                    {emp.name}
                                                </td>
                                                {(() => {
                                                    const dat = getEmployeeDat(emp.name);
                                                    const datPercent = totalHeaderCount > 0 ? (dat / totalHeaderCount) * 100 : 0;
                                                    const isBelowStore = datPercent < storeDatPercent;
                                                    const datColorClass = isBelowStore
                                                        ? 'text-rose-700 dark:text-rose-400 font-extrabold '
                                                        : 'text-emerald-700 dark:text-emerald-400 font-bold ';
                                                    return (
                                                        <td className={`px-1 py-1 border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-r-slate-100 dark:border-r-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${datColorClass}`}>
                                                            {dat}/{totalHeaderCount}
                                                        </td>
                                                    );
                                                })()}
                                                {(() => {
                                                    const dat = getEmployeeDat(emp.name);
                                                    const datPercent = totalHeaderCount > 0 ? (dat / totalHeaderCount) * 100 : 0;
                                                    const isBelowStore = datPercent < storeDatPercent;
                                                    const datPercentColorClass = isBelowStore
                                                        ? 'text-rose-700 dark:text-rose-400 font-extrabold '
                                                        : 'text-emerald-700 dark:text-emerald-400 font-extrabold ';
                                                    return (
                                                        <td className={`px-1 py-1 border-r border-r-slate-100 dark:border-r-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${datPercentColorClass}`}>
                                                            {datPercent > 0 ? `${roundUp(datPercent)}%` : '0%'}
                                                        </td>
                                                    );
                                                })()}
                                                {(() => {
                                                    const isRed = tongBot > 0 && tongBotRedCutoff > 0 && tongBot >= tongBotRedCutoff;
                                                    const tongBotColorClass = isRed
                                                        ? 'text-rose-700 dark:text-rose-400 font-extrabold '
                                                        : 'text-rose-700 dark:text-rose-300 font-bold bg-rose-50/20 dark:bg-rose-950/10';
                                                    return (
                                                        <td className={`px-1 py-1 border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-r-slate-100 dark:border-r-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${tongBotColorClass}`}>
                                                            {tongBot > 0 ? tongBot : '-'}
                                                        </td>
                                                    );
                                                })()}
                                                {(() => {
                                                    const noSale = getEmployeeNoSale(emp.name);
                                                    const isNoSaleRed = noSale > 0;
                                                    const noSaleColorClass = isNoSaleRed
                                                        ? 'text-rose-700 dark:text-rose-400 font-extrabold '
                                                        : 'text-rose-700 dark:text-rose-300 font-bold bg-rose-50/20 dark:bg-rose-950/10';
                                                    return (
                                                        <td className={`px-1 py-1 border-r border-r-slate-100 dark:border-r-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${noSaleColorClass}`}>
                                                            {noSale > 0 ? noSale : '-'}
                                                        </td>
                                                    );
                                                })()}
                                                {groupedVisibleHeaders.map(header => {
                                                    const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                                    const target = getTargetForEmployee(header.originalTitle, emp.originalName);
                                                    const ht = target > 0 ? (actual / target) * 100 : 0;
                                                    const cellColorClass = getCellStyle(actual, ht, header.title, emp.name);
                                                    return (
                                                        <td key={header.title} className={`competition-dynamic-col ${colEdge(header.title, groupStartTitles)} px-1 py-1 border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums`}>
                                                            {showPercent ? (
                                                                actual > 0 && target > 0 ? (
                                                                    <span className={cellColorClass}>{roundUp(ht)}%</span>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )
                                                            ) : (
                                                                <span className={cellColorClass}>{actual > 0 ? formatter.format(roundUp(actual)) : '-'}</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                    {/* TRUNG BÌNH row */}
                                    <tr className="bg-amber-50 dark:bg-amber-950/20 font-bold text-amber-800 dark:text-amber-300 border-t-2 border-slate-300 dark:border-slate-600">
                                        <td className="sticky left-0 z-10 bg-amber-50 dark:bg-amber-950/20 px-2 py-[3px] text-left uppercase text-[13px] tracking-wider border-slate-200 dark:border-slate-700/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">
                                            TRUNG BÌNH
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-r-slate-100 dark:border-r-slate-700/50 whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                            {(() => {
                                                const totalDatSum = employees.reduce((sum, emp) => sum + getEmployeeDat(emp.name), 0);
                                                const avgDat = employees.length > 0 ? totalDatSum / employees.length : 0;
                                                return avgDat > 0 ? `${avgFormatter.format(avgDat)}/${totalHeaderCount}` : '-';
                                            })()}
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-r border-r-slate-100 dark:border-r-slate-700/50 whitespace-nowrap font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                                            {(() => {
                                                const totalDatSum = employees.reduce((sum, emp) => sum + getEmployeeDat(emp.name), 0);
                                                const totalPossible = employees.length * totalHeaderCount;
                                                const avgDatPercent = totalPossible > 0 ? (totalDatSum / totalPossible) * 100 : 0;
                                                return avgDatPercent > 0 ? `${avgDatPercent.toFixed(1)}%` : '-';
                                            })()}
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-r-slate-100 dark:border-r-slate-700/50 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                            {(() => {
                                                const totalBotSum = employees.reduce((sum, emp) => sum + getEmployeeTongBot(emp.name, emp.originalName), 0);
                                                const avgBot = employees.length > 0 ? totalBotSum / employees.length : 0;
                                                return avgBot > 0 ? avgFormatter.format(avgBot) : '-';
                                            })()}
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-r border-r-slate-100 dark:border-r-slate-700/50 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                            {(() => {
                                                const totalNoSaleSum = employees.reduce((sum, emp) => sum + getEmployeeNoSale(emp.name), 0);
                                                const avgNoSale = employees.length > 0 ? totalNoSaleSum / employees.length : 0;
                                                return avgNoSale > 0 ? avgFormatter.format(avgNoSale) : '-';
                                            })()}
                                        </td>
                                        {groupedVisibleHeaders.map(header => {
                                            const averages = columnAverages[header.title];
                                            return (
                                                <td key={header.title} className={`competition-dynamic-col ${colEdge(header.title, groupStartTitles)} px-1 py-1 text-center text-[13px] border-slate-200 dark:border-slate-700/50 whitespace-nowrap tabular-nums`}>
                                                    {showPercent ? (
                                                        averages && averages.percent > 0 ? (
                                                            <span>{averages.percent.toFixed(1)}%</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )
                                                    ) : (
                                                        <span>{averages && averages.actual > 0 ? avgFormatter.format(averages.actual) : '-'}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    {/* Grand Total — sky accent */}
                                    <tr className="bg-sky-50 dark:bg-sky-900/30 font-extrabold text-sky-800 dark:text-sky-300 border-t-2 border-sky-200 dark:border-sky-800">
                                         <td className="sticky left-0 z-10 bg-sky-50 dark:bg-sky-900/30 px-2 py-[3px] text-left uppercase text-[13px] tracking-wider border-sky-200 dark:border-sky-800/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">
                                             TỔNG
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
                                             {formatter.format(storeColumnDatCount)}/{formatter.format(totalHeaderCount)}
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
                                             {(() => {
                                                 const storeColumnDatPercent = totalHeaderCount > 0 ? (storeColumnDatCount / totalHeaderCount) * 100 : 0;
                                                 return storeColumnDatPercent > 0 ? `${storeColumnDatPercent.toFixed(1)}%` : '0%';
                                             })()}
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
                                             {(() => {
                                                 const totalBotSum = employees.reduce((sum, emp) => sum + getEmployeeTongBot(emp.name, emp.originalName), 0);
                                                 return totalBotSum > 0 ? formatter.format(totalBotSum) : '-';
                                             })()}
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
                                             {(() => {
                                                 const totalNoSaleSum = employees.reduce((sum, emp) => sum + getEmployeeNoSale(emp.name), 0);
                                                 return totalNoSaleSum > 0 ? formatter.format(totalNoSaleSum) : '-';
                                             })()}
                                         </td>
                                         {groupedVisibleHeaders.map(header => {
                                             const totalActual = employees.reduce((sum, emp) => sum + (employeeDataMap.get(emp.name)?.values[header.title] ?? 0), 0);
                                             const totalTarget = employees.reduce((sum, emp) => sum + (employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0), 0);
                                             const totalHt = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

                                             return (
                                                 <td key={header.title} className={`competition-dynamic-col ${colEdge(header.title, groupStartTitles)} px-1 py-1 text-center text-[13px] border-slate-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums`}>
                                                     {showPercent ? (
                                                         totalActual > 0 && totalTarget > 0 ? (
                                                             <span>{roundUp(totalHt).toFixed(0)}%</span>
                                                         ) : (
                                                             <span className="text-sky-300 dark:text-sky-700">-</span>
                                                         )
                                                     ) : (
                                                         <span>{totalActual > 0 ? formatter.format(roundUp(totalActual)) : '-'}</span>
                                                     )}
                                                 </td>
                                             );
                                         })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Card>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="Xóa bảng thi đua?"
                message={`Bạn có thực sự muốn xoá bảng "${tableName}" không? Thao tác này không thể hoàn tác.`}
                confirmText="Xóa bảng"
                variant="danger"
            />
        </div>
    );
});

export default CompetitionSummaryView;
