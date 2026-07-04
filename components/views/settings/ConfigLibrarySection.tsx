import React from 'react';
import { Icon } from '../../common/Icon';
import { type SharedConfig } from '../../../services/firestoreService';

interface ConfigLibrarySectionProps {
    sharedConfigs: SharedConfig[];
    user: any;
    userRole: string | null;
    departmentId: string | null;
    showShareModal: boolean;
    setShowShareModal: (show: boolean) => void;
    shareDescription: string;
    setShareDescription: (desc: string) => void;
    isSharing: boolean;
    onShareConfig: () => void;
    onApplyConfig: (config: SharedConfig) => void;
    onDeleteConfig: (config: SharedConfig) => void;
}

export const ConfigLibrarySection: React.FC<ConfigLibrarySectionProps> = ({
    sharedConfigs,
    user,
    userRole,
    departmentId,
    showShareModal,
    setShowShareModal,
    shareDescription,
    setShareDescription,
    isSharing,
    onShareConfig,
    onApplyConfig,
    onDeleteConfig,
}) => {
    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Thư Viện Cấu Hình</h3>
                {(userRole === 'admin' || userRole === 'manager' || userRole === 'employee') && (
                    <button 
                        onClick={() => setShowShareModal(true)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 font-bold flex items-center gap-2 transition-colors text-sm border border-indigo-100 dark:border-indigo-800 rounded-lg"
                    >
                        <Icon name="share-2" size={4} />
                        Đăng Bài Chia Sẻ
                    </button>
                )}
            </div>
            
            {sharedConfigs.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center flex flex-col items-center justify-center text-slate-500 rounded-lg">
                    <Icon name="layout-template" size={10} className="text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="font-medium text-sm">Chưa có Cấu Hình nào được chia sẻ trong hệ thống của bạn.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sharedConfigs.map(config => (
                        <div key={config.id} className="bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors rounded-lg">
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1">{config.description}</h4>
                                    <span className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap uppercase tracking-wider flex-shrink-0 rounded-md ${config.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                        {config.role === 'admin' ? 'Super Admin' : config.role === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên'}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 mb-4">
                                    <p className="flex items-center gap-1.5"><Icon name="user" size={3.5} /> Được tạo bởi: <strong>{config.authorName}</strong></p>
                                    <p className="flex items-center gap-1.5"><Icon name="calendar-days" size={3.5} /> Ngày đăng: {config.createdAt?.toDate ? config.createdAt.toDate().toLocaleDateString('vi-VN') : 'Mới đây'}</p>
                                    {config.role !== 'admin' && <p className="flex items-center gap-1.5 text-indigo-500"><Icon name="map-pin" size={3.5} /> Phạm vi: Kho {config.departmentId}</p>}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                {(user?.uid === config.uid || userRole === 'admin') ? (
                                    <button 
                                        onClick={() => onDeleteConfig(config)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors tooltip rounded-md"
                                        title="Xoá bài đăng của bạn"
                                    >
                                        <Icon name="trash-2" size={4} />
                                    </button>
                                ) : <div />}
                                
                                <button 
                                    onClick={() => onApplyConfig(config)}
                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 text-sm font-bold flex items-center gap-2 transition-colors rounded-lg"
                                >
                                    <Icon name="download-cloud" size={4} />
                                    Đồng Bộ Về Máy
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {showShareModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Icon name="share-2" size={5} className="text-indigo-500" />
                                Chia Sẻ Cấu Hình
                            </h3>
                            <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><Icon name="x" size={5} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Mẫu cấu hình này sẽ bao gồm toàn bộ cài đặt <strong>bộ lọc, sắp xếp, ẩn hiện cột, cấu trúc bảng tự do</strong> hiện tại của bạn.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả Cấu Hình <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={shareDescription}
                                    onChange={e => setShareDescription(e.target.value)}
                                    placeholder="Ví dụ: Mẫu Báo cáo Phụ Kiện T5/2024"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setShowShareModal(false)} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Hủy Bỏ</button>
                            <button onClick={onShareConfig} disabled={isSharing} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                                {isSharing ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="check" size={4} />}
                                {isSharing ? 'Đang Đăng...' : 'Đăng Tải'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
