import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Icon } from '../../common/Icon';
import toast from 'react-hot-toast';

export const SettingsAccountTab: React.FC = () => {
    const { user, userRole, departmentId, employeeName, expiresAt, requestAccess, logout } = useAuth();
    
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [stagedDept, setStagedDept] = useState(departmentId || '');
    const [stagedEmployee, setStagedEmployee] = useState(employeeName || '');

    const handleSaveProfile = async () => {
        if (!stagedDept.trim()) return toast.error("Mã Kho không được bỏ trống");
        if (userRole === 'employee' && !stagedEmployee.trim()) return toast.error("Tên nhân viên không được bỏ trống");

        try {
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
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-4 sm:mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">Hồ Sơ Định Danh & Quyền Hạn</h3>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4 sm:gap-6 rounded-lg">
                    {/* Top: Avatar & Basic Info */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6 border-b border-slate-200 dark:border-slate-700/50 pb-4 sm:pb-6">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 overflow-hidden shadow-md bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 relative group rounded-xl">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Icon name="user" size={10} className="text-indigo-400" />
                            )}
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left flex flex-col justify-center h-full mt-1 sm:mt-0">
                            <h4 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white leading-tight mb-1">{user?.displayName || 'Thành viên YCX'}</h4>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-2">{user?.email}</p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-md ${
                                    userRole === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                    userRole === 'manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                                }`}>
                                    <Icon name={userRole === 'manager' ? 'briefcase' : userRole === 'admin' ? 'shield' : 'users'} size={4} />
                                    {userRole === 'admin' ? 'Quản Trị Hệ Thống' : userRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên Mảng'}
                                </span>
                                
                                {expiresAt && (
                                    <span className="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5 rounded-md">
                                        <Icon name="calendar" size={4} /> Hạn: {expiresAt.toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {userRole !== 'admin' && (
                            <button 
                                onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                                className={`px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm rounded-lg ${isEditingProfile ? 'bg-emerald-600 text-white hover:bg-emerald-700 w-full sm:w-auto' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 w-full sm:w-auto'}`}
                            >
                                <Icon name={isEditingProfile ? "save" : "edit-3"} size={4} />
                                {isEditingProfile ? 'Lưu Dữ Liệu' : 'Yêu Cầu Đổi Kho'}
                            </button>
                        )}
                    </div>

                    {/* Bottom: Fields & Editing */}
                    {isEditingProfile ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-5 border-2 border-indigo-100 dark:border-indigo-900/50 shadow-inner rounded-lg">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Icon name="map-pin" size={3.5} /> MÃ KHO ĐĂNG KÝ (Cách nhau bởi dấu phẩy)</label>
                                <input 
                                    type="text"
                                    value={stagedDept}
                                    onChange={e => setStagedDept(e.target.value)}
                                    placeholder="Ví dụ: 58614, 58615, 66708"
                                    className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-300 font-mono transition-all uppercase rounded-md"
                                />
                            </div>
                            {userRole === 'employee' && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Icon name="user-check" size={3.5} /> KHỚP TÊN BÁO CÁO (Chính xác như File YCX)</label>
                                    <input 
                                        type="text"
                                        value={stagedEmployee}
                                        onChange={e => setStagedEmployee(e.target.value)}
                                        placeholder="Ví dụ: 58614 - Nguyễn Đăng Khoa"
                                        className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-300 transition-all rounded-md"
                                    />
                                </div>
                            )}
                            <div className="md:col-span-2 mt-1">
                                <p className={`text-xs font-bold px-4 py-2 flex items-center gap-2 rounded-md ${userRole === 'manager' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                    {userRole === 'manager' 
                                        ? <><Icon name="check-circle" size={4} /> Quản lý có thể cập nhật chuỗi Mã Kho và áp dụng ngay lập tức mà không cần duyệt lại.</>
                                        : <><Icon name="alert-triangle" size={4} /> Gửi yêu cầu đổi Mã Kho sẽ tạm khóa quyền làm việc (về trạng thái Pending) cho đến khi Quản Lý Kho đó phê duyệt.</>}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1 rounded-lg">
                                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5"><Icon name="map-pin" size={3.5} /> Danh sách Mã Kho</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm truncate uppercase">{departmentId || 'Chưa Đăng Ký'}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1 rounded-lg">
                                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5"><Icon name="user-check" size={3.5} /> Tên Đối Chiếu NV</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm truncate px-1 italic">{employeeName || 'Không áp dụng'}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1 rounded-lg">
                                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5"><Icon name="shield" size={3.5} /> Chức năng khả dụng</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm truncate">{userRole === 'admin' ? 'Toàn bộ tính năng' : userRole === 'manager' ? 'Quản Lý Doanh Thu Kho' : 'Xem Báo Cáo Cá Nhân'}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1 rounded-lg">
                                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5"><Icon name="calendar" size={3.5} /> Thời hạn Cấp Phép</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm truncate">{expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'Vô Thời Hạn'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 mt-8 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button 
                    onClick={logout}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors shadow-sm flex items-center gap-2 rounded-lg"
                >
                    <Icon name="log-out" size={5} />
                    Đăng Xuất Tài Khoản
                </button>
            </div>
        </div>
    );
};
