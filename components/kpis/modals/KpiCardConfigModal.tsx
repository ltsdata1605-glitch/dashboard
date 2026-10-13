import React, { useState, useEffect, useRef } from 'react';
import { resolveIconName } from '../../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../../shared/ui/icon/AppIcon';
import type { KpiCardConfig, KpiMetricSource } from '../../../types';
import { Modal, useIsSheetWidth } from '../../shared/ui/Modal';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Tabs } from '../../shared/ui/Tabs';
import { Switch } from '../../shared/ui/Switch';
import { Banner } from '../../shared/ui/Banner';
import { ListGroup, ListRow } from '../../shared/ui/ListGroup';
import { ActionMenu } from '../../shared/ui/ActionMenu';
import { EmptyState } from '../../shared/ui/EmptyState';
import { useDashboardContext } from '../../../contexts/DashboardContext';
import { getRowValue } from '../../../utils/dataUtils';
import { COL } from '../../../constants';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    configs: KpiCardConfig[];
    onSave: (newConfigs: KpiCardConfig[]) => void;
}

const AVAILABLE_METRICS: { value: KpiMetricSource; label: string; format: 'currency' | 'percentage' | 'number' }[] = [
    { value: 'doanhThuQD', label: 'Doanh Thu QĐ', format: 'currency' },
    { value: 'totalRevenue', label: 'Doanh Thu Thực', format: 'currency' },
    { value: 'traGopPercent', label: 'Tỉ Lệ Trả Chậm', format: 'percentage' },
    { value: 'hieuQuaQD', label: 'Hiệu Quả QĐ', format: 'percentage' },
    { value: 'doanhThuThucChoXuat', label: 'Doanh Thu Chờ Xuất', format: 'currency' },
];

const ICONS = ['wallet-cards', 'trending-up', 'receipt', 'fast-forward', 'shopping-bag', 'archive-restore', 'activity', 'dollar-sign', 'credit-card', 'percent'];
const COLORS = ['sky', 'emerald', 'amber', 'rose', 'slate'];
// Ánh xạ tên màu cũ (chỉ các giá trị iconColor mà picker cũ từng cho chọn) về palette
// semantic, để config người dùng đã lưu vẫn hiển thị đồng nhất sau khi đổi palette.
const COLOR_ALIAS: Record<string, string> = {
    blue: 'sky', teal: 'emerald', pink: 'rose', purple: 'slate', violet: 'slate', orange: 'amber', red: 'rose',
};
const normColor = (c: string): string => COLOR_ALIAS[c] || c;
// Tailwind safelist — các class dưới đây được dựng ĐỘNG từ tên màu (bg-${color}-...),
// liệt kê tường minh để JIT sinh ra, không bị purge:
// bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400
// bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400
// bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400
// bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400
// bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400

