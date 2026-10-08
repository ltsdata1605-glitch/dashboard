/**
 * Service hỗ trợ xuất file Excel mẫu và đọc file Excel nạp mã PMH
 * Dùng cho modal Nạp Mã PMH (CouponImportModal) trong phân hệ BOT LINE
 */

export interface CouponSampleRow {
    code: string;
    productName: string;
    type: string;
    expiryDate: string;
    syntax: string;
}

export const SAMPLE_COUPON_DATA: CouponSampleRow[] = [
    {
        code: 'CG5BBSGXJ9',
        productName: 'Bếp gas đôi Sunhouse SHB3105MD',
        type: 'Event',
        expiryDate: '31/10/2026',
        syntax: 'SHB3105MD'
    },
    {
        code: '4P1DXFTUM8',
        productName: 'Bếp gas đôi Sunhouse SHB3105MD',
        type: 'Event',
        expiryDate: '31/10/2026',
        syntax: 'SHB3105MD'
    },
    {
        code: 'K89V2NXA10',
        productName: 'Tủ lạnh Samsung RT29K5012S8',
        type: 'Giờ Vàng Giá Sốc',
        expiryDate: '15/11/2026',
        syntax: 'RT29'
    },
    {
        code: 'PMH50KTRIAN',
        productName: 'Nồi chiên không dầu Philips HD9252',
        type: 'Event',
        expiryDate: '30/11/2026',
        syntax: 'HD9252'
    }
];

/**
 * Tải file Excel mẫu (.xlsx) chuẩn nạp mã PMH xuống máy tính người dùng
 */
export async function downloadCouponSampleTemplate(): Promise<void> {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Sheet 1: Danh Sách Mã PMH (5 cột chuẩn)
    const header = [
        'MÃ PMH (*)',
        'TÊN SẢN PHẨM',
        'LOẠI PMH',
        'HẠN DÙNG (DD/MM/YYYY)',
        'CÚ PHÁP ĐĂNG KÝ'
    ];

    const rows = SAMPLE_COUPON_DATA.map(item => [
        item.code,
        item.productName,
        item.type,
        item.expiryDate,
        item.syntax
    ]);

    const wsData = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Cấu hình độ rộng cột
    ws['!cols'] = [
        { wch: 18 }, // Mã PMH
        { wch: 38 }, // Tên sản phẩm
        { wch: 20 }, // Loại PMH
        { wch: 24 }, // Hạn dùng
        { wch: 22 }  // Cú pháp đăng ký
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Danh Sách Mã PMH');

    // Sheet 2: Hướng Dẫn Sử Dụng
    const guideData = [
        ['HƯỚNG DẪN NẠP MÃ PHIẾU MUA HÀNG (PMH) VÀO HỆ THỐNG DASHBOARD YCX'],
        [''],
        ['1. CÁCH SỬ DỤNG:'],
        ['   - Cách 1 (Nhanh nhất): Nhập danh sách mã vào sheet "Danh Sách Mã PMH" -> Quét chọn các dòng -> Bấm Copy (Ctrl+C) -> Dán (Ctrl+V) vào ô nhập trên Dashboard.'],
        ['   - Cách 2: Bấm nút "Chọn file Excel" trên giao diện nạp để tải trực tiếp file Excel này lên hệ thống.'],
        [''],
        ['2. QUY ĐỊNH CÁC CỘT:'],
        ['   - MÃ PMH (*): Bắt buộc. Mỗi dòng 1 mã, không chứa khoảng trắng (Ví dụ: CG5BBSGXJ9).'],
        ['   - TÊN SẢN PHẨM: Tùy chọn nhưng khuyến khích có để Bot phân nhóm theo từng sản phẩm.'],
        ['   - LOẠI PMH: Tùy chọn (Mặc định: Event, Giờ Vàng Giá Sốc hoặc tên chiến dịch riêng).'],
        ['   - HẠN DÙNG: Định dạng ngày DD/MM/YYYY (Ví dụ: 31/10/2026). Để trống nếu mã không có thời hạn.'],
        ['   - CÚ PHÁP ĐĂNG KÝ: Cú pháp ngắn gọn để nhân viên nhắn tin xin mã trên LINE Bot (Ví dụ: SHB3105MD). Để trống hệ thống sẽ tự động tạo từ tên sản phẩm.'],
        [''],
        ['3. TỰ ĐỘNG KHỬ TRÙNG LẶP:'],
        ['   - Hệ thống Dashboard YCX sẽ tự động phát hiện và loại bỏ các mã trùng lặp trong đợt nạp.']
    ];

    const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
    wsGuide['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng Dẫn Sử Dụng');

    // Tải file về máy
    XLSX.writeFile(wb, 'Mau_Nap_Ma_PMH.xlsx');
}

/**
 * Đọc file Excel do người dùng tải lên và chuyển đổi thành chuỗi TSV (Tab-separated)
 * để tự động điền vào ô dán mã và kích hoạt bóc tách tức thì
 */
export async function readCouponExcelFile(file: File): Promise<string> {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    // Ưu tiên sheet có tên 'Danh Sách Mã PMH' hoặc sheet đầu tiên
    const targetSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('danh sách') || n.toLowerCase().includes('pmh') || n.toLowerCase().includes('mã')) || wb.SheetNames[0];
    const ws = wb.Sheets[targetSheetName];
    if (!ws) return '';

    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    if (!rawRows || rawRows.length === 0) return '';

    const lines: string[] = [];

    for (const row of rawRows) {
        if (!Array.isArray(row) || row.length === 0) continue;
        const col0 = String(row[0] ?? '').trim();
        if (!col0) continue;

        // Bỏ qua dòng tiêu đề
        const lower0 = col0.toLowerCase();
        if (lower0 === 'mã pmh (*)' || lower0 === 'mã pmh' || lower0 === 'ma pmh' || lower0 === 'code' || lower0.includes('tiêu đề') || lower0.startsWith('mã')) {
            continue;
        }

        const col1 = String(row[1] ?? '').trim(); // Tên sản phẩm
        const col2 = String(row[2] ?? '').trim(); // Loại PMH
        const col3 = String(row[3] ?? '').trim(); // Hạn dùng
        const col4 = String(row[4] ?? '').trim(); // Cú pháp

        lines.push([col0, col1, col2, col3, col4].join('\t'));
    }

    return lines.join('\n');
}
