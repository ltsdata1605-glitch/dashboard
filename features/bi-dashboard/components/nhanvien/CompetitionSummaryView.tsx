
import React, { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { FilterIcon, TrashIcon, PencilIcon, XIcon, CheckCircleIcon, PercentIcon, HashIcon } from '../Icons';
import { Employee, CompetitionHeader, Criterion } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString, shortenName } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Switch } from '../dashboard/DashboardWidgets';
import { Button } from '../../../../components/shared/ui/Button';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { ConfirmDialog } from '../../../../components/shared/ui/ConfirmDialog';

// 6 họ màu semantic đã duyệt (CLAUDE.md mục 2), xoay vòng cho từng cột thi đua. Dùng class
// literal đầy đủ (không nội suy chuỗi bg-${color}-50) để Tailwind JIT chắc chắn sinh CSS ở build
// production — trước đây dùng template literal với biến, JIT không nhận diện được và còn lẫn
// violet/teal ngoài palette.
const HEADER_COLUMN_COLOR_KEYS = ['sky', 'emerald', 'amber', 'indigo', 'rose', 'slate'] as const;
// Tông nhạt — dùng cho dòng tên cột con (kế thừa màu của nhóm cha nhưng nhẹ hơn).
const HEADER_COLUMN_THEMES: Record<typeof HEADER_COLUMN_COLOR_KEYS[number], string> = {
    sky: 'border-b-sky-400 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50',
    emerald: 'border-b-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    amber: 'border-b-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50',
    indigo: 'border-b-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
    rose: 'border-b-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50',
    slate: 'border-b-slate-400 bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/50',
};
// Tông đậm/nổi bật — dùng cho dòng "Nhóm Tiêu Chí" (tiêu đề chính), cùng họ màu với cột con
// bên dưới nhưng sắc độ đậm hơn hẳn để phân biệt 2 cấp tiêu đề.
const HEADER_GROUP_THEMES: Record<typeof HEADER_COLUMN_COLOR_KEYS[number], string> = {
    sky: 'bg-sky-200 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700',
    emerald: 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    amber: 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    indigo: 'bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
    rose: 'bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700',
    slate: 'bg-slate-200 dark:bg-slate-800/70 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-600',
};

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

    const visibleHeaders = useMemo(() => {
        const headerMap = new Map(allHeaders.map(h => [h.title, h]));
        return selectedTitles
            .map(title => headerMap.get(title))
            .filter((h): h is CompetitionHeader => !!h);
    }, [allHeaders, selectedTitles]);

    // Nhóm tiêu chí đã khai báo ở "Sửa cấu hình nhóm thi đua" (SupermarketConfig.tsx) — đọc
    // chung 1 nguồn IndexedDB (key theo originalTitle, giống cách SupermarketConfig tra cứu)
    // để hiển thị dòng tiêu đề nhóm gộp cột cùng nhóm phía trên dòng tên cột.
    const [groupOverrides] = useIndexedDBState<Record<string, string>>('competition-group-overrides', {});

    // Sắp lại cột để các cột CÙNG nhóm tiêu chí luôn đứng liền nhau (không rời rạc), rồi mới
    // gộp thành các ô colSpan cho dòng tiêu đề nhóm. Thứ tự nhóm lấy theo lần xuất hiện đầu
    // tiên trong visibleHeaders (tức là vẫn tôn trọng thứ tự kéo-thả của người dùng ở cấp
    // nhóm), thứ tự các cột bên trong 1 nhóm giữ nguyên tương đối (sort ổn định).
    // Mỗi nhóm tiêu chí có đúng 1 màu riêng (colorKey gắn theo GROUP, không theo vị trí cột) —
    // cột con dùng lại đúng màu của nhóm cha (sắc độ nhạt hơn, xem HEADER_COLUMN_THEMES vs
    // HEADER_GROUP_THEMES) để người dùng nhận biết ngay cột nào thuộc nhóm nào.
    const { groupedVisibleHeaders, headerGroupRuns, columnColorKeyMap } = useMemo(() => {
        const withGroups = visibleHeaders.map(header => {
            const defaultGroup = header.metric === 'SLLK' ? 'Số lượng' : header.metric === 'DTLK' ? 'Doanh thu' : header.metric === 'DTQĐ' ? 'Doanh thu quy đổi' : header.metric;
            const group = groupOverrides[header.originalTitle] || defaultGroup;
            return { header, group };
        });
        const groupOrder: string[] = [];
        withGroups.forEach(({ group }) => {
            if (!groupOrder.includes(group)) groupOrder.push(group);
        });
        const sorted = [...withGroups].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));

        const runs: { group: string; colorKey: typeof HEADER_COLUMN_COLOR_KEYS[number]; span: number }[] = [];
        sorted.forEach(({ group }) => {
            const last = runs[runs.length - 1];
            if (last && last.group === group) {
                last.span += 1;
            } else {
                const colorKey = HEADER_COLUMN_COLOR_KEYS[runs.length % HEADER_COLUMN_COLOR_KEYS.length];
                runs.push({ group, colorKey, span: 1 });
            }
        });

        const groupColorMap = new Map<string, typeof HEADER_COLUMN_COLOR_KEYS[number]>();
        runs.forEach(run => {
            if (!groupColorMap.has(run.group)) groupColorMap.set(run.group, run.colorKey);
        });
        const columnColorKeyMap = new Map(sorted.map(({ header, group }) => [header.title, groupColorMap.get(group)!]));

        return { groupedVisibleHeaders: sorted.map(x => x.header), headerGroupRuns: runs, columnColorKeyMap };
    }, [visibleHeaders, groupOverrides]);

    // Map header title to originalTitle for target lookup
    const headerOriginalTitleMap = useMemo(() => {
        return new Map(allHeaders.map(h => [h.title, h.originalTitle]));
    }, [allHeaders]);

    // Compute column averages across all employees
    const columnAverages = useMemo(() => {
        const averages: Record<string, { actual: number; percent: number }> = {};
        visibleHeaders.forEach(header => {
            let sumActual = 0;
            let sumPercent = 0;
            employees.forEach(emp => {
                const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                const ht = target > 0 ? (actual / target) * 100 : 0;
                sumActual += actual;
                sumPercent += ht;
            });
            averages[header.title] = {
                actual: employees.length > 0 ? sumActual / employees.length : 0,
                percent: employees.length > 0 ? sumPercent / employees.length : 0
            };
        });
        return averages;
    }, [visibleHeaders, employees, employeeDataMap, employeeCompetitionTargets]);

    // Compute dense ranks for each column (descending order, excluding values <= 0)
    const columnRankings = useMemo(() => {
        const rankings: Record<string, Map<string, number>> = {};
        visibleHeaders.forEach(header => {
            const empValues = employees.map(emp => {
                const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                const ht = target > 0 ? (actual / target) * 100 : 0;
                const value = showPercent ? ht : actual;
                return { empName: emp.name, value };
            });

            // Sort descending
            empValues.sort((a, b) => b.value - a.value);

            // Assign dense ranks
            const rankMap = new Map<string, number>();
            let currentRank = 0;
            let prevValue = -1;
            empValues.forEach((item) => {
                if (item.value <= 0) {
                    rankMap.set(item.empName, 999);
                    return;
                }
                if (item.value !== prevValue) {
                    currentRank++;
                    prevValue = item.value;
                }
                rankMap.set(item.empName, currentRank);
            });
            rankings[header.title] = rankMap;
        });
        return rankings;
    }, [visibleHeaders, employees, employeeDataMap, employeeCompetitionTargets, showPercent]);

    // "Tổng BOT" (số hạng mục dưới trung bình cột) và "NoSale" (số hạng mục actual=0) cho mỗi nhân
    // viên — tính 1 lần thành Map thay vì gọi lại hàm quét toàn bộ visibleHeaders ở ~5 nơi render
    // khác nhau mỗi lần re-render (sort cột, filter, đổi tên bảng...).
    const employeeTongBotMap = useMemo(() => {
        const map = new Map<string, number>();
        employees.forEach(emp => {
            let count = 0;
            visibleHeaders.forEach(header => {
                const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                const ht = target > 0 ? (actual / target) * 100 : 0;
                const averages = columnAverages[header.title];
                if (averages) {
                    if (showPercent) {
                        if (ht < averages.percent) count++;
                    } else {
                        if (actual < averages.actual) count++;
                    }
                }
            });
            map.set(emp.name, count);
        });
        return map;
    }, [employees, visibleHeaders, columnAverages, employeeDataMap, employeeCompetitionTargets, showPercent]);
    const getEmployeeTongBot = (empName: string, _empOriginalName: string) => employeeTongBotMap.get(empName) ?? 0;

    const employeeNoSaleMap = useMemo(() => {
        const map = new Map<string, number>();
        employees.forEach(emp => {
            let count = 0;
            visibleHeaders.forEach(header => {
                const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                if (actual === 0) count++;
            });
            map.set(emp.name, count);
        });
        return map;
    }, [employees, visibleHeaders, employeeDataMap]);
    const getEmployeeNoSale = (empName: string) => employeeNoSaleMap.get(empName) ?? 0;

    // Tổng số nhóm thi đua đang hiển thị — mẫu số cho cột "Đạt"/"%Đạt".
    const totalHeaderCount = visibleHeaders.length;

    // "Đạt" — số nhóm có % hoàn thành target >= 100% cho mỗi nhân viên.
    const employeeDatMap = useMemo(() => {
        const map = new Map<string, number>();
        employees.forEach(emp => {
            let count = 0;
            visibleHeaders.forEach(header => {
                const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                const ht = target > 0 ? (actual / target) * 100 : 0;
                if (ht >= 100) count++;
            });
            map.set(emp.name, count);
        });
        return map;
    }, [employees, visibleHeaders, employeeDataMap, employeeCompetitionTargets]);
    const getEmployeeDat = (empName: string) => employeeDatMap.get(empName) ?? 0;

    // %Đạt trung bình của cả siêu thị (tổng số nhóm đạt / tổng số ô có thể đạt) — dùng làm
    // ngưỡng tô đỏ cho các nhân viên có tỉ lệ đạt thấp hơn mặt bằng chung.
    const storeDatPercent = useMemo(() => {
        const totalPossible = employees.length * totalHeaderCount;
        if (totalPossible === 0) return 0;
        let totalDatSum = 0;
        employees.forEach(emp => { totalDatSum += employeeDatMap.get(emp.name) ?? 0; });
        return (totalDatSum / totalPossible) * 100;
    }, [employees, totalHeaderCount, employeeDatMap]);

    // "Đạt" của dòng TỔNG — số NHÓM THI ĐUA mà số liệu tổng hợp cả siêu thị (tổng actual/tổng
    // target của TẤT CẢ nhân viên cộng lại cho từng nhóm) đạt >=100%, trên tổng số nhóm. KHÁC với
    // cách tính "Đạt" của từng nhân viên (đếm theo cá nhân) — đây tính theo NHÓM để khớp đúng cách
    // dòng TỔNG hiển thị số liệu tổng hợp ở các cột khác (vd cột động cũng show totalActual/
    // totalTarget của cả siêu thị, không phải cộng dồn % của từng nhân viên).
    const storeColumnDatCount = useMemo(() => {
        let count = 0;
        visibleHeaders.forEach(header => {
            const totalActual = employees.reduce((sum, emp) => sum + (employeeDataMap.get(emp.name)?.values[header.title] ?? 0), 0);
            const totalTarget = employees.reduce((sum, emp) => sum + (employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0), 0);
            const totalHt = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
            if (totalHt >= 100) count++;
        });
        return count;
    }, [visibleHeaders, employees, employeeDataMap, employeeCompetitionTargets]);

    // Calculate the threshold for TOP 30% of TỔNG BOT (excluding 0 values)
    const tongBotRedCutoff = useMemo(() => {
        const botValues = employees.map(emp => employeeTongBotMap.get(emp.name) ?? 0);
        botValues.sort((a, b) => b - a); // descending order
        const thresholdIndex = Math.max(0, Math.ceil(employees.length * 0.3) - 1);
        return botValues[thresholdIndex] ?? 0;
    }, [employees, employeeTongBotMap]);

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
                        const target = employeeCompetitionTargets.get(origTitle)?.get(emp.originalName) ?? 0;
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
    }, [employees, sortConfig, employeeDataMap, employeeCompetitionTargets, showPercent, headerOriginalTitleMap, columnAverages]);

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
                return 'text-rose-600 dark:text-rose-400 font-bold';
            }
            return 'text-slate-300 dark:text-slate-600';
        }

        const rank = columnRankings[headerTitle]?.get(empName) ?? 999;
        if (rank <= 3) {
            return 'text-emerald-600 dark:text-emerald-400 font-extrabold';
        }
        if (rank <= 6) {
            return 'text-amber-500 dark:text-amber-405 font-bold';
        }
        
        if (value < avg) {
            return 'text-rose-600 dark:text-rose-400 font-bold';
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
            const nameToUse = customFilename || tableName || 'BaoCao';
            const filename = `ThiDua_${nameToUse.replace(/[\s/]/g, '_')}_${supermarketName}.png`;
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
                    <input 
                        type="text" 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)} 
                        className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded focus:ring-1 focus:ring-sky-500 w-48 text-slate-800 dark:text-slate-100"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && (onRename(tempName), setIsEditingName(false))}
                    />
                    <Button type="button" variant="ghost" onClick={() => { onRename(tempName); setIsEditingName(false); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-emerald-600">
                        <CheckCircleIcon className="h-6 w-6" />
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { setTempName(tableName); setIsEditingName(false); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-slate-400">
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>
            ) : (
                <span className="js-report-title">{tableName} - ĐẾN {getYesterdayDateString()}</span>
            )}
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold no-print">Dữ liệu thi đua được tổng hợp theo thời gian thực từ BI.</span>
        </div>
    );

    const headerActions = (
        <div className="flex items-center gap-2 relative z-30">
            {!readOnly && (
                <div className="relative" ref={filterRef}>
                    <Button
                        variant="ghost"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title="Chọn cột hiển thị"
                    >
                        <FilterIcon className="h-5 w-5" />
                        {selectedTitles.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-sky-600 text-white font-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                                {selectedTitles.length}
                            </span>
                        )}
                    </Button>
                    {isFilterOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
                            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                                <input
                                    type="text"
                                    value={filterSearch}
                                    onChange={(e) => setFilterSearch(e.target.value)}
                                    placeholder="Tìm tiêu chí..."
                                    className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                                            <span className="truncate">{shortenName(header.originalTitle, nameOverrides)}</span>
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
                    variant="ghost"
                    onClick={() => setIsEditingName(true)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Đổi tên bảng"
                >
                    <PencilIcon className="h-5 w-5" />
                </Button>
            )}

            {!readOnly && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                    title="Xóa bảng"
                >
                    <TrashIcon className="h-5 w-5" />
                </Button>
            )}

            <div className="h-5 w-px bg-slate-200 dark:border-slate-700 mx-1" />

            <Button
                variant="ghost"
                onClick={() => setShowPercent(!showPercent)}
                className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-2 rounded-xl transition-all cursor-pointer ${showPercent ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350'}`}
                title={showPercent ? "Hiển thị giá trị thực tế" : "Hiển thị phần trăm hoàn thành"}
            >
                {showPercent ? <HashIcon className="h-5 w-5" /> : <PercentIcon className="h-5 w-5" />}
            </Button>

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
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <table className="min-w-max w-full table-auto border-collapse">
                                <thead>
                                    <tr className="text-[11px] font-black uppercase tracking-wider">
                                        <th
                                            rowSpan={2}
                                            onClick={() => handleSort('employee')}
                                            className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-center border-r border-b-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 min-w-[120px] align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Nhân viên</span>
                                                <span className="text-sky-600 dark:text-sky-400 font-bold">{getSortIndicator('employee')}</span>
                                            </div>
                                        </th>
                                        <th
                                            colSpan={2}
                                            className={`px-1 py-1 text-center border-r border-b ${HEADER_GROUP_THEMES.emerald} text-[9px] font-black tracking-wide whitespace-normal break-words leading-tight`}
                                            title="%HT 100%"
                                        >
                                            %HT 100%
                                        </th>
                                        <th
                                            colSpan={2}
                                            className={`px-1 py-1 text-center border-r border-b ${HEADER_GROUP_THEMES.rose} text-[9px] font-black tracking-wide whitespace-normal break-words leading-tight`}
                                            title="Hiệu quả"
                                        >
                                            HIỆU QUẢ
                                        </th>
                                        {headerGroupRuns.map((run, runIndex) => (
                                            <th
                                                key={`group-${runIndex}-${run.group}`}
                                                colSpan={run.span}
                                                className={`px-1 py-1 text-center border-r border-b ${HEADER_GROUP_THEMES[run.colorKey]} text-[9px] font-black tracking-wide whitespace-normal break-words leading-tight`}
                                                title={run.group}
                                            >
                                                {run.group}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="text-[11px] font-black uppercase tracking-wider">
                                        <th
                                            onClick={() => handleSort('dat')}
                                            className="px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 w-[56px] min-w-[52px] max-w-[64px] leading-tight align-middle cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>Đạt</span>
                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">{getSortIndicator('dat')}</span>
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('dat')}
                                            className="px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 w-[52px] min-w-[48px] max-w-[60px] leading-tight align-middle cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>%Đạt</span>
                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">{getSortIndicator('dat')}</span>
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('tongBot')}
                                            className="px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 w-[48px] min-w-[44px] max-w-[56px] leading-tight align-middle cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>BOT</span>
                                                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 ml-0.5">{getSortIndicator('tongBot')}</span>
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('noSale')}
                                            className="px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-rose-400 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 w-[52px] min-w-[48px] max-w-[60px] leading-tight align-middle cursor-pointer hover:bg-rose-200 dark:hover:bg-rose-900/60 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>NoSale</span>
                                                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 ml-0.5">{getSortIndicator('noSale')}</span>
                                            </div>
                                        </th>
                                        {(() => {
                                            return groupedVisibleHeaders.map((header) => {
                                                const colorKey = columnColorKeyMap.get(header.title) ?? HEADER_COLUMN_COLOR_KEYS[0];
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
                                                        className={`px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-[3px] ${HEADER_COLUMN_THEMES[colorKey]} w-[52px] min-w-[48px] max-w-[64px] leading-tight align-middle cursor-pointer transition-all select-none ${isDragging ? 'opacity-30 scale-95 border-dashed border-sky-500' : ''}`}
                                                        title="Kéo thả để sắp xếp cột — Click để sắp xếp dòng"
                                                    >
                                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal no-print leading-none">⋮⋮</span>
                                                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-none">{getSortIndicator(header.title)}</span>
                                                            </div>
                                                            <span className="whitespace-normal break-words leading-tight">{shortenName(header.originalTitle, nameOverrides)}</span>
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
                                        const zebraClass = isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-800/30';
                                        const tongBot = getEmployeeTongBot(emp.name, emp.originalName);
                                        return (
                                            <tr key={emp.originalName} className={`${zebraClass} hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700`}>
                                                <td 
                                                    className={`sticky left-0 z-10 ${zebraClass} px-2 py-1 font-bold border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-[13px] text-left leading-tight min-w-[120px]`}
                                                    style={{ color: 'var(--color-sky-600)' }}
                                                >
                                                    {emp.name}
                                                </td>
                                                {(() => {
                                                    const dat = getEmployeeDat(emp.name);
                                                    const datPercent = totalHeaderCount > 0 ? (dat / totalHeaderCount) * 100 : 0;
                                                    const isBelowStore = datPercent < storeDatPercent;
                                                    const datColorClass = isBelowStore
                                                        ? 'text-rose-600 dark:text-rose-400 font-extrabold bg-rose-50/30 dark:bg-rose-950/20'
                                                        : 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/40 dark:bg-emerald-950/10';
                                                    return (
                                                        <td className={`px-1 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${datColorClass}`}>
                                                            {dat}/{totalHeaderCount}
                                                        </td>
                                                    );
                                                })()}
                                                {(() => {
                                                    const dat = getEmployeeDat(emp.name);
                                                    const datPercent = totalHeaderCount > 0 ? (dat / totalHeaderCount) * 100 : 0;
                                                    const isBelowStore = datPercent < storeDatPercent;
                                                    const datPercentColorClass = isBelowStore
                                                        ? 'text-rose-700 dark:text-rose-300 font-extrabold bg-rose-100/40 dark:bg-rose-900/20'
                                                        : 'text-emerald-800 dark:text-emerald-300 font-extrabold bg-emerald-100/40 dark:bg-emerald-900/20';
                                                    return (
                                                        <td className={`px-1 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${datPercentColorClass}`}>
                                                            {datPercent > 0 ? `${roundUp(datPercent)}%` : '0%'}
                                                        </td>
                                                    );
                                                })()}
                                                {(() => {
                                                    const isRed = tongBot > 0 && tongBotRedCutoff > 0 && tongBot >= tongBotRedCutoff;
                                                    const tongBotColorClass = isRed
                                                        ? 'text-rose-600 dark:text-rose-455 font-extrabold bg-rose-50/20 dark:bg-rose-950/10'
                                                        : 'text-slate-800 dark:text-slate-200 font-bold bg-slate-50/50 dark:bg-slate-900/30';
                                                    return (
                                                        <td className={`px-1 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${tongBotColorClass}`}>
                                                            {tongBot > 0 ? tongBot : '-'}
                                                        </td>
                                                    );
                                                })()}
                                                {(() => {
                                                    const noSale = getEmployeeNoSale(emp.name);
                                                    return (
                                                        <td className="px-1 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/30 tabular-nums">
                                                            {noSale > 0 ? noSale : '-'}
                                                        </td>
                                                    );
                                                })()}
                                                {groupedVisibleHeaders.map(header => {
                                                    const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                                    const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                                                    const ht = target > 0 ? (actual / target) * 100 : 0;
                                                    const cellColorClass = getCellStyle(actual, ht, header.title, emp.name);
                                                    return (
                                                        <td key={header.title} className="px-1 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums">
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
                                        <td className="sticky left-0 z-10 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 text-left uppercase text-[13px] tracking-wider border-r border-slate-200 dark:border-slate-700/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">
                                            TRUNG BÌNH
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                            {(() => {
                                                const totalDatSum = employees.reduce((sum, emp) => sum + getEmployeeDat(emp.name), 0);
                                                const avgDat = employees.length > 0 ? totalDatSum / employees.length : 0;
                                                return avgDat > 0 ? `${avgFormatter.format(avgDat)}/${totalHeaderCount}` : '-';
                                            })()}
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                                            {(() => {
                                                const totalDatSum = employees.reduce((sum, emp) => sum + getEmployeeDat(emp.name), 0);
                                                const totalPossible = employees.length * totalHeaderCount;
                                                const avgDatPercent = totalPossible > 0 ? (totalDatSum / totalPossible) * 100 : 0;
                                                return avgDatPercent > 0 ? `${avgDatPercent.toFixed(1)}%` : '-';
                                            })()}
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                            {(() => {
                                                const totalBotSum = employees.reduce((sum, emp) => sum + getEmployeeTongBot(emp.name, emp.originalName), 0);
                                                const avgBot = employees.length > 0 ? totalBotSum / employees.length : 0;
                                                return avgBot > 0 ? avgFormatter.format(avgBot) : '-';
                                            })()}
                                        </td>
                                        <td className="px-1 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                            {(() => {
                                                const totalNoSaleSum = employees.reduce((sum, emp) => sum + getEmployeeNoSale(emp.name), 0);
                                                const avgNoSale = employees.length > 0 ? totalNoSaleSum / employees.length : 0;
                                                return avgNoSale > 0 ? avgFormatter.format(avgNoSale) : '-';
                                            })()}
                                        </td>
                                        {groupedVisibleHeaders.map(header => {
                                            const averages = columnAverages[header.title];
                                            return (
                                                <td key={header.title} className="px-1 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap tabular-nums">
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
                                         <td className="sticky left-0 z-10 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 text-left uppercase text-[13px] tracking-wider border-r border-sky-200 dark:border-sky-800/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">
                                             TỔNG
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-r border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
                                             {formatter.format(storeColumnDatCount)}/{formatter.format(totalHeaderCount)}
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-r border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
                                             {(() => {
                                                 const storeColumnDatPercent = totalHeaderCount > 0 ? (storeColumnDatCount / totalHeaderCount) * 100 : 0;
                                                 return storeColumnDatPercent > 0 ? `${storeColumnDatPercent.toFixed(1)}%` : '0%';
                                             })()}
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-r border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
                                             {(() => {
                                                 const totalBotSum = employees.reduce((sum, emp) => sum + getEmployeeTongBot(emp.name, emp.originalName), 0);
                                                 return totalBotSum > 0 ? formatter.format(totalBotSum) : '-';
                                             })()}
                                         </td>
                                         <td className="px-1 py-1 text-center text-[13px] border-r border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
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
                                                 <td key={header.title} className="px-1 py-1 text-center text-[13px] border-r border-sky-200 dark:border-sky-800/50 whitespace-nowrap tabular-nums">
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
