import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compareVersions } from './biAutoSyncService';

const USERSCRIPT = readFileSync(resolve(__dirname, '../../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');

describe('compareVersions — so theo SỐ, không so chuỗi', () => {
    it('so đúng các trường hợp thường', () => {
        expect(compareVersions('7.3', '7.4')).toBeLessThan(0);
        expect(compareVersions('7.4', '7.4')).toBe(0);
        expect(compareVersions('7.4', '6.9')).toBeGreaterThan(0);
        expect(compareVersions('7.4', '7.4.0')).toBe(0);
    });
    it('"7.10" mới hơn "7.9" và "10.0" mới hơn "6.3" (so chuỗi sẽ sai cả hai)', () => {
        expect(compareVersions('7.10', '7.9')).toBeGreaterThan(0);
        expect(compareVersions('10.0', '6.3')).toBeGreaterThan(0);
        expect('10.0' < '6.3').toBe(true); // minh hoạ lỗi của cách so cũ `ver < '6.3'`
    });
});

describe('userscript báo đúng phiên bản', () => {
    it('hằng dự phòng SCRIPT_VERSION_FALLBACK trùng dòng @version', () => {
        const header = USERSCRIPT.match(/^\/\/\s*@version\s+([\d.]+)/m)?.[1];
        const fallback = USERSCRIPT.match(/SCRIPT_VERSION_FALLBACK = '([\d.]+)'/)?.[1];
        expect(header).toBeTruthy();
        expect(fallback).toBe(header);
    });
    it('không còn ghi cứng phiên bản báo cho Dashboard', () => {
        expect(USERSCRIPT).toMatch(/GM_info\.script\.version/);
        expect(USERSCRIPT).not.toMatch(/const SCRIPT_VERSION = '\d/);
    });
});
