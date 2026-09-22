import React, { useState } from 'react';
import { QrCode, Copy, Check, ExternalLink, Building2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { BANK_OPTIONS } from '../services/bankCatalog';
import { generateVietQrUrl, formatVnd, formatNumber } from '../services/taxCalculatorService';

interface TaxPaymentQrCardProps {
    amount: number;
    name: string;
    bankAccount: string;
    setBankAccount: (v: string) => void;
    bankCode: string;
    setBankCode: (v: string) => void;
    qrDescription: string;
    setQrDescription: (v: string) => void;
}

export const TaxPaymentQrCard: React.FC<TaxPaymentQrCardProps> = ({
    amount,
    name,
    bankAccount,
    setBankAccount,
    bankCode,
    setBankCode,
    qrDescription,
    setQrDescription
}) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`Đã copy ${label}: ${text}`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const qrUrl = generateVietQrUrl({
        bankAccount,
        bankCode,
        amount,
        description: qrDescription || `Hoan thue TNCN cho ${name || 'dong nghiep'}`
    });

    return (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <QrCode size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">
                            Mã QR Chuyển Khoản Hoàn Thuế
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">Quét mã bằng app ngân hàng để chuyển đúng số tiền</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                {/* Bank Information Form */}
                <div className="space-y-2.5">
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Ngân hàng nhận tiền
                        </label>
                        <select
                            value={bankCode}
                            onChange={e => setBankCode(e.target.value)}
                            className="w-full h-8.5 px-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                        >
                            <option value="">-- Chọn ngân hàng --</option>
                            {BANK_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Số tài khoản
                            </label>
                            {bankAccount && (
                                <button
                                    type="button"
                                    onClick={() => handleCopy(bankAccount, 'Số tài khoản')}
                                    className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                                >
                                    {copiedField === 'Số tài khoản' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                    <span>Copy STK</span>
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={bankAccount}
                            onChange={e => setBankAccount(e.target.value)}
                            placeholder="Nhập số tài khoản..."
                            className="w-full h-8.5 px-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Nội dung chuyển khoản
                            </label>
                            {qrDescription && (
                                <button
                                    type="button"
                                    onClick={() => handleCopy(qrDescription, 'Nội dung CK')}
                                    className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                                >
                                    {copiedField === 'Nội dung CK' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                    <span>Copy nội dung</span>
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={qrDescription}
                            onChange={e => setQrDescription(e.target.value)}
                            placeholder={`Hoan thue TNCN cho ${name || 'dong nghiep'}`}
                            className="w-full h-8.5 px-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                    </div>

                    {/* Copy amount helper */}
                    <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                        <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Số tiền cần chuyển:</span>
                            <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
                                {formatVnd(amount)}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(String(Math.round(amount)), 'Số tiền')}
                            className="gap-1 text-xs text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                        >
                            {copiedField === 'Số tiền' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            <span>Copy số tiền</span>
                        </Button>
                    </div>
                </div>

                {/* QR Display */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-h-[220px]">
                    {qrUrl ? (
                        <div className="space-y-2">
                            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 inline-block">
                                <img
                                    src={qrUrl}
                                    alt="VietQR Chuyển Khoản Hoàn Thuế"
                                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain mx-auto"
                                    loading="lazy"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Quét bằng bất kỳ App Ngân hàng nào (VietQR NAPAS247)
                            </p>
                        </div>
                    ) : (
                        <div className="p-6 text-slate-400 text-xs space-y-1.5">
                            <QrCode size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa tạo mã QR</p>
                            <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                                Vui lòng chọn ngân hàng và nhập số tài khoản để tự động tạo mã QR.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
