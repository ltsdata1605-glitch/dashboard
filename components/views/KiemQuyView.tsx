import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  Banknote, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  Wallet,
  Save,
  History,
  X,
  Trash2
} from 'lucide-react';
import { saveSetting, getSetting } from '../../services/dbService';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
import { Modal } from '../shared/ui/Modal';
import { EmptyState } from '../shared/ui/EmptyState';
import { Button } from '../shared/ui/Button';

const DENOMINATIONS = [
  { value: 500000, label: '500,000', color: 'text-cyan-700', bg: 'bg-cyan-500' },
  { value: 200000, label: '200,000', color: 'text-rose-800', bg: 'bg-rose-500' },
  { value: 100000, label: '100,000', color: 'text-emerald-700', bg: 'bg-emerald-500' },
  { value: 50000, label: '50,000', color: 'text-pink-600', bg: 'bg-pink-400' },
  { value: 20000, label: '20,000', color: 'text-blue-600', bg: 'bg-blue-400' },
  { value: 10000, label: '10,000', color: 'text-amber-600', bg: 'bg-amber-400' },
  { value: 5000, label: '5,000', color: 'text-blue-900/60', bg: 'bg-blue-900/20' },
  { value: 2000, label: '2,000', color: 'text-slate-600', bg: 'bg-slate-400' },
  { value: 1000, label: '1,000', color: 'text-slate-500', bg: 'bg-slate-300' }
];

const HISTORY_KEY = 'kiem_quy_history';

interface AuditRecord {
  id: string;
  date: string;
  time: string;
  amountOnHand: number;
  actualTotal: number;
  difference: number;
  counts: Record<number, string>;
  notes: string;
}

