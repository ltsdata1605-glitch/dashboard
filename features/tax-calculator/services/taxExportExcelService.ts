import * as XLSX from 'xlsx';
import { SavedTaxRecord } from '../types/tax.types';
import { generateVietQrUrl } from './taxCalculatorService';
import { BANKS, normalizeBankCode } from './bankCatalog';

export interface TaxExportOptions {
    monthLabel?: string;
}

/**
 * Trả về thông tin tên hiển thị của ngân hàng từ mã bankCode
 */
export const getBankDisplayName = (bankCode?: string): string => {
    const normalized = normalizeBankCode(bankCode);
    if (!normalized) return bankCode || '';
    const found = BANKS.find(b => b.short_name.toLowerCase() === normalized.toLowerCase());
    return found ? `${found.short_name} - ${found.name}` : normalized;
};

/**
 * Lấy link VietQR cho bản ghi
 */
export const getRecordQrUrl = (rec: SavedTaxRecord): string => {
    if (rec.vietQrUrl) return rec.vietQrUrl;
    const normalizedBank = normalizeBankCode(rec.bankCode);
    if (rec.bankAccount && normalizedBank) {
        // Mặc định hoàn số thuế phát sinh giữ lại; nếu = 0 thì dùng proxyAmount
        const amount = rec.taxOnProxyAmount > 0 ? rec.taxOnProxyAmount : rec.proxyAmount;
        return generateVietQrUrl({
            bankAccount: rec.bankAccount,
            bankCode: normalizedBank,
            amount,
            description: `Hoan tra thue ${rec.name}`.trim(),
        });
    }
    return '';
};

/**
 * Trích xuất mô tả các loại khoán / thưởng nhận thay
 */
export const getProxyDetailText = (rec: SavedTaxRecord): string => {
    if (rec.proxyItemsDetail && rec.proxyItemsDetail.trim()) {
        return rec.proxyItemsDetail.trim();
    }
    if (rec.proxyAmount && rec.proxyAmount > 0) {
        return `Khoản nhận thay (${rec.proxyAmount.toLocaleString('vi-VN')} đ)`;
    }
    return 'Không có nhận thay';
};

/**
 * Chuẩn bị dữ liệu danh sách cho xuất Excel và Google Sheets
 */
export const prepareTaxRefundRows = (records: SavedTaxRecord[]) => {
    let totalProxy = 0;
    let totalTax = 0;
    let totalRefund = 0;

    const dataRows = records.map((rec, idx) => {
        const proxyAmt = Math.round(rec.proxyAmount || 0);
        const taxAmt = Math.round(rec.taxOnProxyAmount || 0);
        const refundAmt = Math.round(
            rec.netRefundToFriend !== undefined && rec.netRefundToFriend > 0
                ? rec.netRefundToFriend
                : Math.max(0, proxyAmt - taxAmt)
        );

        totalProxy += proxyAmt;
        totalTax += taxAmt;
        totalRefund += refundAmt;

        const qrUrl = getRecordQrUrl(rec);
        const bankDisplay = getBankDisplayName(rec.bankCode);
        const proxyDetail = getProxyDetailText(rec);

        return {
            stt: idx + 1,
            name: rec.name || 'Chưa có tên',
            monthYear: rec.monthYear || 'Chưa xác định',
            proxyDetail,
            proxyAmount: proxyAmt,
            taxOnProxy: taxAmt,
            refundToTreasury: refundAmt,
            bankAccount: rec.bankAccount || '',
            bankName: bankDisplay,
            qrUrl,
            qrFormula: qrUrl ? `=IMAGE("${qrUrl}")` : '',
        };
    });

    return {
        dataRows,
        totals: {
            count: records.length,
            totalProxy,
            totalTax,
            totalRefund,
        },
    };
};

/**
 * Tạo đối tượng Workbook của SheetJS để kiểm thử hoặc xuất file
 */
