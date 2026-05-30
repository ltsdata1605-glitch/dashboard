import XLSX from 'xlsx';

try {
    const filePath = '/Users/dangkhoa/Downloads/2026.04 Khoán công việc TGDĐ-ĐMX-TZ-AK.xlsx';
    const workbook = XLSX.readFile(filePath);
    console.log("Sheet names in 2026.04 Khoán công việc TGDĐ-ĐMX-TZ-AK.xlsx:");
    console.log(workbook.SheetNames);
    
    // Check first few sheets
    for (let i = 0; i < Math.min(workbook.SheetNames.length, 3); i++) {
        const sheetName = workbook.SheetNames[i];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        console.log(`\nFirst 5 rows of sheet ${sheetName}:`);
        for (let j = 0; j < Math.min(data.length, 5); j++) {
            console.log(data[j].join(' | '));
        }
    }
} catch (e) {
    console.error("Error reading file:", e);
}
