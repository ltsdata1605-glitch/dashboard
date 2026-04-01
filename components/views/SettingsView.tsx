import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import * as dbService from '../../services/dbService';
import { Icon } from '../common/Icon';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

type SettingsTab = 'appearance' | 'data' | 'account';

const FONTS = [
    { id: 'Inter', name: 'Inter (Khuyên dùng)' },
    { id: 'Roboto', name: 'Roboto' },
    { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans' },
    { id: 'Be Vietnam Pro', name: 'Be Vietnam Pro' }
];

const SettingsView: React.FC = () => {
    const { user, userRole, departmentId, employeeName, logout } = useAuth();
    const { isDarkMode, toggleDarkMode } = useLayout();
    
    const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
    const [font, setFont] = useState('Inter');
    const [isDeduplicationEnabled, setIsDeduplicationEnabled] = useState(true);
    const [configUrl, setConfigUrl] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    // Profile Editing
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [stagedDept, setStagedDept] = useState(departmentId || '');
    const [stagedEmployee, setStagedEmployee] = useState(employeeName || '');
    const { requestAccess } = useAuth();

    useEffect(() => {
        // Load initial settings
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

    const handleFontChange = async (newFont: string) => {
        setFont(newFont);
        await dbService.saveGlobalFont(newFont);
        if (newFont === 'Inter') {
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
        toast.success(newValue ? 'Đã BẬT tính năng Gộp Chứng Từ' : 'Đã TẮT tính năng Gộp Chứng Từ');
        toast('Vui lòng làm mới lại trang web để áp dụng bộ lọc mới.', { icon: '🔄' });
    };

    const handleClearLocalData = async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu lịch sử trên máy không? Thao tác này sẽ yêu cầu bạn tải lại File hoặc đồng bộ lại từ Cloud.')) return;
        
        setIsClearing(true);
        try {
            await dbService.clearSalesData();
            await dbService.clearProductConfig();
            await dbService.clearDepartmentMap();
            toast.success('Đã dọn dẹp bộ nhớ đệm thành công!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
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

    const tabs = [
        { id: 'appearance', label: 'Giao Diện', icon: 'palette' },
        ...(userRole === 'admin' || userRole === 'manager' ? [{ id: 'data', label: 'Lọc Dữ Liệu', icon: 'server' }] : []),
        { id: 'account', label: 'Tài Khoản', icon: 'user' }
    ];

    return (
        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    
                    {/* Settings Sidebar */}
                    <div className="md:w-64 bg-slate-50/50 dark:bg-slate-900/20 border-r border-slate-100 dark:border-slate-700/50 p-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Icon name="settings" className="text-indigo-500" />
                            Cài Đặt
                        </h2>
                        <nav className="space-y-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${
                                        activeTab === tab.id 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <Icon name={tab.icon as any} size={5} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 p-6 sm:p-8 bg-white dark:bg-slate-800">
                        <AnimatePresence mode="wait">
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
                                        
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
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
                                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
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
                            {activeTab === 'data' && (userRole === 'admin' || userRole === 'manager') && (
                                <motion.div 
                                    key="data"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Cấu Hình Kết Xuất Base Data</h3>
                                        
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Kết Nối Đám Mây</h3>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-base mb-2">Google Sheet File CSV</h4>
                                            <input 
                                                type="text" 
                                                readOnly 
                                                value={configUrl || 'Chưa thiết lập URL cấu hình YCX nào...'} 
                                                className="w-full bg-slate-200/50 dark:bg-slate-800 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 font-mono text-xs outline-none"
                                            />
                                            <p className="text-xs text-slate-400 mt-2">Dữ liệu Cấu trúc Danh mục (Product Config) được nạp trực tiếp qua Google Sheet Public.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-4 border-b border-rose-100 dark:border-rose-900/30 pb-2">Khu Vực Nguy Hiểm</h3>
                                        <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-200 dark:border-rose-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-rose-800 dark:text-rose-400 text-base">Xóa Cứng Toàn Bộ Bộ Nhớ Tạm</h4>
                                                <p className="text-sm text-rose-600/80 dark:text-rose-400/70 mt-1 max-w-md">Xóa sạch Dữ Liệu YCX (Sales Data), Cấu Hình, Sơ đồ Kho lưu trong Local Database của Trình duyệt. Bạn sẽ cần tải YCX lại từ đầu.</p>
                                            </div>
                                            <button 
                                                onClick={handleClearLocalData}
                                                disabled={isClearing}
                                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
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
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">Hồ Sơ Định Danh</h3>
                                        
                                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                {user?.photoURL ? (
                                                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Icon name="user" size={10} className="text-indigo-400" />
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 text-center sm:text-left w-full mt-4 sm:mt-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                                                    <div>
                                                        <h4 className="text-2xl font-black text-slate-800 dark:text-white">{user?.displayName || 'Thành viên YCX'}</h4>
                                                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-3">{user?.email}</p>
                                                    </div>
                                                    
                                                    {userRole !== 'admin' && (
                                                        <button 
                                                            onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                                                            className={`px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm ${isEditingProfile ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500'}`}
                                                        >
                                                            <Icon name={isEditingProfile ? "save" : "edit-3"} size={4} />
                                                            {isEditingProfile ? 'Lưu Dữ Liệu' : 'Sửa Mã Kho'}
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {isEditingProfile ? (
                                                    <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-bold text-slate-500">KHO QUẢN LÝ (Nhập mã kho, phân cách bởi dấu Phẩy)</label>
                                                            <input 
                                                                type="text"
                                                                value={stagedDept}
                                                                onChange={e => setStagedDept(e.target.value)}
                                                                placeholder="Ví dụ: 58614, 58615, 66708"
                                                                className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 font-mono"
                                                            />
                                                        </div>
                                                        {userRole === 'employee' && (
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-xs font-bold text-slate-500">TÊN NHÂN VIÊN (Phải khớp chính xác File YCX)</label>
                                                                <input 
                                                                    type="text"
                                                                    value={stagedEmployee}
                                                                    onChange={e => setStagedEmployee(e.target.value)}
                                                                    placeholder="Ví dụ: 58614 - Nguyễn Đăng Khoa"
                                                                    className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                                                                />
                                                            </div>
                                                        )}
                                                        <p className={`text-[11px] font-medium mt-2 ${userRole === 'manager' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                            {userRole === 'manager' 
                                                                ? '💡 Quản lý có thể cập nhật chuỗi Mã Kho và áp dụng ngay lập tức mà không cần Admin phê duyệt lại.' 
                                                                : '⚠️ Đổi Mã / Tên sẽ đưa tài khoản về trạng thái CHỜ DUYỆT LẠI bởi Quản lý Kho.'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${
                                                            userRole === 'admin' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' :
                                                            userRole === 'manager' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' :
                                                            'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800'
                                                        }`}>
                                                            {userRole === 'admin' ? 'Quản Trị Viên' : userRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên'}
                                                        </span>
                                                        
                                                        {departmentId && (
                                                            <span className="px-3 py-1 text-xs font-bold rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                                                KHO: {departmentId}
                                                            </span>
                                                        )}

                                                        {employeeName && (
                                                            <span className="px-3 py-1 text-xs font-bold rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 truncate max-w-[200px]" title={employeeName}>
                                                                NV: {employeeName}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 mt-8 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                        <button 
                                            onClick={logout}
                                            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors shadow-sm flex items-center gap-2"
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
        </div>
    );
};

export default SettingsView;
