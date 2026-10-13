/**
 * Dòng phụ "đang lọc gì" dưới tiêu đề các khối Phân tích (GĐ5 lỗi #13, 2026-10-13).
 *
 * Trước đây mỗi khối tự ghép một kiểu, IN HOA 8px ("KHO: 910 | TRẠNG THÁI XUẤT: … | TỪ 01/10 ĐẾN 13/10") — dưới sàn chữ 11px và
 * khó đọc. Nay MỘT hàm dùng chung, viết như câu, ngăn bằng " · ": "Kho 910 · Xuất: Đã xuất · 01/10/2026 – 13/10/2026".
 */
export interface BoLocMoTa {
    kho?: string[] | string;
    xuat?: string;
    department?: string[];
    dateRange?: string;
    startDate?: string;
    endDate?: string;
}

const ngay = (iso?: string) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '');

export function moTaBoLoc(f: BoLocMoTa, opts: { boPhan?: boolean } = {}): string {
    const phan: string[] = [];
    const kho = Array.isArray(f.kho) ? f.kho : (f.kho ? [f.kho] : []);
    if (kho.length > 0 && !kho.includes('all')) phan.push(`Kho ${kho.join(', ')}`);
    if (f.xuat && f.xuat !== 'all') phan.push(`Xuất: ${f.xuat}`);
    if (opts.boPhan && f.department && f.department.length > 0) phan.push(`Bộ phận: ${f.department.join(', ')}`);
    phan.push(f.dateRange && f.dateRange !== 'all' ? `${ngay(f.startDate)} – ${ngay(f.endDate)}` : 'Tất cả thời gian');
    return phan.join(' · ');
}
