import * as XLSX from 'xlsx';
import type { DataRow, Status } from '../types';
import { getRowValue, parseExcelDate, toLocalISOString, cleanAndNormalize } from '../utils/dataUtils';
import { COL, VARIANT_TO_SHORT_KEY } from '../constants';

interface WorkerMessage {
    file: File;
}

// The worker's message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { file } = event.data;
    processSingleFileInWorker(file);
};

// This function is adapted from dataService.ts
async function processSingleFileInWorker(file: File) {
    const postStatus = (status: Status) => {
        self.postMessage({ type: 'progress', payload: status });
    };

    try {
        let combinedJson: DataRow[] = [];
        
        postStatus({ message: `Đang nạp bộ đệm file...`, type: 'info', progress: 10 });
        let arrayBuffer: ArrayBuffer | null = await file.arrayBuffer();

        postStatus({ message: `Dịch cú pháp Excel...`, type: 'info', progress: 25 });
        let data: Uint8Array | null = new Uint8Array(arrayBuffer);
        arrayBuffer = null; // Tối ưu GC: Giải phóng ArrayBuffer lập tức
        
        // OPTIMIZATION 1: Enable 'dense' mode.
        // This creates dense arrays instead of sparse objects, significantly reducing memory usage for large files.
        // WTF: true — bắt buộc thư viện NÉM LỖI THẬT ra ngoài thay vì tự nuốt (nội bộ thư viện
        // có safe_parse_sheet() bọc try/catch quanh việc đọc từng sheet: catch(e) { if(opts.WTF)
        // throw e; } — nếu không bật WTF, mọi lỗi đọc sheet (vd hết bộ nhớ khi giải nén XML quá
        // lớn) bị bỏ qua âm thầm, để lại `workbook.Sheets[tên]` là undefined trong khi
        // `workbook.SheetNames` vẫn liệt kê đúng tên sheet — gây ra đúng triệu chứng "không tìm
        // thấy dữ liệu hợp lệ" gây hiểu nhầm, dù lỗi thật là không đọc được sheet). Không ảnh
        // hưởng file đọc thành công bình thường — chỉ đổi hành vi khi có lỗi.
        let workbook: XLSX.WorkBook | null = XLSX.read(data, { type: 'array', cellDates: true, dense: true, WTF: true });
        data = null; // Tối ưu GC: Giải phóng Uint8Array

        const sheetName = workbook.SheetNames[0];
        let worksheet: XLSX.WorkSheet | null = workbook.Sheets[sheetName];

        if (!worksheet) {
            throw new Error(`Không đọc được nội dung sheet "${sheetName}" trong file — có thể file quá lớn (vượt giới hạn bộ nhớ khi giải nén) hoặc file bị lỗi định dạng. Thử tách file thành các phần nhỏ hơn.`);
        }

        postStatus({ message: `Trích xuất dữ liệu...`, type: 'info', progress: 40 });
        // ÉP CÂN DỮ LIỆU: Chỉ đọc dạng mảng 2 chiều để tránh phình to Object trong RAM với các string keys thừa
        // any: dữ liệu Excel thô, mỗi ô có thể là string/number/Date/null tùy nội dung file
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        // Giải phóng workbook và worksheet sớm nhất có thể
        worksheet = null;
        workbook = null;
        
        if (rows.length > 0) {
            let headers = (rows[0] || []).map(h => (h || '').toString().trim());

            // Cột thực sự quan trọng cần giữ lại — dựng từ constants.ts::VARIANT_TO_SHORT_KEY
            // (nguồn chân lý duy nhất, cùng danh sách COL mà getRowValue dùng khắp app), KHÔNG
            // còn hardcode riêng 1 danh sách ở đây (KE_HOACH_TONG_THE.md mục 3.1 bước 1, Đợt 4).
            // Trước đây danh sách hardcode ở đây đã lệch khỏi COL (thiếu vài biến thể như 'Nganh
            // Hang', 'Mã SP'...) khiến cột dùng đúng các tên đó bị âm thầm rớt mất — dùng chung
            // nguồn với COL fix luôn lỗi này. Giá trị gán cho mỗi cột khớp là KHOÁ NGẮN (vd 'id',
            // 'sp'...) thay vì chuỗi tiếng Việt dài — đây là bước chuẩn hoá khoá thực sự.
            const knownVariants = Object.keys(VARIANT_TO_SHORT_KEY);
            const normalizedReqCols = knownVariants.map(c => cleanAndNormalize(c));
            const reqIndices: Record<number, string> = {};
            for (let j = 0; j < headers.length; j++) {
                const normHeader = cleanAndNormalize(headers[j]);
                const matchedIdx = normalizedReqCols.indexOf(normHeader);
                if (matchedIdx !== -1) {
                    reqIndices[j] = VARIANT_TO_SHORT_KEY[knownVariants[matchedIdx]];
                }
            }

            // DEBUG TẠM: chẩn đoán lỗi "Không tìm thấy dữ liệu hợp lệ" với file lớn (vd 60MB)
            // — không rõ nguyên nhân do dữ liệu thật không khớp hay do dòng tiêu đề không nằm ở
            // hàng 0 (rows[0]). Log ra console (Worker log vẫn hiện trong DevTools) để xem
            // headers thực tế + số cột khớp được, gỡ bỏ khi đã xác định xong nguyên nhân.
            console.log('[Worker Debug] Tổng số dòng đọc được (kể cả header):', rows.length);
            console.log('[Worker Debug] Header hàng đầu tiên (rows[0]):', headers);
            console.log('[Worker Debug] Số cột khớp được:', Object.keys(reqIndices).length, '/', headers.length, '(tổng số biến thể cột đã biết:', knownVariants.length, ')');

            // Chunked Array Push — báo tiến độ liên tục theo số dòng thực đã xử lý (40→65%),
            // tránh bar "đứng hình" rồi nhảy mốc cứng với file lớn (hàng chục nghìn dòng).
            const totalRowsToLoad = rows.length - 1;
            const loadProgressChunk = Math.max(500, Math.floor(totalRowsToLoad / 20)) || 1;
            for (let r = 1; r < rows.length; r++) {
                const rowArray = rows[r];
                if (!rowArray || rowArray.length === 0) continue;

                const rowObj: Record<string, unknown> = {};
                let hasData = false;
                for (const idxStr of Object.keys(reqIndices)) {
                    const idx = parseInt(idxStr);
                    const val = rowArray[idx];
                    if (val !== undefined && val !== null && val !== '') {
                        rowObj[reqIndices[idx]] = val;
                        hasData = true;
                    }
                }

                if (hasData) {
                    combinedJson.push(rowObj as DataRow);
                }

                if (r % loadProgressChunk === 0) {
                    postStatus({
                        message: `Đang nạp dữ liệu (${r.toLocaleString('vi-VN')}/${totalRowsToLoad.toLocaleString('vi-VN')} dòng)...`,
                        type: 'info',
                        progress: 40 + Math.min(25, Math.round((r / totalRowsToLoad) * 25))
                    });
                }
            }
        }

        postStatus({ message: `Đã nạp ${combinedJson.length} dòng dữ liệu, đang lọc và chuẩn hóa...`, type: 'info', progress: 65 });

        // OPTIMIZATION 3: Single-pass validation and mapping
        const validResults: DataRow[] = [];
        const len = combinedJson.length;
        // Báo tiến độ liên tục theo số dòng thực đã validate (65→90%) — cùng lý do vòng lặp
        // dựng combinedJson ở trên, vòng lặp này cũng duyệt hàng chục nghìn dòng mà trước đây
        // không hề cập nhật % nào giữa 85% và 95%.
        const validateProgressChunk = Math.max(500, Math.floor(len / 20)) || 1;

        for (let i = 0; i < len; i++) {
            if (i % validateProgressChunk === 0) {
                postStatus({
                    message: `Đang lọc và chuẩn hóa dữ liệu (${i.toLocaleString('vi-VN')}/${len.toLocaleString('vi-VN')} dòng)...`,
                    type: 'info',
                    progress: 65 + Math.min(25, Math.round((i / len) * 25))
                });
            }

            // Chuẩn hóa và làm sạch object
            const row = combinedJson[i];

            // Xóa rác, null, rỗng (Ép cân dữ liệu RAM)
            for (const key in row) {
                if (row[key] === null || row[key] === undefined || row[key] === '') {
                    delete row[key];
                }
            }

            // Inline validation for speed
            const trangThaiHuy = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_HUY));
            const nhapTra = cleanAndNormalize(getRowValue(row, COL.TINH_TRANG_NHAP_TRA));
            const thuTien = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_THU_TIEN));
            const trangThaiXuat = cleanAndNormalize(getRowValue(row, COL.XUAT));
            const trangThaiGiao = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_GIAO_HANG));

            // Standard valid sales row
            const isStandardValid = (
                (trangThaiHuy === 'chưa hủy' || trangThaiHuy === 'chưa huỷ') && 
                nhapTra === 'chưa trả' && 
                thuTien === 'đã thu'
            );

            // Uncollected/uncancelled row
            const isUncollected = (
                thuTien === 'chưa thu' && 
                trangThaiXuat === 'chưa xuất' && 
                trangThaiGiao === 'chưa giao' && 
                (trangThaiHuy === 'chưa hủy' || trangThaiHuy === 'chưa huỷ')
            );

            if (!isStandardValid && !isUncollected) continue;

            // Normalize Date
            const parsedDate = parseExcelDate(getRowValue(row, COL.DATE_CREATED));
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                // Mutate the object directly is faster than spreading {...row}
                row.parsedDate = parsedDate;
                validResults.push(row);
            }
        }

        if (validResults.length === 0) {
            throw new Error("Không tìm thấy dữ liệu hợp lệ (Chưa hủy, Chưa trả, Đã thu) hoặc lỗi định dạng ngày tháng.");
        }

        postStatus({ message: 'Hoàn tất xử lý (đang chuyển dữ liệu)...', type: 'info', progress: 95 });

        // Post the final result back to the main thread
        self.postMessage({ type: 'result', payload: JSON.stringify(validResults) });

    } catch (error) {
        console.error("Lỗi khi xử lý file trong worker:", error);
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi xử lý file";
        self.postMessage({ type: 'error', payload: `Lỗi: ${errorMessage}` });
    }
}
