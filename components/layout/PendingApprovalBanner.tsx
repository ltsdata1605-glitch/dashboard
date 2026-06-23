import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveTab } from '../../contexts/LayoutContext';
import { Icon } from '../common/Icon';
import { usePendingApprovalCount } from '../../hooks/usePendingApprovalCount';

const PendingApprovalBanner: React.FC = () => {
    const { user, userRole } = useAuth();
    const { setActiveTab } = useActiveTab();
    const pendingCount = usePendingApprovalCount();

    if (!user || (userRole !== 'admin' && userRole !== 'manager')) return null;
    if (pendingCount === 0) return null;

    return (
        <div 
            onClick={() => {
                setActiveTab('approval');
                window.dispatchEvent(new Event('refresh-user-management'));
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white overflow-hidden flex items-center cursor-pointer shadow-md z-[100] relative py-2 px-4 group"
        >
            <div className="flex-shrink-0 mr-3 bg-white/20 p-1.5 rounded-full">
                <Icon name="alert-circle" size={5} />
            </div>
            
            <div className="flex-1 overflow-hidden whitespace-nowrap">
                <span className="font-medium">
                    Bạn có <span className="font-black text-xl px-1">{pendingCount}</span> yêu cầu chờ duyệt mới! Nhấn vào đây để xem chi tiết.
                </span>
            </div>

            <div className="flex-shrink-0 ml-3 bg-white/20 px-3 py-1 rounded-full text-xs font-bold font-mono group-hover:bg-white text-white group-hover:text-orange-600 transition-colors">
                XEM NGAY
            </div>
        </div>
    );
};

export default PendingApprovalBanner;
