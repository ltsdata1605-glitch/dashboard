const fs = require('fs');

const path = './features/phan-ca/hooks/usePhanCa.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace relative paths starting with './' (but not '../../') to '../'
content = content.replace(/from '\.\/([^']+)'/g, "from '../$1'");
// Replace relative paths starting with '../../' to '../../../'
content = content.replace(/from '\.\.\/\.\.\/([^']+)'/g, "from '../../../$1'");

fs.writeFileSync(path, content);
console.log("Imports fixed");
