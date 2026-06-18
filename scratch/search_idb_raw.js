import fs from 'fs';
import path from 'path';

const dbDirs = [
    '/Users/dangkhoa/Library/Application Support/CocCoc/Browser/Profile 3/IndexedDB/https_ltsdata1605-glitch.github.io_0.indexeddb.leveldb'
];

function searchInFile(filePath, term) {
    try {
        const buffer = fs.readFileSync(filePath);
        
        // Search UTF-8
        const termUtf8 = Buffer.from(term, 'utf8');
        let idx = -1;
        while (true) {
            idx = buffer.indexOf(termUtf8, idx + 1);
            if (idx === -1) break;
            console.log(`\n[UTF-8] Found "${term}" in ${filePath} at offset ${idx}`);
            extractAndSave(buffer, idx, termUtf8.length, false, filePath);
        }
        
        // Search UTF-16 LE
        const termUtf16 = Buffer.from(term, 'utf16le');
        idx = -1;
        while (true) {
            idx = buffer.indexOf(termUtf16, idx + 1);
            if (idx === -1) break;
            console.log(`\n[UTF-16LE] Found "${term}" in ${filePath} at offset ${idx}`);
            extractAndSave(buffer, idx, termUtf16.length, true, filePath);
        }
    } catch (e) {
    }
}

function extractAndSave(buffer, index, termLen, isUtf16, filePath) {
    const start = Math.max(0, index - 500);
    const end = Math.min(buffer.length, index + 25000);
    const slice = buffer.slice(start, end);
    
    let text = '';
    if (isUtf16) {
        text = slice.toString('utf16le');
    } else {
        text = slice.toString('utf8');
    }
    
    const readableText = text.replace(/[^\x09\x0A\x0D\x20-\x7E\u00C0-\u1EF9]/g, ' ');
    
    const nvIdx = readableText.indexOf('Nhân viên');
    if (nvIdx !== -1) {
        console.log(`Found 'Nhân viên' header inside context!`);
        const extracted = readableText.substring(nvIdx);
        const lines = extracted.split('\n');
        console.log(`First 15 lines of extracted TSV:`);
        console.log(lines.slice(0, 15).join('\n'));
        
        const outPath = path.join(process.cwd(), 'scratch/extracted_danhsach.txt');
        fs.writeFileSync(outPath, extracted);
        console.log(`Extracted TSV written to ${outPath}`);
    } else {
        console.log(`Context preview (first 500 chars):`);
        console.log(readableText.substring(0, 500));
    }
}

function walkDir(dirPath, term) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            walkDir(fullPath, term);
        } else if (file.endsWith('.log') || file.endsWith('.ldb') || file.endsWith('.sst')) {
            searchInFile(fullPath, term);
        }
    });
}

function main() {
    const terms = ['Nhân viên'];
    terms.forEach(term => {
        dbDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                walkDir(dir, term);
            }
        });
    });
}

main();
