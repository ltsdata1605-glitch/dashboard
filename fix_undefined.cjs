const fs = require('fs');
const path = 'hooks/useDataManagement.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /if \(localValue === null || cloudTime > localTime\) {/g,
    "if (cloudItem && (localValue === null || cloudTime > localTime)) {"
);

fs.writeFileSync(path, content);
