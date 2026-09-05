
import { useState, useMemo, useEffect } from 'react';
import { useIndexedDBState } from './useIndexedDBState';
import * as db from '../utils/db';
import * as dbService from '../services/dbService';
import {
    MainTab,
    SubTab,
    SupermarketCompetitionData,
    parseIndustryRealtimeData,
    parseIndustryLuyKeData,
    parseNumber,
    shortenSupermarketName,
    extractSupermarketList
} from '../utils/dashboardHelpers';
import { useWorker } from './useWorker';
import { useReportBiAuth } from './useReportBiAuth';
import { fetchAllowedSummaryLuyKeText, fetchAllowedCompetitionLuyKeData } from '../services/biDataService';
import { fetchSupermarketMap } from '../services/biSupermarketMapService';

export const useDashboardLogic = (isActive?: boolean) => {
    // --- State Management ---
    const [activeMainTab, setActiveMainTab] = useIndexedDBState<MainTab>('dashboard-main-tab', 'realtime');
    const [activeSubTab, setActiveSubTab] = useIndexedDBState<SubTab>('dashboard-sub-tab', 'revenue');
    const [activeSupermarket, setActiveSupermarket] = useIndexedDBState<string>('dashboard-active-supermarket', 'Tổng');

    const [summaryRealtime] = useIndexedDBState('summary-realtime', '');
    const [localSummaryLuyKe] = useIndexedDBState('summary-luy-ke', '');
    const [competitionRealtime] = useIndexedDBState('competition-realtime', '');
    const [localCompetitionLuyKe] = useIndexedDBState('competition-luy-ke', '');

    // Đợt 4 (implementation_plan.md) — phân quyền theo siêu thị: dữ liệu Luỹ kế DÙNG CHUNG
    // trong biData/{maKho}, đọc theo đúng Mã Kho user được cấp quyền (departmentId/myKhos()).
    // Nhân viên không có quyền dán (canManageSharedBiData=false) sẽ có localSummaryLuyKe/
    // localCompetitionLuyKe rỗng — 2 biến "shared*" dưới đây lấp đầy chỗ trống đó. Quản lý vẫn
    // ưu tiên dữ liệu vừa dán tại chỗ (không đợi round-trip Firestore), shared chỉ bổ sung
    // phần họ CHƯA dán trên thiết bị này.
    const { allowedKhos } = useReportBiAuth();
    const [sharedSummaryLuyKeText, setSharedSummaryLuyKeText] = useState('');
    const [sharedCompetitionLuyKeBySupermarket, setSharedCompetitionLuyKeBySupermarket] = useState<Record<string, SupermarketCompetitionData>>({});
    useEffect(() => {
        if (isActive === false || allowedKhos.length === 0) return;
        let isMounted = true;
        (async () => {
            try {
                const [text, competitionByKho, nameToKho] = await Promise.all([
                    fetchAllowedSummaryLuyKeText(allowedKhos),
                    fetchAllowedCompetitionLuyKeData(allowedKhos),
                    fetchSupermarketMap(),
                ]);
                if (!isMounted) return;
                setSharedSummaryLuyKeText(text);
                const khoToName: Record<string, string> = {};
                Object.entries(nameToKho).forEach(([name, maKho]) => { khoToName[maKho] = name; });
                const bySupermarketName: Record<string, SupermarketCompetitionData> = {};
                Object.entries(competitionByKho).forEach(([maKho, data]) => {
                    bySupermarketName[khoToName[maKho] || maKho] = data;
                });
                setSharedCompetitionLuyKeBySupermarket(bySupermarketName);
            } catch (err) {
                console.warn('[useDashboardLogic] Không thể tải dữ liệu BI dùng chung (chế độ offline/hạn chế quyền):', (err as any)?.message || err);
            }
        })();
        return () => { isMounted = false; };
    }, [allowedKhos.join(','), isActive]);

    const summaryLuyKe = localSummaryLuyKe || sharedSummaryLuyKeText;
    const supermarkets = useMemo(() => extractSupermarketList(summaryLuyKe), [summaryLuyKe]);
    const [summaryRealtimeTs] = useIndexedDBState<string | null>('summary-realtime-ts', null);
    const [competitionRealtimeTs] = useIndexedDBState<string | null>('competition-realtime-ts', null);
    const [competitionLuyKeTs] = useIndexedDBState<string | null>('competition-luy-ke-ts', null);

    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [isBatchExportingCumulative, setIsBatchExportingCumulative] = useState(false);
    const [isBatchExportingCompetition, setIsBatchExportingCompetition] = useState(false);
    const [dataVersion, setDataVersion] = useState(0);

    // --- Derived Data Parsing ---
    const [industryRealtimeData] = useIndexedDBState(activeSupermarket && activeSupermarket !== 'Tổng' && isActive !== false ? `config-${shortenSupermarketName(activeSupermarket)}-industry-realtime` : null, '');
    const [industryLuyKeData] = useIndexedDBState(activeSupermarket && activeSupermarket !== 'Tổng' && isActive !== false ? `config-${shortenSupermarketName(activeSupermarket)}-industry-luyke` : null, '');
    
    const { runWorkerTask } = useWorker();

    const [summaryRealtimeParsed, setSummaryRealtimeParsed] = useState<{ kpis: Record<string, string>, table: { headers: string[], rows: string[][] } }>({ kpis: {}, table: { headers: [], rows: [] } });
    useEffect(() => {
        if (!summaryRealtime || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_SUMMARY', summaryRealtime).then(res => {
            if (isMounted && res) setSummaryRealtimeParsed(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse tổng hợp realtime:', err));
        return () => { isMounted = false; };
    }, [summaryRealtime, isActive]);

    const [summaryLuyKeParsed, setSummaryLuyKeParsed] = useState<{ kpis: Record<string, string>, table: { headers: string[], rows: string[][] } }>({ kpis: {}, table: { headers: [], rows: [] } });
    useEffect(() => {
        if (!summaryLuyKe || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_SUMMARY', summaryLuyKe).then(res => {
            if (isMounted && res) setSummaryLuyKeParsed(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse tổng hợp luỹ kế:', err));
        return () => { isMounted = false; };
    }, [summaryLuyKe, isActive]);

    const [competitionRealtimeBySupermarket, setCompetitionRealtimeBySupermarket] = useState<Record<string, SupermarketCompetitionData>>({});
    useEffect(() => {
        if (!competitionRealtime || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_COMPETITION_BY_SUPERMARKET', competitionRealtime).then(res => {
            if (isMounted && res) setCompetitionRealtimeBySupermarket(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse thi đua realtime:', err));
        return () => { isMounted = false; };
    }, [competitionRealtime, isActive]);

    const [localCompetitionLuyKeBySupermarket, setLocalCompetitionLuyKeBySupermarket] = useState<Record<string, SupermarketCompetitionData>>({});
    useEffect(() => {
        if (!localCompetitionLuyKe || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_COMPETITION_BY_SUPERMARKET', localCompetitionLuyKe).then(res => {
            if (isMounted && res) setLocalCompetitionLuyKeBySupermarket(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse thi đua luỹ kế:', err));
        return () => { isMounted = false; };
    }, [localCompetitionLuyKe, isActive]);

    // Gộp theo tên siêu thị: shared trước, local đè lên (local luôn mới nhất trên thiết bị
    // đang dán) — bù đúng phần siêu thị nhân viên/quản lý CHƯA dán trên thiết bị này.
    const competitionLuyKeBySupermarket = useMemo(
        () => ({ ...sharedCompetitionLuyKeBySupermarket, ...localCompetitionLuyKeBySupermarket }),
        [sharedCompetitionLuyKeBySupermarket, localCompetitionLuyKeBySupermarket]
    );

    const [industryRealtimeParsed, setIndustryRealtimeParsed] = useState<ReturnType<typeof parseIndustryRealtimeData> | null>(null);
    const [industryLuyKeParsed, setIndustryLuyKeParsed] = useState<ReturnType<typeof parseIndustryLuyKeData> | null>(null);
    const [industryBiMap, setIndustryBiMap] = useState<Record<string, { parent: string; child: string }> | null>(null);

    useEffect(() => {
        let isMounted = true;
        const loadBiMap = async () => {
            const cachedConfig = await dbService.getProductConfig();
            if (isMounted && cachedConfig && cachedConfig.config && cachedConfig.config.industryBiMap) {
                setIndustryBiMap(cachedConfig.config.industryBiMap);
            }
        };
        loadBiMap();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (isActive === false || !industryRealtimeData) {
            setIndustryRealtimeParsed({ headers: [], rows: [], allRows: [], tree: [], totalRow: [] });
            return;
        }
        let isMounted = true;
        runWorkerTask('PARSE_INDUSTRY_REALTIME', { text: industryRealtimeData, industryBiMap }).then(res => {
            if (isMounted && res) setIndustryRealtimeParsed(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse ngành hàng realtime:', err));
        return () => { isMounted = false; };
    }, [industryRealtimeData, isActive, industryBiMap]);

    useEffect(() => {
        if (isActive === false || !industryLuyKeData) {
            setIndustryLuyKeParsed({ kpis: { laiGopQDDuKien: '', chiPhi: '', targetLNTT: '', htTargetDuKienLNTT: '' }, table: { headers: [], rows: [] }, tree: [], totalRow: [] });
            return;
        }
        let isMounted = true;
        runWorkerTask('PARSE_INDUSTRY_LUYKE', { text: industryLuyKeData, industryBiMap }).then(res => {
            if (isMounted && res) setIndustryLuyKeParsed(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse ngành hàng luỹ kế:', err));
        return () => { isMounted = false; };
    }, [industryLuyKeData, isActive, industryBiMap]);

    // --- Targets State ---
    const [supermarketDailyTargets, setSupermarketDailyTargets] = useState<Record<string, number>>({});
    const [supermarketMonthlyTargets, setSupermarketMonthlyTargets] = useState<Record<string, number>>({});
    const [supermarketTargets, setSupermarketTargets] = useState<Record<string, { quyDoi: number; traGop: number }>>({});
    
    const [augmentedRealtimeData, setAugmentedRealtimeData] = useState<Record<string, SupermarketCompetitionData>>({});
    const [augmentedLuyKeData, setAugmentedLuyKeData] = useState<Record<string, SupermarketCompetitionData>>({});

    // --- Side Effects ---
    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => {
            if (event.detail.key.startsWith('comptarget-') || event.detail.key.startsWith('targethero-')) {
                setDataVersion(v => v + 1);
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    // Đọc thẳng từ competitionLuyKeBySupermarket (đã merge local + shared) thay vì tự parse lại
    // raw text — raw text competitionLuyKe chỉ có ở thiết bị VỪA dán (manager/admin), luôn RỖNG
    // với nhân viên chỉ-đọc (đọc dữ liệu dùng chung qua biData/{maKho}, không có bản raw text
    // cục bộ) khiến baseTargets luôn {} → cột "Target V.Trội"/"%HTDK V.Trội" luôn = 0 cho toàn bộ
    // nhân viên đọc dữ liệu chung (Đợt 4). competitionLuyKeBySupermarket cùng shape
    // SupermarketCompetitionData nên đọc trực tiếp được, không cần raw text.
    // BUG (phát hiện 2026-09-05): 4 khối augment bên dưới trước đây chỉ thêm 2 cột "vượt trội" khi
    // headers CHƯA có, rồi luôn `data.push()` 2 giá trị vào CUỐI mảng. Dữ liệu dán từ BI hiện đã
    // kèm sẵn 2 cột đó (thường bỏ trống), nên headers coi như "đã có" → giá trị tính được rơi vào
    // vị trí KHÔNG có header tương ứng và bị CompetitionListView bỏ qua, còn ô hiển thị vẫn là ô
    // trống của nguồn ⇒ 2 cột "M.TIÊU V.TRỘI"/"%HTDK V.TRỘI" luôn hiện "-". Ghi theo INDEX của cột
    // (tạo cột nếu thiếu) thay cho push để đúng trong cả 2 trường hợp.
    const ensureColumnIndex = (headers: string[], name: string): number => {
        const index = headers.indexOf(name);
        if (index !== -1) return index;
        headers.push(name);
        return headers.length - 1;
    };

    /** Chuẩn hoá độ dài data về đúng số cột (đệm ô thiếu bằng '' thay vì tạo lỗ mảng — lỗ sẽ bị
     *  Array.map bỏ qua khiến bảng thiếu ô), rồi ghi giá trị vào đúng index cột. */
    const writeProgramCells = (data: (string | number)[], headerCount: number, cells: [number, number][]) => {
        while (data.length < headerCount) data.push('');
        data.length = headerCount;
        cells.forEach(([index, value]) => { data[index] = value; });
    };

    const computeCompetitionBaseTargets = (bySupermarket: Record<string, SupermarketCompetitionData>): Record<string, Record<string, number>> => {
        const targets: Record<string, Record<string, number>> = {};
        for (const smName in bySupermarket) {
            const sm = bySupermarket[smName];
            const targetIdx = sm.headers.findIndex(h => h.toUpperCase().includes('TARGET'));
            if (targetIdx !== -1) {
                if (!targets[smName]) targets[smName] = {};
                for (const prog of sm.programs) {
                    targets[smName][prog.name] = parseNumber(prog.data[targetIdx]);
                }
            }
        }
        return targets;
    };

    useEffect(() => {
        if (isActive === false) return;
        const augmentData = async () => {
            if (Object.keys(competitionRealtimeBySupermarket).length === 0 || Object.keys(competitionLuyKeBySupermarket).length === 0) {
                setAugmentedRealtimeData(competitionRealtimeBySupermarket);
                return;
            }
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const baseTargets = computeCompetitionBaseTargets(competitionLuyKeBySupermarket);
            const newAugmentedData = structuredClone(competitionRealtimeBySupermarket);
            const programTotalTargets: Record<string, number> = {};

            const getBaseTarget = (smName: string, progName: string) => {
                if (baseTargets[smName]?.[progName] !== undefined) return baseTargets[smName][progName];
                const safeSm = shortenSupermarketName(smName);
                for (const key in baseTargets) {
                    if (shortenSupermarketName(key) === safeSm || key === smName) {
                        const normProg = progName.trim().toLowerCase();
                        for (const pKey in baseTargets[key]) {
                            if (pKey.trim().toLowerCase() === normProg) {
                                return baseTargets[key][pKey];
                            }
                        }
                    }
                }
                return 0;
            };

            const supermarketNames = Object.keys(newAugmentedData).filter(name => name !== 'Tổng');
            const adjustmentsResults = await Promise.all(supermarketNames.map(async (supermarketName) => {
                const safeName = shortenSupermarketName(supermarketName);
                const adj = await db.get<Record<string, number>>(`comptarget-${safeName}-targets`);
                return { supermarketName, adjustments: adj || {} };
            }));
            const adjustmentsMap = new Map<string, Record<string, number>>();
            adjustmentsResults.forEach(res => adjustmentsMap.set(res.supermarketName, res.adjustments));
            
            for (const supermarketName of supermarketNames) {
                const adjustments = adjustmentsMap.get(supermarketName) || {};
                const supermarketData = newAugmentedData[supermarketName];
                if (!supermarketData || !supermarketData.headers || !supermarketData.programs) continue;
                const targetVTIndex = ensureColumnIndex(supermarketData.headers, 'Target V.Trội');
                const htTargetVTIndex = ensureColumnIndex(supermarketData.headers, '%HT Target V.Trội');
                for (const program of supermarketData.programs) {
                    const dtRealtime = parseNumber(program.data[0]);
                    const baseTarget = getBaseTarget(supermarketName, program.name);
                    const adjustmentPercent = adjustments[program.name] ?? 100;
                    const adjustedMonthTarget = baseTarget * (adjustmentPercent / 100);
                    const targetVT = adjustedMonthTarget > 0 ? adjustedMonthTarget / daysInMonth : 0;
                    if (!programTotalTargets[program.name]) programTotalTargets[program.name] = 0;
                    programTotalTargets[program.name] += targetVT;
                    const htTargetVT = targetVT > 0 ? (dtRealtime / targetVT) * 100 : 0;
                    writeProgramCells(program.data, supermarketData.headers.length, [
                        [targetVTIndex, targetVT],
                        [htTargetVTIndex, Math.ceil(htTargetVT)],
                    ]);
                }
            }
            if (newAugmentedData['Tổng']) {
                const totalData = newAugmentedData['Tổng'];
                const targetVTIndex = ensureColumnIndex(totalData.headers, 'Target V.Trội');
                const htTargetVTIndex = ensureColumnIndex(totalData.headers, '%HT Target V.Trội');
                for (const program of totalData.programs) {
                    const dtRealtime = parseNumber(program.data[0]);
                    const totalTargetVT = programTotalTargets[program.name] ?? 0;
                    const totalHtTargetVT = totalTargetVT > 0 ? (dtRealtime / totalTargetVT) * 100 : 0;
                    writeProgramCells(program.data, totalData.headers.length, [
                        [targetVTIndex, totalTargetVT],
                        [htTargetVTIndex, Math.ceil(totalHtTargetVT)],
                    ]);
                }
            }
            setAugmentedRealtimeData(newAugmentedData);
        };
        augmentData();
    }, [competitionRealtimeBySupermarket, competitionLuyKeBySupermarket, dataVersion, isActive]);

    useEffect(() => {
        if (isActive === false) return;
        const augmentData = async () => {
            if (Object.keys(competitionLuyKeBySupermarket).length === 0) {
                setAugmentedLuyKeData(competitionLuyKeBySupermarket);
                return;
            }
            const now = new Date();
            const daysPassed = now.getDate();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const baseTargets = computeCompetitionBaseTargets(competitionLuyKeBySupermarket);
            const newAugmentedData = structuredClone(competitionLuyKeBySupermarket);
            const programTotals: Record<string, { totalVT: number; totalLK: number }> = {};

            const getBaseTarget = (smName: string, progName: string) => {
                if (baseTargets[smName]?.[progName] !== undefined) return baseTargets[smName][progName];
                const safeSm = shortenSupermarketName(smName);
                for (const key in baseTargets) {
                    if (shortenSupermarketName(key) === safeSm || key === smName) {
                        const normProg = progName.trim().toLowerCase();
                        for (const pKey in baseTargets[key]) {
                            if (pKey.trim().toLowerCase() === normProg) {
                                return baseTargets[key][pKey];
                            }
                        }
                    }
                }
                return 0;
            };

            const supermarketNames = Object.keys(newAugmentedData).filter(name => name !== 'Tổng');
            const adjustmentsResults = await Promise.all(supermarketNames.map(async (supermarketName) => {
                const safeName = shortenSupermarketName(supermarketName);
                const adj = await db.get<Record<string, number>>(`comptarget-${safeName}-targets`);
                return { supermarketName, adjustments: adj || {} };
            }));
            const adjustmentsMap = new Map<string, Record<string, number>>();
            adjustmentsResults.forEach(res => adjustmentsMap.set(res.supermarketName, res.adjustments));
            
            for (const supermarketName of supermarketNames) {
                const adjustments = adjustmentsMap.get(supermarketName) || {};
                const supermarketData = newAugmentedData[supermarketName];
                if (!supermarketData || !supermarketData.headers || !supermarketData.programs) continue;
                const luyKeIndex = supermarketData.headers.findIndex((h: string) => {
                    const clean = h.toUpperCase();
                    return clean === 'DTLK' || clean === 'DTQĐ' || clean === 'SLLK' || clean === 'DOANH THU' || clean === 'SỐ LƯỢNG' || clean === 'L.KẾ';
                });
                const targetVTIndex = ensureColumnIndex(supermarketData.headers, 'Target V.Trội');
                const htdkVTIndex = ensureColumnIndex(supermarketData.headers, '%HTDK V.Trội');
                for (const program of supermarketData.programs) {
                    const baseTarget = getBaseTarget(supermarketName, program.name);
                    const adjustmentPercent = adjustments[program.name] ?? 100;
                    const targetVT = baseTarget * (adjustmentPercent / 100);
                    const luyKeValue = luyKeIndex !== -1 ? parseNumber(program.data[luyKeIndex]) : 0;
                    let htdkVT = 0;
                    if (daysPassed > 0 && targetVT > 0) {
                        const projectedValue = (luyKeValue / daysPassed) * daysInMonth;
                        htdkVT = (projectedValue / targetVT) * 100;
                    }
                    if (!programTotals[program.name]) programTotals[program.name] = { totalVT: 0, totalLK: 0 };
                    programTotals[program.name].totalVT += targetVT;
                    programTotals[program.name].totalLK += luyKeValue;
                    writeProgramCells(program.data, supermarketData.headers.length, [
                        [targetVTIndex, targetVT],
                        [htdkVTIndex, htdkVT],
                    ]);
                }
            }
            if (newAugmentedData['Tổng']) {
                const totalData = newAugmentedData['Tổng'];
                const targetVTIndex = ensureColumnIndex(totalData.headers, 'Target V.Trội');
                const htdkVTIndex = ensureColumnIndex(totalData.headers, '%HTDK V.Trội');
                for (const program of totalData.programs) {
                    const totals = programTotals[program.name] || { totalVT: 0, totalLK: 0 };
                    let totalHtdkVT = 0;
                    if (daysPassed > 0 && totals.totalVT > 0) {
                        const totalProjected = (totals.totalLK / daysPassed) * daysInMonth;
                        totalHtdkVT = (totalProjected / totals.totalVT) * 100;
                    }
                    writeProgramCells(program.data, totalData.headers.length, [
                        [targetVTIndex, totals.totalVT],
                        [htdkVTIndex, totalHtdkVT],
                    ]);
                }
            }
            setAugmentedLuyKeData(newAugmentedData);
        };
        augmentData();
    }, [competitionLuyKeBySupermarket, dataVersion, isActive]);

    useEffect(() => {
        if (isActive === false) return;
        const calculateTargets = async () => {
            const allDailyTargets: Record<string, number> = {};
            const allMonthlyTargets: Record<string, number> = {};
            const allTargets: Record<string, { quyDoi: number; traGop: number; }> = {};
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const allSupermarketsForTargets = ['Tổng', ...supermarkets];

            const targetsResults = await Promise.all(allSupermarketsForTargets.map(async (supermarketName) => {
                const safeName = shortenSupermarketName(supermarketName);
                const [quyDoi, traGop, totalTargetPercent] = await Promise.all([
                    db.get<number>(`targethero-${safeName}-quydoi`),
                    db.get<number>(`targethero-${safeName}-tragop`),
                    supermarketName === 'Tổng' ? Promise.resolve(100) : db.get<number>(`targethero-${safeName}-total`)
                ]);
                return {
                    supermarketName,
                    quyDoi: quyDoi ?? 40,
                    traGop: traGop ?? 45,
                    totalTargetPercent: totalTargetPercent ?? 100
                };
            }));
            
            for (const res of targetsResults) {
                const { supermarketName, quyDoi, traGop, totalTargetPercent } = res;
                allTargets[supermarketName] = { quyDoi, traGop };
                if (supermarketName === 'Tổng') continue;
                
                const luyKeSupermarketSummary = summaryLuyKeParsed.table.rows.find(r => r[0] === supermarketName);
                const dtDuKienQd = luyKeSupermarketSummary ? parseNumber(luyKeSupermarketSummary[5]) : 0; 
                const htTargetDuKienPercent = luyKeSupermarketSummary ? parseNumber(luyKeSupermarketSummary[6]) : 0; 
                let baseMonthTarget = 0;
                if (htTargetDuKienPercent > 0) baseMonthTarget = dtDuKienQd / (htTargetDuKienPercent / 100);
                const adjustedMonthTarget = baseMonthTarget * (totalTargetPercent / 100);
                const dailyTarget = adjustedMonthTarget > 0 ? adjustedMonthTarget / daysInMonth : 0;
                allDailyTargets[supermarketName] = dailyTarget;
                allMonthlyTargets[supermarketName] = adjustedMonthTarget;
            }
            
            setSupermarketDailyTargets(allDailyTargets);
            setSupermarketMonthlyTargets(allMonthlyTargets);
            setSupermarketTargets(allTargets);
        };
        if (summaryLuyKeParsed.table.rows.length > 0) calculateTargets();
    }, [supermarkets, summaryLuyKeParsed, dataVersion, isActive]);

    useEffect(() => {
        if (supermarkets.length > 0 && !['Tổng', ...supermarkets].includes(activeSupermarket)) setActiveSupermarket('Tổng');
    }, [supermarkets, activeSupermarket, setActiveSupermarket]);

    // --- KPI Helper ---
    const getKpiData = (isRealtime: boolean) => {
        const sourceData = isRealtime ? summaryRealtimeParsed : summaryLuyKeParsed;
        if (!sourceData || sourceData.table.rows.length === 0) return {};

        const kpis: Record<string, string> = {};
        
        // CRITICAL: Đảm bảo siêu thị 'Tổng' luôn có đủ các key tăng trưởng từ khối KPI header đã parse
        if (activeSupermarket === 'Tổng') {
            Object.assign(kpis, sourceData.kpis);
        }

        const headers = sourceData.table.headers;
        const row = sourceData.table.rows.find(r => r[0] === activeSupermarket);
        if (row) {
            const mapping: Record<string, string> = isRealtime 
            ? {
                dtlk: 'DTLK', dtqd: 'DTQĐ', targetQD: 'Target (QĐ)', htTargetQD: '% HT Target (QĐ)',
                lkhach: 'Lượt Khách LK', lbill: 'Lượt bill', lbillBH: 'Lượt Bill Bán Hàng',
                lbillTH: 'Lượt Bill Thu Hộ', tlpv: 'TLPVTC LK', tyTrongTraGop: 'Tỷ Trọng Trả Góp',
            }
            : {
                dtlk: 'DTLK', dtqd: 'DTQĐ', htTargetDuKienQD: '% HT Target Dự Kiến (QĐ)',
                dtDuKienQD: 'DT Dự Kiến (QĐ)', dtDuKien: 'DT Dự Kiến', lkhach: 'Lượt Khách LK', tlpv: 'TLPVTC LK',
                tyTrongTraGop: 'Tỷ Trọng Trả Góp', dtckThang: '+/- DTCK Tháng',
                dtckThangQD: '+/- DTCK Tháng (QĐ)', luotKhachChange: '+/- Lượt Khách',
                tlpvChange: '+/- TLPVTC', traGopChange: '+/- Tỷ Trọng Trả Góp',
            };
            for (const key in mapping) {
                let idx = headers.indexOf(mapping[key]);
                if (idx === -1 && key === 'tyTrongTraGop') {
                    idx = headers.findIndex(h => {
                        const clean = h.trim().toLowerCase();
                        return clean === 'tỷ trọng trả chậm' || clean === 'tỷ trọng trả góp' || clean === '%tc' || clean === '% trả chậm' || clean === '% trả góp';
                    });
                }
                if (idx === -1 && key === 'traGopChange') {
                    idx = headers.findIndex(h => {
                        const clean = h.trim().toLowerCase();
                        return clean === '+/- tỷ trọng trả chậm' || clean === '+/- tỷ trọng trả góp' || clean === '+/- %tc' || clean === '+/- % trả chậm' || clean === '+/- % trả góp';
                    });
                }
                if (idx !== -1 && row[idx]) kpis[key] = row[idx];
            }
        }

        if (!kpis.lbillBH) kpis.lbillBH = 'N/A';
        if (!kpis.lbillTH) kpis.lbillTH = sourceData.kpis.lbillTH || 'N/A';
        return kpis;
    };

    return {
        activeMainTab, setActiveMainTab,
        activeSubTab, setActiveSubTab,
        activeSupermarket, setActiveSupermarket,
        supermarkets,
        isBatchExporting, setIsBatchExporting,
        isBatchExportingCumulative, setIsBatchExportingCumulative,
        isBatchExportingCompetition, setIsBatchExportingCompetition,
        summaryRealtimeParsed, summaryLuyKeParsed,
        industryRealtimeParsed, industryLuyKeParsed,
        augmentedRealtimeData, augmentedLuyKeData,
        supermarketDailyTargets, supermarketMonthlyTargets, supermarketTargets,
        summaryRealtimeTs,
        competitionRealtimeTs,
        competitionLuyKeTs,
        getKpiData,
        hasRealtimeData: summaryRealtimeParsed.table.rows.length > 0,
        hasCumulativeData: summaryLuyKeParsed.table.rows.length > 0
    };
};
