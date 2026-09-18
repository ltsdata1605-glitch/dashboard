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
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex justify-around items-center z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{
        height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Button
        variant="ghost"
        onClick={() => onTabChange('home')}
        className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:scale-95 ${
          activeTab === 'home' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-700 font-medium'
        }`}
      >
        <Home className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
        <span className="text-[10px] leading-none">Trang chủ</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => onTabChange('tools')}
        className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-1 transition-all active:scale-95 ${
          activeTab === 'tools' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-700 font-medium'
        }`}
      >
        <Wrench className={`w-5 h-5 transition-transform ${activeTab === 'tools' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
        <span className="text-[10px] leading-none">Công cụ</span>
      </Button>

      {/* Nút Quét Mã Nổi bật ở giữa */}
      <Button
        variant="ghost"
        onClick={onScanClick}
        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 hover:text-slate-900 relative active:scale-90 transition-transform"
      >
        <div className="absolute -top-4.5 bg-gradient-to-tr from-sky-600 to-sky-500 text-white p-3 rounded-full shadow-lg shadow-sky-500/30 border-4 border-white">
          <ScanLine className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[10px] font-bold text-sky-700 mt-6.5 leading-none">Quét mã</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onSaveListClick}
        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-slate-700 font-medium transition-all active:scale-95"
      >
        <Save className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[10px] leading-none">Lưu DS</span>
      </Button>

      <Button
        variant="ghost"
        onClick={onFilterClick}
        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-slate-700 font-medium transition-all active:scale-95"
      >
        <Filter className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[10px] leading-none">Lọc</span>
      </Button>
    </div>,
    document.body
  );
};

export default BottomNavigation;
