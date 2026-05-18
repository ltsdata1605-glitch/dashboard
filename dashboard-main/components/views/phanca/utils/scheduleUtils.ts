
import { StaffMember, StaffStats, Solution, ScheduleConfig, ScheduleTargets, BusySchedule, EditShiftModalInfo, ScheduleInfo, SolutionAction, BalancingFeedback, MonthlyStats } from '../types';
import { HOURS_CONFIG } from '../constants';

export const calculateTotalHours = (staff: StaffMember): number => {
    let total = 0;
    staff.schedule.forEach(info => {
        if (info && info.shift && info.shift !== 'OFF') {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) {
                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
            }
        }
    });
    return total;
};

export const calculateSpecialHours = (staff: StaffMember, includeTn: boolean = true): number => {
    let total = 0;
    staff.schedule.forEach(info => {
        if (info && info.role && (info.role.includes('(GH)') || info.role.includes('(Kho)') || (includeTn && info.role.includes('(TN)')))) {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) {
                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
            }
        }
    });
    return total;
};

export const calculateNormalHours = (staff: StaffMember): number => {
    let total = 0;
    staff.schedule.forEach(info => {
        if (info && info.role && info.role !== 'OFF' && !info.role.includes('(')) {
             const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) {
                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
            }
        }
    });
    return total;
};

export const calculateGhHours = (staff: StaffMember): number => {
    let total = 0;
    staff.schedule.forEach(info => {
        if (info && info.role && info.role.includes('(GH)')) {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) {
                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
            }
        }
    });
    return total;
};

export const calculateKhoHours = (staff: StaffMember): number => {
    let total = 0;
    staff.schedule.forEach(info => {
        if (info && info.role && info.role.includes('(Kho)')) {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) {
                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
            }
        }
    });
    return total;
};

export const calculateTnHours = (staff: StaffMember): number => {
    let total = 0;
    staff.schedule.forEach(info => {
        if (info && info.role && info.role.includes('(TN)')) {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) {
                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
            }
        }
    });
    return total;
};

export const recalculateStatsForStaff = (staff: StaffMember): StaffStats => {
  const newStats: StaffStats = {
    gh: 0, kho: 0, tn: 0, offDays: 0,
    swapCount: staff.stats.swapCount,
  };
  staff.schedule.forEach(info => {
    if (info) {
      if (info.role.includes('(GH)')) newStats.gh++;
      if (info.role.includes('(Kho)')) newStats.kho++;
      if (info.role.includes('(TN)')) newStats.tn++;
      if (info.role === 'OFF') newStats.offDays++;
    }
  });
  return newStats;
};

