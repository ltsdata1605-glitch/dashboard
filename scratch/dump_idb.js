import { Level } from 'level';
import fs from 'fs';
import path from 'path';

const dbPaths = [
    '/Users/dangkhoa/Library/Application Support/Google/Chrome/Profile 1/IndexedDB/http_localhost_5173.indexeddb.leveldb',
    '/Users/dangkhoa/Library/Application Support/Google/Chrome/Default/IndexedDB/http_127.0.0.1_5174.indexeddb.leveldb',
    '/Users/dangkhoa/Library/Application Support/Google/Chrome/Default/IndexedDB/http_127.0.0.1_5173.indexeddb.leveldb',
    '/Users/dangkhoa/Library/Application Support/Google/Chrome/Default/IndexedDB/http_localhost_5173.indexeddb.leveldb'
];

// Helper to recursively copy directories using fs, skipping LOCK files
function copyFolderSync(from, to) {
    if (!fs.existsSync(from)) return;
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    fs.readdirSync(from).forEach(element => {
        if (element === 'LOCK') return; // Skip lock file
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isDirectory()) {
            copyFolderSync(fromPath, toPath);
        } else {
            try {
                fs.copyFileSync(fromPath, toPath);
            } catch (e) {
                console.log(`Failed to copy ${element}: ${e.message}`);
            }
        }
    });
}

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file, index) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

async function main() {
    const tempDir = path.join(process.cwd(), 'scratch/temp_db');
    
    for (const srcDbPath of dbPaths) {
        if (!fs.existsSync(srcDbPath)) {
            console.log(`Path does not exist: ${srcDbPath}`);
            continue;
        }
        
        console.log(`\n========================================`);
        console.log(`Processing: ${srcDbPath}`);
        
        try {
            // Copy db directory to avoid lock issues
            if (fs.existsSync(tempDir)) {
                deleteFolderRecursive(tempDir);
            }
            copyFolderSync(srcDbPath, tempDir);
            
            // LevelDB keys/values in Chrome can be binary buffers since they contain serialized V8 values
            const db = new Level(tempDir, { keyEncoding: 'buffer', valueEncoding: 'buffer' });
            await db.open();
            
            let count = 0;
            const records = [];
            for await (const [key, value] of db.iterator()) {
                count++;
                records.push({ key, value });
            }
            
            console.log(`Total LevelDB keys found: ${count}`);
            
            // Find and inspect records
            for (const rec of records) {
                // Try converting key to string (ignoring non-printable chars)
                const keyStr = rec.key.toString('utf8');
                
                // Chrome IndexedDB keys usually contain target strings like "bi_config"
                if (keyStr.includes('bi_config') && keyStr.includes('danhsach')) {
                    console.log(`Found matching key in DB:`);
                    console.log(`- Key raw length: ${rec.key.length}`);
                    console.log(`- Key text representation: ${keyStr.replace(/[^\x20-\x7E]/g, '')}`);
                    
                    const valBuf = rec.value;
                    console.log(`- Value raw length: ${valBuf.length}`);
                    
                    let text = '';
                    try {
                        text = valBuf.toString('utf8');
                    } catch (e) {
                        text = valBuf.toString('ascii');
                    }
                    
                    const nvIndex = text.indexOf('Nhân viên');
                    if (nvIndex !== -1) {
                        console.log(`Found 'Nhân viên' header at index ${nvIndex}!`);
                        const cleanText = text.substring(nvIndex);
                        const readableText = cleanText.replace(/[^\x09\x0A\x0D\x20-\x7E\u00C0-\u1EF9]/g, '');
                        console.log(`Sample of decoded text (first 5 lines):`);
                        console.log(readableText.split('\n').slice(0, 5).join('\n'));
                        
                        console.log(`\nWriting full extracted text to scratch/extracted_danhsach.txt`);
                        fs.writeFileSync(path.join(process.cwd(), 'scratch/extracted_danhsach.txt'), readableText);
                    } else {
                        console.log(`Could not find 'Nhân viên' string inside value buffer.`);
                        console.log(`Raw preview:`, valBuf.toString('ascii').replace(/[^\x20-\x7E]/g, '.').substring(0, 200));
                    }
                }
            }
            
            await db.close();
        } catch (e) {
            console.error(`Error processing db: ${e.message}`);
        }
    }
    
    if (fs.existsSync(tempDir)) {
        deleteFolderRecursive(tempDir);
    }
}

main().catch(console.error);
