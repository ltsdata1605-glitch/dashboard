import React from 'react';
import FontSelector from './FontSelector';
import { NotificationBell } from './NotificationBell';

interface HeaderSystemGroupProps {
    children?: React.ReactNode;
    className?: string;
}

/**
 * Cụm công cụ hệ thống chuẩn (System Group) trên thanh bar Desktop (#global-header-actions):
 * Bao gồm FontSelector [ T ], các tùy chọn bổ sung (nếu có), và NotificationBell [ 🔔 ].
 * Chuẩn pill bo tròn rounded-full thống nhất toàn dự án theo Hình 1.
 */
export const HeaderSystemGroup: React.FC<HeaderSystemGroupProps> = ({ children, className = '' }) => {
    return (
        <div className={`flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative z-[150] shrink-0 ${className}`}>
            <FontSelector 
                containerClassName="relative flex items-center"
                buttonClassName="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
            />

            {children}

            <div className="border-l border-slate-100 dark:border-slate-700">
                <NotificationBell buttonClassName="relative w-9 h-9 flex items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" />
            </div>
        </div>
    );
};

export default HeaderSystemGroup;
