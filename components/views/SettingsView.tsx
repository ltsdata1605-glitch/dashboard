import React from 'react';
import { SettingsAccountTab } from './settings/SettingsAccountTab';

/**
 * Trang Phân quyền & duyệt. iPhone (GĐ7): các nhóm nằm thẳng trên nền xám như Cài đặt iOS — bỏ thẻ trắng bọc ngoài (trước là
 * thẻ trong thẻ trong thẻ, mép trái lệch 21px). Laptop giữ thẻ trắng lớn của chủ dự án.
 */
const SettingsView: React.FC = () => {
    return (
        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-dvh px-4 py-3 sm:p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                <div className="sm:bg-white sm:shadow-sm sm:border sm:border-slate-200 sm:p-8 sm:rounded-card space-y-8">
                    <SettingsAccountTab />
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
