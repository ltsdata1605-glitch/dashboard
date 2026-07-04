import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs, deleteDoc, doc, limit } from 'firebase/firestore';
import { X, Search, Trash2, ShieldAlert, User as UserIcon } from 'lucide-react';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuperAdminModal: React.FC<SuperAdminModalProps> = ({ isOpen, onClose }) => {
  const [searchStoreId, setSearchStoreId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (term: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const usersRef = collection(db, 'users');
      let q;
      
      const trimmed = term.trim();
      if (!trimmed) {
        // If empty, fetch latest 50 users
        q = query(usersRef, limit(50));
      } else {
        // Try searching by storeId first
        const qStore = query(usersRef, where('storeId', '==', trimmed.toUpperCase()), limit(100));
        const snapStore = await getDocs(qStore);
        
        if (!snapStore.empty) {
          setUsers(snapStore.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
          setLoading(false);
          return;
        }
        
        // If not found by storeId, try searching by username
        q = query(usersRef, where('username', '==', trimmed));
      }
      
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      
      if (snapshot.empty && trimmed) {
        setError('Không tìm thấy người dùng nào khớp với từ khóa.');
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError('Lỗi khi tìm kiếm người dùng.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load all users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchStoreId);
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      console.error("Delete error:", err);
      let displayError = 'Lỗi khi xóa người dùng.';
      if (err.message && err.message.includes('permission')) {
        displayError = 'Bạn không có quyền xóa người dùng này. Vui lòng kiểm tra lại quyền Super Admin.';
      }
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-lg font-bold">Công cụ Super Admin</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-red-700" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Tìm kiếm tài khoản theo Mã kho hoặc Tên đăng nhập</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchStoreId}
                  onChange={(e) => setSearchStoreId(e.target.value)}
                  placeholder="Nhập mã kho hoặc username..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Tìm kiếm
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-100">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Danh sách người dùng ({users.length})</h3>
            {users.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {users.map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.username} <span className="text-xs font-normal text-slate-500">({u.email})</span></div>
                        <div className="text-xs text-slate-500 flex gap-2">
                          <span className="font-semibold uppercase">{u.role}</span>
                          <span>•</span>
                          <span>Kho: {u.storeId}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={loading || u.username === 'admin'}
                      className={`p-2 rounded-lg transition-colors ${u.username === 'admin' ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                      title={u.username === 'admin' ? "Không thể xóa Super Admin" : "Xóa người dùng"}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                Chưa có dữ liệu tìm kiếm
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminModal;
