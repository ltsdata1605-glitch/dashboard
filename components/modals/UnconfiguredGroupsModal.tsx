import React, { useState } from 'react';
import { Icon } from '../common/Icon';
import ModalWrapper from './ModalWrapper';
import toast from 'react-hot-toast';

interface UnconfiguredGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
    unconfiguredGroups: Array<{ nhomHang: string; nganhHang: string }>;
    ignoredUnconfiguredGroups: Array<{ nhomHang: string; nganhHang: string }>;
    onIgnoreGroup: (nhomHang: string) => void;
    onRestoreGroup: (nhomHang: string) => void;
}

const EDITABLE_CONFIG_URL = 'https://docs.google.com/spreadsheets/d/1yxI_cHhvMxvpWHErW8asFjuDgfMp_B5_H_x6w1KxNXo/edit?gid=1855307997#gid=1855307997';

const UnconfiguredGroupsModal: React.FC<UnconfiguredGroupsModalProps> = ({
    isOpen,
    onClose,
    unconfiguredGroups,
    ignoredUnconfiguredGroups,
    onIgnoreGroup,
    onRestoreGroup
}) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopyText = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        toast.success(`Đã sao chép: ${text}`);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
    };

    const handleCopyAllRows = () => {
        if (unconfiguredGroups.length === 0) return;
        
        // Format as 5 columns matching Google Sheets columns:
        // Col A: NganhHang (nganhHang raw)
        // Col B: NhomHang (nhomHang raw)
        // Col C: NhomCha (empty, for user to fill in, e.g. DCNB, Gia dụng)
        // Col D: NhomCon (cleaned nhomHang raw, e.g. "Dụng cụ nhà bếp khác" from "2999 - Dụng cụ nhà bếp khác")
        // Col E: HeSoQuyDoi (defaulting to 100% or 1)
        const rows = unconfiguredGroups.map(g => {
            const cleanNhomCon = g.nhomHang.includes(' - ') 
                ? g.nhomHang.split(' - ').slice(1).join(' - ').trim() 
                : g.nhomHang.trim();
            
            // Tab separated: NganhHang \t NhomHang \t NhomCha \t NhomCon \t HeSoQuyDoi
            return `${g.nganhHang}\t${g.nhomHang}\t\t${cleanNhomCon}\t100%`;
        });
        
        const tsvContent = rows.join('\n');
        navigator.clipboard.writeText(tsvContent);
        toast.success("Đã sao chép dòng cấu hình dạng 5 cột!");
    };

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            hideHeader={true}
            maxWidthClass="max-w-2xl"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50 dark:bg-amber-955/20 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-500/20">
                        <Icon name="alert-triangle" size={5} className="animate-bounce" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-amber-800 dark:text-amber-400 uppercase">
                            Nhóm hàng chưa cấu hình ({unconfiguredGroups.length})
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Phát hiện nhóm hàng mới trong dữ liệu YCX chưa được ánh xạ trong file cấu hình
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <Icon name="x" size={4} />
                </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900 space-y-4">
                <div className="p-3.5 bg-amber-50/50 dark:bg-amber-955/10 rounded-xl border border-amber-100/60 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <p className="font-semibold mb-1">💡 Ảnh hưởng đến báo cáo:</p>
                    <p>Các dòng doanh thu thuộc nhóm hàng này sẽ bị <strong>bỏ qua hoàn toàn</strong> trong tất cả các thẻ KPI, bảng tổng hợp và biểu đồ xu hướng để tránh tính toán sai lệch nhóm.</p>
                </div>

                {/* Table list */}
                {unconfiguredGroups.length > 0 ? (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 sticky top-0 font-bold border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-2.5 w-12 text-center">STT</th>
                                        <th className="px-4 py-2.5">Ngành Hàng (Cột AN)</th>
                                        <th className="px-4 py-2.5 text-right pr-6">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {unconfiguredGroups.map((group, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{group.nganhHang}</span>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Nhóm AO: <span className="font-mono text-slate-500 dark:text-slate-400">{group.nhomHang}</span></span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right pr-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => handleCopyText(`${group.nganhHang}\t${group.nhomHang}\t\t${group.nhomHang.includes(' - ') ? group.nhomHang.split(' - ').slice(1).join(' - ').trim() : group.nhomHang.trim()}\t100%`, index)}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
                                                        title="Sao chép dòng cấu hình"
                                                    >
                                                        <Icon name="copy" size={3} />
                                                        <span>Sao chép</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            onIgnoreGroup(group.nhomHang);
                                                            toast.success(`Đã loại bỏ cảnh báo: ${group.nhomHang}`);
                                                        }}
                                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-350 rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
                                                        title="Loại bỏ không hiển thị cảnh báo"
                                                    >
                                                        <Icon name="eye-off" size={3} />
                                                        <span>Loại bỏ</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-850 rounded-xl text-slate-500 dark:text-slate-400">
                        <Icon name="check-circle-2" className="mx-auto text-emerald-500 mb-2" size={8} />
                        <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">Không có nhóm hàng mới cần cấu hình</p>
                        <p className="text-[10px] mt-0.5">Tất cả các nhóm hàng trong dữ liệu đều đã được cấu hình hoặc đã được loại bỏ.</p>
                    </div>
                )}

                {/* Ignored List Section */}
                {ignoredUnconfiguredGroups.length > 0 && (
                    <div className="pt-2 space-y-2">
                        <h4 className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Danh sách nhóm đã loại bỏ ({ignoredUnconfiguredGroups.length})
                        </h4>
                        <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                            <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse text-xs">
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                        {ignoredUnconfiguredGroups.map((group, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-4 py-2 w-10 text-center text-slate-400 font-medium">{index + 1}</td>
                                                <td className="px-4 py-2 text-slate-400 dark:text-slate-500">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium line-clamp-1">{group.nganhHang}</span>
                                                        <span className="text-[9px] font-mono opacity-80">{group.nhomHang}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right pr-4">
                                                    <button 
                                                        onClick={() => {
                                                            onRestoreGroup(group.nhomHang);
                                                            toast.success(`Đã khôi phục cảnh báo: ${group.nhomHang}`);
                                                        }}
                                                        className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded transition-colors text-[10px] font-bold"
                                                        title="Khôi phục hiển thị cảnh báo"
                                                    >
                                                        Khôi phục
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="space-y-2 text-xs">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Hướng dẫn cập nhật cấu hình:</h4>
                    <ol className="list-decimal pl-4 space-y-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <li>Bấm nút <strong>Sao chép toàn bộ dòng mới</strong> (dưới chân modal).</li>
                        <li>Bấm nút <strong>Mở file Google Sheets cấu hình</strong> bên dưới để truy cập vào sheet <strong>Ngành hàng</strong>.</li>
                        <li>Cuộn xuống dưới cùng của danh sách.</li>
                        <li>Chọn ô trống đầu tiên ở <strong>Cột A (Ngành hàng)</strong> và nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono shadow-sm">Ctrl + V</kbd> (hoặc <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono shadow-sm">Cmd + V</kbd>).</li>
                        <li>Hệ thống đã tự điền sẵn Tên Ngành hàng (cột A), Nhóm hàng (cột B), Nhóm con (cột D) và Hệ số quy đổi (cột E).</li>
                        <li>Bạn chỉ cần bổ sung cột <strong>NhomCha</strong> (cột C) (ví dụ: <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">DCNB</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">Gia dụng</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">CE</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">ICT</code>) và điều chỉnh lại cột NhomCon, Hệ số quy đổi nếu cần.</li>
                    </ol>
                </div>

                {/* Actions */}
                <div className="pt-3 flex justify-between items-center gap-3 flex-wrap border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleCopyAllRows}
                        disabled={unconfiguredGroups.length === 0}
                        className={`px-4 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${unconfiguredGroups.length === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-300/30 dark:shadow-none active:scale-95'}`}
                    >
                        <Icon name="copy" size={3.5} />
                        <span>Sao chép toàn bộ dòng mới</span>
                    </button>
                    
                    <a
                        href={EDITABLE_CONFIG_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-300/30 dark:shadow-none transition-all flex items-center gap-1.5"
                    >
                        <Icon name="external-link" size={3.5} />
                        <span>Mở file Google Sheets cấu hình</span>
                    </a>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default UnconfiguredGroupsModal;
