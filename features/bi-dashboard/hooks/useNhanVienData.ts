import { useState, useEffect, useMemo, useCallback } from 'react';
import { shortenSupermarketName, extractSupermarketList } from '../utils/dashboardHelpers';
import { useIndexedDBState } from './useIndexedDBState';
import * as db from '../utils/db';
import { appendBonusHistory } from '../utils/bonusHistory';
import { logAuditEvent } from '../utils/auditTrail';
import { RevenueRow, BonusMetrics, ManualDeptMapping, InstallmentRow, CrossSellingRow } from '../types/nhanVienTypes';
import { formatEmployeeName, standardizeEmployeeName } from '../utils/nhanVienHelpers';
import { useWorker } from './useWorker';
import { getAnalysisEmployees, AnalysisEmployeesPayload, ANALYSIS_EMPLOYEES_KEY, AnalysisEmployeeItem } from '../services/analysisEmployeeSyncService';

export function useNhanVienData(isActive?: boolean) {
    const [summaryLuyKe] = useIndexedDBState<string>('summary-luy-ke', '');
    const [activeSupermarketsRaw, setActiveSupermarkets, isActiveSupermarketsLoaded] = useIndexedDBState<string[]>('nhanvien-active-supermarkets', []);
    const [hiddenEmployees, setHiddenEmployees] = useState<string[]>([]);
    const [analysisEmployeesPayload, setAnalysisEmployeesPayload] = useState<AnalysisEmployeesPayload | null>(null);
    
    const supermarkets = useMemo(() => extractSupermarketList(summaryLuyKe), [summaryLuyKe]);
    const activeSupermarkets = useMemo(() => Array.isArray(activeSupermarketsRaw) 
        ? activeSupermarketsRaw.filter(sm => supermarkets.includes(sm)) 
        : [], [activeSupermarketsRaw, supermarkets]);

    const [aggregatedData, setAggregatedData] = useState({
        danhSach: '',
        thiDua: '',
        traGop: '',
        banKem: '',
        manualMapping: {} as ManualDeptMapping,
        bonusData: {} as Record<string, BonusMetrics | null>,
        // Nhãn kỳ hiện tại của bonusData — do lựa chọn Tự động (Hiện tại/Tháng/Năm/Khoảng
        // thời gian) ghi vào lúc chạy xong; null -> BonusTab tự fallback về "ĐẾN NGÀY hôm qua".
        bonusPeriodLabel: null as string | null
    });

    const [dataVersion, setDataVersion] = useState(0);
    const [aggregatedWeights, setAggregatedWeights] = useState<Record<string, number>>({});
    const { runWorkerTask } = useWorker();

    // Nhân viên -> tên siêu thị GỐC (chưa rút gọn) họ thực sự thuộc về — chỉ có giá trị khi
    // ≥2 siêu thị active cùng lúc ("Tổng hợp"). Dùng để các hàm lưu Thưởng ghi đúng key siêu
    // thị của từng nhân viên thay vì đổ hết vào activeSupermarkets[0] (bug: dữ liệu thưởng của
    // nhân viên siêu thị 2/3... bị ghi nhầm vào siêu thị 1, biến mất khi xem lại siêu thị đó
    // riêng lẻ). 1 siêu thị active thì bỏ trống, resolveEmployeeSupermarket tự fallback đúng.
    const [employeeSupermarketMap, setEmployeeSupermarketMap] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isActiveSupermarketsLoaded && activeSupermarkets.length === 0 && supermarkets.length > 0) {
            setActiveSupermarkets([supermarkets[0]]);
        }
    }, [supermarkets, isActiveSupermarketsLoaded, activeSupermarkets, setActiveSupermarkets]);

    useEffect(() => {
        if (!isActiveSupermarketsLoaded || isActive === false) return;
        let isMounted = true;
        const fetchAllData = async () => {
            if (activeSupermarkets.length === 0) {
                setAggregatedData({
                    danhSach: '',
                    thiDua: '',
                    traGop: '',
                    banKem: '',
                    manualMapping: {},
                    bonusData: {},
                    bonusPeriodLabel: null
                });
                setEmployeeSupermarketMap({});
                return;
            }

            const uniqueSafeNames = Array.from(new Set(activeSupermarkets.map(sm => shortenSupermarketName(sm))));

            const results = await Promise.all(uniqueSafeNames.map(safeName => {
                return Promise.all([
                    db.get(`config-${safeName}-danhsach`),
                    db.get(`config-${safeName}-thidua`),
                    db.get(`config-${safeName}-tragop`),
                    db.get(`config-${safeName}-bankem`),
                    db.get(`manual-dept-mapping-${safeName}`),
                    db.get(`bonus-data-${safeName}`),
                    db.get(`targethero-${safeName}-departmentweights`),
                    db.get(`hidden-employees-${safeName}`),
                    db.get(`bonus-current-period-label-${safeName}`)
                ]);
            }));

            if (!isMounted) return;

            let combinedDS = '', combinedTD = '', combinedTG = '', combinedBK = '';
            let combinedMM: ManualDeptMapping = {};
            let combinedBonus: Record<string, BonusMetrics | null> = {};
            let combinedPeriodLabel: string | null = null;
            const allWeights: Record<string, number[]> = {};

            const combinedHidden: string[] = [];
            results.forEach(([ds, td, tg, bk, mm, bonus, weights, hidden, periodLabel]) => {
                if (ds) combinedDS += (combinedDS ? '\n' : '') + ds;
                if (td) combinedTD += (combinedTD ? '\n' : '') + td;
                if (tg) combinedTG += (combinedTG ? '\n' : '') + tg;
                if (bk) combinedBK += (combinedBK ? '\n' : '') + bk;
                if (mm) Object.assign(combinedMM, mm);
                if (bonus) Object.assign(combinedBonus, bonus);
                if (Array.isArray(hidden)) combinedHidden.push(...hidden);
                if (!combinedPeriodLabel && periodLabel) combinedPeriodLabel = periodLabel as string;
                if (weights) {
                    Object.entries(weights as Record<string, number>).forEach(([dept, w]) => {
                        if (!allWeights[dept]) allWeights[dept] = [];
                        allWeights[dept].push(w);
                    });
                }
            });

            const finalWeights: Record<string, number> = {};
            Object.entries(allWeights).forEach(([dept, wList]) => {
                finalWeights[dept] = wList.reduce((a, b) => a + b, 0) / wList.length;
            });

            setAggregatedWeights(finalWeights);
            setHiddenEmployees(combinedHidden);
            setAggregatedData({
                danhSach: combinedDS,
                thiDua: combinedTD,
                traGop: combinedTG,
                banKem: combinedBK,
                manualMapping: combinedMM,
                bonusData: combinedBonus,
                bonusPeriodLabel: combinedPeriodLabel
            });

            // Chỉ cần xác định nhân viên -> siêu thị khi có ≥2 siêu thị active cùng lúc — 1
            // siêu thị thì mọi nhân viên chắc chắn thuộc siêu thị đó, resolveEmployeeSupermarket
            // tự fallback đúng mà không cần parse lại. Dò theo activeSupermarkets (tên gốc,
            // chưa rút gọn) thay vì uniqueSafeNames để giữ đúng tên gốc dùng trong key
            // bonus-history-* (xem BonusDataModal.tsx).
            if (uniqueSafeNames.length > 1) {
                const newEmployeeSupermarketMap: Record<string, string> = {};
                await Promise.all(activeSupermarkets.map(async (rawName) => {
                    const safeName = shortenSupermarketName(rawName);
                    const idx = uniqueSafeNames.indexOf(safeName);
                    if (idx === -1) return;
                    const [ds, , , , mm] = results[idx];
                    if (ds) {
                        try {
                            const rows = await runWorkerTask('PARSE_REVENUE', ds) as RevenueRow[];
                            rows.forEach(row => {
                                if (row.type === 'employee' && row.originalName && !(row.originalName in newEmployeeSupermarketMap)) {
                                    newEmployeeSupermarketMap[row.originalName] = rawName;
                                }
                            });
                        } catch (err) {
                            console.error(`[useNhanVienData] Lỗi xác định siêu thị nhân viên (${rawName}):`, err);
                        }
                    }
                    if (mm) {
                        Object.values(mm as ManualDeptMapping).forEach(employees => {
                            if (Array.isArray(employees)) {
                                employees.forEach(empName => {
                                    if (!(empName in newEmployeeSupermarketMap)) newEmployeeSupermarketMap[empName] = rawName;
                                });
                            }
                        });
                    }
                }));
                if (isMounted) setEmployeeSupermarketMap(newEmployeeSupermarketMap);
            } else {
                setEmployeeSupermarketMap({});
            }
        };
        fetchAllData();
        return () => { isMounted = false; };
    }, [activeSupermarkets, dataVersion, isActiveSupermarketsLoaded, isActive, runWorkerTask]);

    useEffect(() => {
        // Chỉ 9 key liệt kê trong fetchAllData() (config-*, manual-dept-mapping-*, bonus-data-*,
        // targethero-*-departmentweights, hidden-employees-*, bonus-current-period-label-*) thực sự
        // ảnh hưởng tới dữ liệu hook này trả về — "comptarget-" (target thi đua) không được fetch ở
        // đây nên không cần bump lại; "targethero-" phải khớp đúng suffix "-departmentweights",
        // các key targethero khác (quydoi/tragop/total) chỉ dùng ở useDashboardLogic.
        const handleDbChange = (event: CustomEvent) => {
            const key = event.detail.key;
            const isRelevant = key.startsWith('config-')
                || key.startsWith('manual-dept-mapping')
                || key.startsWith('bonus-data-')
                || key.startsWith('bonus-current-period-label-')
                || key.startsWith('hidden-employees-')
                || (key.startsWith('targethero-') && key.endsWith('-departmentweights'))
                || key === 'summary-luy-ke'
                || key === ANALYSIS_EMPLOYEES_KEY
                || key === `bi_${ANALYSIS_EMPLOYEES_KEY}`;
            if (isRelevant) {
                setDataVersion(v => v + 1);
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    const loadAnalysisEmployees = useCallback(async () => {
        try {
            const payload = await getAnalysisEmployees();
            setAnalysisEmployeesPayload(payload);
        } catch (err) {
            console.error('[useNhanVienData] Lỗi tải danh sách nhân viên phân tích:', err);
        }
    }, []);

    useEffect(() => {
        loadAnalysisEmployees();
        const handleAnalysisUpdate = (e: CustomEvent) => {
            if (e.detail) {
                setAnalysisEmployeesPayload(e.detail);
                setDataVersion(v => v + 1);
            }
        };
        window.addEventListener('analysis-employees-updated', handleAnalysisUpdate as EventListener);
        return () => window.removeEventListener('analysis-employees-updated', handleAnalysisUpdate as EventListener);
    }, [loadAnalysisEmployees]);

    const analysisEmployeesList = useMemo(() => {
        return analysisEmployeesPayload?.employees || [];
    }, [analysisEmployeesPayload]);

    const hasAnalysisEmployees = useMemo(() => {
        return analysisEmployeesList.length > 0;
    }, [analysisEmployeesList]);

    // Tạo Map lookup O(1) để kiểm tra xem một tên nhân viên trong báo cáo thô có thuộc Phân tích không
    const analysisEmployeeLookup = useMemo(() => {
        const lookup = new Map<string, AnalysisEmployeeItem>();
        if (!hasAnalysisEmployees) return lookup;
        for (const emp of analysisEmployeesList) {
            lookup.set(emp.originalName.toLowerCase().trim(), emp);
            lookup.set(standardizeEmployeeName(emp.originalName).toLowerCase().trim(), emp);
            lookup.set(formatEmployeeName(emp.originalName).toLowerCase().trim(), emp);
            if (emp.id) {
                lookup.set(emp.id.toLowerCase().trim(), emp);
            }
        }
        return lookup;
    }, [analysisEmployeesList, hasAnalysisEmployees]);

    const isEmployeeInAnalysis = useCallback((origName?: string): boolean => {
        if (!hasAnalysisEmployees) return true; // Nếu chưa có danh sách phân tích thì fallback giữ nguyên
        if (!origName) return false;
        const clean = origName.toLowerCase().trim();
        if (analysisEmployeeLookup.has(clean)) return true;
        const canonical = standardizeEmployeeName(origName).toLowerCase().trim();
        if (analysisEmployeeLookup.has(canonical)) return true;
        if (origName.includes(' - ')) {
            const parts = origName.split(' - ').map(p => p.trim().toLowerCase());
            if (analysisEmployeeLookup.has(parts[0]) || analysisEmployeeLookup.has(parts[1])) return true;
        }
        return false;
    }, [hasAnalysisEmployees, analysisEmployeeLookup]);

    const hiddenEmployeesSet = useMemo(() => new Set(hiddenEmployees), [hiddenEmployees]);

    const [parsedRevenueBase, setParsedRevenueBase] = useState<RevenueRow[]>([]);
    useEffect(() => {
        if (!aggregatedData.danhSach || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_REVENUE', aggregatedData.danhSach).then((base: RevenueRow[]) => {
            if (isMounted) {
                setParsedRevenueBase(base.filter(r => {
                    if (r.type !== 'employee') return true;
                    if (!r.originalName || hiddenEmployeesSet.has(r.originalName)) return false;
                    if (hasAnalysisEmployees) {
                        return isEmployeeInAnalysis(r.originalName);
                    }
                    return true;
                }));
            }
        }).catch(err => console.error('[useNhanVienData] Lỗi parse danh sách doanh thu:', err));
        return () => { isMounted = false; };
    }, [aggregatedData.danhSach, hiddenEmployeesSet, isActive, hasAnalysisEmployees, isEmployeeInAnalysis]);

    const employeeDepartmentMap = useMemo(() => {
        if (isActive === false) return {} as Record<string, string>;
        const map: Record<string, string> = {};

        // 1. Nguồn chuẩn ưu tiên số 1: Danh sách nhân viên từ chức năng Phân tích
        if (hasAnalysisEmployees) {
            analysisEmployeesList.forEach(emp => {
                map[emp.originalName] = emp.department;
                map[standardizeEmployeeName(emp.originalName)] = emp.department;
                map[formatEmployeeName(emp.originalName)] = emp.department;
                if (emp.id) {
                    map[emp.id] = emp.department;
                }
            });
        }

        // 2. Dự phòng từ parsedRevenueBase (cho các nhân viên khớp Phân tích hoặc khi chưa có Phân tích)
        parsedRevenueBase.filter(r => r.type === 'employee' && r.originalName && r.department).forEach(r => {
            const canonical = standardizeEmployeeName(r.originalName!);
            if (!hasAnalysisEmployees || isEmployeeInAnalysis(r.originalName)) {
                if (!map[canonical]) map[canonical] = r.department!;
                if (!map[r.originalName!]) map[r.originalName!] = r.department!;
            }
        });

        // 3. Cho phép override thủ công từ manualMapping (nếu có tùy chỉnh riêng)
        Object.entries(aggregatedData.manualMapping).forEach(([deptName, employees]) => {
            if (Array.isArray(employees)) {
                employees.forEach(empName => {
                    if (!hiddenEmployeesSet.has(empName)) {
                        const canonical = standardizeEmployeeName(empName);
                        map[canonical] = deptName;
                        map[empName] = deptName;
                    }
                });
            }
        });
        return map;
    }, [parsedRevenueBase, aggregatedData.manualMapping, hiddenEmployeesSet, isActive, hasAnalysisEmployees, analysisEmployeesList, isEmployeeInAnalysis]);

    const [installmentRows, setInstallmentRows] = useState<InstallmentRow[]>([]);
    useEffect(() => {
        if (!aggregatedData.traGop || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_INSTALLMENT', { text: aggregatedData.traGop, employeeDepartmentMap }).then(rows => {
            if (isMounted && rows) {
                setInstallmentRows(rows.filter((r: InstallmentRow) => {
                    if (r.type !== 'employee') return true;
                    if (!r.originalName || hiddenEmployeesSet.has(r.originalName)) return false;
                    if (hasAnalysisEmployees) {
                        return isEmployeeInAnalysis(r.originalName);
                    }
                    return true;
                }));
            }
        }).catch(err => console.error('[useNhanVienData] Lỗi parse trả góp:', err));
        return () => { isMounted = false; };
    }, [aggregatedData.traGop, employeeDepartmentMap, hiddenEmployeesSet, isActive, hasAnalysisEmployees, isEmployeeInAnalysis]);

    const [banKemRows, setBanKemRows] = useState<CrossSellingRow[]>([]);
    useEffect(() => {
        if (!aggregatedData.banKem || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_CROSS_SELLING', { text: aggregatedData.banKem, employeeDepartmentMap }).then(rows => {
            if (isMounted && rows) {
                setBanKemRows(rows.filter((r: CrossSellingRow) => {
                    if (r.type !== 'employee') return true;
                    if (!r.originalName || hiddenEmployeesSet.has(r.originalName)) return false;
                    if (hasAnalysisEmployees) {
                        return isEmployeeInAnalysis(r.originalName);
                    }
                    return true;
                }));
            }
        }).catch(err => console.error('[useNhanVienData] Lỗi parse bán kèm:', err));
        return () => { isMounted = false; };
    }, [aggregatedData.banKem, employeeDepartmentMap, hiddenEmployeesSet, isActive, hasAnalysisEmployees, isEmployeeInAnalysis]);

    const banKemMap = useMemo(() => {
        if (isActive === false) return new Map<string, number>();
        const map = new Map<string, number>();
        banKemRows.forEach(row => { if (row.originalName) map.set(row.originalName, row.pctBillBk); });
        return map;
    }, [banKemRows, isActive]);

    const revenueRows = useMemo(() => {
        if (isActive === false) return [];
        const rows = parsedRevenueBase;

        const getDeptForEmployee = (origName?: string, currentDept?: string): string => {
            if (origName) {
                if (employeeDepartmentMap[origName]) return employeeDepartmentMap[origName];
                const canonical = standardizeEmployeeName(origName);
                if (employeeDepartmentMap[canonical]) return employeeDepartmentMap[canonical];
                if (origName.includes(' - ')) {
                    const parts = origName.split(' - ').map(p => p.trim());
                    if (employeeDepartmentMap[`${parts[1]} - ${parts[0]}`]) return employeeDepartmentMap[`${parts[1]} - ${parts[0]}`];
                    if (employeeDepartmentMap[parts[0]]) return employeeDepartmentMap[parts[0]];
                    if (employeeDepartmentMap[parts[1]]) return employeeDepartmentMap[parts[1]];
                }
            }
            return currentDept || 'BP Khác';
        };

        const mappedRows = rows.map(row => {
            if (row.type === 'employee' && row.originalName) {
                const pctBillBk = banKemMap.get(row.originalName) || 0;
                return { 
                    ...row, 
                    department: getDeptForEmployee(row.originalName, row.department),
                    pctBillBk: pctBillBk
                };
            }
            return row;
        });

        const finalRows: RevenueRow[] = [];
        const currentDeptsInMap = Array.from(new Set(Object.values(employeeDepartmentMap))).sort();
        currentDeptsInMap.forEach((deptName: string) => {
            const deptEmps = mappedRows.filter(r => r.type === 'employee' && r.department === deptName);
            if (deptEmps.length > 0) {
                const deptBkRow = banKemRows.find(r => r.type === 'department' && r.originalName === deptName);
                const origDeptRow = mappedRows.find(r => r.type === 'department' && r.name === deptName);
                finalRows.push({ 
                    type: 'department', name: deptName, 
                    dtlk: deptEmps.reduce((s, e) => s + (e.dtlk || 0), 0), 
                    dtqd: deptEmps.reduce((s, e) => s + (e.dtqd || 0), 0), 
                    hieuQuaQD: origDeptRow ? origDeptRow.hieuQuaQD : 0,
                    pctBillBk: deptBkRow ? deptBkRow.pctBillBk : 0
                });
                finalRows.push(...deptEmps);
            }
        });
        return finalRows;
    }, [parsedRevenueBase, employeeDepartmentMap, banKemMap, banKemRows, isActive]);

    // Toàn bộ tên phòng ban thật sự có nhân viên (không lọc bớt) — dùng để "Tất cả" luôn đúng
    // nghĩa là TẤT CẢ. Trước đây effectiveActiveDepartments khi chọn "Tất cả" lại resolve về
    // departmentOptions (danh sách ĐÃ lọc bớt cho dropdown), nên nhân viên phòng "Kế toán"/"Tiếp
    // đón khách hàng"/chứa "quản lý" tuy vẫn được đếm vào employeeDepartmentMap (isIgnoredDept ở
    // nhanVienHelpers.ts chỉ loại "quản lý siêu thị"/"trưởng ca", hẹp hơn nhiều) nhưng lại bị
    // useRevenueData.ts lọc mất khỏi MỌI bảng hiển thị (Doanh thu/Bán kèm/Trả góp/Thi đua/Chi
    // tiết) kể cả khi user đã chọn "Tất cả" — vì departmentNames.includes(r.department) không
    // bao giờ chứa các phòng ban đó. Doanh thu thật của những nhân viên này vẫn bị đếm ở
    // deptEmployeeCounts/employeeDepartmentMap nhưng biến mất khỏi mọi bảng số liệu.
    const allDepartmentNames = useMemo(() => {
        if (isActive === false) return [];
        return Array.from(new Set(Object.values(employeeDepartmentMap as Record<string, string>)))
            .filter((d): d is string => typeof d === 'string')
            .sort();
    }, [employeeDepartmentMap, isActive]);

    // Danh sách cho dropdown chọn phòng ban — CỐ Ý lọc bớt các phòng không phải kinh doanh
    // (quản lý/trưởng ca/kế toán/tiếp đón khách) để không ai cần lọc riêng theo các phòng này.
    // Chỉ ảnh hưởng danh sách LỰA CHỌN trong dropdown, KHÔNG còn ảnh hưởng tới việc "Tất cả"
    // hiển thị gì (xem allDepartmentNames ở trên).
    const departmentOptions = useMemo(() => {
        if (isActive === false) return [];
        const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
        return allDepartmentNames.filter(d => !excludedKeywords.some(keyword => d.toLowerCase().includes(keyword)));
    }, [allDepartmentNames, isActive]);

    const [activeDepartmentsRaw, setActiveDepartments] = useIndexedDBState<string[]>('nhanvien-active-depts-multi', ['all']);
    const activeDepartments = useMemo(() => {
        if (isActive === false) return ['all'];
        return Array.isArray(activeDepartmentsRaw)
            ? activeDepartmentsRaw.filter(d => d === 'all' || departmentOptions.includes(d))
            : ['all'];
    }, [activeDepartmentsRaw, departmentOptions, isActive]);
    const effectiveActiveDepartments = useMemo(() => {
        if (isActive === false) return [];
        return activeDepartments.length === 0 || activeDepartments.includes('all') ? allDepartmentNames : activeDepartments;
    }, [activeDepartments, allDepartmentNames, isActive]);

    const toggleSupermarket = useCallback((sm: string) => {
        setActiveSupermarkets(prev => {
            if (sm === 'all') return prev.length === supermarkets.length ? [supermarkets[0]] : [...supermarkets];
            const next = prev.includes(sm) ? prev.filter(s => s !== sm) : [...prev, sm];
            return next.length === 0 ? [supermarkets[0]] : next;
        });
    }, [supermarkets, setActiveSupermarkets]);

    const toggleDepartment = useCallback((dept: string) => {
        setActiveDepartments(prev => {
            if (dept === 'all') return ['all'];
            let next = Array.isArray(prev) ? prev.filter(d => d !== 'all') : [];
            if (next.includes(dept)) {
                next = next.filter(d => d !== dept);
                return next.length === 0 ? ['all'] : next;
            } else return [...next, dept];
        });
    }, [setActiveDepartments]);

    const employeeInstallmentMap = useMemo(() => {
        if (isActive === false) return new Map();
        const map = new Map<string, number>();
        installmentRows.forEach(row => { if (row.originalName) map.set(row.originalName, row.totalPercent); });
        return map;
    }, [installmentRows, isActive]);

    const allEmployees = useMemo(() => {
        if (isActive === false) return [];
        const seen = new Set<string>();
        const list: { name: string; originalName: string; department: string }[] = [];

        // 1. Nếu có danh sách từ Phân tích: Sử dụng trực tiếp làm chuẩn gốc
        if (hasAnalysisEmployees) {
            for (const emp of analysisEmployeesList) {
                if (hiddenEmployeesSet.has(emp.originalName)) continue;
                const canonical = standardizeEmployeeName(emp.originalName);
                const dedupKey = emp.id || canonical;
                if (!seen.has(dedupKey)) {
                    seen.add(dedupKey);
                    const dept = employeeDepartmentMap[emp.originalName] || employeeDepartmentMap[canonical] || emp.department;
                    list.push({
                        name: emp.name || formatEmployeeName(emp.originalName),
                        originalName: emp.originalName,
                        department: dept
                    });
                }
            }
            return list.sort((a, b) => a.name.localeCompare(b.name));
        }

        // 2. Dự phòng: Quét từ employeeDepartmentMap nếu chưa có Phân tích
        const entries = Object.entries(employeeDepartmentMap as Record<string, string>)
            .sort(([a], [b]) => b.length - a.length);

        for (const [originalName, department] of entries) {
            const canonical = standardizeEmployeeName(originalName);
            let empId = '';
            if (canonical.includes(' - ')) {
                const parts = canonical.split(' - ').map(p => p.trim());
                empId = /^\d+$/.test(parts[1]) ? parts[1] : (/^\d+$/.test(parts[0]) ? parts[0] : canonical);
            } else if (/^\d+$/.test(canonical)) {
                empId = canonical;
            }

            const dedupKey = empId || canonical;
            if (!seen.has(dedupKey)) {
                seen.add(dedupKey);
                list.push({
                    name: formatEmployeeName(originalName),
                    originalName,
                    department
                });
            }
        }

        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [employeeDepartmentMap, hasAnalysisEmployees, analysisEmployeesList, hiddenEmployeesSet, isActive]);

    const deptEmployeeCounts = useMemo(() => {
        if (isActive === false) return {};
        const counts: Record<string, number> = {};
        allEmployees.forEach(emp => { counts[emp.department] = (counts[emp.department] || 0) + 1; });
        return counts;
    }, [allEmployees, isActive]);

    // Siêu thị GỐC (chưa rút gọn) của 1 nhân viên — dùng employeeSupermarketMap khi có (chỉ
    // xây dựng lúc ≥2 siêu thị active); fallback về activeSupermarkets[0] khi chỉ 1 siêu thị
    // active hoặc nhân viên chưa xác định được (giữ đúng hành vi cũ, không regressions).
    const resolveEmployeeSupermarket = useCallback((originalName: string): string => {
        return employeeSupermarketMap[originalName] || activeSupermarkets[0];
    }, [employeeSupermarketMap, activeSupermarkets]);

    const handleSaveBonus = useCallback(async (originalName: string, metrics: BonusMetrics) => {
        const safeName = shortenSupermarketName(resolveEmployeeSupermarket(originalName));
        setAggregatedData(prev => ({
            ...prev,
            bonusData: { ...prev.bonusData, [originalName]: metrics }
        }));
        const currentDbData = await db.get<Record<string, BonusMetrics>>(`bonus-data-${safeName}`) || {};
        await db.set(`bonus-data-${safeName}`, { ...currentDbData, [originalName]: metrics });
    }, [resolveEmployeeSupermarket]);

    // Ghi hàng loạt cho chế độ Tự động — gom nhóm theo ĐÚNG siêu thị của từng nhân viên (trước
    // đây đổ hết vào activeSupermarkets[0], sai dữ liệu khi 2+ siêu thị active cùng lúc — xem
    // resolveEmployeeSupermarket) rồi đọc/ghi 1 lần/nhóm thay vì gọi handleSaveBonus lặp N lần
    // (read-modify-write không khóa, gọi lặp nhanh có nguy cơ ghi đè lẫn nhau).
    const handleSaveBonusBatch = useCallback(async (entries: { originalName: string; metrics: BonusMetrics }[]) => {
        if (entries.length === 0) return;

        setAggregatedData(prev => {
            const nextBonusData = { ...prev.bonusData };
            entries.forEach(({ originalName, metrics }) => { nextBonusData[originalName] = metrics; });
            return { ...prev, bonusData: nextBonusData };
        });

        const groups = new Map<string, { originalName: string; metrics: BonusMetrics }[]>();
        entries.forEach(entry => {
            const safeName = shortenSupermarketName(resolveEmployeeSupermarket(entry.originalName));
            if (!groups.has(safeName)) groups.set(safeName, []);
            groups.get(safeName)!.push(entry);
        });

        await Promise.all(Array.from(groups.entries()).map(async ([safeName, groupEntries]) => {
            const currentDbData = await db.get<Record<string, BonusMetrics>>(`bonus-data-${safeName}`) || {};
            const mergedDbData = { ...currentDbData };
            groupEntries.forEach(({ originalName, metrics }) => { mergedDbData[originalName] = metrics; });
            await db.set(`bonus-data-${safeName}`, mergedDbData);
        }));

        // Ghi lịch sử từng nhân viên, đúng key scheme BonusDataModal đang dùng (bonus-history-*),
        // để chế độ Tự động không tạo khoảng trống dữ liệu so với dán tay.
        await Promise.all(entries.map(({ originalName, metrics }) =>
            appendBonusHistory(resolveEmployeeSupermarket(originalName), originalName, metrics)
        ));
        logAuditEvent({ action: 'bonus:save-batch', label: `Lưu điểm thưởng cho ${entries.length} nhân viên` });
    }, [resolveEmployeeSupermarket]);

    // Ghi kho lưu trữ theo THÁNG (phục vụ "Xem theo tháng") — 1 key/(siêu thị, tháng),
    // ghi đè toàn bộ mỗi lần chạy lại cùng tháng (dữ liệu mới nhất thắng, không cộng dồn).
    // Chỉ khi yyyymm là THÁNG HIỆN TẠI mới đồng thời mirror sang bonus-data-*/bonus-history-*
    // (giữ tab "hôm nay" luôn khớp); tháng quá khứ không đụng tới dữ liệu hiện tại.
    const handleSaveBonusMonthly = useCallback(async (
        entries: { originalName: string; metrics: BonusMetrics }[],
        yyyymm: string,
    ) => {
        if (entries.length === 0) return;

        const groups = new Map<string, { originalName: string; metrics: BonusMetrics }[]>();
        entries.forEach(entry => {
            const safeName = shortenSupermarketName(resolveEmployeeSupermarket(entry.originalName));
            if (!groups.has(safeName)) groups.set(safeName, []);
            groups.get(safeName)!.push(entry);
        });

        await Promise.all(Array.from(groups.entries()).map(async ([safeName, groupEntries]) => {
            const monthlyKey = `bonus-monthly-${safeName}-${yyyymm}` as const;
            const monthlyData: Record<string, BonusMetrics> = {};
            groupEntries.forEach(({ originalName, metrics }) => { monthlyData[originalName] = metrics; });
            await db.set(monthlyKey, monthlyData);
        }));

        logAuditEvent({ action: 'bonus:save-monthly', label: `Lưu điểm thưởng tháng ${yyyymm} cho ${entries.length} nhân viên` });

        const now = new Date();
        const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (yyyymm === currentYYYYMM) {
            await handleSaveBonusBatch(entries);
        }
    }, [resolveEmployeeSupermarket, handleSaveBonusBatch]);

    // Nhãn kỳ hiện tại của bonusData (VD "THÁNG 6/2026", "NĂM 2026 (LUỸ KẾ)") — do
    // AutoBonusPanel gọi sau khi 1 lượt Tự động chạy xong, để BonusTab đổi tiêu đề báo cáo
    // đúng theo lựa chọn Hiện tại/Tháng/Năm/Khoảng thời gian thay vì luôn cố định "hôm qua".
    // Ghi vào TẤT CẢ siêu thị đang active (không chỉ activeSupermarkets[0]) — đây chỉ là 1
    // chuỗi nhãn kỳ báo cáo (không phải dữ liệu theo nhân viên), nên đảm bảo mọi siêu thị
    // active đều thấy đúng nhãn khi xem riêng lẻ sau đó.
    const setBonusPeriodLabel = useCallback(async (label: string) => {
        setAggregatedData(prev => ({ ...prev, bonusPeriodLabel: label }));
        const uniqueSafeNames = Array.from(new Set(activeSupermarkets.map(sm => shortenSupermarketName(sm))));
        await Promise.all(uniqueSafeNames.map(safeName => db.set(`bonus-current-period-label-${safeName}`, label)));
    }, [activeSupermarkets]);

    const effectiveAggregatedWeights = useMemo(() => {
        if (isActive === false) return {};
        if (Object.keys(aggregatedWeights).length > 0) return aggregatedWeights;
        
        const weights: Record<string, number> = {};
        const hasAllInOne = departmentOptions.some(d => typeof d === "string" && d.toUpperCase().includes("ALL IN ONE"));
        
        if (hasAllInOne) {
            departmentOptions.forEach(d => {
                if (typeof d === "string") weights[d] = d.toUpperCase().includes("ALL IN ONE") ? 100 : 0;
            });
        } else {
            const share = 100 / (departmentOptions.length || 1);
            departmentOptions.forEach(d => { if (typeof d === "string") weights[d] = share; });
        }
        return weights;
    }, [aggregatedWeights, departmentOptions, isActive]);

    return {
        supermarkets,
        activeSupermarkets,
        activeDepartments,
        effectiveActiveDepartments,
        departmentOptions,
        aggregatedData,
        aggregatedWeights: effectiveAggregatedWeights,
        employeeDepartmentMap,
        installmentRows,
        banKemRows,
        banKemMap,
        revenueRows,
        employeeInstallmentMap,
        allEmployees,
        hiddenEmployees,
        deptEmployeeCounts,
        toggleSupermarket,
        toggleDepartment,
        handleSaveBonus,
        handleSaveBonusBatch,
        handleSaveBonusMonthly,
        resolveEmployeeSupermarket,
        setBonusPeriodLabel,
        setAggregatedData,
        dataVersion,
        hasAnalysisEmployees,
        analysisEmployeesCount: analysisEmployeesList.length,
        analysisEmployeesLastUpdated: analysisEmployeesPayload?.updatedAt || null,
        loadAnalysisEmployees
    };
}
