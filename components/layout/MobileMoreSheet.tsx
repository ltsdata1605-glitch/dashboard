import React from 'react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../shared/ui/Button';
import { AppIcon, type IconName } from '../shared/ui/icon';
import { Modal } from '../shared/ui/Modal';
import { ListGroup, ListRow, type ListIconTone } from '../shared/ui/ListGroup';
import { cn } from '../shared/ui/utils';
import { formatCleanDisplayName } from '../../utils/basicHelpers';

export interface NavTabItem { id: string; label: string; icon: IconName; tone?: ListIconTone }

/**
 * Sheet "Khác" của thanh tab dưới iPhone/iPad (GĐ4) — tách khỏi MobileBottomNav thành mảnh code riêng (GĐ10 2026-10-20, gói tải
 * đầu): sheet chỉ mở khi bấm "Khác" nên `Modal` + `ListGroup` không cần có mặt lúc vẽ khung app. MobileBottomNav tải trước mảnh
 * này khi máy rảnh → lần bấm đầu vẫn mở ngay.
 */
const MobileMoreSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onTabClick: (id: string) => void;
    toolTabs: NavTabItem[];
    systemTabs: NavTabItem[];
}> = ({ isOpen, onClose, onTabClick, toolTabs, systemTabs }) => {
    const { activeTab } = useActiveTab();
    const { user, userRole, employeeName, departmentId, isDemoMode, logout } = useAuth();
    const tenHienThi = employeeName || formatCleanDisplayName(user?.displayName, isDemoMode ? 'Tài khoản Thử nghiệm' : 'Khách');
    const vaiTro = userRole === 'admin' ? 'Admin' : userRole === 'manager' ? 'Quản lý' : userRole ? 'Nhân viên' : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            position="bottom"
            maxWidth="sm"
            title="Thêm"
            panelClassName="bg-slate-100"
        >
            <div className="space-y-5 pb-1" data-testid="mobile-more-scroll">
                {/* Thẻ tài khoản — bấm mở Phân quyền & cài đặt; nút Đăng xuất bên phải (không lồng nút trong nút). */}
                <ListGroup>
                    <div className="flex items-center pr-1.5">
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => onTabClick('settings')}
                            title="Chạm để mở Phân Quyền & Cài Đặt"
                            className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-2 py-2.5 text-left active:bg-slate-100 transition-colors"
                        >
                            <span className="w-11 h-11 shrink-0 rounded-full bg-sky-100 flex items-center justify-center overflow-hidden">
                                {user?.photoURL ? (
                                    <img 
                                        src={user.photoURL} 
                                        alt="" 
                                        referrerPolicy="no-referrer" 
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement?.querySelector('[data-sheet-avatar-fallback]') as HTMLElement | null;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                        className="w-full h-full object-cover" 
                                    />
                                ) : null}
                                <span 
                                    data-sheet-avatar-fallback 
                                    style={{ display: user?.photoURL ? 'none' : 'flex' }}
                                    className="font-semibold text-[17px] text-sky-700 items-center justify-center w-full h-full"
                                >
                                    {user?.email ? user.email.charAt(0).toUpperCase() : (isDemoMode ? 'T' : 'U')}
                                </span>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[17px] leading-[22px] font-semibold text-slate-900 truncate">{tenHienThi}</span>
                                    {vaiTro && (
                                        <span className={cn('shrink-0 rounded-full px-1.5 text-[11px] leading-4 font-semibold',
                                            userRole === 'admin' ? 'bg-amber-100 text-amber-800' : userRole === 'manager' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700')}>
                                            {vaiTro}
                                        </span>
                                    )}
                                </span>
                                <span className="block text-[13px] leading-[18px] text-slate-500 truncate">
                                    {user?.email || (departmentId ? `Kho: ${departmentId}` : 'Chế độ Offline')}
                                    {departmentId && user?.email ? ` · Kho ${departmentId}` : ''}
                                </span>
                            </span>
                            <AppIcon name="chevronRight" size="md" className="shrink-0 text-slate-300" />
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={logout}
                            title="Đăng xuất"
                            aria-label="Đăng xuất"
                            className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-full text-rose-600 active:bg-rose-50"
                        >
                            <AppIcon name="logout" size="md" />
                        </Button>
                    </div>
                </ListGroup>

                <ListGroup title="Công cụ">
                    {toolTabs.map(t => (
                        <ListRow key={t.id} label={t.label} icon={t.icon} iconTone={t.tone}
                            selected={activeTab === t.id} chevron={activeTab !== t.id}
                            onClick={() => onTabClick(t.id)} />
                    ))}
                </ListGroup>

                <ListGroup title="Hệ thống">
                    {systemTabs.map(t => (
                        <ListRow key={t.id} label={t.label} icon={t.icon} iconTone={t.tone}
                            selected={activeTab === t.id} chevron={activeTab !== t.id}
                            onClick={() => onTabClick(t.id)} />
                    ))}
                </ListGroup>
            </div>
        </Modal>
    );
};

export default MobileMoreSheet;
