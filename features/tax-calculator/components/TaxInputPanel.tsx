import React, { useState, useRef } from 'react';
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
  ExternalLink,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TaxCalculationInput } from '../types/tax.types';
import {
  formatNumber,
  parseCurrencyInput,
  DEPENDENT_DEDUCTION_2026,
} from '../services/taxCalculatorService';
import { extractSalarySlipInfo } from '../services/salarySlipOcrService';

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
  const [isUploading, setIsUploading] = useState(false);
  const [showProxyTooltip, setShowProxyTooltip] = useState(false);
  const proxyInputRef = useRef<HTMLInputElement>(null);

  const dependentUnit = DEPENDENT_DEDUCTION_2026;

  const handleCurrencyChange = (field: keyof TaxCalculationInput, rawValue: string) => {
    const numValue = parseCurrencyInput(rawValue);
    onChange({ [field]: numValue });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Đang phân tích phiếu lương bằng AI...');

    try {
      const data = await extractSalarySlipInfo(file);

      // Cập nhật form state với dữ liệu AI trích xuất
      onChange({
        name: data.fullName || input.name,
        totalIncome: data.totalIncome || input.totalIncome,
        dependents: data.dependents ?? input.dependents,
        insurance: data.totalInsurance || input.insurance,
        unionFee: data.unionFee || input.unionFee,
        bankAccount: data.bankAccount || input.bankAccount,
        bankCode: data.matchedBankCode || input.bankCode,
      });

      toast.success(
        data.fullName
          ? `Đã trích xuất thông tin của: ${data.fullName}`
          : 'Đã trích xuất thông tin phiếu lương thành công!',
        { id: toastId }
      );

      // Nhắc nhở người dùng nhập số tiền nhận thay
      setShowProxyTooltip(true);
      setTimeout(() => {
        proxyInputRef.current?.focus();
      }, 300);
      setTimeout(() => setShowProxyTooltip(false), 5000);
    } catch (err: unknown) {
      console.error('Lỗi khi phân tích phiếu lương:', err);
      const msg = err instanceof Error ? err.message : 'Không thể xử lý hình ảnh.';
      toast.error(`${msg} Vui lòng thử lại hoặc nhập tay.`, { id: toastId, duration: 5000 });
    } finally {
      setIsUploading(false);
      // Reset input value để cho phép chọn lại cùng 1 file
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-5 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
              Thông Tin Kê Khai Thuế
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tải ảnh phiếu lương hoặc nhập thủ công
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

      <div className="space-y-3.5">
        {/* Khung Hướng Dẫn Chụp Ảnh Phiếu Lương */}
        <div className="p-3 sm:p-3.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2">
          <p className="text-slate-600 dark:text-slate-300">
            Tải ảnh chụp phiếu lương để hệ thống tự động trích xuất thông tin chính.
          </p>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Hướng dẫn chụp ảnh: </span>
            <span>
              Chụp toàn bộ trang, đảm bảo thấy được dòng <strong className="text-rose-600 dark:text-rose-400">"Thuế TNCN phải nộp"</strong>.
            </span>
          </div>

          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 pl-0.5">
            <li>
              Click vào{' '}
              <a
                href="https://newinsite.thegioididong.com/hrm/chi-tiet-luong"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>"Chi tiết thưởng"</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              tại đây.
            </li>
            <li>Bấm vào dòng <strong className="text-sky-600 dark:text-sky-400">"Tổng tiền giảm trừ"</strong> để mở rộng.</li>
            <li>Chụp toàn màn hình (đảm bảo thấy được STK).</li>
            <li>Chọn <strong className="text-sky-600 dark:text-sky-400">"Tải ảnh phiếu lương (AI)"</strong>.</li>
            <li>Nhập <strong className="text-rose-600 dark:text-rose-400">"Số tiền nhận thay"</strong>.</li>
          </ol>
        </div>

        {/* Nút Upload Ảnh Phiếu Lương (AI) */}
        <div>
          <label
            htmlFor="salary-slip-image-upload"
            className={`relative w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              isUploading
                ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 cursor-not-allowed text-slate-500'
                : 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-300/80 dark:border-sky-800/80 hover:bg-sky-50 hover:border-sky-500 text-sky-700 dark:text-sky-300'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400" />
            ) : (
              <UploadCloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            )}
            <span className="text-xs sm:text-sm font-semibold">
              {isUploading ? 'Đang xử lý phân tích phiếu lương...' : 'Tải ảnh phiếu lương (AI)'}
            </span>
          </label>
          <input
            id="salary-slip-image-upload"
            type="file"
            accept="image/*"
            disabled={isUploading}
            onChange={handleImageUpload}
            className="sr-only"
          />
        </div>

        {/* Họ tên người kê khai */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Họ và tên người kê khai / nhận thay
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={input.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="VD: Nguyễn Văn A"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Tổng thu nhập chịu thuế */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Tổng thu nhập trong kỳ (gồm cả nhận thay)
            </label>
            <span className="text-[11px] text-slate-500">VNĐ</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="text-xs font-semibold">₫</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={input.totalIncome === 0 ? '' : formatNumber(input.totalIncome)}
              onChange={(e) => handleCurrencyChange('totalIncome', e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Tiền nhận thay (Quan trọng) */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <span>Khoản nhận thay (nếu có nhận giùm)</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </label>
            <span className="text-[11px] text-slate-500">VNĐ</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500">
              <span className="text-xs font-bold">₫</span>
            </div>
            <input
              ref={proxyInputRef}
              type="text"
              inputMode="numeric"
              value={input.proxyAmount === 0 ? '' : formatNumber(input.proxyAmount)}
              onChange={(e) => handleCurrencyChange('proxyAmount', e.target.value)}
              placeholder="0"
              className={`w-full pl-8 pr-3 py-2 text-sm font-bold text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${
                showProxyTooltip
                  ? 'border-amber-500 ring-2 ring-amber-500/30 animate-pulse'
                  : 'border-amber-300 dark:border-amber-700/60 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
              }`}
            />
          </div>
          {showProxyTooltip && (
            <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Hãy nhập số tiền nhận thay tại đây để tính thuế chênh lệch</span>
            </div>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Nhập số tiền nhận giùm đồng nghiệp để tách phần thuế phát sinh
          </p>
        </div>

        {/* Số người phụ thuộc */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Số người phụ thuộc ({formatNumber(dependentUnit)} đ / người)
            </label>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
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
            placeholder="0 (nếu không có)"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 dark:text-slate-100 outline-none transition-all"
          />
        </div>

        {/* Accordion: Giảm trừ bảo hiểm & Công đoàn */}
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Bảo hiểm & Các khoản giảm trừ khác</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="p-3.5 pt-1 space-y-3 border-t border-slate-200 dark:border-slate-700/60">
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

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Đoàn phí công đoàn / Khoản đóng góp khác
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={input.unionFee === 0 ? '' : formatNumber(input.unionFee)}
                  onChange={(e) => handleCurrencyChange('unionFee', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Nút lưu lịch sử */}
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