// Helper xác định ngày cuối tuần
const isWeekend = (year: number, month: number, startDay: number, dayIndex: number) => {
    const date = new Date(year, month - 1, startDay + dayIndex - 1);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

/**
 * Thuật toán Cân bằng SBH Đa tầng (Refined version)
 * Cập nhật mới: Ưu tiên cân bằng công bằng vào cuối tuần (Sales Protection)
 */
export const autoRefineSchedule = (staffList: StaffMember[], config: ScheduleConfig, targets?: ScheduleTargets): StaffMember[] => {
    let refinedList = JSON.parse(JSON.stringify(staffList));
    const includeTn = config.includeTn !== undefined ? config.includeTn : true;
    
    // Fix: Mở rộng phạm vi cân bằng cho tất cả nhân viên vận hành (giống logic lúc phân ca)
    // Thay vì chỉ lọc "All In One", ta lọc loại trừ các bộ phận quản lý/tiếp đón
    const allInOneStaff = refinedList.filter((s: StaffMember) => 
        !s.department.toLowerCase().includes('quản lý') && 
        !s.department.toLowerCase().includes('trưởng ca') &&
        !s.department.toLowerCase().includes('tiếp đón') &&
        !s.department.toLowerCase().includes('kế toán')
    );
    
    if (allInOneStaff.length < 2) return refinedList;

    const { year, month, startDay, duration } = config;

    const refreshAllStats = () => {
        refinedList.forEach((s: StaffMember) => { s.stats = recalculateStatsForStaff(s); });
    };

    // Helper: Kiểm tra xem ca làm việc có phải là ca đặc biệt (SBH) không
    const isSpecial = (s: ScheduleInfo | null) => s && (s.role.includes('(GH)') || s.role.includes('(Kho)') || s.role.includes('(TN)'));
    const MIN_GAP = 2; // Yêu cầu cách ít nhất 2 ngày

    // Helper: Kiểm tra xem nếu đặt một ca Special vào ngày dayIdx thì có an toàn không (có vi phạm khoảng cách không)
    // ignoreDayIdx: Bỏ qua ngày này khi kiểm tra (dùng khi chúng ta đang định di chuyển ca từ ignoreDayIdx sang dayIdx)
    const isSafeForSpecial = (staff: StaffMember, dayIdx: number, ignoreDayIdx?: number) => {
        for (let k = 1; k <= MIN_GAP; k++) {
            const prev = staff.schedule[dayIdx - k];
            const next = staff.schedule[dayIdx + k];
            
            // Nếu ngày kiểm tra trùng với ignoreDayIdx (ngày đang chứa ca special mà ta định chuyển đi), thì coi như ngày đó trống/an toàn
            if (dayIdx - k !== ignoreDayIdx && isSpecial(prev)) return false;
            if (dayIdx + k !== ignoreDayIdx && isSpecial(next)) return false;
        }
        return true;
    };

    /**
     * BƯỚC 1 & 2: CÂN BẰNG SỐ LƯỢNG (QUANTITY BALANCING)
     * Đảm bảo tổng số ca GH/Kho/TN của mọi người là ngang nhau.
     */
    const balanceSpecificRole = (roleTag: 'GH' | 'Kho' | 'TN', targetGender: 'Nam' | 'Nu' | 'All') => {
        const statKey = roleTag.toLowerCase() as keyof StaffStats;
        const candidates = allInOneStaff.filter((s: StaffMember) => targetGender === 'All' || s.gender === targetGender);
        
        if (candidates.length < 2) return;

        // Tăng số vòng lặp để tìm kiếm sâu hơn
        for (let pass = 0; pass < 30; pass++) {
            refreshAllStats();
            candidates.sort((a, b) => b.stats[statKey] - a.stats[statKey]);

            const high = candidates[0];
            const low = candidates[candidates.length - 1];

            // Chấp nhận chênh lệch tối đa 1 ca.
            if (high.stats[statKey] - low.stats[statKey] <= 1) break;

            let swapped = false;

            // Duyệt ngẫu nhiên hoặc từ đầu để tránh dồn cục
            const days = Array.from({length: duration}, (_, i) => i + 1);

            // 1. Cố gắng đổi ca giữ nguyên shift
            for (const d of days) {
                const hSched = high.schedule[d];
                const lSched = low.schedule[d];

                if (
                    hSched && hSched.role.includes(`(${roleTag})`) &&
                    lSched && !lSched.role.includes('(') && lSched.role !== 'OFF' &&
                    hSched.shift === lSched.shift
                ) {
                    const maxAllowed = targets ? (targets[statKey as keyof ScheduleTargets] as number || Infinity) : Infinity;
                    const isForced = high.stats[statKey] > maxAllowed;
                    
                    if (!isForced && !isSafeForSpecial(low, d)) continue;

                    high.schedule[d]!.role = hSched.shift;
                    low.schedule[d]!.role = `${lSched.shift} (${roleTag})`;
                    swapped = true;
                    break; 
                }
            }

            // 2. Nếu không được, chấp nhận đổi chéo shift để đạt được sự cân bằng
            if (!swapped) {
                for (const d of days) {
                    const hSched = high.schedule[d];
                    const lSched = low.schedule[d];

                    if (
                        hSched && hSched.role.includes(`(${roleTag})`) &&
                        lSched && !lSched.role.includes('(') && lSched.role !== 'OFF'
                    ) {
                        const maxAllowed = targets ? (targets[statKey as keyof ScheduleTargets] as number || Infinity) : Infinity;
                        const isForced = high.stats[statKey] > maxAllowed;

                        if (!isForced && !isSafeForSpecial(low, d)) continue;

                        const hShift = hSched.shift;
                        const lShift = lSched.shift;

                        high.schedule[d] = { shift: lShift, role: lShift, isManual: true };
                        low.schedule[d] = { shift: hShift, role: `${hShift} (${roleTag})`, isManual: true };
                        swapped = true;
                        break; 
                    }
                }
            }

            if (!swapped) break;
        }
    };

    /**
     * BƯỚC MỚI: BẢO VỆ QUYỀN LỢI CUỐI TUẦN (WEEKEND FAIRNESS)
     * Đảm bảo không ai bị làm Kho/GH quá nhiều vào T7/CN.
     */
    const balanceWeekendFairness = () => {
        // Đếm số ca đặc biệt vào cuối tuần của mỗi người
        const countWeekendSpecial = (staff: StaffMember) => {
            let count = 0;
            for (let d = 1; d <= duration; d++) {
                if (isWeekend(year, month, startDay, d)) {
                    if (staff.schedule[d]?.role.includes('(')) count++;
                }
            }
            return count;
        };

        for (let pass = 0; pass < 10; pass++) {
            allInOneStaff.sort((a, b) => countWeekendSpecial(b) - countWeekendSpecial(a));
            const sufferingStaff = allInOneStaff[0]; // Người làm cuối tuần nhiều nhất
            const luckyStaff = allInOneStaff[allInOneStaff.length - 1]; // Người làm cuối tuần ít nhất

            if (countWeekendSpecial(sufferingStaff) - countWeekendSpecial(luckyStaff) <= 1) break;

            let swapped = false;
            // Tìm một ngày cuối tuần mà SufferingStaff đang làm Support, còn LuckyStaff làm thường
            for (let d = 1; d <= duration; d++) {
                if (!isWeekend(year, month, startDay, d)) continue;

                const sSched = sufferingStaff.schedule[d];
                const lSched = luckyStaff.schedule[d];

                // Logic đổi: Đẩy vai trò Support từ người khổ sang người sướng
                // Điều kiện: Cùng mã ca, Suffering đang làm Support, Lucky đang rảnh (ca thường)
                if (
                    sSched && sSched.role.includes('(') &&
                    lSched && !lSched.role.includes('(') && lSched.role !== 'OFF' &&
                    sSched.shift === lSched.shift
                ) {
                    // Check logic giới tính: Nếu là GH thì LuckyStaff phải là Nam
                    const roleTag = sSched.role.match(/\(([^)]+)\)/)?.[1]; // GH, Kho, TN
                    if (roleTag === 'GH' && luckyStaff.gender !== 'Nam') continue;

                    // Nếu là Kho, chỉ đổi cùng giới tính để đảm bảo cân bằng số lượng Kho theo giới tính
                    if (roleTag === 'Kho' && sufferingStaff.gender !== luckyStaff.gender) continue;

                    // Kiểm tra an toàn khoảng cách cho người nhận (luckyStaff)
                    if (!isSafeForSpecial(luckyStaff, d)) continue;

                    // Swap role
                    sufferingStaff.schedule[d]!.role = sSched.shift;
                    luckyStaff.schedule[d]!.role = `${lSched.shift} (${roleTag})`;
                    
                    swapped = true;
                    break;
                }
            }
            if (!swapped) break;
        }
    };

    /**
     * BƯỚC MỚI: PHÂN BỔ ĐỀU CÁC NGÀY TRONG TUẦN (DAY OF WEEK BALANCING)
     * Tránh việc một người luôn phải làm Support vào thứ 2, hoặc thứ 3...
     */
    const balanceDayOfWeekDistribution = () => {
        // Helper lấy thứ trong tuần (0: CN, 1: T2, ..., 6: T7)
        const getDayOfWeek = (d: number) => new Date(year, month - 1, startDay + d - 1).getDay();

        // Duyệt qua từng thứ trong tuần (0 -> 6)
        for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
            // Đếm số ca đặc biệt của mỗi người vào thứ này
            const countSpecialOnDay = (staff: StaffMember) => {
                let count = 0;
                for (let d = 1; d <= duration; d++) {
                    if (getDayOfWeek(d) === dayOfWeek) {
                        if (staff.schedule[d]?.role.includes('(')) count++;
                    }
                }
                return count;
            };

            // Cố gắng cân bằng cho thứ này
            for (let pass = 0; pass < 5; pass++) {
                allInOneStaff.sort((a, b) => countSpecialOnDay(b) - countSpecialOnDay(a));
                const overloaded = allInOneStaff[0];
                const underloaded = allInOneStaff[allInOneStaff.length - 1];

                if (countSpecialOnDay(overloaded) - countSpecialOnDay(underloaded) <= 1) break;

                let swapped = false;
                // Tìm một ngày (có thứ = dayOfWeek) để đổi
                for (let d = 1; d <= duration; d++) {
                    if (getDayOfWeek(d) !== dayOfWeek) continue;

                    const oSched = overloaded.schedule[d];
                    const uSched = underloaded.schedule[d];

                    // Logic đổi: Overloaded nhả Support cho Underloaded
                    if (
                        oSched && oSched.role.includes('(') &&
                        uSched && !uSched.role.includes('(') && uSched.role !== 'OFF' &&
                        oSched.shift === uSched.shift
                    ) {
                        const roleTag = oSched.role.match(/\(([^)]+)\)/)?.[1]; // GH, Kho, TN
                        if (roleTag === 'GH' && underloaded.gender !== 'Nam') continue;

                        // Nếu là Kho, chỉ đổi cùng giới tính
                        if (roleTag === 'Kho' && overloaded.gender !== underloaded.gender) continue;

                        // Kiểm tra an toàn khoảng cách cho người nhận (underloaded)
                        if (!isSafeForSpecial(underloaded, d)) continue;

                        overloaded.schedule[d]!.role = oSched.shift;
                        underloaded.schedule[d]!.role = `${uSched.shift} (${roleTag})`;
                        swapped = true;
                        break;
                    }
                }
                if (!swapped) break;
            }
        }
    };

    /**
     * BƯỚC MỚI: ĐẢM BẢO KHOẢNG CÁCH GIỮA CÁC CA SBH (GH/Kho/TN)
     * Yêu cầu: Không làm liên tiếp, tốt nhất là cách ít nhất 2 ngày.
     * Cập nhật: Sử dụng chiến thuật Self-Swap (đổi ngày làm của chính mình) và Peer-Swap (đổi với người khác) mạnh mẽ hơn.
     */
    const ensureSpecialShiftSpacing = () => {
        for (let pass = 0; pass < 10; pass++) { 
            let hasChange = false;
            const shuffledStaff = [...allInOneStaff].sort(() => Math.random() - 0.5);

            for (const staff of shuffledStaff) {
                for (let d = 1; d <= duration; d++) {
                    if (!isSpecial(staff.schedule[d])) continue;

                    // Nếu ngày hiện tại vi phạm khoảng cách (quá gần ca special khác)
                    if (!isSafeForSpecial(staff, d)) {
                        let fixed = false;

                        // CHIẾN THUẬT: PEER-SWAP (Đổi với người khác)
                        // Tìm người khác có thể nhận ca Special này vào ngày d
                        for (const partner of shuffledStaff) {
                            if (partner.id === staff.id) continue;
                            
                            const pSched = partner.schedule[d];
                            // Partner phải đang làm ca thường
                            if (pSched && !pSched.role.includes('(') && pSched.role !== 'OFF') {
                                // Kiểm tra xem Partner nhận Special vào ngày d có an toàn không
                                if (isSafeForSpecial(partner, d)) {
                                    // Check giới tính nếu là GH
                                    const roleTag = staff.schedule[d].role.match(/\(([^)]+)\)/)?.[1];
                                    if (roleTag === 'GH' && partner.gender !== 'Nam') continue;

                                    // Nếu là Kho, chỉ đổi cùng giới tính
                                    if (roleTag === 'Kho' && staff.gender !== partner.gender) continue;

                                    // Tráo đổi ca làm việc của 2 người tại ngày d
                                    const temp = { ...staff.schedule[d] };
                                    staff.schedule[d] = { ...partner.schedule[d] };
                                    partner.schedule[d] = temp;

                                    fixed = true;
                                    hasChange = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            if (!hasChange) break;
        }
    };

    /**
     * BƯỚC MỚI: PHÁ VỠ RẬP KHUÔN GIỜ (TIME DISTRIBUTION)
     * Cố gắng đảo ca Support giữa Sáng và Chiều nếu có thể
     * (Vd: A toàn làm Kho sáng, B toàn làm Kho chiều -> Đổi cho nhau 1 ít)
     */
    const balanceTimeDistribution = (roleTag: 'GH' | 'Kho', targetGender: 'Nam' | 'Nu' | 'All' = 'All') => {
        const candidates = allInOneStaff.filter(s => {
            if (roleTag === 'GH' && s.gender !== 'Nam') return false;
            if (targetGender !== 'All' && s.gender !== targetGender) return false;
            return true;
        });
        const THRESHOLD = 2; // Chấp nhận lệch tối đa 2 ca (VD: 4 sáng - 2 chiều)

        for (let pass = 0; pass < 10; pass++) {
            let hasAction = false;
            const imbalanceMap = new Map<string, { morning: number, afternoon: number, diff: number }>();

            // 1. Tính toán độ lệch Sáng/Chiều
            candidates.forEach(staff => {
                let morning = 0;
                let afternoon = 0;
                for (let d = 1; d <= duration; d++) {
                    const r = staff.schedule[d]?.role;
                    if (r && r.includes(`(${roleTag})`)) {
                        // Giả định ca sáng chứa 1,2,3; ca chiều chứa 4,5,6
                        if (r.includes('1') || r.includes('2') || r.includes('3')) morning++;
                        else if (r.includes('4') || r.includes('5') || r.includes('6')) afternoon++;
                    }
                }
                imbalanceMap.set(staff.id, { morning, afternoon, diff: morning - afternoon });
            });

            // 2. Sắp xếp người bị lệch nhiều nhất lên đầu
            candidates.sort((a, b) => Math.abs(imbalanceMap.get(b.id)!.diff) - Math.abs(imbalanceMap.get(a.id)!.diff));
            
            const mostImbalanced = candidates[0];
            const info = imbalanceMap.get(mostImbalanced.id)!;

            if (Math.abs(info.diff) <= THRESHOLD) break; // Đã cân bằng tương đối

            const isHeavyMorning = info.diff > 0; // Dư sáng -> Cần nhả Sáng hoặc nhận Chiều
            
            // 3. Tìm cơ hội đổi
            for (let d = 1; d <= duration; d++) {
                const sSched = mostImbalanced.schedule[d];
                // Chỉ xét ngày đang làm Support loại này
                if (!sSched || !sSched.role.includes(`(${roleTag})`)) continue;

                const isMorningShift = ['1','2','3'].some(c => sSched.shift.includes(c));
                const isAfternoonShift = ['4','5','6'].some(c => sSched.shift.includes(c));

                // Nếu đang dư Sáng, chỉ tìm ngày mình làm Support Sáng để đẩy đi
                // Nếu đang dư Chiều, chỉ tìm ngày mình làm Support Chiều để đẩy đi
                if ((isHeavyMorning && !isMorningShift) || (!isHeavyMorning && !isAfternoonShift)) continue;

                // Tìm đối tác đổi
                for (const partner of candidates) {
                    if (partner.id === mostImbalanced.id) continue;
                    
                    const pSched = partner.schedule[d];
                    // Đối tác phải làm cùng ca (Shift) nhưng đang rảnh (không làm Support)
                    if (!pSched || pSched.shift !== sSched.shift || pSched.role.includes('(') || pSched.role === 'OFF') continue;

                    const pInfo = imbalanceMap.get(partner.id)!;
                    
                    // Đánh giá: Nếu đổi thì đối tác có tốt lên (hoặc không tệ đi) không?
                    // Nếu MostImbalanced nhả Sáng cho Partner:
                    // Partner: Morning tăng 1. Diff (M-A) tăng 1.
                    // Nếu Partner đang thiếu Sáng (Diff < 0) -> Tốt.
                    // Nếu Partner đang cân bằng (Diff ~ 0) -> Chấp nhận được.
                    // Nếu Partner đang dư Sáng (Diff > 0) -> Không nên.

                    const currentPartnerImbalance = Math.abs(pInfo.diff);
                    const newPartnerDiff = pInfo.diff + (isHeavyMorning ? 1 : -1);
                    const newPartnerImbalance = Math.abs(newPartnerDiff);

                    // Chỉ đổi nếu độ lệch của đối tác giảm đi hoặc giữ nguyên (ưu tiên giảm)
                    // Hoặc nếu độ lệch mới vẫn nằm trong ngưỡng an toàn
                    if (newPartnerImbalance < currentPartnerImbalance || newPartnerImbalance <= THRESHOLD) {
                        // Kiểm tra an toàn khoảng cách cho người nhận (partner)
                        if (!isSafeForSpecial(partner, d)) continue;

                        // Thực hiện đổi
                        mostImbalanced.schedule[d]!.role = sSched.shift; // Trở về ca thường
                        partner.schedule[d]!.role = `${sSched.shift} (${roleTag})`; // Nhận Support
                        
                        hasAction = true;
                        break; 
                    }
                }
                if (hasAction) break;
            }
            if (!hasAction) break; // Không tìm được nước đi nào, dừng lại để tránh lặp vô tận
        }
    };

    /**
     * BƯỚC MỚI: NGĂN CHẶN LÀM CA ĐẶC BIỆT CẢ T7 VÀ CN TRONG CÙNG 1 TUẦN
     * Mục tiêu: Mỗi nhân viên chỉ nên làm tối đa 1 ca đặc biệt (GH/Kho/TN) vào cuối tuần.
     * Nếu đã làm T7 thì CN nên nghỉ hoặc làm ca thường, và ngược lại.
     */
    const preventWeekendDoubleShift = () => {
        // Duyệt qua từng nhân viên
        for (const staff of allInOneStaff) {
            // Duyệt qua từng tuần
            let currentWeekStart = 1;
            while (currentWeekStart <= duration) {
                // Xác định ngày T7 và CN của tuần này
                let saturday = -1;
                let sunday = -1;
                
                for (let i = 0; i < 7; i++) {
                    const d = currentWeekStart + i;
                    if (d > duration) break;
                    const date = new Date(year, month - 1, startDay + d - 1);
                    const day = date.getDay();
                    if (day === 6) saturday = d;
                    if (day === 0) sunday = d;
                }
                
                // Nếu tuần này có cả T7 và CN nằm trong tháng
                if (saturday !== -1 && sunday !== -1) {
                    const satShift = staff.schedule[saturday];
                    const sunShift = staff.schedule[sunday];
                    
                    // Kiểm tra xem nhân viên có làm ca đặc biệt cả 2 ngày không
                    if (isSpecial(satShift) && isSpecial(sunShift)) {
                        // Cần đổi bớt 1 ngày đi (ưu tiên đổi ngày CN)
                        const dayToSwap = sunday;
                        const shiftToSwap = sunShift!;
                        const roleTag = shiftToSwap.role.match(/\(([^)]+)\)/)?.[1]; // GH, Kho, TN
                        
                        // Tìm người thay thế hợp lệ
                        let swapped = false;
                        for (const partner of allInOneStaff) {
                            if (partner.id === staff.id) continue;
                            
                            // Partner phải:
                            // 1. Không làm ca đặc biệt vào ngày này (đang làm ca thường)
                            // 2. Không làm ca đặc biệt vào ngày còn lại của cuối tuần (để tránh đẩy cái khó cho người khác)
                            const pDayShift = partner.schedule[dayToSwap];
                            const pOtherWeekendShift = partner.schedule[dayToSwap === sunday ? saturday : sunday];
                            
                            if (pDayShift && !isSpecial(pDayShift) && pDayShift.role !== 'OFF' && 
                                (!pOtherWeekendShift || !isSpecial(pOtherWeekendShift))) {
                                
                                // Check các ràng buộc khác
                                if (roleTag === 'GH' && partner.gender !== 'Nam') continue;
                                if (roleTag === 'Kho' && staff.gender !== partner.gender) continue;
                                if (!isSafeForSpecial(partner, dayToSwap)) continue;
                                
                                // Thực hiện đổi
                                staff.schedule[dayToSwap]!.role = shiftToSwap.shift; // Về ca thường
                                partner.schedule[dayToSwap]!.role = `${pDayShift.shift} (${roleTag})`; // Nhận ca đặc biệt
                                
                                swapped = true;
                                break;
                            }
                        }
                    }
                }
                
                currentWeekStart += 7;
            }
        }
    };

    // --- THỰC THI ---

    // 1. Cân bằng số lượng tuyệt đối trước
    balanceSpecificRole('GH', 'Nam');
    balanceSpecificRole('Kho', 'Nam');
    balanceSpecificRole('Kho', 'Nu');
    // Chỉ cân bằng TN riêng lẻ nếu TN không được tính vào SBH tổng
    // Nếu TN tính vào SBH, ta sẽ để bước balanceTotalSpecialLoad phân bổ TN để bù trừ cho GH
    if (!includeTn) {
        balanceSpecificRole('TN', 'All');
    }

    // 2. Tinh chỉnh lại để đảm bảo công bằng cuối tuần (QUAN TRỌNG: Chạy sau để ghi đè)
    balanceWeekendFairness();
    
    // 2.1. Ngăn chặn làm cả T7 và CN (Mới)
    preventWeekendDoubleShift();

    // 2.2. Cân bằng phân bổ các ngày trong tuần (Mới)
    balanceDayOfWeekDistribution();

    // 2.3. Đảm bảo khoảng cách giữa các ca SBH (Mới)
    ensureSpecialShiftSpacing();

    // 2.5. Cân bằng phân bổ Sáng/Chiều (Mới)
    balanceTimeDistribution('Kho', 'Nam');
    balanceTimeDistribution('Kho', 'Nu');

    // 3. Chạy lại cân bằng số lượng nhẹ một lần nữa để đảm bảo bước 2 không làm lệch tổng số quá nhiều
    // Nhưng lần này ưu tiên giữ nguyên các ngày cuối tuần đã fix
    // (Logic trong balanceSpecificRole sẽ tự tìm các ngày thường để bù lại nếu số lượng bị lệch do bước 2)
    balanceSpecificRole('GH', 'Nam');
    balanceSpecificRole('Kho', 'Nam');
    balanceSpecificRole('Kho', 'Nu');

    // 4. Cân bằng tổng thể giờ công (SBH)
    const balanceTotalSpecialLoad = () => {
        // Cân bằng giờ công trung bình giữa Nam và Nữ trước
        for (let pass = 0; pass < 10; pass++) {
            refreshAllStats();
            const nams = allInOneStaff.filter(s => s.gender === 'Nam');
            const nus = allInOneStaff.filter(s => s.gender === 'Nu');
            if (nams.length === 0 || nus.length === 0) break;

            const avgNam = nams.reduce((sum, s) => sum + calculateSpecialHours(s, includeTn), 0) / nams.length;
            const avgNu = nus.reduce((sum, s) => sum + calculateSpecialHours(s, includeTn), 0) / nus.length;
            
            if (Math.abs(avgNam - avgNu) < 1) break;
            
            const isNamOverloaded = avgNam > avgNu;
            const sourceGroup = isNamOverloaded ? nams : nus;
            const targetGroup = isNamOverloaded ? nus : nams;
            
            sourceGroup.sort((a, b) => calculateSpecialHours(b, includeTn) - calculateSpecialHours(a, includeTn));
            targetGroup.sort((a, b) => calculateSpecialHours(a, includeTn) - calculateSpecialHours(b, includeTn));
            
            let swapped = false;
            outerLoop:
            for (const sourceStaff of sourceGroup) {
                for (const targetStaff of targetGroup) {
                    for (let d = 1; d <= duration; d++) {
                        const sSched = sourceStaff.schedule[d];
                        const tSched = targetStaff.schedule[d];
                        
                        if (sSched && (sSched.role.includes('(Kho)') || (includeTn && sSched.role.includes('(TN)'))) &&
                            tSched && !tSched.role.includes('(') && tSched.role !== 'OFF') {
                            const roleTag = sSched.role.match(/\(([^)]+)\)/)?.[1];
                            
                            sourceStaff.schedule[d] = { shift: tSched.shift, role: tSched.shift, isManual: true };
                            targetStaff.schedule[d] = { shift: sSched.shift, role: `${sSched.shift} (${roleTag})`, isManual: true };
                            swapped = true;
                            break outerLoop; 
                        }
                    }
                }
            }
            if (!swapped) break;
        }

        // Cân bằng chi tiết từng cá nhân (Iterative Individual Balancing)
        for (let pass = 0; pass < 30; pass++) {
            refreshAllStats();
            allInOneStaff.sort((a, b) => calculateSpecialHours(b, includeTn) - calculateSpecialHours(a, includeTn));
            const high = allInOneStaff[0];
            const low = allInOneStaff[allInOneStaff.length - 1];
            const currentDiff = calculateSpecialHours(high, includeTn) - calculateSpecialHours(low, includeTn);

            if (currentDiff <= 3) break; // Đạt mục tiêu chênh lệch tối đa 3h

            let swapped = false;
            // Thử đổi ca để giảm chênh lệch
            for (let d = 1; d <= duration; d++) {
                const hSched = high.schedule[d];
                const lSched = low.schedule[d];

                if (hSched && isSpecial(hSched) && lSched && !isSpecial(lSched) && lSched.role !== 'OFF') {
                    const roleTag = hSched.role.match(/\(([^)]+)\)/)?.[1];
                    if (roleTag === 'GH') {
                        if (low.gender !== 'Nam') continue;
                        // KHÔNG CHO PHÉP nếu việc đổi GH làm lố chênh lệch GH đã được cân bằng
                        if (high.stats.gh <= low.stats.gh) continue;
                    }

                    const hHours = hSched.shift.split('').reduce((sum, c) => sum + (HOURS_CONFIG[c] || 0), 0);
                    const lHours = lSched.shift.split('').reduce((sum, c) => sum + (HOURS_CONFIG[c] || 0), 0);
                    
                    // Chỉ đổi nếu chênh lệch mới nhỏ hơn chênh lệch cũ
                    const newH = calculateSpecialHours(high, includeTn) - hHours;
                    const newL = calculateSpecialHours(low, includeTn) + hHours;
                    if (Math.abs(newH - newL) < currentDiff) {
                        high.schedule[d] = { shift: lSched.shift, role: lSched.shift, isManual: true };
                        low.schedule[d] = { shift: hSched.shift, role: `${hSched.shift} (${roleTag})`, isManual: true };
                        swapped = true;
                        break;
                    }
                }
            }
            if (!swapped) break;
        }
    };

    // 4. Thực thi cân bằng tổng thể giờ công
    balanceTotalSpecialLoad();

    /**
     * BƯỚC CUỐI: TINH CHỈNH VÉT CẠN (GREEDY POLISH)
     * Thử mọi cặp nhân viên và mọi ngày để xem có thể đổi ca nhằm giảm độ lệch chuẩn không.
     * Cập nhật: Ưu tiên giảm chênh lệch cực đại (Max - Min) xuống dưới 3h.
     */
    const greedyPolish = () => {
        for (let pass = 0; pass < 20; pass++) {
            let improved = false;
            refreshAllStats();
            allInOneStaff.sort((a, b) => calculateSpecialHours(b, includeTn) - calculateSpecialHours(a, includeTn));
            
            for (let i = 0; i < allInOneStaff.length; i++) {
                for (let j = allInOneStaff.length - 1; j > i; j--) {
                    const sHigh = allInOneStaff[i];
                    const sLow = allInOneStaff[j];
                    
                    const hHigh = calculateSpecialHours(sHigh, includeTn);
                    const hLow = calculateSpecialHours(sLow, includeTn);
                    const currentDiff = hHigh - hLow;
                    
                    if (currentDiff <= 1) continue;

                    for (let d = 1; d <= duration; d++) {
                        const schedHigh = sHigh.schedule[d];
                        const schedLow = sLow.schedule[d];

                        // S1 làm Special, S2 làm thường
                        if (isSpecial(schedHigh) && schedLow && !isSpecial(schedLow) && schedLow.role !== 'OFF') {
                            const roleTag = schedHigh!.role.match(/\(([^)]+)\)/)?.[1];
                            if (roleTag === 'GH') {
                                if (sLow.gender !== 'Nam') continue;
                                // KHÔNG CHO PHÉP nếu việc đổi GH làm lố chênh lệch GH đã được cân bằng
                                if (sHigh.stats.gh <= sLow.stats.gh) continue;
                            }

                            const shiftHours = (schedHigh!.shift.match(/[1-6]/g) || []).reduce((sum, c) => sum + (HOURS_CONFIG[c] || 0), 0);
                            const newDiff = Math.abs((hHigh - shiftHours) - (hLow + shiftHours));
                            
                            if (newDiff < currentDiff) {
                                sHigh.schedule[d] = { shift: schedLow.shift, role: schedLow.shift, isManual: true };
                                sLow.schedule[d] = { shift: schedHigh!.shift, role: `${schedHigh!.shift} (${roleTag})`, isManual: true };
                                improved = true;
                                break;
                            }
                        }
                    }
                    if (improved) break;
                }
                if (improved) break;
            }
            if (!improved) break;
        }
    };

    greedyPolish();

    // Chạy lại ensureSpecialShiftSpacing và preventWeekendDoubleShift một lần cuối để chắc chắn không có vi phạm nào bị tạo ra bởi các bước cân bằng sau
    ensureSpecialShiftSpacing();
    preventWeekendDoubleShift();

    // CHỐT HẠ THEO ƯU TIÊN TUYỆT ĐỐI CỦA NGƯỜI DÙNG:
    // 1. LUÔN LUÔN ƯU TIÊN SỐ NGÀY GIAO HÀNG (GH) CỦA NAM PHẢI BẰNG NHAU HẾT MỨC CÓ THỂ
    balanceSpecificRole('GH', 'Nam');
    // 2. Số ngày làm kho của nữ với nữ tương đương với nhau
    balanceSpecificRole('Kho', 'Nu');

    refreshAllStats();
    return refinedList;
};

