import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { StaffMember } from '../../features/phan-ca/types';

/**
 * File Google Sheet xuất từ Phân ca tô ô GH / KH / TN / OFF CÙNG HỌ MÀU với ô đó trong app (phanca.css `--cell-*-bg`).
 * 2026-10-21: ô Thu ngân trong Sheet vẫn tím trong khi app đã xanh sky — chủ dự án chốt đổi cho khớp. Sheet dùng tầng đậm hơn
 * app (nền 100 · chữ 800, không có viền) nên so theo HỌ màu chứ không so mã hex. Đổi màu ô trong app mà quên Sheet là test này đỏ.
 */

type Mau = { red: number; green: number; blue: number };
type LuatTo = {
    addConditionalFormatRule: {
        rule: {
            booleanRule: {
                condition: { values: { userEnteredValue: string }[] };
                format: { backgroundColorStyle: { rgbColor: Mau }; textFormat: { foregroundColorStyle: { rgbColor: Mau } } };
            };
        };
    };
};
type TuyChonXuat = { formattingRequests?: (sheetId: number) => unknown[] };

const bat = vi.hoisted(() => ({ tuyChon: null as TuyChonXuat | null, loi: null as string | null }));

vi.mock('../../features/phan-ca/services/firebase', () => ({
    loginWithGoogleForceConsent: async () => { sessionStorage.setItem('googleOAuthToken', 'token-gia'); },
}));
vi.mock('../../features/phan-ca/services/googleSheetsService', () => ({
    exportToGoogleSheet: async (_token: string, tuyChon: TuyChonXuat) => {
        bat.tuyChon = tuyChon;
        return 'https://docs.google.com/spreadsheets/d/gia';
    },
}));
vi.mock('../../components/shared/ui/toast', () => ({
    toastViecDai: () => ({ buoc: () => {}, xong: () => {}, loi: (m: string) => { bat.loi = m; } }),
}));

import { exportScheduleToGoogleSheet } from '../../features/phan-ca/services/googleSheetsExport';

const hex = (c: Mau) => '#' + [c.red, c.green, c.blue].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

/** Nền ô trong app (tầng 50) → họ màu. */
const HO_THEO_NEN_APP: Record<string, string> = { '#f0f9ff': 'sky', '#ecfdf5': 'emerald', '#fffbeb': 'amber', '#fff1f2': 'rose' };
/** Màu ô trong Sheet theo họ: nền 100 · chữ 800 (Tailwind). */
const SHEET_THEO_HO: Record<string, { nen: string; chu: string }> = {
    sky: { nen: '#e0f2fe', chu: '#075985' },
    emerald: { nen: '#d1fae5', chu: '#065f46' },
    amber: { nen: '#fef3c7', chu: '#92400e' },
    rose: { nen: '#ffe4e6', chu: '#9f1239' },
};

const nhanVien = (name: string, role: string): StaffMember => ({
    id: name, name, gender: 'Nu', department: 'Bán hàng',
    stats: { gh: 0, kho: 0, tn: 1, offDays: 0, swapCount: 0 },
    schedule: [null, { shift: 'C13', role }],
    changeHistory: [],
});

describe('Phân ca — màu ô trong file Google Sheet khớp app', () => {
    it('GH / KH / TN / OFF cùng họ màu với ô trong app — Thu ngân là sky, không còn tím', async () => {
        const kho = new Map<string, string>();
        vi.stubGlobal('sessionStorage', {
            getItem: (k: string) => kho.get(k) ?? null,
            setItem: (k: string, v: string) => { kho.set(k, v); },
            removeItem: (k: string) => { kho.delete(k); },
        });

        await exportScheduleToGoogleSheet({
            nams: [], nus: [{}], monthYear: '2026-10', duration: 1, startDay: 1, includeTnInSbh: true,
            getSortedStaffForExport: () => [nhanVien('Nguyễn Thị A', 'Thu ngân (TN)')],
            showToast: () => {},
        });
        vi.unstubAllGlobals();

        expect(bat.loi).toBeNull();
        const reqs = bat.tuyChon?.formattingRequests?.(7) ?? [];
        const theoChu = Object.fromEntries(
            reqs
                .filter((r): r is LuatTo => typeof r === 'object' && r !== null && 'addConditionalFormatRule' in r)
                .map(({ addConditionalFormatRule: { rule: { booleanRule: b } } }) => [
                    b.condition.values[0].userEnteredValue,
                    { nen: hex(b.format.backgroundColorStyle.rgbColor), chu: hex(b.format.textFormat.foregroundColorStyle.rgbColor) },
                ]),
        );

        const css = readFileSync(resolve(__dirname, '../../features/phan-ca/phanca.css'), 'utf8');
        for (const [ma, bien] of [['GH', 'gh'], ['KH', 'kho'], ['TN', 'tn'], ['OFF', 'off']] as const) {
            const nenApp = css.match(new RegExp(`--cell-${bien}-bg:\\s*(#[0-9a-fA-F]{6})`))?.[1].toLowerCase() ?? '';
            const ho = HO_THEO_NEN_APP[nenApp];
            expect(ho, `ô ${ma} trong app (--cell-${bien}-bg ${nenApp}) chưa có trong bảng họ màu — thêm vào và sửa Sheet theo`).toBeDefined();
            expect(theoChu[ma], `ô ${ma} trong Google Sheet phải cùng họ ${ho} với app`).toEqual(SHEET_THEO_HO[ho]);
        }
        expect(theoChu.TN).toEqual({ nen: '#e0f2fe', chu: '#075985' });
    });
});
