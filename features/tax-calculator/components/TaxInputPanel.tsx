import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calculator,
  UploadCloud,
  Loader2,
  Calendar,
  Gift,
  CheckCircle2,
  AlertCircle,
  Flame,
  Plus,
  Check,
  ListFilter,
  CheckSquare2,
  Square,
  Info,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TaxCalculationInput, BonusItem, SalarySlipDay5Data, SalarySlipDay20Data } from '../types/tax.types';
import {
  formatNumber,
  formatVnd,
  parseCurrencyInput,
  DEPENDENT_DEDUCTION_2026,
} from '../services/taxCalculatorService';
import { extractSalarySlip, SAMPLE_MWG_DAY20_BONUS_ITEMS } from '../services/salarySlipOcrService';
import { normalizeBankCode } from '../services/bankCatalog';
import { Button } from '../../../components/shared/ui/Button';

interface TaxInputPanelProps {
  input: TaxCalculationInput;
  onChange: (updates: Partial<TaxCalculationInput>) => void;
  onReset: () => void;
  onSave: () => void;
  isSaved?: boolean;
  /** Mở hộp thoại nhập Gemini API Key riêng — hiện khi AI đọc phiếu lương hỏng vì khoá/hạn mức. */
  onOpenApiKeyConfig?: () => void;
}

/** Lỗi do khoá chung hết hạn mức / bị vô hiệu -> người dùng tự cứu được bằng API Key riêng. */
const isApiKeyRelatedError = (message: string): boolean =>
  /hạn mức|quota|api key|khoá gemini|khóa gemini/i.test(message || '');

