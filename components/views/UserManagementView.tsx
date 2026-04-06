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
    role?: 'admin' | 'manager' | 'employee' | 'pending';
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
    const [editDepartments, setEditDepartments] = useState<Record<string, string>>({});
    const [editNames, setEditNames] = useState<Record<string, string>>({});
    const [listMode, setListMode] = useState<'pending' | 'active'>('pending');
    const [editRoles, setEditRoles] = useState<Record<string, string>>({});

    const fetchRequests = async () => {
        if (!userRole) return;
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'users');
            let q;
            
            // Admin fetches all to manually control roles & statuses.
            // Manager fetches strictly to their scope.
            if (userRole === 'admin') {
                q = usersRef;
            } 
            else if (userRole === 'manager' && departmentId) {
                if (listMode === 'pending') {
                    q = query(usersRef, where('status', '==', 'pending'));
                } else {
                    q = query(usersRef, where('role', '==', 'employee'));
                }
            } else {
                setRequests([]);
                setIsLoading(false);
                return;
            }

            const querySnapshot = await getDocs(q);
            const data: AccessRequest[] = [];
            const newExpiry: Record<string, string> = {};
            const newDept: Record<string, string> = {};
            const newNames: Record<string, string> = {};
            const newRoles: Record<string, string> = {};

            querySnapshot.forEach((doc) => {
                const docData = doc.data() as any;
                data.push({ id: doc.id, ...docData } as AccessRequest);
                if (docData.expiresAt) {
                    newExpiry[doc.id] = docData.expiresAt.toDate().toISOString().split('T')[0];
                }
                newDept[doc.id] = docData.departmentId || '';
                newNames[doc.id] = docData.employeeName || '';
                newRoles[doc.id] = docData.role || docData.requestedRole || 'pending';
            });

            setExpiryDates(newExpiry);
            setEditDepartments(newDept);
            setEditNames(newNames);
            setEditRoles(newRoles);
            
            // Client side filter 
            let filteredData = data;
            
            if (userRole === 'admin') {
                if (listMode === 'active') {
                    // Rule 1: Must be explicitly approved AND must have a departmentId.
                    // Meaning users who just logged in (new) or haven't registered dept yet won't show.
                    filteredData = filteredData.filter(req => req.status === 'approved' && !!req.departmentId);
                } else {
                    filteredData = filteredData.filter(req => req.status === 'pending' || req.status === 'new');
                }
            }
            else if (userRole === 'manager' && departmentId) {
                const allowedKhos = departmentId.split(',').map(s=>s.trim()).filter(Boolean);
                if (listMode === 'active') {
                    filteredData = filteredData.filter(req => req.role === 'employee' && req.status !== 'pending' && req.status !== 'new');
                } else {
                    filteredData = filteredData.filter(req => req.requestedRole === 'employee' && req.status === 'pending');
                }
                // Manager only sees matching departments
                filteredData = filteredData.filter(req => allowedKhos.includes(req.departmentId));
            }
            
            // Sort client side by requestDate descending
            filteredData.sort((a, b) => {
                const dateA = a.requestDate?.toMillis() || 0;
                const dateB = b.requestDate?.toMillis() || 0;
                return dateB - dateA;
            });
            
            setRequests(filteredData);
        } catch (error) {
            console.error("Lỗi lấy danh sách yêu cầu:", error);
            toast.error('Không thể tải danh sách yêu cầu.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [userRole, departmentId, listMode]);

    const handleApproval = async (requestId: string, isApproved: boolean) => {
        try {
            const { Timestamp } = await import('firebase/firestore');
            const userRef = doc(db, 'users', requestId);
            
            if (isApproved) {
                const targetRole = editRoles[requestId];
                const updateData: any = {
                    role: targetRole || 'pending',
                    status: targetRole === 'blocked' ? 'blocked' : 'approved',
                    departmentId: editDepartments[requestId] || '',
                    employeeName: editNames[requestId] || ''
                };
                
                // Add expiresAt if specified
                const dateStr = expiryDates[requestId];
                if (dateStr) {
                    const d = new Date(dateStr);
                    // Set expiry to end of the selected day
                    d.setHours(23, 59, 59, 999);
                    updateData.expiresAt = Timestamp.fromDate(d);
                } else {
                    updateData.expiresAt = null; // Clear if not set
                }

                await updateDoc(userRef, updateData);
                toast.success(listMode === 'pending' ? `Đã CẤP QUYỀN thành công!` : `Đã CẬP NHẬT QUYỀN thành công!`);
            } else {
                await updateDoc(userRef, {
                    status: listMode === 'pending' ? 'rejected' : 'expired'
                });
                toast.success(listMode === 'pending' ? 'Đã TỪ CHỐI yêu cầu!' : 'Đã THU HỒI quyền truy cập!');
            }
            
            fetchRequests(); // Refresh data
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
                                Quản Trị Hệ Thống & Phân Quyền
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

                {/* Tabs */}
                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => setListMode('pending')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${listMode === 'pending' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Đơn Chờ Duyệt
                    </button>
                    <button 
                        onClick={() => setListMode('active')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${listMode === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Người Dùng Hoạt Động
                    </button>
                </div>

                {/* Modern Card Grid Layout */}
                <div className="mt-6">
                    <AnimatePresence>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                <Icon name="loader-2" size={8} className="animate-spin text-indigo-500 mb-4" />
                                <p className="text-slate-500 font-medium">Đang tải danh sách...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm"
                            >
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-5">
                                    <Icon name="check-circle-2" size={10} className="text-indigo-400" />
                                </div>
                                <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
                                    {listMode === 'pending' ? 'Không có yêu cầu chờ duyệt' : 'Chưa có người dùng hoạt động'}
                                </p>
                                <p className="text-slate-500 mt-2 font-medium">
                                    {listMode === 'pending' ? 'Hệ thống đã xử lý xong tất cả đơn đăng ký.' : 'Danh sách trống hoặc hệ thống chưa cập nhật.'}
                                </p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {requests.map((req) => (
                                    <motion.div 
                                        key={req.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
                                    >
                                        {/* Row Header: User Profile */}
                                        <div className="p-5 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50">
                                            <div className="relative">
                                                <img src={req.photoURL} alt="" className="w-14 h-14 rounded-2xl shadow-sm object-cover" />
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${req.status === 'approved' ? 'bg-emerald-500' : req.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate">{req.displayName}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{req.email}</p>
                                            </div>
                                        </div>

                                        {/* Body Fields Grid */}
                                        <div className="p-5 flex-1 flex flex-col gap-5">
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Role Field */}
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Icon name="shield" size={3.5} /> Vị Trí / Quyền</span>
                                                    {userRole === 'admin' ? (
                                                        <select 
                                                            value={editRoles[req.id] || req.role || req.requestedRole || 'pending'}
                                                            onChange={(e) => setEditRoles(prev => ({...prev, [req.id]: e.target.value}))}
                                                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 outline-none focus:border-indigo-500 transition-all w-full"
                                                        >
                                                            <option value="pending">Chờ phê duyệt</option>
                                                            <option value="employee">Nhân Viên</option>
                                                            <option value="manager">Quản Lý</option>
                                                            <option value="admin">Quản Trị Viên</option>
                                                            <option value="blocked">Khoá Tài Khoản</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex items-center w-max gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
                                                            (req.role === 'manager' || req.requestedRole === 'manager')
                                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400' 
                                                            : 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-400'
                                                        }`}>
                                                            <Icon name={(req.role === 'manager' || req.requestedRole === 'manager') ? 'briefcase' : 'users'} size={4} />
                                                            {(req.role === 'manager' || req.requestedRole === 'manager') ? 'Quản Lý Kho' : 'Nhân Viên'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Department Code Field */}
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Icon name="map-pin" size={3.5} /> Mã Kho (ID)</span>
                                                    {listMode === 'active' ? (
                                                        <input
                                                            type="text"
                                                            value={editDepartments[req.id] || ''}
                                                            onChange={e => setEditDepartments(prev => ({...prev, [req.id]: e.target.value}))}
                                                            placeholder="VD: 58614, 21707"
                                                            className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white text-slate-800 dark:text-slate-200 w-full font-mono uppercase transition-all"
                                                        />
                                                    ) : (
                                                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 font-mono text-sm font-bold text-slate-700 dark:text-slate-300 border border-transparent">
                                                            {req.departmentId || 'Chưa ĐK'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Report Matching Name */}
                                                <div className="flex flex-col gap-2 col-span-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Icon name="user-check" size={3.5} /> Khớp tên báo cáo doanh thu</span>
                                                    {listMode === 'active' || userRole === 'admin' ? (
                                                        <input
                                                            type="text"
                                                            value={editNames[req.id] || ''}
                                                            onChange={e => setEditNames(prev => ({...prev, [req.id]: e.target.value}))}
                                                            placeholder="VD: Lê Thị A..."
                                                            className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white text-slate-800 dark:text-slate-200 w-full transition-all"
                                                        />
                                                    ) : (
                                                        <div className="font-bold text-amber-600 dark:text-amber-400 italic text-sm px-1">
                                                            {req.employeeName || 'Chưa thiết lập'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expiry Date */}
                                                <div className="flex flex-col gap-2 col-span-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Icon name="calendar" size={3.5} /> Hạn Cấp Phép Truy Cập</span>
                                                    <input 
                                                        type="date"
                                                        value={expiryDates[req.id] || ''}
                                                        onChange={e => setExpiryDates(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                        className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white text-slate-800 dark:text-slate-200 w-full transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Footer */}
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50 flex gap-3">
                                            {listMode === 'pending' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleApproval(req.id, false)}
                                                        className="flex-1 py-2.5 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Icon name="x" size={4} /> Từ chối
                                                    </button>
                                                    <button 
                                                        onClick={() => handleApproval(req.id, true)}
                                                        className="flex-1 py-2.5 bg-indigo-600 text-white dark:bg-indigo-500 rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm font-bold text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Icon name="check" size={4} /> Phê duyệt
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleApproval(req.id, false)}
                                                        className="px-4 py-2.5 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors font-bold text-sm flex items-center gap-2"
                                                    >
                                                        <Icon name="user-minus" size={4.5} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleApproval(req.id, true)}
                                                        className="flex-1 py-2.5 bg-emerald-600 text-white dark:bg-emerald-500 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm font-bold text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Icon name="save" size={4.5} /> Lưu & Cập Nhật
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default UserManagementView;
