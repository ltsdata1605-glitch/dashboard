const fs = require('fs');
const path = '/Users/ltson/.gemini/antigravity-ide/brain/64e7d6fc-abec-43da-aa30-081aa2839b53/task.md';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/- \[ \] 5\. Kiểm tra & Verify toàn bộ ứng dụng\./, '- [x] 5. Kiểm tra & Verify toàn bộ ứng dụng.');
fs.writeFileSync(path, content);
