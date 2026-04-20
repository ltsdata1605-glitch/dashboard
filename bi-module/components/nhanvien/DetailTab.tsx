import React, { useState, useMemo, useRef } from 'react';
import { parseDetailDataV2, DetailNode } from '../../utils/detailDataParser';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import Card from '../Card';
import { SpinnerIcon, ChevronDownIcon } from '../Icons';
import { Search, ChevronRight } from 'lucide-react';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../services/uiService';

interface DetailTabProps {
    rawData: string;
    supermarketName: string;
    activeDepartments: string[];
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

const DetailTab: React.FC<DetailTabProps> = ({ rawData, supermarketName, activeDepartments }) => {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isAllExpanded, setIsAllExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const fullTree = useMemo(() => parseDetailDataV2(rawData), [rawData]);

    // Remove 'Tổng' level and filter departments by activeDepartments
    const tree = useMemo(() => {
        // Flatten: skip 'total' nodes, take their department children directly
        let departments: DetailNode[] = [];
        for (const node of fullTree) {
            if (node.level === 'total') {
                departments.push(...node.children);
            } else {
                departments.push(node);
            }
        }
        // Filter by active departments
        if (activeDepartments.length > 0) {
            departments = departments.filter(d => 
                d.level !== 'department' || activeDepartments.some(ad => d.name === ad)
            );
        }
        return departments;
    }, [fullTree, activeDepartments]);

    // Collect all expandable keys
    const allKeys = useMemo(() => {
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
    }, [tree]);

    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleExpandAll = () => {
        if (isAllExpanded) {
            setExpandedKeys(new Set());
            setIsAllExpanded(false);
        } else {
            setExpandedKeys(new Set(allKeys));
            setIsAllExpanded(true);
        }
    };

    // Filter tree by employee name search
    const filteredTree = useMemo(() => {
        if (!searchQuery.trim()) return tree;
        const q = searchQuery.toLowerCase().trim();
        
        const filterNodes = (nodes: DetailNode[]): DetailNode[] => {
            return nodes.reduce<DetailNode[]>((acc, node) => {
                // Match at employee level
                if (node.level === 'employee' && node.name.toLowerCase().includes(q)) {
                    acc.push(node);
                    return acc;
                }
                // For department-level (and above), recurse into children
                if (node.level === 'department' || node.level === 'total') {
                    const filteredChildren = filterNodes(node.children);
                    if (filteredChildren.length > 0) {
                        acc.push({ ...node, children: filteredChildren });
                    }
                }
                return acc;
            }, []);
        };
        return filterNodes(tree);
    }, [tree, searchQuery]);

    // Auto-expand searched employees
    const displayTree = useMemo(() => {
        if (searchQuery.trim()) {
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
    }, [filteredTree, searchQuery, expandedKeys]);

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async () => {
        if (!cardRef.current) return;
        const blob = await exportElementAsImage(cardRef.current, `ChiTiet_${supermarketName}.png`, {
            mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component']
        });
        if (blob) await showExportOptions(blob, `ChiTiet_${supermarketName}.png`);
    };

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
            const style = LEVEL_STYLES[node.level] || LEVEL_STYLES.hang;
            const hasChildren = node.children.length > 0;
            const isExpanded = displayTree.expanded.has(key);

            rows.push(
                <tr
                    key={key}
                    className={`${style.bg} ${style.border || ''} border-b border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                >
                    {/* Name column */}
                    <td className={`py-1.5 pr-3 ${style.text} ${style.font} ${style.size} whitespace-nowrap border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-inherit`}>
                        <div className="flex items-center" style={{ paddingLeft: `${style.indent + 8}px` }}>
                            {hasChildren ? (
                                <button
                                    onClick={() => toggleExpand(key)}
                                    className="mr-1.5 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
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
                            {node.hieuQuaQD.toFixed(2)}
                        </span>
                    </td>
                    {/* Số lượng */}
                    <td className={`px-2 py-1.5 text-center ${style.size} tabular-nums border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400`}>
                        {fInt.format(node.soLuong)}
                    </td>
                    {/* Đơn giá */}
                    <td className={`px-2 py-1.5 text-right ${style.size} tabular-nums text-slate-500 dark:text-slate-500`}>
                        {f.format(node.donGia)}
                    </td>
                </tr>
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
            <div ref={cardRef}>
                <Card noPadding rounded={false} title={
                    <div className="flex flex-col">
                        <span className="text-lg font-black uppercase text-slate-800 dark:text-white">Chi tiết Doanh Thu theo Ngành Hàng</span>
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Nhân viên › Ngành hàng › Nhóm hàng › Hãng</span>
                    </div>
                } actionButton={
                    <div className="flex items-center gap-2 no-print">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm nhân viên..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-[11px] w-40 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-sky-300 text-slate-700 dark:text-slate-300"
                            />
                        </div>
                        {/* Expand/Collapse all */}
                        <button
                            onClick={handleExpandAll}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-sky-600 hover:border-sky-300 transition-all"
                        >
                            {isAllExpanded ? 'Thu gọn' : 'Mở rộng'}
                        </button>
                        <ExportButton onExportPNG={handleExportPNG} />
                    </div>
                }>
                    <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full border-collapse min-w-[700px]">
                            <thead className="sticky top-0 z-20">
                                <tr className="text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-30 min-w-[260px]">
                                        Danh mục
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
                                    <th className="px-2 py-3 text-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-b-[3px] border-b-slate-300 dark:border-b-slate-600 border-r border-slate-200 dark:border-slate-700 min-w-[70px]">
                                        SL
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

export default DetailTab;
