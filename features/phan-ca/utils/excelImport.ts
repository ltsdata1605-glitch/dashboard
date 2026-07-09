import { ImportedStaff } from '../types';

export async function parseStaffFromExcelBuffer(data: Uint8Array): Promise<ImportedStaff[]> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    // any: dữ liệu Excel thô, mỗi ô có thể là string/number/Date/null tùy nội dung file
    const json: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    const imported: ImportedStaff[] = [];
    let currentDepartment = "";
    json.slice(2).forEach(row => {
        let departmentRaw = row[0]?.toString().trim();
        // Tăng cường nhận diện dòng tiêu đề bộ phận trong Excel (chống lỗi gộp ô sai cột)
        if (!departmentRaw || departmentRaw === "") {
            // Nếu cột A trống, tìm ở các cột khác xem có chữ "BP " hoặc "Bộ phận"
            for (let i = 1; i < Math.min(row.length, 5); i++) {
                const cellVal = row[i]?.toString().trim();
                if (cellVal && (cellVal.includes("BP ") || cellVal.toLowerCase().includes("bộ phận") || cellVal.includes("All In One"))) {
                    departmentRaw = cellVal;
                    break;
                }
            }
            // Nếu vẫn không thấy, kiểm tra xem dòng này có phải chỉ có 1 ô duy nhất không (thường là tiêu đề)
            if (!departmentRaw) {
                const validCells = row.filter(c => c !== undefined && c !== null && c.toString().trim() !== "");
                if (validCells.length === 1 && isNaN(Number(validCells[0]))) {
                    departmentRaw = validCells[0].toString().trim();
                }
            }
        }
        // Chỉ cập nhật currentDepartment nếu nó không phải là 1 số (tránh lấy nhầm mã nhân viên)
        if (departmentRaw && isNaN(Number(departmentRaw))) {
            currentDepartment = departmentRaw;
        }
        let department = currentDepartment;
        const staffCode = row[1]?.toString().trim();
        const staffName = row[2]?.toString().trim();
        if (department && staffCode && staffName) {
            if (department.includes("BP Kế Toán")) return;
            if (department.includes("BP Trưởng Ca") || department.includes("BP Quản Lý Siêu Thị")) department = "BP Quản Lý/Trưởng Ca";
            const combinedName = `${staffCode} - ${staffName}`;
            imported.push({ id: combinedName, name: combinedName, department: department, importIndex: imported.length });
        }
    });
    return imported;
}
