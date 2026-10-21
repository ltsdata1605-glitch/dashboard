import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { StaffMember } from '../../features/phan-ca/types';
import { splitCalendarWeeks, weekThemes } from '../../features/phan-ca/utils/weekUtils';

/**
 * File Google Sheet xuất từ Phân ca phải CÙNG MÀU với bảng lịch trong app (chủ dự án chốt 2026-10-21):
 * - ô ngày GH / KH / TN / OFF cùng họ màu với ô đó trong app (phanca.css `--cell-*-bg`) — Thu ngân từng tím trong khi app sky;
 * - đầu bảng: từng ô y màu ô cùng tên trong `ScheduleTable.tsx` (lớp bg-* / text-*), tuần chia theo lịch Thứ 2 → CN và tô `weekThemes`
 *   như app, T7/CN hồng — Sheet từng tô dải Số ngày SBH fuchsia, Số lần orange, Tuần một màu teal và chia tuần cứng 7 ngày.
 * Đổi màu trong app mà quên Sheet là test này đỏ.
 */

type Mau = { red: number; green: number; blue: number };
type Vung = { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number };
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
type ToO = {
    repeatCell: {
        range: Vung;
        cell: { userEnteredFormat: { backgroundColorStyle?: { rgbColor: Mau }; textFormat?: { foregroundColorStyle?: { rgbColor: Mau } } } };
        fields: string;
    };
};
type TuyChonXuat = { rows: (string | number)[][]; formattingRequests?: (sheetId: number) => unknown[] };

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
const docFile = (duongDan: string) => readFileSync(resolve(__dirname, '../../', duongDan), 'utf8');

const nhanVien = (name: string, role: string): StaffMember => ({
    id: name, name, gender: 'Nu', department: 'Bán hàng',
    stats: { gh: 0, kho: 0, tn: 1, offDays: 0, swapCount: 0 },
    schedule: [null, { shift: 'C13', role }],
    changeHistory: [],
});

/** Chạy hàm xuất thật (giả đăng nhập Google, bắt dữ liệu gửi đi) → hàng + lệnh định dạng. */
const xuat = async (monthYear: string, startDay: number, duration: number) => {
    const kho = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
        getItem: (k: string) => kho.get(k) ?? null,
        setItem: (k: string, v: string) => { kho.set(k, v); },
        removeItem: (k: string) => { kho.delete(k); },
    });
    Object.assign(bat, { tuyChon: null, loi: null }); // gán thẳng thì TypeScript thu hẹp bat.tuyChon thành null cho tới hết hàm
    await exportScheduleToGoogleSheet({
        nams: [], nus: [{}], monthYear, duration, startDay, includeTnInSbh: true,
        getSortedStaffForExport: () => [nhanVien('Nguyễn Thị A', 'Thu ngân (TN)')],
        showToast: () => {},
    });
    vi.unstubAllGlobals();
    expect(bat.loi).toBeNull();
    return { rows: bat.tuyChon?.rows ?? [], reqs: bat.tuyChon?.formattingRequests?.(7) ?? [] };
};

/** Mã màu Tailwind của các lớp đầu bảng Phân ca đang dùng — app dùng lớp mới ngoài bảng này thì thêm vào (và Sheet tô theo). */
const TAILWIND: Record<string, string> = {
    'sky-50': '#f0f9ff', 'sky-700': '#0369a1', 'sky-800': '#075985',
    'emerald-50': '#ecfdf5', 'emerald-700': '#047857', 'emerald-800': '#065f46',
    'amber-50': '#fffbeb', 'amber-700': '#b45309',
    'rose-50': '#fff1f2', 'rose-700': '#be123c',
};

