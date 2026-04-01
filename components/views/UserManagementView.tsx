import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Icon } from '../common/Icon';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface AccessRequest {
    id: string;
    displayName: string;
    email: string;
    photoURL: string;
    requestedRole: 'manager' | 'employee';
    departmentId: string;
    employeeName: string;
    status: 'pending' | 'approved' | 'rejected' | 'new';
    createdAt: any;
    requestDate: any;
}

const UserManagementView: React.FC = () => {
    const { user, userRole, departmentId } = useAuth();
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});

    const fetchRequests = async () => {
        if (!userRole) return;
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'users');
            let q;
            
            // Admin sees Manager requests
            if (userRole === 'admin') {
                q = query(usersRef, where('status', '==', 'pending'), where('requestedRole', '==', 'manager'));
            } 
            // Manager sees Employee requests for their specific department
            else if (userRole === 'manager' && departmentId) {
                q = query(usersRef, where('status', '==', 'pending'), where('requestedRole', '==', 'employee'), where('departmentId', '==', departmentId));
            } else {
                setRequests([]);
                setIsLoading(false);
                return;
            }

            const querySnapshot = await getDocs(q);
            const data: AccessRequest[] = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data() as any;
                data.push({ id: doc.id, ...docData } as AccessRequest);
            });
            
            // Sort client side by requestDate descending since Firestore requires composite index for multi-field queries with orderBy
            data.sort((a, b) => {
                const dateA = a.requestDate?.toMillis() || 0;
                const dateB = b.requestDate?.toMillis() || 0;
                return dateB - dateA;
            });
            
            setRequests(data);
        } catch (error) {
            console.error("Lỗi lấy danh sách yêu cầu:", error);
            toast.error('Không thể tải danh sách yêu cầu.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [userRole, departmentId]);

    const handleApproval = async (requestId: string, targetRole: 'manager' | 'employee', isApproved: boolean) => {
        try {
            const { Timestamp } = await import('firebase/firestore');
            const userRef = doc(db, 'users', requestId);
            
            if (isApproved) {
                const updateData: any = {
                    role: targetRole,
                    status: 'approved'
                };
                
                // Add expiresAt if specified
                const dateStr = expiryDates[requestId];
                if (dateStr) {
                    const d = new Date(dateStr);
                    // Set expiry to end of the selected day
                    d.setHours(23, 59, 59, 999);
                    updateData.expiresAt = Timestamp.fromDate(d);
                }

                await updateDoc(userRef, updateData);
                toast.success(`Đã CẤP QUYỀN ${targetRole === 'manager' ? 'Quản Lý' : 'Nhân Viên'} thành công!`);
            } else {
                await updateDoc(userRef, {
                    status: 'rejected'
                });
                toast.success('Đã TỪ CHỐI yêu cầu truy cập!');
            }
            // Remove from list
            setRequests(prev => prev.filter(req => req.id !== requestId));
            setExpiryDates(prev => {
                const next = { ...prev };
                delete next[requestId];
                return next;
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            toast.error('Có lỗi xảy ra, vui lòng thử lại.');
        }
    };

    if (userRole !== 'admin' && userRole !== 'manager') {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="text-center text-slate-500">
                    <Icon name="shield-off" size={12} className="mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">Bạn không có quyền truy cập</h2>
                    <p>Chức năng này chỉ dành cho Quản trị viên và Quản lý Kho</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Icon name="users" size={6} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                                Quyết Toán Phân Quyền
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {userRole === 'admin' 
                                    ? 'Cấp quyền cho các Quản lý Siêu thị mới' 
                                    : `Quản lý nhân viên cho Siêu thị (Kho: ${departmentId})`
                                }
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={fetchRequests}
                        disabled={isLoading}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-semibold flex items-center gap-2"
                    >
                        <Icon name="refresh-ccw" size={4} className={isLoading ? 'animate-spin' : ''} />
                        Làm Mới
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Người dùng</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Yêu cầu quyền</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mã Kho</th>
                                    {userRole === 'manager' && (
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Khớp Tên Báo Cáo</th>
                                    )}
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">Hạn Cấp Phép</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                <AnimatePresence>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400">
                                                <Icon name="loader-2" size={8} className="animate-spin mx-auto mb-3" />
                                                <p>Đang tải danh sách...</p>
                                            </td>
                                        </tr>
                                    ) : requests.length === 0 ? (
                                        <motion.tr 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <td colSpan={5} className="py-16 text-center text-slate-400">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Icon name="check-circle-2" size={8} className="text-emerald-500 dark:text-emerald-400" />
                                                </div>
                                                <p className="text-lg font-bold text-slate-600 dark:text-slate-300">Không có yêu cầu chờ duyệt</p>
                                                <p className="text-sm mt-1">Làm mới để kiểm tra yêu cầu mới.</p>
                                            </td>
                                        </motion.tr>
                                    ) : (
                                        requests.map((req) => (
                                            <motion.tr 
                                                key={req.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={req.photoURL} alt="" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                        <div>
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">{req.displayName}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{req.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                                                        req.requestedRole === 'manager' 
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' 
                                                        : 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800'
                                                    }`}>
                                                        <Icon name={req.requestedRole === 'manager' ? 'briefcase' : 'users'} size={3} />
                                                        {req.requestedRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-700 dark:text-slate-300 uppercase">
                                                        {req.departmentId}
                                                    </div>
                                                </td>
                                                {userRole === 'manager' && (
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-amber-600 dark:text-amber-400 italic">
                                                            {req.employeeName}
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5 min-w-[130px]">
                                                        <label className="text-[10px] uppercase font-bold text-slate-400">Hạn sử dụng (Tuỳ chọn)</label>
                                                        <input 
                                                            type="date"
                                                            value={expiryDates[req.id] || ''}
                                                            onChange={e => setExpiryDates(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 w-full"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                    <button 
                                                        onClick={() => handleApproval(req.id, req.requestedRole, false)}
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors font-semibold tooltip"
                                                        title="Từ chối"
                                                    >
                                                        Từ chối
                                                    </button>
                                                    <button 
                                                        onClick={() => handleApproval(req.id, req.requestedRole, true)}
                                                        className="px-4 py-1.5 bg-indigo-600 text-white dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm font-semibold tooltip"
                                                        title="Phê duyệt"
                                                    >
                                                        Phê duyệt
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagementView;
