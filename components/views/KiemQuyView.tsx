import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Banknote, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  StickyNote,
  ChevronRight,
  Wallet
} from 'lucide-react';

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

export default function KiemQuyView() {
  const [amountOnHand, setAmountOnHand] = useState<string>('');
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<string>('');
  
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const onHandRef = useRef<HTMLInputElement | null>(null);

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
    if (window.confirm('Xóa hết dữ liệu để bắt đầu lại?')) {
      setAmountOnHand('');
      setCounts({});
      setNotes('');
      onHandRef.current?.focus();
    }
  };

  return (
    <div className="h-full w-full bg-slate-100 font-sans text-slate-900 flex flex-col overflow-hidden items-center lg:items-start lg:pl-[50px] lg:pt-10">
      <div className="w-full max-w-[430px] h-full lg:h-[800px] bg-slate-50 flex flex-col overflow-hidden lg:rounded-3xl shadow-2xl border-x lg:border border-slate-200">
        {/* Header - Compact */}
        <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg text-white">
              <Calculator size={18} />
            </div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">Kiểm Tiền Thu Ngân</h1>
          </div>
          <button 
            onClick={resetAll}
            className="p-1.5 text-slate-400 hover:text-rose-500 active:scale-90 transition-all"
          >
            <RotateCcw size={18} />
          </button>
        </header>

        <main className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
          {/* Summary Card - Ultra Compact */}
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

          {/* Input Master Card */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            {/* Main Input - Books/OnHand */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-100 shrink-0">
              <div className="relative">
                <input
                  ref={onHandRef}
                  type="number"
                  inputMode="decimal"
                  value={amountOnHand}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAmountOnHand(val);
                  }}
                  placeholder="Số tiền đang giữ..."
                  className="w-full bg-slate-50 border-none rounded-lg py-1.5 px-3 text-sm font-bold focus:ring-1 focus:ring-emerald-500 outline-none pr-8"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Wallet size={12} className="text-slate-300" />
                </div>
              </div>
            </div>

            {/* Grouped Denominations Scrollable Area */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mệnh giá</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pr-4">Số tờ</span>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar pb-[100px]">
                {DENOMINATIONS.map((denom, index) => (
                  <div 
                    key={denom.value}
                    onClick={() => inputRefs.current[denom.value]?.focus()}
                    className={`flex items-center justify-between px-3 py-1.5 active:bg-emerald-50 transition-colors cursor-pointer ${index !== DENOMINATIONS.length - 1 ? 'border-b border-slate-200' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-6 rounded-full shrink-0 ${denom.bg}`} />
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${denom.color}`}>{denom.label}</span>
                        <span className="text-[8px] text-slate-400 font-medium">{formatCurrency(denom.value * (parseInt(counts[denom.value] || '0', 10)))}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center bg-slate-50 rounded-lg px-2 border border-slate-100 focus-within:bg-white focus-within:border-emerald-300 transition-all overflow-hidden">
                      <input
                        ref={(el) => { inputRefs.current[denom.value] = el; }}
                        type="number"
                        inputMode="numeric"
                        value={counts[denom.value] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCounts(prev => ({ ...prev, [denom.value]: val }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNextInput(denom.value);
                        }}
                        placeholder="0"
                        className="w-14 text-right py-1 pr-1 bg-transparent border-none font-bold text-emerald-600 focus:ring-0 outline-none text-sm"
                      />
                      <span className="text-slate-300 font-medium text-[9px] uppercase">Tờ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div className="shrink-0 space-y-1.5 pb-2">
              <div className="bg-white rounded-xl p-1.5 shadow-sm border border-slate-100">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú đối soát..."
                  className="w-full bg-slate-50 border-none rounded-lg py-1 px-2 text-[11px] focus:ring-1 focus:ring-emerald-500 outline-none min-h-[32px] max-h-[32px] resize-none"
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Hidden scrollbar styles */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
