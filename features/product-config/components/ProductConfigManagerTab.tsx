import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { useAuth } from '../../../contexts/AuthContext';
import type { ProductConfig } from '../../../types';
import {
    getGlobalProductConfig,
    saveGlobalProductConfig,
    parseExcelProductConfigFile,
    exportProductConfigToExcel,
    computeConfigSummary,
} from '../services/firebaseProductConfigService';
import { ConfigTable } from './ConfigTable';
import type { CategoryTableItem, ProductConfigSummary } from '../types';
import * as dbService from '../../../services/dbService';

export const ProductConfigManagerTab: React.FC = () => {
    const { user, userRole } = useAuth();
    const [config, setConfig] = useState<ProductConfig | null>(null);
    const [summary, setSummary] = useState<ProductConfigSummary | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
    const [updatedBy, setUpdatedBy] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isCanManage = userRole === 'admin' || userRole === 'manager';

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            // 1. Thử đọc từ Firestore toàn cục
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
            if (localConfigEntry?.config) {
                setConfig(localConfigEntry.config);
                setSummary(computeConfigSummary(localConfigEntry.config));
                setUpdatedAt(new Date().toISOString());
                setUpdatedBy('Bộ nhớ cục bộ');
                setIsDirty(true); // Gợi ý người dùng lưu lên Cloud nếu chỉ có ở máy cục bộ
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
        if (!config || !config.childToParentMap) return [];
        return Object.entries(config.childToParentMap).map(([code, parentGroup]) => ({
            code,
            parentGroup,
            subgroup: config.childToSubgroupMap?.[code] || '',
            multiplier: config.quantityMultiplierMap?.[code] ?? 1,
            vasMultiplier: config.vasMultiplierMap?.[code],
        }));
    }, [config]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const toastId = toast.loading('Đang đọc file cấu hình Excel...');
        try {
            const parsedConfig = await parseExcelProductConfigFile(file);
            setConfig(parsedConfig);
            setSummary(computeConfigSummary(parsedConfig));
            setUpdatedAt(new Date().toISOString());
            setUpdatedBy(user?.displayName || user?.email || 'Quản lý');
            setIsDirty(true);
            toast.success('Đã tải và nhận diện thành công file cấu hình!', { id: toastId });
        } catch (err) {
            console.error('[ProductConfigManagerTab] Lỗi đọc file Excel:', err);
            toast.error((err as Error).message || 'Không thể đọc file Excel', { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveToCloud = async () => {
        if (!config) return;
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
            await exportProductConfigToExcel(config);
            toast.success('Đã tải xuống file Excel cấu hình thành công!', { id: toastId });
        } catch (err) {
            console.error('[ProductConfigManagerTab] Lỗi xuất file:', err);
            toast.error('Không thể xuất file Excel: ' + (err as Error).message, { id: toastId });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                <AppIcon name="loading" size="hero" spin className="text-sky-500 mb-3" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang tải cấu hình ngành hàng từ Cloud...</p>
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
            {/* Header + Actions */}
            <div className="bg-white border border-slate-200 rounded-card p-3.5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                            <AppIcon name="settings" size="md" className="text-sky-500" />
                            <span>Cấu Hình Ngành Hàng & Hệ Số Quy Đổi</span>
                            {isDirty && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase tracking-wider">
                                    Có thay đổi chưa lưu
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Quản lý toàn bộ nhóm cha, nhóm con, mã ngành hàng và hệ số quy đổi áp dụng trực tiếp cho toàn hệ thống.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {isCanManage && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8.5 gap-1.5 text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50"
                            >
                                <AppIcon name="upload" size="sm" />
                                <span>Tải file Excel (.xlsx)</span>
                            </Button>
                        )}

                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={!config}
                            onClick={handleExportExcel}
                            className="h-8.5 gap-1.5 text-xs font-semibold"
                        >
                            <AppIcon name="download" size="sm" />
                            <span>Xuất Excel</span>
                        </Button>

                        {isCanManage && (
                            <Button
                                variant="primary"
                                size="sm"
                                disabled={!config || isSaving}
                                onClick={handleSaveToCloud}
                                className={`h-8.5 gap-1.5 text-xs font-bold shadow-xs ${
                                    isDirty
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                                }`}
                            >
                                <AppIcon name={isSaving ? 'loading' : 'cloud'} size="sm" spin={isSaving} />
                                <span>{isSaving ? 'Đang lưu...' : 'Lưu lên Cloud Firebase'}</span>
                            </Button>
                        )}
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

            {/* Bảng tra cứu */}
            <ConfigTable items={tableItems} />
        </div>
    );
};
