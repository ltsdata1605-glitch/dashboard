export interface ScheduleInfo {
  shift: string;
  role: string;
  isManual?: boolean;
  warning?: string; // Thêm để cảnh báo khi cho nghỉ mà không có người thay
  needsManualIntervention?: boolean; // MỚI: Dành cho hiệu ứng nhấp nháy cảnh báo
  manualChangeInfo?: {
    type: 'direct-edit' | 'swap-initiator' | 'swap-partner' | 'off-request' | 'demotion';
    originalShiftRole: string;
    partnerId?: string;
  };
  addedWeekendShifts?: string;
}

export interface StaffStats {
  gh: number;
  kho: number;
  tn: number;
  offDays: number;
  swapCount: number;
}

export interface StaffInitialData {
  name: string;
  department: string;
}

export interface ChangeHistoryEntry {
    dayIndex: number;
    date: string; // e.g., "5/12"
    from: string; // original role
    to: string;   // new role
    description?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  gender: 'Nam' | 'Nu';
  department: string;
  stats: StaffStats;
  schedule: (ScheduleInfo | null)[];
  changeHistory: ChangeHistoryEntry[];
}

export interface ImportedStaff {
  id: string;
  name: string;
  department: string;
}

export interface StaffWithGender extends ImportedStaff {
  gender: 'Nam' | 'Nu';
}


export interface ShiftDefinition {
  startTime: string;
  endTime: string;
}

export interface ShiftDefinitions {
  [key: string]: ShiftDefinition; // '1', '2', '3', '4', '5', '6'
}

export interface ScheduleConfig {
    year: number;
    month: number;
    startDay: number;
    duration: number;
    includeTn?: boolean;
    shiftDefinitions?: ShiftDefinitions;
}

export interface ScheduleTargets {
    kho: number;
    tn: number;
    gh: number;
    sbhDiff?: number;
    targetSpecialHours?: number;
}

export interface SchedulingRules {
  gh: { [shiftCode: string]: number };
  kho: { [shiftCode: string]: number };
  tn: { [shiftCode: string]: number };
  ghGender: 'Nam' | 'Nu' | 'All';
  khoGender: 'Nam' | 'Nu' | 'All';
  tnGender: 'Nam' | 'Nu' | 'All';
}

export interface DailyRequirements {
  [key: string]: number; // e.g., '1', '2', '3', '4', '5', '6'
}

export interface EditShiftModalInfo {
  employeeId: string;
  dayIndex: number;
  employeeName: string;
  department: string;
  gender: 'Nam' | 'Nu';
  date: string;
  currentShift: ScheduleInfo;
  isSpecialShift: boolean;
  employeeStats: StaffStats;
  changeHistory: ChangeHistoryEntry[];
}

export interface SolutionAction {
  staff: StaffMember;
  newShift: ScheduleInfo;
  originalShift: ScheduleInfo;
}

// Cập nhật Solution để bao gồm cả đề xuất bổ sung ca và tách ca
export type Solution = 
  | { type: 'replace', staff: StaffMember } 
  | { type: 'swap', staff: StaffMember, swapDay: number } 
  | { type: 'extend', staff: StaffMember, newShift: ScheduleInfo, originalShift: ScheduleInfo }
  | { type: 'split_cover', actions: SolutionAction[] } // New type for multi-person solutions
  | { type: 'pure_swap', partner: StaffMember, partnerShift: ScheduleInfo } // Dành cho hoán đổi ca thường
  | null;


export interface NormalShiftSolution {
  cut?: ScheduleInfo;
  swap?: { partner: StaffMember; partnerShift: ScheduleInfo };
}

export type BusyStatus = 'morning' | 'afternoon' | 'off';

export type BusySchedule = {
  [employeeId: string]: {
    [dayIndex: number]: BusyStatus;
  }
};



export interface ScheduleHistoryEntry {
  timestamp: number;
  description: string;
  scheduleSnapshot: StaffMember[];
}

export interface UnresolvedConflict {
  employeeId: string;
  employeeName: string;
  dayIndex: number;
  date: string;
  originalShift: ScheduleInfo;
}

export interface EmployeeBusyReport {
  staffId: string;
  staffName: string;
  requests: {
    morning: number;
    afternoon: number;
    off: number;
  };
  resolved: {
    morning: number;
    afternoon: number;
    off: number;
  };
  unresolvedCount: number;
}

// MỚI: Interface cho thống kê tháng trước
export interface MonthlyEmployeeStats {
  gh: number;
  kho: number;
  tn: number;
  totalSpecialHours: number;
}

export interface MonthlyStats {
  [staffId: string]: MonthlyEmployeeStats;
}

// MỚI: Interface cho thông báo cân bằng
export interface BalancingFeedback {
  reduced: string[];   // Danh sách tên nhân viên được giảm ca
  increased: string[]; // Danh sách tên nhân viên được tăng ca
  message: string;
}

export interface ScheduleSuggestion {
  type: 'kho' | 'tn';
  dateString: string;
  highCountStaff: StaffMember;
  lowCountStaff: StaffMember;
}
