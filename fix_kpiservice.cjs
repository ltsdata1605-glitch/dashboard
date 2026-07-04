const fs = require('fs');
const path = 'services/kpiService.ts';
let content = fs.readFileSync(path, 'utf8');

const targetLoopVars = `        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const revenue = price; // Doanh thu là giá trị của cột Giá bán_1
        
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);
        
        const productCode = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
        const revenueQD = revenue * heso;`;

const replacementLoopVars = `        const metrics = row._metrics || { revenue: 0, revenueQD: 0, quantity: 0, isTraCham: false };
        const { revenue, revenueQD, isTraCham } = metrics;
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);`;

content = content.replace(targetLoopVars, replacementLoopVars);
fs.writeFileSync(path, content);
