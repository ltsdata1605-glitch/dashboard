import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { parseDetailDataV2, DetailNode } from '../../utils/detailDataParser';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import Card from '../Card';
import { SpinnerIcon, ChevronDownIcon } from '../Icons';
import { Search, ChevronRight, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../../services/uiService';
import * as dbService from '../../../../services/dbService';

const LEVEL_NUMBERS: Record<string, number> = {
    total: 0,
    department: 1,
    employee: 2,
    nnh: 3,
    nhomHang: 4,
    hang: 5
};

const VIEW_LEVELS = [
    { value: 1, label: 'Cấp 1: Bộ phận' },
    { value: 2, label: 'Cấp 2: Nhân viên' },
    { value: 3, label: 'Cấp 3: Ngành hàng' },
    { value: 4, label: 'Cấp 4: Nhóm hàng' },
    { value: 5, label: 'Cấp 5: Hãng' },
];

const LevelSelect: React.FC<{
    value: number;
    onChange: (val: number) => void;
    options: { value: number; label: string }[];
    widthClass?: string;
}> = ({ value, onChange, options, widthClass = 'w-36' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : 'Cấp độ xem';

    return (
        <div className={`relative ${widthClass} z-40`} ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all rounded shadow-sm text-left font-bold"
            >
                <span className="truncate">{displayValue}</span>
                <ChevronDownIcon className="h-3.5 w-3.5 ml-1 text-slate-400 shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xl z-50 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto text-[11px]">
                        {options.map(opt => (
                            <button
                                type="button"
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${value === opt.value ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface DetailTabProps {
    rawData: string;
    supermarketName: string;
    activeDepartments: string[];
    hiddenEmployees?: string[];
    isActive?: boolean;
}

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const fInt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

// Visual config per level
const LEVEL_STYLES: Record<string, { indent: number; bg: string; text: string; font: string; border?: string; size: string }> = {
    total: { indent: 0, bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-800 dark:text-emerald-200', font: 'font-black uppercase', size: 'text-[13px]' },
    department: { indent: 0, bg: 'bg-rose-50/60 dark:bg-rose-900/15', text: 'text-rose-800 dark:text-rose-200', font: 'font-extrabold uppercase', border: 'border-t-2 border-rose-200 dark:border-rose-800', size: 'text-[12px]' },
    employee: { indent: 0, bg: 'bg-sky-50/40 dark:bg-sky-900/10', text: 'text-sky-800 dark:text-sky-200', font: 'font-bold', size: 'text-[13px]' },
    nnh: { indent: 20, bg: 'bg-amber-50/30 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-300', font: 'font-semibold', size: 'text-[12px]' },
    nhomHang: { indent: 40, bg: '', text: 'text-slate-600 dark:text-slate-400', font: 'font-medium', size: 'text-[12px]' },
    hang: { indent: 60, bg: '', text: 'text-slate-500 dark:text-slate-500', font: 'font-normal', size: 'text-[11px]' },
};

interface DetailRowProps {
    node: DetailNode;
    rowKey: string;
    isExpanded: boolean;
    toggleExpand: (key: string) => void;
    fInt: Intl.NumberFormat;
    f: Intl.NumberFormat;
}

const DetailRow = React.memo<DetailRowProps>(({ node, rowKey, isExpanded, toggleExpand, fInt, f }) => {
    const style = LEVEL_STYLES[node.level] || LEVEL_STYLES.hang;
    const hasChildren = node.children.length > 0;

    return (
        <tr
            className={`${style.bg} ${style.border || ''} border-b border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50`}
        >
            {/* Name column */}
            <td className={`py-1.5 pr-3 ${style.text} ${style.font} ${style.size} whitespace-nowrap border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-inherit`}>
                <div className="flex items-center" style={{ paddingLeft: `${style.indent + 8}px` }}>
                    {hasChildren ? (
                        <button
                            onClick={() => toggleExpand(rowKey)}
                            className="mr-1.5 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors flex-shrink-0"
                        >
                            {isExpanded
                                ? <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
                               : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            }
                        </button>
                    ) : (
                        <span className="mr-1.5 w-[18px] flex-shrink-0" />
                    )}
                    <span className="truncate">{node.name}</span>
                    {hasChildren && (
                        <span className="ml-1.5 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {node.children.length}
                        </span>
                    )}
                </div>
            </td>
            {/* Số lượng */}
            <td className={`px-2 py-1.5 text-center ${style.size} tabular-nums border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400`}>
                {fInt.format(node.soLuong)}
            </td>
            {/* DTLK */}
            <td className={`px-2 py-1.5 text-right ${style.size} ${style.font} tabular-nums border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400`}>
                {f.format(node.dtlk)}
            </td>
            {/* DTQD */}
            <td className={`px-2 py-1.5 text-right ${style.size} font-bold tabular-nums border-r border-slate-100 dark:border-slate-800/60 text-sky-700 dark:text-sky-400`}>
                {f.format(node.dtqd)}
            </td>
            {/* Hiệu quả QĐ */}
            <td className={`px-2 py-1.5 text-center ${style.size} tabular-nums border-r border-slate-100 dark:border-slate-800/60`}>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    node.hieuQuaQD >= 0.3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : node.hieuQuaQD > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'text-slate-400'
                }`}>
                    {Math.round(node.hieuQuaQD * 100)}%
                </span>
            </td>
            {/* Đơn giá */}
            <td className={`px-2 py-1.5 text-right ${style.size} tabular-nums text-slate-500 dark:text-slate-500`}>
                {f.format(node.donGia)}
            </td>
        </tr>
    );
});

const SearchableSelect: React.FC<{
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder: string;
    emptyText: string;
    widthClass?: string;
}> = ({ value, onChange, options, placeholder, emptyText, widthClass = 'w-32' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = useMemo(() => {
        return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    const displayValue = value === 'all' ? placeholder : value;

    return (
        <div className={`relative ${widthClass} z-40`} ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all rounded shadow-sm text-left"
            >
                <span className="truncate">{displayValue}</span>
                <ChevronDownIcon className="h-3.5 w-3.5 ml-1 text-slate-400 shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xl z-50 overflow-hidden flex flex-col max-h-60">
                    <div className="p-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm kiếm..."
                            className="w-full px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-sky-300 bg-white dark:bg-slate-700 dark:text-slate-100 outline-none"
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 text-[11px]">
                        <button
                            type="button"
                            onClick={() => { onChange('all'); setIsOpen(false); setSearch(''); }}
                            className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${value === 'all' ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                            {placeholder}
                        </button>
                        {filtered.length > 0 ? filtered.map(opt => (
                            <button
                                type="button"
                                key={opt}
                                onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}
                                className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${value === opt ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                            >
                                {opt}
                            </button>
                        )) : <div className="p-2 text-center text-slate-500">{emptyText}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailTab: React.FC<DetailTabProps> = ({ rawData, supermarketName, activeDepartments, hiddenEmployees, isActive }) => {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [filterEmployee, setFilterEmployee] = useState<string>('all');
    const [filterNnh, setFilterNnh] = useState<string>('all');
    const [filterNhomHang, setFilterNhomHang] = useState<string>('all');
    const [filterHang, setFilterHang] = useState<string>('all');
    const [isAllExpanded, setIsAllExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const [industryBiMap, setIndustryBiMap] = useState<Record<string, { parent: string; child: string }> | null>(null);

    useEffect(() => {
        let isMounted = true;
        const loadBiMap = async () => {
            const cachedConfig = await dbService.getProductConfig();
            if (isMounted && cachedConfig && cachedConfig.config && cachedConfig.config.industryBiMap) {
                setIndustryBiMap(cachedConfig.config.industryBiMap);
            }
        };
        loadBiMap();
        return () => { isMounted = false; };
    }, []);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fullTree = useMemo(() => {
        if (isActive === false) return [];
        return parseDetailDataV2(rawData, industryBiMap);
    }, [rawData, isActive, industryBiMap]);

    // Remove 'Tổng' level and filter departments by activeDepartments
    const hiddenSet = useMemo(() => new Set(hiddenEmployees || []), [hiddenEmployees]);

    const tree = useMemo(() => {
        if (isActive === false) return [];
        // Flatten: skip 'total' nodes, take their department children directly
        let departments: DetailNode[] = [];
        for (const node of fullTree) {
            if (node.level === 'total') {
                // Clone dept nodes to avoid mutating cached fullTree
                departments.push(...node.children.map(d => ({
                    ...d,
                    children: d.children.filter(emp => emp.level !== 'employee' || !hiddenSet.has(emp.name))
                })));
            } else {
                departments.push({
                    ...node,
                    children: node.children.filter(emp => emp.level !== 'employee' || !hiddenSet.has(emp.name))
                });
            }
        }
        // Filter by active departments
        if (activeDepartments.length > 0) {
            departments = departments.filter(d => 
                d.level !== 'department' || activeDepartments.some(ad => d.name === ad)
            );
        }
        return departments;
    }, [fullTree, activeDepartments, hiddenSet, isActive]);

    // Sync expanded keys when tree changes (default expand to level 2 showing employee names collapsed)
    useEffect(() => {
        if (isActive === false) return;
        if (tree.length > 0) {
            const keys = new Set<string>();
            const walk = (nodes: DetailNode[], prefix: string) => {
                nodes.forEach((n, i) => {
                    const key = `${prefix}-${i}-${n.name}`;
                    const currentLvl = LEVEL_NUMBERS[n.level] || 5;
                    if (currentLvl < 2 && n.children.length > 0) {
                        keys.add(key);
                    }
                    walk(n.children, key);
                });
            };
            walk(tree, 'root');
            setExpandedKeys(keys);
        }
    }, [tree, isActive]);

    // Collect all expandable keys
    const allKeys = useMemo(() => {
        if (isActive === false) return new Set<string>();
        const keys = new Set<string>();
        const walk = (nodes: DetailNode[], prefix: string) => {
            nodes.forEach((n, i) => {
                const key = `${prefix}-${i}-${n.name}`;
                if (n.children.length > 0) keys.add(key);
                walk(n.children, key);
            });
        };
        walk(tree, 'root');
        return keys;
    }, [tree, isActive]);

    const toggleExpand = useCallback((key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);

    const handleExpandAll = useCallback(() => {
        setExpandedKeys(allKeys);
        setIsAllExpanded(true);
    }, [allKeys]);

    const handleCollapseAll = useCallback(() => {
        setExpandedKeys(new Set());
        setIsAllExpanded(false);
    }, []);

    const filterOptions = useMemo(() => {
        if (isActive === false) return { employees: [], nnhs: [], nhomHangs: [], hangs: [] };
        const employees = new Set<string>();
        const nnhs = new Set<string>();
        const nhomHangs = new Set<string>();
        const hangs = new Set<string>();
        
        const walk = (nodes: DetailNode[]) => {
            for (const node of nodes) {
                if (node.level === 'employee') employees.add(node.name);
                if (node.level === 'nnh') nnhs.add(node.name);
                if (node.level === 'nhomHang') nhomHangs.add(node.name);
                if (node.level === 'hang') hangs.add(node.name);
                walk(node.children);
            }
        };
        walk(tree);
        return {
            employees: Array.from(employees).sort(),
            nnhs: Array.from(nnhs).sort(),
            nhomHangs: Array.from(nhomHangs).sort(),
            hangs: Array.from(hangs).sort(),
        };
    }, [tree, isActive]);

    // Filter tree by employee name search and dropdown filters
    const filteredTree = useMemo(() => {
        if (isActive === false) return [];
        const q = debouncedSearchQuery.toLowerCase().trim();
        const isFiltering = filterEmployee !== 'all' || filterNnh !== 'all' || filterNhomHang !== 'all' || filterHang !== 'all' || q !== '';
        
        const filterNodes = (nodes: DetailNode[]): DetailNode[] => {
            return nodes.reduce<DetailNode[]>((acc, node) => {
                const cloned = { ...node };
                
                // Recursively filter children first
                if (cloned.children && cloned.children.length > 0) {
                    cloned.children = filterNodes(cloned.children);
                }
                
                let keep = true;
                
                // Apply Dropdown Filters
                if (cloned.level === 'employee') {
                    if (filterEmployee !== 'all' && cloned.name !== filterEmployee) keep = false;
                    if (q && !cloned.name.toLowerCase().includes(q)) keep = false;
                }
                if (cloned.level === 'nnh' && filterNnh !== 'all' && cloned.name !== filterNnh) keep = false;
                if (cloned.level === 'nhomHang' && filterNhomHang !== 'all' && cloned.name !== filterNhomHang) keep = false;
                if (cloned.level === 'hang' && filterHang !== 'all' && cloned.name !== filterHang) keep = false;
                
                // If a structural node loses all its children due to active filtering, drop it
                if (isFiltering && ['department', 'employee', 'nnh', 'nhomHang'].includes(cloned.level) && cloned.children.length === 0) {
                    keep = false;
                }
                
                if (keep) {
                    // Update structural parent totals based on remaining filtered children
                    if (isFiltering && cloned.children && cloned.children.length > 0 && ['department', 'employee', 'nnh', 'nhomHang'].includes(cloned.level)) {
                        let totalDtlk = 0;
                        let totalDtqd = 0;
                        let totalSoLuong = 0;
                        for (const c of cloned.children) {
                            totalDtlk += c.dtlk;
                            totalDtqd += c.dtqd;
                            totalSoLuong += c.soLuong;
                        }
                        cloned.dtlk = totalDtlk;
                        cloned.dtqd = totalDtqd;
                        cloned.soLuong = totalSoLuong;
                        cloned.donGia = totalSoLuong > 0 ? (totalDtqd / totalSoLuong) : 0;
                        cloned.hieuQuaQD = totalDtlk > 0 ? (totalDtqd - totalDtlk) / totalDtlk : 0;
                    }
                    acc.push(cloned);
                }
                return acc;
            }, []);
        };
        return filterNodes(tree);
    }, [tree, debouncedSearchQuery, filterEmployee, filterNnh, filterNhomHang, filterHang, isActive]);

    // Auto-expand searched employees
    const displayTree = useMemo(() => {
        if (isActive === false) return { tree: [], expanded: new Set<string>() };
        if (debouncedSearchQuery.trim()) {
            // Auto expand all when searching
            const keys = new Set<string>();
            const walk = (nodes: DetailNode[], prefix: string) => {
                nodes.forEach((n, i) => {
                    const key = `${prefix}-${i}-${n.name}`;
                    if (n.children.length > 0) keys.add(key);
                    walk(n.children, key);
                });
            };
            walk(filteredTree, 'root');
            // Temporarily override expanded keys if searching
            return { tree: filteredTree, expanded: keys };
        }
        return { tree: filteredTree, expanded: expandedKeys };
    }, [filteredTree, debouncedSearchQuery, expandedKeys, isActive]);

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async () => {
        if (!cardRef.current) return;
        const blob = await exportElementAsImage(cardRef.current, `ChiTiet_${supermarketName}.png`, {
            mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component']
        });
        if (blob) await showExportOptions(blob, `ChiTiet_${supermarketName}.png`);
    };

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (!rawData) {
        return (
            <Card title="Chi Tiết Doanh Thu">
                <div className="py-12 text-center text-slate-500">
                    Chưa có dữ liệu. Vui lòng dán dữ liệu "BC Doanh thu theo NV" vào ô DOANH THU trong Cấu hình siêu thị.
                </div>
            </Card>
        );
    }

    if (tree.length === 0) {
        return (
            <Card title="Chi Tiết Doanh Thu">
                <div className="py-12 text-center text-slate-500">
                    Không thể phân tích dữ liệu. Header cần có: "Nhân viên  DTLK  DTQĐ  Hiệu quả QĐ  Số lượng  Đơn giá"
                </div>
            </Card>
        );
    }

    const renderRows = (nodes: DetailNode[], prefix: string, depth: number = 0): React.ReactNode[] => {
        const rows: React.ReactNode[] = [];
        nodes.forEach((node, idx) => {
            const key = `${prefix}-${idx}-${node.name}`;
            const hasChildren = node.children.length > 0;
            const isExpanded = displayTree.expanded.has(key);

            rows.push(
                <DetailRow
                    key={key}
                    node={node}
                    rowKey={key}
                    isExpanded={isExpanded}
                    toggleExpand={toggleExpand}
                    fInt={fInt}
                    f={f}
                />
            );

            // Render children if expanded
            if (hasChildren && isExpanded) {
                rows.push(...renderRows(node.children, key, depth + 1));
            }
        });
        return rows;
    };

    return (
        <div className="space-y-0">
            {/* Thanh bar toolbar — giống tab THƯỞNG */}
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Filters */}
                    <SearchableSelect
                        value={filterNnh}
                        onChange={setFilterNnh}
                        options={filterOptions.nnhs}
                        placeholder="Tất cả Ngành hàng"
                        emptyText="Không tìm thấy"
                        widthClass="w-36"
                    />
                    <SearchableSelect
                        value={filterNhomHang}
                        onChange={setFilterNhomHang}
                        options={filterOptions.nhomHangs}
                        placeholder="Tất cả Nhóm hàng"
                        emptyText="Không tìm thấy"
                        widthClass="w-36"
                    />
                    <SearchableSelect
                        value={filterHang}
                        onChange={setFilterHang}
                        options={filterOptions.hangs}
                        placeholder="Tất cả Hãng"
                        emptyText="Không tìm thấy"
                        widthClass="w-36"
                    />
                    <SearchableSelect
                        value={filterEmployee}
                        onChange={setFilterEmployee}
                        options={filterOptions.employees}
                        placeholder="Tất cả Nhân viên"
                        emptyText="Không tìm thấy"
                        widthClass="w-36"
                    />
                    {/* Expand all button */}
                    <button
                        type="button"
                        onClick={handleExpandAll}
                        title="Mở rộng tất cả"
                        className="p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all rounded shadow-sm flex items-center justify-center"
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    {/* Collapse all button */}
                    <button
                        type="button"
                        onClick={handleCollapseAll}
                        title="Thu gọn tất cả"
                        className="p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all rounded shadow-sm flex items-center justify-center"
                    >
                        <ChevronsDownUp className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <ExportButton onExportPNG={handleExportPNG} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding rounded={false} title={
                    <div className="flex flex-col">
                        <span className="text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">Chi tiết Doanh Thu theo Ngành Hàng</span>
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-1">Bộ phận › Nhân viên › Ngành hàng › Nhóm hàng › Hãng</span>
                    </div>
                }>
                    <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full border-collapse min-w-[700px]">
                            <thead className="sticky top-0 z-20">
                                <tr className="text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-30 min-w-[260px]">
                                        Danh mục
                                    </th>
                                    <th className="px-2 py-3 text-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 border-r border-slate-200 dark:border-slate-700 min-w-[70px]">
                                        SL
                                    </th>
                                    <th className="px-2 py-3 text-right bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 border-r border-slate-200 dark:border-slate-700 min-w-[90px]">
                                        DTLK
                                    </th>
                                    <th className="px-2 py-3 text-right bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 border-r border-slate-200 dark:border-slate-700 min-w-[90px]">
                                        DTQĐ
                                    </th>
                                    <th className="px-2 py-3 text-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 border-r border-slate-200 dark:border-slate-700 min-w-[80px]">
                                        HQ QĐ
                                    </th>
                                    <th className="px-2 py-3 text-right bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 min-w-[80px]">
                                        Đơn giá
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1c1c1e]">
                                {renderRows(displayTree.tree, 'root')}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default React.memo(DetailTab);
