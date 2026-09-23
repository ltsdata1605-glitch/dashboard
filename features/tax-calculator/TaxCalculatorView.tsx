import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calculator,
  History,
  Info,
  Sparkles,
  ShieldCheck,
  Cloud,
  HardDrive,
  Key,
  Camera,
  MousePointerClick,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../services/firebase';
import { TaxCalculationInput, SavedTaxRecord } from './types/tax.types';
import {
  calculateTax,
  PERSONAL_DEDUCTION_2026,
  DEPENDENT_DEDUCTION_2026,
  formatVnd,
  generateVietQrUrl,
} from './services/taxCalculatorService';
import { BANK_OPTIONS, normalizeBankCode } from './services/bankCatalog';
import { SCREENSHOT_BOOKMARKLET } from './services/screenshotBookmarklet';
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
  bankCode: '',
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
        const parsed = { ...DEFAULT_INPUTS, ...JSON.parse(saved) } as TaxCalculationInput;
        // Bản cũ lưu bankCode 'MB' — không khớp danh mục nên <select> trống và QR không dựng được.
        parsed.bankCode = normalizeBankCode(parsed.bankCode);
        return parsed;
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

  // Nút bookmarklet "Chụp ảnh": href là javascript: nên phải gắn bằng DOM, React chặn trong JSX
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    bookmarkletRef.current?.setAttribute('href', SCREENSHOT_BOOKMARKLET);
  }, []);

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

  const handleSaveHistory = async (opts?: { silent?: boolean }) => {
    try {
      await taxSyncService.saveRecord({
        name: input.name || 'Người kê khai',
        monthYear: input.monthYear,
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
        opts?.silent
          ? 'Đã tự động lưu kết quả vào lịch sử'
          : isCloudUser
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
      bankCode: normalizeBankCode(record.bankCode),
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

  // Tổng tiền nhận thay (đã gồm phần thuế phát sinh) — dùng chung cho bảng kết quả và thẻ QR
  const proxyTotal =
    result.netRefundToFriend > 0
      ? result.netRefundToFriend + result.taxOnProxyAmount
      : input.proxyAmount;

  // Các khoản nhận thay đang chọn — đưa vào ảnh xuất để thủ quỹ đối chiếu từng khoản
  const proxyItems = useMemo(() => {
    const selected = (input.bonusItems || [])
      .filter(b => (input.selectedProxyItemIds || []).includes(b.id))
      .map(b => ({ id: b.id, name: b.name, amount: b.amount }));
    if ((input.customProxyAmount || 0) > 0) {
      selected.push({ id: 'custom', name: 'Khoản nhập tay', amount: input.customProxyAmount });
    }
    return selected;
  }, [input.bonusItems, input.selectedProxyItemIds, input.customProxyAmount]);

  // Mã QR hoàn thuế: dựng ở đây để CẢ thẻ QR lẫn ảnh xuất ra dùng chung một mã
  const qrUrl = generateVietQrUrl({
    bankAccount: input.bankAccount,
    bankCode: input.bankCode,
    amount: result.taxOnProxyAmount,
    description: input.qrDescription || 'Hoan tra thue TNCN nhan thay',
  });
  const qrBankLabel = BANK_OPTIONS.find(o => o.value === input.bankCode)?.label || '';

  const personalDeduction = PERSONAL_DEDUCTION_2026;
  const dependentDeduction = DEPENDENT_DEDUCTION_2026;

  return (
    <div className="mx-auto w-full flex-grow max-w-[1100px] p-0 sm:px-4 sm:pb-4 lg:px-6 lg:pb-6 animate-fadeIn">
      {/* HEADER: Gọn gàng & Hiện đại */}
      <div className="bg-white dark:bg-slate-800/90 border-b sm:border border-slate-200 dark:border-slate-700/60 sm:rounded-2xl p-3.5 sm:p-4 mb-3 sm:mb-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Calculator className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Tính Thuế
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded-md">
                  <Sparkles className="w-2.5 h-2.5 text-sky-500" />
                  Biểu 5 bậc (2026)
                </span>

                {/* Cloud sync status badge */}
                <span
                  title={isCloudUser ? 'Đồng bộ Firebase Cloud' : 'Lưu trữ cục bộ'}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${
                    isCloudUser
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {isCloudUser ? <Cloud className="w-2.5 h-2.5 text-emerald-500" /> : <HardDrive className="w-2.5 h-2.5 text-slate-400" />}
                  <span>{isCloudUser ? 'Cloud' : 'Local'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                Thuế TNCN 2 đợt & bóc tách nhận thay chuẩn MWG
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Kéo thả lên thanh dấu trang -> có nút "Chụp ảnh" dùng được ở mọi trang web */}
            <div className="relative group">
              <a
                ref={bookmarkletRef}
                href="#"
                draggable
                onClick={(e) => {
                  e.preventDefault();
                  toast(
                    'Kéo thả nút này lên thanh Dấu trang của trình duyệt, rồi bấm vào dấu trang đó ở trang cần chụp.',
                    { icon: '📸', duration: 6000 }
                  );
                }}
                className="px-2 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-grab active:cursor-grabbing select-none no-underline"
              >
                <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Nút Chụp ảnh</span>
              </a>

              {/* Tooltip hướng dẫn */}
              <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-50 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-md bg-slate-800 text-white p-2.5 shadow-lg text-[11px] leading-relaxed">
                <div className="font-bold mb-1 flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3" />
                  Kéo thả nút này lên thanh Dấu trang
                </div>
                <div className="text-slate-200">
                  Sau đó mở trang cần chụp (HRM, phiếu lương…) và bấm vào dấu trang “Nút Chụp ảnh” —
                  ảnh PNG full trang, siêu nét sẽ tự tải về.
                </div>
                <div className="mt-1 text-slate-400">
                  Chưa thấy thanh dấu trang? Nhấn Ctrl+Shift+B (Windows) hoặc ⌘+Shift+B (Mac).
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowApiKeyModal(true)}
              title="API Key Gemini dự phòng"
              className="px-2 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">API Key</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBracketModal(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-700/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <span>Biểu thuế</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-700/60 rounded-lg transition-colors flex items-center gap-1 relative cursor-pointer"
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
      </div>

      {/* BODY GRID: Cân đối 2 cột trên Desktop (6 - 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Cột trái: Panel nhập liệu & danh sách nhận thay (6/12 cột) */}
        <div className="lg:col-span-6">
          <TaxInputPanel
            input={input}
            onChange={handleInputChange}
            onReset={handleReset}
            onSave={() => handleSaveHistory()}
            isSaved={isSaved}
            onOpenApiKeyConfig={() => setShowApiKeyModal(true)}
          />
        </div>

        {/* Cột phải: Panel kết quả & VietQR (6/12 cột) */}
        <div className="lg:col-span-6 space-y-3 sm:space-y-4">
          <TaxResultPanel
            result={result}
            proxyAmount={proxyTotal}
            totalIncome={result.totalIncome || input.totalIncome}
            name={input.name}
            proxyItems={proxyItems}
            qrUrl={qrUrl}
            qrBankLabel={qrBankLabel}
            qrBankAccount={input.bankAccount}
            // Xuất ảnh lại mà chưa sửa gì thì không tạo thêm bản ghi trùng
            onExported={() => (isSaved ? undefined : handleSaveHistory({ silent: true }))}
            onOpenBracketModal={() => setShowBracketModal(true)}
          />

          {(result.taxOnProxyAmount > 0 || result.netRefundToFriend > 0) && (
            <TaxPaymentQrCard
              amount={result.taxOnProxyAmount}
              proxyAmount={proxyTotal}
              netRefundAmount={result.netRefundToFriend}
              name={input.name}
              bankAccount={input.bankAccount || ''}
              setBankAccount={(v) => handleInputChange({ bankAccount: v })}
              bankCode={input.bankCode || ''}
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
