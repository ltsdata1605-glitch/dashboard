import React from 'react';
import { Home, ScanLine, Save, Filter, Wrench } from 'lucide-react';
import { Button } from '../../components/shared/ui/Button';

interface BottomNavigationProps {
  activeTab: 'home' | 'tools';
  onTabChange: (tab: 'home' | 'tools') => void;
  onScanClick: () => void;
  onSaveListClick: () => void;
  onFilterClick: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onScanClick,
  onSaveListClick,
  onFilterClick,
}) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{
        height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // BUG FIX (thử lại, an toàn hơn lần trước): user báo cáo thật — lúc cuộn (momentum scroll
        // WebKit mobile), thanh này bị "vệt" xám/xanh che lên do trễ 1 khung hình khi trình duyệt
        // vẽ lại phần tử fixed cùng lúc với nội dung đang cuộn. Lần trước dùng transform:
        // translateZ(0) + backface-visibility:hidden để ép tách lớp render riêng — nhưng tổ hợp đó
        // khiến CHÍNH thanh này biến mất hẳn trên webview thật của user (lỗi nặng hơn cả vệt cũ,
        // đã hoàn tác). will-change chỉ là GỢI Ý tách lớp cho trình duyệt, không tự áp transform
        // nào lên phần tử — rủi ro thấp hơn hẳn, nhưng CHƯA kiểm chứng được trên thiết bị thật.
        willChange: 'transform',
      }}
    >
      <Button
        variant="ghost"
        onClick={() => onTabChange('home')}
        className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-0.5 ${
          activeTab === 'home' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[9px] font-medium">Trang chủ</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => onTabChange('tools')}
        className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-0.5 ${
          activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Wrench className="w-5 h-5" />
        <span className="text-[9px] font-medium">Công cụ</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onScanClick}
        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-500 hover:text-slate-900 relative"
      >
        <div className="absolute -top-4 bg-indigo-600 text-white p-2.5 rounded-full shadow-md border-4 border-white">
          <ScanLine className="w-5 h-5" />
        </div>
        <span className="text-[9px] font-medium mt-6">Quét mã</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onSaveListClick}
        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-500 hover:text-slate-900"
      >
        <Save className="w-5 h-5" />
        <span className="text-[9px] font-medium">Lưu DS</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onFilterClick}
        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-500 hover:text-slate-900"
      >
        <Filter className="w-5 h-5" />
        <span className="text-[9px] font-medium">Lọc</span>
      </Button>
    </div>
  );
};

export default BottomNavigation;
