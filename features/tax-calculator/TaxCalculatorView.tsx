import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  History,
  Info,
  Sparkles,
  ShieldCheck,
  Cloud,
  HardDrive,
  Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../services/firebase';
import { TaxCalculationInput, SavedTaxRecord } from './types/tax.types';
import {
  calculateTax,
  PERSONAL_DEDUCTION_2026,
  DEPENDENT_DEDUCTION_2026,
  formatVnd,
} from './services/taxCalculatorService';
import { taxSyncService } from './services/taxSyncService';
import { TaxInputPanel } from './components/TaxInputPanel';
import { TaxResultPanel } from './components/TaxResultPanel';
import { TaxPaymentQrCard } from './components/TaxPaymentQrCard';
import { TaxBracketModal } from './components/TaxBracketModal';
import { TaxHistoryModal } from './components/TaxHistoryModal';
import { ApiKeyConfigModal } from './components/ApiKeyConfigModal';

const DEFAULT_INPUTS: TaxCalculationInput = {
  name: '',
  monthYear: '',
  incomeDay5: 0,
  insuranceSalary: 0,
  insurance: 0,
  dependents: 0,
  personalDeduction: 15_500_000,
  incomeDay20: 0,
  bonusMain: 0,
  bonusHot: 0,
  actualTaxDay20: 0,
  bonusItems: [],
  selectedProxyItemIds: [],
  customProxyAmount: 0,
  totalIncome: 0,
  proxyAmount: 0,
  unionFee: 0,
  bankAccount: '',
  bankCode: 'MB',
  qrDescription: 'HOAN THUE NHAN THAY',
  taxLawVersion: '2026_law',
  hasDay5Slip: false,
  hasDay20Slip: false,
};

const STORAGE_KEY = 'TAX_CALCULATOR_INPUTS_V4';

