/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { saveSetting, getSetting } from '../../../services/dbService';
import { 
  Droplets,
  Wind,
  Fan,
  Soup,
  Sparkles,
  BatteryCharging,
  Lamp,
  Plus, 
  Minus, 
  Copy, 
  RotateCcw, 
  Tv, 
  Refrigerator, 
  AirVent, 
  Smartphone, 
  Laptop, 
  WashingMachine, 
  Package, 
  ShieldCheck, 
  Wrench, 
  Headphones,
  Cpu, 
  Watch, 
  Sword,
  CheckCircle2,
  Tv2,
  UserPlus,
  Trash2,
  BarChart3,
  AlertCircle,
  History,
  X,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

// --- Types ---

interface PriceWarStats {
  tc: string; // Thành công
  ss: string; // So giá
  ch: string; // Chiến
  bo: string; // Bỏ về
  xtt: string; // Xin thông tin
}

interface LeadInfo {
  id: string;
  name: string;
  phone: string;
  product: string;
}

interface ReportState {
  staffName: string;
  cash: string;
  installment: string;
  products: {
    tivi: number;
    tuLanh: number;
    mayGiat: number;
    mayLanh: number;
    smpTab: number;
    laptop: number;
    otherName: string;
    otherCount: number;
  };
  household: {
    mln: number;
    qdh: number;
    quat: number;
    noiCom: number;
    locKk: number;
    otherName: string;
    otherCount: number;
  };
  services: {
    insurance: string;
    maintenance: string;
    vieon: number;
    sim: number;
  };
  accessories: {
    camera: number;
    sdp: number;
    taiNghe: number;
    den: number;
    dongHo: number;
  };
  priceWar: {
    ce: PriceWarStats;
    ict: PriceWarStats;
  };
  leads: LeadInfo[];
}

const STORAGE_KEY = 'bao_cao_khai_thac_data_v2';
const HISTORY_KEY = 'bao_cao_khai_thac_history';

// Danh sách các nhóm cần kiểm tra cảnh báo 3 ngày
const WARNING_ITEMS = [
  { group: 'products', key: 'tivi', name: 'Tivi' },
  { group: 'products', key: 'tuLanh', name: 'Tủ lạnh' },
  { group: 'products', key: 'mayGiat', name: 'Máy giặt' },
  { group: 'products', key: 'mayLanh', name: 'Máy lạnh' },
  { group: 'products', key: 'smpTab', name: 'SMP/Tab' },
  { group: 'products', key: 'laptop', name: 'Laptop' },
  { group: 'household', key: 'mln', name: 'Máy lọc nước' },
  { group: 'household', key: 'qdh', name: 'Quạt điều hòa' },
  { group: 'household', key: 'quat', name: 'Quạt' },
  { group: 'household', key: 'noiCom', name: 'Nồi cơm' },
  { group: 'household', key: 'locKk', name: 'Máy lọc KK' },
  { group: 'services', key: 'vieon', name: 'Vieon' },
  { group: 'services', key: 'sim', name: 'SIM' },
  { group: 'accessories', key: 'camera', name: 'Camera' },
  { group: 'accessories', key: 'sdp', name: 'SDP' },
  { group: 'accessories', key: 'taiNghe', name: 'Tai nghe' },
  { group: 'accessories', key: 'den', name: 'Đèn' },
  { group: 'accessories', key: 'dongHo', name: 'Đồng hồ' }
];

const initialState: ReportState = {
  staffName: '',
  cash: '',
  installment: '',
  products: {
    tivi: 0,
    tuLanh: 0,
    mayGiat: 0,
    mayLanh: 0,
    smpTab: 0,
    laptop: 0,
    otherName: '',
    otherCount: 0,
  },
  household: {
    mln: 0,
    qdh: 0,
    quat: 0,
    noiCom: 0,
    locKk: 0,
    otherName: '',
    otherCount: 0,
  },
  services: {
    insurance: '',
    maintenance: '',
    vieon: 0,
    sim: 0,
  },
  accessories: {
    camera: 0,
    sdp: 0,
    taiNghe: 0,
    den: 0,
    dongHo: 0,
  },
  priceWar: {
    ce: { tc: '', ss: '', ch: '', bo: '', xtt: '' },
    ict: { tc: '', ss: '', ch: '', bo: '', xtt: '' },
  },
  leads: []
};

// Saved totals cho cộng dồn
interface SavedTotals {
  cash: number;
  installment: number;
  insurance: number;
  maintenance: number;
  lastUpdatedAt?: string;
}
const SAVED_TOTALS_KEY = 'bao_cao_saved_totals_v1';
const initialSavedTotals: SavedTotals = { cash: 0, installment: 0, insurance: 0, maintenance: 0, lastUpdatedAt: '' };

// Helper: chặn nhập chữ vào ô số
const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};

