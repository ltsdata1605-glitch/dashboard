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
    /**
     * Tiến độ chung = TRUNG BÌNH CỘNG %HT của các nhóm.
     *
     * KHÔNG được tính bằng (tổng actual / tổng target) toàn siêu thị: các nhóm có ĐƠN VỊ KHÁC
     * NHAU (SLLK = số lượng *cái*, DTLK/DTQĐ = doanh thu *VNĐ*). Doanh thu cỡ 10^8 còn số lượng
     * cỡ 10^2 nên cộng chung thì nhóm số lượng có trọng số ~0,00005% — tức bị xoá sổ. Bug thật
     * đã gặp: siêu thị đạt SLLK 20% + DTLK 100% được báo "Tiến độ chung 100% — XUẤT SẮC VỀ ĐÍCH
     * TOÀN DIỆN", trong khi cả một tiêu chí đang báo động đỏ. Con số này đi thẳng vào bản tin
     * Zalo gửi toàn siêu thị nên sai là sai ra ngoài.
     *
     * Trung bình cộng cho mỗi nhóm trọng số ngang nhau — đúng tinh thần "mỗi tiêu chí đều phải
     * đạt", và không phụ thuộc vào đơn vị đo.
     */
    overallRate: number;
    reachedGroupsCount: number;
    /** Số nhóm CHƯA phát sinh gì (actual = 0). Nhóm đạt 0,4% KHÔNG tính vào đây. */
    zeroGroupsCount: number;
    totalGroupsCount: number;
    /** Số ngành hàng chưa đạt 100%, cộng trên mọi nhóm. Là phép ĐẾM nên không lệ thuộc đơn vị. */
    unreachedProgramsCount: number;
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
                colorClass: 'text-emerald-700',
                bgClass: 'bg-emerald-50 border-emerald-200'
            };
            commentaryText = `Nhóm đã hoàn thành vượt ${completionRate - 100}% chỉ tiêu, đạt ${over100Count}/${progs.length} ngành hàng. Cần giữ vững phong độ! 👏`;
        } else if (completionRate >= 80) {
            status = 'near';
            statusBadge = {
                sticker: '⚡',
                title: 'Sát nút về đích',
                colorClass: 'text-sky-700',
                bgClass: 'bg-sky-50 border-sky-200'
            };
            const diff = Math.abs(Math.round(groupRemaining));
            commentaryText = `Tiến độ bám sát kế hoạch (${completionRate}%), chỉ còn thiếu ${new Intl.NumberFormat('vi-VN').format(diff)} để về đích. Dồn lực bứt phá! 🚀`;
        } else if (completionRate >= 50) {
            status = 'accelerate';
            statusBadge = {
                sticker: '🔥',
                title: 'Cần tăng tốc',
                colorClass: 'text-amber-700',
                bgClass: 'bg-amber-50 border-amber-200'
            };
            const diff = Math.abs(Math.round(groupRemaining));
            commentaryText = `Đạt ${completionRate}%, còn thiếu ${new Intl.NumberFormat('vi-VN').format(diff)}. Cần tập trung tư vấn chốt đơn cho các ngành hàng chậm. 💪`;
        } else {
            status = 'warning';
            statusBadge = {
                sticker: '⚠️',
                title: 'Báo động đỏ',
                colorClass: 'text-rose-700',
                bgClass: 'bg-rose-50 border-rose-200'
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
    // "Chưa khai thác" = THẬT SỰ chưa phát sinh gì. Trước đây còn bắt cả `completionRate === 0`,
    // nhưng tỷ lệ đó đã qua Math.round nên nhóm đạt 0,4% cũng thành 0 → bị gán oan là chưa làm gì.
    const zeroGroupsCount = groups.filter(g => g.totalActual === 0).length;
    const unreachedProgramsCount = groups.reduce((s, g) => s + g.unreachedPrograms.length, 0);

    // Trung bình cộng %HT các nhóm — xem giải thích dài ở khai báo `overallRate` trong interface.
    const overallRate = totalGroupsCount > 0
        ? Math.round(groups.reduce((s, g) => s + g.completionRate, 0) / totalGroupsCount)
        : 0;

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
        overallRate,
        reachedGroupsCount,
        zeroGroupsCount,
        totalGroupsCount,
        unreachedProgramsCount,
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
