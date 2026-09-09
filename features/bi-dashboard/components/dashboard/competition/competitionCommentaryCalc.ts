import { parseNumber, shortenName } from '../../../utils/dashboardHelpers';
import type { ProcessedProgram } from '../CompetitionView';
import { 
    isSuperCompetitionActive,
    getProgramEvaluatedCompletion
} from './competitionSortAndCalc';

export interface ProgramStatItem {
    name: string;
    actual: number;
    target: number;
    remaining: number;
    rate: number;
}

export interface GroupCommentary {
    groupKey: string;
    groupIcon: string;
    totalActual: number;
    totalTarget: number;
    totalRemaining: number;
    completionRate: number;
    over100Count: number;
    under100Count: number;
    totalPrograms: number;
    status: 'excellent' | 'near' | 'accelerate' | 'warning';
    statusBadge: {
        sticker: string;
        title: string;
        colorClass: string;
        bgClass: string;
    };
    topPerformers: ProgramStatItem[];
    neededPrograms: ProgramStatItem[];
    unreachedPrograms: ProgramStatItem[];
    commentaryText: string;
}

export interface SupermarketCompetitionCommentary {
    supermarketName: string;
    isRealtime: boolean;
    isSuperMode: boolean;
    groups: GroupCommentary[];
    totalActual: number;
    totalTarget: number;
    totalRemaining: number;
    overallRate: number;
    reachedGroupsCount: number;
    zeroGroupsCount: number;
    totalGroupsCount: number;
    generalAssessment: {
        sticker: string;
        headline: string;
        advice: string;
    };
}

/**
 * Biểu tượng sticker đại diện cho nhóm tiêu chí hoặc ngành hàng
 */
export function getGroupSticker(groupKey: string): string {
    const key = groupKey.toUpperCase();
    if (key.includes('DỊCH VỤ') || key.includes('SIM') || key.includes('THU HỘ')) return '📱';
    if (key.includes('PHỤ KIỆN') || key.includes('P.KIỆN') || key.includes('ĐỒNG HỒ') || key.includes('Đ.HỒ')) return '🎧';
    if (key.includes('GIA DỤNG') || key.includes('GD')) return '🍳';
    if (key.includes('CE') || key.includes('ĐIỆN TỬ') || key.includes('ĐIỆN LẠNH') || key.includes('TIVI')) return '📺';
    if (key.includes('ICT') || key.includes('ĐIỆN THOẠI') || key.includes('LAPTOP')) return '💻';
    if (key.includes('SLLK') || key.includes('SỐ LƯỢNG')) return '📦';
    if (key.includes('DTLK') || key.includes('DOANH THU')) return '💰';
    if (key.includes('DTQĐ') || key.includes('QUY ĐỔI')) return '⭐';
    return '🎯';
}

/**
 * Lấy số liệu Thực hiện, Target, Còn lại cho 1 chương trình
 */
export function extractProgramNumbers(
    program: ProcessedProgram,
    headers: string[],
    visibleColumns: string[],
    isRealtime: boolean
): { actual: number; target: number; remaining: number; rate: number } {
    const isSuper = isSuperCompetitionActive(visibleColumns);

    // Cột Thực hiện
    let actualColName = isRealtime
        ? (visibleColumns.find(c => c.startsWith('Realtime') || c === 'THỰC HIỆN') || headers.find(c => c.startsWith('Realtime') || c === 'THỰC HIỆN') || 'Realtime')
        : (visibleColumns.find(c => c.startsWith('L.Kế') || c === 'LUỸ KẾ') || headers.find(c => c.startsWith('L.Kế') || c === 'LUỸ KẾ') || 'L.Kế');

    const actualIdx = headers.indexOf(actualColName);
    const actual = actualIdx !== -1 && program.data[actualIdx] !== undefined 
        ? parseNumber(program.data[actualIdx]) 
        : 0;

    // Cột Target
    let targetColName = isSuper ? 'Target V.Trội' : 'Target';
    let targetIdx = headers.indexOf(targetColName);
    if (targetIdx === -1) {
        targetColName = isSuper ? 'Target' : 'Target V.Trội';
        targetIdx = headers.indexOf(targetColName);
    }
    const target = targetIdx !== -1 && program.data[targetIdx] !== undefined 
        ? parseNumber(program.data[targetIdx]) 
        : 0;

    // Cột Còn Lại
    const remaining = program.conLai !== null && program.conLai !== undefined 
        ? program.conLai 
        : (actual - target);

    // Tỷ lệ % hoàn thành
    const evaluated = getProgramEvaluatedCompletion(program, headers, isSuper, isRealtime, visibleColumns);
    const rate = evaluated.value !== null ? evaluated.value : (target > 0 ? (actual / target) * 100 : 0);

    return { actual, target, remaining, rate };
}

/**
 * Tính toán nhận xét và phân tích chi tiết cho từng nhóm tiêu chí
 */
