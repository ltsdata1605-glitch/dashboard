
import { StaffMember, ScheduleConfig, ScheduleTargets, SchedulingRules, StaffInitialData, BusySchedule, MonthlyStats } from '../types';
import { HOURS_CONFIG } from '../constants';
import { calculateSpecialHours } from '../utils/scheduleUtils';

// Hàm xoay mảng
function rotateArray<T,>(arr: T[], count: number): T[] {
    const len = arr.length;
    if (len === 0) return [];
    const shift = count % len;
    if (shift === 0) return [...arr];
    return [...arr.slice(shift), ...arr.slice(0, shift)];
}

// KHỞI TẠO DANH SÁCH
function initStaffList(
    nams: StaffInitialData[], 
    nus: StaffInitialData[], 
    duration: number, 
    rotationSeed: number
): StaffMember[] {
    let staffList: StaffMember[] = [];
    const namsRotated = rotateArray(nams, rotationSeed);
    const nusRotated = rotateArray(nus, rotationSeed);
    let maxLength = Math.max(namsRotated.length, nusRotated.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < namsRotated.length) {
            const staffData = namsRotated[i];
            staffList.push({ 
                id: staffData.name,
                name: staffData.name, 
                department: staffData.department,
                gender: 'Nam', 
                stats: {gh:0, kho:0, tn:0, offDays: 0, swapCount: 0}, 
                schedule: Array(duration + 1).fill(null),
                changeHistory: [],
                importIndex: staffData.importIndex
            });
        }
        if (i < nusRotated.length) {
            const staffData = nusRotated[i];
            staffList.push({ 
                id: staffData.name,
                name: staffData.name, 
                department: staffData.department,
                gender: 'Nu', 
                stats: {gh:0, kho:0, tn:0, offDays: 0, swapCount: 0}, 
                schedule: Array(duration + 1).fill(null),
                changeHistory: [],
                importIndex: staffData.importIndex
            });
        }
    }
    return staffList;
}