const KpiCardConfigModal: React.FC<Props> = ({ isOpen, onClose, configs, onSave }) => {
    const { uniqueFilterOptions, productConfig, originalData } = useDashboardContext();
    const [editingCard, setEditingCard] = useState<KpiCardConfig | null>(null);
    const [activeTab, setActiveTab] = useState<'metric' | 'data' | 'calculated'>('metric');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const isSheet = useIsSheetWidth();

    const { allIndustries, allSubgroups, allManufacturers } = React.useMemo(() => {
        if (!productConfig || !originalData) return { allIndustries: [], allSubgroups: [], allManufacturers: [] };
        
        const industries = new Set<string>();
        if (productConfig.childToParentMap) {
            Object.values(productConfig.childToParentMap).forEach(v => {
                if (v && v !== 'Không tính doanh thu') {
                    industries.add(v as string);
                }
            });
        }

        const subgroups = new Set<string>();
        if (productConfig.subgroups) {
            Object.entries(productConfig.subgroups).forEach(([parentKey, parent]) => {
                if (parentKey !== 'Không tính doanh thu') {
                    Object.keys(parent).forEach(subgroup => {
                        if (subgroup !== 'Không tính doanh thu') {
                            subgroups.add(subgroup);
                        }
                    });
                }
            });
        }
        
        const manufacturers = new Set<string>(originalData.map(row => String(getRowValue(row, COL.MANUFACTURER) || '')).filter(Boolean));
        
        return {
            allIndustries: Array.from(industries).sort(),
            allSubgroups: Array.from(subgroups).sort(),
            allManufacturers: Array.from(manufacturers).sort()
        };
    }, [productConfig, originalData]);

    const [internalConfigs, setInternalConfigs] = useState<KpiCardConfig[]>([]);
    const internalConfigsRef = useRef<KpiCardConfig[]>(internalConfigs);
    useEffect(() => {
        internalConfigsRef.current = internalConfigs;
    }, [internalConfigs]);

    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            const initial = JSON.parse(JSON.stringify(configs));
            setInternalConfigs(initial);
            internalConfigsRef.current = initial;
            setEditingCard(null);
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, configs]);

    const updateConfigsAndSave = (updater: (prev: KpiCardConfig[]) => KpiCardConfig[]) => {
        const next = updater(internalConfigsRef.current);
        internalConfigsRef.current = next;
        setInternalConfigs(next);
        onSave(next);
    };

    const handleSave = () => {
        onSave(internalConfigsRef.current);
        onClose();
    };

    const toggleVisibility = (id: string) => {
        updateConfigsAndSave(prev => prev.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
    };

    const moveCard = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === internalConfigsRef.current.length - 1)) return;
        updateConfigsAndSave(prev => {
            const newConfigs = [...prev];
            const temp = newConfigs[index];
            const swapIndex = direction === 'up' ? index - 1 : index + 1;
            newConfigs[index] = newConfigs[swapIndex];
            newConfigs[swapIndex] = temp;
            newConfigs.forEach((c, i) => c.order = i + 1);
            return newConfigs;
        });
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        updateConfigsAndSave(prev => {
            const newConfigs = [...prev];
            const draggedItem = newConfigs[draggedIndex];
            newConfigs.splice(draggedIndex, 1);
            newConfigs.splice(dropIndex, 0, draggedItem);
            newConfigs.forEach((c, i) => c.order = i + 1);
            return newConfigs;
        });
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const addNewCard = () => {
        const newCard: KpiCardConfig = {
            id: `kpi-custom-${Date.now()}`,
            order: internalConfigsRef.current.length + 1,
            isVisible: true,
            title: 'Thẻ Mới',
            icon: 'activity',
            iconColor: 'sky',
            type: 'metric',
            metric: 'doanhThuQD',
            format: 'currency',
            hasTarget: false,
            targetType: 'none',
            dataFilters: {
                selectedIndustries: [],
                selectedSubgroups: [],
                selectedManufacturers: [],
                metricType: 'revenue'
            }
        };
        updateConfigsAndSave(prev => [...prev, newCard]);
        setEditingCard(newCard);
        setActiveTab('metric');
    };

    const updateEditingCard = (updates: Partial<KpiCardConfig>) => {
        if (!editingCard) return;
        
        let newUpdates = { ...updates };
        // auto update format if metric changes
        if (updates.metric && editingCard.type === 'metric') {
            const m = AVAILABLE_METRICS.find(x => x.value === updates.metric);
            if (m) newUpdates.format = m.format;
        }

        const updated = { ...editingCard, ...newUpdates };
        setEditingCard(updated);
        updateConfigsAndSave(prev => prev.map(c => c.id === updated.id ? updated : c));
    };

    const toggleArrayFilter = (filterKey: 'selectedIndustries' | 'selectedSubgroups' | 'selectedManufacturers', value: string) => {
        if (!editingCard || editingCard.type !== 'data') return;
        
        const currentFilters = editingCard.dataFilters?.[filterKey] || [];
        const newFilters = currentFilters.includes(value) 
            ? currentFilters.filter(v => v !== value) 
            : [...currentFilters, value];
            
        updateEditingCard({
            dataFilters: {
                ...editingCard.dataFilters,
                metricType: editingCard.dataFilters?.metricType || 'revenue',
                [filterKey]: newFilters
            }
        });
    };

    const deleteCard = (id: string) => {
        updateConfigsAndSave(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })));
        if (editingCard?.id === id) setEditingCard(null);
    };

    const nhanNguon = (config: KpiCardConfig) => (config.type === 'metric' || !config.type
        ? AVAILABLE_METRICS.find(m => m.value === config.metric)?.label
        : config.type === 'data' ? 'Bộ lọc tuỳ biến' : 'Công thức');

    // Ô icon màu của thẻ (dùng ở cả danh sách iPhone lẫn laptop).
    const oIcon = (config: KpiCardConfig, lon = false) => (
        <span className={`${lon ? 'w-8 h-8' : 'w-7 h-7'} rounded-control flex items-center justify-center shrink-0 bg-${normColor(config.iconColor)}-100 text-${normColor(config.iconColor)}-600 dark:bg-${normColor(config.iconColor)}-500/20 dark:text-${normColor(config.iconColor)}-400`}>
            <AppIcon name={resolveIconName(config.icon) ?? 'help'} size="md" />
        </span>
    );

    const nhanTruong = 'block text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1.5';

    // ===== Trình sửa một thẻ (laptop: cột phải; iPhone: màn chi tiết đẩy sang) =====
    const trinhSua = editingCard && (
        <div className="space-y-5">
            <div>
                <label className={nhanTruong}>Tiêu đề hiển thị</label>
                <Input
                    type="text"
                    value={editingCard.title}
                    onChange={e => updateEditingCard({ title: e.target.value })}
                    className="w-full"
                    placeholder="Vd: Doanh thu tháng…"
                />
            </div>

            <div>
                <span className={nhanTruong}>Kiểu thẻ</span>
                <Tabs
                    variant="segment"
                    fullWidth
                    activeId={editingCard.type || 'metric'}
                    onChange={(id) => {
                        const tab = id as 'metric' | 'data' | 'calculated';
                        setActiveTab(tab);
                        updateEditingCard({ type: tab });
                    }}
                    items={[
                        { id: 'metric', label: 'Chỉ số gốc' },
                        { id: 'data', label: 'Tạo dữ liệu' },
                        { id: 'calculated', label: 'Công thức' },
                    ]}
                />
            </div>

            {/* Chỉ số gốc */}
            {(!editingCard.type || editingCard.type === 'metric') && (
                <div>
                    <span className={nhanTruong}>Nguồn dữ liệu</span>
                    <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_METRICS.map(m => (
                            <Button
                                variant="unstyled" size="none"
                                key={m.value}
                                onClick={() => updateEditingCard({ metric: m.value })}
                                aria-pressed={editingCard.metric === m.value}
                                className={`justify-start min-h-10 pointer-coarse:min-h-11 px-3 py-2 text-left rounded-control border text-sm transition-colors ${editingCard.metric === m.value ? 'bg-sky-50 border-sky-300 text-sky-700 font-medium dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'}`}
                            >
                                {m.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tạo dữ liệu */}
            {editingCard.type === 'data' && (
                <div className="space-y-4">
                    <Banner tone="info">Thẻ này lọc dữ liệu trên danh sách đơn hàng của Kho đang chọn.</Banner>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div>
                                <label className={nhanTruong}>Loại chỉ số</label>
                                <Select
                                    value={editingCard.dataFilters?.metricType || 'revenue'}
                                    onChange={(e) => updateEditingCard({ dataFilters: { ...editingCard.dataFilters, metricType: e.target.value as 'quantity' | 'revenue' | 'revenueQD' }})}
                                >
                                    <option value="revenue">Tổng doanh thu thực</option>
                                    <option value="revenueQD">Tổng doanh thu QĐ</option>
                                    <option value="quantity">Tổng số lượng</option>
                                </Select>
                            </div>
                            <div>
                                <label className={nhanTruong}>Định dạng số liệu</label>
                                <Select
                                    value={editingCard.format}
                                    onChange={(e) => updateEditingCard({ format: e.target.value as 'currency' | 'percentage' | 'number' })}
                                >
                                    <option value="currency">Tiền tệ (VNĐ)</option>
                                    <option value="number">Số thông thường</option>
                                    <option value="percentage">Phần trăm (%)</option>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <MultiSelectDropdown
                                label="Lọc theo ngành hàng"
                                options={allIndustries}
                                selected={editingCard.dataFilters?.selectedIndustries || []}
                                onChange={(sel) => updateEditingCard({
                                    dataFilters: {
                                        ...editingCard.dataFilters,
                                        metricType: editingCard.dataFilters?.metricType || 'revenue',
                                        selectedIndustries: sel
                                    }
                                })}
                                variant="compact"
                            />
                            <MultiSelectDropdown
                                label="Lọc theo nhóm hàng"
                                options={allSubgroups}
                                selected={editingCard.dataFilters?.selectedSubgroups || []}
                                onChange={(sel) => updateEditingCard({
                                    dataFilters: {
                                        ...editingCard.dataFilters,
                                        metricType: editingCard.dataFilters?.metricType || 'revenue',
                                        selectedSubgroups: sel
                                    }
                                })}
                                variant="compact"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Công thức: Thẻ 1 [phép tính] Thẻ 2 — iPhone xếp dọc (3 ô chen một hàng 351px thì tên thẻ bị cắt cụt). */}
            {editingCard.type === 'calculated' && (
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Select
                            aria-label="Thẻ thứ nhất"
                            value={editingCard.operand1_cardId || ''}
                            onChange={(e) => updateEditingCard({ operand1_cardId: e.target.value })}
                            className="sm:flex-1"
                        >
                            <option value="" disabled>Chọn thẻ thứ nhất</option>
                            {internalConfigs.filter(c => c.id !== editingCard.id).map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </Select>
                        <Select
                            aria-label="Phép tính"
                            value={editingCard.operation || '+'}
                            onChange={(e) => updateEditingCard({ operation: e.target.value as '+' | '-' | '*' | '/' })}
                            className="sm:w-20 text-center font-semibold"
                        >
                            <option value="+">+ cộng</option>
                            <option value="-">− trừ</option>
                            <option value="*">× nhân</option>
                            <option value="/">÷ chia</option>
                        </Select>
                        <Select
                            aria-label="Thẻ thứ hai"
                            value={editingCard.operand2_cardId || ''}
                            onChange={(e) => updateEditingCard({ operand2_cardId: e.target.value })}
                            className="sm:flex-1"
                        >
                            <option value="" disabled>Chọn thẻ thứ hai</option>
                            {internalConfigs.filter(c => c.id !== editingCard.id).map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="sm:w-48">
                        <label className={nhanTruong}>Định dạng hiển thị</label>
                        <Select
                            value={editingCard.format}
                            onChange={(e) => updateEditingCard({ format: e.target.value as 'currency' | 'percentage' | 'number' })}
                        >
                            <option value="percentage">Phần trăm (%)</option>
                            <option value="currency">Tiền VNĐ</option>
                            <option value="number">Số</option>
                        </Select>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                    <span className={nhanTruong}>Biểu tượng</span>
                    <div className="flex flex-wrap gap-2">
                        {ICONS.map(icon => (
                            <Button
                                variant="unstyled" size="none"
                                key={icon}
                                onClick={() => updateEditingCard({ icon })}
                                aria-label={`Biểu tượng ${icon}`}
                                aria-pressed={editingCard.icon === icon}
                                className={`w-10 h-10 sm:w-9 sm:h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-control flex items-center justify-center border transition-colors ${editingCard.icon === icon ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                            >
                                <AppIcon name={resolveIconName(icon) ?? 'help'} size="md" />
                            </Button>
                        ))}
                    </div>
                </div>
                <div>
                    <span className={nhanTruong}>Màu sắc</span>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map(color => (
                            <Button
                                variant="unstyled" size="none"
                                key={color}
                                onClick={() => updateEditingCard({ iconColor: color })}
                                aria-label={`Màu ${color}`}
                                aria-pressed={normColor(editingCard.iconColor) === color}
                                className={`w-10 h-10 sm:w-9 sm:h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full flex items-center justify-center transition-shadow bg-${color}-100 text-${color}-600 dark:bg-${color}-500/20 dark:text-${color}-400 ${normColor(editingCard.iconColor) === color ? 'ring-2 ring-offset-2 ring-sky-500' : ''}`}
                            >
                                {normColor(editingCard.iconColor) === color && <AppIcon name="check" size="md" />}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <ListGroup footer={editingCard.hasTarget ? 'Tự hiện thanh tiến độ, tính % đạt và đổi màu trạng thái.' : undefined}>
                <ListRow
                    label="Mục tiêu tháng"
                    trailing={(
                        <Switch
                            checked={!!editingCard.hasTarget}
                            onChange={(on) => updateEditingCard({ hasTarget: on, targetType: on ? 'custom' : 'none', customTargetValue: editingCard.customTargetValue || 0 })}
                            label="Mục tiêu tháng"
                        />
                    )}
                />
                {editingCard.hasTarget && (
                    <div className="px-4 pb-3 pt-1">
                        <label className={nhanTruong}>Chỉ tiêu ({editingCard.format === 'percentage' ? '%' : 'VNĐ'})</label>
                        <Input
                            type="number" inputMode="decimal"
                            value={editingCard.customTargetValue ?? ''}
                            onChange={(e) => updateEditingCard({ customTargetValue: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder={editingCard.format === 'percentage' ? 'Ví dụ: 80' : 'Ví dụ: 10000000'}
                        />
                    </div>
                )}
            </ListGroup>
        </div>
    );

    const chuaChon = (
        <EmptyState
            icon="template"
            title="Chưa chọn thẻ"
            description="Bấm vào một thẻ bên trái để đổi tiêu đề, nguồn dữ liệu và màu."
        />
    );

    // ===== iPhone: danh sách ⇄ màn chi tiết (một cột) =====
    // Lỗi #5 (video v1:101–108): sheet điện thoại chia 2 cột 30/70 → cột trái chỉ còn icon, cột phải tràn ngang ("Xóa the" bị cắt).
    // Nay danh sách chiếm trọn bề ngang; chạm thẻ thì đẩy sang màn chi tiết có nút ‹ quay lại. Kéo-thả HTML5 không chạy trên
    // iOS → đổi thứ tự bằng nút "⋯" (Đưa lên / Đưa xuống).
    const danhSachDienThoai = (
        <div className="space-y-4">
            <ListGroup title="Thứ tự hiển thị" footer="Tắt công tắc để ẩn thẻ khỏi dãy KPI. Đổi thứ tự bằng nút ⋯.">
                {internalConfigs.map((config, i) => (
                    <div key={config.id} className="ycx-list-row ycx-list-row--icon relative flex items-center gap-2 pl-4 pr-1 min-h-14">
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setEditingCard(config)}
                            className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
                        >
                            {oIcon(config, true)}
                            <span className="min-w-0 flex-1">
                                <span className={`block text-[15px] leading-5 truncate ${config.isVisible ? 'text-slate-900' : 'text-slate-400'}`}>{config.title}</span>
                                <span className="block text-[13px] leading-[18px] text-slate-500 truncate">{nhanNguon(config)}</span>
                            </span>
                            <AppIcon name="chevronRight" size="md" className="shrink-0 text-slate-300" />
                        </Button>
                        <Switch
                            checked={config.isVisible}
                            onChange={() => toggleVisibility(config.id)}
                            label={`Hiện thẻ ${config.title}`}
                        />
                        <ActionMenu
                            label={`Thao tác thẻ ${config.title}`}
                            title={config.title}
                            items={[
                                { id: 'up', label: 'Đưa lên trên', icon: 'arrowUp', disabled: i === 0, onSelect: () => moveCard(i, 'up') },
                                { id: 'down', label: 'Đưa xuống dưới', icon: 'arrowDown', disabled: i === internalConfigs.length - 1, onSelect: () => moveCard(i, 'down') },
                                { id: 'delete', label: 'Xoá thẻ', icon: 'delete', destructive: true, section: 'nguy-hiem', onSelect: () => deleteCard(config.id) },
                            ]}
                        />
                    </div>
                ))}
            </ListGroup>
            <ListGroup>
                <ListRow icon="add" iconTone="sky" label="Thêm thẻ mới" onClick={addNewCard} chevron={false} />
            </ListGroup>
        </div>
    );

    const chiTietDienThoai = editingCard && (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 -mt-1">
                <Button variant="unstyled" size="none" onClick={() => setEditingCard(null)}
                    className="flex items-center gap-0.5 min-h-11 -ml-2 pr-2 text-[17px] text-sky-600 active:opacity-60">
                    <AppIcon name="chevronLeft" size="lg" />
                    Danh sách thẻ
                </Button>
                <Button variant="ghost" size="sm" icon="delete" onClick={() => deleteCard(editingCard.id)} className="text-rose-600 hover:bg-rose-50">
                    Xoá thẻ
                </Button>
            </div>
            {trinhSua}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            position="bottom"
            onClose={onClose}
            title="Dãy thẻ KPI"
            subTitle="Chọn thẻ, thứ tự và cách tính • Tự động lưu Firebase"
            maxWidth="xl"
            primaryAction={{ label: 'Hoàn tất', onClick: handleSave }}
        >
            {isSheet ? (
                editingCard ? chiTietDienThoai : danhSachDienThoai
            ) : (
                <div className="modal-bleed flex divide-x divide-slate-200 dark:divide-slate-700 h-[600px] max-h-[65vh] overflow-hidden">
                    {/* Laptop — trái: danh sách (kéo-thả để đổi thứ tự) */}
                    <div className="w-1/3 min-w-0 flex flex-col bg-slate-50 dark:bg-slate-800/50">
                        <div className="px-4 h-14 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900">
                            <h3 className="type-subhead font-semibold text-slate-800 dark:text-white">Thứ tự hiển thị</h3>
                            <Button variant="tinted" size="sm" icon="add" onClick={addNewCard}>Thêm</Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 relative">
                            {internalConfigs.map((config, i) => (
                                <div
                                    key={config.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, i)}
                                    onDragOver={(e) => handleDragOver(e, i)}
                                    onDrop={(e) => handleDrop(e, i)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-control border ${editingCard?.id === config.id ? 'border-sky-500 shadow-sm' : 'border-slate-200 dark:border-slate-800'} ${draggedIndex === i ? 'opacity-50 ring-2 ring-sky-500' : ''} transition-colors cursor-pointer hover:border-sky-300`}
                                    onClick={() => setEditingCard(config)}
                                >
                                    <span className="flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-sky-700" aria-hidden="true">
                                        <AppIcon name="dragHandle" size="md" />
                                    </span>
                                    {oIcon(config)}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-semibold text-sm truncate ${config.isVisible ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{config.title}</h4>
                                        <p className="text-[12px] text-slate-500 truncate">{nhanNguon(config)}</p>
                                    </div>
                                    <Button variant="unstyled" size="none" onClick={(e) => { e.stopPropagation(); toggleVisibility(config.id); }} aria-label={config.isVisible ? 'Ẩn thẻ' : 'Hiện thẻ'} title={config.isVisible ? 'Ẩn thẻ' : 'Hiện thẻ'} className={`p-1.5 rounded-control ${config.isVisible ? 'text-sky-700 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                        <AppIcon name={config.isVisible ? 'show' : 'hide'} size="md" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Laptop — phải: chi tiết thẻ */}
                    <div className="w-2/3 min-w-0 flex flex-col bg-white dark:bg-slate-900">
                        <div className="px-5 h-14 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <h3 className="type-subhead font-semibold text-slate-700 dark:text-slate-300 truncate">{editingCard ? 'Chi tiết thẻ' : 'Chọn một thẻ để tuỳ chỉnh'}</h3>
                            {editingCard && (
                                <Button variant="ghost" size="sm" icon="delete" onClick={() => deleteCard(editingCard.id)} className="ml-auto text-rose-600 hover:bg-rose-50">
                                    Xoá thẻ
                                </Button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            {editingCard ? trinhSua : chuaChon}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default KpiCardConfigModal;
