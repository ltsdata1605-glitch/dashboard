import React, { useState } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';
import { Copy, Check, Sparkles, MessageSquareQuote } from 'lucide-react';
import type { SupermarketCompetitionCommentary, GroupCommentary } from '../../../services/competitionCommentaryCalc';
import { generateZaloCommentaryMessage } from '../../../services/competitionCommentaryCalc';

interface CompetitionCommentaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    commentaryData: SupermarketCompetitionCommentary | null;
}

const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.ceil(val));

export const CompetitionCommentaryModal: React.FC<CompetitionCommentaryModalProps> = ({
    isOpen,
    onClose,
    commentaryData
}) => {
    const [copied, setCopied] = useState(false);

    if (!commentaryData) return null;

    const handleCopyZalo = async () => {
        try {
            const message = generateZaloCommentaryMessage(commentaryData);
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Không thể sao chép văn bản:', err);
        }
    };

    const {
        supermarketName,
        isRealtime,
        isSuperMode,
        groups,
        overallRate,
        reachedGroupsCount,
        totalGroupsCount,
        unreachedProgramsCount,
        generalAssessment
    } = commentaryData;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="4xl"
            title={
                <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-sky-100 text-sky-600">
                        <MessageSquareQuote className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-slate-800">
                                Nhận Xét & Đánh Giá Thi Đua
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                                <Sparkles className="h-3 w-3 text-sky-500 animate-pulse" />
                                BI Analysis
                            </span>
                        </div>
                    </div>
                </div>
            }
            subTitle={`${supermarketName} • ${isRealtime ? 'Chế độ Realtime' : 'Chế độ Luỹ kế'} • ${isSuperMode ? 'Target Vượt trội' : 'Target Cơ bản'}`}
            controls={
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyZalo}
                    className="h-8 px-2.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200 rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                    title="Sao chép toàn bộ nhận xét để dán vào nhóm Zalo / Telegram"
                >
                    {copied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Đã chép Zalo!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5 text-sky-600" />
                            <span>Sao chép Zalo</span>
                        </>
                    )}
                </Button>
            }
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] text-slate-400 font-medium">
                        💡 Có thể sao chép nhanh để gửi trực tiếp vào nhóm bán hàng của siêu thị.
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                        >
                            Đóng
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleCopyZalo}
                            className="flex items-center gap-1.5 font-bold"
                        >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Đã sao chép' : 'Sao chép nhận xét'}</span>
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
                {/* 1. Header Banner Tổng quan */}
                <div className="rounded-none border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl select-none" role="img" aria-label="sticker">
                            {generalAssessment.sticker}
                        </span>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-sky-900 uppercase tracking-wider mb-1">
                                {generalAssessment.headline}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {generalAssessment.advice}
                            </p>
                        </div>
                    </div>

                    {/* Quick KPI stats */}
                    <div className="mt-3.5 pt-3 border-t border-sky-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-white p-2 rounded-none border border-slate-200 text-center">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tiến độ chung</span>
                            <span className={`text-base font-black tabular-nums ${overallRate >= 100 ? 'text-emerald-600' : (overallRate >= 80 ? 'text-sky-600' : 'text-amber-600')}`}>
                                {overallRate}%
                            </span>
                        </div>
                        <div className="bg-white p-2 rounded-none border border-slate-200 text-center">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nhóm đạt ≥100%</span>
                            <span className="text-base font-black text-slate-800 tabular-nums">
                                {reachedGroupsCount}/{totalGroupsCount}
                            </span>
                        </div>
                        <div className="bg-white p-2 rounded-none border border-slate-200 text-center">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chưa khai thác</span>
                            <span className={`text-base font-black tabular-nums ${commentaryData.zeroGroupsCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                                {commentaryData.zeroGroupsCount}/{totalGroupsCount}
                            </span>
                        </div>
                        {/* Trước đây thẻ này hiện "Tổng Còn lại" = tổng Còn lại của MỌI nhóm cộng
                            lại — tức cộng *cái* (SLLK) với *VNĐ* (DTLK/DTQĐ), một con số vô nghĩa.
                            Thay bằng phép ĐẾM ngành hàng chưa đạt: không lệ thuộc đơn vị đo. */}
                        <div className="bg-white p-2 rounded-none border border-slate-200 text-center">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ngành hàng chưa đạt</span>
                            <span className={`text-base font-black tabular-nums ${unreachedProgramsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {unreachedProgramsCount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Danh sách Nhận xét theo từng Nhóm tiêu chí */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <span>📋 Chi tiết nhận xét theo nhóm tiêu chí</span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {groups.length} nhóm
                            </span>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {groups.map((group) => (
                            <GroupCommentaryCard key={group.groupKey} group={group} isRealtime={isRealtime} />
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const GroupCommentaryCard: React.FC<{ group: GroupCommentary; isRealtime: boolean }> = ({ group, isRealtime }) => {
    return (
        <div className="rounded-none border border-slate-200 bg-white p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-600">
            {/* Header nhóm */}
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                <div className="flex items-center gap-2">
                    <span className="text-xl select-none" role="img" aria-label="icon">
                        {group.groupIcon}
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black uppercase text-slate-800 tracking-tight">
                                {group.groupKey}
                            </h5>
                            <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 tabular-nums">
                                {group.over100Count}/{group.totalPrograms} (&gt;100%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Badge trạng thái kèm sticker */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-black border ${group.statusBadge.bgClass} ${group.statusBadge.colorClass} shadow-xs`}>
                    <span className="text-xs">{group.statusBadge.sticker}</span>
                    <span>{group.statusBadge.title}</span>
                    <span className="opacity-75 font-bold">({group.completionRate}%)</span>
                </div>
            </div>

            {/* 4 Thống kê cốt lõi của nhóm: Thực hiện, Target, Còn lại, Ngành đạt */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center mb-2.5">
                <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thực hiện</span>
                    <span className="text-xs font-extrabold text-slate-800 tabular-nums">
                        {fmt(group.totalActual)}
                    </span>
                </div>
                <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mục tiêu (TAR)</span>
                    <span className="text-xs font-extrabold text-slate-600 tabular-nums">
                        {fmt(group.totalTarget)}
                    </span>
                </div>
                <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Còn lại</span>
                    <span className={`text-xs font-extrabold tabular-nums ${group.totalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {group.totalRemaining >= 0 ? `+${fmt(group.totalRemaining)}` : fmt(group.totalRemaining)}
                    </span>
                </div>
                <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Đạt / Tổng</span>
                    <span className="text-xs font-extrabold tabular-nums">
                        <span className="text-emerald-600">{group.over100Count}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-700">{group.totalPrograms}</span>
                    </span>
                </div>
            </div>

            {/* Danh sách ngành hàng chưa đạt (<100%) */}
            {group.unreachedPrograms.length > 0 ? (
                <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100">
                    <span className="text-[11px] font-black text-rose-800 block mb-1.5 flex items-center justify-between">
                        <span>🎯 Danh sách ngành hàng chưa đạt ({group.unreachedPrograms.length}):</span>
                        <span className="text-[11px] font-bold text-rose-600">
                            {isRealtime ? 'Doanh thu/Số lượng còn thiếu' : '%DKHT & số còn thiếu'}
                        </span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        {group.unreachedPrograms.map(p => {
                            const diff = Math.abs(p.remaining);
                            return (
                                <div key={p.name} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-rose-100">
                                    <span className="font-semibold text-slate-800 truncate max-w-[150px]">{p.name}</span>
                                    <span className="font-black text-rose-700 tabular-nums shrink-0 ml-1">
                                        {isRealtime ? `thiếu ${fmt(diff)}` : `${p.rate}% thiếu ${fmt(diff)}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-center">
                    <span className="text-xs font-bold text-emerald-700">
                        🎉 Tất cả {group.totalPrograms} ngành hàng trong nhóm đều đã đạt chỉ tiêu ≥100%!
                    </span>
                </div>
            )}
        </div>
    );
};
