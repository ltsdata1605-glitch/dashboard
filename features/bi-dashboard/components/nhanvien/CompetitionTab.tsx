
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Card from '../Card';
import toast from 'react-hot-toast';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { UsersIcon, XIcon, SpinnerIcon, ImagesIcon, ChevronDownIcon, FilterIcon, ViewGridIcon, ViewListIcon, PlusIcon } from '../Icons';
import { Criterion, CompetitionHeader, Employee, Version, SummaryTableConfig, RevenueRow, InstallmentRow, CrossSellingRow, BonusMetrics } from '../../types/nhanVienTypes';
import { CompetitionGroupCard } from './CompetitionGroupView';
import { IndividualCompetitionView, IndividualCompetitionViewHandle } from './IndividualCompetitionView';
import CompetitionCompareView from './CompetitionCompareView';
import CompetitionSummaryView, { CompetitionSummaryViewHandle } from './CompetitionSummaryView';
import { getYesterdayDateString, shortenName } from '../../utils/nhanVienHelpers';
import { getDefaultGroupLabel } from '../../utils/dashboardHelpers';
import { getErrorMessage } from '../../../../utils/dataUtils';
import { Switch } from '../dashboard/DashboardWidgets';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { Button } from '../../../../components/shared/ui/Button';
import { Input } from '../../../../components/shared/ui/Input';
import { onActivateKey } from '../../../../components/shared/ui';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';
import { MultiSelectDropdown } from '../../../../components/shared/ui/MultiSelectDropdown';
import TimeProgressBar from './shared/TimeProgressBar';
import { Layers } from 'lucide-react';

import { useCompetitionData } from '../../hooks/useCompetitionData';

interface CompetitionTabProps {
    groupedData: Record<Criterion, { headers: CompetitionHeader[]; employees: { name: string; originalName: string; department: string; values: (number | null)[] }[] }>;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    selectedCompetitions: Set<string>;
    setSelectedCompetitions: (updater: React.SetStateAction<Set<string>>) => void;
    supermarket: string | null;
    versions: Version[];
    activeVersionName: string | 'new' | null;
    setActiveVersionName: React.Dispatch<React.SetStateAction<string | 'new' | null>>;
    activeCompetitionTab: Criterion | 'nhom' | 'canhan' | 'tong' | 'tatca' | 'sosanh';
    setActiveCompetitionTab: (c: Criterion | 'nhom' | 'canhan' | 'tong' | 'tatca' | 'sosanh') => void;
    onVersionTabClick: (version: Version) => void;
    onStartNewVersion: () => void;
    onCancelNewVersion: () => void;
    onSaveVersion: (name: string) => void;
    onDeleteVersion: (name: string) => void;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    allEmployees: Employee[];
    individualViewEmployees: Employee[];
    selectedIndividual: Employee | null;
    onSelectIndividual: (emp: Employee | null) => void;
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    activeDepartments: string[];
    revenueRows?: RevenueRow[];
    installmentRows?: InstallmentRow[];
    banKemRows?: CrossSellingRow[];
    bonusData?: Record<string, BonusMetrics | null>;
    isActive?: boolean;
}

