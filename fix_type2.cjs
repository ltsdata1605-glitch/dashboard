const fs = require('fs');
const path = 'features/bi-dashboard/hooks/useNhanVienData.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/const uniqueDepartments = Array\.from\(new Set\(Object\.values\(employeeDepartmentMap\)\)\);/g, 'const uniqueDepartments = Array.from(new Set(Object.values(employeeDepartmentMap as Record<string, string>)));');
fs.writeFileSync(path, content);
