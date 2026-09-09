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

            it('activates Target, %HT, %DKHT and deactivates Target V.Trội and %HT V.Trội when clicking %DKHT (strictly maintaining canonical order)', () => {
                const current = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
                const updated = toggleCompetitionColumn('%DKHT', current, allowed, false);

                expect(updated).toEqual(['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại']);
            });

            it('activates Target V.Trội and %HT V.Trội and deactivates Target, %HT, %DKHT when clicking Target V.Trội', () => {
                const current = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
                const updated = toggleCompetitionColumn('Target V.Trội', current, allowed, false);

                expect(updated).toEqual(['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại']);
            });
        });
    });
});
