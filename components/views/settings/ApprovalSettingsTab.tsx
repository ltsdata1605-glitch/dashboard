import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { AppIcon } from '../../shared/ui/icon/AppIcon';
import { Button } from '../../shared/ui/Button';
import toast from 'react-hot-toast';
import {
    getApprovalSettings,
    updateApprovalSettings,
    ApprovalSettingsData
} from '../../../services/approvalSettingsService';
import { parseKhoList } from '../../../utils/dataUtils';

interface ApprovalSettingsTabProps {
    onConfigChange?: () => void;
}

export const ApprovalSettingsTab: React.FC<ApprovalSettingsTabProps> = ({ onConfigChange }) => {
    const { userRole, departmentId, isDemoMode } = useAuth();
    const isSuperAdmin = userRole === 'admin' && (departmentId || '').startsWith('ALL (Super Admin)');
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';

    const [loading, setLoading] = useState(true);
    const [savingManager, setSavingManager] = useState(false);
    const [savingEmployee, setSavingEmployee] = useState(false);
    const [savingDept, setSavingDept] = useState<string | null>(null);

    const formatErrorMessage = (err: any, fallback: string) => {
        if (err?.message === 'internal') {
            return 'Hệ thống đang đồng bộ Cloud Functions, vui lòng thử lại sau giây lát.';
        }
        if (err?.message === 'permission-denied') {
            return 'Bạn không có quyền thực hiện thao tác này.';
        }
        if (err?.message === 'unauthenticated') {
            return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';
        }
        return err?.message || fallback;
    };

    const [settings, setSettings] = useState<ApprovalSettingsData>({
        autoApproveManagers: false,
        autoApproveEmployees: true, // Mặc định ở cấp quản lý là BẬT
        autoApproveEmployeesByDept: {},
        effectiveAutoApproveForDept: true,
    });

    // Lấy danh sách kho mà manager phụ trách
    const managerKhos = isManager ? parseKhoList(departmentId) : [];
    const activeDept = managerKhos.length > 0 ? managerKhos[0] : (departmentId || '');

    const loadSettings = async (force = false) => {
        try {
            setLoading(true);
            const data = await getApprovalSettings(activeDept, force);
            setSettings(data);
        } catch (err) {
            console.error('Lỗi tải cài đặt duyệt:', err);
            toast.error('Không thể tải cài đặt duyệt.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [activeDept]);

    // Xử lý bật/tắt Tự động duyệt Quản lý (Chỉ Super Admin)
    const handleToggleAutoApproveManagers = async () => {
        if (!isSuperAdmin && !isAdmin) {
            toast.error('Chỉ Super Admin mới có quyền bật/tắt duyệt tự động cho Quản lý!');
            return;
        }

        const newValue = !settings.autoApproveManagers;
        if (isDemoMode) {
            setSettings(prev => ({ ...prev, autoApproveManagers: newValue }));
            toast.success(`(Demo) Đã ${newValue ? 'BẬT' : 'TẮT'} tự động duyệt Quản lý!`);
            return;
        }

        try {
            setSavingManager(true);
            await updateApprovalSettings({ autoApproveManagers: newValue });
            setSettings(prev => ({ ...prev, autoApproveManagers: newValue }));
            toast.success(
                newValue
                    ? 'Đã BẬT tự động duyệt Quản lý! Khi Quản lý đăng ký/đổi kho sẽ không cần Admin duyệt.'
                    : 'Đã TẮT tự động duyệt Quản lý. Quản lý đăng ký/đổi kho cần Admin duyệt thủ công.'
            );
            if (onConfigChange) onConfigChange();
        } catch (err: any) {
            console.error('Lỗi cập nhật duyệt quản lý:', err);
            toast.error(formatErrorMessage(err, 'Không thể lưu cài đặt duyệt Quản lý.'));
        } finally {
            setSavingManager(false);
        }
    };

    // Xử lý bật/tắt Tự động duyệt Nhân viên toàn cục (Dành cho Admin)
    const handleToggleAutoApproveEmployeesGlobal = async () => {
        if (!isAdmin) {
            toast.error('Chỉ Admin mới có quyền đổi cấu hình toàn cục.');
            return;
        }

        const newValue = !settings.autoApproveEmployees;
        if (isDemoMode) {
            setSettings(prev => ({ ...prev, autoApproveEmployees: newValue }));
            toast.success(`(Demo) Đã ${newValue ? 'BẬT' : 'TẮT'} tự động duyệt Nhân viên toàn cục!`);
            return;
        }

        try {
            setSavingEmployee(true);
            await updateApprovalSettings({ autoApproveEmployees: newValue });
            setSettings(prev => ({ ...prev, autoApproveEmployees: newValue }));
            toast.success(
                newValue
                    ? 'Đã BẬT tự động duyệt Nhân viên toàn cục!'
                    : 'Đã TẮT tự động duyệt Nhân viên toàn cục.'
            );
            if (onConfigChange) onConfigChange();
        } catch (err: any) {
            console.error('Lỗi cập nhật duyệt nhân viên toàn cục:', err);
            toast.error(formatErrorMessage(err, 'Không thể lưu cài đặt.'));
        } finally {
            setSavingEmployee(false);
        }
    };

    // Xử lý bật/tắt Tự động duyệt Nhân viên theo Kho (Dành cho Quản lý & Admin)
    const handleToggleAutoApproveEmployeesForDept = async (targetKho: string) => {
        if (!targetKho) return;

        // Xác định giá trị hiện tại của kho
        const currentVal = settings.autoApproveEmployeesByDept[targetKho] !== undefined
            ? settings.autoApproveEmployeesByDept[targetKho]
            : (settings.autoApproveEmployees !== false); // Mặc định là true (BẬT)

        const newValue = !currentVal;

        if (isDemoMode) {
            setSettings(prev => ({
                ...prev,
                autoApproveEmployeesByDept: {
                    ...prev.autoApproveEmployeesByDept,
                    [targetKho]: newValue
                }
            }));
            toast.success(`(Demo) Đã ${newValue ? 'BẬT' : 'TẮT'} tự động duyệt Nhân viên cho Kho ${targetKho}!`);
            return;
        }

        try {
            setSavingDept(targetKho);
            await updateApprovalSettings({
                deptId: targetKho,
                autoApproveForDept: newValue
            });
            setSettings(prev => ({
                ...prev,
                autoApproveEmployeesByDept: {
                    ...prev.autoApproveEmployeesByDept,
                    [targetKho]: newValue
                }
            }));
            toast.success(
                newValue
                    ? `Đã BẬT tự động duyệt Nhân viên cho Kho ${targetKho}! Nhân viên đăng ký vào kho sẽ được duyệt ngay.`
                    : `Đã TẮT tự động duyệt Nhân viên cho Kho ${targetKho}. Quản lý sẽ cần duyệt thủ công khi có nhân viên đăng ký.`
            );
            if (onConfigChange) onConfigChange();
        } catch (err: any) {
            console.error('Lỗi cập nhật duyệt nhân viên theo kho:', err);
            toast.error(formatErrorMessage(err, 'Không thể lưu cài đặt cho Kho.'));
        } finally {
            setSavingDept(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <AppIcon name="refresh" size="lg" className="animate-spin text-sky-600 mb-3" />
                <p className="text-sm text-slate-500 font-medium">Đang tải cấu hình phê duyệt...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Banner giới thiệu */}
            <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <AppIcon name="security" size="md" className="text-white" />
                            </span>
                            <h2 className="text-lg font-bold tracking-tight">Cấu Hình Kiểm Duyệt Tài Khoản Tự Động</h2>
                        </div>
                        <p className="text-xs text-sky-100 max-w-2xl leading-relaxed">
                            Thiết lập cơ chế tự động phê duyệt quyền truy cập khi có người dùng đăng nhập mới, đổi mã kho hoặc cập nhật mã kho vào hệ thống.
                        </p>
                    </div>
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={() => loadSettings(true)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded-lg border border-white/20 transition-all flex items-center gap-1.5 text-white shrink-0"
                    >
                        <AppIcon name="refresh" size="sm" /> Làm Mới Cài Đặt
                    </Button>
                </div>
            </div>

            {/* MỤC 1: DÀNH CHO SUPER ADMIN (TỰ ĐỘNG DUYỆT QUẢN LÝ) */}
            <div className={`p-5 rounded-xl border transition-all ${
                isAdmin
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 opacity-80'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            settings.autoApproveManagers
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                            <AppIcon name={settings.autoApproveManagers ? 'success' : 'userCheck'} size="lg" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                    Tự Động Duyệt Cấp Quản Lý (Manager)
                                </h3>
                                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                    Super Admin
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    settings.autoApproveManagers
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                    {settings.autoApproveManagers ? 'Đang BẬT' : 'Đang TẮT (Admin duyệt)'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                                Khi một Quản lý đăng ký mới, đổi mã kho hoặc cập nhật mã kho:
                                {settings.autoApproveManagers ? (
                                    <strong className="text-emerald-600 dark:text-emerald-400"> Hệ thống tự động duyệt ngay lập tức, Super Admin không cần duyệt tay.</strong>
                                ) : (
                                    <strong className="text-slate-600 dark:text-slate-300"> Admin là người kiểm duyệt thủ công trong danh sách chờ duyệt.</strong>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {isAdmin ? (
                            <button
                                type="button"
                                onClick={handleToggleAutoApproveManagers}
                                disabled={savingManager}
                                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                                    settings.autoApproveManagers ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                } ${savingManager ? 'opacity-50 cursor-not-allowed' : ''}`}
                                role="switch"
                                aria-checked={settings.autoApproveManagers}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        settings.autoApproveManagers ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        ) : (
                            <span className="text-xs text-slate-400 italic">Chỉ Super Admin</span>
                        )}
                    </div>
                </div>

                <div className="pt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <AppIcon name="info" size="sm" className="text-sky-500 shrink-0" />
                    <span>Mặc định: <strong>TẮT</strong> (Admin kiểm duyệt quản lý). Khi bật, quyền Quản lý kho sẽ có hiệu lực ngay khi họ đổi mã kho.</span>
                </div>
            </div>

            {/* MỤC 2: DÀNH CHO CẤP QUẢN LÝ (TỰ ĐỘNG DUYỆT NHÂN VIÊN VÀO KHO) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <AppIcon name="users" size="lg" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                    Tự Động Duyệt Nhân Viên Vào Kho (Employee)
                                </h3>
                                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                    Quản Lý Siêu Thị
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    MẶC ĐỊNH: BẬT
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                                Khi có nhân viên đăng ký tài khoản vào kho: Nếu BẬT, hệ thống sẽ tự động duyệt ngay để nhân viên vào xem dữ liệu siêu thị. Nếu TẮT, Quản lý kho sẽ phải kiểm duyệt thủ công từng nhân viên.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Danh sách Kho hiển thị cấu hình */}
                {isManager && managerKhos.length > 0 && (
                    <div className="space-y-3 pt-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Cài Đặt Cho Kho Bạn Đang Quản Lý:
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {managerKhos.map(kho => {
                                const isKhoEnabled = settings.autoApproveEmployeesByDept[kho] !== undefined
                                    ? settings.autoApproveEmployeesByDept[kho]
                                    : (settings.autoApproveEmployees !== false);

                                const isSavingThisKho = savingDept === kho;

                                return (
                                    <div
                                        key={kho}
                                        className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 font-mono font-bold text-xs flex items-center justify-center">
                                                {kho}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800 dark:text-white">
                                                    Mã Kho: <span className="font-mono text-sky-600 dark:text-sky-400">{kho}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {isKhoEnabled ? 'Tự động duyệt nhân viên' : 'Quản lý duyệt thủ công'}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleAutoApproveEmployeesForDept(kho)}
                                            disabled={isSavingThisKho}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                isKhoEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'
                                            } ${isSavingThisKho ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            role="switch"
                                            aria-checked={isKhoEnabled}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                    isKhoEnabled ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Nếu là Admin/Super Admin: Cấu hình mặc định toàn hệ thống + theo từng kho */}
                {isAdmin && (
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 gap-3">
                            <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">
                                    Cấu Hình Mặc Định Toàn Hệ Thống (Tất Cả Các Kho)
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Áp dụng cho mọi siêu thị chưa có cấu hình riêng (Mặc định: BẬT).
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleAutoApproveEmployeesGlobal}
                                disabled={savingEmployee}
                                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    settings.autoApproveEmployees ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'
                                } ${savingEmployee ? 'opacity-50 cursor-not-allowed' : ''}`}
                                role="switch"
                                aria-checked={settings.autoApproveEmployees}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        settings.autoApproveEmployees ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <AppIcon name="info" size="sm" className="text-sky-500 shrink-0" />
                    <span>
                        Tính năng tự động duyệt nhân viên ở cấp Quản lý luôn được <strong>mặc định BẬT</strong> để nhân viên có thể sử dụng ngay sau khi đăng ký vào kho.
                    </span>
                </div>
            </div>
        </div>
    );
};
