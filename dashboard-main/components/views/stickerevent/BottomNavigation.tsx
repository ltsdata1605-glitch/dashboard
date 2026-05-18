import React from 'react';
import { Home, ScanLine, Save, Filter, Wrench } from 'lucide-react';

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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-14 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <button
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${
          activeTab === 'home' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[9px] font-medium">Trang chủ</span>
      </button>
      
      <button
        onClick={() => onTabChange('tools')}
        className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${
          activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Wrench className="w-5 h-5" />
        <span className="text-[9px] font-medium">Công cụ</span>
      </button>

      <button
        onClick={onScanClick}
        className="flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-500 hover:text-slate-900 relative"
      >
        <div className="absolute -top-4 bg-indigo-600 text-white p-2.5 rounded-full shadow-md border-4 border-white">
          <ScanLine className="w-5 h-5" />
        </div>
        <span className="text-[9px] font-medium mt-6">Quét mã</span>
      </button>

      <button
        onClick={onSaveListClick}
        className="flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-500 hover:text-slate-900"
      >
        <Save className="w-5 h-5" />
        <span className="text-[9px] font-medium">Lưu DS</span>
      </button>

      <button
        onClick={onFilterClick}
        className="flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-500 hover:text-slate-900"
      >
        <Filter className="w-5 h-5" />
        <span className="text-[9px] font-medium">Lọc</span>
      </button>
    </div>
  );
};

export default BottomNavigation;