export const findBestSolution = (dayIndex: number, roleType: 'gh' | 'kho' | 'tn' | null, allStaff: StaffMember[], excludeEmployeeId: string, includeTn: boolean = true): Solution => {
  let replacementCandidates = allStaff.filter(s => {
    // Chỉ tìm người thay thế trong bộ phận All In One
    if (!s.department.toLowerCase().includes('all in one') || s.id === excludeEmployeeId) return false;
    const schedule = s.schedule[dayIndex];
    return schedule && schedule.role !== 'OFF' && !schedule.role.includes('(') && !schedule.isManual;
  });

  if (roleType === 'gh') replacementCandidates = replacementCandidates.filter(s => s.gender === 'Nam');
  if (replacementCandidates.length === 0) return null;

  replacementCandidates.sort((a, b) => {
    if (roleType) {
        const statDiff = a.stats[roleType] - b.stats[roleType];
        if (statDiff !== 0) return statDiff;
    }
    return calculateSpecialHours(a, includeTn) - calculateSpecialHours(b, includeTn);
  });
  
  return { type: 'replace', staff: replacementCandidates[0] };
};



export const calculateTotalHoursForWeek = (staff: StaffMember, startDay: number, endDay: number): number => {
    let total = 0;
    for (let d = startDay; d <= endDay; d++) {
        if (d >= staff.schedule.length) continue;
        const info = staff.schedule[d];
        if (info && info.role !== 'OFF') {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) { if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char]; }
        }
    }
    return total;
};

