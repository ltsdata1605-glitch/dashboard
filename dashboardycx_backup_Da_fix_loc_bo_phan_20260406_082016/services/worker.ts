
import * as XLSX from 'xlsx';
import type { DataRow, Status } from '../types';
import { getRowValue, parseExcelDate } from '../utils/dataUtils';
import { COL } from '../constants';

interface WorkerMessage {
    files: File[];
    enableDeduplication: boolean;
}

// The worker's message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { files, enableDeduplication } = event.data;
    processFilesInWorker(files, enableDeduplication);
};

// This function is adapted from dataService.ts
async function processFilesInWorker(files: File[], enableDeduplication: boolean) {
    const postStatus = (status: Status) => {
        self.postMessage({ type: 'progress', payload: status });
    };

    try {
        let combinedJson: DataRow[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progressBase = 40 * (i / files.length); // Reading phase takes up to 40%
            
            postStatus({ message: `Đang nạp bộ đệm file ${i+1}/${files.length}...`, type: 'info', progress: progressBase });
            let arrayBuffer: ArrayBuffer | null = await file.arrayBuffer();

            postStatus({ message: `Dịch cú pháp Excel ${i+1}/${files.length}...`, type: 'info', progress: progressBase + 5 });
            let data: Uint8Array | null = new Uint8Array(arrayBuffer);
            arrayBuffer = null; // Tối ưu GC: Giải phóng ArrayBuffer lập tức
            
            // OPTIMIZATION 1: Enable 'dense' mode. 
            // This creates dense arrays instead of sparse objects, significantly reducing memory usage for large files.
            let workbook: XLSX.WorkBook | null = XLSX.read(data, { type: 'array', cellDates: true, dense: true });
            data = null; // Tối ưu GC: Giải phóng Uint8Array
            
            const sheetName = workbook.SheetNames[0];
            let worksheet: any = workbook.Sheets[sheetName];

            postStatus({ message: `Trích xuất JSON file ${i+1}/${files.length}...`, type: 'info', progress: progressBase + 10 });
            // ÉP CÂN DỮ LIỆU: Chỉ đọc dạng mảng 2 chiều để tránh phình to Object trong RAM với các string keys thừa
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
                    'Ngành Hàng', 'Ngành hàng', 'Nhóm Hàng', 'Nhóm hàng', 'Nhà sản xuất', 'Hãng', 'TG Hẹn Giao'
                ];
                
                const reqIndices: Record<number, string> = {};
                for (let j = 0; j < headers.length; j++) {
                    if (reqCols.includes(headers[j])) {
                        reqIndices[j] = headers[j];
                    }
                }

                // Chunked Array Push
                for (let r = 1; r < rows.length; r++) {
                    const rowArray = rows[r];
                    if (!rowArray || rowArray.length === 0) continue;
                    
                    const rowObj: any = {};
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
        }
        
        let processedList: DataRow[] = combinedJson;

        // OPTIMIZATION 2: Ultra-fast Deduplication
        if (enableDeduplication) {
            postStatus({ message: `Đang chạy Xoá Trùng Ngẫu Nhiên trên ${processedList.length} dòng...`, type: 'info', progress: 50 });
            
            const uniqueSet = new Set<string>();
            const deduplicated: DataRow[] = [];
            
            // Pre-calculate column keys to avoid repeated object access overhead if possible,
            // but for safety with dynamic excel, we iterate row keys.
            // Using string concatenation is ~10x faster than JSON.stringify for this purpose.
            const len = processedList.length;
            for (let i = 0; i < len; i++) {
                const row = processedList[i];
                let signature = '';
                
                // Fast signature generation skipping 'STT_1'
                for (const key in row) {
                    if (key !== 'STT_1') {
                        // Use a separator that is unlikely to be in data
                        signature += row[key] + '§'; 
                    }
                }

                if (!uniqueSet.has(signature)) {
                    uniqueSet.add(signature);
                    deduplicated.push(row);
                }
            }
            if (files.length > 1) {
                postStatus({ message: `Đã cắt giảm ${processedList.length - deduplicated.length} dòng dữ liệu bị trùng.`, type: 'info', progress: 65 });
            }
            processedList = deduplicated;
            // Clear memory immediately
            uniqueSet.clear(); 
        } else {
            postStatus({ message: `Bỏ qua bước xóa trùng, bắt đầu gộp ${processedList.length} dòng...`, type: 'info', progress: 60 });
        }

        postStatus({ message: 'Đang lọc và chuẩn hóa dữ liệu...', type: 'info', progress: 80 });

        // OPTIMIZATION 3: Single-pass validation and mapping
        // Pre-compute lowercase check strings to avoid repetitive .toLowerCase() calls
        const validResults: DataRow[] = [];
        const len = processedList.length;

        for (let i = 0; i < len; i++) {
            const row = processedList[i];
            
            // Inline validation for speed
            const trangThaiHuy = (getRowValue(row, COL.TRANG_THAI_HUY) || '').toString();
            // Check length first to fail fast, then string content
            if (trangThaiHuy.length !== 8 && trangThaiHuy.toLowerCase().trim() !== 'chưa hủy') continue;
            
            const nhapTra = (getRowValue(row, COL.TINH_TRANG_NHAP_TRA) || '').toString();
            if (nhapTra.length !== 8 && nhapTra.toLowerCase().trim() !== 'chưa trả') continue;

            const thuTien = (getRowValue(row, COL.TRANG_THAI_THU_TIEN) || '').toString();
            if (thuTien.length !== 6 && thuTien.toLowerCase().trim() !== 'đã thu') continue;

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
        // Note: Transferable objects (ArrayBuffer) would be faster, but require restructuring the whole app data flow.
        // For now, sending the object is the bottleneck but necessary.
        self.postMessage({ type: 'result', payload: validResults });

    } catch (error) {
        console.error("Lỗi khi xử lý file trong worker:", error);
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi xử lý file";
        self.postMessage({ type: 'error', payload: `Lỗi: ${errorMessage}` });
    }
}
