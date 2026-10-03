import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getExportDestination,
    setExportDestination,
    loadExportDestinations,
    reportKeyFromFilename,
    type ExportDestination
} from './analysisExportDestinations';

// Mock dbService to avoid IndexedDB issues in tests
vi.mock('./dbService', () => {
    let mockStore: Record<string, unknown> = {};
    return {
        getSetting: vi.fn(async (key: string) => mockStore[key] ?? null),
        saveSetting: vi.fn(async (key: string, val: unknown) => { mockStore[key] = val; }),
        __clearMock: () => { mockStore = {}; }
    };
});

describe('analysisExportDestinations multi-group support', () => {
    beforeEach(async () => {
        const { __clearMock } = (await import('./dbService')) as any;
        __clearMock();
        // Clear global store map
        const G = globalThis as any;
        if (G.__ycxExportDest) {
            G.__ycxExportDest.map = {};
            G.__ycxExportDest.loaded = null;
        }
    });

    it('returns download by default', () => {
        expect(getExportDestination('Báo Cáo Test')).toEqual({ kind: 'download' });
    });

    it('supports setting and getting multiple LINE groups', async () => {
        const groups = [
            { groupId: 'c123', groupName: 'Nhóm Kho 910' },
            { groupId: 'c456', groupName: 'Nhóm Thu Ngân' },
        ];
        await setExportDestination('Chi Tiết Theo Kho', {
            kind: 'line',
            groups,
        });

        const dest = getExportDestination('Chi Tiết Theo Kho');
        expect(dest.kind).toBe('line');
        if (dest.kind === 'line') {
            expect(dest.groups).toHaveLength(2);
            expect(dest.groups?.[0].groupId).toBe('c123');
            expect(dest.groups?.[1].groupId).toBe('c456');
            expect(dest.groupName).toBe('Nhóm Kho 910, Nhóm Thu Ngân');
            expect(dest.groupId).toBe('c123');
        }
    });

    it('maintains backwards compatibility for legacy single-group format', async () => {
        await setExportDestination('Tổng Quan Doanh Thu', {
            kind: 'line',
            groupId: 'c999',
            groupName: 'Nhóm Quản Lý',
        } as any);

        const dest = getExportDestination('Tổng Quan Doanh Thu');
        expect(dest.kind).toBe('line');
        if (dest.kind === 'line') {
            expect(dest.groups).toHaveLength(1);
            expect(dest.groups?.[0].groupId).toBe('c999');
            expect(dest.groups?.[0].groupName).toBe('Nhóm Quản Lý');
            expect(dest.groupId).toBe('c999');
            expect(dest.groupName).toBe('Nhóm Quản Lý');
        }
    });

    it('resets to download when empty groups array or kind download is passed', async () => {
        await setExportDestination('Chi Tiết Theo Kho', {
            kind: 'line',
            groups: [{ groupId: 'c123', groupName: 'Nhóm 910' }],
        });
        expect(getExportDestination('Chi Tiết Theo Kho').kind).toBe('line');

        await setExportDestination('Chi Tiết Theo Kho', { kind: 'download' });
        expect(getExportDestination('Chi Tiết Theo Kho')).toEqual({ kind: 'download' });
    });

    it('defaults report command for Chi Tiết Theo Kho to "bc"', async () => {
        const { getReportCommand, sanitizeReportCommand } = await import('./analysisExportDestinations');
        expect(getReportCommand('Chi Tiết Theo Kho')).toBe('bc');
        expect(sanitizeReportCommand('.bc')).toBe('bc');
        expect(sanitizeReportCommand('/BC ')).toBe('bc');
        expect(sanitizeReportCommand('!cttk')).toBe('cttk');
    });

    it('supports saving and retrieving custom report commands', async () => {
        const { getReportCommand } = await import('./analysisExportDestinations');
        await setExportDestination('Tổng Quan Doanh Thu', {
            kind: 'line',
            groups: [{ groupId: 'c123', groupName: 'Nhóm Test' }],
            command: 'dt',
        });

        const dest = getExportDestination('Tổng Quan Doanh Thu');
        expect(dest.command).toBe('dt');
        expect(getReportCommand('Tổng Quan Doanh Thu')).toBe('dt');
    });
});
