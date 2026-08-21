import React from 'react';
import { createPortal } from 'react-dom';
import { Home, ScanLine, Save, Filter, Wrench } from 'lucide-react';
import { Button } from '../../components/shared/ui/Button';
import { useActiveTab } from '../../contexts/LayoutContext';

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
  // BUG FIX (nguyên nhân gốc, không phải compositing): thanh này nằm bên trong div đang thực sự
  // cuộn (overflow-y-auto ở StickerPrinterView.tsx), không phải body/document. WebKit mobile có
  // bug lâu năm: position:fixed lồng trong 1 ancestor overflow-y-auto bị vẽ sai/trễ khung hình lúc
  // cuộn (lộ vệt nền, đôi khi biến mất) dù đúng chuẩn CSS thì fixed phải thoát ra viewport. 2 lần
  // vá trước (translateZ, will-change) chỉ sửa lớp compositing nên không triệt để. Portal thẳng ra
  // document.body để thanh này thực sự nằm ngoài mọi container cuộn/stacking context nội bộ.
  //
  // BUG FIX #2: App.tsx giữ mọi tab mounted ngầm (ẩn bằng CSS absolute/opacity, không unmount)
  // để giữ state. Trước khi portal, việc ẩn ancestor cũng ẩn theo thanh này; sau khi portal ra
  // document.body, nó thoát khỏi lớp ẩn đó nên hiện xuyên qua mọi tab khác. Phải tự kiểm tra tab
  // toàn app đang active hay không (không phải activeTab nội bộ 'home'|'tools' ở trên).
  const { activeTab: globalActiveTab } = useActiveTab();
  if (globalActiveTab !== 'tools-print-sticker') return null;

  return createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{
        height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
    </div>,
    document.body
  );
};

export default BottomNavigation;
