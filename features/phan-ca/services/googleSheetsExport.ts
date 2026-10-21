import { getErrorMessage } from '../../../utils/dataUtils';
import { calculateSpecialHours, calculateNormalHours, calculateTotalHours } from '../utils/scheduleUtils';
import { weekThemes, splitCalendarWeeks } from '../utils/weekUtils';
import { loginWithGoogleForceConsent } from './firebase';
import type { GoogleSheetsRequest, RgbColor } from './googleSheetsService';
import type { StaffMember } from '../types';
import { toastViecDai } from '../../../components/shared/ui/toast';

interface ExportScheduleToGoogleSheetParams {
    nams: unknown[];
    nus: unknown[];
    monthYear: string;
    duration: number;
    startDay: number;
    includeTnInSbh: boolean;
    getSortedStaffForExport: () => StaffMember[];
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export async function exportScheduleToGoogleSheet({
    nams, nus, monthYear, duration, startDay, includeTnInSbh, getSortedStaffForExport, showToast,
}: ExportScheduleToGoogleSheetParams): Promise<void> {
    if (!nams.length && !nus.length) return showToast("Chưa có dữ liệu.", 'error');
    const viec = toastViecDai('Đang tạo Google Sheet…');
    const attemptExport = async (retryCount = 0): Promise<void> => {
        viec.buoc('Đang xác thực Google…');
        sessionStorage.removeItem('googleOAuthToken');
        await loginWithGoogleForceConsent();
        let token = sessionStorage.getItem('googleOAuthToken');
        if (!token) throw new Error('Không thể lấy token xác thực.');
        viec.buoc('Đang tạo Google Sheet…');
        const { exportToGoogleSheet } = await import('./googleSheetsService');
        const sortedList = getSortedStaffForExport();
        const [yearVal, monthVal] = monthYear.split('-').map(Number);
        // Tuần theo lịch Thứ 2 → CN, y như đầu bảng trong app (trước 2026-10-21 chia cứng 7 ngày: "TUẦN 1" của Sheet ≠ "Tuần 1" của app)
        const weeks = splitCalendarWeeks(yearVal, monthVal, startDay, duration);
        // --- Build Rows ---
        const rows: (string | number)[][] = [];
        // Row 0: Top Headers
        const row0 = ['STT', 'HỌ VÀ TÊN', 'GIỜ CÔNG', '', '', 'SỐ NGÀY SBH', '', '', 'SỐ LẦN', ''];
        weeks.forEach((w, i) => {
             row0.push(`TUẦN ${i + 1}`);
             for (let d = w.start; d < w.end; d++) row0.push('');
        });
        rows.push(row0);
        // Row 1: Sub Headers
        const row1 = ['', '', 'SBH', 'TV', 'TỔNG', 'GH', 'KH', 'TN', 'ĐỔI', 'OFF'];
        for (let d = 1; d <= duration; d++) {
             const date = new Date(yearVal, monthVal - 1, startDay + d - 1);
             const dowStr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
             row1.push(`${date.getDate()}\n${dowStr}`);
        }
        rows.push(row1);
        // Rows: Staff Data
        sortedList.forEach((staff, i) => {
            const specialHours = calculateSpecialHours(staff, includeTnInSbh);
            const normalHours = calculateNormalHours(staff);
            const totalHours = calculateTotalHours(staff);
            const stats = staff.stats;
            const rowData: (string | number)[] = [
                i + 1,
                staff.name,
                Math.round(specialHours),
                Math.round(normalHours),
                Math.round(totalHours),
                stats.gh || '-',
                stats.kho || '-',
                stats.tn || '-',
                stats.swapCount || '-',
                stats.offDays || '-'
            ];
            for (let d = 1; d <= duration; d++) {
                 const info = staff.schedule[d];
                 if (!info || info.role === '') {
                     rowData.push('');
                     continue;
                 }
                 if (info.role === 'OFF') {
                     rowData.push('OFF');
                 } else {
                     let text = info.shift;
                     if (info.role.includes('(GH)')) text += '\nGH';
                     else if (info.role.includes('(Kho)')) text += '\nKH';
                     else if (info.role.includes('(TN)')) text += '\nTN';
                     rowData.push(text);
                 }
            }
            rows.push(rowData);
        });
        // --- Build Formatting Requests ---
        const formattingRequests = (sheetId: number) => {
            const reqs: GoogleSheetsRequest[] = [];
            // Fix: Freeze 2 rows and 2 cols FIRST, before merging!
            reqs.push({
                updateSheetProperties: {
                    properties: { sheetId, gridProperties: { frozenRowCount: 2, frozenColumnCount: 2 } },
                    fields: 'gridProperties(frozenRowCount,frozenColumnCount)'
                }
            });
            // Merges
            const merges = [
                { startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 }, // STT
                { startRowIndex: 0, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 2 }, // Ho ten
                { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 2, endColumnIndex: 5 }, // Gio cong
                { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 5, endColumnIndex: 8 }, // Ngay sbh
                { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 8, endColumnIndex: 10 }, // So lan
            ];
            // Tuần (cột ngày d là 9 + d) — tuần chỉ 1 ngày thì không gộp
            weeks.forEach(w => {
                if (w.end > w.start) merges.push({ startRowIndex: 0, endRowIndex: 1, startColumnIndex: 9 + w.start, endColumnIndex: 10 + w.end });
            });
            merges.forEach(m => {
                reqs.push({
                    mergeCells: { range: { sheetId, ...m }, mergeType: "MERGE_ALL" }
                });
            });
            // Base Header formatting
            reqs.push({
                repeatCell: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 10 + duration },
                    cell: {
                        userEnteredFormat: {
                            textFormat: { bold: true, fontSize: 10 },
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE',
                            backgroundColorStyle: { rgbColor: { red: 248/255, green: 250/255, blue: 252/255 } } // bg-slate-50
                        }
                    },
                    fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,backgroundColorStyle)'
                }
            });
            // Header colors — Y NHƯ đầu bảng lịch trong app (2026-10-21; test tests/unit/phan-ca-google-sheet-mau-o.test.ts so từng ô với
            // lớp bg-*/text-* của ô cùng tên trong ScheduleTable + weekThemes). Trước: Số ngày SBH fuchsia, Số lần orange, Tuần một màu teal.
            const rgb = (hex: string): RgbColor => ({ red: parseInt(hex.slice(1, 3), 16) / 255, green: parseInt(hex.slice(3, 5), 16) / 255, blue: parseInt(hex.slice(5, 7), 16) / 255 });
            const headerCell = (startRowIndex: number, endRowIndex: number, startColumnIndex: number, endColumnIndex: number, bg: string, fg: string) => {
                reqs.push({
                    repeatCell: {
                        range: { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex },
                        cell: {
                            userEnteredFormat: {
                                backgroundColorStyle: { rgbColor: rgb(bg) },
                                textFormat: { bold: true, fontSize: 10, foregroundColorStyle: { rgbColor: rgb(fg) } },
                                horizontalAlignment: 'CENTER',
                                verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColorStyle,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });
            };
            headerCell(0, 2, 0, 2, '#ecfdf5', '#047857'); // STT, Họ và tên: emerald-50 · emerald-700
            headerCell(0, 2, 2, 5, '#f0f9ff', '#0369a1'); // Giờ công + SBH, TV: sky-50 · sky-700
            headerCell(1, 2, 4, 5, '#f0f9ff', '#075985'); //   TỔNG: sky-800
            headerCell(0, 2, 5, 8, '#ecfdf5', '#047857'); // Số ngày SBH + GH, KH: emerald-50 · emerald-700
            headerCell(1, 2, 7, 8, '#ecfdf5', '#065f46'); //   TN: emerald-800
            headerCell(0, 2, 8, 10, '#fffbeb', '#b45309'); // Số lần + ĐỔI, OFF: amber-50 · amber-700
            weeks.forEach((w, i) => {
                const theme = weekThemes[i % weekThemes.length];
                headerCell(0, 1, 9 + w.start, 10 + w.end, theme.bg, theme.text); // TUẦN n
                for (let d = w.start; d <= w.end; d++) {
                    const dow = new Date(yearVal, monthVal - 1, startDay + d - 1).getDay();
                    const weekend = dow === 0 || dow === 6;
                    headerCell(1, 2, 9 + d, 10 + d, weekend ? '#fff1f2' : theme.bg, weekend ? '#be123c' : theme.text); // T7/CN: rose-50 · rose-700
                }
            });
            // (Frozen properties moved to the top)
            // Column widths
            const colWidths = [
                { startIndex: 0, endIndex: 1, width: 40 }, // STT
                { startIndex: 1, endIndex: 2, width: 150 }, // Ho ten
                { startIndex: 2, endIndex: 10, width: 45 }, // Metrics
                { startIndex: 10, endIndex: 10 + duration, width: 50 }, // Days
            ];
            colWidths.forEach(cw => {
                reqs.push({
                    updateDimensionProperties: {
                        range: { sheetId, dimension: "COLUMNS", startIndex: cw.startIndex, endIndex: cw.endIndex },
                        properties: { pixelSize: cw.width },
                        fields: 'pixelSize'
                    }
                });
            });
            // Data Rows Alignment
            reqs.push({
                repeatCell: {
                    range: { sheetId, startRowIndex: 2, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 10 + duration },
                    cell: {
                        userEnteredFormat: {
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE',
                            textFormat: { bold: true, fontSize: 10 }
                        }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)'
                }
            });
            // Base Name column alignment (Left)
            reqs.push({
                repeatCell: {
                    range: { sheetId, startRowIndex: 2, endRowIndex: rows.length, startColumnIndex: 1, endColumnIndex: 2 },
                    cell: {
                        userEnteredFormat: {
                            horizontalAlignment: 'LEFT',
                            verticalAlignment: 'MIDDLE'
                        }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)'
                }
            });
            // Name column colors based on gender
            sortedList.forEach((staff, index) => {
                const isNam = staff.gender === 'Nam';
                reqs.push({
                    repeatCell: {
                        range: { sheetId, startRowIndex: 2 + index, endRowIndex: 3 + index, startColumnIndex: 1, endColumnIndex: 2 },
                        cell: {
                            userEnteredFormat: {
                                textFormat: {
                                    bold: true,
                                    fontSize: 10,
                                    foregroundColorStyle: {
                                        rgbColor: isNam ? { red: 2/255, green: 132/255, blue: 199/255 } : { red: 225/255, green: 29/255, blue: 72/255 }
                                    }
                                }
                            }
                        },
                        fields: 'userEnteredFormat.textFormat'
                    }
                });
            });
            // Conditional Formats for Tags
            const addCondRule = (text: string, bg: RgbColor, fg: RgbColor) => {
                reqs.push({
                    addConditionalFormatRule: {
                        rule: {
                            ranges: [{ sheetId, startRowIndex: 2, endRowIndex: rows.length, startColumnIndex: 10, endColumnIndex: 10 + duration }],
                            booleanRule: {
                                condition: { type: "TEXT_CONTAINS", values: [{ userEnteredValue: text }] },
                                format: { backgroundColorStyle: { rgbColor: bg }, textFormat: { foregroundColorStyle: { rgbColor: fg }, bold: true } }
                            }
                        },
                        index: 0
                    }
                });
            };
            // GH: amber #fef3c7 (254, 243, 199) -> fg #92400e (146, 64, 14)
            addCondRule("GH", { red: 254/255, green: 243/255, blue: 199/255 }, { red: 146/255, green: 64/255, blue: 14/255 });
            // KH: emerald #d1fae5 (209, 250, 229) -> fg #065f46 (6, 95, 70)
            addCondRule("KH", { red: 209/255, green: 250/255, blue: 229/255 }, { red: 6/255, green: 95/255, blue: 70/255 });
            // TN: sky #e0f2fe (224, 242, 254) -> fg #075985 (7, 89, 133) — cùng họ ô TN trong app (phanca.css --cell-tn-*; trước 2026-10-21 là tím)
            addCondRule("TN", { red: 224/255, green: 242/255, blue: 254/255 }, { red: 7/255, green: 89/255, blue: 133/255 });
            // OFF: rose #ffe4e6 (255, 228, 230) -> fg #9f1239 (159, 18, 57)
            addCondRule("OFF", { red: 255/255, green: 228/255, blue: 230/255 }, { red: 159/255, green: 18/255, blue: 57/255 });
            return reqs;
        };
        viec.buoc(`Đang ghi ${sortedList.length} nhân viên…`);
        try {
            const url = await exportToGoogleSheet(token, {
                title: `Lịch Phân Ca - Tháng ${monthVal}/${yearVal}`,
                rows,
                sheetName: 'LichPhanCa',
                formattingRequests
            });
            viec.xong('Đã tạo Google Sheet', {
                actions: [{ label: 'Mở Sheet', primary: true, onClick: () => { window.open(url, '_blank', 'noopener,noreferrer'); } }],
                duration: 15000,
            });
        } catch (apiErr: unknown) {
            if (getErrorMessage(apiErr) === 'AUTH_EXPIRED' && retryCount < 1) {
                viec.buoc('Token hết hạn, đang xác thực lại…');
                return attemptExport(retryCount + 1);
            }
            throw apiErr;
        }
    };
    try {
        await attemptExport();
    } catch (err: unknown) {
        console.error('Google Sheets export error:', err);
        const errMsg = getErrorMessage(err).toLowerCase();
        if (errMsg.includes('popup') || errMsg.includes('cancel')) {
            viec.loi('Đăng nhập bị huỷ.');
        } else if (errMsg.includes('network') || errMsg.includes('failed to fetch')) {
            viec.loi('Không có kết nối mạng.');
        } else if (errMsg === 'auth_expired') {
            viec.loi('Phiên đăng nhập hết hạn. Vui lòng thử lại.');
        } else {
            viec.loi(`Lỗi: ${getErrorMessage(err) || 'Không xác định'}`);
        }
    }
}
