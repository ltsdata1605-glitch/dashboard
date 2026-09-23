import React, { useEffect, useRef, useState } from 'react';
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
  /** Mã VietQR để đồng nghiệp/thủ quỹ hoàn lại tiền thuế — được chèn vào ảnh xuất ra */
  qrUrl?: string;
  qrBankLabel?: string;
  qrBankAccount?: string;
  onOpenBracketModal: () => void;
}

export const TaxResultPanel: React.FC<TaxResultPanelProps> = ({
  result,
  proxyAmount,
  totalIncome,
  name = '',
  qrUrl = '',
  qrBankLabel = '',
  qrBankAccount = '',
  onOpenBracketModal,
}) => {
  const [hideSensitive, setHideSensitive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Bật trong lúc chụp ảnh: ảnh gửi cho đồng nghiệp không được lộ thu nhập của người kê khai
  const [maskIncomeForExport, setMaskIncomeForExport] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  // Ảnh QR phải ở dạng data URL thì html-to-image mới nhúng được (ảnh từ máy chủ ngoài làm
  // bước chụp treo vì thư viện phải tự tải lại ảnh).
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!qrUrl) {
      setQrDataUrl('');
      return;
    }
    (async () => {
      try {
        const res = await fetch(qrUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (e) {
        // Không tải được QR thì ảnh xuất ra bỏ qua khối QR, vẫn xuất bình thường
        console.warn('Không tải được mã QR để nhúng vào ảnh:', e);
        if (!cancelled) setQrDataUrl('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qrUrl]);

  const MASK_TEXT = '•••••••• đ';

  const maskValue = (formattedStr: string) => {
    if (!hideSensitive) return formattedStr;
    return MASK_TEXT;
  };

  /** Các con số thu nhập: luôn bị che trong ảnh xuất ra (ngoài ảnh thì theo nút "Bảo mật") */
  const maskIncome = (formattedStr: string) => {
    if (maskIncomeForExport) return MASK_TEXT;
    return maskValue(formattedStr);
  };

  const handleExportImage = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    setMaskIncomeForExport(true);
    const toastId = toast.loading('Đang khởi tạo ảnh bảng tính thuế...');

    try {
      // Chờ React vẽ lại với số liệu thu nhập đã che rồi mới chụp
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

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
      setMaskIncomeForExport(false);
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
    <div className="space-y-3">
      {/* Container chính dùng để xuất ảnh báo cáo */}
      <div
        ref={captureRef}
        data-testid="tax-result-panel"
        className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-3.5 sm:p-4 shadow-xs relative overflow-hidden transition-all duration-200"
      >
        {/* Header kết quả */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Kết Quả Tính Thuế
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                  Biểu 5 bậc
                </span>
              </div>
              <p className="text-[11px] truncate">
                {name ? (
                  <>
                    <span className="text-slate-400">Kê khai: </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{name}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Theo luật thuế TNCN 2026</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5" data-html2canvas-ignore="true">
            <button
              type="button"
              onClick={() => setHideSensitive(!hideSensitive)}
              title={hideSensitive ? 'Hiện số liệu' : 'Ẩn số tiền'}
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
              className="px-2 py-1.5 text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? 'Đang lưu...' : 'Xuất ảnh'}</span>
            </button>
          </div>
        </div>

        {/* HERO CARD: Kết quả chính gọn gàng */}
        {hasProxy ? (
          <div className="bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-transparent dark:from-emerald-950/30 dark:via-sky-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3.5 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-100/90 dark:bg-emerald-900/50 px-1.5 py-0.2 rounded mb-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Thuế nhận thay giữ lại
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {maskValue(formatVnd(taxOnProxyAmount))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tỷ lệ phát sinh:{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {effectiveRate.toFixed(1)}%
                  </span>
                </p>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60 dark:border-emerald-800/30">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Cần chuyển lại cho thủ quỹ:</span>
                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                  {maskValue(formatVnd(netRefundToFriend))}
                </div>
                <span className="text-[10px] text-rose-400 dark:text-rose-400/80">
                  (Đã khấu trừ thuế phát sinh)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent dark:from-sky-950/30 dark:via-indigo-950/20 border border-sky-200 dark:border-sky-800/40 rounded-xl p-3.5 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider bg-sky-100/90 dark:bg-sky-900/50 px-1.5 py-0.2 rounded mb-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Thuế TNCN trong kỳ
                </span>
                <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                  {maskValue(formatVnd(totalTaxWithProxy))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Thu nhập tính thuế:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {maskIncome(formatVnd(assessableIncomeWithProxy))}
                  </span>
                </p>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-sky-200/60 dark:border-sky-800/30">
                <span className="text-[11px] text-slate-500">Tổng giảm trừ:</span>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {maskValue(formatVnd(totalDeductions))}
                </div>
                <span className="text-[10px] text-slate-400">
                  (Bản thân + Người phụ thuộc + BH)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BẢNG SO SÁNH ĐỐI CHIẾU */}
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden mb-3">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              {hasProxy ? 'Đối chiếu có / không nhận thay' : 'Chi tiết thu nhập & khấu trừ'}
            </span>
            <button
              type="button"
              onClick={onOpenBracketModal}
              data-html2canvas-ignore="true"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Biểu thuế</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {/* Thu nhập chịu thuế */}
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} px-3 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40`}>
              <div className="text-slate-500 dark:text-slate-400 font-medium">1. Tổng thu nhập (Đợt 1 + 2)</div>
              <div className="text-right text-slate-800 dark:text-slate-200 font-medium">
                {maskIncome(formatVnd(totalIncome))}
              </div>
              {hasProxy && (
                <div className="text-right text-slate-500 dark:text-slate-400">
                  {maskIncome(formatVnd(incomeWithoutProxy))}
                </div>
              )}
            </div>

            {/* Chi tiết 2 đợt nếu có dữ liệu */}
            {(result.incomeDay5 > 0 || result.incomeDay20 > 0) && (
              <div className="bg-slate-50/40 dark:bg-slate-900/20 px-3 py-1.5 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>• Đợt 1 (Ngày 5 - Lương):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {maskIncome(formatVnd(result.incomeDay5))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>• Đợt 2 (Ngày 20 - Thưởng):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {maskIncome(formatVnd(result.incomeDay20))}
                  </span>
                </div>
              </div>
            )}

            {/* Giảm trừ gia cảnh & BH */}
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} px-3 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40`}>
              <div className="text-slate-500 dark:text-slate-400">2. Tổng giảm trừ</div>
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
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} px-3 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-medium`}>
              <div className="text-slate-600 dark:text-slate-300">3. Thu nhập tính thuế Đợt 2</div>
              <div className="text-right text-sky-600 dark:text-sky-400">
                {maskIncome(formatVnd(assessableIncomeWithProxy))}
              </div>
              {hasProxy && (
                <div className="text-right text-slate-600 dark:text-slate-400">
                  {maskIncome(formatVnd(assessableIncomeWithoutProxy))}
                </div>
              )}
            </div>

            {/* Tiền thuế TNCN */}
            <div className={`grid ${hasProxy ? 'grid-cols-3' : 'grid-cols-2'} px-3 py-2 bg-slate-50/80 dark:bg-slate-900/30 font-semibold`}>
              <div className="text-slate-700 dark:text-slate-200">4. Thuế TNCN Đợt 2</div>
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
              <div className="grid grid-cols-3 px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/20 font-bold border-t border-emerald-200 dark:border-emerald-800/30">
                <div className="text-emerald-800 dark:text-emerald-300">
                  Chênh lệch thuế nhận thay
                </div>
                <div className="col-span-2 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                  + {maskValue(formatVnd(taxOnProxyAmount))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mã QR trong ảnh xuất: gửi ảnh cho thủ quỹ là quét được để hoàn lại tiền thuế */}
        {maskIncomeForExport && qrDataUrl && (
          <div className="mb-2 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center gap-3">
            <img
              src={qrDataUrl}
              alt="Mã VietQR hoàn lại tiền thuế nhận thay"
              className="w-24 h-24 object-contain bg-white rounded-lg border border-emerald-200 p-1 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Quét mã để hoàn lại tiền thuế nhận thay
              </div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                {formatVnd(taxOnProxyAmount)}
              </div>
              {qrBankLabel && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{qrBankLabel}</div>
              )}
              {qrBankAccount && (
                <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                  {qrBankAccount}
                </div>
              )}
              {name && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{name}</div>}
            </div>
          </div>
        )}

        {/* Ghi chú chỉ xuất hiện trong ảnh: giải thích các dấu chấm thay cho số thu nhập */}
        {maskIncomeForExport && (
          <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400">
            Thông tin thu nhập đã được ẩn khi xuất ảnh.
          </div>
        )}

        {/* Footer ghi chú trong ảnh export */}
        <div className="pt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <span className="truncate min-w-0">{name ? `Tính Thuế TNCN — ${name}` : 'Tính Thuế TNCN'}</span>
          {/* pr-1.5: chừa chỗ cho sai lệch bề rộng phông lúc chụp ảnh (chữ cuối từng bị cắt mép phải) */}
          <span className="font-mono shrink-0 pr-1.5">Luật 109/2025/QH15</span>
        </div>
      </div>
    </div>
  );
};
