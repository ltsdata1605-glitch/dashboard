import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('YCX Realtime & Luỹ kế Isolation Tests', () => {
    it('Tampermonkey userscript @version matches SCRIPT_VERSION_FALLBACK (7.26)', () => {
        const scriptPath = path.resolve(__dirname, '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
        const content = fs.readFileSync(scriptPath, 'utf8');

        const versionMatch = content.match(/@version\s+([0-9.]+)/);
        expect(versionMatch).not.toBeNull();
        const headerVersion = versionMatch![1];

        const fallbackMatch = content.match(/const SCRIPT_VERSION_FALLBACK = ['"]([^'"]+)['"]/);
        expect(fallbackMatch).not.toBeNull();
        const fallbackVersion = fallbackMatch![1];

        expect(headerVersion).toBe('7.26');
        expect(fallbackVersion).toBe('7.26');
        expect(headerVersion).toBe(fallbackVersion);
    });

    it('ycxWaitFile filter logic rejects prior completed exports and only accepts new exports', () => {
        const scriptPath = path.resolve(__dirname, '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
        const content = fs.readFileSync(scriptPath, 'utf8');

        // Verify ycxRowKey includes LINKDOWNLOAD
        expect(content).toContain('r.UNIQUEQUERYID || r.LINKDOWNLOAD');

        // Simulate ycxWaitFile filter logic
        const startedAt = 1760250000000; // e.g. 13:26:00
        const before = new Set<string>();

        // An export that finished 1.5 minutes ago (13:24:30)
        const oldCompletedExport = {
            UNIQUEQUERYID: 'export-luyke-1',
            DYNAMICREPORTNAME: 'Chi tiết yêu cầu xuất',
            STARTTIME: new Date(startedAt - 90000).toISOString(),
            LINKDOWNLOAD: 'https://report.mwgroup.vn/download/luyke.xlsx',
            ISLOADING: false
        };

        // If before was captured:
        before.add(oldCompletedExport.UNIQUEQUERYID);

        function rowKey(r: any) {
            return String(r.UNIQUEQUERYID || r.LINKDOWNLOAD || `${r.DYNAMICREPORTNAME}|${r.STARTTIME}`);
        }

        function filterMoi(rows: any[], beforeSet: Set<string>, clickTime: number) {
            return rows.filter((r: any) => {
                if (beforeSet.has(rowKey(r))) return false;
                const rTime = new Date(r.STARTTIME).getTime();
                if (beforeSet.size === 0) {
                    if (rTime > 0 && rTime < clickTime - 10000) return false;
                    if (rTime <= clickTime && r.LINKDOWNLOAD && !r.ISLOADING) return false;
                }
                return true;
            });
        }

        // Case 1: before was captured -> old export is excluded
        const result1 = filterMoi([oldCompletedExport], before, startedAt);
        expect(result1).toHaveLength(0);

        // Case 2: before was empty (e.g. iframe loading delay) -> old export is STILL excluded because it was completed before clickTime
        const emptyBefore = new Set<string>();
        const result2 = filterMoi([oldCompletedExport], emptyBefore, startedAt);
        expect(result2).toHaveLength(0);

        // Case 3: A new export row started at click time with ISLOADING: true is accepted
        const newRunningExport = {
            UNIQUEQUERYID: 'export-realtime-2',
            DYNAMICREPORTNAME: 'Chi tiết yêu cầu xuất',
            STARTTIME: new Date(startedAt + 1000).toISOString(),
            LINKDOWNLOAD: null,
            ISLOADING: true
        };
        const result3 = filterMoi([newRunningExport], emptyBefore, startedAt);
        expect(result3).toHaveLength(1);
        expect(result3[0].UNIQUEQUERYID).toBe('export-realtime-2');
    });

    it('useFileUploadLogic deactivates historical files when isHistorical is false', () => {
        const fileUploadLogicPath = path.resolve(__dirname, '../../hooks/useFileUploadLogic.ts');
        const content = fs.readFileSync(fileUploadLogicPath, 'utf8');

        // Check that registry items are updated to isActive: false in the else branch (realtime)
        expect(content).toContain('updatedRegistry[k].isActive = false');
        expect(content).toContain('await dbService.saveSalesFilesRegistry(updatedRegistry)');
    });
});
