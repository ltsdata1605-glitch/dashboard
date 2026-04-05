import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../common/Icon';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

const PendingApprovalView: React.FC = () => {
    const { user, logout, status, requestAccess } = useAuth();
    const [selectedRole, setSelectedRole] = useState<'manager' | 'employee' | null>(null);
    const [deptId, setDeptId] = useState('');
    const [empName, setEmpName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole || !deptId) {
            toast.error('Vui lòng nhập đầy đủ thông tin mã kho.');
            return;
        }
        if (selectedRole === 'employee' && !empName) {
            toast.error('Vui lòng nhập tên nhân viên.');
            return;
        }

        setIsSubmitting(true);
        try {
            await requestAccess(selectedRole, deptId, empName);
            toast.success('Gửi yêu cầu thành công! Admin/Quản lý sẽ duyệt sớm nhất.');
        } catch (error) {
            toast.error('Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 h-full flex items-center justify-center p-6 relative overflow-y-auto">
            {/* Background effects */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px]"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800"
            >
                {/* Header Decoration */}
                <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
                </div>

                <div className="px-8 pb-8 pt-0 relative flex flex-col items-center">
                    {/* User Avatar */}
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 p-2 shadow-lg -mt-12 mb-6 relative z-10 mx-auto">
                        {user?.photoURL ? (
                            <img 
                                src={user.photoURL} 
                                alt={user.displayName || 'User'} 
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-3xl font-bold uppercase">
                                {user?.email ? user.email[0] : '?'}
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-amber-400 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-sm">
                            <Icon name={status === 'new' ? 'user-plus' : 'clock'} size={3.5} className="text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-display text-center">
                        {status === 'pending' ? 'Đang Chờ Phê Duyệt' : 'Đăng Ký Quyền Truy Cập'}
                    </h2>
                    
                    <div className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 text-center">
                        Xin chào <strong className="text-slate-700 dark:text-slate-200">{user?.displayName || user?.email}</strong>,
                    </div>

                    {status === 'pending' ? (
                        <div className="w-full space-y-4 text-center">
                            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 text-sm text-center leading-relaxed">
                                Yêu cầu của bạn đã được ghi nhận thành công.<br/>
                                <span className="font-semibold">Vui lòng liên hệ Admin qua LINE để được duyệt nhanh nhất.</span>
                            </div>

                            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl bg-white dark:bg-slate-900 mb-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Quét mã QR bằng LINE</p>
                                <img 
                                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://line.me/ti/p/VOUflskKB0&margin=10" 
                                    alt="QR Code LINE Admin" 
                                    className="w-32 h-32 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 mb-4 bg-white"
                                />
                                <a 
                                    href="https://line.me/ti/p/VOUflskKB0" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 px-6 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Icon name="message-circle" size={4} />
                                    Bấm vào đây để Nhắn Tin LINE
                                </a>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Icon name="refresh-ccw" size={4} />
                                    Tải lại
                                </button>
                                <button 
                                    type="button" 
                                    onClick={logout} 
                                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-rose-500 font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Icon name="log-out" size={4} />
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="w-full text-left">
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Vai trò muốn đăng ký:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole('manager')}
                                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedRole === 'manager' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-500'}`}
                                    >
                                        <Icon name="briefcase" size={6} />
                                        <span className="font-semibold text-sm">Quản lý Kho</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole('employee')}
                                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedRole === 'employee' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 text-slate-500'}`}
                                    >
                                        <Icon name="users" size={6} />
                                        <span className="font-semibold text-sm">Nhân viên</span>
                                    </button>
                                </div>
                            </div>
                            
                            <motion.div animate={{ height: selectedRole ? 'auto' : 0, opacity: selectedRole ? 1 : 0 }} className="overflow-hidden space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mã Kho (Chi nhánh):</label>
                                    <input 
                                        type="text" 
                                        value={deptId}
                                        onChange={(e) => setDeptId(e.target.value)}
                                        placeholder={selectedRole === 'manager' ? "VD: 1022, 58614, 12345" : "VD: 1022"} 
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    />
                                    {selectedRole === 'manager' ? (
                                        <p className="text-[11px] text-slate-500 mt-1 italic">
                                            Quản lý có thể nhập <strong>nhiều mã kho</strong>, ngăn cách bằng dấu phẩy (,).
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-slate-500 mt-1 italic">
                                            Nhân viên chỉ được đăng nhập <strong>một kho duy nhất</strong>.
                                        </p>
                                    )}
                                </div>

                                {selectedRole === 'employee' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tên Nhân Viên (Trong Báo Cáo):</label>
                                        <input 
                                            type="text" 
                                            value={empName}
                                            onChange={(e) => setEmpName(e.target.value)}
                                            placeholder="VD: 58614 - Trương Hoàng Phúc" 
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                            required={selectedRole === 'employee'}
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1 italic">Vui lòng nhập <strong className="font-bold text-slate-700 dark:text-slate-300">đúng Cú pháp: [Mã NV] - [Họ Tên]</strong>. Tính năng này yêu cầu định dạng phải chuẩn xác để tự động lọc dữ liệu.</p>
                                    </div>
                                )}
                                {selectedRole && (
                                    <div className="pt-4 flex gap-3">
                                        <button 
                                            type="button" 
                                            onClick={logout} 
                                            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Icon name="log-out" size={4} />
                                            Đăng xuất
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="check-circle" size={5} />}
                                            {isSubmitting ? 'Đang gửi...' : 'Gửi Đăng Ký'}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </form>
                    )}

                    <button 
                        onClick={() => logout()}
                        className="w-full mt-4 py-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <Icon name="log-out" size={4} />
                        <span>Đăng xuất tài khoản khác</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default PendingApprovalView;
