import { describe, it, expect } from 'vitest';
import { 
    calculateProgramRemaining, 
    compareByCompletionPriority, 
    sortProgramsList,
    toggleCompetitionColumn,
    ALLOWED_REALTIME_COLUMNS,
    ALLOWED_LUYKE_COLUMNS
} from './competitionSortAndCalc';
import type { ProcessedProgram } from '../CompetitionView';

describe('competitionSortAndCalc', () => {
    describe('calculateProgramRemaining', () => {
        it('calculates conLai = Actual - Target V.Trội when Target V.Trội is visible', () => {
            const allHeaders = ['Target V.Trội', 'Realtime', '%HT V.Trội', 'Còn Lại'];
            const visibleColumns = ['Target V.Trội', 'Realtime', '%HT V.Trội', 'Còn Lại'];
            
            // SIM MOBI/VINA/SIM: Actual = 3, Target VT = 18
            const prog1: ProcessedProgram = {
                name: 'SIM MOBI/VINA/SIM',
                data: [18, 3, 17, 0],
                metric: 'SLLK',
                conLai: null
            };
            expect(calculateProgramRemaining(prog1, visibleColumns, allHeaders, true)).toBe(-15);

            // SIM TỔNG: Actual = 4, Target VT = 28
            const prog2: ProcessedProgram = {
                name: 'SIM TỔNG',
                data: [28, 4, 14, 0],
                metric: 'SLLK',
                conLai: null
            };
            expect(calculateProgramRemaining(prog2, visibleColumns, allHeaders, true)).toBe(-24);

            // TC HOMECREDIT: Actual = 101, Target VT = 223
            const prog3: ProcessedProgram = {
                name: 'TC HOMECREDIT',
                data: [223, 101, 45, 0],
                metric: 'DTLK',
                conLai: null
            };
            expect(calculateProgramRemaining(prog3, visibleColumns, allHeaders, true)).toBe(-122);
        });

        it('falls back to Target when Target V.Trội is hidden and only Target is visible', () => {
            const allHeaders = ['Target V.Trội', 'Target', 'Realtime', '%HT', 'Còn Lại'];
            const visibleColumns = ['Target', 'Realtime', '%HT', 'Còn Lại'];
            
            const prog: ProcessedProgram = {
                name: 'SIM MOBI/VINA/SIM',
                data: [18, 3, 3, 100, 0],
                metric: 'SLLK',
                conLai: null
            };
            // Actual (3) - Target (3) = 0
            expect(calculateProgramRemaining(prog, visibleColumns, allHeaders, true)).toBe(0);
        });

        it('calculates properly in Luỹ kế mode with L.Kế', () => {
            const allHeaders = ['Target V.Trội', 'L.Kế', '%HTDK', 'Còn Lại'];
            const visibleColumns = ['Target V.Trội', 'L.Kế', '%HTDK', 'Còn Lại'];
            
            const prog: ProcessedProgram = {
                name: 'ĐIỆN TỬ',
                data: [58, 40, 68, 0],
                metric: 'DTLK',
                conLai: null
            };
            expect(calculateProgramRemaining(prog, visibleColumns, allHeaders, false)).toBe(-18);
        });
    });

    describe('compareByCompletionPriority (%HT V.Trội > %DKHT > %HT)', () => {
        const headers = ['Target V.Trội', 'Realtime', '%HT V.Trội', '%HTDK', '%HT', 'Còn Lại'];

        it('sorts primarily by %HT V.Trội descending', () => {
            const progA: ProcessedProgram = {
                name: 'Prog A',
                data: [10, 7, 70, 50, 40, 0],
                metric: 'DTLK',
                conLai: null
            };
            const progB: ProcessedProgram = {
                name: 'Prog B',
                data: [10, 5, 50, 90, 80, 0],
                metric: 'DTLK',
                conLai: null
            };

            // Prog A has 70% HT VT, Prog B has 50% HT VT -> Prog A should come before Prog B
            expect(compareByCompletionPriority(progA, progB, headers, 'desc')).toBeLessThan(0);
        });

        it('sorts by %DKHT when %HT V.Trội is equal or missing', () => {
            const progA: ProcessedProgram = {
                name: 'Prog A',
                data: [10, 0, 0, 85, 30, 0],
                metric: 'DTLK',
                conLai: null
            };
            const progB: ProcessedProgram = {
                name: 'Prog B',
                data: [10, 0, 0, 65, 50, 0],
                metric: 'DTLK',
                conLai: null
            };

            // Both have 0% HT VT. Prog A has 85% DKHT, Prog B has 65% DKHT -> Prog A comes before Prog B
            expect(compareByCompletionPriority(progA, progB, headers, 'desc')).toBeLessThan(0);
        });

        it('sorts by %HT when %HT V.Trội and %DKHT are both equal', () => {
            const progA: ProcessedProgram = {
                name: 'Prog A',
                data: [10, 0, 0, 70, 45, 0],
                metric: 'DTLK',
                conLai: null
            };
            const progB: ProcessedProgram = {
                name: 'Prog B',
                data: [10, 0, 0, 70, 25, 0],
                metric: 'DTLK',
                conLai: null
            };

            // Both have 0% HT VT and 70% DKHT. Prog A has 45% HT, Prog B has 25% HT -> Prog A comes before Prog B
            expect(compareByCompletionPriority(progA, progB, headers, 'desc')).toBeLessThan(0);
        });
    });

    describe('sortProgramsList default sorting', () => {
        it('automatically sorts programs descending by %HT V.Trội > %DKHT > %HT when sortConfig is null', () => {
            const headers = ['Target V.Trội', 'Realtime', '%HT V.Trội', '%HTDK', '%HT', 'Còn Lại'];
            const prog1: ProcessedProgram = { name: 'P1', data: [10, 1, 10, 80, 50, 0], metric: 'SLLK', conLai: null };
            const prog2: ProcessedProgram = { name: 'P2', data: [10, 7, 70, 60, 40, 0], metric: 'SLLK', conLai: null };
            const prog3: ProcessedProgram = { name: 'P3', data: [10, 1, 10, 90, 40, 0], metric: 'SLLK', conLai: null };
            const prog4: ProcessedProgram = { name: 'P4', data: [10, 1, 10, 80, 60, 0], metric: 'SLLK', conLai: null };

            const sorted = sortProgramsList([prog1, prog2, prog3, prog4], null, headers);
            // P2: HT VT = 70% (highest)
            // P3: HT VT = 10%, DKHT = 90%
            // P4: HT VT = 10%, DKHT = 80%, HT = 60%
            // P1: HT VT = 10%, DKHT = 80%, HT = 50%
            expect(sorted.map(p => p.name)).toEqual(['P2', 'P3', 'P4', 'P1']);
        });

        it('correctly sorts real user screenshot SLLK data descending by %HT V.Trội', () => {
            const headers = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
            const programs: ProcessedProgram[] = [
                { name: 'OTT MANGO/, ICALLME/', data: [202, 600, '113%', -398], metric: 'SLLK', conLai: -398 },
                { name: 'VAS', data: [308, 586, '176%', -278], metric: 'SLLK', conLai: -278 },
                { name: 'SIM MOBI/VINA/SIM', data: [87, 515, '57%', -428], metric: 'SLLK', conLai: -428 },
                { name: 'SIM TỔNG', data: [116, 835, '47%', -719], metric: 'SLLK', conLai: -719 },
                { name: 'NẠP/RÚT NH', data: [142, 819, '58%', -677], metric: 'SLLK', conLai: -677 },
                { name: 'MỞ THẺ TÍN DỤNG', data: [0, 1, '0%', -1], metric: 'SLLK', conLai: -1 },
            ];

            // Mặc định (sortConfig = null)
            const sortedDefault = sortProgramsList(programs, null, headers);
            expect(sortedDefault.map(p => p.name)).toEqual([
                'VAS', // 176%
                'OTT MANGO/, ICALLME/', // 113%
                'NẠP/RÚT NH', // 58%
                'SIM MOBI/VINA/SIM', // 57%
                'SIM TỔNG', // 47%
                'MỞ THẺ TÍN DỤNG' // 0%
            ]);

            // Khi click vào cột %HT V.Trội (columnIndex = 2)
            const sortedByCol = sortProgramsList(programs, { columnIndex: 2, direction: 'desc' }, headers);
            expect(sortedByCol.map(p => p.name)).toEqual([
                'VAS',
                'OTT MANGO/, ICALLME/',
                'NẠP/RÚT NH',
                'SIM MOBI/VINA/SIM',
                'SIM TỔNG',
                'MỞ THẺ TÍN DỤNG'
            ]);
        });

        it('correctly sorts real user screenshot DTLK data descending by %HT V.Trội', () => {
            const headers = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
            const programs: ProcessedProgram[] = [
                { name: 'VÍ TRẢ SAU', data: [329, 941, '117%', -611], metric: 'DTLK', conLai: -611 },
                { name: 'TAI NGHE', data: [36, 150, '79%', -114], metric: 'DTLK', conLai: -114 },
                { name: 'CE-ĐGD TOSHIBA', data: [722, 1269, '190%', -547], metric: 'DTLK', conLai: -547 },
                { name: 'SẠC DỰ PHÒNG', data: [64, 386, '56%', -321], metric: 'DTLK', conLai: -321 },
                { name: 'GIA DỤNG KANGAROO', data: [392, 803, '163%', -411], metric: 'DTLK', conLai: -411 },
                { name: 'ĐIỆN TỬ SONY', data: [144, 366, '132%', -221], metric: 'DTLK', conLai: -221 },
            ];

            const sorted = sortProgramsList(programs, null, headers);
            expect(sorted.map(p => p.name)).toEqual([
                'CE-ĐGD TOSHIBA', // 190%
                'GIA DỤNG KANGAROO', // 163%
                'ĐIỆN TỬ SONY', // 132%
                'VÍ TRẢ SAU', // 117%
                'TAI NGHE', // 79%
                'SẠC DỰ PHÒNG' // 56%
            ]);
        });

        describe('Mode-aware sorting (Realtime vs Luỹ kế)', () => {
            const allHeaders = ['Realtime', 'L.Kế', 'Target', '%HT', '%DKHT', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
            const prog1: ProcessedProgram = {
                name: 'Prog Alpha',
                // Realtime, L.Kế, Target, %HT, %DKHT, Target VT, %HT VT, Còn Lại
                data: [10, 100, 20, 50, 80, 40, 120, 0], // %HT=50, %DKHT=80, %HT VT=120
                metric: 'SLLK',
                conLai: null
            };
            const prog2: ProcessedProgram = {
                name: 'Prog Beta',
                data: [20, 200, 20, 90, 60, 40, 70, 0], // %HT=90, %DKHT=60, %HT VT=70
                metric: 'SLLK',
                conLai: null
            };

            it('Realtime: sorts by %HT V.Trội when %HT V.Trội column is visible', () => {
                const visible = ['Realtime', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
                const sorted = sortProgramsList([prog1, prog2], null, allHeaders, {}, visible, true);
                // Prog Alpha (%HT VT=120) > Prog Beta (%HT VT=70)
                expect(sorted.map(p => p.name)).toEqual(['Prog Alpha', 'Prog Beta']);
            });

            it('Realtime: sorts by %HT when %HT column is visible (standard group active)', () => {
                const visible = ['Realtime', 'Target', '%HT', 'Còn Lại'];
                const sorted = sortProgramsList([prog1, prog2], null, allHeaders, {}, visible, true);
                // Prog Beta (%HT=90) > Prog Alpha (%HT=50)
                expect(sorted.map(p => p.name)).toEqual(['Prog Beta', 'Prog Alpha']);
            });

            it('Luỹ kế: sorts by %HT V.Trội when %HT V.Trội column is visible', () => {
                const visible = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
                const sorted = sortProgramsList([prog1, prog2], null, allHeaders, {}, visible, false);
                // Prog Alpha (%HT VT=120) > Prog Beta (%HT VT=70)
                expect(sorted.map(p => p.name)).toEqual(['Prog Alpha', 'Prog Beta']);
            });

            it('Luỹ kế: sorts by %DKHT when %DKHT column is visible (standard group active)', () => {
                const visible = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
                const sorted = sortProgramsList([prog1, prog2], null, allHeaders, {}, visible, false);
                // Prog Alpha (%DKHT=80) > Prog Beta (%DKHT=60)
                expect(sorted.map(p => p.name)).toEqual(['Prog Alpha', 'Prog Beta']);
            });
        });
    });

    describe('toggleCompetitionColumn and Mutual Exclusivity', () => {
        describe('Realtime mode', () => {
            const allowed = [...ALLOWED_REALTIME_COLUMNS];

            it('activates both Target and %HT and deactivates Target V.Trội and %HT V.Trội when clicking Target (strictly maintaining canonical order)', () => {
                const current = ['Realtime', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
                const updated = toggleCompetitionColumn('Target', current, allowed, true);

                expect(updated).toEqual(['Realtime', 'Target', '%HT', 'Còn Lại']);
            });

            it('activates both Target and %HT and deactivates Target V.Trội and %HT V.Trội when clicking %HT', () => {
                const current = ['Realtime', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
                const updated = toggleCompetitionColumn('%HT', current, allowed, true);

                expect(updated).toEqual(['Realtime', 'Target', '%HT', 'Còn Lại']);
            });

            it('activates both Target V.Trội and %HT V.Trội and deactivates Target and %HT when clicking Target V.Trội', () => {
                const current = ['Realtime', 'Target', '%HT', 'Còn Lại'];
                const updated = toggleCompetitionColumn('Target V.Trội', current, allowed, true);

                expect(updated).toEqual(['Realtime', 'Target V.Trội', '%HT V.Trội', 'Còn Lại']);
            });
        });

        describe('Luỹ kế mode', () => {
            const allowed = [...ALLOWED_LUYKE_COLUMNS];

            it('toggles %DKHT independently while preserving Target V.Trội and %HT V.Trội', () => {
                const current = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
                const updated = toggleCompetitionColumn('%DKHT', current, allowed, false);

                expect(updated).toEqual(['L.Kế', '%DKHT', 'Target V.Trội', '%HT V.Trội', 'Còn Lại']);
            });

            it('activates Target and %HT and deactivates Target V.Trội and %HT V.Trội when clicking Target (retaining %DKHT)', () => {
                const current = ['L.Kế', '%DKHT', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
                const updated = toggleCompetitionColumn('Target', current, allowed, false);

                expect(updated).toEqual(['L.Kế', '%DKHT', 'Target', '%HT', 'Còn Lại']);
            });

            it('activates Target V.Trội and %HT V.Trội and deactivates Target and %HT when clicking Target V.Trội (retaining %DKHT)', () => {
                const current = ['L.Kế', '%DKHT', 'Target', '%HT', 'Còn Lại'];
                const updated = toggleCompetitionColumn('Target V.Trội', current, allowed, false);

                expect(updated).toEqual(['L.Kế', '%DKHT', 'Target V.Trội', '%HT V.Trội', 'Còn Lại']);
            });
        });
    });
});
