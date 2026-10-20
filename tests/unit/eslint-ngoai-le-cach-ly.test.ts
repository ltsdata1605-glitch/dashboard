import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

/**
 * Ngoại lệ cách ly thứ 5 (2026-10-20, eslint.config.js): Report BI được import `services/autoReportExportService` (tự xuất báo cáo
 * — tính năng chủ dự án) ở ĐÚNG 2 file và `hooks/useSystemTraffic` ở ĐÚNG BiWrapper. Test khoá cả 2 chiều bằng đúng cấu hình thật:
 * 3 file đó không còn đỏ; file KHÁC của Report BI (và feature khác) import cùng thứ đó VẪN đỏ — ngoại lệ không được loang ra.
 */
const eslint = new ESLint({ cwd: process.cwd() });
const loiCachLy = async (code: string, filePath: string) => {
    const [r] = await eslint.lintText(code, { filePath });
    return r.messages.filter((m) => m.ruleId === 'import/no-restricted-paths').length;
};
const XUAT = "import { saveAutoReportImagesToFirebase } from '../../../services/autoReportExportService';\nexport const f = saveAutoReportImagesToFirebase;\n";
const DEM = "import { useSystemTraffic } from '../../../hooks/useSystemTraffic';\nexport const f = useSystemTraffic;\n";

describe('ngoại lệ cách ly thứ 5 — hẹp đúng file, đúng đường dẫn', () => {
    it('Dashboard.tsx + useBiAutoSync.tsx được import autoReportExportService', async () => {
        expect(await loiCachLy(XUAT, 'features/bi-dashboard/components/Dashboard.tsx')).toBe(0);
        expect(await loiCachLy(XUAT, 'features/bi-dashboard/hooks/useBiAutoSync.tsx')).toBe(0);
    }, 30_000);

    it('BiWrapper.tsx được import useSystemTraffic', async () => {
        expect(await loiCachLy(DEM, 'features/bi-dashboard/components/BiWrapper.tsx')).toBe(0);
    }, 30_000);

    it('file KHÁC của Report BI import cùng thứ đó vẫn bị chặn', async () => {
        expect(await loiCachLy(XUAT, 'features/bi-dashboard/components/NhanVien.tsx')).toBe(1);
        expect(await loiCachLy(DEM, 'features/bi-dashboard/components/Dashboard.tsx')).toBe(1);
        expect(await loiCachLy(XUAT, 'features/bi-dashboard/components/BiWrapper.tsx')).toBe(1);
    }, 30_000);

    it('3 file ngoại lệ vẫn bị chặn với hooks/services gốc KHÁC', async () => {
        const khac = "import { getSetting } from '../../../services/dbService';\nexport const f = getSetting;\n";
        expect(await loiCachLy(khac, 'features/bi-dashboard/components/Dashboard.tsx')).toBe(1);
        expect(await loiCachLy(khac, 'features/bi-dashboard/components/BiWrapper.tsx')).toBe(1);
    }, 30_000);

    it('feature khác không hưởng ngoại lệ', async () => {
        expect(await loiCachLy(XUAT.replaceAll('../../../', '../../../'), 'features/phan-ca/components/__thu__.tsx')).toBe(1);
    }, 30_000);
});
