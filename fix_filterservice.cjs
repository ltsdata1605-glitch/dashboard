const fs = require('fs');
const path = 'services/filterService.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('calculateRowMetrics')) {
    content = content.replace(
        "import { cleanAndNormalize } from '../utils/dataUtils';",
        "import { cleanAndNormalize, calculateRowMetrics } from '../utils/dataUtils';"
    );
    
    // Replace the loop logic to include caching
    const targetLoopStart = "for (let i = 0, len = periodData.length; i < len; i++) {";
    const targetLoopReplacement = `
    for (let i = 0, len = periodData.length; i < len; i++) {
        const row = periodData[i];
        
        // --- PRE-CALCULATE METRICS ---
        row._metrics = calculateRowMetrics(row, productConfig);
        row._parentGroup = getParentGroup(getRowValue(row, COL.MA_NHOM_HANG), productConfig);
        // -----------------------------
`;
    content = content.replace(targetLoopStart, targetLoopReplacement);
    
    // Now replace the parentGroup calls inside the loop to use _parentGroup
    content = content.replace(
        /const parentGroup = getParentGroup\(maNhomHang, productConfig\);/g,
        "const parentGroup = row._parentGroup;"
    );

    fs.writeFileSync(path, content);
}