export function calculateCompetitionCommentary(
    groupedPrograms: Record<string, ProcessedProgram[]>,
    headers: string[],
    visibleColumns: string[],
    isRealtime: boolean,
    supermarketName: string = 'Siêu Thị',
    nameOverrides: Record<string, string> = {}
): SupermarketCompetitionCommentary {
    const isSuperMode = isSuperCompetitionActive(visibleColumns);
    const groupKeys = Object.keys(groupedPrograms);

    let totalSuperActual = 0;
    let totalSuperTarget = 0;
    let totalSuperRemaining = 0;
    let reachedGroupsCount = 0;

    const groups: GroupCommentary[] = groupKeys.map(groupKey => {
        const progs = groupedPrograms[groupKey] || [];
        const groupIcon = getGroupSticker(groupKey);

        let groupActual = 0;
        let groupTarget = 0;
        let groupRemaining = 0;
        let over100Count = 0;
        let under100Count = 0;

        const programItems: ProgramStatItem[] = progs.map(p => {
            const nums = extractProgramNumbers(p, headers, visibleColumns, isRealtime);
            groupActual += nums.actual;
            groupTarget += nums.target;
            groupRemaining += nums.remaining;

            if (nums.rate >= 100) {
                over100Count++;
            } else {
                under100Count++;
            }

            return {
                name: shortenName(p.name, nameOverrides),
                actual: Math.round(nums.actual),
                target: Math.round(nums.target),
                remaining: Math.round(nums.remaining),
                rate: Math.round(nums.rate)
            };
        });

        const completionRate = groupTarget > 0 
            ? Math.round((groupActual / groupTarget) * 100) 
            : (groupActual > 0 ? 100 : 0);

        totalSuperActual += groupActual;
        totalSuperTarget += groupTarget;
        totalSuperRemaining += groupRemaining;

        if (completionRate >= 100) {
            reachedGroupsCount++;
        }

        // Đánh giá trạng thái
        let status: GroupCommentary['status'];
        let statusBadge: GroupCommentary['statusBadge'];
        let commentaryText: string;

        if (completionRate >= 100) {
            status = 'excellent';
            statusBadge = {
                sticker: '🏆',
                title: 'Xuất sắc về đích',
                colorClass: 'text-emerald-700 dark:text-emerald-300',
                bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
            };
            commentaryText = `Nhóm đã hoàn thành vượt ${completionRate - 100}% chỉ tiêu, đạt ${over100Count}/${progs.length} ngành hàng. Cần giữ vững phong độ! 👏`;
        } else if (completionRate >= 80) {
            status = 'near';
            statusBadge = {
                sticker: '⚡',
                title: 'Sát nút về đích',
                colorClass: 'text-sky-700 dark:text-sky-300',
                bgClass: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
            };
            const diff = Math.abs(Math.round(groupRemaining));
            commentaryText = `Tiến độ bám sát kế hoạch (${completionRate}%), chỉ còn thiếu ${new Intl.NumberFormat('vi-VN').format(diff)} để về đích. Dồn lực bứt phá! 🚀`;
        } else if (completionRate >= 50) {
            status = 'accelerate';
            statusBadge = {
                sticker: '🔥',
                title: 'Cần tăng tốc',
                colorClass: 'text-amber-700 dark:text-amber-300',
                bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            };
            const diff = Math.abs(Math.round(groupRemaining));
            commentaryText = `Đạt ${completionRate}%, còn thiếu ${new Intl.NumberFormat('vi-VN').format(diff)}. Cần tập trung tư vấn chốt đơn cho các ngành hàng chậm. 💪`;
        } else {
            status = 'warning';
            statusBadge = {
                sticker: '⚠️',
                title: 'Báo động đỏ',
                colorClass: 'text-rose-700 dark:text-rose-300',
                bgClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
            };
            const diff = Math.abs(Math.round(groupRemaining));
            commentaryText = `Chỉ mới đạt ${completionRate}%, khoảng cách còn thiếu ${new Intl.NumberFormat('vi-VN').format(diff)}. Cần rà soát lại phương án tiếp cận khách hàng! 🚨`;
        }

        // Tìm top hoàn thành tốt và toàn bộ danh sách cần kéo số
        const sortedByRate = [...programItems].sort((a, b) => b.rate - a.rate);
        const topPerformers = sortedByRate.filter(p => p.rate >= 100).slice(0, 3);
        const unreachedPrograms = [...programItems]
            .filter(p => p.rate < 100)
            .sort((a, b) => a.remaining - b.remaining); // âm nhiều nhất lên trước
        const neededPrograms = unreachedPrograms.slice(0, 3);

        return {
            groupKey,
            groupIcon,
            totalActual: Math.round(groupActual),
            totalTarget: Math.round(groupTarget),
            totalRemaining: Math.round(groupRemaining),
            completionRate,
            over100Count,
            under100Count,
            totalPrograms: progs.length,
            status,
            statusBadge,
            topPerformers,
            neededPrograms,
            unreachedPrograms,
            commentaryText
        };
    });

    const totalGroupsCount = groups.length;
    const zeroGroupsCount = groups.filter(g => g.totalActual === 0 || g.completionRate === 0).length;
    const overallRate = totalSuperTarget > 0 
        ? Math.round((totalSuperActual / totalSuperTarget) * 100) 
        : (totalSuperActual > 0 ? 100 : 0);

    // Đánh giá chung toàn siêu thị
    let generalAssessment: SupermarketCompetitionCommentary['generalAssessment'];
    if (overallRate >= 100) {
        generalAssessment = {
            sticker: '🏆',
            headline: 'SIÊU THỊ ĐÃ XUẤT SẮC VỀ ĐÍCH TOÀN DIỆN!',
            advice: 'Tinh thần chiến binh rực lửa! Tiếp tục đẩy mạnh cross-sell gia tăng thu nhập cho nhân viên.'
        };
    } else if (overallRate >= 85) {
        generalAssessment = {
            sticker: '🚀',
            headline: 'TIẾN ĐỘ BÁM RẤT SÁT MỤC TIÊU!',
            advice: 'Chỉ còn cách vạch đích một khoảng ngắn. Tập trung dứt điểm các nhóm còn thiếu để bảo toàn kết quả.'
        };
    } else if (overallRate >= 60) {
        generalAssessment = {
            sticker: '🔥',
            headline: 'CẦN QUYẾT LIỆT TĂNG TỐC VỀ ĐÍCH!',
            advice: 'Phân ca tập trung khai thác khách hàng giờ vàng, đốc thúc bán kèm phụ kiện và dịch vụ ngay quầy.'
        };
    } else {
        generalAssessment = {
            sticker: '🚨',
            headline: 'CẢNH BÁO: TIẾN ĐỘ ĐANG CHẬM SO VỚI QUỸ THỜI GIAN!',
            advice: 'Quản lý cần họp nhanh đầu ca, gán chỉ tiêu chi tiết tới từng bạn nhân viên để xoay chuyển tình thế!'
        };
    }

    return {
        supermarketName,
        isRealtime,
        isSuperMode,
        groups,
        totalActual: Math.round(totalSuperActual),
        totalTarget: Math.round(totalSuperTarget),
        totalRemaining: Math.round(totalSuperRemaining),
        overallRate,
        reachedGroupsCount,
        zeroGroupsCount,
        totalGroupsCount,
        generalAssessment
    };
}

