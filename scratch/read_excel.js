import XLSX from 'xlsx';
import path from 'path';

try {
    const filePath = '/Users/dangkhoa/Downloads/TNB - Du Kien Thuong Thi Dua 2805.xlsx';
    const workbook = XLSX.readFile(filePath);
    console.log("Sheet names in TNB - Du Kien Thuong Thi Dua 2805.xlsx:");
    console.log(workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log("First 15 rows of sheet 0:");
    for (let i = 0; i < Math.min(data.length, 15); i++) {
        console.log(data[i].join(' | '));
    }
} catch (e) {
    console.error("Error reading file:", e);
}
