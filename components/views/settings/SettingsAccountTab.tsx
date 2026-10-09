import React, { useState, useEffect } from 'react';
import { resolveIconName } from '../../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../../shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useActiveTab } from '../../../contexts/LayoutContext';
import toast from 'react-hot-toast';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import UserManagementView from '../UserManagementView';
import { formatCleanDisplayName, parseKhoList } from '../../../utils/dataUtils';

export const SettingsAccountTab: React.FC = () => {
    const { user, userRole, departmentId, employeeName, expiresAt, requestAccess, logout } = useAuth();
    const { activeTab } = useActiveTab();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Super Admin mang nhãn "ALL (Super Admin)" kèm các Kho thật gắn thêm (vd "ALL (Super Admin),910",
    // xem functions/src/superAdminDept.ts). Ô sửa chỉ hiện/nhận các Kho thật — nhãn giữ tự động.
    const isSuperAdmin = userRole === 'admin' && (departmentId || '').startsWith('ALL (Super Admin)');
    const khoDeSua = (dept: string | undefined | null) => (isSuperAdmin ? parseKhoList(dept).join(', ') : (dept || ''));

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [stagedDept, setStagedDept] = useState(khoDeSua(departmentId));
    const [stagedEmployee, setStagedEmployee] = useState(employeeName || '');
    const [deptError, setDeptError] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isConfirmDoiKhoOpen, setIsConfirmDoiKhoOpen] = useState(false);
    // Hộp xác nhận "xoá toàn bộ dữ liệu" (tự dựng — audit A34): hành vi modal chuẩn; không đóng khi đang xoá.

    // "Xoá tất cả dữ liệu" xoá kèm báo cáo Luỹ kế & Thi đua DÙNG CHUNG của Kho — CHỈ khi là quản lý,
    // CHỈ đúng Kho của họ. Admin / Super Admin KHÔNG BAO GIỜ xoá: Kho gắn thêm của Super Admin (vd 910)
    // là Kho dùng chung với người khác, không phải Kho của mình. (Trước 2026-09-27 nhánh này không
    // bao giờ chạy — xem implementation_plan.md "Sửa 2 lỗi có sẵn ở Hồ sơ Định danh".)
    const khoXoaBaoCaoChung = userRole === 'manager' ? parseKhoList(departmentId) : [];

    const handleConfirmResetData = async () => {
        try {
            setIsResetting(true);
            const { resetAllDataAsNewUser } = await import('../../../services/localDataOwner');
            await resetAllDataAsNewUser(user, { khoXoaBaoCaoChung });
            toast.success("Đã xoá toàn bộ dữ liệu! Đang tải lại ứng dụng...", { duration: 3000 });
            setIsResetModalOpen(false);
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname;
            }, 1200);
        } catch (error) {
            console.error("Lỗi khi xoá dữ liệu:", error);
            toast.error("Có lỗi xảy ra khi xoá dữ liệu!");
            setIsResetting(false);
        }
    };

    const validateDept = (value: string): string => {
        if (!value.trim()) return "Mã Kho không được bỏ trống";
        const codes = value.split(',').map(c => c.trim()).filter(c => c);
        if (codes.length === 0) return "Mã Kho không được bỏ trống";
        for (const code of codes) {
            if (!/^\d{3,6}$/.test(code)) return `Mã Kho phải là số (ví dụ: 1032, 3717, 910, 58614). Hiện tại: "${code}" không hợp lệ`;
        }
        return '';
    };

    const handleSaveProfile = async () => {
        // Super Admin được để trống (= chỉ còn nhãn, không dùng chung Kho nào — như trước 2026-09-27)
        const deptErr = isSuperAdmin && !stagedDept.trim() ? '' : validateDept(stagedDept);
        setDeptError(deptErr);
        if (deptErr) return;
        if (userRole === 'employee' && !stagedEmployee.trim()) return toast.error("Tên nhân viên không được bỏ trống");

        if (userRole === 'manager') {
            // Quản lý KHÔNG tự đổi Kho ngay được (tự cấp quyền xem dữ liệu siêu thị khác) — đổi Kho là
            // gửi yêu cầu để Admin duyệt lại, tài khoản tạm khoá quyền trong lúc chờ → hỏi trước.
            const sapXep = (d: string | null | undefined) => parseKhoList(d).sort().join(',');
            if (sapXep(stagedDept) === sapXep(departmentId)) {
                setIsEditingProfile(false);
                toast('Mã Kho không thay đổi.');
                return;
            }
            setIsConfirmDoiKhoOpen(true);
            return;
        }
        await luuHoSo();
    };

    const luuHoSo = async () => {
        try {
            setIsSaving(true);
            if (userRole === 'admin') {
                // Admin tự sửa Kho của CHÍNH MÌNH qua Cloud Function (departmentId là field bảo vệ,
                // Rules chặn ghi thẳng từ client). adminUpdateUser đặt lại custom claims → làm mới
                // token để Rules (myKhos) nhận Kho mới ngay, không phải đăng xuất.
                const { adminUpdateUser } = await import('../../../services/adminUserService');
                const khos = parseKhoList(stagedDept);
                const newDept = isSuperAdmin ? ['ALL (Super Admin)', ...khos].join(',') : khos.join(',');
                await adminUpdateUser({ targetUid: user!.uid, departmentId: newDept });
                await user!.getIdToken(true);
                toast.success(khos.length
                    ? `Đã gắn Kho dùng chung: ${khos.join(', ')}`
                    : 'Đã bỏ Kho dùng chung — chỉ còn quyền Super Admin');
            } else if (userRole === 'manager') {
                // Trước đây ghi thẳng departmentId bằng updateDoc: field bảo vệ nên Firestore Rules
                // từ chối, nhưng giao diện vẫn báo "thành công". Đi đúng luồng hợp lệ như nhân viên.
                await requestAccess('manager', parseKhoList(stagedDept).join(','), employeeName || '');
                setIsConfirmDoiKhoOpen(false);
                toast.success("Đã gửi yêu cầu đổi Mã Kho — chờ Admin duyệt.");
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
            setIsConfirmDoiKhoOpen(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Tài Khoản Section */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Hồ Sơ Định Danh</h3>
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={() => setIsResetModalOpen(true)}
                        className="min-h-11 sm:min-h-0 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-300 shadow-2xs cursor-pointer active:scale-95"
                        title="Xoá tất cả dữ liệu cục bộ và đưa về trạng thái như người dùng mới hoàn toàn"
                    >
                        <AppIcon name="delete" size="md" />
                        <span>Xoá tất cả dữ liệu (Người dùng mới)</span>
                    </Button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg">
                    {/* Header: Avatar + Name/Email/Role + Action Button */}
                    {/* iPhone: nút sửa xuống hàng riêng (trước nằm chung hàng → tràn khỏi thẻ, dòng thông tin
                        bị ép thành cột hẹp, chữ gãy vụn). Từ sm: trở lên giữ bố cục 1 hàng như cũ. */}
                    <div className={`flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3 sm:gap-6 ${isEditingProfile ? 'mb-4' : 'mb-0'}`}>
                        <div className="flex items-start gap-3 sm:gap-6 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="w-16 h-16 sm:w-24 sm:h-24 overflow-hidden shadow-md bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center flex-shrink-0 rounded-xl">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <AppIcon name="user" size="state" className="text-sky-400" />
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
                                        <AppIcon name={resolveIconName(userRole === 'manager' ? 'briefcase' : userRole === 'admin' ? 'shield' : 'users') ?? 'help'} size="sm" />
                                        {userRole === 'admin' ? 'Quản Trị Hệ Thống' : userRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên Mảng'}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-2.5">{user?.email}</p>

                                {/* Info Line - Tất cả thông tin nằm trên 1 dòng, ngăn cách bởi | */}
                                {!isEditingProfile && (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                                            <AppIcon name="location" size="sm" className="text-rose-500" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Mã Kho:</span>
                                            <span className="font-bold text-slate-800 dark:text-white font-mono">{isSuperAdmin ? 'ALL (Super Admin)' : (departmentId || 'Chưa đăng ký')}</span>
                                            {isSuperAdmin && (
                                                <span className="font-medium text-slate-500 dark:text-slate-400">
                                                    · Kho dùng chung: <strong className="font-mono text-sky-700 dark:text-sky-400">{parseKhoList(departmentId).join(', ') || 'chưa gắn'}</strong>
                                                </span>
                                            )}
                                        </div>

                                        <span className="hidden sm:inline text-slate-300 dark:text-slate-600 select-none">|</span>

                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                                            <AppIcon name="userCheck" size="sm" className="text-rose-500" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Tên NV:</span>
                                            <span className="font-bold text-amber-700 dark:text-amber-400 italic">{employeeName || 'N/A'}</span>
                                        </div>

                                        <span className="hidden sm:inline text-slate-300 dark:text-slate-600 select-none">|</span>

                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                                            <AppIcon name="security" size="sm" className="text-rose-500" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Chức năng:</span>
                                            <span className="font-bold text-slate-800 dark:text-white">
                                                {userRole === 'admin' ? 'Toàn bộ' : userRole === 'manager' ? 'Quản lý kho' : 'Xem báo cáo'}
                                            </span>
                                        </div>

                                        <span className="hidden sm:inline text-slate-300 dark:text-slate-600 select-none">|</span>

                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                                            <AppIcon name="calendar" size="sm" className="text-rose-500" />
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Hạn:</span>
                                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                {expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'Vô hạn'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Button — admin cũng sửa được (Super Admin: gắn Kho dùng chung) */}
                            <div className="flex items-center justify-end gap-2 flex-shrink-0">
                                {isEditingProfile && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setIsEditingProfile(false);
                                            setStagedDept(khoDeSua(departmentId));
                                            setStagedEmployee(employeeName || '');
                                            setDeptError('');
                                        }}
                                        className="px-3 py-2 text-xs font-semibold"
                                    >
                                        Hủy
                                    </Button>
                                )}
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                                    className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-all shadow-sm rounded-lg flex-shrink-0 ${
                                        isEditingProfile
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : 'bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800/30 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                                    }`}
                                >
                                    <AppIcon name={isEditingProfile ? 'save' : 'edit'} size="md" />
                                    {isEditingProfile ? 'Lưu' : (isSuperAdmin ? 'Gắn kho dùng chung' : 'Đổi mã kho')}
                                </Button>
                            </div>
                    </div>

                    {/* Editing Form */}
                    {isEditingProfile && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-5 border-2 border-sky-100 dark:border-sky-900/50 rounded-lg mb-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><AppIcon name="location" size="sm" /> {isSuperAdmin ? 'KHO DÙNG CHUNG (thêm vào quyền Super Admin)' : 'MÃ KHO ĐĂNG KÝ'}</label>
                                <input
                                    type="text"
                                    value={stagedDept}
                                    onChange={e => {
                                        setStagedDept(e.target.value);
                                        setDeptError(isSuperAdmin && !e.target.value.trim() ? '' : validateDept(e.target.value));
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !deptError && !isSaving) {
                                            handleSaveProfile();
                                        }
                                    }}
                                    placeholder="Ví dụ: 1032, 3717, 910, 58614"
                                    className={`text-sm bg-slate-50 dark:bg-slate-900 border p-3 outline-none transition-all uppercase rounded-md text-slate-700 dark:text-slate-300 font-mono ${
                                        deptError
                                            ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                            : 'border-slate-200 dark:border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                                    }`}
                                />
                                {deptError && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"><AppIcon name="alert" size="sm" /> {deptError}</p>}
                                {!deptError && stagedDept && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><AppIcon name="success" size="sm" /> Nhấn Enter hoặc click Lưu</p>}
                            </div>
                            {userRole === 'employee' && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><AppIcon name="userCheck" size="sm" /> KHỚP TÊN BÁO CÁO</label>
                                    <input
                                        type="text"
                                        value={stagedEmployee}
                                        onChange={e => setStagedEmployee(e.target.value)}
                                        placeholder="Ví dụ: 276650 - Nguyễn Văn A hoặc 1032 - Nguyễn Văn A"
                                        className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-700 dark:text-slate-300 transition-all rounded-md"
                                    />
                                </div>
                            )}
                            <div className={`md:col-span-2 text-xs font-bold px-4 py-2 flex items-center gap-2 rounded-md ${
                                userRole === 'admin'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                            }`}>
                                <AppIcon name={resolveIconName(userRole === 'admin' ? 'check-circle' : 'alert-triangle') ?? 'help'} size="md" />
                                {isSuperAdmin
                                    ? 'Áp dụng ngay: đọc/ghi được dữ liệu dùng chung (Phân tích, Report BI) của các Kho này — vẫn giữ toàn quyền Super Admin'
                                    : userRole === 'admin'
                                    ? 'Áp dụng ngay lập tức không cần duyệt'
                                    : userRole === 'manager'
                                    ? 'Gửi yêu cầu đổi Kho — tạm khoá quyền Quản lý cho đến khi Admin duyệt'
                                    : 'Gửi yêu cầu, tạm khóa quyền cho đến duyệt'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Phân Quyền Section */}
            {(userRole === 'admin' || userRole === 'manager') && (
                <div className="w-full">
                    <UserManagementView isEmbedded={true} />
                </div>
            )}

            {/* Portaled Logout Button to Top Header Bar - CHỈ xuất hiện khi đang ở tab 'settings' (Phân Quyền & Duyệt Yêu Cầu) */}
            {mounted && activeTab === 'settings' && typeof document !== 'undefined' && document.getElementById('global-header-actions') && createPortal(
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 shadow-sm transition-all group"
                    title="Đăng xuất tài khoản"
                >
                    <AppIcon name="logout" size="md" className="text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                    <span>Đăng Xuất Tài Khoản</span>
                </Button>,
                document.getElementById('global-header-actions')!
            )}
            {mounted && activeTab === 'settings' && typeof document !== 'undefined' && document.getElementById('mobile-topbar-actions') && createPortal(
                <Button
                    variant="unstyled"
                    size="none"
                    onClick={logout}
                    className="min-h-11 sm:min-h-0 shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors mr-1"
                    title="Đăng xuất tài khoản"
                >
                    <AppIcon name="logout" size="md" />
                    <span>Đăng Xuất</span>
                </Button>,
                document.getElementById('mobile-topbar-actions')!
            )}

            <ConfirmDialog
                isOpen={isConfirmDoiKhoOpen}
                onClose={() => setIsConfirmDoiKhoOpen(false)}
                onConfirm={luuHoSo}
                isLoading={isSaving}
                variant="warning"
                title="Gửi yêu cầu đổi Mã Kho?"
                confirmText="Gửi yêu cầu"
                message={<>
                    Đổi sang Kho <strong>{parseKhoList(stagedDept).join(', ')}</strong> cần <strong>Admin duyệt lại</strong>.
                    Trong lúc chờ, tài khoản <strong>tạm khoá quyền Quản lý</strong> (không xem được dữ liệu).
                </>}
            />

            {/* Xác nhận xoá toàn bộ dữ liệu như người dùng mới — ConfirmDialog dùng chung (danger) */}
            <ConfirmDialog
                isOpen={isResetModalOpen}
                onClose={() => { if (!isResetting) setIsResetModalOpen(false); }}
                onConfirm={handleConfirmResetData}
                isLoading={isResetting}
                variant="danger"
                zIndex="z-[9999]"
                title="Xoá Tất Cả Dữ Liệu"
                confirmText="Xác nhận xoá sạch"
                cancelText="Hủy bỏ"
                message={
                    <div className="text-xs text-slate-600 space-y-2 leading-relaxed text-left">
                            <p>
                                Hành động này sẽ <strong>xoá sạch toàn bộ dữ liệu cục bộ</strong> đã lưu trên thiết bị (Doanh thu, Phân ca, Báo cáo khai thác, Lịch sử tính thuế, Cấu hình siêu thị, Dữ liệu tạm...).
                            </p>
                            <p>
                                Và <strong>xoá luôn trên cloud</strong>: dữ liệu riêng của tài khoản bạn
                                {khoXoaBaoCaoChung.length > 0 ? (
                                    <>, <strong className="text-rose-600 dark:text-rose-400">kèm báo cáo Luỹ kế &amp; Thi đua dùng chung của Kho {khoXoaBaoCaoChung.join(', ')}</strong> — mọi người cùng Kho sẽ mất các báo cáo đó và <strong>không khôi phục lại được</strong>.</>
                                ) : (
                                    <>. Báo cáo dùng chung của các Kho <strong>được giữ nguyên</strong>{userRole === 'admin' ? ' (tài khoản Admin không xoá dữ liệu dùng chung của Kho)' : ''}.</>
                                )}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                                Ứng dụng sẽ trở về trạng thái ban đầu như một <strong>người dùng mới hoàn toàn</strong>. Tài khoản đăng nhập của bạn vẫn được giữ nguyên.
                            </p>
                    </div>
                }
            />
        </div>
    );
};
