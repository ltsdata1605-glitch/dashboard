import * as XLSX from 'xlsx';
import type { DataRow, Status } from '../types';
import { getRowValue, parseExcelDate, toLocalISOString, cleanAndNormalize } from '../utils/dataUtils';
import { COL } from '../constants';

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

        postStatus({ message: `Dịch cú pháp Excel...`, type: 'info', progress: 30 });
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

        postStatus({ message: `Trích xuất dữ liệu...`, type: 'info', progress: 50 });
        // ÉP CÂN DỮ LIỆU: Chỉ đọc dạng mảng 2 chiều để tránh phình to Object trong RAM với các string keys thừa
        // any: dữ liệu Excel thô, mỗi ô có thể là string/number/Date/null tùy nội dung file
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        // Giải phóng workbook và worksheet sớm nhất có thể
        worksheet = null;
        workbook = null;
        
        if (rows.length > 0) {
            let headers = (rows[0] || []).map(h => (h || '').toString().trim());
            
            // Danh sách các cột thực sự quan trọng cần được giữ lại
            const reqCols = [
                'Ngày tạo', 'Ngày Tạo', 'Trạng thái hủy', 'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính',
                'Trạng thái thu tiền', 'Mã Đơn Hàng', 'Mã đơn hàng', 'Tên Sản Phẩm', 'Tên sản phẩm',
                'Tên Khách Hàng', 'Tên khách hàng', 'Số Lượng', 'Số lượng', 'Giá bán_1', 'Giá bán',
                'Mã kho tạo', 'Trạng thái hồ sơ', 'Người tạo', 'Trạng thái xuất', 'Hình thức xuất',
                'Ngành Hàng', 'Ngành hàng', 'Nhóm Hàng', 'Nhóm hàng', 'Nhà sản xuất', 'Hãng', 'TG Hẹn Giao', 'Thời gian hẹn giao',
                'Mã sản phẩm', 'Kho tạo', 'Kho Tạo', 'Trạng thái giao hàng', 'Trạng thái giao', 'Còn nợ', 'Còn Nợ'
            ];
            
            const normalizedReqCols = reqCols.map(c => cleanAndNormalize(c));
            const reqIndices: Record<number, string> = {};
            for (let j = 0; j < headers.length; j++) {
                const normHeader = cleanAndNormalize(headers[j]);
                const matchedIdx = normalizedReqCols.indexOf(normHeader);
                if (matchedIdx !== -1) {
                    reqIndices[j] = reqCols[matchedIdx];
                }
            }

            // DEBUG TẠM: chẩn đoán lỗi "Không tìm thấy dữ liệu hợp lệ" với file lớn (vd 60MB)
            // — không rõ nguyên nhân do dữ liệu thật không khớp hay do dòng tiêu đề không nằm ở
            // hàng 0 (rows[0]). Log ra console (Worker log vẫn hiện trong DevTools) để xem
            // headers thực tế + số cột khớp được, gỡ bỏ khi đã xác định xong nguyên nhân.
            console.log('[Worker Debug] Tổng số dòng đọc được (kể cả header):', rows.length);
            console.log('[Worker Debug] Header hàng đầu tiên (rows[0]):', headers);
            console.log('[Worker Debug] Số cột khớp được với reqCols:', Object.keys(reqIndices).length, '/', reqCols.length);

            // Chunked Array Push
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
            }
        }
        
        postStatus({ message: `Đã nạp ${combinedJson.length} dòng dữ liệu.`, type: 'info', progress: 70 });
        postStatus({ message: 'Đang lọc và chuẩn hóa dữ liệu...', type: 'info', progress: 85 });

        // OPTIMIZATION 3: Single-pass validation and mapping
        const validResults: DataRow[] = [];
        const len = combinedJson.length;

        for (let i = 0; i < len; i++) {
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