export default function KiemQuyView() {
  const [amountOnHand, setAmountOnHand] = useState<string>('');
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<string>('');
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const onHandRef = useRef<HTMLInputElement | null>(null);

  // Load history from IndexedDB
  useEffect(() => {
    getSetting(HISTORY_KEY).then((data: any) => {
      if (data && Array.isArray(data)) setHistory(data);
    }).catch(() => {});
    
    // Auto focus "Số tiền đang giữ" on mount
    const timer = setTimeout(() => {
      onHandRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  const showToast = useCallback((msg: string) => {
    toast.success(msg, { duration: 2000 });
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const calculateActualTotal = () => {
    return DENOMINATIONS.reduce((sum, denom) => {
      const count = parseInt(counts[denom.value] || '0', 10);
      return sum + (denom.value * count);
    }, 0);
  };

  const actualTotal = calculateActualTotal();
  const onHandValue = parseFloat(amountOnHand) || 0;
  const difference = actualTotal - onHandValue;

  const handleNextInput = (currentValue: number) => {
    const currentIndex = DENOMINATIONS.findIndex(d => d.value === currentValue);
    if (currentIndex < DENOMINATIONS.length - 1) {
      const nextValue = DENOMINATIONS[currentIndex + 1].value;
      inputRefs.current[nextValue]?.focus();
    }
  };

  const resetAll = () => {
    setAmountOnHand('');
    setCounts({});
    setNotes('');
    setShowResetConfirm(false);
    onHandRef.current?.focus();
  };

  const saveToHistory = async () => {
    if (actualTotal === 0) {
      showToast('Chưa có dữ liệu để lưu!');
      return;
    }

    const now = new Date();
    const record: AuditRecord = {
      id: Date.now().toString(),
      date: now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      amountOnHand: onHandValue,
      actualTotal,
      difference,
      counts: { ...counts },
      notes,
    };

    const newHistory = [record, ...history].slice(0, 50); // Keep max 50 records
    setHistory(newHistory);
    await saveSetting(HISTORY_KEY, newHistory);
    showToast('Đã lưu lịch sử kiểm quỹ!');
  };

  const deleteRecord = async (id: string) => {
    const newHistory = history.filter(r => r.id !== id);
    setHistory(newHistory);
    await saveSetting(HISTORY_KEY, newHistory);
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 overflow-y-auto w-full pb-8">
        <div className="max-w-md mx-auto pt-1 px-3 space-y-2">
        {/* Summary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-600 rounded-xl p-3 text-white shadow-md shrink-0"
        >
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-emerald-100 text-[9px] font-bold uppercase tracking-wider">Tổng Thực Tế</span>
            <Banknote size={12} className="text-emerald-200" />
          </div>
          <div className="flex items-center justify-between mb-1.5 min-h-[28px]">
            <div className="text-xl font-black">
              {formatCurrency(actualTotal)}
            </div>
            <AnimatePresence mode="wait">
              <motion.div 
                key={difference === 0 ? 'match' : difference > 0 ? 'more' : 'less'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm ${
                  difference === 0 
                    ? 'bg-emerald-500 text-white border border-emerald-400' 
                    : difference > 0 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-rose-500 text-white'
                }`}
              >
                {difference === 0 ? (
                  <><CheckCircle2 size={12} /> KHỚP</>
                ) : difference > 0 ? (
                  <><AlertCircle size={12} /> THỪA</>
                ) : (
                  <><AlertCircle size={12} /> THIẾU</>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <div className="space-y-0 text-left">
              <div className="text-emerald-200 text-[8px] uppercase font-bold tracking-tighter">Số tiền đang giữ</div>
              <div className="text-[13px] font-bold truncate">{formatCurrency(onHandValue)}</div>
            </div>
            <div className="space-y-0 text-right">
              <div className="text-emerald-200 text-[8px] uppercase font-bold tracking-tighter">Chênh lệch</div>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={difference === 0 ? 'match' : difference > 0 ? 'more' : 'less'}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-[13px] font-bold truncate flex items-center justify-end gap-1 ${
                    difference === 0 ? 'text-white' : difference > 0 ? 'text-emerald-50' : 'text-rose-100'
                  }`}
                >
                  {difference === 0 ? (
                    <CheckCircle2 size={12} className="shrink-0 opacity-80" />
                  ) : (
                    <AlertCircle size={12} className={`shrink-0 ${difference > 0 ? 'text-blue-200' : 'text-rose-200'}`} />
                  )}
                  <span>{difference > 0 ? '+' : ''}{formatCurrency(difference)}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

          {/* Input - Số tiền đang giữ */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="relative">
              <input
                ref={onHandRef}
                type="number"
                step="any"
                inputMode="decimal"
                min="0"
                value={amountOnHand}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setAmountOnHand(val);
                }}
                onKeyDown={blockNonNumericKeys}
                placeholder="Số tiền đang giữ..."
                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg py-1.5 px-3 text-sm font-bold focus:ring-1 focus:ring-emerald-500 outline-none pr-8 dark:text-white dark:placeholder:text-slate-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Wallet size={12} className="text-slate-300" />
              </div>
            </div>
          </div>

          {/* Denominations */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center rounded-t-xl">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mệnh giá</span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pr-4">Số tờ</span>
            </div>
            
            {DENOMINATIONS.map((denom, index) => (
              <div 
                key={denom.value}
                onClick={() => inputRefs.current[denom.value]?.focus()}
                className={`flex items-center justify-between px-3 py-1.5 active:bg-emerald-50 dark:active:bg-emerald-900/20 transition-colors cursor-pointer ${index !== DENOMINATIONS.length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1 h-6 rounded-full shrink-0 ${denom.bg}`} />
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${denom.color}`}>{denom.label}</span>
                    <span className="text-[8px] text-slate-400 font-medium">{formatCurrency(denom.value * (parseInt(counts[denom.value] || '0', 10)))}</span>
                  </div>
                </div>
                
                <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg px-2 border border-slate-100 dark:border-slate-700 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-emerald-300 transition-all overflow-hidden">
                  <input
                    ref={(el) => { inputRefs.current[denom.value] = el; }}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    min="0"
                    value={counts[denom.value] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCounts(prev => ({ ...prev, [denom.value]: val }));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      blockNonNumericKeys(e);
                      if (e.key === 'Enter') handleNextInput(denom.value);
                    }}
                    placeholder="0"
                    className="w-14 text-right py-1 pr-1 bg-transparent border-none font-bold text-emerald-600 dark:text-emerald-400 focus:ring-0 outline-none text-sm"
                  />
                  <span className="text-slate-300 font-medium text-[9px] uppercase">Tờ</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-1.5 shadow-sm border border-slate-100 dark:border-slate-700">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú đối soát..."
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg py-1 px-2 text-[11px] focus:ring-1 focus:ring-emerald-500 outline-none min-h-[32px] max-h-[32px] resize-none dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-2.5 pt-1 pb-6">
            <Button 
              variant="secondary"
              size="icon"
              onClick={() => setShowResetConfirm(true)}
              className="flex-none bg-slate-100 dark:bg-slate-800 border-none"
            >
              <RotateCcw size={18} />
            </Button>
            <Button 
              onClick={saveToHistory}
              leftIcon={<Save size={16} />}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 border-none shadow-emerald-500/20 text-white"
            >
              LƯU KIỂM QUỸ
            </Button>
            <Button 
              onClick={() => setShowHistory(true)}
              leftIcon={<History size={16} />}
              className="flex-1 bg-[#0066FF] hover:bg-blue-700 border-none shadow-blue-500/20 text-white"
            >
              LỊCH SỬ
            </Button>
          </div>
        </div>
      </div>

      {/* History Popup */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title={
          <div className="flex items-center gap-2">
            <History size={18} className="text-blue-500" />
            Lịch sử kiểm quỹ
          </div>
        }
      >
        <div className="space-y-3">
          {history.length === 0 ? (
            <EmptyState 
              icon={<History size={32} />}
              title="Chưa có lịch sử kiểm quỹ"
              description="Các bản ghi lưu kiểm quỹ sẽ hiển thị ở đây."
            />
          ) : (
            history.map((record) => (
              <div key={record.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                  record.difference === 0 ? 'bg-emerald-500' : record.difference > 0 ? 'bg-blue-500' : 'bg-rose-500'
                }`}></div>
                
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{record.date}</span>
                    <span className="text-[10px] text-slate-400">{record.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      record.difference === 0 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : record.difference > 0 
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {record.difference === 0 ? 'KHỚP' : record.difference > 0 ? 'THỪA' : 'THIẾU'}
                    </span>
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase font-bold">Đang giữ</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{formatCurrency(record.amountOnHand)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase font-bold">Thực tế</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">{formatCurrency(record.actualTotal)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase font-bold">Chênh lệch</div>
                    <div className={`font-bold text-[11px] ${
                      record.difference === 0 ? 'text-slate-600' : record.difference > 0 ? 'text-blue-600' : 'text-rose-600'
                    }`}>
                      {record.difference > 0 ? '+' : ''}{formatCurrency(record.difference)}
                    </div>
                  </div>
                </div>

                {/* Denomination detail */}
                {Object.keys(record.counts).filter(k => parseInt(record.counts[Number(k)] || '0') > 0).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex flex-wrap gap-1">
                      {DENOMINATIONS.filter(d => parseInt(record.counts[d.value] || '0') > 0).map(d => (
                        <span key={d.value} className="bg-slate-50 dark:bg-slate-900/40 text-[10px] px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                          <span className={`font-bold ${d.color}`}>{d.label}</span>
                          <span className="text-slate-400"> ×{record.counts[d.value]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {record.notes && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[11px] text-slate-500 italic">
                    {record.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={resetAll}
        title="Làm mới bảng kiểm quỹ?"
        message="Toàn bộ dữ liệu đang nhập sẽ bị xóa và không thể khôi phục."
        confirmText="Xóa dữ liệu"
        variant="danger"
      />
    </div>
  );
}
