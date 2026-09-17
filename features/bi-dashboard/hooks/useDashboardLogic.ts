
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
    extractSupermarketList,
    isSupermarketMatch
} from '../utils/dashboardHelpers';
import { useWorker } from './useWorker';
import { useReportBiAuth } from './useReportBiAuth';
import { fetchAllowedSummaryLuyKeText, fetchAllowedCompetitionLuyKeData } from '../services/biDataService';
import { fetchSupermarketMap } from '../services/biSupermarketMapService';
import { parseBaseTargetQuyDoi } from '../services/employeeParser';

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
    const { allowedKhos, user } = useReportBiAuth();
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
                    fetchSupermarketMap(user?.uid),
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
    }, [allowedKhos.join(','), isActive, user?.uid]);

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

    const effectiveIndustryRealtimeData = industryRealtimeData || (summaryRealtime && (summaryRealtime.toUpperCase().includes('NGÀNH HÀNG') && summaryRealtime.toUpperCase().includes('NHÓM HÀNG')) ? summaryRealtime : '');
    const effectiveIndustryLuyKeData = industryLuyKeData || (summaryLuyKe && (summaryLuyKe.toUpperCase().includes('NGÀNH HÀNG') && summaryLuyKe.toUpperCase().includes('NHÓM HÀNG')) ? summaryLuyKe : '');

    useEffect(() => {
        if (isActive === false || !effectiveIndustryRealtimeData) {
            setIndustryRealtimeParsed({ headers: [], rows: [], allRows: [], tree: [], totalRow: [] });
            return;
        }
        let isMounted = true;
        runWorkerTask('PARSE_INDUSTRY_REALTIME', { text: effectiveIndustryRealtimeData, industryBiMap }).then(res => {
            if (isMounted && res) setIndustryRealtimeParsed(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse ngành hàng realtime:', err));
        return () => { isMounted = false; };
    }, [effectiveIndustryRealtimeData, isActive, industryBiMap]);

    useEffect(() => {
        if (isActive === false || !effectiveIndustryLuyKeData) {
            setIndustryLuyKeParsed({ kpis: { laiGopQDDuKien: '', chiPhi: '', targetLNTT: '', htTargetDuKienLNTT: '' }, table: { headers: [], rows: [] }, tree: [], totalRow: [] });
            return;
        }
        let isMounted = true;
        runWorkerTask('PARSE_INDUSTRY_LUYKE', { text: effectiveIndustryLuyKeData, industryBiMap }).then(res => {
            if (isMounted && res) setIndustryLuyKeParsed(res);
        }).catch(err => console.error('[useDashboardLogic] Lỗi parse ngành hàng luỹ kế:', err));
        return () => { isMounted = false; };
    }, [effectiveIndustryLuyKeData, isActive, industryBiMap, activeSupermarket]);

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

    // Tuỳ chọn sử dụng Target DTQĐ sau chỉnh (từ Cấu hình siêu thị > Target doanh thu) làm mục tiêu chung
    const [useAdjustedTarget, setUseAdjustedTarget] = useIndexedDBState<boolean>('use-adjusted-revenue-target', false);

    useEffect(() => {
        if (isActive === false) return;
        const calculateTargets = async () => {
            const allDailyTargets: Record<string, number> = {};
            const allMonthlyTargets: Record<string, number> = {};
            const allTargets: Record<string, { quyDoi: number; traGop: number; }> = {};
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

            // Đọc toàn bộ DB để lấy tất cả cấu hình targethero-* (không phụ thuộc vào viết hoa/thường hay tiền tố)
            const allDbItems = await db.getAll();
            const targetHeroMap: Record<string, { quyDoi?: number; traGop?: number; total?: number }> = {};
            for (const item of allDbItems) {
                const m = item.key.match(/^targethero-(.+)-(quydoi|tragop|total)$/);
                if (m) {
                    const sm = m[1];
                    const field = m[2] as 'quydoi' | 'tragop' | 'total';
                    if (!targetHeroMap[sm]) targetHeroMap[sm] = {};
                    if (typeof item.value === 'number') {
                        if (field === 'quydoi') targetHeroMap[sm].quyDoi = item.value;
                        else if (field === 'tragop') targetHeroMap[sm].traGop = item.value;
                        else if (field === 'total') targetHeroMap[sm].total = item.value;
                    }
                }
            }

            const findTargetHero = (name: string): { quyDoi?: number; traGop?: number; total?: number } | null => {
                if (!name) return null;
                // 1. Khớp chính xác
                if (targetHeroMap[name]) {
                    return targetHeroMap[name];
                }
                // 2. Khớp theo shortenSupermarketName
                const short = shortenSupermarketName(name);
                if (targetHeroMap[short]) {
                    return targetHeroMap[short];
                }
                // 3. Khớp mờ / không phân biệt hoa thường qua isSupermarketMatch
                for (const [storedSm, val] of Object.entries(targetHeroMap)) {
                    if (isSupermarketMatch(name, storedSm) || (short && isSupermarketMatch(short, storedSm))) {
                        return val;
                    }
                }
                return null;
            };

            const storeTargetsList: { quyDoi: number; traGop: number; total: number }[] = [];

            for (const supermarketName of supermarkets) {
                const found = findTargetHero(supermarketName);
                const quyDoi = found?.quyDoi ?? 40;
                const traGop = found?.traGop ?? 45;
                const totalTargetPercent = found?.total ?? 100;

                const targetObj = { quyDoi, traGop };
                allTargets[supermarketName] = targetObj;
                const safeName = shortenSupermarketName(supermarketName);
                if (safeName) {
                    allTargets[safeName] = targetObj;
                }
                allTargets[supermarketName.toUpperCase()] = targetObj;
                allTargets[supermarketName.toLowerCase()] = targetObj;

                storeTargetsList.push({ quyDoi, traGop, total: totalTargetPercent });

                // Trích xuất Target gốc từ cột TARGET ở [Doanh thu hợp nhất > Luỹ kế]
                const baseMonthTarget = parseBaseTargetQuyDoi(summaryLuyKe, supermarketName);
                // Nếu người dùng chọn dùng Target DTQĐ sau chỉnh: nhân với tỷ lệ totalTargetPercent %
                const targetToUse = (useAdjustedTarget && baseMonthTarget > 0)
                    ? Math.round(baseMonthTarget * (totalTargetPercent / 100))
                    : baseMonthTarget;
                const dailyTarget = targetToUse > 0 ? targetToUse / daysInMonth : 0;
                allDailyTargets[supermarketName] = dailyTarget;
                allMonthlyTargets[supermarketName] = targetToUse;
                if (safeName) {
                    allMonthlyTargets[safeName] = targetToUse;
                    allDailyTargets[safeName] = dailyTarget;
                }
                allMonthlyTargets[supermarketName.toUpperCase()] = targetToUse;
                allMonthlyTargets[supermarketName.toLowerCase()] = targetToUse;
            }

            // Tính target cho 'Tổng' (Toàn Cụm):
            const tongExplicit = findTargetHero('Tổng');
            let tongQuyDoi = tongExplicit?.quyDoi;
            let tongTraGop = tongExplicit?.traGop;

            // Nếu không có cấu hình riêng cho Tổng, tổng hợp từ các siêu thị trong cụm:
            if (tongQuyDoi === undefined || tongTraGop === undefined) {
                if (storeTargetsList.length > 0) {
                    if (storeTargetsList.length === 1) {
                        tongQuyDoi = storeTargetsList[0].quyDoi;
                        tongTraGop = storeTargetsList[0].traGop;
                    } else {
                        const sumQd = storeTargetsList.reduce((acc, cur) => acc + cur.quyDoi, 0);
                        const sumTg = storeTargetsList.reduce((acc, cur) => acc + cur.traGop, 0);
                        tongQuyDoi = Math.round(sumQd / storeTargetsList.length);
                        tongTraGop = Math.round(sumTg / storeTargetsList.length);
                    }
                } else {
                    const allStoredTargets = Object.values(targetHeroMap).filter(t => t.quyDoi !== undefined || t.traGop !== undefined);
                    if (allStoredTargets.length > 0) {
                        tongQuyDoi = allStoredTargets[0].quyDoi ?? 40;
                        tongTraGop = allStoredTargets[0].traGop ?? 45;
                    } else {
                        tongQuyDoi = 40;
                        tongTraGop = 45;
                    }
                }
            }

            const tongTargetObj = { quyDoi: tongQuyDoi, traGop: tongTraGop };
            allTargets['Tổng'] = tongTargetObj;
            allTargets['TỔNG CỤM'] = tongTargetObj;
            allTargets['CỤM'] = tongTargetObj;
            allTargets['CỤM 1'] = tongTargetObj;

            // Tính tổng mục tiêu tháng & ngày cho 'Tổng' (Toàn cụm)
            const totalMonthly = supermarkets.reduce((sum, sm) => sum + (Number(allMonthlyTargets[sm]) || 0), 0);
            if (totalMonthly > 0) {
                allMonthlyTargets['Tổng'] = totalMonthly;
                allDailyTargets['Tổng'] = totalMonthly / daysInMonth;
            } else {
                const baseTongTarget = parseBaseTargetQuyDoi(summaryLuyKe, 'Tổng');
                const tongTargetToUse = (useAdjustedTarget && baseTongTarget > 0)
                    ? Math.round(baseTongTarget * (tongExplicit?.total ?? 100) / 100)
                    : baseTongTarget;
                if (tongTargetToUse > 0) {
                    allMonthlyTargets['Tổng'] = tongTargetToUse;
                    allDailyTargets['Tổng'] = tongTargetToUse / daysInMonth;
                }
            }
            allMonthlyTargets['TỔNG CỤM'] = allMonthlyTargets['Tổng'];
            allDailyTargets['TỔNG CỤM'] = allDailyTargets['Tổng'];
            allMonthlyTargets['CỤM'] = allMonthlyTargets['Tổng'];
            allDailyTargets['CỤM'] = allDailyTargets['Tổng'];
            
            setSupermarketDailyTargets(allDailyTargets);
            setSupermarketMonthlyTargets(allMonthlyTargets);
            setSupermarketTargets(allTargets);
        };
        if (summaryLuyKeParsed.table.rows.length > 0 || summaryLuyKe) calculateTargets();
    }, [supermarkets, summaryLuyKeParsed, summaryLuyKe, dataVersion, isActive, useAdjustedTarget]);

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

        const headers = sourceData.table.headers || [];
        const safeActive = activeSupermarket ? shortenSupermarketName(activeSupermarket).trim().toLowerCase() : '';
        const row = sourceData.table.rows.find(r => 
            r[0] === activeSupermarket || 
            (safeActive && shortenSupermarketName(r[0]).trim().toLowerCase() === safeActive)
        );
        if (row) {
            const mapping: Record<string, string> = isRealtime 
            ? {
                dtlk: 'DTLK', dtqd: 'DTQĐ', targetQD: 'Target (QĐ)', htTargetQD: '% HT Target (QĐ)',
                lkhach: 'Lượt Khách LK', lbill: 'Lượt bill', lbillBH: 'Lượt Bill Bán Hàng',
                lbillTH: 'Lượt Bill Thu Hộ', tlpv: 'TLPVTC LK', tyTrongTraGop: 'Tỷ Trọng Trả Góp',
            }
            : {
                dtlk: 'DTLK', dtqd: 'DTQĐ', targetQD: 'Target (QĐ)', htTargetQD: '% HT Target (QĐ)',
                htTargetDuKienQD: '% HT Target Dự Kiến (QĐ)',
                dtDuKienQD: 'DT Dự Kiến (QĐ)', dtDuKien: 'DT Dự Kiến', lkhach: 'Lượt Khách LK', tlpv: 'TLPVTC LK',
                tyTrongTraGop: 'Tỷ Trọng Trả Góp', dtckThang: '+/- DTCK Tháng',
                dtckThangQD: '+/- DTCK Tháng (QĐ)', luotKhachChange: '+/- Lượt Khách',
                tlpvChange: '+/- TLPVTC', traGopChange: '+/- Tỷ Trọng Trả Góp',
            };
            for (const key in mapping) {
                let idx = headers.indexOf(mapping[key]);
                if (idx === -1 && key === 'dtDuKienQD') {
                    idx = headers.findIndex(h => {
                        const clean = h.trim().toUpperCase();
                        return clean === 'DKQĐ' || clean === 'D.KIẾN QĐ' || clean === 'D.KIẾN' || clean === 'DT DỰ KIẾN (QĐ)' || clean === 'DT DỰ KIẾN';
                    });
                }
                if (idx === -1 && key === 'targetQD') {
                    idx = headers.findIndex(h => {
                        const clean = h.trim().toUpperCase();
                        return clean === 'TARGET' || clean === 'TAR' || clean === 'TARGET (QĐ)';
                    });
                }
                if (idx === -1 && key === 'htTargetQD') {
                    idx = headers.findIndex(h => {
                        const clean = h.trim().toUpperCase();
                        return clean === '%HT' || clean === '% HT TARGET' || clean === '% HT TARGET (QĐ)';
                    });
                }
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

        if (!kpis.dtDuKienQD && sourceData.kpis.dtDuKienQD) kpis.dtDuKienQD = sourceData.kpis.dtDuKienQD;
        if (!kpis.dtDuKien && sourceData.kpis.dtDuKien) kpis.dtDuKien = sourceData.kpis.dtDuKien;
        if (!kpis.targetQD && sourceData.kpis.targetQD) kpis.targetQD = sourceData.kpis.targetQD;
        if (!kpis.htTargetQD && sourceData.kpis.htTargetQD) kpis.htTargetQD = sourceData.kpis.htTargetQD;
        if (!kpis.tlpv && sourceData.kpis.tlpv) kpis.tlpv = sourceData.kpis.tlpv;
        if (!kpis.lkhach && sourceData.kpis.lkhach) kpis.lkhach = sourceData.kpis.lkhach;
        if (!kpis.lbill && sourceData.kpis.lbill) kpis.lbill = sourceData.kpis.lbill;
        if ((!kpis.lbillBH || kpis.lbillBH === 'N/A') && (sourceData.kpis.lbillBH || sourceData.kpis.lbill)) {
            kpis.lbillBH = sourceData.kpis.lbillBH || sourceData.kpis.lbill;
        }
        if (!kpis.lbillBH) kpis.lbillBH = 'N/A';
        if (!kpis.lbillTH) kpis.lbillTH = sourceData.kpis.lbillTH || 'N/A';
        if (!kpis.luotKhachChange && sourceData.kpis.luotKhachChange) kpis.luotKhachChange = sourceData.kpis.luotKhachChange;
        if (!kpis.tlpvChange && sourceData.kpis.tlpvChange) kpis.tlpvChange = sourceData.kpis.tlpvChange;

        // Tự động đồng bộ số liệu Realtime mới nhất từ báo cáo Siêu thị Ngành hàng (nếu người dùng đã dán)
        if (isRealtime && activeSupermarket !== 'Tổng' && industryRealtimeParsed) {
            const indTot = industryRealtimeParsed.totalRow;
            // indTot[2] = DTLK (THỰC), indTot[3] = DTQĐ
            if (indTot && indTot[2] && indTot[2] !== '0') kpis.dtlk = indTot[2];
            if (indTot && indTot[3] && indTot[3] !== '0') kpis.dtqd = indTot[3];

            const indKpis = (industryRealtimeParsed as any).kpis;
            if (indKpis?.tyTrongTraGop) {
                kpis.tyTrongTraGop = indKpis.tyTrongTraGop;
            } else if (indTot) {
                if (indTot[10] && indTot[10] !== '0%' && indTot[10] !== '—') {
                    kpis.tyTrongTraGop = indTot[10];
                } else if (indTot[9] && indTot[9] !== '0') {
                    const tgVal = parseNumber(indTot[9]);
                    const thucVal = parseNumber(indTot[2]);
                    if (thucVal > 0) {
                        kpis.tyTrongTraGop = `${(Math.round((tgVal / thucVal) * 1000) / 10).toFixed(1)}%`;
                    }
                }
            }

            if (indKpis?.tlpv) kpis.tlpv = indKpis.tlpv;
            if (indKpis?.lkhach) kpis.lkhach = indKpis.lkhach;
            if (indKpis?.lbill) {
                kpis.lbill = indKpis.lbill;
                kpis.lbillBH = indKpis.lbill;
            }
        }

        return kpis;
    };

    const augmentedSummaryRealtimeParsed = useMemo(() => {
        if (!summaryRealtimeParsed?.table?.rows?.length) return summaryRealtimeParsed;
        if (!industryRealtimeParsed?.totalRow || !activeSupermarket || activeSupermarket === 'Tổng') {
            return summaryRealtimeParsed;
        }
        const indTot = industryRealtimeParsed.totalRow;
        const dtlkNew = indTot[2];
        const dtqdNew = indTot[3];
        if (!dtlkNew || !dtqdNew || dtlkNew === '0') return summaryRealtimeParsed;

        const indKpis = (industryRealtimeParsed as any).kpis;
        let tyTrongTraGopNew = indKpis?.tyTrongTraGop;
        if (!tyTrongTraGopNew && indTot) {
            if (indTot[10] && indTot[10] !== '0%' && indTot[10] !== '—') {
                tyTrongTraGopNew = indTot[10];
            } else if (indTot[9] && indTot[9] !== '0') {
                const tgVal = parseNumber(indTot[9]);
                const thucVal = parseNumber(indTot[2]);
                if (thucVal > 0) {
                    tyTrongTraGopNew = `${(Math.round((tgVal / thucVal) * 1000) / 10).toFixed(1)}%`;
                }
            }
        }

        const headers = summaryRealtimeParsed.table.headers;
        const dtlkIdx = headers.indexOf('DTLK');
        const dtqdIdx = headers.indexOf('DTQĐ');
        const tcIdx = headers.findIndex(h => {
            const clean = h.trim().toLowerCase();
            return clean === 'tỷ trọng trả góp' || clean === 'tỷ trọng trả chậm' || clean === '%tc' || clean === '% trả góp' || clean === '% trả chậm';
        });
        if (dtlkIdx === -1 || dtqdIdx === -1) return summaryRealtimeParsed;

        const storeRows = summaryRealtimeParsed.table.rows.filter(r => r[0] !== 'Tổng');
        const isSingleStore = storeRows.length <= 1;

        let deltaDtlk = 0;
        let deltaDtqd = 0;

        const safeActive = activeSupermarket ? shortenSupermarketName(activeSupermarket).trim().toLowerCase() : '';
        const updatedRows = summaryRealtimeParsed.table.rows.map(row => {
            const isTargetStore = row[0] === activeSupermarket || (safeActive && shortenSupermarketName(row[0]).trim().toLowerCase() === safeActive);
            if (isTargetStore) {
                const oldDtlk = parseNumber(row[dtlkIdx]);
                const oldDtqd = parseNumber(row[dtqdIdx]);
                const newDtlkNum = parseNumber(dtlkNew);
                const newDtqdNum = parseNumber(dtqdNew);
                deltaDtlk = newDtlkNum - oldDtlk;
                deltaDtqd = newDtqdNum - oldDtqd;

                const newRow = [...row];
                newRow[dtlkIdx] = dtlkNew;
                newRow[dtqdIdx] = dtqdNew;
                if (tcIdx !== -1 && tyTrongTraGopNew) {
                    newRow[tcIdx] = `${Math.round(parseNumber(tyTrongTraGopNew))}%`;
                }
                return newRow;
            }
            return row;
        });

        const finalRows = updatedRows.map(row => {
            if (row[0] === 'Tổng') {
                const newRow = [...row];
                if (isSingleStore) {
                    newRow[dtlkIdx] = dtlkNew;
                    newRow[dtqdIdx] = dtqdNew;
                    if (tcIdx !== -1 && tyTrongTraGopNew) {
                        newRow[tcIdx] = `${Math.round(parseNumber(tyTrongTraGopNew))}%`;
                    }
                } else {
                    const currentDtlk = parseNumber(row[dtlkIdx]);
                    const currentDtqd = parseNumber(row[dtqdIdx]);
                    newRow[dtlkIdx] = String(Math.round(currentDtlk + deltaDtlk));
                    newRow[dtqdIdx] = String(Math.round(currentDtqd + deltaDtqd));
                }
                return newRow;
            }
            return row;
        });

        return {
            ...summaryRealtimeParsed,
            table: {
                headers,
                rows: finalRows,
            },
        };
    }, [summaryRealtimeParsed, industryRealtimeParsed, activeSupermarket]);

    return {
        activeMainTab, setActiveMainTab,
        activeSubTab, setActiveSubTab,
        activeSupermarket, setActiveSupermarket,
        supermarkets,
        isBatchExporting, setIsBatchExporting,
        isBatchExportingCumulative, setIsBatchExportingCumulative,
        isBatchExportingCompetition, setIsBatchExportingCompetition,
        summaryRealtimeParsed: augmentedSummaryRealtimeParsed,
        summaryLuyKeParsed,
        industryRealtimeParsed, industryLuyKeParsed,
        augmentedRealtimeData, augmentedLuyKeData,
        supermarketDailyTargets, supermarketMonthlyTargets, supermarketTargets,
        summaryRealtimeTs,
        competitionRealtimeTs,
        competitionLuyKeTs,
        getKpiData,
        summaryLuyKe,
        hasRealtimeData: summaryRealtimeParsed.table.rows.length > 0,
        hasCumulativeData: summaryLuyKeParsed.table.rows.length > 0,
        useAdjustedTarget,
        setUseAdjustedTarget
    };
};
