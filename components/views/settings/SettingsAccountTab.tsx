import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Icon } from '../../common/Icon';
import toast from 'react-hot-toast';
import { Button } from '../../shared/ui/Button';
import UserManagementView from '../UserManagementView';

export const SettingsAccountTab: React.FC = () => {
    const { user, userRole, departmentId, employeeName, expiresAt, requestAccess, logout } = useAuth();

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
                    {/* Header: Avatar + Info Cards + Action Button */}
                    <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-6 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700/50">
                        {/* Avatar */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 overflow-hidden shadow-md bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center flex-shrink-0 rounded-xl">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Icon name="user" size={10} className="text-sky-400" />
                            )}
                        </div>

                        {/* Name & Email */}
                        <div className="flex-1">
                            <h4 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white mb-1">{user?.displayName || 'Thành viên YCX'}</h4>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-3">{user?.email}</p>
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 rounded-md ${
                                    userRole === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                    userRole === 'manager' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                }`}>
                                    <Icon name={userRole === 'manager' ? 'briefcase' : userRole === 'admin' ? 'shield' : 'users'} size={4} />
                                    {userRole === 'admin' ? 'Quản Trị Hệ Thống' : userRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên Mảng'}
                                </span>
                                {expiresAt && (
                                    <span className="px-3 py-1 text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5 rounded-md">
                                        <Icon name="calendar" size={4} /> Hạn: {expiresAt.toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Info Cards */}
                        {!isEditingProfile && (
                            <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2 sm:gap-3">
                                <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-1 rounded-lg min-w-[140px] sm:min-w-[160px]">
                                    <span className="text-[10px] uppercase font-bold text-slate-400"><Icon name="map-pin" className="inline mr-1" size={3} /> Mã Kho</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs truncate">{departmentId || 'Chưa đăng ký'}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-1 rounded-lg min-w-[140px] sm:min-w-[160px]">
                                    <span className="text-[10px] uppercase font-bold text-slate-400"><Icon name="user-check" className="inline mr-1" size={3} /> Tên NV</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-400 text-xs truncate italic">{employeeName || 'N/A'}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-1 rounded-lg min-w-[140px] sm:min-w-[160px]">
                                    <span className="text-[10px] uppercase font-bold text-slate-400"><Icon name="shield" className="inline mr-1" size={3} /> Chức Năng</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{userRole === 'admin' ? 'Toàn bộ' : userRole === 'manager' ? 'Quản lý kho' : 'Xem báo cáo'}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 flex flex-col gap-1 rounded-lg min-w-[140px] sm:min-w-[160px]">
                                    <span className="text-[10px] uppercase font-bold text-slate-400"><Icon name="calendar" className="inline mr-1" size={3} /> Hạn</span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">{expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'Vô hạn'}</span>
                                </div>
                            </div>
                        )}

                        {/* Action Button */}
                        {userRole !== 'admin' && (
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                                className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-all shadow-sm rounded-lg flex-shrink-0 ${
                                    isEditingProfile
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-500'
                                }`}
                            >
                                <Icon name={isEditingProfile ? 'save' : 'edit-3'} size={4} />
                                {isEditingProfile ? 'Lưu' : 'Đổi Kho'}
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
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-4 sm:mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">Phân Quyền & Duyệt Yêu Cầu</h3>
                    <div className="-m-3 sm:-m-6">
                        <UserManagementView isEmbedded={true} />
                    </div>
                </div>
            )}

            {/* Logout */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <Button
                    variant="unstyled" size="none"
                    onClick={logout}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors shadow-sm flex items-center gap-2 rounded-lg"
                >
                    <Icon name="log-out" size={5} />
                    Đăng Xuất Tài Khoản
                </Button>
            </div>
        </div>
    );
};
