import React, { useState, useEffect } from 'react';
import { fetchAllUsers, updateUserRole, clearAllUsers, deleteUserDoc } from './services/firebaseService';
import { XIcon, UserIcon, ShieldIcon, ShieldAlertIcon, Loader2Icon, Trash2Icon } from './Icons';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    currentUserId: string;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, storeId, currentUserId }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'delete_user' | 'reset_all' | 'error' | 'info';
        title: string;
        message: string;
        userId?: string;
    } | null>(null);

    useEffect(() => {
        if (isOpen && storeId) {
            loadUsers();
        }
    }, [isOpen, storeId]);

    const loadUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedUsers = await fetchAllUsers(storeId);
            setUsers(fetchedUsers);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError("Không thể tải danh sách người dùng.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'staff', username?: string) => {
        if (userId === currentUserId || username === 'admin') {
            setConfirmAction({
                type: 'info',
                title: 'Không hợp lệ',
                message: 'Bạn không thể thay đổi quyền của tài khoản này.'
            });
            return;
        }

        try {
            await updateUserRole(userId, newRole);
            setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error("Error updating role:", err);
            setConfirmAction({
                type: 'error',
                title: 'Lỗi',
                message: 'Lỗi khi cập nhật quyền người dùng.'
            });
        }
    };

    const handleDeleteUser = async (userId: string, username?: string) => {
        if (userId === currentUserId || username === 'admin') {
            setConfirmAction({
                type: 'info',
                title: 'Không hợp lệ',
                message: username === 'admin' ? 'Không thể xóa tài khoản Super Admin.' : 'Bạn không thể tự xóa chính mình.'
            });
            return;
        }
        
        setConfirmAction({
            type: 'delete_user',
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa người dùng này? Họ sẽ bị mất quyền truy cập vào hệ thống. (Lưu ý: Hành động này chỉ xóa dữ liệu người dùng, bạn cần xóa tài khoản Auth trong Firebase Console để xóa hoàn toàn).',
            userId: userId
        });
    };

    const executeDeleteUser = async (userId: string) => {
        setConfirmAction(null);
        try {
            await deleteUserDoc(userId);
            setUsers(prev => prev.filter(u => u.uid !== userId));
        } catch (err) {
            console.error("Error deleting user:", err);
            setConfirmAction({
                type: 'error',
                title: 'Lỗi',
                message: 'Lỗi khi xóa người dùng.'
            });
        }
    };

    const handleResetAllUsers = async () => {
        setConfirmAction({
            type: 'reset_all',
            title: 'CẢNH BÁO',
            message: 'Hành động này sẽ xóa tất cả người dùng trong hệ thống (ngoại trừ tài khoản Auth). Bạn sẽ bị đăng xuất ngay lập tức. Tiếp tục?'
        });
    };

    const executeResetAllUsers = async () => {
        setConfirmAction(null);
        setIsLoading(true);
        try {
            await clearAllUsers(storeId);
            await signOut(auth);
            window.location.reload();
        } catch (err) {
            console.error("Error resetting users:", err);
            setConfirmAction({
                type: 'error',
                title: 'Lỗi',
                message: 'Lỗi khi xóa danh sách người dùng.'
            });
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-slate-900">Quản lý người dùng</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 flex-grow overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2Icon className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
                            <p className="text-slate-500">Đang tải danh sách người dùng...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div key={user.uid} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${user.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {user.role === 'admin' ? <ShieldAlertIcon className="h-5 w-5" /> : <ShieldIcon className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{user.email}</p>
                                            <p className="text-xs text-slate-500">UID: {user.uid.substring(0, 8)}...</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.uid, e.target.value as 'admin' | 'staff', user.username)}
                                            disabled={user.uid === currentUserId || user.username === 'admin'}
                                            className="text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-50"
                                        >
                                            <option value="staff">Nhân viên</option>
                                            <option value="admin">Quản trị viên</option>
                                        </select>
                                        <button
                                            onClick={() => handleDeleteUser(user.uid, user.username)}
                                            disabled={user.uid === currentUserId || user.username === 'admin'}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                            title={user.username === 'admin' ? "Không thể xóa Super Admin" : "Xóa người dùng"}
                                        >
                                            <Trash2Icon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <button 
                        onClick={handleResetAllUsers}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
                    >
                        <Trash2Icon className="h-4 w-4" />
                        Xóa tất cả người dùng
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                    >
                        Đóng
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[80] bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                        <div className="flex items-center gap-3 mb-4">
                            {confirmAction.type === 'error' ? (
                                <ShieldAlertIcon className="h-6 w-6 text-red-600" />
                            ) : confirmAction.type === 'info' ? (
                                <ShieldIcon className="h-6 w-6 text-blue-600" />
                            ) : (
                                <ShieldAlertIcon className="h-6 w-6 text-amber-600" />
                            )}
                            <h3 className="text-lg font-bold text-slate-900">{confirmAction.title}</h3>
                        </div>
                        <p className="text-slate-600 mb-6">{confirmAction.message}</p>
                        <div className="flex justify-end gap-3">
                            {(confirmAction.type === 'delete_user' || confirmAction.type === 'reset_all') && (
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                                >
                                    Hủy
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (confirmAction.type === 'delete_user' && confirmAction.userId) {
                                        executeDeleteUser(confirmAction.userId);
                                    } else if (confirmAction.type === 'reset_all') {
                                        executeResetAllUsers();
                                    } else {
                                        setConfirmAction(null);
                                    }
                                }}
                                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                                    confirmAction.type === 'error' || confirmAction.type === 'info' 
                                        ? 'bg-indigo-600 hover:bg-indigo-700' 
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {confirmAction.type === 'error' || confirmAction.type === 'info' ? 'Đóng' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementModal;