// Thuật toán phân ca
function generateSchedule(
    initialStaffList: StaffMember[], 
    config: ScheduleConfig,
    targets: ScheduleTargets,
    rules: SchedulingRules,
    departmentPatterns: { [key: string]: string[] },
    busySchedule: BusySchedule,
    previousMonthStats: MonthlyStats
): StaffMember[] {
    let staffList = JSON.parse(JSON.stringify(initialStaffList));
    const { year, month, startDay, duration } = config;
    const morningRegex = /[123]/;
    const afternoonRegex = /[456]/;

    // B1: Gán ca cơ bản theo Pattern
    staffList.forEach((staff: StaffMember, staffIndex: number) => {
        const staffPattern = departmentPatterns[staff.department] || [];
        const patternLength = staffPattern.length;
        for (let d = 1; d <= duration; d++) {
            const busyStatus = busySchedule[staff.id]?.[d];
            if (busyStatus === 'off') {
                staff.schedule[d] = { shift: 'OFF', role: 'OFF' };
                continue;
            }
            if (patternLength === 0) {
                staff.schedule[d] = { shift: '', role: '' };
                continue;
            }
            let patternIndex = (staffIndex + d) % patternLength; 
            let rawShift = staffPattern[patternIndex];
            const isMorningShift = morningRegex.test(rawShift);
            const isAfternoonShift = afternoonRegex.test(rawShift);
            const hasConflict = (busyStatus === 'morning' && isMorningShift) || (busyStatus === 'afternoon' && isAfternoonShift);
            if (hasConflict) {
                staff.schedule[d] = { shift: 'OFF', role: 'OFF' };
            } else {
                staff.schedule[d] = { shift: rawShift, role: rawShift };
            }
        }
    });

    // CHỈ áp dụng ca đặc biệt cho nhân viên thuộc bộ phận có chứa "All In One" hoặc các bộ phận vận hành (loại trừ Quản lý/Tiếp đón nếu cần thiết, nhưng hiện tại mở rộng để bắt các bộ phận khác)
    // Fix: Loại bỏ điều kiện bắt buộc phải có chữ "All In One" để các bộ phận khác (như Kho, Bán hàng) cũng được phân ca GH/Kho/TN
    const targetStaff = staffList.filter(s => 
        departmentPatterns[s.department]?.length > 0 && 
        !s.department.toLowerCase().includes('quản lý') && 
        !s.department.toLowerCase().includes('trưởng ca') &&
        !s.department.toLowerCase().includes('tiếp đón')
    );
    staffList.forEach(s => { s.stats.gh = 0; s.stats.kho = 0; s.stats.tn = 0; });

    // Helper: Xác định ngày cuối tuần
    const isWeekendDay = (dayIdx: number) => {
        const date = new Date(year, month - 1, startDay + dayIdx - 1);
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    };

    // Pre-schedule GH shifts on weekend days to determine which Nam staff have weekend GH
    for (let d = 1; d <= duration; d++) {
        if (!isWeekendDay(d)) continue;
        
        const roleRules = rules.gh;
        const targetGender = rules.ghGender; // Normally 'Nam'

        for (const shiftCode in roleRules) {
            const requiredCount = roleRules[shiftCode];
            if (requiredCount <= 0) continue;

            let candidates = targetStaff.filter(s => {
                const sched = s.schedule[d];
                if (!sched || sched.role === 'OFF' || sched.role.includes('(')) return false;
                if (targetGender === 'Nam' && s.gender !== 'Nam') return false;
                if (targetGender === 'Nu' && s.gender !== 'Nu') return false;
                if (d - 1 >= 1 && s.schedule[d - 1]?.role.includes('(GH)')) return false;
                return true;
            });

            // Sort candidates
            candidates.sort((a, b) => {
                const getHours = (staff: StaffMember, tag: string) => {
                    let total = 0;
                    staff.schedule.forEach(info => {
                        if (info?.role.includes(`(${tag})`)) {
                            const cleanStr = info.shift.replace(/[^0-9]/g, '');
                            for (const char of cleanStr) {
                                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
                            }
                        }
                    });
                    return total;
                };

                const currentHoursA = getHours(a, 'GH');
                const currentHoursB = getHours(b, 'GH');
                
                if (Math.abs(currentHoursA - currentHoursB) >= 4) {
                    return currentHoursA - currentHoursB;
                }

                const getLastSpecialDay = (staff: StaffMember) => {
                    for (let k = d - 1; k >= 1; k--) {
                        if (staff.schedule[k]?.role.includes('(')) return k;
                    }
                    return -1;
                };
                const lastA = getLastSpecialDay(a);
                const lastB = getLastSpecialDay(b);
                if (lastA !== lastB) return lastA - lastB;

                const matchA = a.schedule[d]?.shift === shiftCode ? 1 : 0;
                const matchB = b.schedule[d]?.shift === shiftCode ? 1 : 0;
                if (matchA !== matchB) return matchB - matchA;

                const totalHoursA = calculateSpecialHours(a, true);
                const totalHoursB = calculateSpecialHours(b, true);
                if (Math.abs(totalHoursA - totalHoursB) >= 4) return totalHoursA - totalHoursB;
                
                return 0;
            });

            const toAssignCount = Math.min(requiredCount, candidates.length);
            for (let i = 0; i < toAssignCount; i++) {
                const chosen = candidates[i];
                chosen.schedule[d] = {
                    shift: shiftCode,
                    role: `${shiftCode} (GH)`
                };
                chosen.stats.gh++;
            }
        }
    }

    // Thu thập danh sách Nam có ca GH cuối tuần
    const staffWithWeekendGh = new Set<string>();
    targetStaff.forEach(s => {
        for (let d = 1; d <= duration; d++) {
            if (isWeekendDay(d) && s.schedule[d]?.role.includes('(GH)')) {
                staffWithWeekendGh.add(s.id);
                break;
            }
        }
    });

    // B2: Gán vai trò đặc biệt - GH ƯU TIÊN TRƯỚC ĐỂ CÂN BẰNG NAM
    // FIX: Đổi thứ tự ưu tiên: KHO -> GH -> TN
    const rolesToAssign: ('gh' | 'kho' | 'tn')[] = ['kho', 'gh', 'tn'];

    for (let d = 1; d <= duration; d++) {
        for (const roleType of rolesToAssign) {
            // Bỏ qua ca GH cuối tuần vì đã xếp trước ở pre-pass
            if (roleType === 'gh' && isWeekendDay(d)) continue;

            const roleRules = rules[roleType];
            const targetGender = rules[`${roleType}Gender` as keyof SchedulingRules];

            for (const shiftCode in roleRules) {
                const requiredCount = roleRules[shiftCode];
                if (requiredCount <= 0) continue;

                let candidates = targetStaff.filter(s => {
                    const sched = s.schedule[d];
                    if (!sched || sched.role === 'OFF' || sched.role.includes('(')) return false;
                    
                    // LỌC GIỚI TÍNH NGHIÊM NGẶT THEO QUY TẮC
                    if (targetGender === 'Nam' && s.gender !== 'Nam') return false;
                    if (targetGender === 'Nu' && s.gender !== 'Nu') return false;
                    
                    // Ràng buộc tuyệt đối: Nam có GH cuối tuần thì không được làm Kho cuối tuần
                    if (roleType === 'kho' && isWeekendDay(d) && s.gender === 'Nam' && staffWithWeekendGh.has(s.id)) {
                        return false;
                    }

                    if (d - 1 >= 1 && s.schedule[d - 1]?.role.includes('(GH)')) {
                        return false;
                    }

                    return true;
                });

                // Cân bằng Nam-Nữ cho ca Kho ngày Thứ 2 và Thứ 5 (luôn có 1 Nam và 1 Nữ nếu yêu cầu = 2)
                const date = new Date(year, month - 1, startDay + d - 1);
                const dayOfWeek = date.getDay(); // 1 là thứ 2, 4 là thứ 5
                const isMonThu = dayOfWeek === 1 || dayOfWeek === 4;

                if (roleType === 'kho' && isMonThu && requiredCount === 2) {
                    let candidatesNam = candidates.filter(s => s.gender === 'Nam');
                    let candidatesNu = candidates.filter(s => s.gender === 'Nu');

                    if (candidatesNam.length >= 1 && candidatesNu.length >= 1) {
                        const sortCandidates = (list: StaffMember[]) => {
                            list.sort((a, b) => {
                                const getHours = (staff: StaffMember, tag: string) => {
                                    let total = 0;
                                    staff.schedule.forEach(info => {
                                        if (info?.role.includes(`(${tag})`)) {
                                            const cleanStr = info.shift.replace(/[^0-9]/g, '');
                                            for (const char of cleanStr) {
                                                if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
                                            }
                                        }
                                    });
                                    return total;
                                };

                                const currentHoursA = getHours(a, 'Kho');
                                const currentHoursB = getHours(b, 'Kho');
                                
                                if (Math.abs(currentHoursA - currentHoursB) >= 4) {
                                    return currentHoursA - currentHoursB;
                                }

                                const getLastSpecialDay = (staff: StaffMember) => {
                                    for (let k = d - 1; k >= 1; k--) {
                                        if (staff.schedule[k]?.role.includes('(')) return k;
                                    }
                                    return -1;
                                };
                                const lastA = getLastSpecialDay(a);
                                const lastB = getLastSpecialDay(b);
                                if (lastA !== lastB) return lastA - lastB;

                                const matchA = a.schedule[d]?.shift === shiftCode ? 1 : 0;
                                const matchB = b.schedule[d]?.shift === shiftCode ? 1 : 0;
                                if (matchA !== matchB) return matchB - matchA;

                                return 0;
                            });
                        };

                        sortCandidates(candidatesNam);
                        sortCandidates(candidatesNu);

                        const chosenNam = candidatesNam[0];
                        const chosenNu = candidatesNu[0];

                        chosenNam.schedule[d] = {
                            shift: shiftCode,
                            role: `${shiftCode} (Kho)`
                        };
                        chosenNam.stats.kho++;

                        chosenNu.schedule[d] = {
                            shift: shiftCode,
                            role: `${shiftCode} (Kho)`
                        };
                        chosenNu.stats.kho++;
                        
                        continue; // Tiếp tục với shiftCode tiếp theo
                    }
                }

                if (roleType === 'kho') {
                    // Filter preferred candidates (at least 2 days gap and not consecutive on weekend)
                    let preferredCandidates = candidates.filter(s => {
                        const hasRecentKho = [d - 1, d - 2].some(prevDay => 
                            prevDay >= 1 && s.schedule[prevDay]?.role.includes('(Kho)')
                        );
                        const date = new Date(year, month - 1, startDay + d - 1);
                        const isSunday = date.getDay() === 0;
                        const hadKhoYesterday = d - 1 >= 1 && s.schedule[d - 1]?.role.includes('(Kho)');
                        return !hasRecentKho && (!isSunday || !hadKhoYesterday);
                    });
                    
                    if (preferredCandidates.length >= requiredCount) {
                        candidates = preferredCandidates;
                    } else {
                        // Fallback: only prevent consecutive KHO shifts (not on d-1)
                        let fallbackCandidates = candidates.filter(s => {
                            const hadKhoYesterday = d - 1 >= 1 && s.schedule[d - 1]?.role.includes('(Kho)');
                            return !hadKhoYesterday;
                        });
                        if (fallbackCandidates.length >= requiredCount) {
                            candidates = fallbackCandidates;
                        }
                    }
                }

                // Sắp xếp candidates
                candidates.sort((a, b) => {
                    // CÂN BẰNG CA KHO CUỐI TUẦN (SAT/SUN): Ưu tiên người làm ít ca Kho cuối tuần hơn
                    const date = new Date(year, month - 1, startDay + d - 1);
                    const isWeekend = date.getDay() === 6 || date.getDay() === 0;
                    if (roleType === 'kho' && isWeekend) {
                        const getWeekendKhoCount = (staff: StaffMember) => {
                            let count = 0;
                            for (let k = 1; k < d; k++) {
                                if (staff.schedule[k]?.role.includes('(Kho)')) {
                                    const kDate = new Date(year, month - 1, startDay + k - 1);
                                    const kDay = kDate.getDay();
                                    if (kDay === 6 || kDay === 0) {
                                        count++;
                                    }
                                }
                            }
                            return count;
                        };
                        const wkA = getWeekendKhoCount(a);
                        const wkB = getWeekendKhoCount(b);
                        if (wkA !== wkB) return wkA - wkB;
                    }

                    // 1. Ưu tiên số lượng giờ công: Người có ít giờ công đặc biệt loại này hơn được ưu tiên
                    const getHours = (staff: StaffMember, tag: string) => {
                        let total = 0;
                        staff.schedule.forEach(info => {
                            if (info?.role.includes(`(${tag})`)) {
                                const cleanStr = info.shift.replace(/[^0-9]/g, '');
                                for (const char of cleanStr) {
                                    if (HOURS_CONFIG[char]) total += HOURS_CONFIG[char];
                                }
                            }
                        });
                        return total;
                    };

                    const tag = roleType === 'gh' ? 'GH' : (roleType === 'kho' ? 'Kho' : 'TN');
                    const currentHoursA = getHours(a, tag);
                    const currentHoursB = getHours(b, tag);
                    
                    if (Math.abs(currentHoursA - currentHoursB) >= 4) {
                        return currentHoursA - currentHoursB;
                    }

                    // 2. Ưu tiên khoảng cách (Rotation): Người làm ca này cách đây xa nhất được ưu tiên
                    const getLastSpecialDay = (staff: StaffMember) => {
                        for (let k = d - 1; k >= 1; k--) {
                            if (staff.schedule[k]?.role.includes('(')) return k;
                        }
                        return -1;
                    };
                    const lastA = getLastSpecialDay(a);
                    const lastB = getLastSpecialDay(b);
                    if (lastA !== lastB) return lastA - lastB;

                    // 3. Ưu tiên trùng ca (Match Shift)
                    const matchA = a.schedule[d]?.shift === shiftCode ? 1 : 0;
                    const matchB = b.schedule[d]?.shift === shiftCode ? 1 : 0;
                    if (matchA !== matchB) return matchB - matchA;

                    // 4. Xét tổng số giờ đặc biệt khác
                    if (roleType !== 'kho') {
                        const totalHoursA = calculateSpecialHours(a, true);
                        const totalHoursB = calculateSpecialHours(b, true);
                        if (Math.abs(totalHoursA - totalHoursB) >= 4) return totalHoursA - totalHoursB;
                    }
                    
                    return 0;
                });

                const toAssignCount = Math.min(requiredCount, candidates.length);
                for (let i = 0; i < toAssignCount; i++) {
                    const chosen = candidates[i];
                    const tag = roleType === 'gh' ? 'GH' : (roleType === 'kho' ? 'Kho' : 'TN');
                    // Fix: Cập nhật luôn shift code mới theo rule
                    chosen.schedule[d] = {
                        shift: shiftCode,
                        role: `${shiftCode} (${tag})`
                    };
                    if (roleType === 'gh') chosen.stats.gh++;
                    if (roleType === 'kho') chosen.stats.kho++;
                    if (roleType === 'tn') chosen.stats.tn++;
                }
            }
        }
    }

    return staffList;
}

