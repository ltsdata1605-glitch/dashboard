import { getErrorMessage } from '../../../utils/dataUtils';
import { calculateSpecialHours, calculateNormalHours, calculateTotalHours } from '../utils/scheduleUtils';
import { loginWithGoogleForceConsent } from './firebase';
import type { GoogleSheetsRequest, RgbColor } from './googleSheetsService';
import type { StaffMember } from '../types';

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
    const toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .2s';
    toastEl.textContent = '📊 Đang tạo Google Sheet...';
    document.body.appendChild(toastEl);
    const attemptExport = async (retryCount = 0): Promise<void> => {
        toastEl.textContent = '🔑 Đang xác thực Google...';
        sessionStorage.removeItem('googleOAuthToken');
        await loginWithGoogleForceConsent();
        let token = sessionStorage.getItem('googleOAuthToken');
        if (!token) throw new Error('Không thể lấy token xác thực.');
        toastEl.textContent = '📊 Đang tạo Google Sheet...';
        const { exportToGoogleSheet } = await import('./googleSheetsService');
        const sortedList = getSortedStaffForExport();
        const [yearVal, monthVal] = monthYear.split('-').map(Number);
        // --- Build Rows ---
        const rows: (string | number)[][] = [];
        // Row 0: Top Headers
        const row0 = ['STT', 'HỌ VÀ TÊN', 'GIỜ CÔNG', '', '', 'SỐ NGÀY SBH', '', '', 'SỐ LẦN', ''];
        for (let w = 0; w < Math.ceil(duration / 7); w++) {
             row0.push(`TUẦN ${w+1}`);
             for (let j = 0; j < 6; j++) row0.push('');
        }
        row0.length = 10 + duration; // Cut off to exact duration
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
            for (let w = 0; w < Math.ceil(duration / 7); w++) {
                const s = 10 + w * 7;
                const e = Math.min(s + 7, 10 + duration);
                if (e > s) merges.push({ startRowIndex: 0, endRowIndex: 1, startColumnIndex: s, endColumnIndex: e });
            }
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
            // Header block group colors
            const headerBlockFormats = [
                { sCol: 2, eCol: 5, bg: { red: 240/255, green: 249/255, blue: 255/255 }, fg: { red: 7/255, green: 89/255, blue: 133/255 } }, // Gio cong (sky)
                { sCol: 5, eCol: 8, bg: { red: 253/255, green: 244/255, blue: 255/255 }, fg: { red: 134/255, green: 25/255, blue: 143/255 } }, // Ngay SBH (fuchsia)
                { sCol: 8, eCol: 10, bg: { red: 255/255, green: 247/255, blue: 237/255 }, fg: { red: 154/255, green: 52/255, blue: 18/255 } }, // So lan (orange)
                { sCol: 10, eCol: 10 + duration, bg: { red: 240/255, green: 253/255, blue: 250/255 }, fg: { red: 17/255, green: 94/255, blue: 89/255 } }, // Tuan (teal)
            ];
            headerBlockFormats.forEach(h => {
                reqs.push({
                    repeatCell: {
                        range: { sheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: h.sCol, endColumnIndex: h.eCol },
                        cell: {
                            userEnteredFormat: {
                                backgroundColorStyle: { rgbColor: h.bg },
                                textFormat: { bold: true, fontSize: 10, foregroundColorStyle: { rgbColor: h.fg } },
                                horizontalAlignment: 'CENTER',
                                verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColorStyle,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });
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
            // TN: purple #f3e8ff (243, 232, 255) -> fg #6b21a8 (107, 33, 168)
            addCondRule("TN", { red: 243/255, green: 232/255, blue: 255/255 }, { red: 107/255, green: 33/255, blue: 168/255 });
            // OFF: rose #ffe4e6 (255, 228, 230) -> fg #9f1239 (159, 18, 57)
            addCondRule("OFF", { red: 255/255, green: 228/255, blue: 230/255 }, { red: 159/255, green: 18/255, blue: 57/255 });
            // Sunday header text color
            for (let d = 1; d <= duration; d++) {
                 const date = new Date(yearVal, monthVal - 1, startDay + d - 1);
                 if (date.getDay() === 0) { // Sunday
                     reqs.push({
                         repeatCell: {
                             range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 9 + d, endColumnIndex: 10 + d },
                             cell: { userEnteredFormat: { textFormat: { foregroundColorStyle: { rgbColor: { red: 225/255, green: 29/255, blue: 72/255 } }, bold: true } } },
                             fields: 'userEnteredFormat.textFormat'
                         }
                     });
                 }
            }
            return reqs;
        };
        toastEl.textContent = `📊 Đang ghi ${sortedList.length} nhân viên...`;
        try {
            const url = await exportToGoogleSheet(token, {
                title: `Lịch Phân Ca - Tháng ${monthVal}/${yearVal}`,
                rows,
                sheetName: 'LichPhanCa',
                formattingRequests
            });
            toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:14px 20px;border-radius:12px;font-size:13px;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:opacity .2s;display:flex;flex-direction:column;gap:10px;max-width:420px;width:90vw';
            toastEl.innerHTML = '';
            const msgDiv = document.createElement('div');
            msgDiv.textContent = '✅ Đã tạo Google Sheet thành công!';
            msgDiv.style.fontWeight = '600';
            toastEl.appendChild(msgDiv);
            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
            const openBtn = document.createElement('a');
            openBtn.href = url;
            openBtn.target = '_blank';
            openBtn.textContent = '📄 Mở Sheet';
            openBtn.style.cssText = 'padding:6px 14px;background:#fff;color:#16a34a;border-radius:8px;font-weight:700;font-size:12px;text-decoration:none;cursor:pointer';
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Đóng';
            closeBtn.style.cssText = 'padding:6px 14px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer';
            closeBtn.onclick = () => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); };
            btnRow.appendChild(openBtn);
            btnRow.appendChild(closeBtn);
            toastEl.appendChild(btnRow);
            setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); }, 15000);
        } catch (apiErr: unknown) {
            if (getErrorMessage(apiErr) === 'AUTH_EXPIRED' && retryCount < 1) {
                toastEl.textContent = '🔄 Token hết hạn, đang xác thực lại...';
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
            toastEl.textContent = '❌ Đăng nhập bị huỷ.';
        } else if (errMsg.includes('network') || errMsg.includes('failed to fetch')) {
            toastEl.textContent = '🌐 Không có kết nối mạng.';
        } else if (errMsg === 'auth_expired') {
            toastEl.textContent = '🔑 Phiên đăng nhập hết hạn. Vui lòng thử lại.';
        } else {
            toastEl.textContent = `⚠️ Lỗi: ${getErrorMessage(err) || 'Không xác định'}`;
        }
        toastEl.style.background = '#dc2626';
        setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); }, 3000);
    }
}
