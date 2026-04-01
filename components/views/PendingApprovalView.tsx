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
                            <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-3xl font-bold">
                                {user?.displayName?.[0] || user?.email?.[0] || '?'}
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
                        <div className="w-full space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 text-sm text-center">
                                Yêu cầu của bạn đã được ghi nhận. Vui lòng đợi QTV xét duyệt.
                            </div>
                            <button 
                                onClick={() => window.location.reload()}
                                className="w-full py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Icon name="refresh-ccw" size={4} />
                                <span>Tải lại trạng thái</span>
                            </button>
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
                                        placeholder="VD: 1022" 
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1 italic">Nhập chính xác MÃ KHO hiển thị trên báo cáo.</p>
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

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full py-3 mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="send" />}
                                    <span>Gửi Yêu Cầu</span>
                                </button>
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