export const TaxInputPanel: React.FC<TaxInputPanelProps> = ({
  input,
  onChange,
  onReset,
  onSave,
  isSaved = false,
  onOpenApiKeyConfig,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<'day5' | 'day20' | null>(null);
  const [errorDay5, setErrorDay5] = useState<string | null>(null);
  const [errorDay20, setErrorDay20] = useState<string | null>(null);
  const [bonusFilter, setBonusFilter] = useState<'hot' | 'main' | 'all'>('hot');
  const [showAddCustomBonus, setShowAddCustomBonus] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState('');

  const dependentUnit = DEPENDENT_DEDUCTION_2026;

  const handleCurrencyChange = (field: keyof TaxCalculationInput, rawValue: string) => {
    const numValue = parseCurrencyInput(rawValue);
    onChange({ [field]: numValue });
  };

  // 1. Xử lý Upload Bảng Lương Ngày 5 (Chi tiết lương)
  const handleUploadDay5 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlot('day5');
    setErrorDay5(null);
    const toastId = toast.loading('Đang phân tích Bảng lương ngày 5 (Chi tiết lương)...');

    try {
      const data = (await extractSalarySlip(file, 'day5')) as SalarySlipDay5Data;

      const updates: Partial<TaxCalculationInput> = {
        hasDay5Slip: true,
        incomeDay5: data.incomeDay5,
        insuranceSalary: data.insuranceSalary,
        insurance: data.insurance,
        dependents: data.dependents ?? input.dependents,
        personalDeduction: data.personalDeduction || 15_500_000,
      };

      if (data.fullName && !input.name) {
        updates.name = data.fullName;
      }
      if (data.bankAccount && !input.bankAccount) {
        updates.bankAccount = data.bankAccount;
      }
      // Ngân hàng nhận tiền: lấy thẳng từ phiếu (chỉ giữ lựa chọn cũ nếu nó là ngân hàng hợp lệ
      // người dùng đã tự chọn — giá trị cũ kiểu "MB" không có trong danh mục coi như chưa chọn).
      const autoBankCode = normalizeBankCode(data.matchedBankCode || data.bankName || '');
      if (autoBankCode && !normalizeBankCode(input.bankCode)) {
        updates.bankCode = autoBankCode;
      }

      // Tự động cộng tổng thu nhập nếu cả 2 đợt đã sẵn sàng
      if (input.incomeDay20 > 0) {
        updates.totalIncome = data.incomeDay5 + input.incomeDay20;
      }

      onChange(updates);
      toast.success(`Đã nhận diện Bảng lương Đợt 1: ${data.fullName || 'Thành công'}`, { id: toastId });
    } catch (err: unknown) {
      console.error('Lỗi khi phân tích Bảng lương ngày 5:', err);
      const msg = err instanceof Error ? err.message : 'Không thể xử lý hình ảnh Bảng lương ngày 5.';
      setErrorDay5(msg);
      toast.error(`❌ ${msg}`, { id: toastId, duration: 6000 });
    } finally {
      setUploadingSlot(null);
      e.target.value = '';
    }
  };

  // 2. Xử lý Upload Bảng Thưởng Ngày 20 (Xem chi tiết thưởng)
  const handleUploadDay20 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlot('day20');
    setErrorDay20(null);
    const toastId = toast.loading('Đang phân tích Bảng thưởng ngày 20 (Xem chi tiết thưởng)...');

    try {
      const data = (await extractSalarySlip(file, 'day20')) as SalarySlipDay20Data;
      const income20 = data.incomeDay20 > 0 ? data.incomeDay20 : data.bonusMain + data.bonusHot;

      // Tự động gợi ý các mục nhận thay nếu tên có chứa từ khoá "khoán" hoặc "thi đua"
      const defaultSelectedProxyIds: string[] = [];
      if (data.bonusItems && data.bonusItems.length > 0) {
        data.bonusItems.forEach((item) => {
          const lower = item.name.toLowerCase();
          if (lower.includes('khoán') || lower.includes('thi đua') || lower.includes('nhận thay')) {
            defaultSelectedProxyIds.push(item.id);
          }
        });
      }

      const updates: Partial<TaxCalculationInput> = {
        hasDay20Slip: true,
        incomeDay20: income20,
        bonusMain: data.bonusMain,
        bonusHot: data.bonusHot,
        actualTaxDay20: data.actualTaxDay20,
        bonusItems: data.bonusItems || [],
        selectedProxyItemIds: defaultSelectedProxyIds,
      };

      if (data.fullName && !input.name) {
        updates.name = data.fullName;
      }
      if (data.bankAccount && !input.bankAccount) {
        updates.bankAccount = data.bankAccount;
      }
      // Ngân hàng nhận tiền: lấy thẳng từ phiếu (chỉ giữ lựa chọn cũ nếu nó là ngân hàng hợp lệ
      // người dùng đã tự chọn — giá trị cũ kiểu "MB" không có trong danh mục coi như chưa chọn).
      const autoBankCode = normalizeBankCode(data.matchedBankCode || data.bankName || '');
      if (autoBankCode && !normalizeBankCode(input.bankCode)) {
        updates.bankCode = autoBankCode;
      }

      if (input.incomeDay5 > 0) {
        updates.totalIncome = input.incomeDay5 + income20;
      }

      onChange(updates);
      toast.success(
        `Đã bóc tách Bảng thưởng Đợt 2: ${data.bonusItems?.length || 0} khoản thưởng. Thuế khấu trừ: ${formatVnd(data.actualTaxDay20)}`,
        { id: toastId }
      );
    } catch (err: unknown) {
      console.error('Lỗi khi phân tích Bảng thưởng ngày 20:', err);
      const msg = err instanceof Error ? err.message : 'Không thể xử lý hình ảnh Bảng thưởng ngày 20.';
      setErrorDay20(msg);
      toast.error(`❌ ${msg}`, { id: toastId, duration: 6000 });
    } finally {
      setUploadingSlot(null);
      e.target.value = '';
    }
  };

  // Tải dữ liệu mẫu từ phiếu lương thực tế của MWG (để thử nghiệm hoặc khi chưa có ảnh)
  const handleLoadSampleData = () => {
    onChange({
      name: 'TRƯƠNG HOÀNG PHÚC',
      incomeDay5: 5278580,
      insurance: 496650,
      personalDeduction: 15500000,
      dependents: 0,
      incomeDay20: 25462224,
      bonusHot: 22814000,
      bonusMain: 2648224,
      actualTaxDay20: 974415,
      totalIncome: 30740804,
      bonusItems: SAMPLE_MWG_DAY20_BONUS_ITEMS,
      selectedProxyItemIds: ['sample_hot_1', 'sample_hot_2'], // Khoán công việc (9.305.000) + VAS (2.337.000)
      hasDay5Slip: true,
      hasDay20Slip: true,
    });
    toast.success('Đã tải dữ liệu Thưởng nóng mẫu chuẩn MWG (7 khoản thưởng nóng)');
  };

  // Toggle chọn / bỏ chọn mục thưởng nhận thay
  const handleToggleProxyItem = (itemId: string) => {
    const currentSelected = input.selectedProxyItemIds || [];
    const isSelected = currentSelected.includes(itemId);
    const newSelected = isSelected
      ? currentSelected.filter((id) => id !== itemId)
      : [...currentSelected, itemId];

    onChange({ selectedProxyItemIds: newSelected });
  };

  // Chọn tất cả các mục theo tab đang xem
  const handleSelectAllVisibleItems = () => {
    const currentSelected = new Set(input.selectedProxyItemIds || []);
    visibleBonusItems.forEach((item) => currentSelected.add(item.id));
    onChange({ selectedProxyItemIds: Array.from(currentSelected) });
  };

  // Bỏ chọn tất cả các mục theo tab đang xem
  const handleDeselectVisibleItems = () => {
    const visibleIds = new Set(visibleBonusItems.map((item) => item.id));
    const newSelected = (input.selectedProxyItemIds || []).filter((id) => !visibleIds.has(id));
    onChange({ selectedProxyItemIds: newSelected });
  };

  // Thêm khoản thưởng nhận thay thủ công
  const handleAddCustomBonusItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customItemName.trim();
    const cleanAmount = parseCurrencyInput(customItemAmount);

    if (!cleanName || cleanAmount <= 0) {
      toast.error('Vui lòng nhập tên khoản thưởng và số tiền hợp lệ');
      return;
    }

    const newItem: BonusItem = {
      id: `custom_bonus_${Date.now()}`,
      name: cleanName,
      amount: cleanAmount,
      category: 'hot',
      isProxy: true,
    };

    const updatedBonusItems = [newItem, ...(input.bonusItems || [])];
    const updatedSelectedIds = [newItem.id, ...(input.selectedProxyItemIds || [])];

    onChange({
      bonusItems: updatedBonusItems,
      selectedProxyItemIds: updatedSelectedIds,
    });

    setCustomItemName('');
    setCustomItemAmount('');
    setShowAddCustomBonus(false);
    toast.success(`Đã thêm khoản nhận thay: ${cleanName} (${formatVnd(cleanAmount)})`);
  };

  const hasBothSlips = !!(input.hasDay5Slip && input.hasDay20Slip);

  // Phân loại các khoản thưởng
  const allBonusItems = input.bonusItems || [];
  const hotBonusItems = allBonusItems.filter(
    (item) =>
      item.category === 'hot' ||
      item.name.toLowerCase().includes('nóng') ||
      item.name.toLowerCase().includes('khoán') ||
      item.name.toLowerCase().includes('thi đua') ||
      item.name.toLowerCase().includes('vas') ||
      item.name.toLowerCase().includes('combo') ||
      item.name.toLowerCase().includes('quỹ thưởng')
  );
  const mainBonusItems = allBonusItems.filter(
    (item) => !hotBonusItems.some((hot) => hot.id === item.id)
  );

  const visibleBonusItems =
    bonusFilter === 'hot'
      ? hotBonusItems
      : bonusFilter === 'main'
      ? mainBonusItems
      : allBonusItems;

  const selectedProxyItemsTotal = allBonusItems
    .filter((b) => (input.selectedProxyItemIds || []).includes(b.id))
    .reduce((sum, item) => sum + item.amount, 0);

  const selectedCount = (input.selectedProxyItemIds || []).length;

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-3.5 sm:p-4 shadow-xs transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Nhập Lương & Thưởng
            </h3>
            <p className="text-[11px] text-slate-400">
              Tải ảnh 2 đợt lương & thưởng từ HRM
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          title="Đặt lại dữ liệu"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 bg-slate-100 hover:bg-rose-50 dark:bg-slate-700/60 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Đặt lại</span>
        </button>
      </div>

      <div className="space-y-3">
        {/* BANNER TRẠNG THÁI (KHI ĐÃ TẢI ÍT NHẤT 1 ĐỢT) */}
        {hasBothSlips ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã nạp đủ 2 đợt lương & thưởng</span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              {formatVnd(input.totalIncome)}
            </span>
          </div>
        ) : (input.hasDay5Slip || input.hasDay20Slip) ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{input.hasDay5Slip ? 'Đã có Ngày 5 • Vui lòng tải tiếp Ngày 20' : 'Đã có Ngày 20 • Vui lòng tải tiếp Ngày 5'}</span>
            </div>
          </div>
        ) : null}

        {/* 2 KHU VỰC NHẬP ẢNH: GRID 2 CỘT NẰM TRÊN 1 DÒNG */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {/* CỘT 1: LƯƠNG NGÀY 5 */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              errorDay5
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80'
                : input.hasDay5Slip
                ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800'
                : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/60 hover:border-sky-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    input.hasDay5Slip ? 'bg-sky-500 text-white' : 'bg-sky-100 dark:bg-sky-950/50 text-sky-600'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    1. Lương ngày 5
                  </span>
                </div>

                <a
                  href="https://newinsite.thegioididong.com/hrm/chi-tiet-luong-dmx"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Mở HRM Chi tiết lương (Đợt 1)"
                  className="p-1 rounded-md text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                {input.hasDay5Slip ? (
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lương:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{formatVnd(input.incomeDay5)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">BHXH:</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">{formatVnd(input.insurance)}</strong>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 block truncate">Chi tiết lương & BHXH</span>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="upload-slot-day5"
                className={`w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  uploadingSlot === 'day5'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : input.hasDay5Slip
                    ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                }`}
              >
                {uploadingSlot === 'day5' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>
                  {uploadingSlot === 'day5'
                    ? 'Đang đọc...'
                    : input.hasDay5Slip
                    ? 'Đổi ảnh'
                    : 'Tải ảnh'}
                </span>
              </label>
              <input
                id="upload-slot-day5"
                type="file"
                accept="image/*"
                disabled={uploadingSlot === 'day5'}
                onChange={handleUploadDay5}
                className="sr-only"
              />
            </div>
          </div>

          {/* CỘT 2: THƯỞNG NGÀY 20 */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              errorDay20
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80'
                : input.hasDay20Slip
                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800'
                : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/60 hover:border-indigo-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    input.hasDay20Slip ? 'bg-indigo-600 text-white' : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600'
                  }`}>
                    <Gift className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    2. Thưởng ngày 20
                  </span>
                </div>

                <a
                  href="https://newinsite.thegioididong.com/hrm/xem-chi-tiet-thuong"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Mở HRM Xem chi tiết thưởng (Đợt 2)"
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                {input.hasDay20Slip ? (
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thưởng:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{formatVnd(input.incomeDay20)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thuế:</span>
                      <strong className="font-mono text-rose-600">{formatVnd(input.actualTaxDay20)}</strong>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 block truncate">Thưởng nóng & thuế khấu trừ</span>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="upload-slot-day20"
                className={`w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  uploadingSlot === 'day20'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : input.hasDay20Slip
                    ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                }`}
              >
                {uploadingSlot === 'day20' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>
                  {uploadingSlot === 'day20'
                    ? 'Đang đọc...'
                    : input.hasDay20Slip
                    ? 'Đổi ảnh'
                    : 'Tải ảnh'}
                </span>
              </label>
              <input
                id="upload-slot-day20"
                type="file"
                accept="image/*"
                disabled={uploadingSlot === 'day20'}
                onChange={handleUploadDay20}
                className="sr-only"
              />
            </div>
          </div>
        </div>

        {/* CẢNH BÁO LỖI (NẾU CÓ) */}
        {(errorDay5 || errorDay20) && (
          <div className="space-y-1 px-1">
            {errorDay5 && <p className="text-[11px] text-rose-600 dark:text-rose-400">Đợt 1: {errorDay5}</p>}
            {errorDay20 && <p className="text-[11px] text-rose-600 dark:text-rose-400">Đợt 2: {errorDay20}</p>}
            {/* Lỗi do khoá chung hết hạn mức / bị vô hiệu: người dùng tự cứu được bằng API Key
                riêng (miễn phí), nên đưa lối đi ngay cạnh thông báo lỗi. */}
            {isApiKeyRelatedError(errorDay5 || errorDay20 || '') && onOpenApiKeyConfig && (
              <Button variant="outline" size="sm" onClick={onOpenApiKeyConfig} className="text-[11px] h-7">
                🔑 Dùng API Key riêng của bạn (miễn phí)
              </Button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* KHUNG BÓC TÁCH DANH SÁCH THƯỞNG NÓNG (CHECKBOX NHẬN THAY)                   */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-3.5 rounded-xl border border-rose-300/80 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/40 via-amber-50/20 to-transparent dark:from-rose-950/20 space-y-2.5">
          {/* Header gọn gàng: Tiêu đề + 3 nút thao tác siêu ngắn */}
          <div className="flex items-center justify-between gap-2 border-b border-rose-200/60 dark:border-rose-900/40 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-md inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>Thưởng nóng {input.monthYear || '08/2026'}</span>
              </span>
            </div>

            {/* Quick Action buttons ngắn gọn, không rớt dòng */}
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <button
                type="button"
                onClick={handleSelectAllVisibleItems}
                className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-md hover:bg-rose-50 cursor-pointer whitespace-nowrap"
              >
                ✓ Hết
              </button>
              <button
                type="button"
                onClick={handleDeselectVisibleItems}
                className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:text-rose-600 cursor-pointer whitespace-nowrap"
              >
                ✕ Bỏ
              </button>
              <button
                type="button"
                onClick={() => setShowAddCustomBonus(!showAddCustomBonus)}
                className="px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-50 cursor-pointer whitespace-nowrap"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Form thêm khoản nhận thay thủ công nếu cần */}
          {showAddCustomBonus && (
            <form
              onSubmit={handleAddCustomBonusItem}
              className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2 animate-fadeIn"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                <input
                  type="text"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Tên khoản nhận thay (VD: Khoán bổ sung...)"
                  className="sm:col-span-6 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={customItemAmount}
                  onChange={(e) => setCustomItemAmount(e.target.value)}
                  placeholder="Số tiền VNĐ"
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Thêm mục
                </button>
              </div>
            </form>
          )}

          {/* Tab Filter ngắn gọn: Thưởng nóng vs Thưởng chính */}
          {allBonusItems.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setBonusFilter('hot')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  bonusFilter === 'hot'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50'
                }`}
              >
                🔥 Nóng ({hotBonusItems.length})
              </button>
              {mainBonusItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBonusFilter('main')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    bonusFilter === 'main'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50'
                  }`}
                >
                  💼 Chính ({mainBonusItems.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setBonusFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  bonusFilter === 'all'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Tất cả ({allBonusItems.length})
              </button>
            </div>
          )}

          {/* DANH SÁCH CHECKBOX CÁC KHOẢN THƯỞNG */}
          {visibleBonusItems.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
              {visibleBonusItems.map((item) => {
                const isChecked = (input.selectedProxyItemIds || []).includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleProxyItem(item.id)}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-2xs'
                        : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-rose-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <span className={`text-xs truncate ${isChecked ? 'font-bold text-rose-950 dark:text-rose-100' : 'font-medium'}`}>
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isChecked && (
                        <span className="hidden xs:inline-block px-1 py-0.2 text-[9px] font-bold rounded bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                          Nhận thay
                        </span>
                      )}
                      <span className={`text-xs font-mono font-bold ${isChecked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatVnd(item.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-3 px-3 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-dashed border-rose-200 dark:border-rose-900/40">
              {/* ĐÃ tải ảnh Ngày 20 mà danh sách vẫn trống: câu "hãy tải ảnh Ngày 20" cũ khiến
                  người dùng tưởng app chưa nhận ảnh (chủ dự án báo 2026-09-23). Nói đúng việc
                  cần làm: chụp lại đủ phần danh sách, hoặc thêm tay. */}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {input.hasDay20Slip
                  ? 'Ảnh Ngày 20 chưa gồm phần danh sách chi tiết các khoản (hoặc AI chưa đọc được). Bấm "Đổi ảnh" rồi chụp trọn trang "Xem chi tiết thưởng", hoặc bấm "+ Thêm" để nhập tay.'
                  : 'Chưa có danh sách thưởng nóng. Tải ảnh Ngày 20 ở trên để tự động bóc tách.'}
              </p>
            </div>
          )}

          {/* FOOTER TỰ ĐỘNG TÍNH TỔNG KHOẢN NHẬN THAY: Gọn gàng 1 dòng */}
          <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/50 flex items-center justify-between gap-2 text-xs">
            <div className="text-slate-600 dark:text-slate-400 text-xs">
              Đã chọn: <strong className="text-rose-600 dark:text-rose-400">{selectedCount}</strong> mục
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-500">Tổng nhận thay:</span>
              <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60 shadow-2xs whitespace-nowrap">
                {formatVnd(selectedProxyItemsTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* THÔNG TIN KÊ KHAI BỔ SUNG (ACCORDION GỌN) */}
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>Kê khai thêm & Giảm trừ gia cảnh</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="p-3 pt-1 space-y-2.5 border-t border-slate-200 dark:border-slate-700/60">
              {/* Họ tên */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Họ tên người kê khai
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={input.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="VD: TRƯƠNG HOÀNG PHÚC"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Tổng thu nhập tháng */}
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[11px] font-medium text-slate-500">
                    Tổng thu nhập (Đợt 1 + 2)
                  </label>
                  <span className="text-[10px] text-slate-400">VNĐ</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={input.totalIncome === 0 ? '' : formatNumber(input.totalIncome)}
                  onChange={(e) => handleCurrencyChange('totalIncome', e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Số người phụ thuộc */}
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[11px] font-medium text-slate-500">
                    Người phụ thuộc ({formatNumber(dependentUnit)} đ/người)
                  </label>
                  <span className="text-[10px] text-sky-600 font-semibold">
                    Giảm: {formatNumber(input.dependents * dependentUnit)} đ
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={input.dependents === 0 ? '' : input.dependents}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10));
                    onChange({ dependents: isNaN(val) ? 0 : val });
                  }}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Giảm trừ bảo hiểm */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Bảo hiểm bắt buộc (BHXH 10.5%)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={input.insurance === 0 ? '' : formatNumber(input.insurance)}
                  onChange={(e) => handleCurrencyChange('insurance', e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* NÚT LƯU KẾT QUẢ VÀO LỊCH SỬ */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onSave}
            className={`w-full py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-[0.99]'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Đã lưu kết quả' : 'Lưu kết quả tính thuế'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
