import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    loginCount?: number;
}

interface UserManagementViewProps {
    isEmbedded?: boolean;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ isEmbedded }) => {
    const { user, userRole, departmentId } = useAuth();
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
    const [editDepartments, setEditDepartments] = useState<Record<string, string>>({});
    const [editNames, setEditNames] = useState<Record<string, string>>({});
    const [listMode, setListMode] = useState<'pending' | 'active'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [editRoles, setEditRoles] = useState<Record<string, string>>({});
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'dept' | 'date' | 'logins'>('date');
    const [sortAsc, setSortAsc] = useState(false);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    // Auto-save a single user's data to Firestore (debounced)
    const autoSave = useCallback(async (requestId: string, field: string, value: any) => {
        // Clear existing timer for this user+field
        const key = `${requestId}_${field}`;
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);

        debounceTimers.current[key] = setTimeout(async () => {
            try {
                setSavingIds(prev => new Set(prev).add(requestId));
                const userRef = doc(db, 'users', requestId);
                const updateData: any = {};

                if (field === 'role') {
                    updateData.role = value;
                    updateData.status = value === 'blocked' ? 'blocked' : 'approved';
                } else if (field === 'departmentId') {
                    updateData.departmentId = value;
                } else if (field === 'employeeName') {
                    updateData.employeeName = value;
                } else if (field === 'expiresAt') {
                    if (value) {
                        const { Timestamp } = await import('firebase/firestore');
                        const d = new Date(value);
                        d.setHours(23, 59, 59, 999);
                        updateData.expiresAt = Timestamp.fromDate(d);
                    } else {
                        updateData.expiresAt = null;
                    }
                }

                await updateDoc(userRef, updateData);
                toast.success('Đã tự động lưu!', { duration: 1500, id: `autosave-${requestId}` });
            } catch (err) {
                console.warn('Auto-save failed:', err);
                toast.error('Lỗi tự động lưu, thử lại.');
            } finally {
                setSavingIds(prev => { const n = new Set(prev); n.delete(requestId); return n; });
            }
        }, 800);
    }, []);

    const fetchRequests = async () => {
        if (!userRole) return;
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'users');
            let q;
            
            // Admin and any user with full access fetches all.
            // Manager fetches strictly to their scope.
            if (userRole === 'manager' && departmentId) {
                if (listMode === 'pending') {
                    q = query(usersRef, where('status', '==', 'pending'));
                } else {
                    q = query(usersRef, where('role', '==', 'employee'));
                }
            } else {
                // admin or any other role: fetch all
                q = usersRef;
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
                    // Rule 1: Must be explicitly approved. No longer requiring !!req.departmentId.
                    filteredData = filteredData.filter(req => req.status === 'approved');
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
            
            // Sort client side by requestDate descending, but put "chưa cập nhật mã Kho" first if active
            filteredData.sort((a, b) => {
                if (listMode === 'active') {
                    const aNoDept = !a.departmentId;
                    const bNoDept = !b.departmentId;
                    if (aNoDept && !bNoDept) return -1;
                    if (!aNoDept && bNoDept) return 1;
                }
                const dateA = a.requestDate?.toMillis() || 0;
                const dateB = b.requestDate?.toMillis() || 0;
                return dateB - dateA;
            });
            
            setRequests(filteredData);
        } catch (error: any) {
            console.warn("Lỗi lấy danh sách yêu cầu:", error);
            if (error?.code === 'permission-denied') {
                toast.error('Firestore: Quyền truy cập bị từ chối. Vui lòng kiểm tra Security Rules.');
            } else {
                toast.error(`Không thể tải danh sách yêu cầu. (${error?.code || error?.message || 'Unknown'})`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();

        // Listen for refresh events (e.g. from banner click)
        const handleRefresh = () => fetchRequests();
        window.addEventListener('refresh-user-management', handleRefresh);
        
        return () => {
            window.removeEventListener('refresh-user-management', handleRefresh);
            Object.values(debounceTimers.current).forEach(clearTimeout);
        };
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
                
                // Thuận nước đẩy Notification
                const { notifyUser } = await import('../../services/notificationService');
                await notifyUser(requestId, {
                    title: 'Phân quyền thành công',
                    message: `Hệ thống vừa cập nhật vai trò của bạn thành: ${targetRole === 'manager' ? 'Quản Lý Kho' : targetRole === 'employee' ? 'Nhân Viên' : 'Khác'}. Bạn có thể bắt đầu sử dụng.`,
                    type: 'success'
                });
                
                toast.success(listMode === 'pending' ? `Đã CẤP QUYỀN thành công!` : `Đã CẬP NHẬT QUYỀN thành công!`);
            } else {
                await updateDoc(userRef, {
                    status: listMode === 'pending' ? 'rejected' : 'expired'
                });
                
                const { notifyUser } = await import('../../services/notificationService');
                await notifyUser(requestId, {
                    title: listMode === 'pending' ? 'Yêu cầu bị từ chối' : 'Thu hồi quyền truy cập',
                    message: `Quản trị viên đã ${listMode === 'pending' ? 'từ chối yêu cầu đăng ký' : 'ngừng cấp phép sử dụng'} của bạn. Liên hệ Quản lý Vùng để biết thêm chi tiết.`,
                    type: 'error'
                });
                
                toast.success(listMode === 'pending' ? 'Đã TỪ CHỐI yêu cầu!' : 'Đã THU HỒI quyền truy cập!');
            }
            
            fetchRequests(); // Refresh data
        } catch (error) {
            console.warn('Lỗi khi cập nhật trạng thái:', error);
            toast.error('Có lỗi xảy ra, vui lòng thử lại.');
        }
    };


    // Role guard removed — all users with tab access can view

    return (
        <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'p-0 sm:p-2' : 'bg-slate-50 dark:bg-slate-900/50 min-h-screen p-4 sm:p-6'}`}>
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Header */}
                <div className="bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700/50 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-md"><Icon name="users" size={5} /></div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Quản Trị Hệ Thống & Phân Quyền</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{userRole === 'admin' ? 'Cấp quyền cho các Quản lý Siêu thị mới' : `Quản lý nhân viên cho Siêu thị (Kho: ${departmentId})`}</p>
                        </div>
                    </div>
                    <button onClick={fetchRequests} disabled={isLoading} className="h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-1.5 rounded-md shadow-sm">
                        <Icon name="refresh-ccw" size={3.5} className={isLoading ? 'animate-spin' : ''} /> Làm Mới
                    </button>
                </div>
                {/* Tabs & Search & Sort */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md overflow-hidden shadow-sm">
                        <button onClick={() => setListMode('pending')} className={`h-9 px-4 text-xs font-semibold transition-colors flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 ${listMode === 'pending' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                            <Icon name="clock" size={3.5} />
                            Đơn Chờ Duyệt
                        </button>
                        <button onClick={() => setListMode('active')} className={`h-9 px-4 text-xs font-semibold transition-colors flex items-center gap-1.5 ${listMode === 'active' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                            <Icon name="users" size={3.5} />
                            Người Dùng Hoạt Động
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md overflow-hidden shadow-sm">
                            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="h-9 bg-transparent text-xs font-semibold text-slate-600 dark:text-slate-300 px-2.5 outline-none border-none cursor-pointer">
                                <option value="date">Ngày ĐK</option>
                                <option value="name">Tên</option>
                                <option value="role">Vai trò</option>
                                <option value="dept">Mã Kho</option>
                                <option value="logins">Truy cập</option>
                            </select>
                            <button onClick={() => setSortAsc(p => !p)} className="h-9 px-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-l border-slate-200 dark:border-slate-700" title={sortAsc ? 'Tăng dần' : 'Giảm dần'}>
                                <Icon name={sortAsc ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow'} size={3.5} />
                            </button>
                        </div>
                        <div className="relative w-full sm:w-56">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Icon name="search" size={3.5} /></div>
                            <input type="text" placeholder="Tìm kiếm Email, Mã Kho..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 block w-full pl-9 pr-3 text-xs font-medium rounded-md outline-none focus:border-indigo-500 transition-all shadow-sm text-slate-700 dark:text-slate-200" />
                        </div>
                    </div>
                </div>
                {/* User List */}
                <div>
                    <AnimatePresence>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-md">
                                <Icon name="loader-2" size={8} className="animate-spin text-indigo-500 mb-4" />
                                <p className="text-slate-500 font-medium">Đang tải danh sách...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-md">
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4"><Icon name="check-circle-2" size={8} className="text-indigo-400" /></div>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{listMode === 'pending' ? 'Không có yêu cầu chờ duyệt' : 'Chưa có người dùng hoạt động'}</p>
                                <p className="text-slate-500 mt-1 text-sm">{listMode === 'pending' ? 'Hệ thống đã xử lý xong tất cả đơn đăng ký.' : 'Danh sách trống hoặc chưa cập nhật.'}</p>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {requests.filter(req => {
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    return (req.email?.toLowerCase().includes(q) || req.employeeName?.toLowerCase().includes(q) || req.departmentId?.toLowerCase().includes(q) || req.displayName?.toLowerCase().includes(q) || editDepartments[req.id]?.toLowerCase().includes(q) || editNames[req.id]?.toLowerCase().includes(q));
                                }).sort((a, b) => {
                                    const dir = sortAsc ? 1 : -1;
                                    switch (sortBy) {
                                        case 'name': return dir * (a.displayName || '').localeCompare(b.displayName || '');
                                        case 'role': return dir * (editRoles[a.id] || a.role || '').localeCompare(editRoles[b.id] || b.role || '');
                                        case 'dept': return dir * (editDepartments[a.id] || a.departmentId || '').localeCompare(editDepartments[b.id] || b.departmentId || '');
                                        case 'logins': return dir * ((a.loginCount ?? 0) - (b.loginCount ?? 0));
                                        case 'date': default: return dir * ((a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
                                    }
                                }).map((req) => (
                                    <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`bg-white dark:bg-slate-800 border rounded-md ${!req.departmentId && listMode === 'active' ? 'border-amber-400/50' : 'border-slate-200 dark:border-slate-700/50'} shadow-sm transition-all overflow-hidden`}>
                                        {/* Row 1: Avatar + Name + Role + Actions */}
                                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/30">
                                            <div className="relative shrink-0">
                                                <img src={req.photoURL} alt="" className="w-8 h-8 rounded-md object-cover" />
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${req.status === 'approved' ? 'bg-emerald-500' : req.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate leading-tight">{req.displayName}</h3>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{req.email}</p>
                                            </div>
                                            <div className="shrink-0">
                                                {userRole === 'admin' ? (
                                                    <select value={editRoles[req.id] || req.role || req.requestedRole || 'pending'} onChange={(e) => { setEditRoles(prev => ({...prev, [req.id]: e.target.value})); if (listMode === 'active') autoSave(req.id, 'role', e.target.value); }} className="h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md px-2 text-xs font-semibold outline-none focus:border-indigo-500 w-[100px] cursor-pointer">
                                                        <option value="pending">Chờ duyệt</option>
                                                        <option value="employee">Nhân Viên</option>
                                                        <option value="manager">Quản Lý</option>
                                                        <option value="admin">Admin</option>
                                                        <option value="blocked">Khoá</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${req.role === 'admin' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' : req.role === 'manager' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400'}`}>
                                                        <Icon name={req.role === 'admin' ? 'shield' : req.role === 'manager' ? 'briefcase' : 'users'} size={3} />
                                                        {req.role === 'admin' ? 'Admin' : req.role === 'manager' ? 'Quản Lý' : 'NV'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {listMode === 'pending' ? (
                                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md overflow-hidden shadow-sm">
                                                        <button onClick={() => handleApproval(req.id, false)} className="h-8 px-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1 border-r border-slate-200 dark:border-slate-700" title="Từ chối">
                                                            <Icon name="x" size={3.5} />
                                                        </button>
                                                        <button onClick={() => handleApproval(req.id, true)} className="h-8 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1">
                                                            <Icon name="check" size={3.5} /> Duyệt
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => handleApproval(req.id, false)} className="h-8 px-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors rounded-md shadow-sm flex items-center" title="Thu hồi">
                                                            <Icon name="user-minus" size={3.5} />
                                                        </button>
                                                        {savingIds.has(req.id) && (
                                                            <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 animate-pulse">
                                                                <Icon name="loader-2" size={3} className="animate-spin" /> Lưu...
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Row 2: Fields */}
                                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/20 flex-wrap sm:flex-nowrap">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Mã Kho:</span>
                                                {userRole === 'admin' ? (
                                                    <input type="text" value={editDepartments[req.id] || ''} onChange={e => { setEditDepartments(prev => ({...prev, [req.id]: e.target.value})); if (listMode === 'active') autoSave(req.id, 'departmentId', e.target.value); }} placeholder="VD: 58614" className="h-7 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 w-[100px] font-mono uppercase rounded-md" />
                                                ) : (<span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{req.departmentId || '—'}</span>)}
                                            </div>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Mã NV:</span>
                                                {userRole === 'admin' ? (
                                                    <input type="text" value={editNames[req.id] || ''} onChange={e => { setEditNames(prev => ({...prev, [req.id]: e.target.value})); if (listMode === 'active') autoSave(req.id, 'employeeName', e.target.value); }} placeholder="VD: 58614" className="h-7 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 w-[100px] rounded-md" />
                                                ) : (<span className="text-xs font-bold text-amber-600 dark:text-amber-400">{req.employeeName || '—'}</span>)}
                                            </div>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Hạn:</span>
                                                <input type="date" value={expiryDates[req.id] || ''} onChange={e => { setExpiryDates(prev => ({ ...prev, [req.id]: e.target.value })); if (listMode === 'active') autoSave(req.id, 'expiresAt', e.target.value); }} className="h-7 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 w-[130px] rounded-md" />
                                            </div>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Đăng ký:</span>
                                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('vi-VN') : '—'}</span>
                                            </div>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Truy cập:</span>
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{req.loginCount ?? 0} lần</span>
                                            </div>
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
