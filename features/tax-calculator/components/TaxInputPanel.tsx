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

interface TaxInputPanelProps {
  input: TaxCalculationInput;
  onChange: (updates: Partial<TaxCalculationInput>) => void;
  onReset: () => void;
  onSave: () => void;
  isSaved?: boolean;
}

export const TaxInputPanel: React.FC<TaxInputPanelProps> = ({
  input,
  onChange,
  onReset,
  onSave,
  isSaved = false,
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
      if (data.matchedBankCode && !input.bankCode) {
        updates.bankCode = data.matchedBankCode;
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
      if (data.matchedBankCode && !input.bankCode) {
        updates.bankCode = data.matchedBankCode;
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
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-5 shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
              Dữ Liệu Lương & Thưởng 2 Đợt
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tải ảnh bảng lương hoặc chọn khoản nhận thay
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          title="Xoá và đặt lại dữ liệu"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 bg-slate-100 hover:bg-rose-50 dark:bg-slate-700/60 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* BANNER TIẾN ĐỘ & HƯỚNG DẪN */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
            hasBothSlips
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
              : input.hasDay5Slip || input.hasDay20Slip
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
          }`}
        >
          {hasBothSlips ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : input.hasDay5Slip || input.hasDay20Slip ? (
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          )}

          <div className="flex-1">
            <div className="font-semibold mb-0.5 flex items-center justify-between">
              <span>
                {hasBothSlips
                  ? '✅ Đã tải đủ dữ liệu 2 đợt lương & thưởng'
                  : input.hasDay5Slip
                  ? '⏳ Đã có Bảng lương ngày 5. Vui lòng tải tiếp Bảng thưởng ngày 20'
                  : input.hasDay20Slip
                  ? '⏳ Đã có Bảng thưởng ngày 20. Vui lòng tải tiếp Bảng lương ngày 5'
                  : '📸 Hướng dẫn tải 2 ảnh bảng lương để tính thuế'}
              </span>

              {allBonusItems.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
                >
                  Tải dữ liệu mẫu MWG
                </button>
              )}
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {hasBothSlips
                ? 'Hệ thống đã tự động gộp thu nhập 2 đợt. Bạn chỉ cần tích chọn khoản nhận thay ở danh sách bên dưới.'
                : 'Theo quy định MWG, thu nhập tính thuế được tổng hợp cả 2 đợt (Ngày 5 và Ngày 20). Đủ 2 bảng sẽ tính chính xác 100% số thuế giữ lại.'}
            </p>
          </div>
        </div>

        {/* 2 Ô UPLOAD ẢNH: Ô 1 (NGÀY 5) & Ô 2 (NGÀY 20) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Ô 1: BẢNG LƯƠNG NGÀY 5 */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              errorDay5
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80'
                : input.hasDay5Slip
                ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800'
                : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/60 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>1. Bảng lương ngày 5</span>
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  errorDay5
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : input.hasDay5Slip
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {uploadingSlot === 'day5'
                  ? 'Đang đọc...'
                  : errorDay5
                  ? 'Sai cú pháp'
                  : input.hasDay5Slip
                  ? 'Đã tải'
                  : 'Chờ tải ảnh'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
              Trang <strong>"Chi tiết lương"</strong> (Chấm công, Lương BHXH, Giảm trừ 15.5tr)
            </p>

            {errorDay5 && (
              <div className="mb-2.5 p-2 bg-rose-100/70 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 rounded-lg flex items-start gap-1.5 text-[11px] text-rose-800 dark:text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorDay5}</span>
              </div>
            )}

            {input.hasDay5Slip && !errorDay5 ? (
              <div className="space-y-1 mb-2.5 text-[11px] bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-sky-200/60 dark:border-sky-800/40">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lương đợt 1:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatVnd(input.incomeDay5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">BHXH bắt buộc:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatVnd(input.insurance)}
                  </span>
                </div>
              </div>
            ) : null}

            <label
              htmlFor="upload-slot-day5"
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                uploadingSlot === 'day5'
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 cursor-not-allowed text-slate-400'
                  : 'bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
              }`}
            >
              {uploadingSlot === 'day5' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              )}
              <span>
                {uploadingSlot === 'day5'
                  ? 'Đang phân tích...'
                  : input.hasDay5Slip
                  ? 'Tải lại ảnh Ngày 5'
                  : 'Tải Bảng lương ngày 5'}
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

          {/* Ô 2: BẢNG THƯỞNG NGÀY 20 */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              errorDay20
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80'
                : input.hasDay20Slip
                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800'
                : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/60 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Gift className="w-3.5 h-3.5 text-indigo-500" />
                <span>2. Bảng thưởng ngày 20</span>
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  errorDay20
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : input.hasDay20Slip
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {uploadingSlot === 'day20'
                  ? 'Đang đọc...'
                  : errorDay20
                  ? 'Sai cú pháp'
                  : input.hasDay20Slip
                  ? 'Đã tải'
                  : 'Chờ tải ảnh'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
              Trang <strong>"Xem chi tiết thưởng"</strong> (Thưởng nóng, Trừ thuế TNCN)
            </p>

            {errorDay20 && (
              <div className="mb-2.5 p-2 bg-rose-100/70 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 rounded-lg flex items-start gap-1.5 text-[11px] text-rose-800 dark:text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorDay20}</span>
              </div>
            )}

            {input.hasDay20Slip && !errorDay20 ? (
              <div className="space-y-1 mb-2.5 text-[11px] bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-indigo-200/60 dark:border-indigo-800/40">
                <div className="flex justify-between">
                  <span className="text-slate-500">Thưởng nóng:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatVnd(input.bonusHot || input.incomeDay20)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trừ thuế TNCN:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {formatVnd(input.actualTaxDay20)}
                  </span>
                </div>
              </div>
            ) : null}

            <label
              htmlFor="upload-slot-day20"
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                uploadingSlot === 'day20'
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 cursor-not-allowed text-slate-400'
                  : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {uploadingSlot === 'day20' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>
                {uploadingSlot === 'day20'
                  ? 'Đang phân tích...'
                  : input.hasDay20Slip
                  ? 'Tải lại ảnh Ngày 20'
                  : 'Tải Bảng thưởng ngày 20'}
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

        {/* ========================================================================= */}
        {/* KHUNG BÓC TÁCH DANH SÁCH THƯỞNG NÓNG (CHECKBOX CHỌN KHOẢN NHẬN THAY)       */}
        {/* ========================================================================= */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-rose-300/80 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/40 via-amber-50/30 to-transparent dark:from-rose-950/20 dark:via-amber-950/10 space-y-3">
          {/* Header khớp với dòng "-- Thưởng nóng 08/2026" trên HRM */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 dark:border-rose-900/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-extrabold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-800 rounded-md inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>-- Thưởng nóng {input.monthYear || '08/2026'}</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                (Tích chọn khoản nhận thay)
              </span>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <button
                type="button"
                onClick={handleSelectAllVisibleItems}
                className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <CheckSquare2 className="w-3 h-3" />
                <span>Chọn tất cả</span>
              </button>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <button
                type="button"
                onClick={handleDeselectVisibleItems}
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Square className="w-3 h-3" />
                <span>Bỏ chọn (Chọn lại)</span>
              </button>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <button
                type="button"
                onClick={() => setShowAddCustomBonus(!showAddCustomBonus)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm khoản khác</span>
              </button>
            </div>
          </div>

          {/* Form thêm khoản thưởng thủ công nếu cần */}
          {showAddCustomBonus && (
            <form
              onSubmit={handleAddCustomBonusItem}
              className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2 animate-fadeIn"
            >
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-rose-500" />
                <span>Thêm một khoản nhận thay mới</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Tên khoản thưởng (VD: Khoán công việc bổ sung...)"
                  className="sm:col-span-7 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={customItemAmount}
                  onChange={(e) => setCustomItemAmount(e.target.value)}
                  placeholder="Số tiền VNĐ (VD: 2.000.000)"
                  className="sm:col-span-3 px-3 py-1.5 text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Thêm & Chọn
                </button>
              </div>
            </form>
          )}

          {/* Tab Filter: Thưởng nóng vs Thưởng chính */}
          {allBonusItems.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs border-b border-rose-100 dark:border-rose-900/30 pb-2">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mr-1">
                <ListFilter className="w-3 h-3" />
                <span>Phân loại:</span>
              </span>
              <button
                type="button"
                onClick={() => setBonusFilter('hot')}
                className={`px-2.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                  bonusFilter === 'hot'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50'
                }`}
              >
                🔥 Thưởng nóng ({hotBonusItems.length})
              </button>
              {mainBonusItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBonusFilter('main')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                    bonusFilter === 'main'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50'
                  }`}
                >
                  💼 Thưởng chính ({mainBonusItems.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setBonusFilter('all')}
                className={`px-2.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                  bonusFilter === 'all'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Tất cả ({allBonusItems.length})
              </button>
            </div>
          )}

          {/* DANH SÁCH CHECKBOX CÁC KHOẢN THƯỞNG */}
          {visibleBonusItems.length > 0 ? (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {visibleBonusItems.map((item) => {
                const isChecked = (input.selectedProxyItemIds || []).includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleProxyItem(item.id)}
                    className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-rose-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="truncate">
                        <span className={`text-xs block truncate ${isChecked ? 'font-bold text-rose-950 dark:text-rose-100' : 'font-medium'}`}>
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isChecked && (
                        <span className="hidden xs:inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                          Nhận thay
                        </span>
                      )}
                      <span className={`text-xs font-mono font-bold ${isChecked ? 'text-rose-700 dark:text-rose-300 text-sm' : 'text-slate-800 dark:text-slate-200'}`}>
                        {formatVnd(item.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 px-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-dashed border-rose-200 dark:border-rose-900/40 space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Chưa có danh sách Thưởng nóng. Bạn có thể tải ảnh Bảng thưởng ngày 20 ở trên hoặc:
              </p>
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg hover:bg-rose-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tải dữ liệu Thưởng nóng mẫu từ HRM</span>
              </button>
            </div>
          )}

          {/* FOOTER TỰ ĐỘNG TÍNH TỔNG KHOẢN NHẬN THAY */}
          <div className="pt-2.5 border-t border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <span>Đã tích chọn:</span>
              <strong className="text-rose-600 dark:text-rose-400">{selectedCount}</strong>
              <span>khoản nhận thay</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">(Tự tính tổng tức thì)</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-slate-500 font-medium">Tổng tiền nhận thay:</span>
              <span className="font-mono font-extrabold text-base text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800/60 shadow-xs">
                {formatVnd(selectedProxyItemsTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* THÔNG TIN CHI TIẾT KÊ KHAI (CÓ THỂ XEM / CHỈNH SỬA BỔ SUNG) */}
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              <span>Xem chi tiết thông tin cá nhân & Các mức giảm trừ</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="p-3.5 pt-1 space-y-3 border-t border-slate-200 dark:border-slate-700/60">
              {/* Họ tên */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Họ và tên người nhận thay / kê khai
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
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Tổng thu nhập tháng */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Tổng thu nhập trong tháng (Đợt 1 + Đợt 2)
                  </label>
                  <span className="text-[10px] text-slate-400">VNĐ</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={input.totalIncome === 0 ? '' : formatNumber(input.totalIncome)}
                  onChange={(e) => handleCurrencyChange('totalIncome', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Số người phụ thuộc */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Số người phụ thuộc ({formatNumber(dependentUnit)} đ / người)
                  </label>
                  <span className="text-[10px] text-sky-600 font-semibold">
                    Giảm trừ: {formatNumber(input.dependents * dependentUnit)} đ
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
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Giảm trừ bảo hiểm */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Bảo hiểm bắt buộc (BHXH, BHYT, BHTN 10.5%)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={input.insurance === 0 ? '' : formatNumber(input.insurance)}
                  onChange={(e) => handleCurrencyChange('insurance', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* NÚT LƯU KẾT QUẢ VÀO LỊCH SỬ */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSave}
            className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-[0.99]'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'Đã lưu vào lịch sử (Local & Cloud)' : 'Lưu kết quả tính thuế này'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
