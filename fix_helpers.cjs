const fs = require('fs');
const path = 'features/bi-dashboard/utils/nhanVienHelpers.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/const normalizedEmployeeMap = new Record<string, string>\(\);/g, 'const normalizedEmployeeMap: Record<string, string> = {};');
content = content.replace(/for \(const fullName of employeeDepartmentMap\.keys\(\)\)/g, 'for (const fullName of Object.keys(employeeDepartmentMap))');
content = content.replace(/normalizedEmployeeMap\.set\(norm, fullName\);/g, 'if (norm) normalizedEmployeeMap[norm] = fullName;');
content = content.replace(/const exactMatch = normalizedEmployeeMap\.get\(normalizedShort\);/g, 'const exactMatch = normalizedShort ? normalizedEmployeeMap[normalizedShort] : undefined;');
content = content.replace(/for \(const \[normFull, fullName\] of normalizedEmployeeMap\.entries\(\)\)/g, 'for (const [normFull, fullName] of Object.entries(normalizedEmployeeMap))');

fs.writeFileSync(path, content);
