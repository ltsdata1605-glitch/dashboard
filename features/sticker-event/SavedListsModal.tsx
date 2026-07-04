import React, { useState, useEffect } from 'react';
import { SavedList, Product } from './types';
import { fetchSavedListsFromFirestore, deleteSavedListFromFirestore } from './services/firebaseService';
import { XIcon, TrashIcon } from './Icons';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

interface SavedListsModalProps {
    storeId: string;
    userId: string;
    isAdmin: boolean;
    onClose: () => void;
    onLoadList: (items: any[]) => void;
}

const SavedListsModal: React.FC<SavedListsModalProps> = ({ storeId, userId, isAdmin, onClose, onLoadList }) => {
    const [lists, setLists] = useState<SavedList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [listToDelete, setListToDelete] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ''
    });

    useEffect(() => {
        loadLists();
    }, [storeId]);

    const loadLists = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Filter lists at query level if not admin
            const filteredLists = await fetchSavedListsFromFirestore(storeId, isAdmin ? undefined : userId);
            setLists(filteredLists);
        } catch (err) {
            setError('Lỗi khi tải danh sách đã lưu.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (listId: string) => {
        setListToDelete(listId);
        setIsConfirmOpen(true);
    };

    const executeDelete = async () => {
        if (!listToDelete) return;
        
        try {
            await deleteSavedListFromFirestore(storeId, listToDelete);
            setLists(lists.filter(l => l.id !== listToDelete));
        } catch (err) {
            setAlertConfig({ isOpen: true, message: 'Lỗi khi xóa danh sách.' });
            console.error(err);
        } finally {
            setListToDelete(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div 
                className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] flex flex-col" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">Danh sách đã lưu</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                        aria-label="Đóng"
                    >
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto min-h-[300px]">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <p>Chưa có danh sách nào được lưu.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lists.map(list => (
                                <div key={list.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-slate-800 truncate">{list.name}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                            <span>{new Date(list.createdAt).toLocaleString('vi-VN')}</span>
                                            <span>•</span>
                                            <span>{list.totalItems} sản phẩm</span>
                                            {isAdmin && list.userId !== userId && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-indigo-600">Tạo bởi: {list.userId}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => {
                                                onLoadList(list.items);
                                                onClose();
                                            }}
                                            className="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Mở
                                        </button>
                                        <button
                                            onClick={() => handleDelete(list.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Xóa danh sách"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <ConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={executeDelete}
                    message="Bạn có chắc chắn muốn xóa danh sách này?"
                    title="Xác nhận xóa"
                    confirmText="Xóa"
                    type="danger"
                />

                <AlertModal
                    isOpen={alertConfig.isOpen}
                    onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                    message={alertConfig.message}
                />
            </div>
        </div>
    );
};

export default SavedListsModal;
