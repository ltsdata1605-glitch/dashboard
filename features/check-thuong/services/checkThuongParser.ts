import { CHECK_THUONG_COLS } from './checkThuongCalc';

const EXPECTED_HEADERS = ['siêu thị', 'ngành hàng', 'thưởng'];

export interface ParsedCheckThuongResult {
    competitionData: any[][];
    fileName: string;
    uploadTime: string;
    lastModified: number;
}

export const validateCheckThuongHeader = (headerRow: any[]): boolean => {
    if (!headerRow || !Array.isArray(headerRow)) return false;
    const headerString = headerRow.join(',').toLowerCase();
    return EXPECTED_HEADERS.every(h => headerString.includes(h));
};

export const parseCheckThuongFile = async (file: File): Promise<ParsedCheckThuongResult> => {
    if (!file) throw new Error('Chưa chọn file để tải lên.');

    const uploadTime = new Date().toISOString();
    const lastModified = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isExcel = ['xlsx', 'xls'].includes(fileExtension);

    let dataArray: any[][] = [];

    if (isExcel) {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        if (sheet && sheet['!ref']) {
            const range = XLSX.utils.decode_range(sheet['!ref']);
            range.s.c = 0; // Bắt đầu từ cột A
            sheet['!ref'] = XLSX.utils.encode_range(range);
        }

        dataArray = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    } else {
        const textContent = await file.text();
        const rows = textContent.split(/\r\n|\n|\r/);
        let delimiter = ',';
        const sampleRow = rows.length > 2 ? rows[2] : (rows[0] || '');
        if (sampleRow.includes('\t')) delimiter = '\t';
        else if (sampleRow.includes(';')) delimiter = ';';
        dataArray = rows.map(r => r.split(delimiter));
    }

    if (!dataArray || dataArray.length === 0) {
        throw new Error('File không có dữ liệu.');
    }

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, dataArray.length); i++) {
        if (validateCheckThuongHeader(dataArray[i])) {
            headerRowIndex = i;
            break;
        }
    }

    const dataStartIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
    const competitionData = dataArray
        .slice(dataStartIndex)
        .filter(row => row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));

    if (competitionData.length === 0) {
        throw new Error('File không chứa dòng dữ liệu hợp lệ.');
    }

    // Kiểm tra cảnh báo lệch cột
    if (headerRowIndex !== -1) {
        const headerRow = dataArray[headerRowIndex];
        const cell = (idx: number) => String(headerRow[idx] || '').toLowerCase();
        const expectedAtPosition: [number, string][] = [
            [CHECK_THUONG_COLS.SIEU_THI, 'siêu thị'],
            [CHECK_THUONG_COLS.NGANH_HANG, 'ngành hàng'],
            [CHECK_THUONG_COLS.TONG_THUONG, 'thưởng'],
        ];
        const mismatches = expectedAtPosition.filter(([idx, keyword]) => !cell(idx).includes(keyword));
        if (mismatches.length > 0) {
            console.warn(
                '[Check Thưởng] Cảnh báo cột có thể lệch vị trí template:',
                mismatches.map(([idx, kw]) => `Cột ${idx} mong đợi "${kw}" nhưng thực tế là "${headerRow[idx]}"`)
            );
        }
    }

    return {
        competitionData,
        fileName: file.name,
        uploadTime,
        lastModified
    };
};