/**
 * Tạo bản tin văn bản Zalo / Telegram rút gọn, tinh tế kèm sticker sinh động để copy nhanh
 */
export function generateZaloCommentaryMessage(data: SupermarketCompetitionCommentary): string {
    const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.ceil(val));
    const modeLabel = data.isRealtime ? 'REALTIME' : 'LUỸ KẾ';
    const targetLabel = data.isSuperMode ? 'VƯỢT TRỘI' : 'CƠ BẢN';

    const lines: string[] = [];
    lines.push(`🔥 BẢN TIN ĐÁNH GIÁ THI ĐUA ${data.supermarketName.toUpperCase()} 🎯`);
    lines.push(`⏰ Chế độ: ${modeLabel} | Target: ${targetLabel}`);
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`📊 TỔNG QUAN THI ĐUA:`);
    lines.push(`• Tiến độ chung: ${data.overallRate}% ${data.generalAssessment.sticker}`);
    lines.push(`• Nhóm đạt ≥100%: ${data.reachedGroupsCount}/${data.totalGroupsCount} nhóm`);
    lines.push(`• Nhóm chưa khai thác: ${data.zeroGroupsCount}/${data.totalGroupsCount} nhóm`);
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`📋 PHÂN TÍCH CHI TIẾT THEO NHÓM TIÊU CHÍ:`);

    data.groups.forEach((g, idx) => {
        lines.push(``);
        lines.push(`${idx + 1}. ${g.groupIcon} ${g.groupKey.toUpperCase()}: ${g.over100Count}/${g.totalPrograms}  (>100%)`);
        
        if (g.unreachedPrograms.length === 0) {
            lines.push(`   - Tất cả ngành hàng đều đã đạt chỉ tiêu! 🎉`);
        } else {
            g.unreachedPrograms.forEach(p => {
                const diff = Math.abs(p.remaining);
                if (data.isRealtime) {
                    lines.push(`   - ${p.name}: thiếu ${fmt(diff)}`);
                } else {
                    lines.push(`   - ${p.name}: ${p.rate}% thiếu ${fmt(diff)}`);
                }
            });
        }
    });

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`💪 TOÀN THỂ ANH EM SIÊU THỊ CÙNG DỒN LỰC VỀ ĐÍCH NHÉ! 🚀🏆`);

    return lines.join('\n');
}