export default function BaoCaoKhaiThacView() {
  const [state, setState] = useState<ReportState>(initialState);
  const [savedTotals, setSavedTotals] = useState<SavedTotals>(initialSavedTotals);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingName, setIsEditingName] = useState(!state.staffName);

  const { activeTab } = useActiveTab();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Khởi tạo IndexedDB (Load dữ liệu và Lịch sử)
  useEffect(() => {
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    
    const loadData = async () => {
      const savedData = await getSetting<ReportState>(STORAGE_KEY);
      if (savedData) {
        setState({
          ...initialState,
          ...savedData,
          products: { ...initialState.products, ...savedData.products },
          household: { ...initialState.household, ...savedData.household },
          services: { ...initialState.services, ...savedData.services },
          accessories: { ...initialState.accessories, ...savedData.accessories },
          priceWar: {
            ce: { ...initialState.priceWar.ce, ...savedData.priceWar?.ce },
            ict: { ...initialState.priceWar.ict, ...savedData.priceWar?.ict }
          }
        });
        if (savedData.staffName && savedData.staffName.trim()) {
          setIsEditingName(false);
          setTimeout(() => {
            cashInputRef.current?.focus();
          }, 100);
        }
      }
      
      // Load saved totals
      const loadedTotals = await getSetting<SavedTotals>(SAVED_TOTALS_KEY);
      if (loadedTotals) setSavedTotals({ ...initialSavedTotals, ...loadedTotals });
      
      const savedHistory = await getSetting<any[]>(HISTORY_KEY) || [];
      setHistory(savedHistory);
    };
    loadData();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  // Compute Warnings (3 days consecutive 0 results)
  useEffect(() => {
    if (!history || history.length === 0) return;
    const newWarnings: string[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Lấy 2 ngày gần nhất trong lịch sử (khác ngày hôm nay)
    const pastRecords = history.filter(h => h.date !== todayStr).slice(-2);
    
    if (pastRecords.length >= 2) {
      WARNING_ITEMS.forEach(item => {
        const todayVal = Number((state as any)[item.group][item.key]) || 0;
        const day1Val = Number((pastRecords[0].data as any)?.[item.group]?.[item.key]) || 0;
        const day2Val = Number((pastRecords[1].data as any)?.[item.group]?.[item.key]) || 0;
        
        if (todayVal === 0 && day1Val === 0 && day2Val === 0) {
          newWarnings.push(`Nhóm ${item.name} đã liên tục 3 ngày không có kết quả khai thác!`);
        }
      });
    }
    setWarnings(newWarnings);
  }, [state, history]);

  // Persistence (Save to IndexedDB and update history)
  useEffect(() => {
    if (!mounted) return;
    saveSetting(STORAGE_KEY, state);
    
    const todayStr = new Date().toISOString().slice(0, 10);
    setHistory(prev => {
      const newHistory = [...prev];
      const todayIndex = newHistory.findIndex(h => h.date === todayStr);
      if (todayIndex >= 0) {
        newHistory[todayIndex].data = state;
      } else {
        newHistory.push({ date: todayStr, data: state });
        if (newHistory.length > 30) newHistory.shift(); // Max 30 days history
      }
      saveSetting(HISTORY_KEY, newHistory);
      return newHistory;
    });
  }, [state, mounted]);

  // Firebase Auto Sync at 23:59
  useEffect(() => {
    if (!mounted) return;
    const checkTimeAndSync = async () => {
      const now = new Date();
      if (now.getHours() === 23 && now.getMinutes() >= 59) {
        const todayStr = now.toISOString().slice(0, 10);
        const lastSync = await getSetting('last_firebase_sync_date');
        
        if (lastSync !== todayStr) {
           try {
             const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
             const { db } = await import('../../../services/firebase');
             await addDoc(collection(db, 'daily_reports'), {
                date: todayStr,
                staffName: state.staffName,
                data: state,
                timestamp: serverTimestamp()
             });
             await saveSetting('last_firebase_sync_date', todayStr);
             // console.log("Đã đẩy dữ liệu báo cáo cuối ngày lên Firebase thành công!");
           } catch (e) {
             console.warn("Lỗi đẩy Firebase cuối ngày:", e);
           }
        }
      }
    };
    
    const interval = setInterval(checkTimeAndSync, 60000); // Check each minute
    return () => clearInterval(interval);
  }, [state, mounted]);

  // Tổng cộng dồn: saved + current
  const totalCash = (savedTotals.cash || 0) + (parseFloat(state.cash) || 0);
  const totalInstallment = (savedTotals.installment || 0) + (parseFloat(state.installment) || 0);
  const totalInsurance = (savedTotals.insurance || 0) + (parseFloat(state.services.insurance) || 0);
  const totalMaintenance = (savedTotals.maintenance || 0) + (parseFloat(state.services.maintenance) || 0);

  const efficiency = useCallback(() => {
    const total = totalCash + totalInstallment;
    if (total === 0) return 0;
    return (totalInstallment / total) * 100;
  }, [totalCash, totalInstallment]);

  // Lưu dữ liệu Doanh Thu hiện tại → clear input → cho nhập mới
  const handleAccumulateRevenue = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newSaved = {
      ...savedTotals,
      cash: totalCash,
      installment: totalInstallment,
      lastUpdatedAt: timeStr,
    };
    setSavedTotals(newSaved);
    saveSetting(SAVED_TOTALS_KEY, newSaved);
    setState(prev => ({ ...prev, cash: '', installment: '' }));
    showToast(`Đã lưu: Tiền mặt ${totalCash} + Trả chậm ${totalInstallment}. Nhập tiếp!`);
  };

  // Lưu dữ liệu Dịch Vụ hiện tại → clear input → cho nhập mới
  const handleAccumulateServices = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newSaved = {
      ...savedTotals,
      insurance: totalInsurance,
      maintenance: totalMaintenance,
      lastUpdatedAt: timeStr,
    };
    setSavedTotals(newSaved);
    saveSetting(SAVED_TOTALS_KEY, newSaved);
    setState(prev => ({ ...prev, services: { ...prev.services, insurance: '', maintenance: '' } }));
    showToast(`Đã lưu: Bảo hiểm ${totalInsurance} + Bảo dưỡng ${totalMaintenance}. Nhập tiếp!`);
  };

  // Reset cộng dồn
  const resetAccumulation = (group: 'revenue' | 'services') => {
    if (group === 'revenue') {
      const newSaved = { ...savedTotals, cash: 0, installment: 0 };
      setSavedTotals(newSaved);
      saveSetting(SAVED_TOTALS_KEY, newSaved);
      showToast('Đã xoá luỹ kế Doanh Thu');
    } else {
      const newSaved = { ...savedTotals, insurance: 0, maintenance: 0 };
      setSavedTotals(newSaved);
      saveSetting(SAVED_TOTALS_KEY, newSaved);
      showToast('Đã xoá luỹ kế Dịch Vụ');
    }
  };

  const showToast = (message: string) => {
    toast.success(message, { duration: 3000 });
  };

  const handleStep = (category: 'products' | 'household' | 'accessories' | 'services', key: string, step: number) => {
    setState(prev => ({
      ...prev,
      [category]: {
        //@ts-ignore
        ...prev[category],
        [key]: Math.max(0, (prev[category][key as keyof typeof prev[typeof category]] as number) + step)
      }
    }));
  };

  const clearAll = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?')) {
      setState(initialState);
      setSavedTotals(initialSavedTotals);
      await saveSetting(STORAGE_KEY, initialState);
      await saveSetting(SAVED_TOTALS_KEY, initialSavedTotals);
    }
  };

  const copyReport = () => {
    const fmt = (val: any) => (val === 0 || val === "" || val === '0') ? "   " : val;
    const hq = efficiency().toFixed(1) + "%";
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    let r = `📊 BÁO CÁO KHAI THÁC\n`;
    r += `👤 NV: ${state.staffName || 'Chưa nhập'}\n`;
    r += `🕒 Lúc: ${timeStr} - ${dateStr}\n\n`;
    
    // Dùng tổng cộng dồn cho copy báo cáo
    const cashVal = totalCash || 0;
    const instVal = totalInstallment || 0;
    const effRounded = Math.round(efficiency());
    
    r += `💰 TRẢ CHẬM:\n`;
    r += `1. Trả chậm/Tiền mặt: ${instVal}/${cashVal} ~ ${effRounded}%\n\n`;

    r += `📦 SẢN PHẨM CHÍNH:\n`;
    let mainProducts = '';
    let totalMainProducts = 0;
    if (state.products.tivi > 0) {
      mainProducts += `+ Tivi: ${state.products.tivi}\n`;
      totalMainProducts += state.products.tivi;
    }
    if (state.products.tuLanh > 0) {
      mainProducts += `+ Tủ lạnh/đông: ${state.products.tuLanh}\n`;
      totalMainProducts += state.products.tuLanh;
    }
    if (state.products.mayGiat > 0) {
      mainProducts += `+ Máy giặt/sấy: ${state.products.mayGiat}\n`;
      totalMainProducts += state.products.mayGiat;
    }
    if (state.products.mayLanh > 0) {
      mainProducts += `+ Máy lạnh: ${state.products.mayLanh}\n`;
      totalMainProducts += state.products.mayLanh;
    }
    if (state.products.smpTab > 0) {
      mainProducts += `+ SMP/Tab: ${state.products.smpTab}\n`;
      totalMainProducts += state.products.smpTab;
    }
    if (state.products.laptop > 0) {
      mainProducts += `+ LAPTOP: ${state.products.laptop}\n`;
      totalMainProducts += state.products.laptop;
    }
    if (state.products.otherName.trim() && state.products.otherCount > 0) {
      mainProducts += `+ ${state.products.otherName}: ${state.products.otherCount}\n`;
      totalMainProducts += state.products.otherCount;
    }
    
    if (mainProducts) {
      r += mainProducts;
      r += `=> Tổng SP: ${totalMainProducts}\n`;
    } else {
      r += `(Trống)\n`;
    }
    r += `\n`;

    r += `🛠️ DOANH THU THỰC & DV:\n`;
    r += `1. Bảo hiểm: ${fmt(totalInsurance)}\n`;
    r += `2. Bảo dưỡng: ${fmt(totalMaintenance)}\n`;
    r += `3. Vieon: ${fmt(state.services.vieon)}\n`;
    r += `4. SIM: ${fmt(state.services.sim)}\n\n`;

    r += `🎧 PHỤ KIỆN VÀ ĐỒNG HỒ:\n`;
    r += `+ Camera: ${fmt(state.accessories.camera)}\n`;
    r += `+ SDP: ${fmt(state.accessories.sdp)}\n`;
    r += `+ Tai nghe: ${fmt(state.accessories.taiNghe)}\n`;
    r += `+ Đèn: ${fmt(state.accessories.den)}\n`;
    r += `+ Đồng Hồ: ${fmt(state.accessories.dongHo)}\n\n`;

    r += `🏠 GIA DỤNG:\n`;
    let householdItems = '';
    if (state.household.mln > 0) householdItems += `+ MLN: ${state.household.mln}\n`;
    if (state.household.qdh > 0) householdItems += `+ QĐH: ${state.household.qdh}\n`;
    if (state.household.quat > 0) householdItems += `+ Quạt: ${state.household.quat}\n`;
    if (state.household.noiCom > 0) householdItems += `+ Nồi cơm: ${state.household.noiCom}\n`;
    if (state.household.locKk > 0) householdItems += `+ Lọc KK: ${state.household.locKk}\n`;
    if (state.household.otherName.trim() && state.household.otherCount > 0) {
      householdItems += `+ ${state.household.otherName}: ${state.household.otherCount}\n`;
    }
    r += householdItems || `(Trống)\n`;
    r += `\n`;

    r += `⚔️ CHIẾN GIÁ:\n`;
    r += `- Tiếp cận CE:\n`;
    const ce = state.priceWar.ce;
    r += `  + Thành công: ${fmt(ce.tc)} | So giá: ${fmt(ce.ss)} | Chiến: ${fmt(ce.ch)} | Bỏ về: ${fmt(ce.bo)} | Xin TT: ${fmt(ce.xtt)}\n`;
    r += `- Tiếp cận ICT:\n`;
    const ict = state.priceWar.ict;
    r += `  + Thành công: ${fmt(ict.tc)} | So giá: ${fmt(ict.ss)} | Chiến: ${fmt(ict.ch)} | Bỏ về: ${fmt(ict.bo)} | Xin TT: ${fmt(ict.xtt)}\n\n`;

    if (state.leads.length > 0) {
      r += `📋 DANH SÁCH XIN THÔNG TIN:\n`;
      state.leads.forEach((lead, index) => {
        r += `${index + 1}. ${lead.name} - ${lead.phone} - ${lead.product}\n`;
      });
    }

    if (warnings.length > 0) {
      r += `\n⚠️ CẢNH BÁO KHAI THÁC:\n`;
      warnings.forEach(w => {
        r += `- ${w}\n`;
      });
    }

    const copyToClipboard = async (text: string) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          showToast('Đã copy báo cáo vào bộ nhớ tạm!');
          return;
        }
      } catch (err) {
        console.warn('Clipboard API failed', err);
      }

      // Fallback
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          showToast('Đã copy báo cáo (fallback)!');
        } else {
          throw new Error('Fallback failed');
        }
      } catch (err) {
        console.warn('Copy failed', err);
        alert('Không thể copy báo cáo. Vui lòng thử lại hoặc chụp màn hình.');
      }
    };

    copyToClipboard(r);
  };

  return (
    <div className="h-full flex flex-col w-full relative bg-slate-50 dark:bg-slate-900 absolute top-0 left-0 right-0 bottom-20 lg:bottom-0 overflow-hidden bao-cao-container">
      <style>{`
        @media (max-width: 768px) {
            /* High-Density Typography cho mobile */
            #report-export-area .text-2xl { font-size: 16px !important; }
            #report-export-area .text-xl { font-size: 14px !important; }
            #report-export-area .text-lg { font-size: 12px !important; }
            #report-export-area .text-base { font-size: 11px !important; }
            #report-export-area .text-sm { font-size: 10px !important; }
            #report-export-area .text-xs { font-size: 9px !important; }
            #report-export-area .text-\\[14px\\] { font-size: 11px !important; }
            #report-export-area .text-\\[13px\\] { font-size: 10px !important; }
            #report-export-area .text-\\[12px\\] { font-size: 9px !important; }
            #report-export-area .text-\\[11px\\] { font-size: 9px !important; }
            #report-export-area .text-\\[10px\\] { font-size: 8px !important; }
            
            /* Triệt tiêu khoảng trắng thừa */
            #report-export-area .p-3 { padding: 8px !important; }
            #report-export-area .p-4 { padding: 10px !important; }
            #report-export-area .gap-2 { gap: 4px !important; }
            #report-export-area .gap-3 { gap: 6px !important; }
            #report-export-area .gap-4 { gap: 8px !important; }
            #report-export-area .mb-2 { margin-bottom: 4px !important; }
            #report-export-area .mb-3 { margin-bottom: 8px !important; }
            #report-export-area .rounded-xl { border-radius: 8px !important; }
            #report-export-area .rounded-2xl { border-radius: 12px !important; }
        }
      `}</style>

      {mounted && activeTab === 'reports' && document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions') && createPortal(
        <div className="flex items-center mr-2 bg-white/60 dark:bg-slate-900/60 p-1.5 px-3 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300">
          {isEditingName ? (
            <input 
              type="text" 
              autoFocus
              placeholder="Tên NV..." 
              className="bg-transparent text-[13px] font-bold text-slate-800 dark:text-slate-200 border-b border-blue-500 focus:outline-none w-24 sm:w-32 py-0.5"
              value={state.staffName}
              onChange={e => setState(p => ({ ...p, staffName: e.target.value }))}
              onBlur={() => { if (state.staffName.trim()) setIsEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter' && state.staffName.trim()) setIsEditingName(false); }}
            />
          ) : (
            <h1 
              className="text-[13px] font-bold tracking-tight text-slate-800 dark:text-slate-200 cursor-pointer hover:text-blue-600 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
              onClick={() => setIsEditingName(true)}
              title="Click để đổi tên"
            >
              {state.staffName || 'Tên NV (Click)'}
            </h1>
          )}
        </div>,
        document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions')!
      )}

      <main className="flex-1 overflow-y-auto w-full relative z-10 custom-scrollbar pb-10">
        <div id="report-export-area" className="max-w-md mx-auto pt-3 px-3 space-y-3">

        {warnings.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 shadow-sm mb-3">
            <h3 className="text-red-700 dark:text-red-400 font-bold text-sm flex items-center gap-1.5 mb-1.5">
              <AlertCircle size={16} /> CẢNH BÁO
            </h3>
            <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-300 space-y-0.5">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Revenue Section */}
        <section className="card-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="label-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-blue-500" /> Doanh thu
            </h2>
            <div className="flex items-center gap-2">
              <motion.div 
                initial={false}
                animate={{ 
                  color: efficiency() >= 50 ? "#059669" : efficiency() > 20 ? "#2563eb" : "#64748b" 
                }}
                className="text-[10px] font-bold tracking-wider"
              >
                HIỆU QUẢ: {efficiency().toFixed(1)}%
              </motion.div>
              <button 
                onClick={handleAccumulateRevenue}
                disabled={!state.cash && !state.installment}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Lưu dữ liệu hiện tại và nhập thêm"
              >
                <Plus size={10} /> Thêm
              </button>
            </div>
          </div>
          {/* Indicator: hiển thị tổng luỹ kế nếu đã lưu */}
          {(savedTotals.cash > 0 || savedTotals.installment > 0) && (
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg px-2.5 py-1.5 mb-2">
              <div className="flex items-center gap-3 text-[10px] flex-wrap">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">📦 Đã lưu{savedTotals.lastUpdatedAt ? ` (${savedTotals.lastUpdatedAt})` : ''}:</span>
                <span className="text-slate-600">Tiền mặt: <strong className="text-slate-800">{savedTotals.cash}</strong></span>
                <span className="text-blue-600">Trả chậm: <strong>{savedTotals.installment}</strong></span>
              </div>
              <button onClick={() => resetAccumulation('revenue')} className="text-[9px] text-red-400 hover:text-red-600 font-bold flex-shrink-0" title="Xoá luỹ kế">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-medium mb-1 block uppercase">Tiền mặt {savedTotals.cash > 0 && <span className="text-emerald-500">(Tổng: {totalCash})</span>}</label>
              <input 
                ref={cashInputRef}
                type="number"
                step="any"
                inputMode="decimal"
                min="0"
                placeholder="0"
                className="w-full text-xl font-bold text-slate-800 focus:outline-none placeholder:text-slate-200"
                value={state.cash}
                onChange={e => setState(prev => ({ ...prev, cash: e.target.value }))}
                onKeyDown={blockNonNumericKeys}
              />
            </div>
            <div className="border-l border-slate-100 pl-4">
              <label className="text-[10px] text-slate-400 font-medium mb-1 block uppercase">Trả chậm {savedTotals.installment > 0 && <span className="text-emerald-500">(Tổng: {totalInstallment})</span>}</label>
              <input 
                type="number"
                step="any"
                inputMode="decimal"
                min="0"
                placeholder="0"
                className="w-full text-xl font-bold text-blue-600 focus:outline-none placeholder:text-slate-200"
                value={state.installment}
                onChange={e => setState(prev => ({ ...prev, installment: e.target.value }))}
                onKeyDown={blockNonNumericKeys}
              />
            </div>
          </div>
        </section>

        {/* Major Products Section */}
        <section className="card-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
          <h2 className="label-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mb-2 text-blue-600 flex items-center gap-2">
            <Package size={12} /> Sản phẩm chính
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <ProductItem label="Tivi" icon={<Tv size={14} />} value={state.products.tivi} onStep={s => handleStep('products', 'tivi', s)} />
              <ProductItem label="Tủ lạnh" icon={<Refrigerator size={14} />} value={state.products.tuLanh} onStep={s => handleStep('products', 'tuLanh', s)} />
              <ProductItem label="Máy giặt" icon={<WashingMachine size={14} />} value={state.products.mayGiat} onStep={s => handleStep('products', 'mayGiat', s)} />
              <ProductItem label="Máy lạnh" icon={<AirVent size={14} />} value={state.products.mayLanh} onStep={s => handleStep('products', 'mayLanh', s)} />
              <ProductItem label="SMP/Tab" icon={<Smartphone size={14} />} value={state.products.smpTab} onStep={s => handleStep('products', 'smpTab', s)} />
              <ProductItem label="Laptop" icon={<Laptop size={14} />} value={state.products.laptop} onStep={s => handleStep('products', 'laptop', s)} />
            </div>
            <div className="pt-2 border-t border-slate-50 flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Khác..." 
                className="flex-1 text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 focus:outline-none"
                value={state.products.otherName}
                onChange={e => setState(prev => ({ ...prev, products: { ...prev.products, otherName: e.target.value } }))}
              />
              <Stepper value={state.products.otherCount} onStep={s => handleStep('products', 'otherCount', s)} />
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="card-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm border-emerald-100 bg-emerald-50/10">
          <div className="flex justify-between items-center mb-2">
            <h2 className="label-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 text-emerald-700 flex items-center gap-2">
              <ShieldCheck size={12} /> Dịch vụ
            </h2>
            <button 
              onClick={handleAccumulateServices}
              disabled={!state.services.insurance && !state.services.maintenance}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Lưu dữ liệu hiện tại và nhập thêm"
            >
              <Plus size={10} /> Thêm
            </button>
          </div>
          {/* Indicator: hiển thị tổng luỹ kế DV nếu đã lưu */}
          {(savedTotals.insurance > 0 || savedTotals.maintenance > 0) && (
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg px-2.5 py-1.5 mb-2">
              <div className="flex items-center gap-3 text-[10px] flex-wrap">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">📦 Đã lưu{savedTotals.lastUpdatedAt ? ` (${savedTotals.lastUpdatedAt})` : ''}:</span>
                <span className="text-slate-600">Bảo hiểm: <strong className="text-slate-800">{savedTotals.insurance}</strong></span>
                <span className="text-emerald-600">Bảo dưỡng: <strong>{savedTotals.maintenance}</strong></span>
              </div>
              <button onClick={() => resetAccumulation('services')} className="text-[9px] text-red-400 hover:text-red-600 font-bold flex-shrink-0" title="Xoá luỹ kế">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold ml-1">BẢO HIỂM {savedTotals.insurance > 0 && <span className="text-emerald-500">(Tổng: {totalInsurance})</span>}</label>
              <input 
                type="number" 
                step="any"
                inputMode="decimal"
                min="0"
                placeholder="0" 
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-2 focus:outline-none"
                value={state.services.insurance}
                onChange={e => setState(prev => ({ ...prev, services: { ...prev.services, insurance: e.target.value } }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold ml-1">BẢO DƯỠNG {savedTotals.maintenance > 0 && <span className="text-emerald-500">(Tổng: {totalMaintenance})</span>}</label>
              <input 
                type="number" 
                step="any"
                inputMode="decimal"
                min="0"
                placeholder="0" 
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-2 focus:outline-none"
                value={state.services.maintenance}
                onChange={e => setState(prev => ({ ...prev, services: { ...prev.services, maintenance: e.target.value } }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-4 border-t border-emerald-50">
            <ProductItem label="Vieon" icon={<Tv2 size={14} />} value={state.services.vieon} onStep={s => handleStep('services', 'vieon', s)} />
            <ProductItem label="SIM" icon={<Cpu size={14} />} value={state.services.sim} onStep={s => handleStep('services', 'sim', s)} />
          </div>
        </section>

        {/* Accessories Section */}
        <section className="card-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm border-purple-100 bg-purple-50/10">
          <h2 className="label-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 text-purple-700 flex items-center gap-2 mb-2">
            <Headphones size={12} /> Phụ kiện và đồng hồ
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <ProductItem label="Camera" icon={<Camera size={14} />} value={state.accessories.camera} onStep={s => handleStep('accessories', 'camera', s)} />
            <ProductItem label="SDP" icon={<BatteryCharging size={14} />} value={state.accessories.sdp} onStep={s => handleStep('accessories', 'sdp', s)} />
            <ProductItem label="Tai nghe" icon={<Headphones size={14} />} value={state.accessories.taiNghe} onStep={s => handleStep('accessories', 'taiNghe', s)} />
            <ProductItem label="Đèn" icon={<Lamp size={14} />} value={state.accessories.den} onStep={s => handleStep('accessories', 'den', s)} />
            <ProductItem label="Đồng Hồ" icon={<Watch size={14} />} value={state.accessories.dongHo} onStep={s => handleStep('accessories', 'dongHo', s)} />
          </div>
        </section>

        {/* Household Section */}
        <section className="card-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm bg-orange-50/10 border-orange-100">
          <h2 className="label-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mb-2 text-orange-600 flex items-center gap-2">
            <Fan size={12} /> Gia dụng
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <ProductItem label="MLN" icon={<Droplets size={14} />} value={state.household.mln} onStep={s => handleStep('household', 'mln', s)} />
              <ProductItem label="QĐH" icon={<Wind size={14} />} value={state.household.qdh} onStep={s => handleStep('household', 'qdh', s)} />
              <ProductItem label="Quạt" icon={<Fan size={14} />} value={state.household.quat} onStep={s => handleStep('household', 'quat', s)} />
              <ProductItem label="Nồi cơm" icon={<Soup size={14} />} value={state.household.noiCom} onStep={s => handleStep('household', 'noiCom', s)} />
              <ProductItem label="Lọc KK" icon={<Sparkles size={14} />} value={state.household.locKk} onStep={s => handleStep('household', 'locKk', s)} />
            </div>
            <div className="pt-2 border-t border-slate-50 flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Gia dụng khác..." 
                className="flex-1 text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 focus:outline-none"
                value={state.household.otherName}
                onChange={e => setState(prev => ({ ...prev, household: { ...prev.household, otherName: e.target.value } }))}
              />
              <Stepper value={state.household.otherCount} onStep={s => handleStep('household', 'otherCount', s)} />
            </div>
          </div>
        </section>

        {/* Price War Sections */}
        <PriceWarCard 
          title="Chiến giá: CE (Điện máy)" 
          color="red" 
          stats={state.priceWar.ce} 
          onChange={newStats => setState(prev => ({ ...prev, priceWar: { ...prev.priceWar, ce: newStats } }))}
          leadNameInputId="lead-name-input"
        />
        <PriceWarCard 
          title="Chiến giá: ICT (Điện thoại)" 
          color="slate" 
          stats={state.priceWar.ict} 
          onChange={newStats => setState(prev => ({ ...prev, priceWar: { ...prev.priceWar, ict: newStats } }))}
          leadNameInputId="lead-name-input"
        />

        <LeadsCard 
          leads={state.leads}
          onAdd={(lead) => setState(prev => ({ ...prev, leads: [...prev.leads, { ...lead, id: Date.now().toString() }] }))}
          onRemove={(id) => setState(prev => ({ ...prev, leads: prev.leads.filter(l => l.id !== id) }))}
        />

        </div>
      </main>

      {/* Footer Actions */}
      <footer className="flex-shrink-0 h-[56px] flex flex-col justify-center px-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-40">
        <div className="max-w-md w-full mx-auto flex gap-2.5">
          <button 
            onClick={clearAll}
            className="flex-none w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg active:bg-slate-200 dark:active:bg-slate-700 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={copyReport}
            className="flex-1 h-10 bg-[#0066FF] hover:bg-blue-700 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] shadow-md shadow-blue-500/20 transition-all"
          >
            <Copy size={16} />
            <span className="truncate">COPY BÁO CÁO</span>
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] shadow-md shadow-emerald-500/20 transition-all"
          >
            <History size={16} />
            <span className="truncate">LUỸ KẾ</span>
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10 sticky top-0">
                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <History size={18} className="text-emerald-500" />
                  Luỹ kế khai thác
                </h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                {history.length === 0 ? (
                  <div className="text-center text-sm text-slate-500 py-10 flex flex-col items-center">
                    <History size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
                    Chưa có dữ liệu luỹ kế
                  </div>
                ) : (
                  [...history].reverse().map((h, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex justify-between items-center mb-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{h.date}</span>
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {h.data.staffName || 'Vô danh'}
                        </span>
                      </div>
                      {/* Doanh thu */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-2">
                          <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Tiền mặt</div>
                          <div className="font-bold text-slate-700 dark:text-slate-300">{h.data.cash || '0'}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-2">
                          <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Trả chậm</div>
                          <div className="font-bold text-blue-600 dark:text-blue-400">{h.data.installment || '0'}</div>
                        </div>
                      </div>

                      {/* SP Chính */}
                      <div className="mb-2">
                        <div className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Tv size={10} /> SP CHÍNH
                          <span className="ml-auto bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {h.data.products.tivi + h.data.products.tuLanh + h.data.products.mayGiat + h.data.products.mayLanh + h.data.products.smpTab + h.data.products.laptop + (h.data.products.otherCount || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px]">
                          {[
                            { label: 'Tivi', val: h.data.products.tivi },
                            { label: 'Tủ lạnh', val: h.data.products.tuLanh },
                            { label: 'Máy giặt', val: h.data.products.mayGiat },
                            { label: 'Máy lạnh', val: h.data.products.mayLanh },
                            { label: 'SMP/Tab', val: h.data.products.smpTab },
                            { label: 'Laptop', val: h.data.products.laptop },
                          ].filter(x => x.val > 0).map(x => (
                            <div key={x.label} className="bg-blue-50/50 dark:bg-blue-900/10 rounded px-1.5 py-1 flex justify-between">
                              <span className="text-slate-500">{x.label}</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">{x.val}</span>
                            </div>
                          ))}
                          {h.data.products.otherCount > 0 && (
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded px-1.5 py-1 flex justify-between col-span-2">
                              <span className="text-slate-500 truncate">{h.data.products.otherName || 'Khác'}</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">{h.data.products.otherCount}</span>
                            </div>
                          )}
                          {h.data.products.tivi + h.data.products.tuLanh + h.data.products.mayGiat + h.data.products.mayLanh + h.data.products.smpTab + h.data.products.laptop + (h.data.products.otherCount || 0) === 0 && (
                            <div className="col-span-3 text-center text-slate-300 dark:text-slate-600 py-0.5 text-[9px]">Không có</div>
                          )}
                        </div>
                      </div>

                      {/* Gia dụng */}
                      <div className="mb-2">
                        <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Fan size={10} /> GIA DỤNG
                          <span className="ml-auto bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {h.data.household.mln + h.data.household.qdh + h.data.household.quat + h.data.household.noiCom + h.data.household.locKk + (h.data.household.otherCount || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px]">
                          {[
                            { label: 'MLN', val: h.data.household.mln },
                            { label: 'QĐH', val: h.data.household.qdh },
                            { label: 'Quạt', val: h.data.household.quat },
                            { label: 'Nồi cơm', val: h.data.household.noiCom },
                            { label: 'Lọc KK', val: h.data.household.locKk },
                          ].filter(x => x.val > 0).map(x => (
                            <div key={x.label} className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded px-1.5 py-1 flex justify-between">
                              <span className="text-slate-500">{x.label}</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{x.val}</span>
                            </div>
                          ))}
                          {h.data.household.otherCount > 0 && (
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded px-1.5 py-1 flex justify-between col-span-2">
                              <span className="text-slate-500 truncate">{h.data.household.otherName || 'Khác'}</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{h.data.household.otherCount}</span>
                            </div>
                          )}
                          {h.data.household.mln + h.data.household.qdh + h.data.household.quat + h.data.household.noiCom + h.data.household.locKk + (h.data.household.otherCount || 0) === 0 && (
                            <div className="col-span-3 text-center text-slate-300 dark:text-slate-600 py-0.5 text-[9px]">Không có</div>
                          )}
                        </div>
                      </div>

                      {/* Dịch vụ */}
                      <div className="mb-2">
                        <div className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <ShieldCheck size={10} /> DỊCH VỤ
                          <span className="ml-auto bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {(Number(h.data.services.insurance) || 0) + (Number(h.data.services.maintenance) || 0) + h.data.services.vieon + h.data.services.sim}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          {[
                            { label: 'Bảo hiểm', val: Number(h.data.services.insurance) || 0 },
                            { label: 'Bảo hành MR', val: Number(h.data.services.maintenance) || 0 },
                            { label: 'Vieon', val: h.data.services.vieon },
                            { label: 'SIM', val: h.data.services.sim },
                          ].filter(x => x.val > 0).map(x => (
                            <div key={x.label} className="bg-amber-50/50 dark:bg-amber-900/10 rounded px-1.5 py-1 flex justify-between">
                              <span className="text-slate-500">{x.label}</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">{x.val}</span>
                            </div>
                          ))}
                          {(Number(h.data.services.insurance) || 0) + (Number(h.data.services.maintenance) || 0) + h.data.services.vieon + h.data.services.sim === 0 && (
                            <div className="col-span-2 text-center text-slate-300 dark:text-slate-600 py-0.5 text-[9px]">Không có</div>
                          )}
                        </div>
                      </div>

                      {/* Phụ kiện */}
                      <div className="mb-1">
                        <div className="text-[9px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Camera size={10} /> PHỤ KIỆN
                          <span className="ml-auto bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {h.data.accessories.camera + h.data.accessories.sdp + h.data.accessories.taiNghe + h.data.accessories.den + h.data.accessories.dongHo}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px]">
                          {[
                            { label: 'Camera', val: h.data.accessories.camera },
                            { label: 'SDP', val: h.data.accessories.sdp },
                            { label: 'Tai nghe', val: h.data.accessories.taiNghe },
                            { label: 'Đèn', val: h.data.accessories.den },
                            { label: 'Đồng hồ', val: h.data.accessories.dongHo },
                          ].filter(x => x.val > 0).map(x => (
                            <div key={x.label} className="bg-violet-50/50 dark:bg-violet-900/10 rounded px-1.5 py-1 flex justify-between">
                              <span className="text-slate-500">{x.label}</span>
                              <span className="font-bold text-violet-600 dark:text-violet-400">{x.val}</span>
                            </div>
                          ))}
                          {h.data.accessories.camera + h.data.accessories.sdp + h.data.accessories.taiNghe + h.data.accessories.den + h.data.accessories.dongHo === 0 && (
                            <div className="col-span-3 text-center text-slate-300 dark:text-slate-600 py-0.5 text-[9px]">Không có</div>
                          )}
                        </div>
                      </div>

                      {/* Chiến giá */}
                      {h.data.priceWar && (h.data.priceWar.ce?.tc || h.data.priceWar.ict?.tc) && (
                        <div className="mb-1 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          <div className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Sword size={10} /> CHIẾN GIÁ
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            {h.data.priceWar.ce?.tc && (
                              <div className="bg-red-50/50 dark:bg-red-900/10 rounded p-1.5">
                                <div className="text-[8px] text-red-500 font-bold mb-1">CE (Điện máy)</div>
                                <div className="flex flex-wrap gap-1">
                                  {h.data.priceWar.ce.tc && <span className="text-slate-600">TC:{h.data.priceWar.ce.tc}</span>}
                                  {h.data.priceWar.ce.ss && <span className="text-slate-600">SS:{h.data.priceWar.ce.ss}</span>}
                                  {h.data.priceWar.ce.ch && <span className="text-slate-600">CH:{h.data.priceWar.ce.ch}</span>}
                                  {h.data.priceWar.ce.bo && <span className="text-slate-600">BỎ:{h.data.priceWar.ce.bo}</span>}
                                  {h.data.priceWar.ce.xtt && <span className="text-slate-600">XTT:{h.data.priceWar.ce.xtt}</span>}
                                </div>
                              </div>
                            )}
                            {h.data.priceWar.ict?.tc && (
                              <div className="bg-slate-100/50 dark:bg-slate-900/30 rounded p-1.5">
                                <div className="text-[8px] text-slate-500 font-bold mb-1">ICT (Điện thoại)</div>
                                <div className="flex flex-wrap gap-1">
                                  {h.data.priceWar.ict.tc && <span className="text-slate-600">TC:{h.data.priceWar.ict.tc}</span>}
                                  {h.data.priceWar.ict.ss && <span className="text-slate-600">SS:{h.data.priceWar.ict.ss}</span>}
                                  {h.data.priceWar.ict.ch && <span className="text-slate-600">CH:{h.data.priceWar.ict.ch}</span>}
                                  {h.data.priceWar.ict.bo && <span className="text-slate-600">BỎ:{h.data.priceWar.ict.bo}</span>}
                                  {h.data.priceWar.ict.xtt && <span className="text-slate-600">XTT:{h.data.priceWar.ict.xtt}</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {h.data.leads && h.data.leads.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                          <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                            <UserPlus size={12} className="text-blue-500" /> DANH SÁCH KHÁCH HÀNG:
                          </div>
                          <div className="space-y-1.5">
                            {h.data.leads.map((lead: any, idx: number) => (
                              <div key={lead.id || idx} className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">#{idx + 1} {lead.name}</span>
                                  <span className="text-slate-400 font-mono text-[10px] tracking-wider">{lead.phone}</span>
                                </div>
                                <span className="text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                                  {lead.product}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Internal UI Components ---

function Stepper({ value, onStep }: { value: number, onStep: (s: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onStep(-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg"><Minus size={14} /></button>
      <span className="w-4 text-center font-bold text-sm text-slate-700">{value}</span>
      <button onClick={() => onStep(1)} className="w-8 h-8 flex items-center justify-center bg-blue-50 border border-blue-100 text-blue-600 rounded-lg"><Plus size={14} /></button>
    </div>
  );
}

function ProductItem({ label, icon, value, onStep }: { label: string, icon: React.ReactNode, value: number, onStep: (s: number) => void }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="text-slate-400 group-hover:text-blue-500 flex-shrink-0">{icon}</div>
        <span className="text-[11px] font-medium text-slate-600 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg ml-2">
        <button onClick={() => onStep(-1)} className="w-5 h-5 flex items-center justify-center text-slate-300"><Minus size={10} /></button>
        <span className="w-4 text-center text-[10px] font-bold text-slate-800">{value}</span>
        <button onClick={() => onStep(1)} className="w-5 h-5 flex items-center justify-center text-slate-600"><Plus size={10} /></button>
      </div>
    </div>
  );
}

function PriceWarCard({ title, color, stats, onChange, leadNameInputId }: { 
  title: string, color: 'red' | 'slate', stats: PriceWarStats, onChange: (s: PriceWarStats) => void, leadNameInputId?: string 
}) {
  const borderColor = color === 'red' ? 'border-l-red-500' : 'border-l-slate-400';
  const textColor = color === 'red' ? 'text-red-700' : 'text-slate-700';

  const update = (field: keyof PriceWarStats, val: string) => onChange({ ...stats, [field]: val });

  const focusLeadName = () => {
    if (leadNameInputId) {
      setTimeout(() => document.getElementById(leadNameInputId)?.focus(), 100);
    }
  };

  return (
    <section className={`card-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm border-l-4 ${borderColor}`}>
      <h2 className={`label-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 mb-2 flex items-center gap-2 ${textColor}`}><Sword size={12} /> {title}</h2>
      <div className="grid grid-cols-5 gap-2">
        <StatInput label="Thành công" value={stats.tc} onChange={v => update('tc', v)} />
        <StatInput label="So sánh" value={stats.ss} onChange={v => update('ss', v)} />
        <StatInput label="Chiến" value={stats.ch} onChange={v => update('ch', v)} />
        <StatInput label="Bỏ về" value={stats.bo} onChange={v => update('bo', v)} />
        <StatInput label="Xin TT" value={stats.xtt} onChange={v => update('xtt', v)} onBlur={focusLeadName} />
      </div>
    </section>
  );
}

function StatInput({ label, value, onChange, onBlur }: { label: string, value: string, onChange: (v: string) => void, onBlur?: () => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] text-slate-400 font-bold block text-center uppercase leading-tight">{label}</label>
      <input 
        type="number" 
        min="0"
        className="w-full text-center text-xs font-bold bg-slate-50 border border-slate-100 rounded-lg p-2 focus:outline-none"
        placeholder="-"
        value={value}
        onKeyDown={blockNonNumericKeys}
        onChange={e => {
          const val = e.target.value;
          if (val === '' || parseInt(val) >= 0) {
            onChange(val);
          }
        }}
        onBlur={onBlur}
      />
    </div>
  );
}

function LeadsCard({ leads, onAdd, onRemove }: { 
  leads: LeadInfo[], 
  onAdd: (lead: Omit<LeadInfo, 'id'>) => void,
  onRemove: (id: string) => void
}) {
  const [form, setForm] = useState({ name: '', phone: '', product: '' });

  const handleAdd = () => {
    if (form.name || form.phone || form.product) {
      onAdd(form);
      setForm({ name: '', phone: '', product: '' });
    }
  };

  return (
    <section className="card-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm border-blue-100 bg-blue-50/5">
      <h2 className="label-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 text-blue-700 flex items-center gap-2 mb-2">
        <UserPlus size={12} /> Xin thông tin khách hàng
      </h2>
      
      <div className="space-y-2 mb-2">
        <input 
          id="lead-name-input"
          type="text" 
          placeholder="Tên khách hàng" 
          className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <input 
            type="number"
            step="any"
            inputMode="decimal"
            min="0"
            placeholder="Số điện thoại" 
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            onKeyDown={blockNonNumericKeys}
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
          <input 
            type="text" 
            placeholder="Sản phẩm" 
            className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            value={form.product}
            onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleAdd}
            className="flex-1 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl active:bg-blue-700 shadow-lg shadow-blue-100"
          >
            THÊM THÔNG TIN
          </button>
        </div>
      </div>

      {leads.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-blue-100">
          {leads.map((lead, idx) => (
            <div key={lead.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex-1 min-w-0 mr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                  <span className="text-xs font-bold text-slate-800 truncate">{lead.name || '---'}</span>
                </div>
                <div className="flex gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">{lead.phone || '---'}</span>
                  <span className="flex items-center gap-1 text-blue-600 font-medium italic">{lead.product || '---'}</span>
                </div>
              </div>
              <button 
                onClick={() => onRemove(lead.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