interface CreateScheduleParams {
    config: ScheduleConfig;
    nams: StaffInitialData[];
    nus: StaffInitialData[];
    rules: SchedulingRules;
    departmentPatterns: { [key: string]: string[] };
    busySchedule: BusySchedule;
    previousMonthStats: MonthlyStats;
}

export const createFullSchedule = (params: CreateScheduleParams): { staffList: StaffMember[], targets: ScheduleTargets } => {
    const { config, nams, nus, rules, departmentPatterns, busySchedule, previousMonthStats } = params;
    const { year, month, duration } = config;
    const rotationSeed = (year - 2024) * 12 + month;

    // Lọc nhân viên hợp lệ để tính toán targets
    // Fix: Mở rộng điều kiện lọc để tính toán target chính xác hơn cho các bộ phận vận hành
    const allEligibleStaff = [...nams, ...nus].filter(s => 
        departmentPatterns[s.department]?.length > 0 && 
        !s.department.toLowerCase().includes('quản lý') && 
        !s.department.toLowerCase().includes('trưởng ca') &&
        !s.department.toLowerCase().includes('tiếp đón')
    );
    const eligibleNams = nams.filter(s => 
        departmentPatterns[s.department]?.length > 0 && 
        !s.department.toLowerCase().includes('quản lý') && 
        !s.department.toLowerCase().includes('trưởng ca') &&
        !s.department.toLowerCase().includes('tiếp đón')
    );

    const totalKhoShifts = Object.values(rules.kho).reduce((sum, count) => sum + count, 0) * duration;
    const totalTnShifts = Object.values(rules.tn).reduce((sum, count) => sum + count, 0) * duration;
    const totalGhShifts = Object.values(rules.gh).reduce((sum, count) => sum + count, 0) * duration;

    // Tính tổng số giờ SBH cần thiết
    const totalGhHours = Object.keys(rules.gh).reduce((acc, key) => {
        const count = rules.gh[key] * duration;
        const hours = key.split('').reduce((sum, char) => sum + (HOURS_CONFIG[char] || 0), 0);
        return acc + (count * hours);
    }, 0);
    const totalKhoHours = Object.keys(rules.kho).reduce((acc, key) => {
        const count = rules.kho[key] * duration;
        const hours = key.split('').reduce((sum, char) => sum + (HOURS_CONFIG[char] || 0), 0);
        return acc + (count * hours);
    }, 0);
    const totalTnHours = Object.keys(rules.tn).reduce((acc, key) => {
        const count = rules.tn[key] * duration;
        const hours = key.split('').reduce((sum, char) => sum + (HOURS_CONFIG[char] || 0), 0);
        return acc + (count * hours);
    }, 0);

    const targets: ScheduleTargets = {
        kho: allEligibleStaff.length > 0 ? Math.ceil(totalKhoShifts / allEligibleStaff.length) : 1,
        tn: allEligibleStaff.length > 0 ? Math.ceil(totalTnShifts / allEligibleStaff.length) : 1,
        gh: eligibleNams.length > 0 ? Math.ceil(totalGhShifts / eligibleNams.length) : 1,
        targetSpecialHours: allEligibleStaff.length > 0 ? (totalGhHours + totalKhoHours + totalTnHours) / allEligibleStaff.length : 0
    };

    const initialStaffList = initStaffList(nams, nus, duration, rotationSeed);
    const generatedStaffList = generateSchedule(initialStaffList, config, targets, rules, departmentPatterns, busySchedule, previousMonthStats);

    generatedStaffList.forEach(staff => {
        staff.stats.offDays = staff.schedule.filter(info => info?.role === 'OFF').length;
        staff.stats.swapCount = 0;
    });

    return { staffList: generatedStaffList, targets };
};
