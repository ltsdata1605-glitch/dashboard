import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Icon } from '../../common/Icon';
import toast from 'react-hot-toast';
import { Button } from '../../shared/ui/Button';
import UserManagementView from '../UserManagementView';
import { formatCleanDisplayName } from '../../../utils/dataUtils';

export const SettingsAccountTab: React.FC = () => {
    const { user, userRole, departmentId, employeeName, expiresAt, requestAccess, logout } = useAuth();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [stagedDept, setStagedDept] = useState(departmentId || '');
    const [stagedEmployee, setStagedEmployee] = useState(employeeName || '');
    const [deptError, setDeptError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const validateDept = (value: string): string => {
        if (!value.trim()) return "Mã Kho không được bỏ trống";
        const codes = value.split(',').map(c => c.trim()).filter(c => c);
        if (codes.length === 0) return "Mã Kho không được bỏ trống";
        for (const code of codes) {
            if (!/^\d{3,6}$/.test(code)) return `Mã Kho phải là số (ví dụ: 910, 58614). Hiện tại: "${code}" không hợp lệ`;
        }
        return '';
    };

    const handleSaveProfile = async () => {
        const deptErr = validateDept(stagedDept);
        setDeptError(deptErr);
        if (deptErr) return;
        if (userRole === 'employee' && !stagedEmployee.trim()) return toast.error("Tên nhân viên không được bỏ trống");

        try {
            setIsSaving(true);
            if (userRole === 'manager') {
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../../../services/firebase');
                const userRef = doc(db, 'users', user!.uid);
                await updateDoc(userRef, {
                    departmentId: stagedDept,
                    employeeName: stagedEmployee || ''
                });
                toast.success("Cấu hình Kho đã được Cập Nhật Thành Công!");
            } else {
                await requestAccess(
                    'employee',
                    stagedDept,
                    stagedEmployee
                );
                toast.success("Đã ghi nhận thay đổi. Yêu cầu xét duyệt lại kích hoạt...");
            }

            setIsEditingProfile(false);
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            toast.error("Có lỗi xảy ra khi Cập nhật thông tin!");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Tài Khoản Section */}
            <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-4 sm:mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">Hồ Sơ Định Danh</h3>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg">
                    {/* Header: Avatar + Name/Email/Role + Action Button */}
                    <div className={`flex items-start justify-between gap-4 sm:gap-6 ${isEditingProfile ? 'mb-4' : 'mb-0'}`}>
                        <div className="flex items-start gap-4 sm:gap-6 flex-1">
                            {/* Avatar */}
                            <div className="w-20 h-20 sm:w-24 sm:h-24 overflow-hidden shadow-md bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center flex-shrink-0 rounded-xl">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name="user" size={10} className="text-sky-400" />
                                )}
                            </div>

                            {/* Name & Email & Role + Info Cards */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                                    <h4 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                                        {formatCleanDisplayName(user?.displayName)}
                                    </h4>
                                    <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1.5 rounded-md ${
                                        userRole === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                        userRole === 'manager' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    }`}>
                                        <Icon name={userRole === 'manager' ? 'briefcase' : userRole === 'admin' ? 'shield' : 'users'} size={3.5} />
                                        {userRole === 'admin' ? 'Quản Trị Hệ Thống' : userRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên Mảng'}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-2.5">{user?.email}</p>

                                {/* Info Line - Tất cả thông tin nằm trên 1 dòng, ngăn cách bởi | */}
                                {!isEditingProfile && (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <Icon name="map-pin" size={3.5} className="text-rose-500 shrink-0" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Mã Kho:</span>
                                            <span className="font-bold text-slate-800 dark:text-white font-mono">{departmentId || 'Chưa đăng ký'}</span>
                                        </div>

                                        <span className="text-slate-300 dark:text-slate-600 select-none">|</span>

                                        <div className="flex items-center gap-1.5">
                                            <Icon name="user-check" size={3.5} className="text-rose-500 shrink-0" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Tên NV:</span>
                                            <span className="font-bold text-amber-700 dark:text-amber-400 italic">{employeeName || 'N/A'}</span>
                                        </div>

                                        <span className="text-slate-300 dark:text-slate-600 select-none">|</span>

                                        <div className="flex items-center gap-1.5">
                                            <Icon name="shield" size={3.5} className="text-rose-500 shrink-0" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Chức năng:</span>
                                            <span className="font-bold text-slate-800 dark:text-white">
                                                {userRole === 'admin' ? 'Toàn bộ' : userRole === 'manager' ? 'Quản lý kho' : 'Xem báo cáo'}
                                            </span>
                                        </div>

                                        <span className="text-slate-300 dark:text-slate-600 select-none">|</span>

                                        <div className="flex items-center gap-1.5">
                                            <Icon name="calendar" size={3.5} className="text-rose-500 shrink-0" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Hạn:</span>
                                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                {expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'Vô hạn'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Button */}
                        {userRole !== 'admin' && (
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                                className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-all shadow-sm rounded-lg flex-shrink-0 ${
                                    isEditingProfile
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800/30 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                                }`}
                            >
                                <Icon name={isEditingProfile ? 'save' : 'edit-3'} size={4} />
                                {isEditingProfile ? 'Lưu' : 'Chuyên lên dây'}
                            </Button>
                        )}
                    </div>

                    {/* Editing Form */}
                    {isEditingProfile && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-5 border-2 border-sky-100 dark:border-sky-900/50 rounded-lg mb-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Icon name="map-pin" size={3.5} /> MÃ KHO ĐĂNG KÝ</label>
                                <input
                                    type="text"
                                    value={stagedDept}
                                    onChange={e => {
                                        setStagedDept(e.target.value);
                                        setDeptError(validateDept(e.target.value));
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !deptError && !isSaving) {
                                            handleSaveProfile();
                                        }
                                    }}
                                    placeholder="Ví dụ: 910, 58614, 58615"
                                    className={`text-sm bg-slate-50 dark:bg-slate-900 border p-3 outline-none transition-all uppercase rounded-md text-slate-700 dark:text-slate-300 font-mono ${
                                        deptError
                                            ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                            : 'border-slate-200 dark:border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                                    }`}
                                />
                                {deptError && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"><Icon name="alert-circle" size={3.5} /> {deptError}</p>}
                                {!deptError && stagedDept && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><Icon name="check-circle" size={3.5} /> Nhấn Enter hoặc click Lưu</p>}
                            </div>
                            {userRole === 'employee' && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Icon name="user-check" size={3.5} /> KHỚP TÊN BÁO CÁO</label>
                                    <input
                                        type="text"
                                        value={stagedEmployee}
                                        onChange={e => setStagedEmployee(e.target.value)}
                                        placeholder="Ví dụ: 910 - Nguyễn Đăng Khoa"
                                        className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-700 dark:text-slate-300 transition-all rounded-md"
                                    />
                                </div>
                            )}
                            <div className={`md:col-span-2 text-xs font-bold px-4 py-2 flex items-center gap-2 rounded-md ${
                                userRole === 'manager'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                            }`}>
                                <Icon name={userRole === 'manager' ? 'check-circle' : 'alert-triangle'} size={4} />
                                {userRole === 'manager'
                                    ? 'Áp dụng ngay lập tức không cần duyệt'
                                    : 'Gửi yêu cầu, tạm khóa quyền cho đến duyệt'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Phân Quyền Section */}
            {(userRole === 'admin' || userRole === 'manager') && (
                <div className="-m-3 sm:-m-6">
                    <UserManagementView isEmbedded={true} />
                </div>
            )}

            {/* Portaled Logout Button to Top Header Bar */}
            {mounted && typeof document !== 'undefined' && document.getElementById('global-header-actions') && createPortal(
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 shadow-sm transition-all group"
                    title="Đăng xuất tài khoản"
                >
                    <Icon name="log-out" size={4.5} className="text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                    <span>Đăng Xuất Tài Khoản</span>
                </Button>,
                document.getElementById('global-header-actions')!
            )}
            {mounted && typeof document !== 'undefined' && document.getElementById('mobile-topbar-actions') && createPortal(
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={logout}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors mr-1"
                    title="Đăng xuất tài khoản"
                >
                    <Icon name="log-out" size={3.5} />
                    <span>Đăng Xuất</span>
                </Button>,
                document.getElementById('mobile-topbar-actions')!
            )}
        </div>
    );
};
