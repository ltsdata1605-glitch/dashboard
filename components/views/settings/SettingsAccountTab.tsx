import React, { useState, useEffect } from 'react';
import { resolveIconName } from '../../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../../shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { toast } from '../../shared/ui/toast';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Banner } from '../../shared/ui/Banner';
import { ListGroup, ListRow } from '../../shared/ui/ListGroup';
import { usePageActions } from '../../shared/ui/PageActions';
import UserManagementView from '../UserManagementView';
import { ProductConfigManagerTab } from '../../../features/product-config';
import { formatCleanDisplayName, parseKhoList } from '../../../utils/dataUtils';
import { getApprovalSettings } from '../../../services/approvalSettingsService';

export const SettingsAccountTab: React.FC = () => {
    const { user, userRole, departmentId, employeeName, expiresAt, requestAccess, logout, isDemoMode, loginWithGoogle } = useAuth();
    const { activeTab } = useActiveTab();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Chế độ Dùng Thử: "đăng xuất" thực chất là THOÁT chế độ dùng thử (AuthContext.logout tắt demo) — gọi đúng tên.
    const nhanDangXuat = !user || isDemoMode ? 'Thoát chế độ dùng thử' : 'Đăng xuất';
    // iPhone: nút đăng xuất trên thanh trên qua khung app (GĐ7 — vùng chạm 44px, cùng chỗ với nút của các màn khác).
    // Laptop giữ nút có chữ ở thanh tiêu đề của chủ dự án (portal bên dưới).
    usePageActions(activeTab === 'settings'
        ? { scope: 'mobile', quick: [{ id: 'dang-xuat', label: nhanDangXuat, icon: 'logout', onSelect: logout }] }
        : null);

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
    const [autoApproveManagersEnabled, setAutoApproveManagersEnabled] = useState(false);
    const [autoApproveEmployeesEnabled, setAutoApproveEmployeesEnabled] = useState(true);

    useEffect(() => {
        // Chưa đăng nhập / Dùng thử: hàm máy chủ chỉ trả lỗi "cần đăng nhập" (log đầy cảnh báo) — dùng mặc định.
        if (!user || isDemoMode) return;
        getApprovalSettings(departmentId).then(cfg => {
            setAutoApproveManagersEnabled(Boolean(cfg.autoApproveManagers));
            setAutoApproveEmployeesEnabled(cfg.effectiveAutoApproveForDept !== false);
        }).catch(err => console.warn('Lỗi đọc cấu hình duyệt:', err));
    }, [departmentId, user, isDemoMode]);
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
                const res = await requestAccess('manager', parseKhoList(stagedDept).join(','), employeeName || '');
                setIsConfirmDoiKhoOpen(false);
                if (res && res.autoApproved) {
                    toast.success("Hệ thống đã tự động duyệt! Mã Kho mới đã có hiệu lực ngay lập tức.");
                } else {
                    toast.success("Đã gửi yêu cầu đổi Mã Kho — chờ Admin duyệt.");
                }
            } else {
                const res = await requestAccess(
                    'employee',
                    stagedDept,
                    stagedEmployee
                );
                if (res && res.autoApproved) {
                    toast.success("Hệ thống đã tự động duyệt! Thông tin hồ sơ mới đã có hiệu lực.");
                } else {
                    toast.success("Đã ghi nhận thay đổi. Yêu cầu xét duyệt lại kích hoạt...");
                }
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
            {/* Hồ sơ — GĐ7 (#11): việc nguy hiểm "Xoá tất cả dữ liệu" KHÔNG còn nằm cạnh tiêu đề đầu trang, đã xuống nhóm
                "Vùng nguy hiểm" cuối trang (kiểu Cài đặt iOS). */}
            <div>
                <h3 className="type-headline font-semibold text-slate-900 mb-3 sm:mb-4 px-1 sm:px-0">Hồ sơ định danh</h3>

                {(!user || isDemoMode) && (
                    <Banner
                        tone="warning"
                        title="Đang ở chế độ dùng thử"
                        action={{ label: 'Đăng nhập Google', onClick: loginWithGoogle }}
                        className="mb-4"
                        data-testid="banner-dung-thu"
                    >
                        Đăng nhập để tự đồng bộ dữ liệu giữa laptop và điện thoại.
                    </Banner>
                )}

                <div className="bg-white sm:bg-slate-50 p-3 sm:p-5 border border-slate-200 shadow-sm rounded-card">
                    {/* Header: Avatar + Name/Email/Role + Action Button */}
                    <div className={`flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3 sm:gap-6 ${isEditingProfile ? 'mb-4' : 'mb-0'}`}>
                        <div className="flex items-start gap-3 sm:gap-5 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="w-12 h-12 sm:w-20 sm:h-20 overflow-hidden shadow-xs bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center flex-shrink-0 rounded-popup">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <AppIcon name="user" size="state" className="text-sky-400" />
                                )}
                            </div>

                            {/* Name & Email & Role + Info Cards */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mb-0.5 sm:mb-1">
                                    <h4 className="text-base sm:text-xl font-black text-slate-800 dark:text-white leading-snug">
                                        {formatCleanDisplayName(user?.displayName)}
                                    </h4>
                                    <span className={`px-2 py-0.5 text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 rounded-full ${
                                        userRole === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                        userRole === 'manager' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    }`}>
                                        <AppIcon name={resolveIconName(userRole === 'manager' ? 'briefcase' : userRole === 'admin' ? 'shield' : 'users') ?? 'help'} size="xs" />
                                        {userRole === 'admin' ? 'Quản trị hệ thống' : userRole === 'manager' ? 'Quản lý kho' : 'Nhân viên'}
                                    </span>
                                </div>
                                <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-2">{user?.email}</p>

                                {/* Info Line - Gom lại thành đúng 2 hàng rõ ràng, ngăn cách bởi | */}
                                {!isEditingProfile && (
                                    <div className="space-y-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                                        {/* Hàng 1: Mã Kho & Tên NV */}
                                        <div className="flex items-center gap-x-2 min-w-0">
                                            <div className="flex items-center gap-1 shrink-0">
                                                <AppIcon name="location" size="xs" className="text-rose-500 shrink-0" />
                                                <span className="font-medium text-slate-500 dark:text-slate-400"><span className="hidden sm:inline">Mã </span>Kho:</span>
                                                <span className={`font-bold text-slate-800 ${departmentId || isSuperAdmin ? 'font-mono' : ''}`}>{isSuperAdmin ? 'ALL' : (departmentId || 'Chưa đăng ký')}</span>
                                                {isSuperAdmin && parseKhoList(departmentId).length > 0 && (
                                                    <span className="font-medium text-slate-500 dark:text-slate-400">
                                                        · <span className="hidden sm:inline">Kho dùng chung: </span><strong className="font-mono text-sky-700 dark:text-sky-400">{parseKhoList(departmentId).join(',')}</strong>
                                                    </span>
                                                )}
                                            </div>

                                            <span className="text-slate-300 dark:text-slate-600 select-none shrink-0">|</span>

                                            <div className="flex items-center gap-1 min-w-0 truncate">
                                                <AppIcon name="userCheck" size="xs" className="text-rose-500 shrink-0" />
                                                <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0"><span className="hidden sm:inline">Tên </span>NV:</span>
                                                <span className="font-bold text-amber-700 dark:text-amber-400 italic truncate" title={employeeName || 'N/A'}>{employeeName || 'N/A'}</span>
                                            </div>
                                        </div>

                                        {/* Hàng 2: Chức năng & Hạn */}
                                        <div className="flex items-center gap-x-2 min-w-0">
                                            <div className="flex items-center gap-1 shrink-0">
                                                <AppIcon name="security" size="xs" className="text-rose-500 shrink-0" />
                                                <span className="font-medium text-slate-500 dark:text-slate-400"><span className="hidden sm:inline">Chức năng</span><span className="sm:hidden">Quyền</span>:</span>
                                                <span className="font-bold text-slate-800 dark:text-white">
                                                    {userRole === 'admin' ? 'Toàn bộ' : userRole === 'manager' ? 'Quản lý kho' : 'Xem báo cáo'}
                                                </span>
                                            </div>

                                            <span className="text-slate-300 dark:text-slate-600 select-none shrink-0">|</span>

                                            <div className="flex items-center gap-1 min-w-0">
                                                <AppIcon name="calendar" size="xs" className="text-rose-500 shrink-0" />
                                                <span className="font-medium text-slate-500 dark:text-slate-400">Hạn:</span>
                                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                    {expiresAt ? expiresAt.toLocaleDateString('vi-VN') : 'Vô hạn'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Button — admin cũng sửa được (Super Admin: gắn Kho dùng chung) */}
                        <div className="flex items-center justify-end gap-2 flex-shrink-0 self-end sm:self-start mt-1 sm:mt-0">
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
                                    className="h-8 px-3 text-xs font-semibold"
                                >
                                    Huỷ
                                </Button>
                            )}
                            <Button
                                variant={isEditingProfile ? 'primary' : 'secondary'}
                                size="sm"
                                icon={isEditingProfile ? 'save' : 'edit'}
                                onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                                className="h-8 px-3 text-xs font-semibold shrink-0"
                                title={isEditingProfile ? 'Lưu' : (isSuperAdmin ? 'Gắn kho dùng chung' : 'Đổi mã kho')}
                            >
                                {isEditingProfile ? 'Lưu' : (isSuperAdmin ? 'Gắn kho dùng chung' : 'Đổi mã kho')}
                            </Button>
                        </div>
                    </div>

                    {/* Editing Form */}
                    {isEditingProfile && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-5 border-2 border-sky-100 dark:border-sky-900/50 rounded-control mb-6">
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
                                userRole === 'admin' || (userRole === 'manager' && autoApproveManagersEnabled) || (userRole === 'employee' && autoApproveEmployeesEnabled)
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                            }`}>
                                <AppIcon name={resolveIconName((userRole === 'admin' || (userRole === 'manager' && autoApproveManagersEnabled)) ? 'check-circle' : 'alert-triangle') ?? 'help'} size="md" />
                                {isSuperAdmin
                                    ? 'Áp dụng ngay: đọc/ghi được dữ liệu dùng chung (Phân tích, Report BI) của các Kho này — vẫn giữ toàn quyền Super Admin'
                                    : userRole === 'admin'
                                    ? 'Áp dụng ngay lập tức không cần duyệt'
                                    : userRole === 'manager'
                                    ? autoApproveManagersEnabled
                                        ? 'Hệ thống đang BẬT tự động duyệt: Quản lý đổi mã kho sẽ được kích hoạt ngay lập tức mà không cần Admin duyệt'
                                        : 'Gửi yêu cầu đổi Kho — tạm khoá quyền Quản lý cho đến khi Admin duyệt'
                                    : autoApproveEmployeesEnabled
                                    ? 'Hệ thống đang BẬT tự động duyệt: Nhân viên cập nhật kho được duyệt ngay'
                                    : 'Gửi yêu cầu, tạm khóa quyền cho đến khi Quản lý duyệt'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Phân Quyền Section & Khai Báo Ngành Hàng */}
            {(userRole === 'admin' || userRole === 'manager') ? (
                <div className="w-full">
                    <UserManagementView isEmbedded={true} />
                </div>
            ) : (
                <div className="w-full space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 flex items-center justify-center rounded-md">
                            <AppIcon name="settings" size="lg" />
                        </div>
                        <div>
                            <h2 className="text-[17px] font-bold text-slate-800 dark:text-white tracking-tight leading-7">Khai Báo Cấu Hình Ngành Hàng</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Xem định nghĩa nhóm hàng, hệ số quy đổi và tải file Excel cấu hình toàn hệ thống</p>
                        </div>
                    </div>
                    <ProductConfigManagerTab />
                </div>
            )}

            {/* Cuối trang kiểu Cài đặt iOS (GĐ7, #11): đăng xuất + VÙNG NGUY HIỂM — việc không hoàn tác được nằm cuối cùng, xa
                các thao tác hằng ngày, chữ đỏ, bấm vẫn phải xác nhận. */}
            <div className="space-y-6 pt-2">
                <ListGroup title="Tài khoản">
                    <ListRow icon="logout" iconTone="slate" label={nhanDangXuat} onClick={logout} data-testid="dang-xuat-cuoi-trang" />
                </ListGroup>
                <ListGroup
                    title="Vùng nguy hiểm"
                    footer="Xoá sạch dữ liệu đã lưu trên máy này và dữ liệu riêng của bạn trên cloud. Tài khoản đăng nhập vẫn giữ nguyên."
                    data-testid="vung-nguy-hiem"
                >
                    <ListRow icon="delete" destructive label="Xoá tất cả dữ liệu (Người dùng mới)" onClick={() => setIsResetModalOpen(true)} />
                </ListGroup>
            </div>

            {/* Laptop: nút đăng xuất có chữ ở thanh tiêu đề (khung của chủ dự án) — CHỈ khi đang ở tab 'settings'.
                iPhone dùng usePageActions ở trên (thanh trên của khung app). */}
            {mounted && activeTab === 'settings' && typeof document !== 'undefined' && document.getElementById('global-header-actions') && createPortal(
                <Button
                    variant="secondary"
                    size="sm"
                    icon="logout"
                    onClick={logout}
                    className="h-9 px-4 text-sm"
                    title={nhanDangXuat}
                >
                    {nhanDangXuat}
                </Button>,
                document.getElementById('global-header-actions')!
            )}

            <ConfirmDialog
                isOpen={isConfirmDoiKhoOpen}
                onClose={() => setIsConfirmDoiKhoOpen(false)}
                onConfirm={luuHoSo}
                isLoading={isSaving}
                variant={autoApproveManagersEnabled ? 'info' : 'warning'}
                title={autoApproveManagersEnabled ? 'Xác nhận đổi Mã Kho' : 'Gửi yêu cầu đổi Mã Kho?'}
                confirmText={autoApproveManagersEnabled ? 'Cập nhật ngay' : 'Gửi yêu cầu'}
                message={<>
                    {autoApproveManagersEnabled ? (
                        <>
                            Đổi sang Kho <strong>{parseKhoList(stagedDept).join(', ')}</strong>.
                            Hệ thống đang <strong>BẬT tự động duyệt</strong> nên quyền Quản lý kho mới sẽ có hiệu lực ngay!
                        </>
                    ) : (
                        <>
                            Đổi sang Kho <strong>{parseKhoList(stagedDept).join(', ')}</strong> cần <strong>Admin duyệt lại</strong>.
                            Trong lúc chờ, tài khoản <strong>tạm khoá quyền Quản lý</strong> (không xem được dữ liệu).
                        </>
                    )}
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
                title="Xoá tất cả dữ liệu?"
                confirmText="Xác nhận xoá sạch"
                cancelText="Huỷ"
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
