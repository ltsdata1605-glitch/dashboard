import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { useIsSheetWidth } from '../../../components/shared/ui/Modal';
import { toast } from '../../../components/shared/ui/toast';
import { useAuth } from '../../../contexts/AuthContext';
import type { ProductConfig } from '../../../types';
import {
    getGlobalProductConfig,
    saveGlobalProductConfig,
    parseExcelProductConfigFile,
    parseExcelProductCodeConfigFile,
    exportProductConfigToExcel,
    exportProductCodeConfigToExcel,
    exportCategoryConfigTemplateToExcel,
    computeConfigSummary,
} from '../services/firebaseProductConfigService';
import { ConfigTable } from './ConfigTable';
import { ProductCodeConfigTable } from './ProductCodeConfigTable';
import { ProductConfigTemplateHub } from './ProductConfigTemplateHub';
import type { CategoryTableItem, ProductCodeTableItem, ProductConfigSummary } from '../types';
import * as dbService from '../../../services/dbService';

export const ProductConfigManagerTab: React.FC = () => {
    const { user, userRole, departmentId } = useAuth();
    // Điện thoại: segmented đủ bề ngang + nhãn ngắn (như dải Phân quyền | Ngành hàng | Duyệt) — nhãn dài bị khuất mép phải
    const laDienThoai = useIsSheetWidth();
    const [config, setConfig] = useState<ProductConfig | null>(null);
    const [summary, setSummary] = useState<ProductConfigSummary | null>(null);
    const [configType, setConfigType] = useState<'category' | 'productCode' | 'template'>('category');
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
            heSoSoLuong: item.heSoSoLuong,
            heSoDoanhThu: item.heSoDoanhThu,
            loaiHeSo: item.loaiHeSo,
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
                        if (item.heSoSoLuong !== undefined) {
                            cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [item.maSanPham]: item.heSoSoLuong };
                            if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                            cfg.vasMultiplierMap[item.maSanPham] = item.heSoSoLuong;
                            if (item.tenSanPham) {
                                if (!cfg.vasNameMultiplierMap) cfg.vasNameMultiplierMap = {};
                                cfg.vasNameMultiplierMap[item.tenSanPham] = item.heSoSoLuong;
                            }
                        } else if (item.loaiHeSo !== 'doanh_thu') {
                            cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [item.maSanPham]: item.heSo };
                            if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                            cfg.vasMultiplierMap[item.maSanPham] = item.heSo;
                            if (item.tenSanPham) {
                                if (!cfg.vasNameMultiplierMap) cfg.vasNameMultiplierMap = {};
                                cfg.vasNameMultiplierMap[item.tenSanPham] = item.heSo;
                            }
                        }
                        if (item.heSoDoanhThu !== undefined) {
                            cfg.revenueMultiplierMap = { ...(cfg.revenueMultiplierMap || {}), [item.maSanPham]: item.heSoDoanhThu };
                        } else if (item.loaiHeSo === 'doanh_thu') {
                            cfg.revenueMultiplierMap = { ...(cfg.revenueMultiplierMap || {}), [item.maSanPham]: item.heSo };
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
                const isTemplate = !config.productCodeItems || config.productCodeItems.length === 0;
                await exportProductCodeConfigToExcel(config.productCodeItems || []);
                toast.success(
                    isTemplate
                        ? 'Đã tải xuống file Excel mẫu (gồm 3 dòng mẫu: SL, DT, Cả hai)!'
                        : 'Đã tải xuống file Excel cấu hình mã sản phẩm thành công!',
                    { id: toastId }
                );
            } else if (configType === 'template') {
                await exportCategoryConfigTemplateToExcel();
                await exportProductCodeConfigToExcel([], { asTemplate: true });
                toast.success('Đã tải xuống cả 2 file Excel mẫu (Ngành hàng & Mã sản phẩm)!', { id: toastId });
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
                heSoSoLuong: item.heSoSoLuong,
                heSoDoanhThu: item.heSoDoanhThu,
                loaiHeSo: item.loaiHeSo,
                loai: item.loai,
                nhom: item.nhom,
                sheetSource: item.sheetSource || 'Thủ công',
            });
            cfg.productCodeItems = list;
            
            if (item.heSoSoLuong !== undefined) {
                cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [item.maSanPham]: item.heSoSoLuong };
                if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                cfg.vasMultiplierMap[item.maSanPham] = item.heSoSoLuong;
                if (item.tenSanPham) {
                    if (!cfg.vasNameMultiplierMap) cfg.vasNameMultiplierMap = {};
                    cfg.vasNameMultiplierMap[item.tenSanPham] = item.heSoSoLuong;
                }
            } else if (item.loaiHeSo !== 'doanh_thu') {
                cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [item.maSanPham]: item.heSo };
                if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                cfg.vasMultiplierMap[item.maSanPham] = item.heSo;
                if (item.tenSanPham) {
                    if (!cfg.vasNameMultiplierMap) cfg.vasNameMultiplierMap = {};
                    cfg.vasNameMultiplierMap[item.tenSanPham] = item.heSo;
                }
            }

            if (item.heSoDoanhThu !== undefined) {
                cfg.revenueMultiplierMap = { ...(cfg.revenueMultiplierMap || {}), [item.maSanPham]: item.heSoDoanhThu };
            } else if (item.loaiHeSo === 'doanh_thu') {
                cfg.revenueMultiplierMap = { ...(cfg.revenueMultiplierMap || {}), [item.maSanPham]: item.heSo };
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
                    
                    if (updates.heSoSoLuong !== undefined) {
                        cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [maSanPham]: updates.heSoSoLuong };
                        if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                        cfg.vasMultiplierMap[maSanPham] = updates.heSoSoLuong;
                    } else if (updates.heSo !== undefined && next.loaiHeSo !== 'doanh_thu') {
                        cfg.quantityMultiplierMap = { ...cfg.quantityMultiplierMap, [maSanPham]: updates.heSo };
                        if (!cfg.vasMultiplierMap) cfg.vasMultiplierMap = {};
                        cfg.vasMultiplierMap[maSanPham] = updates.heSo;
                    }

                    if (updates.heSoDoanhThu !== undefined) {
                        cfg.revenueMultiplierMap = { ...(cfg.revenueMultiplierMap || {}), [maSanPham]: updates.heSoDoanhThu };
                    } else if (updates.heSo !== undefined && next.loaiHeSo === 'doanh_thu') {
                        cfg.revenueMultiplierMap = { ...(cfg.revenueMultiplierMap || {}), [maSanPham]: updates.heSo };
                    }

                    if (updates.tenSanPham !== undefined && cfg.vasNameMultiplierMap) {
                        const targetHeSo = next.heSoSoLuong ?? next.heSo;
                        cfg.vasNameMultiplierMap[updates.tenSanPham] = targetHeSo;
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
            if (cfg.revenueMultiplierMap) {
                const { [maSanPham]: _, ...rest } = cfg.revenueMultiplierMap;
                cfg.revenueMultiplierMap = rest;
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

                {/* Metadata ngày cập nhật & người cập nhật */}
                {(formattedDate || updatedBy) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 rounded-control border border-slate-200/80 dark:border-slate-700/60">
                        {formattedDate && (
                            <span className="flex items-center gap-1">
                                <AppIcon name="clock" size="xs" className="text-slate-400" />
                                <span>{formattedDate}</span>
                            </span>
                        )}
                        {updatedBy && (
                            <span className="flex items-center gap-1">
                                <AppIcon name="user" size="xs" className="text-slate-400" />
                                <span className="truncate">{updatedBy}</span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Hàng Tab điều hướng & Cụm 3 nút chức năng (Icon-only) nằm cùng dòng */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                {/* Dạng Tab: Khai báo ngành hàng & Cấu hình theo Mã sản phẩm */}
                {/* GĐ10: segmented dùng chung — icon + nhãn + số mục, vùng chạm 44 trên điện thoại */}
                <Tabs
                    variant="segment"
                    size="sm"
                    fullWidth={laDienThoai}
                    activeId={configType}
                    onChange={(id) => setConfigType(id as typeof configType)}
                    items={[
                        { id: 'category', label: laDienThoai ? 'Ngành hàng' : 'Khai báo ngành hàng', icon: 'table', badge: tableItems.length },
                        { id: 'productCode', label: laDienThoai ? 'Mã sản phẩm' : 'Cấu hình theo Mã sản phẩm', icon: 'template', badge: productCodeTableItems.length },
                        { id: 'template', label: laDienThoai ? 'File mẫu' : 'Tải file mẫu', icon: 'download' },
                    ]}
                />

                {/* Cụm 3 nút chức năng gom gọn: Tải file Excel, Xuất Excel, Lưu (Chỉ để icon, không để text) */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {isCanManage && configType !== 'template' && (
                        <Button
                            variant="tinted"
                            size="icon"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title={configType === 'category' ? 'Tải file Excel (.xlsx) - Khai báo ngành hàng' : 'Tải file Excel (.xlsx) - Cấu hình theo mã sản phẩm'}
                            aria-label={configType === 'category' ? 'Tải file Excel (.xlsx) - Khai báo ngành hàng' : 'Tải file Excel (.xlsx) - Cấu hình theo mã sản phẩm'}
                            className="w-8.5 h-8.5 border-sky-200 shadow-2xs"
                        >
                            <AppIcon name="upload" size="sm" />
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        size="icon"
                        type="button"
                        disabled={!config}
                        onClick={handleExportExcel}
                        title={
                            configType === 'template'
                                ? 'Tải cả 2 file mẫu Excel (Ngành hàng & Mã sản phẩm)'
                                : configType === 'category'
                                ? 'Xuất Excel - Khai báo ngành hàng'
                                : (!config?.productCodeItems || config.productCodeItems.length === 0)
                                    ? 'Tải file mẫu Excel (3 dòng mẫu: SL, DT, Cả hai)'
                                    : 'Xuất Excel - Cấu hình theo mã sản phẩm'
                        }
                        aria-label={
                            configType === 'template'
                                ? 'Tải cả 2 file mẫu Excel (Ngành hàng & Mã sản phẩm)'
                                : configType === 'category'
                                ? 'Xuất Excel - Khai báo ngành hàng'
                                : (!config?.productCodeItems || config.productCodeItems.length === 0)
                                    ? 'Tải file mẫu Excel (3 dòng mẫu: SL, DT, Cả hai)'
                                    : 'Xuất Excel - Cấu hình theo mã sản phẩm'
                        }
                        className="w-8.5 h-8.5 shadow-2xs"
                    >
                        <AppIcon name="download" size="sm" />
                    </Button>

                    {isCanManage && (
                        <Button
                            variant="primary"
                            size="icon"
                            type="button"
                            disabled={!config || isSaving}
                            onClick={handleSaveToCloud}
                            title={isDirty ? 'Lưu lên Cloud Firebase (Có thay đổi chưa lưu)' : 'Lưu lên Cloud Firebase'}
                            aria-label="Lưu lên Cloud Firebase"
                            // Có thay đổi chưa lưu: nền hổ phách nhấp nháy (thiết kế cũ, nhắc lưu)
                            className={`w-8.5 h-8.5 shadow-2xs ${isDirty ? 'bg-amber-600 hover:bg-amber-700 animate-pulse' : ''}`}
                        >
                            <AppIcon name={isSaving ? 'loading' : 'cloud'} size="sm" spin={isSaving} />
                        </Button>
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
            ) : configType === 'productCode' ? (
                <ProductCodeConfigTable
                    items={productCodeTableItems}
                    isEditable={isCanManage}
                    onAddItem={handleAddProductCodeItem}
                    onUpdateItem={handleUpdateProductCodeItem}
                    onDeleteItem={handleDeleteProductCodeItem}
                />
            ) : (
                <ProductConfigTemplateHub
                    onDownloadCategoryTemplate={exportCategoryConfigTemplateToExcel}
                    onDownloadProductCodeTemplate={() => exportProductCodeConfigToExcel([], { asTemplate: true })}
                />
            )}
        </div>
    );
};
