const fs = require('fs');
const file = '/Users/dangkhoa/Downloads/dashboardycx/bi-module/utils/nhanVienHelpers.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /const iLk = parts\.findIndex\(p => \['DTLK'.*?\]\.includes\(p\)\);/,
    "const iLk = parts.findIndex(p => ['DTLK', 'DOANH THU', 'DT REALTIME', 'DT THỰC'].some(k => p.includes(k)) && !p.includes('QĐ') && !p.includes('QUY ĐỔI'));"
);

code = code.replace(
    /const iQd = parts\.findIndex\(p => \['DTQĐ'.*?\]\.includes\(p\)\);/,
    "const iQd = parts.findIndex(p => ['DTQĐ', 'QUY ĐỔI', 'QĐ'].some(k => p.includes(k)));"
);

code = code.replace(
    /const iSl = parts\.findIndex\(p => \['SỐ LƯỢNG'.*?\]\.includes\(p\)\);/,
    "const iSl = parts.findIndex(p => ['SỐ LƯỢNG', 'SL'].some(k => p.includes(k)));"
);

fs.writeFileSync(file, code);