export const CompetitionTab: React.FC<CompetitionTabProps> = React.memo(({
    groupedData,
    allCompetitionsByCriterion,
    selectedCompetitions,
    setSelectedCompetitions,
    supermarket,
    versions,
    activeVersionName,
    setActiveVersionName,
    activeCompetitionTab,
    setActiveCompetitionTab,
    onVersionTabClick,
    onStartNewVersion,
    onCancelNewVersion,
    onSaveVersion,
    onDeleteVersion,
    employeeCompetitionTargets,
    allEmployees,

    individualViewEmployees,
    selectedIndividual,
    onSelectIndividual,
    highlightedEmployees,
    setHighlightedEmployees,
    activeDepartments,
    revenueRows,
    installmentRows,
    banKemRows,
    bonusData,
    isActive
}) => {

    const [newVersionName, setNewVersionName] = useState('');
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [isEmployeeFilterOpen, setIsEmployeeFilterOpen] = useState(false);
    const [employeeFilterSearch, setEmployeeFilterSearch] = useState('');
    const employeeFilterRef = useRef<HTMLDivElement>(null);
    const employeeFilterPanelRef = useRef<HTMLDivElement>(null);
    const [employeeFilterPanelStyle, setEmployeeFilterPanelStyle] = useState<React.CSSProperties>({});
    const [isExportingHighlights, setIsExportingHighlights] = useState(false);
    const [exportTitleOverride, setExportTitleOverride] = useState<string | null>(null);
    const [isolatedHighlightEmployee, setIsolatedHighlightEmployee] = useState<string | null>(null);
    const groupViewRef = useRef<HTMLDivElement>(null);
    const individualViewRef = useRef<IndividualCompetitionViewHandle>(null);
    const summaryViewRefs = useRef<Record<string, CompetitionSummaryViewHandle>>({});
    const [filterSearch, setFilterSearch] = useState('');
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [groupOverrides] = useIndexedDBState<Record<string, string>>('competition-group-overrides', {});
    const [canhanGroupingMode, setCanhanGroupingMode] = useIndexedDBState<'default' | 'configured'>('competition-grouping-mode-v2', 'configured');
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('competition-view-mode', 'list');

    // --- Logic cho Tab TỔNG đa bảng ---
    const [summaryTables, setSummaryTables] = useIndexedDBState<SummaryTableConfig[]>('nhanvien-summary-tables-v1', [
        { id: 'default', name: 'Bảng tổng hợp thi đua', selectedTitles: [] }
    ]);
    const [activeSummaryTableId, setActiveSummaryTableId] = useState<string>('default');

    const activeTableId = useMemo(() => {
        const tables = Array.isArray(summaryTables) ? summaryTables : [];
        if (tables.length === 0) return '';
        if (!tables.some(t => t.id === activeSummaryTableId)) {
            return tables[0].id;
        }
        return activeSummaryTableId;
    }, [summaryTables, activeSummaryTableId]);

    const prevTablesLengthRef = useRef(summaryTables?.length || 0);
    useEffect(() => {
        const currentLength = summaryTables?.length || 0;
        if (currentLength > prevTablesLengthRef.current) {
            const lastTable = summaryTables[currentLength - 1];
            if (lastTable) {
                setActiveSummaryTableId(lastTable.id);
            }
        }
        prevTablesLengthRef.current = currentLength;
    }, [summaryTables]);

    const employeeFilterInputRef = useRef<HTMLInputElement>(null);

    const handleToggleEmployeeFilter = () => {
        if (!isEmployeeFilterOpen && employeeFilterRef.current) {
            const rect = employeeFilterRef.current.getBoundingClientRect();
            setEmployeeFilterPanelStyle({ position: 'fixed', top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setIsEmployeeFilterOpen(prev => !prev);
    };

    // Không đọc getBoundingClientRect() trực tiếp trong render (anti-pattern, gây vị trí bị tính lại/co
    // giật trên MỌI lần re-render trong lúc đang mở — kể cả lúc bấm chọn 1 dòng bên trong chính panel).
    // Cũng KHÔNG thể chỉ tính 1 lần lúc mở: panel portal ra document.body nên là position:fixed theo
    // viewport, còn nút bấm cuộn theo trang — nếu không theo dõi scroll, panel đứng yên còn nút bấm
    // trôi đi, nhìn như 2 thứ "tách rời" nhau khi cuộn (user báo cáo thật). Theo dõi scroll (capture để
    // bắt cả scroll của container lồng bên trong, không chỉ window) + resize trong lúc panel đang mở.
    useEffect(() => {
        if (!isEmployeeFilterOpen) return;
        const updatePosition = () => {
            if (!employeeFilterRef.current) return;
            const rect = employeeFilterRef.current.getBoundingClientRect();
            setEmployeeFilterPanelStyle({ position: 'fixed', top: rect.bottom + 4, right: window.innerWidth - rect.right });
        };
        updatePosition();
        employeeFilterInputRef.current?.focus({ preventScroll: true });
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isEmployeeFilterOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isOutsideEmployeeFilter = employeeFilterRef.current && !employeeFilterRef.current.contains(target)
                && (!employeeFilterPanelRef.current || !employeeFilterPanelRef.current.contains(target));
            if (isOutsideEmployeeFilter) setIsEmployeeFilterOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const {
        hasAnyData,
        relevantCompetitions,
        filteredEmployees,
        employeeDataMap,
        selectedHeadersForNhom,
        sortedSelectedHeaders,
        effectiveHighlightColorMap,
        getEmployeeDotColor
    } = useCompetitionData({
        groupedData,
        allCompetitionsByCriterion,
        selectedCompetitions,
        activeCompetitionTab,
        activeDepartments,
        employeeCompetitionTargets,
        allEmployees,
        highlightedEmployees,
        isolatedHighlightEmployee,
        isActive
    });

    const handleSaveVersionAction = () => {
        // Trim trước khi lưu — trước đây "Máy lạnh" và "Máy lạnh " (thừa khoảng trắng cuối)
        // bị coi là 2 tên khác nhau, tạo phiên bản trùng lặp ngoài ý muốn ("trôi tên").
        const trimmedName = newVersionName.trim();
        if (!trimmedName) return;
        onSaveVersion(trimmedName);
        setNewVersionName('');
    };

    // Phiên bản đang xem (nếu có) + có thay đổi chưa lưu hay không — so bộ lọc nhóm hiện tại
    // với bộ lọc đã lưu của chính phiên bản đó. Trước đây không có cách nào biết đã "chỉnh
    // sửa nhưng quên lưu lại", dễ tưởng nhầm phiên bản đã cập nhật trong khi IndexedDB vẫn
    // giữ dữ liệu cũ.
    const activeVersion = activeVersionName && activeVersionName !== 'new'
        ? versions.find(v => v.name === activeVersionName)
        : null;
    const hasUnsavedVersionChanges = !!activeVersion && (
        activeVersion.selectedCompetitions.length !== selectedCompetitions.size ||
        activeVersion.selectedCompetitions.some(c => !selectedCompetitions.has(c))
    );
    const handleUpdateActiveVersion = () => {
        if (activeVersionName && activeVersionName !== 'new') onSaveVersion(activeVersionName);
    };

    const handleSelectAllEmployees = () => setHighlightedEmployees(new Set(allEmployees.map(e => e.originalName)));
    const handleDeselectAllEmployees = () => setHighlightedEmployees(new Set());

    const { showExportOptions } = useExportOptionsContext();

    const exportGroupViewToPNG = async (filename: string, refToExport = groupViewRef, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!refToExport.current) return null;
        const original = refToExport.current;
        // Count how many group cards exist to decide layout
        const cardCount = original.querySelectorAll('.competition-group-card').length;

        try {
            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only',
                elementsToHide: ['.export-button-component', '.no-print'],
                onCloneReady: (clone: HTMLElement) => {
                    // Remove overflow constraints
                    const containers = clone.querySelectorAll('.overflow-x-auto, .grid, .competition-group-card');
                    containers.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        htmlEl.style.overflow = 'visible';
                        htmlEl.style.height = 'auto';
                        htmlEl.style.minHeight = 'auto';
                        if (htmlEl.classList.contains('competition-group-card')) {
                            htmlEl.classList.remove('h-full');
                        }
                    });

                    const gridContainer = clone.querySelector('.grid');
                    if (gridContainer) {
                        (gridContainer as HTMLElement).style.display = 'grid';
                        (gridContainer as HTMLElement).style.gridTemplateColumns = cardCount === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))';
                        (gridContainer as HTMLElement).style.gap = '20px';
                        (gridContainer as HTMLElement).style.width = '100%';
                        (gridContainer as HTMLElement).style.alignItems = 'start';
                    }
                }
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
             console.error("Export failed", err);
             toast.error("Xuất ảnh thất bại.");
             return null;
        }
    };

    const handleSmartBatchExport = async () => {
        if (highlightedEmployees.size === 0) {
            toast.error("Vui lòng chọn ít nhất một nhân viên để xuất báo cáo.");
            return;
        }
        setIsExportingHighlights(true);
        const targets = Array.from(highlightedEmployees);
        setExportProgress({ current: 0, total: targets.length });

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        try {
            for (let i = 0; i < targets.length; i++) {
                const empId = targets[i];
                const emp = allEmployees.find(e => e.originalName === empId);
                const empName = emp ? emp.name : empId;
                setIsolatedHighlightEmployee(empId);
                setExportTitleOverride(`${empName} - NHÓM HÀNG THI ĐUA ĐẾN NGÀY ${getYesterdayDateString()}`);
                await new Promise(resolve => setTimeout(resolve, 800));
                const safeName = `${empName.replace(/[\\/:*?"<>|]/g, '')} - Nổi Bật.png`;
                const action = await exportGroupViewToPNG(safeName, groupViewRef, autoAction);
                if (action === 'cancel') break;
                autoAction = action;
                setExportProgress(prev => ({ ...prev, current: i + 1 }));
            }
        } catch (err) {
            console.error("Batch highlight export failed", err);
            toast.error("Có lỗi xảy ra khi xuất hàng loạt.");
        } finally {
            setIsolatedHighlightEmployee(null);
            setExportTitleOverride(null);
            setIsExportingHighlights(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    const handleGroupBatchExport = async () => {
        if (!groupViewRef.current) return;
        setIsBatchExporting(true);
        const cards = groupViewRef.current.querySelectorAll('.competition-group-card');
        setExportProgress({ current: 0, total: cards.length + 1 });

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        try {
            const action1 = await exportGroupViewToPNG(`Tổng Hợp Nhóm Thi Đua - ${supermarket || 'Siêu Thị'}.png`, groupViewRef, autoAction);
            if (action1 === 'cancel') throw new Error('cancelled');
            autoAction = action1;
            setExportProgress(prev => ({ ...prev, current: prev.current + 1 }));
            await new Promise(resolve => setTimeout(resolve, 600)); 
            
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i] as HTMLElement;
                const titleElement = card.querySelector('h4');
                const title = titleElement ? titleElement.innerText : `Nhóm ${i}`;
                
                const safeName = `${title.replace(/[\s/]/g, '_')}.png`;
                const blob = await exportElementAsImage(card, safeName, {
                    mode: 'blob-only', 
                    elementsToHide: ['.export-button-component'],
                    onCloneReady: (clone: HTMLElement) => {
                        clone.classList.remove('h-full', 'overflow-hidden');
                        clone.style.width = 'max-content';
                        clone.style.minWidth = '100%';
                        clone.style.maxWidth = 'none';
                        clone.style.overflow = 'visible';
                        clone.style.display = 'inline-flex';
                        clone.style.flexDirection = 'column';

                        const titleBar = clone.firstElementChild as HTMLElement;
                        if (titleBar) {
                            titleBar.style.width = '100%';
                            titleBar.style.minWidth = '100%';
                            titleBar.style.boxSizing = 'border-box';
                        }

                        clone.querySelectorAll('colgroup').forEach(cg => cg.remove());
                        const table = clone.querySelector('table');
                        if (table) {
                            table.style.width = '100%';
                            table.style.minWidth = '100%';
                            table.style.tableLayout = 'auto';
                        }
                        clone.querySelectorAll('tr').forEach(tr => {
                            tr.style.borderLeft = 'none';
                            tr.classList.remove('border-l-[3px]');
                        });
                    }
                });
                
                if (blob) {
                    if (autoAction === 'download') {
                        downloadBlob(blob, safeName);
                    } else if (autoAction === 'share') {
                        await shareBlob(blob, safeName);
                    } else {
                        const action = await showExportOptions(blob, safeName);
                        if (action === 'cancel') break;
                        autoAction = action;
                    }
                }
                
                setExportProgress(prev => ({ ...prev, current: prev.current + 1 }));
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error: unknown) {
            if (getErrorMessage(error) !== 'cancelled') {
                console.error("Batch export failed", error);
                toast.error("Xuất hàng loạt thất bại.");
            }
        } finally {
            setIsBatchExporting(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };
    const handleSummaryBatchExport = async () => {
        if (!summaryTables || summaryTables.length === 0) {
            toast.error("Không có bảng tổng hợp nào để xuất.");
            return;
        }
        setIsBatchExporting(true);
        setExportProgress({ current: 0, total: summaryTables.length });

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        try {
            for (let i = 0; i < summaryTables.length; i++) {
                const tableConfig = summaryTables[i];
                const viewRef = summaryViewRefs.current[tableConfig.id];
                if (viewRef) {
                    toast.loading(`Đang xuất bảng: ${tableConfig.name}...`, { id: 'summary-batch-export' });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const safeName = `${tableConfig.name.replace(/[\s/]/g, '_')}`;
                    const action = await viewRef.handleExportPNG(safeName, autoAction);
                    if (action === 'cancel') {
                        toast.dismiss('summary-batch-export');
                        break;
                    }
                    autoAction = action;
                }
                setExportProgress(prev => ({ ...prev, current: i + 1 }));
            }
            toast.success("Đã xuất thành công toàn bộ các bảng tổng hợp!", { id: 'summary-batch-export' });
        } catch (err) {
            console.error("Batch summary export failed", err);
            toast.error("Có lỗi xảy ra khi xuất hàng loạt.", { id: 'summary-batch-export' });
        } finally {
            setIsBatchExporting(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    const handleSelectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(relevantCompetitions) as { headers?: CompetitionHeader[] }[]).flat().map(c => c?.headers || []).flat().map(h => h.originalTitle);
        setSelectedCompetitions(prev => { const newSet = new Set(prev); allRelevantTitles.forEach(t => newSet.add(t)); return newSet; });
    };
    const handleDeselectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(relevantCompetitions) as { headers?: CompetitionHeader[] }[]).flat().map(c => c?.headers || []).flat().map(h => h.originalTitle);
        setSelectedCompetitions(prev => { const newSet = new Set(prev); allRelevantTitles.forEach(t => newSet.delete(t)); return newSet; });
    };
    const handleToggleCompetition = (competitionTitle: string) => {
        setSelectedCompetitions(prev => { const newSet = new Set(prev); if (newSet.has(competitionTitle)) newSet.delete(competitionTitle); else newSet.add(competitionTitle); return newSet; });
    };

    const activeFilterCount = (Object.values(relevantCompetitions || {}).filter(Boolean) as { headers?: CompetitionHeader[] }[]).flatMap(c => c?.headers || []).filter(h => selectedCompetitions.has(h.originalTitle)).length;
    const totalFilterCount = (Object.values(relevantCompetitions || {}).filter(Boolean) as { headers?: CompetitionHeader[] }[]).flatMap(c => c?.headers || []).length;
    const isFiltered = activeFilterCount < totalFilterCount;
    const handleToggleAllCompetitions = () => {
        if (activeFilterCount === totalFilterCount) handleDeselectAllCompetitions();
        else handleSelectAllCompetitions();
    };
    // Lọc theo tên HIỂN THỊ (đã áp dụng nameOverrides), không phải originalTitle thô — nếu
    // không, gõ đúng tên đã đổi (VD "VIEON") sẽ không khớp được với tên gốc chưa đổi.
    const filterGroups = (Object.entries(relevantCompetitions || {}) as [Criterion, { headers?: CompetitionHeader[] }][])
        .filter(([, data]) => Boolean(data && data.headers))
        .map(([criterion, data]) => ({
            key: criterion,
            label: `Tiêu chí ${criterion}`,
            options: (data?.headers || [])
                .filter(c => shortenName(c.originalTitle, nameOverrides).toLowerCase().includes(filterSearch.toLowerCase()))
                .map(c => ({ key: c.originalTitle, label: shortenName(c.originalTitle, nameOverrides).toUpperCase(), checked: selectedCompetitions.has(c.originalTitle) }))
        }));

    const canhanFilterGroups = useMemo(() => {
        if (canhanGroupingMode === 'default') {
            return (Object.entries(allCompetitionsByCriterion || {}) as [string, { headers?: CompetitionHeader[] }][])
                .filter(([, data]) => Boolean(data && data.headers))
                .map(([criterion, data]) => ({
                    key: criterion,
                    label: `Tiêu chí ${criterion}`,
                    options: (data?.headers || [])
                        .filter(c => shortenName(c.originalTitle, nameOverrides).toLowerCase().includes(filterSearch.toLowerCase()))
                        .map(c => ({ key: c.originalTitle, label: shortenName(c.originalTitle, nameOverrides).toUpperCase(), checked: selectedCompetitions.has(c.originalTitle) }))
                }));
        } else {
            const groupMap = new Map<string, { key: string; label: string; checked: boolean }[]>();
            (Object.entries(allCompetitionsByCriterion || {}) as [string, { headers?: CompetitionHeader[] }][])
                .forEach(([criterion, data]) => {
                    (data?.headers || []).forEach(c => {
                        const defaultGroup = getDefaultGroupLabel(criterion) || criterion;
                        const customGroup = (groupOverrides[c.originalTitle] && groupOverrides[c.originalTitle].trim())
                            ? groupOverrides[c.originalTitle].trim()
                            : defaultGroup;
                        if (!groupMap.has(customGroup)) groupMap.set(customGroup, []);
                        if (shortenName(c.originalTitle, nameOverrides).toLowerCase().includes(filterSearch.toLowerCase())) {
                            groupMap.get(customGroup)!.push({
                                key: c.originalTitle,
                                label: shortenName(c.originalTitle, nameOverrides).toUpperCase(),
                                checked: selectedCompetitions.has(c.originalTitle)
                            });
                        }
                    });
                });
            return Array.from(groupMap.entries()).map(([groupName, options]) => ({
                key: groupName,
                label: `Nhóm ${groupName}`,
                options
            }));
        }
    }, [canhanGroupingMode, allCompetitionsByCriterion, groupOverrides, nameOverrides, filterSearch, selectedCompetitions]);

    // Tab "Tổng" — luôn hiển thị TẤT CẢ nhóm hàng thi đua hiện có (không cho tự chọn cột,
    // khác với tab "Tuỳ chỉnh" nơi người dùng tự chọn/lưu nhiều bảng riêng).
    const allCompetitionTitles = useMemo(() => {
        return (Object.values(allCompetitionsByCriterion || {}).filter(Boolean) as { headers?: CompetitionHeader[] }[])
            .flatMap(c => c?.headers ? c.headers.map(h => h.title) : []);
    }, [allCompetitionsByCriterion]);

    // --- Logic cho tab Tổng ---
    const handleAddSummaryTable = () => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            const nextIdx = currentList.length + 1;
            const newTable: SummaryTableConfig = {
                id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: `Bảng tổng hợp ${nextIdx}`,
                selectedTitles: []
            };
            return [...currentList, newTable];
        });
    };

    const handleDeleteSummaryTable = (id: string) => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            // Lọc bỏ bảng có ID trùng khớp và trả về một tham chiếu mảng hoàn toàn mới
            const newList = currentList.filter(t => t.id !== id);
            return [...newList];
        });
    };

    const handleRenameSummaryTable = (id: string, newName: string) => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            return currentList.map(t => t.id === id ? { ...t, name: newName } : t);
        });
    };

    const handleUpdateTableTitles = (id: string, titles: string[]) => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            return currentList.map(t => t.id === id ? { ...t, selectedTitles: titles } : t);
        });
    };


    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (!hasAnyData) {
        return (
            <Card bordered={false} title="HIỆU QUẢ THI ĐUA THEO NHÂN VIÊN">
                <div className="mt-4 text-center py-12">
                     <UsersIcon className="h-16 w-16 text-slate-400 mx-auto" />
                    <p className="mt-4 text-slate-600 max-w-md mx-auto">Không có dữ liệu thi đua. Vui lòng chọn siêu thị và dán dữ liệu "Chương trình thi đua" tại trang Cập nhật.</p>
                </div>
            </Card>
        );
    }

    const cardTitle = <span className="js-report-title">Hiệu quả thi đua nhân viên đến ngày {getYesterdayDateString()}</span>;
    const cardSubtitle = <span className="js-report-title">Thi đua là động lực, hiệu quả là mục tiêu - Vượt qua giới hạn, khẳng định bản thân.</span>;

    return (
        <div className="space-y-0 bg-white dark:bg-slate-900">
            {/* 1. Tiêu đề lên TRÊN CÙNG */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm lg:text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide leading-tight">
                    {cardTitle}
                </h2>
                <div className="text-[11px] lg:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mt-1">
                    {cardSubtitle}
                </div>
            </div>

            {/* 2. Thanh Tab chuyển đổi các góc nhìn thi đua chuẩn như tab trên */}
            <div className="flex flex-wrap justify-between items-center px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/60 no-print gap-2">
                <div className="flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-2">
                    {([['tatca', 'Tổng'], ['nhom', 'Nhóm'], ['tong', 'Tuỳ chỉnh'], ['canhan', 'Cá nhân'], ['sosanh', 'So sánh']] as const).map(([key, label]) => {
                        const isActive = activeVersionName === null && activeCompetitionTab === key;
                        return (
                            <Button
                                variant="unstyled"
                                size="none"
                                key={key}
                                onClick={() => { setActiveCompetitionTab(key); setActiveVersionName(null); }}
                                className={`relative flex items-center gap-1.5 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'text-sky-700 dark:text-sky-400 font-bold'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>{label}</span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                                )}
                            </Button>
                        );
                    })}

                    {/* Các phiên bản bộ lọc đã lưu (nếu có) */}
                    {versions.filter(v => v && typeof v === 'object' && v.name).map(version => {
                        const isActive = activeVersionName === version.name;
                        return (
                            <div
                                key={version.name}
                                role="button"
                                tabIndex={0}
                                onClick={() => onVersionTabClick(version)}
                                onKeyDown={onActivateKey(() => onVersionTabClick(version))}
                                className={`relative flex items-center gap-1.5 pl-3 pr-6 h-10 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'text-sky-700 dark:text-sky-400 font-bold'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <span>{version.name}</span>
                                {isActive && hasUnsavedVersionChanges && (
                                    <span title="Bộ lọc đã đổi, chưa lưu lại" className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                )}
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    onClick={(e) => { e.stopPropagation(); onDeleteVersion(version.name); }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 opacity-60 hover:opacity-100 transition-all"
                                >
                                    <XIcon className="h-3 w-3" />
                                </Button>
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                                )}
                            </div>
                        );
                    })}

                    {hasUnsavedVersionChanges && (
                        <Button variant="unstyled" size="none" onClick={handleUpdateActiveVersion} title={`Lưu lại thay đổi vào "${activeVersionName}"`} className="h-6 px-2 bg-amber-500 text-white rounded text-[11px] font-bold hover:bg-amber-600 flex items-center shadow-xs transition-colors shrink-0">Cập nhật</Button>
                    )}

                    {activeVersionName === 'new' ? (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-sky-300 dark:border-sky-600 shadow-xs shrink-0 my-1">
                            <Input type="text" value={newVersionName} onChange={(e) => setNewVersionName(e.target.value)} placeholder={selectedCompetitions.size === 0 ? "Chọn nhóm trước" : "Tên bản lưu..."} className="w-28 text-xs h-6 border-0 focus:ring-0" fullWidth={false} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveVersionAction()} disabled={selectedCompetitions.size === 0} />
                            <Button variant="unstyled" size="none" onClick={handleSaveVersionAction} className="h-6 px-2 bg-sky-600 text-white rounded text-[11px] font-bold hover:bg-sky-700 disabled:bg-slate-300 flex items-center transition-colors" disabled={!newVersionName.trim() || selectedCompetitions.size === 0}>Lưu</Button>
                            <Button variant="unstyled" size="none" onClick={onCancelNewVersion} className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><XIcon className="h-3 w-3" /></Button>
                        </div>
                    ) : (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={onStartNewVersion}
                            disabled={!supermarket}
                            title="Tạo bản lưu mới từ các nhóm đang chọn"
                            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                        >
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {/* Bên phải thanh bar — chế độ xem + export */}
                <div className="flex items-center gap-1">
                    {activeCompetitionTab === 'nhom' && activeVersionName === null && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewMode(viewMode === 'group' ? 'list' : 'group')}
                                title={viewMode === 'group' ? 'Đang xem theo Bộ phận (Bấm để xem Danh sách)' : 'Đang xem Danh sách (Bấm để xem theo Bộ phận)'}
                                className="h-8 w-8 text-sky-700 dark:text-sky-400"
                            >
                                {viewMode === 'group' ? <ViewGridIcon className="h-4 w-4" /> : <ViewListIcon className="h-4 w-4" />}
                            </Button>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                            <Button variant="ghost" size="icon" onClick={handleGroupBatchExport} disabled={isBatchExporting || selectedHeadersForNhom.length === 0} title={isBatchExporting ? `Đang xuất ${exportProgress.current}/${exportProgress.total}` : 'Xuất tất cả nhóm'} className="h-8 w-8 text-slate-400">{isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ImagesIcon className="h-4 w-4" />}</Button>
                            {highlightedEmployees.size > 0 && (
                                <Button variant="ghost" size="icon" onClick={handleSmartBatchExport} disabled={isExportingHighlights} title={isExportingHighlights ? `Đang xuất ${exportProgress.current}/${exportProgress.total}` : `Xuất Highlight (${highlightedEmployees.size} NV)`} className="h-8 w-8 text-amber-600 dark:text-amber-400">{isExportingHighlights ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <UsersIcon className="h-4 w-4" />}</Button>
                            )}
                            <ExportButton onExportPNG={async () => { await exportGroupViewToPNG(`Nhóm Thi Đua - ${supermarket || 'Siêu Thị'}.png`, groupViewRef); }} />
                        </>
                    )}
                    {activeCompetitionTab === 'canhan' && activeVersionName === null && (
                        <>
                            {/* Nút chuyển đổi Chế độ xem: Mặc định vs Tuỳ chỉnh */}
                            <Button
                                variant="unstyled"
                                size="none"
                                onClick={() => setCanhanGroupingMode(prev => prev === 'default' ? 'configured' : 'default')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer rounded-none ${
                                    canhanGroupingMode === 'configured'
                                        ? 'border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:border-sky-700 dark:text-sky-300'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                                }`}
                                title={
                                    canhanGroupingMode === 'configured'
                                        ? 'Chế độ xem: Tuỳ chỉnh (Click để chuyển về Mặc định SLLK/DTLK/DTQĐ)'
                                        : 'Chế độ xem: Mặc định (Click để chuyển sang Tuỳ chỉnh theo nhóm target)'
                                }
                                aria-label="Chuyển đổi nhóm tiêu chí Mặc định / Tuỳ chỉnh"
                            >
                                <Layers className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                                <span>{canhanGroupingMode === 'configured' ? 'Tuỳ chỉnh' : 'Mặc định'}</span>
                            </Button>

                            {/* Lọc nhóm — MultiSelectDropdown */}
                            <MultiSelectDropdown
                                icon={<FilterIcon className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />}
                                triggerLabel="Lọc nhóm"
                                count={isFiltered ? activeFilterCount : undefined}
                                allLabel="Chọn tất cả"
                                allChecked={activeFilterCount === totalFilterCount}
                                onToggleAll={handleToggleAllCompetitions}
                                groups={canhanFilterGroups}
                                onToggleOption={handleToggleCompetition}
                                searchValue={filterSearch}
                                onSearchChange={setFilterSearch}
                                searchPlaceholder="Tìm nhóm thi đua..."
                                panelWidthClass="w-80"
                                maxHeightClass="max-h-[80vh]"
                                usePortal
                            />

                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                            <Button variant="ghost" size="icon" onClick={() => individualViewRef.current?.performBatchExport()} disabled={individualViewRef.current?.isBatchExporting} title={individualViewRef.current?.isBatchExporting ? `Đang xuất ${individualViewRef.current?.exportProgress?.current ?? 0}/${individualViewRef.current?.exportProgress?.total ?? 0}` : 'Xuất tất cả nhân viên'} className="h-8 w-8 text-slate-400">
                                {individualViewRef.current?.isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ImagesIcon className="h-4 w-4" />}
                            </Button>
                            <ExportButton onExportPNG={async () => { await individualViewRef.current?.handleExportPNG(); }} />
                        </>
                    )}
                    {activeCompetitionTab === 'tong' && activeVersionName === null && (
                        <>
                            <Button variant="ghost" size="icon" onClick={handleSummaryBatchExport} disabled={isBatchExporting || summaryTables.length === 0} title={isBatchExporting ? `Đang xuất ${exportProgress.current}/${exportProgress.total}` : 'Xuất tất cả bảng tổng hợp'} className="h-8 w-8 text-slate-400">
                                {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ImagesIcon className="h-4 w-4" />}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* 3. Tiến độ thời gian */}
            <div className="px-4 pt-3 pb-1">
                <TimeProgressBar />
            </div>

            {/* 4. Nội dung thi đua */}
            <div className="w-full overflow-visible px-4 pb-4">
                    <div className="pt-2">
                        {activeCompetitionTab === 'nhom' && (
                            <>
                            {/* Toolbar: Lọc nhóm + Highlight — canh phải */}
                            <div className="mb-4 flex flex-wrap items-center justify-end gap-2 px-1 no-print">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Lọc nhóm — dùng chung MultiSelectDropdown (components/shared/ui) để đồng nhất
                                        style với các bộ lọc khác trong dự án (VD bộ lọc siêu thị ngay phía trên) */}
                                    <MultiSelectDropdown
                                        icon={<FilterIcon className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />}
                                        triggerLabel="Lọc nhóm"
                                        count={isFiltered ? activeFilterCount : undefined}
                                        allLabel="Chọn tất cả"
                                        allChecked={activeFilterCount === totalFilterCount}
                                        onToggleAll={handleToggleAllCompetitions}
                                        groups={filterGroups}
                                        onToggleOption={handleToggleCompetition}
                                        searchValue={filterSearch}
                                        onSearchChange={setFilterSearch}
                                        searchPlaceholder="Tìm nhóm thi đua..."
                                        panelWidthClass="w-80"
                                        maxHeightClass="max-h-[80vh]"
                                        usePortal
                                    />
                                    {/* Highlight */}
                                    <div className="relative" ref={employeeFilterRef}>
                                        <Button variant="unstyled" size="none" onClick={handleToggleEmployeeFilter} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${isEmployeeFilterOpen || highlightedEmployees.size > 0 ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-700'}`}>
                                            <UsersIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Highlight</span>{highlightedEmployees.size > 0 && <span className="px-1.5 py-0.5 bg-sky-600 text-white text-[11px] font-black rounded">{highlightedEmployees.size}</span>}<ChevronDownIcon className={`h-3 w-3 transition-transform ${isEmployeeFilterOpen ? 'rotate-180' : ''}`} />
                                        </Button>
                                        {isEmployeeFilterOpen && createPortal(
                                            <div
                                                ref={employeeFilterPanelRef}
                                                style={employeeFilterPanelStyle}
                                                className="fixed w-72 sm:w-80 max-h-[70vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-[999999] flex flex-col overflow-hidden"
                                            >
                                                <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                    <Input ref={employeeFilterInputRef} type="text" value={employeeFilterSearch} onChange={(e) => setEmployeeFilterSearch(e.target.value)} placeholder="Tìm nhân viên..." leftIcon="search" />
                                                    <div className="flex items-center justify-between mt-1.5 px-0.5"><Button variant="unstyled" size="none" onClick={handleSelectAllEmployees} className="p-0 text-[11px] font-bold text-sky-600 hover:underline">Chọn tất cả</Button><Button variant="unstyled" size="none" onClick={handleDeselectAllEmployees} className="p-0 text-[11px] font-bold text-slate-500 hover:underline">Bỏ chọn</Button></div>
                                                </div>
                                                <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5">
                                                    {allEmployees.filter(emp => emp.name.toLowerCase().includes(employeeFilterSearch.toLowerCase())).map(emp => {
                                                        const isSelected = highlightedEmployees.has(emp.originalName);
                                                        return (
                                                            <div key={emp.originalName} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-default">
                                                                <div role="button" tabIndex={0} className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setHighlightedEmployees(prev => { const newSet = new Set(prev); if (newSet.has(emp.originalName)) newSet.delete(emp.originalName); else newSet.add(emp.originalName); return newSet; })} onKeyDown={onActivateKey(() => setHighlightedEmployees(prev => { const newSet = new Set(prev); if (newSet.has(emp.originalName)) newSet.delete(emp.originalName); else newSet.add(emp.originalName); return newSet; }))}>
                                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getEmployeeDotColor(emp.originalName)}`}></span>
                                                                    <span className={`text-sm truncate ${isSelected ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{emp.name}</span>
                                                                </div>
                                                                <Switch checked={isSelected} onChange={() => setHighlightedEmployees(prev => { const newSet = new Set(prev); if (newSet.has(emp.originalName)) newSet.delete(emp.originalName); else newSet.add(emp.originalName); return newSet; })} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>,
                                            document.body
                                        )}
                                    </div>
                                </div>
                            </div>
                            {selectedHeadersForNhom.length === 0 ? (
                                <div className="mt-2 text-center py-12"><UsersIcon className="h-16 w-16 text-slate-400 mx-auto" /><p className="mt-4 text-slate-600 max-w-md mx-auto">Hãy chọn nhóm hàng thi đua cần hiển thị từ bộ lọc nhóm thi đua.</p></div>
                            ) : (
                                <div className="space-y-8" ref={groupViewRef}>
                                    <div className="mb-6 text-center py-3 px-4 bg-sky-600 shadow-sm">
                                        <h3 className="text-2xl font-black uppercase text-white leading-normal drop-shadow-sm">
                                            {exportTitleOverride || `NHÓM HÀNG THI ĐUA ĐẾN NGÀY ${getYesterdayDateString()}`}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                        {sortedSelectedHeaders.map((header) => (
                                            <CompetitionGroupCard key={header.title} header={header as CompetitionHeader} sortedEmployees={filteredEmployees as Employee[]} employeeDataMap={employeeDataMap} employeeCompetitionTargets={employeeCompetitionTargets} highlightColorMap={effectiveHighlightColorMap} viewMode={viewMode} supermarketName={supermarket || ''} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                        {activeCompetitionTab === 'canhan' && (
                            <IndividualCompetitionView
                                ref={individualViewRef}
                                allEmployees={individualViewEmployees}
                                selectedEmployee={selectedIndividual}
                                onSelectIndividual={onSelectIndividual}
                                allCompetitionsByCriterion={allCompetitionsByCriterion}
                                employeeDataMap={employeeDataMap}
                                employeeCompetitionTargets={employeeCompetitionTargets}
                                selectedCompetitions={selectedCompetitions}
                                setSelectedCompetitions={setSelectedCompetitions}
                                supermarketName={supermarket || undefined}
                                revenueRows={revenueRows}
                                installmentRows={installmentRows}
                                banKemRows={banKemRows}
                                bonusData={bonusData}
                                groupingMode={canhanGroupingMode}
                                setGroupingMode={setCanhanGroupingMode}
                            />
                        )}
                        {activeCompetitionTab === 'tatca' && (
                            <CompetitionSummaryView
                                employees={filteredEmployees as Employee[]}
                                selectedTitles={allCompetitionTitles}
                                onUpdateTitles={() => {}}
                                onDelete={() => {}}
                                onRename={() => {}}
                                allCompetitionsByCriterion={allCompetitionsByCriterion}
                                employeeDataMap={employeeDataMap}
                                employeeCompetitionTargets={employeeCompetitionTargets}
                                supermarketName={supermarket || 'TongHop'}
                                tableName="Tổng hợp tất cả nhóm hàng"
                                readOnly
                            />
                        )}
                        {activeCompetitionTab === 'tong' && (
                            <div className="space-y-6">
                                {Array.isArray(summaryTables) && summaryTables.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 gap-3 no-print">
                                        {/* Left: Summary Table Tabs */}
                                        <div className="flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-2">
                                            {summaryTables.map((tableConfig) => {
                                                const isActive = activeTableId === tableConfig.id;
                                                return (
                                                    <Button
                                                        variant="unstyled" size="none"
                                                        key={tableConfig.id}
                                                        type="button"
                                                        onClick={() => setActiveSummaryTableId(tableConfig.id)}
                                                        className={`relative flex items-center px-3 sm:px-3.5 h-9 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                                                            isActive
                                                                ? 'text-sky-700 dark:text-sky-400 font-bold'
                                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <span>{tableConfig.name}</span>
                                                        {isActive && (
                                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                                                        )}
                                                    </Button>
                                                );
                                            })}
                                        </div>

                                        {/* Right: Add Button */}
                                        <Button
                                            variant="unstyled" size="none"
                                            type="button"
                                            onClick={handleAddSummaryTable}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-[11px] font-bold uppercase rounded-lg hover:bg-sky-700 transition-all shadow-md shadow-sky-500/10 active:scale-95 cursor-pointer"
                                        >
                                            <PlusIcon className="h-3.5 w-3.5" />
                                            <span>Thêm bảng</span>
                                        </Button>
                                    </div>
                                )}

                                {(Array.isArray(summaryTables) ? summaryTables : []).map((tableConfig) => (
                                    <div 
                                        key={tableConfig.id}
                                        className={activeTableId === tableConfig.id ? 'block animate-in fade-in duration-200' : 'hidden'}
                                    >
                                        <CompetitionSummaryView 
                                            ref={(el) => {
                                                if (el) {
                                                    summaryViewRefs.current[tableConfig.id] = el;
                                                } else {
                                                    delete summaryViewRefs.current[tableConfig.id];
                                                }
                                            }}
                                            employees={filteredEmployees as Employee[]}
                                            selectedTitles={tableConfig.selectedTitles}
                                            onUpdateTitles={(titles) => handleUpdateTableTitles(tableConfig.id, titles)}
                                            onDelete={() => handleDeleteSummaryTable(tableConfig.id)}
                                            onRename={(newName) => handleRenameSummaryTable(tableConfig.id, newName)}
                                            allCompetitionsByCriterion={allCompetitionsByCriterion}
                                            employeeDataMap={employeeDataMap}
                                            employeeCompetitionTargets={employeeCompetitionTargets}
                                            supermarketName={supermarket || 'TongHop'}
                                            tableName={tableConfig.name}
                                        />
                                    </div>
                                ))}

                                {(!Array.isArray(summaryTables) || summaryTables.length === 0) && (
                                    <EmptyState
                                        title="Chưa có bảng tổng hợp nào"
                                        description='Hãy bấm "Thêm bảng tổng hợp" để bắt đầu.'
                                        action={
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                type="button"
                                                onClick={handleAddSummaryTable}
                                                leftIcon={<PlusIcon className="h-4 w-4" />}
                                            >
                                                Thêm bảng tổng hợp
                                            </Button>
                                        }
                                    />
                                )}
                            </div>
                        )}
                        {activeCompetitionTab === 'sosanh' && (
                            <CompetitionCompareView
                                allEmployees={individualViewEmployees}
                                allCompetitionsByCriterion={allCompetitionsByCriterion}
                                employeeDataMap={employeeDataMap}
                                employeeCompetitionTargets={employeeCompetitionTargets}
                                selectedCompetitions={selectedCompetitions}
                                setSelectedCompetitions={setSelectedCompetitions}
                                supermarketName={supermarket || undefined}
                                revenueRows={revenueRows}
                                installmentRows={installmentRows}
                                banKemRows={banKemRows}
                                bonusData={bonusData}
                            />
                        )}
                    </div>
                </div>
        </div>
    );
});