export const TaxCalculatorView: React.FC = () => {
  // 1. State input
  const [input, setInput] = useState<TaxCalculationInput>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_INPUTS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Lỗi đọc tax inputs từ localStorage', e);
    }
    return DEFAULT_INPUTS;
  });

  // 2. Modals state
  const [showBracketModal, setShowBracketModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [historyList, setHistoryList] = useState<SavedTaxRecord[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isCloudUser, setIsCloudUser] = useState<boolean>(!!auth.currentUser);

  // Lắng nghe trạng thái đăng nhập Firebase
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsCloudUser(!!user);
      refreshHistory();
    });
    return () => unsubscribe();
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch (e) {
      console.warn('Lỗi lưu tax inputs vào localStorage', e);
    }
    setIsSaved(false);
  }, [input]);

  // Load history from IndexedDB + Firebase Firestore
  const refreshHistory = useCallback(async () => {
    try {
      const records = await taxSyncService.getAllRecords();
      setHistoryList(records);
    } catch (e) {
      console.warn('Không thể load tax history từ taxSyncService', e);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // 3. Calculation Result (Instant memoized)
  const result = useMemo(() => {
    return calculateTax(input);
  }, [input]);

  // Handlers
  const handleInputChange = (updates: Partial<TaxCalculationInput>) => {
    setInput((prev) => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá dữ liệu nhập để tính lại từ đầu?')) {
      setInput(DEFAULT_INPUTS);
      toast.success('Đã đặt lại biểu mẫu');
    }
  };

  const handleSaveHistory = async () => {
    try {
      await taxSyncService.saveRecord({
        name: input.name || 'Người kê khai',
        incomeDay5: input.incomeDay5,
        incomeDay20: input.incomeDay20,
        totalIncome: result.totalIncome || input.totalIncome,
        dependents: input.dependents,
        proxyAmount: result.netRefundToFriend > 0 ? (result.netRefundToFriend + result.taxOnProxyAmount) : input.proxyAmount,
        taxOnProxyAmount: result.taxOnProxyAmount,
        netRefundToFriend: result.netRefundToFriend,
        insurance: input.insurance,
        unionFee: input.unionFee,
        taxLawVersion: input.taxLawVersion || '2026_law',
        bankAccount: input.bankAccount,
        bankCode: input.bankCode,
        createdAt: new Date().toISOString(),
      });
      setIsSaved(true);
      toast.success(
        isCloudUser
          ? 'Đã lưu vào lịch sử (IndexedDB & Firebase Cloud)'
          : 'Đã lưu vào bộ nhớ máy (IndexedDB)'
      );
      await refreshHistory();
    } catch (e) {
      console.error('Lỗi khi lưu lịch sử:', e);
      toast.error('Không thể lưu vào lịch sử');
    }
  };

  const handleLoadRecord = (record: SavedTaxRecord) => {
    setInput({
      ...DEFAULT_INPUTS,
      name: record.name,
      incomeDay5: record.incomeDay5 || 0,
      incomeDay20: record.incomeDay20 || 0,
      totalIncome: record.totalIncome,
      dependents: record.dependents,
      proxyAmount: record.proxyAmount,
      insurance: record.insurance || 0,
      unionFee: record.unionFee || 0,
      taxLawVersion: record.taxLawVersion || '2026_law',
      bankAccount: record.bankAccount || '',
      bankCode: record.bankCode || 'MB',
      qrDescription: `HOAN THUE CHO ${record.name}`.toUpperCase(),
      hasDay5Slip: (record.incomeDay5 || 0) > 0,
      hasDay20Slip: (record.incomeDay20 || 0) > 0,
    });
    setShowHistoryModal(false);
    toast.success(`Đã tải dữ liệu của: ${record.name}`);
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      const target = historyList.find((r) => r.id === id);
      await taxSyncService.deleteRecord(id, target?.createdAt);
      toast.success('Đã xoá bản ghi');
      await refreshHistory();
    } catch (e) {
      console.error('Lỗi khi xoá bản ghi:', e);
      toast.error('Không thể xoá bản ghi');
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm('Bạn có chắc muốn xoá toàn bộ lịch sử tính thuế đã lưu (cả trên máy và Cloud)?')) {
      await taxSyncService.clearAll();
      toast.success('Đã xoá sạch lịch sử');
      await refreshHistory();
    }
  };

  const personalDeduction = PERSONAL_DEDUCTION_2026;
  const dependentDeduction = DEPENDENT_DEDUCTION_2026;

  return (
    <div className="mx-auto w-full flex-grow max-w-[960px] p-0 sm:px-4 sm:pb-4 lg:px-8 lg:pb-8 animate-fadeIn">
      {/* HEADER: Chuẩn phong cách Report BI */}
      <div className="bg-white dark:bg-slate-800/90 border-b sm:border border-slate-200 dark:border-slate-700/60 sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Tính Thuế
                </h1>
                <span className="hidden xs:inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-sky-500" />
                  Biểu thuế 5 bậc
                </span>

                {/* Cloud sync status badge */}
                <span
                  title={isCloudUser ? 'Dữ liệu được tự động đồng bộ lên Firebase Cloud' : 'Đăng nhập để đồng bộ dữ liệu lên Cloud'}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                    isCloudUser
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {isCloudUser ? <Cloud className="w-3 h-3 text-emerald-500" /> : <HardDrive className="w-3 h-3 text-slate-400" />}
                  <span>{isCloudUser ? 'Cloud Sync' : 'Local'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tính thuế thu nhập cá nhân & thuế phát sinh nhận thay theo quy định mới nhất
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowApiKeyModal(true)}
              title="Cài đặt Gemini API Key cá nhân (Dự phòng)"
              className="px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden xs:inline">API Key</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBracketModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-700/60 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <span>Biểu thuế</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-700/60 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 relative cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Lịch sử</span>
              {historyList.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                  {historyList.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tip info bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Luật 109/2025/QH15: Giảm trừ bản thân <strong className="text-slate-700 dark:text-slate-300">{formatVnd(personalDeduction)}/tháng</strong>,
            người phụ thuộc <strong className="text-slate-700 dark:text-slate-300">{formatVnd(dependentDeduction)}/tháng</strong>.
          </span>
        </div>
      </div>

      {/* BODY GRID: Responsive 2 cột trên Desktop, 1 cột trên Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Cột trái: Panel nhập liệu (5/12 cột trên màn lớn) */}
        <div className="lg:col-span-5">
          <TaxInputPanel
            input={input}
            onChange={handleInputChange}
            onReset={handleReset}
            onSave={handleSaveHistory}
            isSaved={isSaved}
          />
        </div>

        {/* Cột phải: Panel kết quả & VietQR (7/12 cột trên màn lớn) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          <TaxResultPanel
            result={result}
            proxyAmount={result.netRefundToFriend > 0 ? (result.netRefundToFriend + result.taxOnProxyAmount) : input.proxyAmount}
            totalIncome={result.totalIncome || input.totalIncome}
            name={input.name}
            onOpenBracketModal={() => setShowBracketModal(true)}
          />

          {(result.taxOnProxyAmount > 0 || result.netRefundToFriend > 0) && (
            <TaxPaymentQrCard
              amount={result.netRefundToFriend > 0 ? result.netRefundToFriend : result.taxOnProxyAmount}
              netRefundAmount={result.netRefundToFriend}
              taxDifferenceAmount={result.taxOnProxyAmount}
              name={input.name}
              bankAccount={input.bankAccount || ''}
              setBankAccount={(v) => handleInputChange({ bankAccount: v })}
              bankCode={input.bankCode || 'MB'}
              setBankCode={(v) => handleInputChange({ bankCode: v })}
              qrDescription={input.qrDescription || ''}
              setQrDescription={(v) => handleInputChange({ qrDescription: v })}
            />
          )}
        </div>
      </div>

      {/* MODALS */}
      <TaxBracketModal
        isOpen={showBracketModal}
        onClose={() => setShowBracketModal(false)}
        activeBracketsWithProxy={result.bracketsWithProxy}
        activeBracketsWithoutProxy={result.bracketsWithoutProxy}
      />

      <TaxHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        records={historyList}
        onLoadRecord={handleLoadRecord}
        onDeleteRecord={handleDeleteRecord}
        onClearAll={handleClearAllHistory}
      />

      <ApiKeyConfigModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSaveKey={() => {}}
      />
    </div>
  );
};


export default TaxCalculatorView;
