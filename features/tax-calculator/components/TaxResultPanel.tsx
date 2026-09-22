import React, { useRef, useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  Layers,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportElementAsImage } from '../../../services/uiService';
import { TaxCalculationResult } from '../types/tax.types';
import { formatVnd } from '../services/taxCalculatorService';

interface TaxResultPanelProps {
  result: TaxCalculationResult;
  proxyAmount: number;
  totalIncome: number;
  name?: string;
  onOpenBracketModal: () => void;
}

export const TaxResultPanel: React.FC<TaxResultPanelProps> = ({
  result,
  proxyAmount,
  totalIncome,
  name = '',
  onOpenBracketModal,
}) => {
  const [hideSensitive, setHideSensitive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const maskValue = (formattedStr: string) => {
    if (!hideSensitive) return formattedStr;
    return '•••••••• đ';
  };

  const handleExportImage = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Đang khởi tạo ảnh bảng tính thuế...');

    try {
      const safeName = (name || 'Tinh_Thue').trim().replace(/\s+/g, '_');
      const filename = `Bang_Tinh_Thue_${safeName}_${new Date().toISOString().slice(0, 10)}.png`;

      const blob = await exportElementAsImage(captureRef.current, filename, {
        elementsToHide: ['[data-html2canvas-ignore="true"]', '.hide-on-export'],
        captureAsDisplayed: true,
      });

      if (blob) {
        toast.success('Đã xuất ảnh bảng tính thuế thành công!', { id: toastId });
      } else {
        toast.error('Không thể tạo ảnh báo cáo. Vui lòng thử lại.', { id: toastId });
      }
    } catch (err) {
      console.error('Lỗi khi xuất ảnh bảng tính thuế:', err);
      toast.error('Có lỗi xảy ra khi tạo ảnh báo cáo. Vui lòng thử lại.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const {
    taxLawVersion,
    taxOnProxyAmount,
    totalTaxWithProxy,
    totalTaxWithoutProxy,
    assessableIncomeWithProxy,
    assessableIncomeWithoutProxy,
    totalDeductions,
    savingsVsLegacy,
  } = result;

  const hasProxy = proxyAmount > 0;
  const netRefundToFriend = Math.max(0, proxyAmount - taxOnProxyAmount);
  const effectiveRate = proxyAmount > 0 ? (taxOnProxyAmount / proxyAmount) * 100 : 0;
  const incomeWithoutProxy = Math.max(0, totalIncome - proxyAmount);

  return (
    <div className="space-y-4">
      {/* Container chính dùng để xuất ảnh báo cáo */}
      <div
        ref={captureRef}
        className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all duration-200"
      >
        {/* Header kết quả */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                  Kết Quả Tính Thuế
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                  Biểu thuế 5 bậc
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {name ? `Kê khai: ${name}` : 'Bảng tính chi tiết theo Biểu thuế luỹ tiến từng phần'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5" data-html2canvas-ignore="true">
            <button
              type="button"
              onClick={() => setHideSensitive(!hideSensitive)}
              title={hideSensitive ? 'Hiện số liệu đầy đủ' : 'Ẩn số tiền nhạy cảm khi chia sẻ'}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              {hideSensitive ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{hideSensitive ? 'Đang ẩn' : 'Bảo mật'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExporting}
              title="Xuất bảng tính thành file ảnh PNG"
              className="px-2.5 py-1.5 text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? 'Đang xuất...' : 'Xuất ảnh'}</span>
            </button>
          </div>
        </div>

        {/* HERO CARD: Kết quả chính */}
        {hasProxy ? (
          <div className="bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-transparent dark:from-emerald-950/30 dark:via-sky-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 sm:p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md mb-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Tiền thuế nhận thay cần giữ lại
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {maskValue(formatVnd(taxOnProxyAmount))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tỷ lệ thuế phát sinh trên phần nhận thay:{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {effectiveRate.toFixed(1)}%
                  </span>
                </p>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60 dark:border-emerald-800/30">
                <span className="text-xs text-slate-500 dark:text-slate-400">Thực chuyển lại cho đồng nghiệp:</span>
                <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  {maskValue(formatVnd(netRefundToFriend))}
                </div>
                <span className="text-[11px] text-slate-500">
                  (Khoản nhận thay - Thuế phát sinh)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent dark:from-sky-950/30 dark:via-indigo-950/20 border border-sky-200 dark:border-sky-800/40 rounded-xl p-4 sm:p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 rounded-md mb-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Thuế TNCN phải nộp trong kỳ
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                  {maskValue(formatVnd(totalTaxWithProxy))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Thu nhập tính thuế:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {maskValue(formatVnd(assessableIncomeWithProxy))}
                  </span>
                </p>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-sky-200/60 dark:border-sky-800/30">
                <span className="text-xs text-slate-500 dark:text-slate-400">Tổng giảm trừ gia cảnh:</span>
                <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  {maskValue(formatVnd(totalDeductions))}
                </div>
                <span className="text-[11px] text-slate-500">
                  (Bản thân + Người phụ thuộc + BH)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BẢNG SO SÁNH ĐỐI CHIẾU */}
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden mb-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              {hasProxy ? 'So sánh đối chiếu có / không nhận thay' : 'Chi tiết thu nhập & các khoản khấu trừ'}
            </span>
            <button
              type="button"
              onClick={onOpenBracketModal}
              data-html2canvas-ignore="true"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem biểu thuế</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {/* Thu nhập chịu thuế */}
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} p-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40`}>
              <div className="text-slate-500 dark:text-slate-400 font-medium">1. Tổng thu nhập (Đợt 1 + 2)</div>
              <div className="text-right text-slate-800 dark:text-slate-200 font-medium">
                {maskValue(formatVnd(totalIncome))}
              </div>
              {hasProxy && (
                <div className="text-right text-slate-500 dark:text-slate-400">
                  {maskValue(formatVnd(incomeWithoutProxy))}
                </div>
              )}
            </div>

            {/* Chi tiết 2 đợt nếu có dữ liệu */}
            {(result.incomeDay5 > 0 || result.incomeDay20 > 0) && (
              <div className="bg-slate-50/40 dark:bg-slate-900/20 px-2.5 py-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>• Đợt 1 (Ngày 5 - Chi tiết lương):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {maskValue(formatVnd(result.incomeDay5))} (Dư giảm trừ: {maskValue(formatVnd(result.remainingDeductionsDay1))})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>• Đợt 2 (Ngày 20 - Xem chi tiết thưởng):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {maskValue(formatVnd(result.incomeDay20))}
                  </span>
                </div>
              </div>
            )}

            {/* Giảm trừ gia cảnh & BH */}
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} p-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40`}>
              <div className="text-slate-500 dark:text-slate-400">2. Tổng giảm trừ (Bản thân + BH)</div>
              <div className="text-right text-slate-700 dark:text-slate-300">
                {maskValue(formatVnd(totalDeductions))}
              </div>
              {hasProxy && (
                <div className="text-right text-slate-700 dark:text-slate-300">
                  {maskValue(formatVnd(totalDeductions))}
                </div>
              )}
            </div>

            {/* Thu nhập tính thuế */}
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} p-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-medium`}>
              <div className="text-slate-600 dark:text-slate-300">3. Thu nhập tính thuế Đợt 2</div>
              <div className="text-right text-sky-600 dark:text-sky-400">
                {maskValue(formatVnd(assessableIncomeWithProxy))}
              </div>
              {hasProxy && (
                <div className="text-right text-slate-600 dark:text-slate-400">
                  {maskValue(formatVnd(assessableIncomeWithoutProxy))}
                </div>
              )}
            </div>

            {/* Tiền thuế TNCN */}
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} p-2.5 bg-slate-50/80 dark:bg-slate-900/30 font-semibold`}>
              <div className="text-slate-700 dark:text-slate-200">4. Thuế TNCN Đợt 2 (Lũy tiến)</div>
              <div className="text-right text-rose-600 dark:text-rose-400">
                {maskValue(formatVnd(totalTaxWithProxy))}
              </div>
              {hasProxy && (
                <div className="text-right text-slate-600 dark:text-slate-400">
                  {maskValue(formatVnd(totalTaxWithoutProxy))}
                </div>
              )}
            </div>

            {/* Chênh lệch thuế (nếu có nhận thay) */}
            {hasProxy && (
              <div className="grid grid-cols-3 p-2.5 bg-emerald-50/70 dark:bg-emerald-950/20 font-bold border-t border-emerald-200 dark:border-emerald-800/30">
                <div className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <span>Chênh lệch thuế do nhận thay</span>
                </div>
                <div className="col-span-2 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                  + {maskValue(formatVnd(taxOnProxyAmount))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer ghi chú trong ảnh export */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <span>Công cụ Tính Thuế • Dashboard Report BI</span>
          <span className="mt-1 sm:mt-0 font-mono">
            Luật Thuế TNCN số 109/2025/QH15 (Biểu thuế luỹ tiến 5 bậc)
          </span>
        </div>
      </div>
    </div>
  );
};
