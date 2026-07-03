const fs = require('fs');
const path = 'features/bi-dashboard/hooks/useNhanVienData.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/uniqueDepartments\n            \.filter\(d => !excludedKeywords\.some\(keyword => d\.toLowerCase\(\)\.includes\(keyword\)\)\)/g, 'uniqueDepartments\n            .filter(d => typeof d === "string" && !excludedKeywords.some(keyword => d.toLowerCase().includes(keyword)))');
content = content.replace(/departmentOptions\.some\(d => d\.toUpperCase\(\)\.includes\('ALL IN ONE'\)\)/g, 'departmentOptions.some(d => typeof d === "string" && d.toUpperCase().includes("ALL IN ONE"))');
content = content.replace(/departmentOptions\.forEach\(d => {\n                weights\[d\] = d\.toUpperCase\(\)\.includes\('ALL IN ONE'\) \? 100 : 0;\n            }\);/g, 'departmentOptions.forEach(d => {\n                if (typeof d === "string") weights[d] = d.toUpperCase().includes("ALL IN ONE") ? 100 : 0;\n            });');
content = content.replace(/departmentOptions\.forEach\(d => { weights\[d\] = share; }\);/g, 'departmentOptions.forEach(d => { if (typeof d === "string") weights[d] = share; });');
content = content.replace(/Object\.entries\(employeeDepartmentMap\)\)\.map\(\(\[originalName, department\]\)/g, 'Object.entries(employeeDepartmentMap as Record<string, string>)).map(([originalName, department])');
fs.writeFileSync(path, content);
