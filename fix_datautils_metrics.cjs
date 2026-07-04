const fs = require('fs');
const path = 'utils/dataUtils.ts';
let content = fs.readFileSync(path, 'utf8');

const newMetricsFunc = `
export function calculateRowMetrics(row: DataRow, productConfig: ProductConfig | null): { revenue: number, revenueQD: number, quantity: number, isTraCham: boolean } {
    const price = Number(getRowValue(row, COL.PRICE)) || 0;
    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
    const revenue = price;
    
    const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
    const productName = getRowValue(row, COL.PRODUCT);
    const productCode = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();
    
    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
    const revenueQD = revenue * heso;
    
    const htx = getRowValue(row, COL.HINH_THUC_XUAT) || '';
    let isTraCham = false;
    if (productConfig && productConfig.htxClassification) {
        isTraCham = productConfig.htxClassification[cleanAndNormalize(htx)] === 'tra_gop';
    } else {
        isTraCham = HINH_THUC_XUAT_TRA_GOP.has(htx);
    }
    
    return { revenue, revenueQD, quantity, isTraCham };
}
`;

if (!content.includes('export function calculateRowMetrics')) {
    content += newMetricsFunc;
    fs.writeFileSync(path, content);
}
