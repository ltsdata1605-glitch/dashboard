const fs = require('fs');
const path = 'types.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('_metrics?')) {
    content = content.replace(
        /parsedDate\?: Date;/g,
        "parsedDate?: Date;\n    _metrics?: { revenue: number, revenueQD: number, quantity: number, isTraCham: boolean };\n    _parentGroup?: string;"
    );
    fs.writeFileSync(path, content);
}
