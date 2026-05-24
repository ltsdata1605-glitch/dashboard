import React from 'react';
import { ScheduleTargets } from '../types';

interface LegendProps {
    targets: ScheduleTargets | null;
    onEditRule: (ruleKey: 'kho' | 'tn' | 'gh') => void;
    includeTnInSbh: boolean;
    onIncludeTnInSbhChange: (checked: boolean) => void;
    onboardingStep: number;
}

const Legend: React.FC<LegendProps> = ({ targets, onEditRule, includeTnInSbh, onIncludeTnInSbhChange, onboardingStep }) => {
    return (
        <div className="mt-4">
            {targets && (
                <div className={`mb-4 relative ${onboardingStep === 4 ? 'ring-2 ring-rose-500 animate-pulse' : ''}`}>
                    {onboardingStep === 4 && (
                         <div className="absolute top-full left-1/4 transform -translate-x-1/2 mt-2 w-56 bg-rose-600 text-white text-[10px] py-2 px-3 shadow-xl z-50 text-center font-medium">
                            <div className="font-bold mb-0.5">Bước 4: Cấu hình</div>
                            Bấm vào các nút bên dưới để cấu hình số lượng người cần thiết cho từng vị trí đặc biệt.
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 w-2.5 h-2.5 bg-rose-600 rotate-45"></div>
                        </div>
                    )}

                    {/* Targets row — flat inline layout */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Label */}
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <svg className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            Mục tiêu
                        </span>

                        {/* KHO button */}
                        <button 
                            onClick={() => onEditRule('kho')} 
                            className="group flex items-center gap-1.5 h-7 px-3 border border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                            <span className="text-emerald-700 font-bold text-[10px]">KHO</span>
                            <span className="font-extrabold text-emerald-900 text-xs">~{targets.kho}</span>
                            <span className="text-emerald-600 text-[9px] font-semibold">ngày</span>
                            <svg className="h-2.5 w-2.5 text-slate-300 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>

                        {/* TN button */}
                        <button 
                            onClick={() => onEditRule('tn')} 
                            className="group flex items-center gap-1.5 h-7 px-3 border border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 transition-colors cursor-pointer"
                        >
                            <span className="text-purple-700 font-bold text-[10px]">TN</span>
                            <span className="font-extrabold text-purple-900 text-xs">~{targets.tn}</span>
                            <span className="text-purple-600 text-[9px] font-semibold">ngày</span>
                            <svg className="h-2.5 w-2.5 text-slate-300 group-hover:text-purple-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>

                        {/* GH button */}
                        <button 
                            onClick={() => onEditRule('gh')} 
                            className="group flex items-center gap-1.5 h-7 px-3 border border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                            <span className="text-amber-700 font-bold text-[10px]">GH</span>
                            <span className="font-extrabold text-amber-900 text-xs">~{targets.gh}</span>
                            <span className="text-amber-600 text-[9px] font-semibold">ngày</span>
                            <svg className="h-2.5 w-2.5 text-slate-300 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>

                        {/* Separator */}
                        <div className="w-px h-5 bg-slate-200"></div>

                        {/* SBH Diff indicator */}
                        {targets.sbhDiff !== undefined && (
                            <div className={`flex items-center gap-2 h-7 px-3 border text-xs transition-colors ${
                                targets.sbhDiff <= 3 
                                ? 'bg-slate-50 border-slate-200 text-slate-600' 
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}>
                                <span className="font-semibold text-[10px] uppercase tracking-wider">Chênh SBH</span>
                                <span className="font-extrabold">{Math.round(targets.sbhDiff)}h</span>
                                {targets.sbhDiff <= 3 ? (
                                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <span className="text-[8px] font-bold bg-rose-600 text-white px-1.5 py-px uppercase">≤ 3h</span>
                                )}
                            </div>
                        )}

                        {/* TN in SBH toggle — pushed to right */}
                        <label className="ml-auto inline-flex items-center cursor-pointer select-none h-7 px-3 border border-slate-200 hover:border-indigo-200 bg-white transition-colors group gap-2">
                            <input
                                type="checkbox"
                                checked={includeTnInSbh}
                                onChange={(e) => onIncludeTnInSbhChange(e.target.checked)}
                                className="h-3.5 w-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                            />
                            <span className="font-semibold text-slate-500 group-hover:text-indigo-600 text-[10px] transition-colors">Tính TN vào SBH</span>
                        </label>
                    </div>
                </div>
            )}
            
            {/* Color legend — minimal */}
            <div className="flex gap-5 flex-wrap text-[9px] font-semibold text-slate-400 items-center border-t border-slate-100 pt-3">
                <span className="uppercase tracking-wider text-slate-300 mr-1">Ghi chú</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-amber-50 border border-amber-200"></span> Giao hàng</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-emerald-50 border border-emerald-200"></span> Kho</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-purple-50 border border-purple-200"></span> Thu ngân</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-white border border-slate-200"></span> Ca thường</span>
                
                <div className="ml-auto flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }}></span>Sửa trực tiếp</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></span>Đang đổi</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>Xin nghỉ</span>
                </div>
            </div>
        </div>
    );
}

export default Legend;