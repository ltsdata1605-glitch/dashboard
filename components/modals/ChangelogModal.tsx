import React from 'react';
import { Icon } from '../common/Icon';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                            <Icon name="history" size={5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">Lịch sử cập nhật</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Phiên bản 3.0.0 (High Performance)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <Icon name="x" size={5} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    
                    {/* v3.0.0 */}
                    <div className="relative pl-6 border-l-2 border-primary-500">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500 border-4 border-white dark:border-slate-900"></div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Phiên bản 3.0.0 (High Performance & Core Update)</h3>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-bold mb-4 uppercase tracking-wider">Cập nhật lớn - Tháng 03/2026</p>
                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            <li className="flex gap-2">
                                <Icon name="zap" size={4} className="text-amber-500 shrink-0 mt-0.5" />
                                <span><strong>Tối ưu hóa hiệu năng cực hạn (Web Worker):</strong> Xử lý dữ liệu Excel khổng lồ (100MB+) dưới nền. Giao diện hoàn toàn không bị đơ hay treo trong suốt quá trình xử lý.</span>
                            </li>
                            <li className="flex gap-2">
                                <Icon name="database" size={4} className="text-blue-500 shrink-0 mt-0.5" />
                                <span><strong>Lưu trữ trạng thái toàn diện (IndexedDB):</strong> Mọi thao tác lọc (phòng ban, kho, thời gian, nhà sản xuất,...), sắp xếp và cấu hình hiển thị đều được tự động lưu lại. Không bao giờ mất dữ liệu khi tải lại trang!</span>
                            </li>
                            <li className="flex gap-2">
                                <Icon name="scan-line" size={4} className="text-green-500 shrink-0 mt-0.5" />
                                <span><strong>Loại bỏ code thừa & Tái cấu trúc:</strong> Xóa bỏ triệt để các tính năng/thành phần không còn sử dụng. Cơ sở mã nguồn được tối ưu và chia tách thành các module siêu nhỏ nhắn, tăng tốc độ tải trang cực nhanh.</span>
                            </li>
                            <li className="flex gap-2">
                                <Icon name="layout-dashboard" size={4} className="text-purple-500 shrink-0 mt-0.5" />
                                <span><strong>Giao diện:</strong> Cập nhật thông tin phiên bản ở cuối trang. Thay thế thuật ngữ cũ bằng giao diện Lịch sử cập nhật chuyên nghiệp.</span>
                            </li>
                        </ul>
                    </div>

                    {/* v2.1.0 */}
                    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 pb-2">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border-4 border-white dark:border-slate-900"></div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 opacity-70">Phiên bản 2.1.0 (Intelligence Hub 2.0)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-4 uppercase tracking-wider">Tháng 02/2026</p>
                        <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                            <li className="flex gap-2">
                                <Icon name="check-circle-2" size={4} className="shrink-0 mt-0.5" />
                                <span>Ra mắt giao diện Dashboard 2.0 đậm chất High-tech.</span>
                            </li>
                            <li className="flex gap-2">
                                <Icon name="check-circle-2" size={4} className="shrink-0 mt-0.5" />
                                <span>Hệ thống phân tích Head-to-Head và Performance với bảng chỉ số phức tạp.</span>
                            </li>
                            <li className="flex gap-2">
                                <Icon name="check-circle-2" size={4} className="shrink-0 mt-0.5" />
                                <span>Giao diện Flat Design toàn diện.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-bold rounded-xl shadow-lg transition-colors focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-800"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangelogModal;
