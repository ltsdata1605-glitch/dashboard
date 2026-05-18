const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        fs.statSync(dirPath).isDirectory() ? walkDir(dirPath, callback) : callback(dirPath);
    });
}
walkDir('/Users/dangkhoa/Downloads/dashboardycx/bi-module/components', (filePath) => {
    if (!filePath.endsWith('.tsx')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace text-indigo- (without number) to text-indigo-600
    content = content.replace(/text-indigo-([\s"'}])/g, 'text-indigo-600$1');
    content = content.replace(/bg-indigo-([\s"'}])/g, 'bg-indigo-600$1');
    content = content.replace(/border-indigo-([\s"'}])/g, 'border-indigo-600$1');
    
    // Convert table styles to clean slate styles
    content = content.replace(/bg-sky-600 dark:bg-sky-800 text-white font-bold uppercase/g, 'bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-500');
    content = content.replace(/bg-sky-600 text-white font-bold uppercase/g, 'bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-500 tracking-wider');
    
    // Replace sky borders in theaders with modern slate ones
    content = content.replace(/border-r border-sky-500\/30/g, 'border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 hover:bg-slate-100 dark:hover:bg-slate-750');
    content = content.replace(/border-r border-white\/20/g, 'border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 hover:bg-slate-100 dark:hover:bg-slate-750');
    
    // Replace table backgrounds
    content = content.replace(/bg-sky-700\/(40|50)/g, '');
    content = content.replace(/bg-sky-50\/20/g, 'bg-slate-50 dark:bg-slate-700/50');
    content = content.replace(/bg-[a-zA-Z0-9]+-[0-9]+\/?[0-9]* text-white/g, 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border-t-[3px] border-t-slate-200');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed styles in', path.relative(process.cwd(), filePath));
    }
});
