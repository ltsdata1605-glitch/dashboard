/**
 * Lấy bù KPI từ khối KPI ĐẦU BẢNG của báo cáo Summary (audit D16).
 *
 * Khối KPI đầu bảng là số của TỔNG CỤM khi báo cáo có nhiều siêu thị. Vì vậy chỉ được lấy bù cho
 * siêu thị đang xem khi đang xem 'Tổng' hoặc báo cáo chỉ có đúng 1 siêu thị. Trước đây siêu thị
 * thiếu cột (vd DT Dự Kiến) hiện số của cả cụm như số của chính mình.
 */
export const headerKpisBelongToActive = (rows: string[][], activeSupermarket: string): boolean => {
    const supermarketRowCount = rows.filter(r => r[0] && !r[0].trim().startsWith('Tổng')).length;
    return activeSupermarket === 'Tổng' || supermarketRowCount <= 1;
};

/** Điền các KPI còn thiếu trong `kpis` (sửa tại chỗ) từ KPI đầu bảng, nếu đầu bảng thuộc siêu thị đang xem. */
export const fillKpisFromHeader = (
    kpis: Record<string, string>,
    headerKpis: Record<string, string>,
    rows: string[][],
    activeSupermarket: string,
): void => {
    if (headerKpisBelongToActive(rows, activeSupermarket)) {
        if (!kpis.dtDuKienQD && headerKpis.dtDuKienQD) kpis.dtDuKienQD = headerKpis.dtDuKienQD;
        if (!kpis.dtDuKien && headerKpis.dtDuKien) kpis.dtDuKien = headerKpis.dtDuKien;
        if (!kpis.targetQD && headerKpis.targetQD) kpis.targetQD = headerKpis.targetQD;
        if (!kpis.htTargetQD && headerKpis.htTargetQD) kpis.htTargetQD = headerKpis.htTargetQD;
        if (!kpis.tlpv && headerKpis.tlpv) kpis.tlpv = headerKpis.tlpv;
        if (!kpis.lkhach && headerKpis.lkhach) kpis.lkhach = headerKpis.lkhach;
        if (!kpis.lbill && headerKpis.lbill) kpis.lbill = headerKpis.lbill;
        if ((!kpis.lbillBH || kpis.lbillBH === 'N/A') && (headerKpis.lbillBH || headerKpis.lbill)) {
            kpis.lbillBH = headerKpis.lbillBH || headerKpis.lbill;
        }
        if (!kpis.lbillBH) kpis.lbillBH = 'N/A';
        if (!kpis.lbillTH) kpis.lbillTH = headerKpis.lbillTH || 'N/A';
        if (!kpis.luotKhachChange && headerKpis.luotKhachChange) kpis.luotKhachChange = headerKpis.luotKhachChange;
        if (!kpis.tlpvChange && headerKpis.tlpvChange) kpis.tlpvChange = headerKpis.tlpvChange;
    }
    if (!kpis.lbillBH) kpis.lbillBH = 'N/A';
    if (!kpis.lbillTH) kpis.lbillTH = 'N/A';
};
