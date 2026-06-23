import React from 'react';

interface DangerZoneSectionProps {
    isClearing: boolean;
    onClearLocalData: () => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
    isClearing,
    onClearLocalData,
}) => {
    return (
        <div>
            <h3 className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mb-2 sm:mb-4 border-b border-rose-100 dark:border-rose-900/30 pb-2">Khu Vực Nguy Hiểm</h3>
            <div className="bg-rose-50 dark:bg-rose-900/10 p-3 sm:p-5 border border-rose-200 dark:border-rose-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg">
                <div>
                    <h4 className="font-bold text-rose-800 dark:text-rose-400 text-base">Xóa Cứng Toàn Bộ Bộ Nhớ Tạm</h4>
                    <p className="text-sm text-rose-600/80 dark:text-rose-400/70 mt-1 max-w-md">Xóa sạch Dữ Liệu YCX (Sales Data), Cấu Hình, Sơ đồ Kho lưu trong Local Database của Trình duyệt. Bạn sẽ cần tải YCX lại từ đầu.</p>
                </div>
                <button 
                    onClick={onClearLocalData}
                    disabled={isClearing}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 rounded-lg"
                >
                    {isClearing ? 'Đang Xóa...' : 'Khôi Phục Mặc Định Trình Duyệt'}
                </button>
            </div>
        </div>
    );
};