describe('Phân ca — màu file Google Sheet khớp app', () => {
    it('ô ngày GH / KH / TN / OFF cùng họ màu với ô trong app — Thu ngân là sky, không còn tím', async () => {
        const { reqs } = await xuat('2026-10', 1, 1);
        const theoChu = Object.fromEntries(
            reqs
                .filter((r): r is LuatTo => typeof r === 'object' && r !== null && 'addConditionalFormatRule' in r)
                .map(({ addConditionalFormatRule: { rule: { booleanRule: b } } }) => [
                    b.condition.values[0].userEnteredValue,
                    { nen: hex(b.format.backgroundColorStyle.rgbColor), chu: hex(b.format.textFormat.foregroundColorStyle.rgbColor) },
                ]),
        );
        /** Nền ô trong app (tầng 50) → họ màu; màu ô trong Sheet theo họ: nền 100 · chữ 800. */
        const HO_THEO_NEN_APP: Record<string, string> = { '#f0f9ff': 'sky', '#ecfdf5': 'emerald', '#fffbeb': 'amber', '#fff1f2': 'rose' };
        const SHEET_THEO_HO: Record<string, { nen: string; chu: string }> = {
            sky: { nen: '#e0f2fe', chu: '#075985' },
            emerald: { nen: '#d1fae5', chu: '#065f46' },
            amber: { nen: '#fef3c7', chu: '#92400e' },
            rose: { nen: '#ffe4e6', chu: '#9f1239' },
        };
        const css = docFile('features/phan-ca/phanca.css');
        for (const [ma, bien] of [['GH', 'gh'], ['KH', 'kho'], ['TN', 'tn'], ['OFF', 'off']] as const) {
            const nenApp = css.match(new RegExp(`--cell-${bien}-bg:\\s*(#[0-9a-fA-F]{6})`))?.[1].toLowerCase() ?? '';
            const ho = HO_THEO_NEN_APP[nenApp];
            expect(ho, `ô ${ma} trong app (--cell-${bien}-bg ${nenApp}) chưa có trong bảng họ màu — thêm vào và sửa Sheet theo`).toBeDefined();
            expect(theoChu[ma], `ô ${ma} trong Google Sheet phải cùng họ ${ho} với app`).toEqual(SHEET_THEO_HO[ho]);
        }
        expect(theoChu.TN).toEqual({ nen: '#e0f2fe', chu: '#075985' });
    });

    // Tháng 10/2026: ngày 01 là Thứ 5 → tuần đầu thiếu ngày; Bắt đầu 15 vắt sang tháng 11; tháng 11/2026 bắt đầu Chủ nhật → tuần 1 chỉ 1 ngày.
    it.each([['2026-10', 1, 31], ['2026-10', 15, 30], ['2026-11', 1, 30]] as const)(
        'đầu bảng %s (bắt đầu %i, %i ngày): từng ô y màu ô cùng tên trong app, tuần chia theo lịch',
        async (monthYear, startDay, duration) => {
            const { rows, reqs } = await xuat(monthYear, startDay, duration);
            const [nam, thang] = monthYear.split('-').map(Number);
            const soCot = 10 + duration;

            // Mô phỏng Google Sheets áp lệnh theo thứ tự: mặt nạ fields có textFormat là THAY CẢ khối chữ (thiếu màu → mặc định).
            const o = [0, 1].map(() => Array.from({ length: soCot }, () => ({ nen: '', chu: '' })));
            for (const r of reqs) {
                if (typeof r !== 'object' || r === null || !('repeatCell' in r)) continue;
                const { range: v, cell, fields } = (r as ToO).repeatCell;
                const f = cell.userEnteredFormat;
                for (let h = v.startRowIndex; h < Math.min(v.endRowIndex, 2); h++)
                    for (let c = v.startColumnIndex; c < v.endColumnIndex; c++) {
                        if (fields.includes('backgroundColorStyle')) o[h][c].nen = f.backgroundColorStyle ? hex(f.backgroundColorStyle.rgbColor) : '';
                        if (fields.includes('textFormat')) o[h][c].chu = f.textFormat?.foregroundColorStyle ? hex(f.textFormat.foregroundColorStyle.rgbColor) : '';
                    }
            }

            // Ô cố định: màu đọc từ lớp của <th> cùng tên trong ScheduleTable (đúng màu ảnh xuất lịch; riêng trên màn hình, ô cột ghim
            // STT / Họ và tên bị phanca.css .sticky-col phủ nền trắng).
            const bang = docFile('features/phan-ca/components/ScheduleTable.tsx');
            const mauLop = (lop: string, nhan: string) => {
                const nen = /(?:^|\s)bg-(\w+-\d+)(?=\s|$)/.exec(lop)?.[1] ?? '';
                const chu = /(?:^|\s)text-(\w+-\d+)(?=\s|$)/.exec(lop)?.[1] ?? '';
                expect(TAILWIND[nen] && TAILWIND[chu], `ô "${nhan}" trong app dùng lớp ${nen} / ${chu} chưa có trong bảng TAILWIND`).toBeTruthy();
                return { nen: TAILWIND[nen], chu: TAILWIND[chu] };
            };
            const theoNhan = (nhan: string) => {
                const lop = new RegExp(`<th\\b[^>]*?className="([^"]*)"[^>]*>${nhan}</th>`).exec(bang)?.[1];
                expect(lop, `không thấy ô đầu bảng "${nhan}" trong ScheduleTable.tsx`).toBeDefined();
                return mauLop(lop ?? '', nhan);
            };
            const CO_DINH: [number, number, string][] = [
                [0, 0, 'STT'], [1, 0, 'STT'], [0, 1, 'Họ và Tên'], [1, 1, 'Họ và Tên'],
                [0, 2, 'Giờ Công'], [0, 3, 'Giờ Công'], [0, 4, 'Giờ Công'], [0, 5, 'Số Ngày SBH'], [0, 6, 'Số Ngày SBH'], [0, 7, 'Số Ngày SBH'],
                [0, 8, 'Số Lần'], [0, 9, 'Số Lần'],
                [1, 2, 'SBH'], [1, 3, 'TV'], [1, 4, 'TỔNG'], [1, 5, 'GH'], [1, 6, 'KH'], [1, 7, 'TN'], [1, 8, 'ĐỔI'], [1, 9, 'OFF'],
            ];
            for (const [h, c, nhan] of CO_DINH) expect(o[h][c], `Sheet hàng ${h + 1} cột ${c + 1} ("${nhan}")`).toEqual(theoNhan(nhan));

            // Tuần: chia như app, ô "TUẦN n" + ô ngày tô weekThemes; T7/CN tô như lớp cuối tuần của app.
            const lopCuoiTuan = /isWeekendDay \? '([^']*)'/.exec(bang)?.[1] ?? '';
            const cuoiTuan = mauLop(lopCuoiTuan, 'T7/CN');
            const gop = reqs.filter((r): r is { mergeCells: { range: Vung } } => typeof r === 'object' && r !== null && 'mergeCells' in r)
                .map(r => r.mergeCells.range).filter(v => v.endRowIndex === 1 && v.startColumnIndex >= 10);
            const tuan = splitCalendarWeeks(nam, thang, startDay, duration);
            expect(tuan.at(-1)?.end).toBe(duration);
            expect(rows[0]).toHaveLength(soCot);
            tuan.forEach((w, i) => {
                const mau = weekThemes[i % weekThemes.length];
                expect(rows[0][9 + w.start], `nhãn tuần ${i + 1}`).toBe(`TUẦN ${i + 1}`);
                expect(gop.some(v => v.startColumnIndex === 9 + w.start && v.endColumnIndex === 10 + w.end)).toBe(w.end > w.start);
                for (let d = w.start; d <= w.end; d++) {
                    expect(o[0][9 + d], `Sheet ô TUẦN ${i + 1} (ngày thứ ${d} trong kỳ)`).toEqual({ nen: mau.bg, chu: mau.text });
                    const thu = new Date(nam, thang - 1, startDay + d - 1).getDay();
                    expect(o[1][9 + d], `Sheet ô ngày thứ ${d} trong kỳ`).toEqual(thu === 0 || thu === 6 ? cuoiTuan : { nen: mau.bg, chu: mau.text });
                }
            });
            expect(gop).toHaveLength(tuan.filter(w => w.end > w.start).length);
        },
    );
});

describe('splitCalendarWeeks — tuần theo lịch Thứ 2 → CN', () => {
    it('tuần đầu/cuối thiếu ngày, vắt tháng, tuần 1 ngày', () => {
        expect(splitCalendarWeeks(2026, 10, 1, 31)).toEqual([
            { start: 1, end: 4 }, { start: 5, end: 11 }, { start: 12, end: 18 }, { start: 19, end: 25 }, { start: 26, end: 31 },
        ]);
        expect(splitCalendarWeeks(2026, 10, 15, 30)).toEqual([
            { start: 1, end: 4 }, { start: 5, end: 11 }, { start: 12, end: 18 }, { start: 19, end: 25 }, { start: 26, end: 30 },
        ]);
        expect(splitCalendarWeeks(2026, 11, 1, 30)).toEqual([
            { start: 1, end: 1 }, { start: 2, end: 8 }, { start: 9, end: 15 }, { start: 16, end: 22 }, { start: 23, end: 29 }, { start: 30, end: 30 },
        ]);
        expect(splitCalendarWeeks(2026, 10, 1, Number.NaN)).toEqual([]);
    });
});
