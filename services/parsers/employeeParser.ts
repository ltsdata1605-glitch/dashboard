export interface Employee {
    originalName: string;
    name: string;
}

export interface DepartmentInfo {
    name: string;
    employeeCount: number;
    isManual?: boolean;
}

export const parseAllEmployees = (allEmployeesRaw: string, hiddenEmployees: string[] = []): Employee[] => {
    if (!allEmployeesRaw) return [];
    
    return allEmployeesRaw.split('\n')
        .map(l => l.trim())
        .filter(l => {
            const namePart = l.split('\t')[0];
            if (!namePart.includes(' - ')) return false;
            
            // Hardcoded exclusion rules from previous implementation
            if (namePart.startsWith('BP ') || 
                namePart.startsWith('Hỗ trợ BI') || 
                namePart.startsWith('NNH ') || 
                namePart.startsWith('ĐML_STR_STR') || 
                /^\d/.test(namePart)) {
                return false;
            }
            
            const parts = namePart.split(' - ');
            const possibleId = parts[parts.length - 1].trim();
            return /^\d+$/.test(possibleId);
        })
        .map(l => {
            const originalName = l.split('\t')[0];
            return { originalName, name: originalName };
        })
        .filter(emp => !hiddenEmployees.includes(emp.originalName));
};

export const parseDepartments = (allEmployeesRaw: string, hiddenEmployees: string[] = []): DepartmentInfo[] => {
    if (!allEmployeesRaw) return [];
    
    const lines = allEmployeesRaw.split('\n').map(l => l.trim()).filter(l => l);
    const departmentList: DepartmentInfo[] = [];
    let currentDept: DepartmentInfo | null = null;
    
    for (const line of lines) {
        const parts = line.split('\t');
        const namePart = parts[0];
        
        if (namePart.startsWith('BP ') && parts.length > 1) {
            if (currentDept) departmentList.push(currentDept);
            currentDept = { name: namePart.trim(), employeeCount: 0, isManual: false };
        } else if (currentDept && parts.length > 1) {
            if (namePart.includes(' - ') && 
                !namePart.startsWith('Hỗ trợ BI') && 
                !namePart.startsWith('NNH ') && 
                !namePart.startsWith('ĐML_STR_STR') && 
                !/^\d/.test(namePart)) {
                
                const npParts = namePart.split(' - ');
                const possibleId = npParts[npParts.length - 1].trim();
                
                if (/^\d+$/.test(possibleId) && !hiddenEmployees.includes(namePart)) {
                    currentDept.employeeCount++;
                }
            }
        }
    }
    
    if (currentDept) departmentList.push(currentDept);
    return departmentList;
};

export const parseSimpleDepartments = (danhSachData: string): DepartmentInfo[] => {
    if (!danhSachData || !danhSachData.includes('Nhân viên\tDTLK\tDTQĐ\tHiệu quả QĐ\tSố lượng\tĐơn giá')) return [];
    
    const lines = danhSachData.split('\n').map(l => l.trim()).filter(l => l);
    const departmentList: DepartmentInfo[] = [];
    let currentDept: DepartmentInfo | null = null;
    
    for (const line of lines) {
        const parts = line.split('\t');
        if (line.startsWith('BP ') && parts.length > 1) {
            if (currentDept) departmentList.push(currentDept);
            currentDept = { name: parts[0].trim(), employeeCount: 0 };
        } else if (currentDept && parts.length > 1) {
            currentDept.employeeCount++;
        }
    }
    
    if (currentDept) departmentList.push(currentDept);
    return departmentList;
};