export const buildTaxRefundWorkbook = (records: SavedTaxRecord[], options?: TaxExportOptions): XLSX.WorkBook => {
    const monthTitle = options?.monthLabel ? `KỲ LƯƠNG: ${options.monthLabel.toUpperCase()}` : 'TẤT CẢ CÁC THÁNG';
    const nowStr = new Date().toLocaleString('vi-VN');
    const { dataRows, totals } = prepareTaxRefundRows(records);

    // Tiêu đề bảng
    const aoaData: (string | number | { t: string; v: string; l?: { Target: string } })[][] = [
        [`BẢNG TỔNG HỢP HOÀN THUẾ TNCN & TIỀN NHẬN THAY - ${monthTitle}`],
        [`Ngày xuất: ${nowStr} | Đơn vị tính: VNĐ | Dành cho Thủ quỹ & Nhân sự hoàn thuế MWG`],
        [],
        [
            'STT',
            'Họ và Tên Nhân Viên',
            'Kỳ Lương',
            'Khoản Nhận Thay (Loại Khoán / Thưởng)',
            'Tổng Tiền Nhận Thay (1)',
            'Thuế Giữ Lại / Cần Hoàn (2)',
            'Tiền Chuyển Lại Cho Thủ Quỹ (3) = (1) - (2)',
            'Số Tài Khoản',
            'Ngân Hàng',
            'Link Quét Mã QR (VietQR)',
            'Ảnh QR (Google Sheets)',
        ],
    ];

    // Thêm các dòng dữ liệu
    dataRows.forEach(row => {
        aoaData.push([
            row.stt,
            row.name,
            row.monthYear,
            row.proxyDetail,
            row.proxyAmount,
            row.taxOnProxy,
            row.refundToTreasury,
            row.bankAccount,
            row.bankName,
            row.qrUrl
                ? {
                    t: 's',
                    v: 'Mở mã QR chuyển khoản',
                    l: { Target: row.qrUrl },
                }
                : '',
            row.qrFormula,
        ]);
    });

    // Thêm dòng Tổng cộng
    aoaData.push([
        'TỔNG',
        `TỔNG CỘNG (${totals.count} nhân viên)`,
        '',
        '',
        totals.totalProxy,
        totals.totalTax,
        totals.totalRefund,
        '',
        '',
        '',
        '',
    ]);

    // Tạo Workbook và Sheet
    const ws = XLSX.utils.aoa_to_sheet(aoaData);

    // Căn chỉnh độ rộng các cột (Characters width)
    ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 25 }, // Họ và tên
        { wch: 12 }, // Kỳ lương
        { wch: 42 }, // Khoản nhận thay
        { wch: 18 }, // Tổng nhận thay
        { wch: 18 }, // Thuế giữ lại
        { wch: 20 }, // Tiền chuyển lại thủ quỹ
        { wch: 18 }, // Số tài khoản
        { wch: 24 }, // Ngân hàng
        { wch: 26 }, // Link quét mã QR
        { wch: 24 }, // Ảnh QR Google Sheets
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = (options?.monthLabel || 'Danh_Sach_Hoan_Thue').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    return wb;
};

/**
 * Xuất danh sách hoàn thuế ra file Excel (.xlsx) chuẩn đẹp
 */
export const exportTaxRefundToExcel = (records: SavedTaxRecord[], options?: TaxExportOptions): void => {
    if (!records || records.length === 0) {
        throw new Error('Không có bản ghi nào để xuất Excel');
    }

    const wb = buildTaxRefundWorkbook(records, options);

    // Tạo tên file
    const cleanMonth = (options?.monthLabel || 'Tat_Ca')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `Danh_Sach_Hoan_Thue_${cleanMonth}_${dateStamp}.xlsx`;

    XLSX.writeFile(wb, fileName);
};

/**
 * Sao chép toàn bộ bảng dữ liệu vào Clipboard dạng TSV (tương thích trực tiếp với Google Sheets)
 * Người dùng chỉ cần mở Google Sheet trắng và bấm Ctrl+V để dán cả bảng có định dạng, công thức =IMAGE()
 */
export const copyTaxRefundToClipboardForGoogleSheets = async (
    records: SavedTaxRecord[],
    options?: TaxExportOptions
): Promise<void> => {
    if (!records || records.length === 0) {
        throw new Error('Không có bản ghi nào để sao chép');
    }

    const monthTitle = options?.monthLabel ? `KỲ LƯƠNG: ${options.monthLabel.toUpperCase()}` : 'TẤT CẢ CÁC THÁNG';
    const nowStr = new Date().toLocaleString('vi-VN');
    const { dataRows, totals } = prepareTaxRefundRows(records);

    const lines: string[] = [];
    lines.push(`BẢNG TỔNG HỢP HOÀN THUẾ TNCN & TIỀN NHẬN THAY - ${monthTitle}`);
    lines.push(`Ngày xuất: ${nowStr}\tĐơn vị tính: VNĐ\tDành cho Thủ quỹ & Nhân sự hoàn thuế MWG`);
    lines.push(''); // Dòng trống

    // Header cột
    lines.push(
        [
            'STT',
            'Họ và Tên Nhân Viên',
            'Kỳ Lương',
            'Khoản Nhận Thay (Loại Khoán / Thưởng)',
            'Tổng Tiền Nhận Thay (1)',
            'Thuế Giữ Lại / Cần Hoàn (2)',
            'Tiền Chuyển Lại Cho Thủ Quỹ (3) = (1) - (2)',
            'Số Tài Khoản',
            'Ngân Hàng',
            'Link Quét Mã QR (VietQR)',
            'Ảnh QR (Google Sheets)',
        ].join('\t')
    );

    // Dữ liệu từng nhân viên
    dataRows.forEach(row => {
        lines.push(
            [
                row.stt,
                row.name,
                row.monthYear,
                row.proxyDetail,
                row.proxyAmount,
                row.taxOnProxy,
                row.refundToTreasury,
                row.bankAccount,
                row.bankName,
                row.qrUrl,
                row.qrFormula,
            ].join('\t')
        );
    });

    // Dòng Tổng cộng
    lines.push(
        [
            'TỔNG',
            `TỔNG CỘNG (${totals.count} nhân viên)`,
            '',
            '',
            totals.totalProxy,
            totals.totalTax,
            totals.totalRefund,
            '',
            '',
            '',
            '',
        ].join('\t')
    );

    const tsvContent = lines.join('\n');
    await navigator.clipboard.writeText(tsvContent);
};
