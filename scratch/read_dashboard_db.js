import { Level } from 'level';
import { execSync } from 'child_process';
import fs from 'fs';

try {
    console.log("Copying production IndexedDB LevelDB...");
    const srcDir = "/Users/dangkhoa/Library/Application Support/Google/Chrome/Default/IndexedDB/https_dashboard.pro.vn_0.indexeddb.leveldb";
    const destDir = "/tmp/https_dashboard.pro.vn_0.indexeddb.leveldb";
    
    if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
    }
    execSync(`cp -r "${srcDir}" "${destDir}"`);
    console.log("Copied! Opening db...");
    
    const db = new Level(destDir, { valueEncoding: 'binary' });
    await db.open();
    
    console.log("Searching for danhsach keys...");
    for await (const [key, value] of db.iterator()) {
        const keyStr = key.toString('utf8');
        const valStr = value.toString('utf8');
        
        if (keyStr.includes('danhsach') || keyStr.includes('Hùng Vương')) {
            console.log(`\nKey (utf8): ${keyStr}`);
            console.log(`Val length: ${value.length}`);
            // LevelDB IndexedDB key values are usually prefixed with some binary metadata, let's find the text part.
            // Let's print out the text part by cleaning up some non-printable characters.
            const cleanVal = valStr.replace(/[^\x20-\x7E\t\n\r]/g, '');
            console.log(`Val:`, cleanVal.slice(0, 2000));
        }
    }
    await db.close();
} catch (e) {
    console.error("Error:", e);
}
