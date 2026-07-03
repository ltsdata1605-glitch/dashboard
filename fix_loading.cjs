const fs = require('fs');
const path = 'hooks/useDataManagement.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /(\/\/ isFilterProcessing is a soft signal \(optional, kept for future use\)\.)\s+const handleWorkerMessage/g,
    "$1\n        setIsFilterProcessing(true);\n\n        const handleWorkerMessage"
);

fs.writeFileSync(path, content);
