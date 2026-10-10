import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { useAuth } from '../../../contexts/AuthContext';
import type { ProductConfig } from '../../../types';
import {
    getGlobalProductConfig,
    saveGlobalProductConfig,
    parseExcelProductConfigFile,
    parseExcelProductCodeConfigFile,
    exportProductConfigToExcel,
    exportProductCodeConfigToExcel,
    computeConfigSummary,
} from '../services/firebaseProductConfigService';
import { ConfigTable } from './ConfigTable';
import { ProductCodeConfigTable } from './ProductCodeConfigTable';
import type { CategoryTableItem, ProductCodeTableItem, ProductConfigSummary } from '../types';
import * as dbService from '../../../services/dbService';

export const ProductConfigManagerTab: React.FC = () => {
    const { user, userRole, departmentId } = useAuth();
    const [config, setConfig] = useState<ProductConfig | null>(null);
    const [summary, setSummary] = useState<ProductConfigSummary | null>(null);
    const [configType, setConfigType] = useState<'category' | 'productCode'>('category');
    const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
    const [updatedBy, setUpdatedBy] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // CHỈ Super Admin mới có quyền thêm, sửa, xoá và lưu cấu hình
    const isSuperAdmin = Boolean(
        user?.email === 'lts.truongson@gmail.com' ||
        (userRole === 'admin' && (departmentId || '').startsWith('ALL (Super Admin)'))
    );
    const isCanManage = isSuperAdmin;

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            // 1. Đọc từ Firestore toàn cục
            const cloudDoc = await getGlobalProductConfig();
            if (cloudDoc) {
                setConfig(cloudDoc.config);
                setSummary(cloudDoc.summary || computeConfigSummary(cloudDoc.config));
                setUpdatedAt(cloudDoc.updatedAt);
                setUpdatedBy(cloudDoc.updatedBy);
                setIsDirty(false);
                setIsLoading(false);
                return;
            }

            // 2. Dự phòng: đọc từ IndexedDB cache của máy hiện tại
            const localConfigEntry = await dbService.getProductConfig();
            if (localConfigEntry?.config && Object.keys(localConfigEntry.config.groups || {}).length > 0) {
                setConfig(localConfigEntry.config);
                setSummary(computeConfigSummary(localConfigEntry.config));
                setUpdatedAt(new Date().toISOString());
                setUpdatedBy('Bộ nhớ cục bộ');
                setIsDirty(true);
                return;
            }
        } catch (err) {
            console.error('[ProductConfigManagerTab] Lỗi nạp cấu hình:', err);
            toast.error('Không thể nạp cấu hình ngành hàng');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const tableItems = useMemo<CategoryTableItem[]>(() => {
        if (!config) return [];

        // Ưu tiên 1: Dùng danh sách chuẩn nguyên gốc từ file (đúng thứ tự, đủ 5 cột)
        if (config.originalCategoryItems && config.originalCategoryItems.length > 0) {
            return config.originalCategoryItems.map(item => ({
                code: item.nhomHang,
                industry: item.industry,
                parentGroup: item.nhomCha,
                subgroup: item.nhomCon,
                multiplier: item.heSoQuyDoi ?? config.quantityMultiplierMap?.[item.nhomHang] ?? 1,
                vasMultiplier: config.vasMultiplierMap?.[item.nhomHang],
            }));
        }

        // Ưu tiên 2: Fallback cho cấu hình cũ chỉ có map
        if (!config.childToParentMap) return [];
        const industryMap = config.childToIndustryMap || {};
        const allKeys = Object.keys(config.childToParentMap);

        // Lọc bỏ các key phụ sinh ra từ regex (như "10", "12") nếu đã có key đầy đủ "10 - ..."
        const uniqueCodes = allKeys.filter(code => {
            if (/^\d+$/.test(code)) {
                const hasDetailedCode = allKeys.some(k => k !== code && k.startsWith(`${code} -`));
                if (hasDetailedCode) return false;
            }
            if (code === code.toLowerCase() && allKeys.some(k => k !== code && k.toLowerCase() === code)) {
                return false;
            }
            return true;
        });

        return uniqueCodes.map(code => ({
            code,
            industry: industryMap[code],
            parentGroup: config.childToParentMap[code] || '',
            subgroup: config.childToSubgroupMap?.[code] || '',
            multiplier: config.quantityMultiplierMap?.[code] ?? 1,
            vasMultiplier: config.vasMultiplierMap?.[code],
        }));
    }, [config]);

    const productCodeTableItems = useMemo<ProductCodeTableItem[]>(() => {
        if (!config || !config.productCodeItems) return [];
        return config.productCodeItems.map(item => ({
            maSanPham: item.maSanPham,
            tenSanPham: item.tenSanPham,
            heSo: item.heSo,
            loai: item.loai,
            nhom: item.nhom,
            sheetSource: item.sheetSource,
        }));
    }, [config]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!isCanManage) {
            toast.error('Chỉ Super Admin mới có quyền tải file cấu hình lên.');
            return;
        }
        const toastId = toast.loading('Đang đọc file cấu hình Excel...');
        try {
            if (configType === 'productCode') {
                const importedItems = await parseExcelProductCodeConfigFile(file);
                mutateConfig(cfg => {
                    const existingMap = new Map((cfg.productCodeItems || []).map(item => [item.maSanPham, item]));
                    importedItems.forEach(item => {
                        existingMap.set(item.maSanPham, item);
                        cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [item.maSanPham]: item.heSo };
                        if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                        cfg.vasMultiplierMap[item.maSanPham] = item.heSo;
                        if (item.tenSanPham) {
                            if (!cfg.vasNameMultiplierMap) cfg.vasNameMultiplierMap = {};
                            cfg.vasNameMultiplierMap[item.tenSanPham] = item.heSo;
                        }
                    });
                    cfg.productCodeItems = Array.from(existingMap.values());
                });
                toast.success(`Đã nhập thành công ${importedItems.length} mã sản phẩm từ Excel!`, { id: toastId });
            } else {
                const parsedConfig = await parseExcelProductConfigFile(file);
                if ((!parsedConfig.productCodeItems || parsedConfig.productCodeItems.length === 0) && config?.productCodeItems) {
                    parsedConfig.productCodeItems = config.productCodeItems;
                }
                setConfig(parsedConfig);
                setSummary(computeConfigSummary(parsedConfig));
                setUpdatedAt(new Date().toISOString());
                setUpdatedBy(user?.displayName || user?.email || 'Quản lý');
                setIsDirty(true);
                toast.success('Đã tải và nhận diện thành công file cấu hình ngành hàng!', { id: toastId });
            }
        } catch (err) {
            console.error('[ProductConfigManagerTab] Lỗi đọc file Excel:', err);
            toast.error((err as Error).message || 'Không thể đọc file Excel', { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveToCloud = async () => {
        if (!config) return;
        if (!isCanManage) {
            toast.error('Chỉ Super Admin mới có quyền lưu cấu hình ngành hàng lên Cloud.');
            return;
        }
        setIsSaving(true);
        const toastId = toast.loading('Đang lưu cấu hình lên Firebase Firestore...');
        try {
            await saveGlobalProductConfig(config, user);
            await dbService.saveProductConfig(config, 'cloud://global_product_config');
            window.dispatchEvent(new CustomEvent('ycx-product-config-changed', { detail: config }));
            setIsDirty(false);
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            toast.success('Đã lưu cấu hình thành công lên Cloud toàn hệ thống!', { id: toastId });
        } catch (err) {
            console.error('[ProductConfigManagerTab] Lỗi lưu cấu hình:', err);
            toast.error('Lỗi khi lưu cấu hình lên Firebase: ' + (err as Error).message, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportExcel = async () => {
        if (!config) return;
        const toastId = toast.loading('Đang tạo file Excel...');
        try {
            if (configType === 'productCode') {
                await exportProductCodeConfigToExcel(config.productCodeItems || []);
                toast.success('Đã tải xuống file Excel cấu hình mã sản phẩm thành công!', { id: toastId });
            } else {
                await exportProductConfigToExcel(config);
                toast.success('Đã tải xuống file Excel cấu hình ngành hàng thành công!', { id: toastId });
            }
        } catch (err) {
            console.error('[ProductConfigManagerTab] Lỗi xuất file:', err);
            toast.error('Không thể xuất file Excel: ' + (err as Error).message, { id: toastId });
        }
    };

    const mutateConfig = useCallback((fn: (cfg: ProductConfig) => void) => {
        if (!isCanManage) {
            toast.error('Chỉ Super Admin mới có quyền chỉnh sửa cấu hình ngành hàng.');
            return;
        }
        setConfig(prev => {
            if (!prev) return prev;
            const next = { ...prev };
            fn(next);
            setSummary(computeConfigSummary(next));
            setUpdatedAt(new Date().toISOString());
            setUpdatedBy(user?.displayName || user?.email || 'Quản lý');
            setIsDirty(true);
            return next;
        });
    }, [user, isCanManage]);

    const handleAddItem = useCallback((item: CategoryTableItem) => {
        mutateConfig(cfg => {
            cfg.childToParentMap = { ...cfg.childToParentMap, [item.code]: item.parentGroup };
            cfg.childToSubgroupMap = { ...cfg.childToSubgroupMap, [item.code]: item.subgroup };
            cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [item.code]: item.multiplier };
            if (item.industry) {
                cfg.childToIndustryMap = { ...cfg.childToIndustryMap, [item.code]: item.industry };
            }
            const g = cfg.groups[item.parentGroup];
            if (g instanceof Set) g.add(item.code);
            else cfg.groups = { ...cfg.groups, [item.parentGroup]: new Set([item.code]) };
            if (!cfg.subgroups[item.parentGroup]) cfg.subgroups = { ...cfg.subgroups, [item.parentGroup]: {} };
            const sub = cfg.subgroups[item.parentGroup];
            if (!sub[item.subgroup]) sub[item.subgroup] = [];
            if (!sub[item.subgroup].includes(item.code)) sub[item.subgroup] = [...sub[item.subgroup], item.code];
        });
        toast.success(`Đã thêm mã ${item.code}`);
    }, [mutateConfig]);

    const handleUpdateItem = useCallback((code: string, updates: Partial<CategoryTableItem>) => {
        mutateConfig(cfg => {
            if (updates.parentGroup !== undefined) {
                cfg.childToParentMap = { ...cfg.childToParentMap, [code]: updates.parentGroup };
            }
            if (updates.subgroup !== undefined) {
                cfg.childToSubgroupMap = { ...cfg.childToSubgroupMap, [code]: updates.subgroup };
            }
            if (updates.multiplier !== undefined) {
                cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [code]: updates.multiplier };
            }
            if (updates.industry !== undefined) {
                cfg.childToIndustryMap = { ...cfg.childToIndustryMap, [code]: updates.industry };
            }
        });
    }, [mutateConfig]);

    const handleDeleteItem = useCallback((code: string) => {
        mutateConfig(cfg => {
            const { [code]: _p, ...restParent } = cfg.childToParentMap || {};
            cfg.childToParentMap = restParent;
            const { [code]: _s, ...restSub } = cfg.childToSubgroupMap || {};
            cfg.childToSubgroupMap = restSub;
            const { [code]: _m, ...restMult } = cfg.quantityMultiplierMap || {};
            cfg.quantityMultiplierMap = restMult;
            if (cfg.childToIndustryMap) {
                const { [code]: _i, ...restInd } = cfg.childToIndustryMap;
                cfg.childToIndustryMap = restInd;
            }
        });
        toast.success(`Đã xoá mã ${code}`);
    }, [mutateConfig]);

    const handleAddProductCodeItem = useCallback((item: ProductCodeTableItem) => {
        mutateConfig(cfg => {
            const list = cfg.productCodeItems ? [...cfg.productCodeItems] : [];
            list.unshift({
                maSanPham: item.maSanPham,
                tenSanPham: item.tenSanPham,
                heSo: item.heSo,
                loai: item.loai,
                nhom: item.nhom,
                sheetSource: item.sheetSource || 'Thủ công',
            });
            cfg.productCodeItems = list;
            cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [item.maSanPham]: item.heSo };
            if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
            cfg.vasMultiplierMap[item.maSanPham] = item.heSo;
            if (item.tenSanPham) {
                if (!cfg.vasNameMultiplierMap) cfg.vasNameMultiplierMap = {};
                cfg.vasNameMultiplierMap[item.tenSanPham] = item.heSo;
            }
        });
        toast.success(`Đã thêm mã sản phẩm ${item.maSanPham}`);
    }, [mutateConfig]);

    const handleUpdateProductCodeItem = useCallback((maSanPham: string, updates: Partial<ProductCodeTableItem>) => {
        mutateConfig(cfg => {
            if (!cfg.productCodeItems) return;
            cfg.productCodeItems = cfg.productCodeItems.map(item => {
                if (item.maSanPham === maSanPham) {
                    const next = { ...item, ...updates };
                    if (updates.heSo !== undefined) {
                        cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [maSanPham]: updates.heSo };
                        if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                        cfg.vasMultiplierMap[maSanPham] = updates.heSo;
                    }
                    if (updates.tenSanPham !== undefined && cfg.vasNameMultiplierMap && updates.heSo !== undefined) {
                        cfg.vasNameMultiplierMap[updates.tenSanPham] = updates.heSo;
                    }
                    return next;
                }
                return item;
            });
        });
        toast.success(`Đã cập nhật mã sản phẩm ${maSanPham}`);
    }, [mutateConfig]);

    const handleDeleteProductCodeItem = useCallback((maSanPham: string) => {
        mutateConfig(cfg => {
            if (cfg.productCodeItems) {
                cfg.productCodeItems = cfg.productCodeItems.filter(item => item.maSanPham !== maSanPham);
            }
            if (cfg.quantityMultiplierMap) {
                const { [maSanPham]: _, ...rest } = cfg.quantityMultiplierMap;
                cfg.quantityMultiplierMap = rest;
            }
            if (cfg.vasMultiplierMap) {
                const { [maSanPham]: _, ...rest } = cfg.vasMultiplierMap;
                cfg.vasMultiplierMap = rest;
            }
        });
        toast.success(`Đã xoá mã sản phẩm ${maSanPham}`);
    }, [mutateConfig]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-card border border-slate-200 shadow-sm">
                <AppIcon name="loading" size="hero" spin className="text-sky-500 mb-3" />
                <p className="text-xs font-semibold text-slate-500">Đang tải cấu hình ngành hàng từ Cloud...</p>
            </div>
        );
    }

    const formattedDate = updatedAt
        ? new Date(updatedAt).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          })
        : null;

    return (
        <div className="space-y-4">
            {/* Header thông tin cấu hình */}
            <div className="bg-white border border-slate-200 rounded-card p-3.5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center flex-wrap gap-2">
                            <AppIcon name="settings" size="md" className="text-sky-500" />
                            <span>Cấu Hình Ngành Hàng & Hệ Số Quy Đổi</span>
                            {isDirty && isCanManage && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase tracking-wider">
                                    Có thay đổi chưa lưu
                                </span>
                            )}
                            {!isCanManage && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold flex items-center gap-1">
                                    <AppIcon name="show" size="xs" />
                                    Chế độ xem (Chỉ Super Admin mới có quyền sửa & lưu)
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isCanManage
                                ? 'Quản lý toàn bộ nhóm cha, nhóm con, mã ngành hàng và hệ số quy đổi áp dụng trực tiếp cho toàn hệ thống.'
                                : 'Xem và tải file dữ liệu cấu hình ngành hàng, nhóm cha, nhóm con và hệ số quy đổi áp dụng toàn hệ thống.'}
                        </p>
                    </div>
                </div>

                {/* Thống kê inline + metadata */}
                {summary && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500 bg-slate-50 px-3.5 py-2 rounded-control border border-slate-200/80">
                        <span><strong className="text-slate-700 tabular-nums">{summary.parentGroupCount}</strong> nhóm cha</span>
                        <span className="text-slate-300">|</span>
                        <span><strong className="text-slate-700 tabular-nums">{summary.subgroupCount}</strong> nhóm con</span>
                        <span className="text-slate-300">|</span>
                        <span><strong className="text-slate-700 tabular-nums">{summary.categoryCodeCount}</strong> mã ngành hàng</span>
                        <span className="text-slate-300">|</span>
                        <span><strong className="text-slate-700 tabular-nums">{summary.productCodeCount ?? productCodeTableItems.length}</strong> mã sản phẩm</span>
                        <span className="text-slate-300">|</span>
                        <span><strong className="text-slate-700 tabular-nums">{summary.multiplierCount}</strong> hệ số quy đổi</span>
                        <span className="ml-auto flex items-center gap-3">
                            {formattedDate && (
                                <span className="flex items-center gap-1">
                                    <AppIcon name="clock" size="xs" className="text-slate-400" />
                                    {formattedDate}
                                </span>
                            )}
                            {updatedBy && (
                                <span className="flex items-center gap-1">
                                    <AppIcon name="user" size="xs" className="text-slate-400" />
                                    {updatedBy}
                                </span>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Hàng Tab điều hướng & Cụm 3 nút chức năng (Icon-only) nằm cùng dòng */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                {/* Dạng Tab: Khai báo ngành hàng & Cấu hình theo Mã sản phẩm */}
                <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setConfigType('category')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                            configType === 'category'
                                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/50'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                    >
                        <AppIcon name="table" size="xs" className={configType === 'category' ? 'text-sky-600' : 'text-slate-400'} />
                        <span>Khai báo ngành hàng</span>
                        <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                                configType === 'category'
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-slate-200/80 text-slate-600'
                            }`}
                        >
                            {tableItems.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setConfigType('productCode')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                            configType === 'productCode'
                                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/50'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                    >
                        <AppIcon name="template" size="xs" className={configType === 'productCode' ? 'text-sky-600' : 'text-slate-400'} />
                        <span>Cấu hình theo Mã sản phẩm</span>
                        <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                                configType === 'productCode'
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-slate-200/80 text-slate-600'
                            }`}
                        >
                            {productCodeTableItems.length}
                        </span>
                    </button>
                </div>

                {/* Cụm 3 nút chức năng gom gọn: Tải file Excel, Xuất Excel, Lưu (Chỉ để icon, không để text) */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {isCanManage && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title={configType === 'category' ? 'Tải file Excel (.xlsx) - Khai báo ngành hàng' : 'Tải file Excel (.xlsx) - Cấu hình theo mã sản phẩm'}
                            aria-label={configType === 'category' ? 'Tải file Excel (.xlsx) - Khai báo ngành hàng' : 'Tải file Excel (.xlsx) - Cấu hình theo mã sản phẩm'}
                            className="w-8.5 h-8.5 flex items-center justify-center rounded-lg border border-sky-200 text-sky-700 bg-sky-50/70 hover:bg-sky-100 hover:border-sky-300 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                        >
                            <AppIcon name="upload" size="sm" />
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={!config}
                        onClick={handleExportExcel}
                        title={configType === 'category' ? 'Xuất Excel - Khai báo ngành hàng' : 'Xuất Excel - Cấu hình theo mã sản phẩm'}
                        aria-label={configType === 'category' ? 'Xuất Excel - Khai báo ngành hàng' : 'Xuất Excel - Cấu hình theo mã sản phẩm'}
                        className="w-8.5 h-8.5 flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                    >
                        <AppIcon name="download" size="sm" />
                    </button>

                    {isCanManage && (
                        <button
                            type="button"
                            disabled={!config || isSaving}
                            onClick={handleSaveToCloud}
                            title={isDirty ? 'Lưu lên Cloud Firebase (Có thay đổi chưa lưu)' : 'Lưu lên Cloud Firebase'}
                            aria-label="Lưu lên Cloud Firebase"
                            className={`w-8.5 h-8.5 flex items-center justify-center rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                                isDirty
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse border border-amber-500'
                                    : 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-600'
                            }`}
                        >
                            <AppIcon name={isSaving ? 'loading' : 'cloud'} size="sm" spin={isSaving} />
                        </button>
                    )}
                </div>
            </div>

            {/* Bảng tra cứu tương ứng */}
            {configType === 'category' ? (
                <ConfigTable
                    items={tableItems}
                    isEditable={isCanManage}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                />
            ) : (
                <ProductCodeConfigTable
                    items={productCodeTableItems}
                    isEditable={isCanManage}
                    onAddItem={handleAddProductCodeItem}
                    onUpdateItem={handleUpdateProductCodeItem}
                    onDeleteItem={handleDeleteProductCodeItem}
                />
            )}
        </div>
    );
};
