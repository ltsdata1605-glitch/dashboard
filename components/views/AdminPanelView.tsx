import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Icon } from '../common/Icon';

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'admin' | 'manager' | 'employee' | 'pending' | 'blocked';
    [key: string]: any;
}

const AdminPanelView: React.FC = () => {
    const { userRole, isDemoMode } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userRole !== 'admin' || isDemoMode) {
            setIsLoading(false);
            return;
        }

        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const usersList: UserData[] = [];
                querySnapshot.forEach((doc) => {
                    usersList.push({ uid: doc.id, ...doc.data() } as UserData);
                });
                setUsers(usersList);
            } catch (err: any) {
                console.error("Lỗi lấy danh sách user:", err);
                setError("Không thể tải danh sách người dùng. Vui lòng kiểm tra quyền Firestore.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [userRole, isDemoMode]);

    const handleRoleChange = async (uid: string, newRole: UserData['role']) => {
        try {
            await updateDoc(doc(db, 'users', uid), {
                role: newRole
            });
            setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error("Lỗi cập nhật quyền:", err);
            alert("Lỗi khi cập nhật quyền người dùng!");
        }
    };

    if (isDemoMode) {
        return (
             <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                  <Icon name="shield-off" size={16} className="text-slate-300 mb-4" />
                  <h2 className="text-xl font-bold mb-2">Chế độ Offline</h2>
                  <p>Trang quản trị Backend yêu cầu kết nối Firebase và tài khoản Admin.</p>
             </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (userRole !== 'admin') {
        return (
             <div className="flex flex-col items-center justify-center h-full p-8 text-center text-rose-500">
                  <Icon name="shield-alert" size={16} className="text-rose-200 dark:text-rose-900/50 mb-4" />
                  <h2 className="text-xl font-bold mb-2 text-rose-700 dark:text-rose-400">Từ Chối Truy Cập</h2>
                  <p className="max-w-md mx-auto">Tài khoản của bạn không có đủ thẩm quyền để truy cập trang quản trị hệ thống. Vui lòng liên hệ Quản trị viên cấp cao.</p>
             </div>
        );
    }

    const RoleBadge = ({ role }: { role: string }) => {
         const config: Record<string, { color: string, label: string }> = {
            'admin': { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', label: 'Admin' },
            'manager': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800', label: 'Quản lý' },
            'employee': { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', label: 'Nhân viên' },
            'pending': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', label: 'Chờ duyệt' },
            'blocked': { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700', label: 'Đã khóa' },
         };
         const c = config[role] || config['pending'];
         return (
             <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${c.color}`}>{c.label}</span>
         );
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
            <div className="mb-8 p-6 bg-indigo-600 dark:bg-indigo-900 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none text-white flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black mb-1">Backend Configuration</h1>
                    <p className="text-indigo-100 font-medium opacity-90">Hệ thống phân quyền truy cập DMX Analytics</p>
                </div>
                <div className="hidden sm:flex w-16 h-16 bg-white/20 rounded-2xl items-center justify-center backdrop-blur-md">
                   <Icon name="database" size={8} />
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 font-medium">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                   <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Icon name="users-2" size={5} className="text-indigo-500" />
                       Danh Sách Nhân Sự ({users.length})
                   </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                         <thead>
                             <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                 <th className="px-6 py-4 font-bold tracking-wider uppercase text-xs">Tài khoản Google</th>
                                 <th className="px-6 py-4 font-bold tracking-wider uppercase text-xs">Vị trí</th>
                                 <th className="px-6 py-4 font-bold tracking-wider uppercase text-xs text-right">Phân quyền thao tác</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {users.map(u => (
                                 <tr key={u.uid} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                                     <td className="px-6 py-4">
                                         <div className="flex items-center gap-3">
                                              {u.photoURL ? (
                                                  <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-full bg-slate-200" referrerPolicy="no-referrer" />
                                              ) : (
                                                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold">
                                                       {u.email.charAt(0).toUpperCase()}
                                                  </div>
                                              )}
                                              <div>
                                                  <p className="font-bold text-slate-800 dark:text-white text-base">{u.displayName || "Unknown"}</p>
                                                  <p className="text-xs text-slate-500">{u.email}</p>
                                                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">ID: {u.uid}</p>
                                              </div>
                                         </div>
                                     </td>
                                     <td className="px-6 py-4">
                                         <RoleBadge role={u.role} />
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <select 
                                             value={u.role}
                                             onChange={(e) => handleRoleChange(u.uid, e.target.value as UserData['role'])}
                                             className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-xl px-4 py-2 font-bold text-sm focus:ring-4 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                         >
                                             <option value="pending">Chờ phê duyệt</option>
                                             <option value="employee">Cấp Nhân Viên</option>
                                             <option value="manager">Cấp Quản Lý</option>
                                             <option value="admin">Quản Trị Viên (Admin)</option>
                                             <option value="blocked">Khoá Tài Khoản</option>
                                         </select>
                                     </td>
                                 </tr>
                             ))}
                             {users.length === 0 && (
                                 <tr>
                                     <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                         Không có dữ liệu người dùng.
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanelView;
