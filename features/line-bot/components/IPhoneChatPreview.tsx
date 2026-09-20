import React from 'react';
import {
    Wifi,
    Battery,
    Signal,
    ChevronLeft,
    Phone,
    Menu,
    Search,
    Plus,
    Camera,
    Image as ImageIcon,
    Mic,
    Smile,
    Bot,
    Send
} from 'lucide-react';

interface IPhoneChatPreviewProps {
    previewTab: 'filter' | 'tk' | 'issue';
    onTabChange: (tab: 'filter' | 'tk' | 'issue') => void;
    tkMode: 'all' | 'event' | 'gvgs';
    onTkModeChange: (mode: 'all' | 'event' | 'gvgs') => void;
    issueMode: 'event' | 'gvgs';
    onIssueModeChange: (mode: 'event' | 'gvgs') => void;
    filterNames?: string[];
}

export const IPhoneChatPreview: React.FC<IPhoneChatPreviewProps> = ({
    previewTab,
    onTabChange,
    tkMode,
    onTkModeChange,
    issueMode,
    onIssueModeChange,
    filterNames = []
}) => {
    const activeNames = filterNames && filterNames.length > 0 ? filterNames : ['STR_ Trường_21453-TC', 'STR_BOSS SƠN_21707'];
    const firstName = activeNames[0] || 'Lê Trường Sơn';
    const secondName = activeNames[1] || (activeNames.length === 1 ? activeNames[0] : 'STR_BOSS SƠN_21707');
    const displayTitle = activeNames.slice(0, 3).join(', ') + (activeNames.length > 3 ? '...' : '');
    const matchedCount = activeNames.length === 1 ? 1 : 2;
    const totalCount = matchedCount + 1;
    return (
        <div className="flex flex-col items-center w-full">
            {/* Top label / Real-time badge */}
            <div className="flex items-center justify-between w-full max-w-[390px] mb-2 px-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Mô Phỏng LINE Trên iPhone Thật
                    </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">iPhone 16 Pro • Live</span>
            </div>

            {/* Main iPhone Chassis */}
            <div className="relative w-full max-w-[380px] p-[10px] rounded-[50px] bg-gradient-to-b from-slate-700 via-slate-900 to-black shadow-2xl shadow-slate-900/60 ring-1 ring-white/20 border border-slate-700/80">
                
                {/* Physical Side Buttons (Mockup) */}
                {/* Action button (Left) */}
                <div className="absolute -left-[4px] top-[90px] w-[3px] h-[22px] bg-slate-600 rounded-l-sm" />
                {/* Volume Up (Left) */}
                <div className="absolute -left-[4px] top-[125px] w-[3px] h-[40px] bg-slate-600 rounded-l-sm" />
                {/* Volume Down (Left) */}
                <div className="absolute -left-[4px] top-[175px] w-[3px] h-[40px] bg-slate-600 rounded-l-sm" />
                {/* Power / Lock Button (Right) */}
                <div className="absolute -right-[4px] top-[135px] w-[3px] h-[55px] bg-slate-600 rounded-r-sm" />

                {/* Inner Screen Display */}
                <div className="relative w-full rounded-[40px] bg-slate-100 dark:bg-[#111923] overflow-hidden flex flex-col min-h-[640px] border border-slate-800/80 shadow-inner">
                    
                    {/* 1. iOS Status Bar & Dynamic Island */}
                    <div className="relative z-30 pt-3 px-6 pb-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between text-slate-900 dark:text-white select-none">
                        {/* Time */}
                        <div className="w-12 text-xs font-bold font-mono tracking-tight">
                            9:41
                        </div>

                        {/* Dynamic Island */}
                        <div className="h-[24px] w-24 bg-black rounded-full flex items-center justify-between px-2.5 shadow-md shadow-black/40 ring-1 ring-white/10">
                            {/* Camera lens with glare */}
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 flex items-center justify-center ring-1 ring-slate-800">
                                <div className="w-1 h-1 rounded-full bg-indigo-900/80" />
                            </div>
                            {/* Proximity Sensor */}
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        </div>

                        {/* Status Icons */}
                        <div className="w-12 flex items-center justify-end gap-1.5 text-slate-800 dark:text-slate-200">
                            <Signal size={12} className="stroke-[2.5]" />
                            <Wifi size={12} className="stroke-[2.5]" />
                            <div className="flex items-center gap-0.5">
                                <Battery size={14} className="stroke-[2]" />
                            </div>
                        </div>
                    </div>

                    {/* 2. LINE App Navigation Bar */}
                    <div className="relative z-20 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="text-slate-700 dark:text-slate-200 flex items-center -ml-1 hover:text-emerald-600 transition-colors"
                            >
                                <ChevronLeft size={22} />
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500 text-white rounded-full font-mono">12</span>
                            </button>
                            
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-2 ring-emerald-200 dark:ring-emerald-950 shadow-xs">
                                    <Bot size={17} />
                                </div>
                                <div className="leading-tight">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                        <span>BOT LINE PMH</span>
                                    </h4>
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>Trực tuyến • Nhóm Kho</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <button type="button" className="p-1 hover:text-emerald-600">
                                <Search size={15} />
                            </button>
                            <button type="button" className="p-1 hover:text-emerald-600">
                                <Phone size={15} />
                            </button>
                            <button type="button" className="p-1 hover:text-emerald-600">
                                <Menu size={16} />
                            </button>
                        </div>
                    </div>

                    {/* 3. iOS Mode Segmented Tabs */}
                    <div className="px-3 pt-2 pb-1.5 bg-slate-200/60 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-300/60 dark:bg-slate-800/80 rounded-xl text-[10px]">
                            <button
                                type="button"
                                onClick={() => onTabChange('filter')}
                                className={`py-1 rounded-lg font-bold transition-all text-center ${
                                    previewTab === 'filter'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                🎯 Lọc PMH
                            </button>
                            <button
                                type="button"
                                onClick={() => onTabChange('tk')}
                                className={`py-1 rounded-lg font-bold transition-all text-center ${
                                    previewTab === 'tk'
                                        ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                📊 Lệnh &quot;tk&quot;
                            </button>
                            <button
                                type="button"
                                onClick={() => onTabChange('issue')}
                                className={`py-1 rounded-lg font-bold transition-all text-center ${
                                    previewTab === 'issue'
                                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                ⚡ Nhận mã
                            </button>
                        </div>
                    </div>

                    {/* 4. Chat Messages Scroll Area */}
                    <div
                        key={`${previewTab}-${tkMode}-${issueMode}-${activeNames.slice(0, 3).join(',')}`}
                        className="flex-1 p-3 overflow-y-auto space-y-3 font-sans text-xs bg-[#73889b]/15 dark:bg-[#0c121c]/70 animate-in fade-in duration-200"
                    >
                        {/* Date badge */}
                        <div className="flex justify-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-slate-300/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 shadow-2xs">
                                Hôm nay 13:48
                            </span>
                        </div>

                        {/* TAB 1: LỌC PMH */}
                        {previewTab === 'filter' && (
                            <>
                                <div className="flex justify-end">
                                    <div className="bg-[#06C755] text-white p-2.5 rounded-2xl rounded-tr-xs shadow-xs max-w-[88%] font-mono text-[10.5px] whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-150">
{`[Tin nhắn chuyển tiếp từ Nhóm]:
${firstName}
➜ PMH 18JH1TVN : 6W43J4BI2S
━━━━━━
Nhân Viên Khác (Không trong DS lọc)
➜ PMH KG20IH10N : ABCD1234
━━━━━━
${secondName}
➜ PMH SHD4607 : VWQU13YUQX`}
                                        <div className="text-[8px] text-emerald-100 text-right mt-1">13:48 ✓✓</div>
                                    </div>
                                </div>

                                <div className="flex justify-start items-start gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs text-[10px]">
                                        <Bot size={12} />
                                    </div>
                                    <div className="bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 p-2.5 rounded-2xl rounded-tl-xs shadow-xs border border-slate-200/80 dark:border-slate-800 max-w-[90%] space-y-1.5">
                                        <div className="text-slate-400 dark:text-slate-500 text-[9.5px] border-l-2 border-emerald-500 pl-1.5 py-0.5 bg-slate-50 dark:bg-slate-900/60 rounded-r font-mono">
                                            <span>💬 Trích dẫn: </span>
                                            <span className="italic text-slate-600 dark:text-slate-300">Tin nhắn chuyển tiếp chứa nhiều mã...</span>
                                        </div>

                                        <div className="font-mono text-xs space-y-1">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                                🎯 KẾT QUẢ LỌC PMH:
                                            </div>
                                            <div className="text-slate-300 dark:text-slate-600 select-none text-[10px]">
                                                ━━━━━━
                                            </div>
                                            <div className="space-y-0.5 text-[10.5px]">
                                                <div className="font-bold text-slate-900 dark:text-white">{firstName}</div>
                                                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    ➜ PMH ICT200 : <span className="text-slate-900 dark:text-white font-mono">R6KDPXGZU6</span>
                                                </div>
                                                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    ➜ PMH ICT400 : <span className="text-slate-900 dark:text-white font-mono">WX81K2L9PQ</span>
                                                </div>
                                            </div>
                                            {secondName !== firstName && (
                                                <>
                                                    <div className="text-slate-300 dark:text-slate-600 select-none text-[10px]">
                                                        ━━━━━━
                                                    </div>
                                                    <div className="space-y-0.5 text-[10.5px]">
                                                        <div className="font-bold text-slate-900 dark:text-white">{secondName}</div>
                                                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            ➜ PMH MM700 : <span className="text-slate-900 dark:text-white font-mono">73KX4BKDXE</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            <div className="text-slate-300 dark:text-slate-600 select-none text-[10px]">
                                                ━━━━━━
                                            </div>
                                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">
                                                💡 Sao chép mã phía trên để sử dụng!
                                            </div>
                                        </div>

                                        <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <span>⚡ Tự động gôm mã theo người nhận</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">13:48</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 2: LỆNH "tk" */}
                        {previewTab === 'tk' && (
                            <>
                                {/* Sub-filters inside chat */}
                                <div className="flex items-center gap-1 p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs rounded-xl shadow-2xs text-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => onTkModeChange('all')}
                                        className={`flex-1 py-0.5 rounded-lg font-bold text-center transition-all ${
                                            tkMode === 'all'
                                                ? 'bg-amber-500 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Toàn bộ (tk)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onTkModeChange('event')}
                                        className={`flex-1 py-0.5 rounded-lg font-bold text-center transition-all ${
                                            tkMode === 'event'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Event (tk event)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onTkModeChange('gvgs')}
                                        className={`flex-1 py-0.5 rounded-lg font-bold text-center transition-all ${
                                            tkMode === 'gvgs'
                                                ? 'bg-sky-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Giờ Vàng (tk gvgs)
                                    </button>
                                </div>

                                <div className="flex justify-end">
                                    <div className="bg-[#06C755] text-white px-3 py-1.5 rounded-2xl rounded-tr-xs shadow-xs max-w-[80%] font-mono font-bold text-xs">
                                        {tkMode === 'all' ? 'tk' : tkMode === 'event' ? 'tk event' : 'tk gvgs'}
                                        <div className="text-[8px] text-emerald-100 text-right mt-0.5">13:48 ✓✓</div>
                                    </div>
                                </div>

                                <div className="flex justify-start items-start gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs text-[10px]">
                                        <Bot size={12} />
                                    </div>
                                    <div className="bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 p-2.5 rounded-2xl rounded-tl-xs shadow-xs border border-slate-200/80 dark:border-slate-800 max-w-[92%] space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                                <span>BOT LINE</span>
                                                <span className="text-[8px] px-1 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-normal font-sans">
                                                    {tkMode === 'all' ? 'Tất cả PMH' : tkMode === 'event' ? 'Event' : 'Giờ Vàng'}
                                                </span>
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono">13:48</span>
                                        </div>

                                        <pre className="font-mono text-[10px] whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 max-h-[300px] overflow-y-auto pr-1">
{tkMode === 'all' ? `📊 BÁO CÁO TỒN KHO THEO SẢN PHẨM
━━━━━━━━━━━━━━━━━━━━━
1. ✅ Bình đun siêu tốc Rapido RK2015-C 2L
   ➜ Còn khả dụng: 29/30 mã
2. ✅ Nồi chiên không dầu Kangaroo 6.5L KGAF65M1G
   ➜ Còn khả dụng: 30/30 mã
3. ✅ Bếp điện từ đơn Kangaroo KG20IH10N
   ➜ Còn khả dụng: 30/30 mã
4. ✅ Bếp gas đôi Sunhouse SHB3105MD
   ➜ Còn khả dụng: 30/30 mã
5. ✅ Bếp nướng điện Sunhouse SHD4607
   ➜ Còn khả dụng: 30/30 mã
6. ✅ Nồi lẩu đa năng Kangaroo KG40EH2 4 lít
   ➜ Còn khả dụng: 30/30 mã
7. ✅ Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L
   ➜ Còn khả dụng: 30/30 mã
8. ✅ Máy lọc không khí Midea KJ400GVN
   ➜ Còn khả dụng: 30/30 mã
9. ✅ Máy xay thịt Bear CH-5H03P36
   ➜ Còn khả dụng: 30/30 mã
━━━━━━━━━━━━━━━━━━━━━
📈 Tổng tồn kho: 269 mã khả dụng / 270 tổng mã
💡 Nhận mã Event: Gõ "e + STT" (ví dụ: e1, e2...)
⚡ Nhận mã Giờ Vàng: Gõ "gv + STT" (ví dụ: gv1, gv2...)
👉 Xem riêng từng loại: Gõ "tk event" hoặc "tk gvgs"` :
tkMode === 'event' ? `📊 BÁO CÁO TỒN KHO PMH EVENT
━━━━━━━━━━━━━━━━━━━━━
1. ✅ Bình đun siêu tốc Rapido RK2015-C 2L
   ➜ Còn khả dụng: 29/30 mã
2. ✅ Nồi chiên không dầu Kangaroo 6.5L KGAF65M1G
   ➜ Còn khả dụng: 30/30 mã
3. ✅ Bếp điện từ đơn Kangaroo KG20IH10N
   ➜ Còn khả dụng: 30/30 mã
4. ✅ Bếp gas đôi Sunhouse SHB3105MD
   ➜ Còn khả dụng: 30/30 mã
5. ✅ Bếp nướng điện Sunhouse SHD4607
   ➜ Còn khả dụng: 30/30 mã
━━━━━━━━━━━━━━━━━━━━━
📈 Tổng tồn kho Event: 149 mã khả dụng / 150 tổng mã
💡 Cú pháp nhận mã Event: Gõ "e + STT" (ví dụ: e1, e2, e3...)` :
`📊 BÁO CÁO TỒN KHO PMH GIỜ VÀNG GIÁ SỐC
━━━━━━━━━━━━━━━━━━━━━
1. ✅ Nồi lẩu đa năng Kangaroo KG40EH2 4 lít
   ➜ Còn khả dụng: 30/30 mã
2. ✅ Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L
   ➜ Còn khả dụng: 30/30 mã
3. ✅ Máy lọc không khí Midea KJ400GVN
   ➜ Còn khả dụng: 30/30 mã
4. ✅ Máy xay thịt Bear CH-5H03P36
   ➜ Còn khả dụng: 30/30 mã
━━━━━━━━━━━━━━━━━━━━━
📈 Tổng tồn kho Giờ Vàng: 120 mã khả dụng / 120 tổng mã
💡 Cú pháp nhận mã Giờ Vàng: Gõ "gv + STT" (ví dụ: gv1, gv2, gv3...)`}
                                        </pre>

                                        <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <span>⚡ Nhận diện theo STT</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Khả dụng</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 3: DUYỆT / NHẬN MÃ (e / gv) */}
                        {previewTab === 'issue' && (
                            <>
                                {/* Sub-filters inside chat */}
                                <div className="flex items-center gap-1 p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs rounded-xl shadow-2xs text-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => onIssueModeChange('event')}
                                        className={`flex-1 py-0.5 rounded-lg font-bold text-center transition-all ${
                                            issueMode === 'event'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Event (e4 12345678)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onIssueModeChange('gvgs')}
                                        className={`flex-1 py-0.5 rounded-lg font-bold text-center transition-all ${
                                            issueMode === 'gvgs'
                                                ? 'bg-sky-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Giờ Vàng (gv2 87654321)
                                    </button>
                                </div>

                                <div className="flex justify-end">
                                    <div className="bg-[#06C755] text-white px-3 py-1.5 rounded-2xl rounded-tr-xs shadow-xs max-w-[85%] font-mono text-xs font-bold">
                                        {issueMode === 'event' ? 'e4 12345678' : 'gv2 87654321'}
                                        <div className="text-[8px] text-emerald-100 text-right mt-0.5">13:48 ✓✓</div>
                                    </div>
                                </div>

                                <div className="flex justify-start items-start gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs text-[10px]">
                                        <Bot size={12} />
                                    </div>
                                    <div className="bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 p-2.5 rounded-2xl rounded-tl-xs shadow-xs border border-slate-200/80 dark:border-slate-800 max-w-[92%] space-y-1.5">
                                        <div className="text-slate-400 dark:text-slate-500 text-[9.5px] border-l-2 border-emerald-500 pl-1.5 py-0.5 bg-slate-50 dark:bg-slate-900/60 rounded-r font-mono">
                                            <span>💬 Trích dẫn: </span>
                                            <span className="italic text-slate-600 dark:text-slate-300 font-semibold">
                                                {issueMode === 'event' ? 'e4 12345678' : 'gv2 87654321'}
                                            </span>
                                        </div>

                                        <div className="space-y-1 font-mono text-xs">
                                            <div className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                                <span>@{firstName}</span>
                                                <span className="text-[8px] px-1 py-0.1 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded font-sans font-normal">Đã tag tên</span>
                                            </div>
                                            <div className="text-slate-700 dark:text-slate-300 text-[10.5px]">
                                                🛍️ {issueMode === 'event' ? 'PMH Event: Bếp gas đôi Sunhouse SHB3105MD' : 'PMH Giờ Vàng: Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L'}
                                            </div>
                                            <div className="text-slate-700 dark:text-slate-300 text-[10.5px]">
                                                MĐH Áp dụng: <span className="font-bold text-slate-900 dark:text-white">{issueMode === 'event' ? '12345678' : '87654321'}</span>
                                            </div>
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs pt-0.5">
                                                ➜ PMH: <span className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded tracking-wider">{issueMode === 'event' ? '6W43J4BI2S' : '8K91MN39PQ'}</span>
                                            </div>
                                        </div>

                                        <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <span>⚡ Cấp mã tức thì</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">13:48</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 5. LINE Bottom Input Toolbar */}
                    <div className="relative z-20 px-2 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                className="w-7 h-7 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                type="button"
                                className="w-7 h-7 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                            >
                                <Camera size={15} />
                            </button>
                            <button
                                type="button"
                                className="w-7 h-7 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                            >
                                <ImageIcon size={15} />
                            </button>

                            {/* Fake input text box */}
                            <div className="flex-1 py-1 px-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-between text-slate-400 dark:text-slate-500 text-[11px]">
                                <span className="truncate">
                                    {previewTab === 'filter'
                                        ? 'Dán tin nhắn chuyển tiếp...'
                                        : previewTab === 'tk'
                                            ? 'Gõ "tk", "tk event"...'
                                            : 'Gõ "e4 [MĐH]" để nhận mã...'}
                                </span>
                                <Smile size={14} className="text-slate-400 shrink-0" />
                            </div>

                            <button
                                type="button"
                                className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs hover:bg-emerald-600 transition-colors"
                            >
                                <Mic size={14} />
                            </button>
                        </div>

                        {/* 6. iPhone Home Indicator Bar */}
                        <div className="pt-2 pb-0.5 flex justify-center">
                            <div className="w-32 h-1 bg-slate-400/80 dark:bg-slate-600 rounded-full" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
