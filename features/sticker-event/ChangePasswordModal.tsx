import React, { useState } from 'react';
import { auth } from './firebase';
import { updatePassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ShieldIcon } from './Icons';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        if (!auth.currentUser) {
            setError("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
            return;
        }

        setIsLoading(true);
        try {
            await updatePassword(auth.currentUser, newPassword);
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: unknown) {
            console.error("Error updating password:", err);
            if (err instanceof FirebaseError && err.code === 'auth/requires-recent-login') {
                setError("Vui lòng đăng xuất và đăng nhập lại trước khi đổi mật khẩu để đảm bảo bảo mật.");
            } else {
                setError("Lỗi khi đổi mật khẩu: " + (err instanceof Error ? err.message : String(err)));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="sm"
            title={
                <span className="flex items-center gap-2 text-xl">
                    <ShieldIcon className="h-6 w-6 text-indigo-600" />
                    Đổi mật khẩu
                </span>
            }
            titleColorClass="text-slate-900"
        >
            {success ? (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg text-center font-medium">
                    Đổi mật khẩu thành công!
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                            minLength={6}
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="ghost"
                        disabled={isLoading}
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                    >
                        {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
                    </Button>
                </form>
            )}
        </Modal>
    );
};

export default ChangePasswordModal;