export const calculateSpecialHoursForWeek = (staff: StaffMember, startDay: number, endDay: number, includeTn: boolean = true): number => {
    let total = 0;
    for (let d = startDay; d <= endDay; d++) {
        if (d >= staff.schedule.length) continue;
        const info = staff.schedule[d];
        if (info && (info.role.includes('(GH)') || info.role.includes('(Kho)') || (includeTn && info.role.includes('(TN)')))) {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) { if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char]; }
        }
    }
    return total;
};

export const calculateNormalHoursForWeek = (staff: StaffMember, startDay: number, endDay: number): number => {
    let total = 0;
    for (let d = startDay; d <= endDay; d++) {
        if (d >= staff.schedule.length) continue;
        const info = staff.schedule[d];
        if (info && info.role !== 'OFF' && !info.role.includes('(')) {
            const cleanStr = info.shift.replace(/[^0-9]/g, '');
            for (const char of cleanStr) { if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char]; }
        }
    }
    return total;
};

export const recalculateStatsForWeek = (staff: StaffMember, startDay: number, endDay: number): StaffStats => {
  const weeklyStats: StaffStats = { gh: 0, kho: 0, tn: 0, offDays: 0, swapCount: 0 };
  for (let d = startDay; d <= endDay; d++) {
    if (d >= staff.schedule.length) continue;
    const info = staff.schedule[d];
    if (info) {
      if (info.role.includes('(GH)')) weeklyStats.gh++;
      if (info.role.includes('(Kho)')) weeklyStats.kho++;
      if (info.role.includes('(TN)')) weeklyStats.tn++;
      if (info.role === 'OFF') weeklyStats.offDays++;
    }
  }
  return weeklyStats;
};

