import React, { useState, useEffect, useCallback } from 'react';
import { AppIcon } from '../../components/shared/ui/icon/AppIcon';
import { db } from './firebase';
import { collection, query, where, getDocs, limit, Query, DocumentData } from 'firebase/firestore';

import { Button } from '../../components/shared/ui/Button';
import { Input } from '../../components/shared/ui/Input';
import { Modal } from '../../components/shared/ui/Modal';
import { EmptyState } from '../../components/shared/ui/EmptyState';
import { getErrorMessage } from '../../utils/dataUtils';
import { StickerEventUserRecord } from './types';
import { deleteUserDoc } from './services/firebaseService';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SuperAdminUserRow = StickerEventUserRecord & { id: string };

const SuperAdminModal: React.FC<SuperAdminModalProps> = ({ isOpen, onClose }) => {
  const [searchStoreId, setSearchStoreId] = useState('');
  const [users, setUsers] = useState<SuperAdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (term: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const usersRef = collection(db, 'stickerUsers');
      let q: Query<DocumentData>;
      
      const trimmed = term.trim();
      if (!trimmed) {
        // If empty, fetch latest 50 users
        q = query(usersRef, limit(50));
      } else {
        // Try searching by storeId first
        const qStore = query(usersRef, where('storeId', '==', trimmed.toUpperCase()), limit(100));
        const snapStore = await getDocs(qStore);
        
        if (!snapStore.empty) {
          setUsers(snapStore.docs.map(d => ({ id: d.id, ...d.data() } as SuperAdminUserRow)));
          setLoading(false);
          return;
        }
        
        // If not found by storeId, try searching by username
        q = query(usersRef, where('username', '==', trimmed));
      }
      
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SuperAdminUserRow)));
      
      if (snapshot.empty && trimmed) {
        setError('Không tìm thấy người dùng nào khớp với từ khóa.');
      }
    } catch (err: unknown) {
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchStoreId);
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteUserDoc(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: unknown) {
      console.error("Delete error:", err);
      let displayError = 'Lỗi khi xóa người dùng.';
      if (getErrorMessage(err).includes('permission')) {
        displayError = 'Bạn không có quyền xóa người dùng này. Vui lòng kiểm tra lại quyền Super Admin.';
      }
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-lg">
          <AppIcon name="securityAlert" size="lg" />
          Công cụ Super Admin
        </span>
      }
      titleColorClass="text-rose-700"
      maxWidth="lg"
    >
      <div className="space-y-6">
          <form onSubmit={handleSearch} className="space-y-2">
            <label htmlFor="super-admin-tim" className="block text-sm font-medium text-slate-700">Tìm kiếm tài khoản theo Mã kho hoặc Tên đăng nhập</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  id="super-admin-tim"
                  type="text"
                  leftIcon="search"
                  value={searchStoreId}
                  onChange={(e) => setSearchStoreId(e.target.value)}
                  placeholder="Nhập mã kho hoặc username..."
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
              >
                Tìm kiếm
              </Button>
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
                      <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                        <AppIcon name="user" size="lg" />
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={loading || u.username === 'admin'}
                      icon="delete"
                      className={u.username === 'admin' ? "text-slate-300" : "text-rose-500 hover:bg-rose-50"}
                      title={u.username === 'admin' ? "Không thể xóa Super Admin" : "Xóa người dùng"}
                      aria-label="Xóa người dùng"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-100 rounded-xl">
                <EmptyState icon={<AppIcon name="users" size="lg" />} title="Chưa có dữ liệu tìm kiếm" />
              </div>
            )}
          </div>
      </div>
    </Modal>
  );
};

export default SuperAdminModal;
