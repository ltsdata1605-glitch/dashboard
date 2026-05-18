import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout, useActiveTab } from '../../contexts/LayoutContext';
import * as dbService from '../../services/dbService';
import { Icon } from '../common/Icon';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useCloudSync } from '../../hooks/useCloudSync';
import { shareCloudConfig, fetchSharedConfigs, deleteSharedConfig, type SharedConfig } from '../../services/firestoreService';
import ModalWrapper from '../modals/ModalWrapper';
import UserManagementView from './UserManagementView';

type SettingsTab = 'appearance' | 'data' | 'account' | 'approval_link';

const FONTS = [
    { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Mặc định)' },
    { id: 'Inter', name: 'Inter' },
    { id: 'Oswald', name: 'Oswald' },
    { id: 'Roboto Condensed', name: 'Roboto Condensed' },
    { id: 'Fjalla One', name: 'Fjalla One' },
    { id: 'Archivo Narrow', name: 'Archivo Narrow' },
    { id: 'Jost', name: 'Jost' },
    { id: 'Josefin Sans', name: 'Josefin Sans' }
];

const SettingsView: React.FC = () => {
    const { user, userRole, departmentId, employeeName, expiresAt, logout, isDemoMode } = useAuth();
    const { isDarkMode, toggleDarkMode, setActiveTab: setLayoutTab } = useLayout();
    const { syncState, lastSyncTime, forceSync } = useCloudSync();
    
    const [activeTab, setActiveTab] = useState<SettingsTab>('account');
    const { activeTab: globalActiveTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => { 
        setMounted(true); 
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [font, setFont] = useState('Plus Jakarta Sans');
    const [isDeduplicationEnabled, setIsDeduplicationEnabled] = useState(true);
    const [configUrl, setConfigUrl] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    // Profile Editing
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [stagedDept, setStagedDept] = useState(departmentId || '');
    const [stagedEmployee, setStagedEmployee] = useState(employeeName || '');
    const { requestAccess } = useAuth();
    
    // Shared Configs State
    const [sharedConfigs, setSharedConfigs] = useState<SharedConfig[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareDescription, setShareDescription] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const savedFont = await dbService.getGlobalFont();
            if (savedFont) setFont(savedFont);

            const savedDedup = await dbService.getDeduplicationSetting();
            setIsDeduplicationEnabled(savedDedup);

            const productConfig = await dbService.getProductConfig();
            if (productConfig) setConfigUrl(productConfig.url);
        };
        loadSettings();
    }, []);

    // Only fetch configs when the activeTab === 'account'
    useEffect(() => {
        let isMounted = true;
        if (activeTab === 'account' || activeTab === 'data' || activeTab === 'appearance') {
            const loadConfigs = async () => {
                try {
                    const configs = await fetchSharedConfigs(userRole, departmentId);
                    if (isMounted) setSharedConfigs(configs);
                } catch (e) {
                    console.error("Lấy danh sách thư viện thất bại:", e);
                }
            };
            loadConfigs();
        }
        return () => {
            isMounted = false;
        };
    }, [activeTab, userRole, departmentId]);

    const handleFontChange = async (newFont: string) => {
        setFont(newFont);
        await dbService.saveGlobalFont(newFont);
        if (newFont === 'Plus Jakarta Sans') {
            document.body.style.fontFamily = '';
        } else {
            document.body.style.fontFamily = `'${newFont}', sans-serif`;
        }
        toast.success(`Đã đổi font chữ thành ${newFont}`);
    };

    const handleToggleDedup = async () => {
        const newValue = !isDeduplicationEnabled;
        setIsDeduplicationEnabled(newValue);
        await dbService.saveDeduplicationSetting(newValue);
        // Dispatch event so DashboardView picks up the change instantly
        window.dispatchEvent(new CustomEvent('dedup-changed', { detail: newValue }));
        toast.success(newValue ? 'Đã BẬT tính năng Gộp Chứng Từ' : 'Đã TẮT tính năng Gộp Chứng Từ');
    };

    const handleClearLocalData = async () => {
        if (!confirm('BÁO ĐỘNG ĐỎ: Thao tác này sẽ xoá rỗng toàn bộ dữ liệu tạm trên thiết bị cài đặt Bộ lọc / Bảng của bạn đã lưu trên Đám Mây. Bạn có chắc không?')) return;
        
        setIsClearing(true);
        try {
            const { clearCloudSettings } = await import('../../services/firestoreService');
            if (user) {
                await clearCloudSettings(user);
            }
            await dbService.clearAllSettings();
            await dbService.clearSalesData();
            toast.success('Đã Khôi Phục Gốc cấu hình thành công!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error("Lỗi khi wipe data:", error);
            toast.error('Có lỗi xảy ra khi dọn dẹp!');
        } finally {
            setIsClearing(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!stagedDept.trim()) return toast.error("Mã Kho không được bỏ trống");
        if (userRole === 'employee' && !stagedEmployee.trim()) return toast.error("Tên nhân viên không được bỏ trống");

        try {
            if (userRole === 'manager') {
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../../services/firebase');
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

    const handleShareConfig = async () => {
        if (!user || (!departmentId && userRole !== 'admin') || !userRole) return;
        if (!shareDescription.trim()) {
            toast.error("Vui lòng nhập tên/mô tả gợi nhớ cho mẫu cấu hình.");
            return;
        }

        setIsSharing(true);
        try {
            const allSettings = await dbService.getAllSettings();
            await shareCloudConfig(user, userRole, departmentId || '', shareDescription, allSettings);
            toast.success("Chia sẻ cấu hình thành công!");
            setShowShareModal(false);
            setShareDescription('');
        } catch (err) {
            console.error("Lỗi chia sẻ:", err);
            toast.error("Không thể chia sẻ cấu hình lúc này.");
        } finally {
            setIsSharing(false);
        }
    };

    const handleApplyConfig = async (config: SharedConfig) => {
        if (confirm(`Bạn có chắc muốn ghi đè cấu hình hiện tại bằng mẫu của [${config.authorName}]? Các thay đổi bộ lọc cá nhân cũ sẽ mất.`)) {
            try {
                const m = await import('../../services/dbService');
                await m.clearAllSettings();
                await m.importAllSettings(config.payload);
                toast.success("Áp dụng mẫu cấu hình thành công! Đang tải lại...", { duration: 4000 });
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                console.error("Lỗi áp dụng mẫu cấu hình:", err);
                toast.error("Áp dụng mẫu cấu hình thất bại.");
            }
        }
    };

    const tabs = [
        { id: 'account', label: 'Tài Khoản', icon: 'user' },
        { id: 'approval_link', label: 'Phân Quyền', icon: 'shield-check' },
        { id: 'data', label: 'Lọc Dữ Liệu', icon: 'server' }
    ];

    return (
        <>
            {/* Portal tabs to global header — same pattern as BiWrapper / Phân tích YCX */}
            {mounted && globalActiveTab === 'settings' && document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions') && createPortal(
                <div className={`flex items-center gap-1 ${isMobile ? '' : 'bg-white/60 dark:bg-slate-900/60 p-1 sm:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm'} animate-in fade-in zoom-in duration-300 max-w-full overflow-x-auto no-scrollbar`}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                                className={`flex items-center ${isMobile ? 'gap-1 px-2 py-1' : 'gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5'} rounded-full font-semibold ${isMobile ? 'text-[10px]' : 'text-xs sm:text-[13px]'} transition-all whitespace-nowrap shrink-0 ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-700/60'
                                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <Icon name={tab.icon as any} size={isMobile ? 4.5 : 4} />
                                {!isMobile && <span>{tab.label}</span>}
                            </button>
                        );
                    })}
                </div>,
                document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions')!
            )}

            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen p-2 sm:p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                {/* Settings Content */}
                <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700/50 p-3 sm:p-8 rounded-xl">
                        <AnimatePresence mode="wait">
                            {/* APPROVAL / PHÂN QUYỀN */}
                            {activeTab === 'approval_link' && (
                                <motion.div 
                                    key="approval_link"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="w-full"
                                >
                                    <div className="-m-6 sm:-m-8">
                                        <UserManagementView isEmbedded={true} />
                                    </div>
                                </motion.div>
                            )}

                            {/* APPEARANCE */}
                            {activeTab === 'appearance' && (
                                <motion.div 
                                    key="appearance"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Giao Diện Hệ Thống</h3>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-lg">
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-base">Chế Độ Tối (Dark Mode)</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Chuyển sang giao diện Dark Mode để bảo vệ mắt.</p>
                                            </div>
                                            <button 
                                                onClick={toggleDarkMode}
                                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            >
                                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Phông Chữ (Font Style)</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {FONTS.map(f => (
                                                <div 
                                                    key={f.id}
                                                    onClick={() => handleFontChange(f.id)}
                                                    className={`cursor-pointer p-4 border-2 transition-all rounded-lg ${
                                                        font === f.id 
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className={`font-bold ${font === f.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{f.name}</span>
                                                        {font === f.id && <Icon name="check-circle-2" size={5} className="text-indigo-500" />}
                                                    </div>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400" style={{ fontFamily: f.id }}>Aa Bb Cc 123 - Trải nghiệm báo cáo tốt hơn.</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* DATA MANAGEMENT */}
                            {activeTab === 'data' && (
                                <motion.div 
                                    key="data"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Cấu Hình Kết Xuất Base Data</h3>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg">
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-base">Gộp Đơn Cùng Chứng Từ (Deduplication)</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Các MÃ CHỨNG TỪ giống nhau sẽ bị gộp thành 1 dòng (tổng hợp doanh thu) để tránh làm trùng lặp khi xoay Pivot theo Đơn.</p>
                                            </div>
                                            <button 
                                                onClick={handleToggleDedup}
                                                className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${isDeduplicationEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            >
                                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDeduplicationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Kết Nối Đám Mây</h3>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-base mb-2">Google Sheet File CSV</h4>
                                            <input 
                                                type="text" 
                                                readOnly 
                                                value={configUrl || 'Chưa thiết lập URL cấu hình YCX nào...'} 
                                                className="w-full bg-slate-200/50 dark:bg-slate-800 px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs outline-none rounded-md"
                                            />
                                            <p className="text-xs text-slate-400 mt-2">Dữ liệu Cấu trúc Danh mục (Product Config) được nạp trực tiếp qua Google Sheet Public.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mb-2 sm:mb-4 border-b border-rose-100 dark:border-rose-900/30 pb-2">Khu Vực Nguy Hiểm</h3>
                                        <div className="bg-rose-50 dark:bg-rose-900/10 p-3 sm:p-5 border border-rose-200 dark:border-rose-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg">
                                            <div>
                                                <h4 className="font-bold text-rose-800 dark:text-rose-400 text-base">Xóa Cứng Toàn Bộ Bộ Nhớ Tạm</h4>
                                                <p className="text-sm text-rose-600/80 dark:text-rose-400/70 mt-1 max-w-md">Xóa sạch Dữ Liệu YCX (Sales Data), Cấu Hình, Sơ đồ Kho lưu trong Local Database của Trình duyệt. Bạn sẽ cần tải YCX lại từ đầu.</p>
                                            </div>
                                            <button 
                                                onClick={handleClearLocalData}
                                                disabled={isClearing}
                                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 rounded-lg"
                                            >
                                                {isClearing ? 'Đang Xóa...' : 'Khôi Phục Mặc Định Trình Duyệt'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ACCOUNT */}
                            {activeTab === 'account' && (
                                <motion.div 
                                    key="account"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
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

                                    {/* Cloud Sync Information */}
                                    <div className="mt-8">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">Đồng Bộ Lưu Trữ Đám Mây</h3>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-lg">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-lg ${syncState === 'synced' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : syncState === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                                    <Icon name={syncState === 'synced' ? 'cloud-check' : syncState === 'error' ? 'cloud-off' : 'cloud-snow'} size={6} className={syncState === 'syncing' ? 'animate-pulse' : ''} />
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-bold text-slate-800 dark:text-white">Sao Lưu Toàn Diện</h4>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Mọi bộ lọc, bảng tự tạo, cột tuỳ chỉnh cá nhân sẽ được tự động Push lên mây khi bạn rời ứng dụng, và tự động Pull về trên thiết bị khác.</p>
                                                    <p className="text-xs font-bold mt-2 text-slate-400 dark:text-slate-500">
                                                        Lần cập nhật cuối: <span className="text-indigo-500">{lastSyncTime ? lastSyncTime.toLocaleTimeString('vi-VN') : 'Đang đợi thao tác Mới'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={forceSync}
                                                disabled={syncState === 'syncing' || !user || isDemoMode}
                                                className={`px-5 py-2.5 whitespace-nowrap font-bold flex items-center justify-center gap-2 transition-all shadow-sm w-full md:w-auto rounded-lg
                                                    ${syncState === 'syncing' ? 'bg-indigo-100 text-indigo-400 dark:bg-indigo-900/20 cursor-not-allowed' : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:border-indigo-500'}`}
                                            >
                                                <Icon name={syncState === 'syncing' ? 'loader-2' : 'refresh-ccw'} size={4} className={syncState === 'syncing' ? 'animate-spin' : ''} />
                                                {syncState === 'syncing' ? 'Đang Sao Lưu...' : 'Bắt Buộc Lưu Trữ'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Mẫu Cấu hình Dùng chung */}
                                    <div className="mt-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Thư Viện Cấu Hình</h3>
                                            {(userRole === 'admin' || userRole === 'manager' || userRole === 'employee') && (
                                                <button 
                                                    onClick={() => setShowShareModal(true)}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 font-bold flex items-center gap-2 transition-colors text-sm border border-indigo-100 dark:border-indigo-800 rounded-lg"
                                                >
                                                    <Icon name="share-2" size={4} />
                                                    Đăng Bài Chia Sẻ
                                                </button>
                                            )}
                                        </div>
                                        
                                        {sharedConfigs.length === 0 ? (
                                            <div className="bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center flex flex-col items-center justify-center text-slate-500 rounded-lg">
                                                <Icon name="layout-template" size={10} className="text-slate-300 dark:text-slate-700 mb-3" />
                                                <p className="font-medium text-sm">Chưa có Cấu Hình nào được chia sẻ trong hệ thống của bạn.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {sharedConfigs.map(config => (
                                                    <div key={config.id} className="bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors rounded-lg">
                                                        <div>
                                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1">{config.description}</h4>
                                                                <span className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap uppercase tracking-wider flex-shrink-0 rounded-md ${config.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                                                    {config.role === 'admin' ? 'Super Admin' : config.role === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên'}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 mb-4">
                                                                <p className="flex items-center gap-1.5"><Icon name="user" size={3.5} /> Được tạo bởi: <strong>{config.authorName}</strong></p>
                                                                <p className="flex items-center gap-1.5"><Icon name="calendar-days" size={3.5} /> Ngày đăng: {config.createdAt?.toDate ? config.createdAt.toDate().toLocaleDateString('vi-VN') : 'Mới đây'}</p>
                                                                {config.role !== 'admin' && <p className="flex items-center gap-1.5 text-indigo-500"><Icon name="map-pin" size={3.5} /> Phạm vi: Kho {config.departmentId}</p>}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                            {(user?.uid === config.uid || userRole === 'admin') ? (
                                                                <button 
                                                                    onClick={() => {
                                                                        if (confirm("Chắc chắn xoá bài đăng này?")) {
                                                                            deleteSharedConfig(config.id).then(() => toast.success("Đã xoá cấu hình."));
                                                                        }
                                                                    }}
                                                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors tooltip rounded-md"
                                                                    title="Xoá bài đăng của bạn"
                                                                >
                                                                    <Icon name="trash-2" size={4} />
                                                                </button>
                                                            ) : <div />}
                                                            
                                                            <button 
                                                                onClick={() => handleApplyConfig(config)}
                                                                className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 text-sm font-bold flex items-center gap-2 transition-colors rounded-lg"
                                                            >
                                                                <Icon name="download-cloud" size={4} />
                                                                Đồng Bộ Về Máy
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
                                </motion.div>
                            )}
                        </AnimatePresence>
                </div>
            </div>
        </div>

            <ModalWrapper
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                title="Chia Sẻ Cấu Hình Hệ Thống"
                subTitle="Đóng gói Thiết lập Bảng & Cột"
                maxWidthClass="max-w-md"
                titleColorClass="text-indigo-600 dark:text-indigo-400"
            >
                <div className="p-4 sm:p-6">
                    <div className="mb-4 sm:mb-6 bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 text-xs sm:text-sm text-blue-700 dark:text-blue-300 rounded-lg">
                        <Icon name="info" size={4} className="inline mr-1.5 sm:mr-2" />
                        <strong className="font-bold">Mọi người {userRole === 'admin' ? 'trong toàn hệ thống' : `(trong nhóm Mã Kho ${departmentId})`}</strong> sẽ có thể sao chép giao diện cột, cấu hình bảng Tranh tài, Industry mà bạn đã cài đặt. Mẫu sẽ chia sẻ ẩn danh báo cáo Excel của riêng bạn.
                    </div>

                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">Tên gợi nhớ cho Cấu hình</label>
                    <input 
                        type="text" 
                        value={shareDescription}
                        onChange={e => setShareDescription(e.target.value)}
                        placeholder="Nhập tên dễ hiểu..."
                        maxLength={60}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 mb-1.5 sm:mb-2 transition-all dark:text-white rounded-md"
                        autoFocus
                    />
                    <div className="text-right text-[10px] sm:text-xs text-slate-400 mb-4 sm:mb-6">{shareDescription.length}/60</div>

                    <div className="flex justify-end gap-2 sm:gap-3">
                        <button 
                            onClick={() => setShowShareModal(false)} 
                            className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors rounded-lg"
                        >
                            Huỷ Bỏ
                        </button>
                        <button 
                            onClick={handleShareConfig}
                            disabled={isSharing || !shareDescription.trim()}
                            className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 transition-all rounded-lg"
                        >
                            {isSharing && <Icon name="loader-2" size={4} className="animate-spin" />}
                            {isSharing ? 'Đang Đăng...' : 'Đăng Phiên Bản'}
                        </button>
                    </div>
                </div>
            </ModalWrapper>
        </>
    );
};

export default SettingsView;