export const isContiguous = (shiftCode: string): boolean => {
    if (!shiftCode || !/^\d+$/.test(shiftCode)) return true;
    const digits = shiftCode.split('').map(Number).sort((a, b) => a - b);
    for (let i = 0; i < digits.length - 1; i++) {
        if (digits[i + 1] !== digits[i] + 1) return false;
    }
    return true;
};

export const findAutomaticReplacement = (shiftToCover: string, dayIndex: number, allStaff: StaffMember[], excludeId: string, busySchedule: BusySchedule, includeTn: boolean = true): SolutionAction[] | null => {
    const vacantDigits = new Set(shiftToCover.split('').filter(d => /\d/.test(d)));
    if (vacantDigits.size === 0) return null;

    const potentialPartners = allStaff.filter(s => {
        if (s.id === excludeId) return false;
        const busyStatus = busySchedule[s.id]?.[dayIndex];
        if (busyStatus === 'off') return false;
        const sched = s.schedule[dayIndex];
        return sched && !sched.role.includes('(') && !sched.isManual;
    }).sort((a, b) => calculateSpecialHours(a, includeTn) - calculateSpecialHours(b, includeTn));

    const findSplitCover = (partners: StaffMember[], required: Set<string>): SolutionAction[] | null => {
        if (required.size === 0) return [];
        if (partners.length === 0) return null;
        const partner = partners[0];
        const remainingPartners = partners.slice(1);
        const originalShift = partner.schedule[dayIndex]!.shift;
        const originalDigits = new Set(originalShift.split(''));
        const canContribute = new Set([...required].filter(d => !originalDigits.has(d)));
        const canContributeArr = Array.from(canContribute);
        for (let i = 1; i < (1 << canContributeArr.length); i++) {
            const subset = new Set<string>();
            for (let j = 0; j < canContributeArr.length; j++) if ((i >> j) & 1) subset.add(canContributeArr[j]);
            const potentialNewDigits = new Set([...originalDigits, ...subset]);
            const potentialNewCode = Array.from(potentialNewDigits).sort().join('');
            if (isContiguous(potentialNewCode)) {
                const newRequired = new Set(required);
                subset.forEach(d => newRequired.delete(d));
                const subSolution = findSplitCover(remainingPartners, newRequired);
                if (subSolution !== null) {
                    return [{ staff: partner, originalShift: partner.schedule[dayIndex]!, newShift: { shift: potentialNewCode, role: potentialNewCode } }, ...subSolution];
                }
            }
        }
        return findSplitCover(remainingPartners, required);
    };
    return findSplitCover(potentialPartners, vacantDigits);
};

export const generateBalancingFeedback = (currentStats: MonthlyStats, previousStats: MonthlyStats): BalancingFeedback => {
    const reduced: string[] = [];
    const increased: string[] = [];
    const staffIds = Object.keys(currentStats);
    if (staffIds.length === 0) return { reduced: [], increased: [], message: '' };
    let totalAll = 0;
    staffIds.forEach(id => totalAll += currentStats[id].totalSpecialHours);
    const avg = totalAll / staffIds.length;
    staffIds.forEach(id => {
        const stat = currentStats[id];
        if (stat.totalSpecialHours > avg * 1.1) reduced.push(id.split(' - ')[1] || id);
        else if (stat.totalSpecialHours < avg * 0.9) increased.push(id.split(' - ')[1] || id);
    });
    return { reduced, increased, message: `Hệ thống đã tự động cân bằng giờ công dựa trên định mức nhân sự.` };
};
