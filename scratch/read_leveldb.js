import { Level } from 'level';
import { execSync } from 'child_process';
import fs from 'fs';

try {
    console.log("Copying LevelDB folder to avoid locks...");
    const srcDir = "/Users/dangkhoa/Library/Application Support/Google/Chrome/Default/IndexedDB/http_localhost_5173.indexeddb.leveldb";
    const destDir = "/tmp/http_localhost_5173.indexeddb.leveldb";
    
    if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
    }
    execSync(`cp -r "${srcDir}" "${destDir}"`);
    console.log("Copied successfully! Opening leveldb...");
    
    const db = new Level(destDir, { valueEncoding: 'binary' });
    await db.open();
    
    console.log("Iterating through leveldb...");
    let count = 0;
    for await (const [key, value] of db.iterator()) {
        count++;
        // Print key and value if they contain readable text of interest
        const keyStr = key.toString('utf8');
        const valStr = value.toString('utf8');
        
        if (keyStr.includes('bi_') || valStr.includes('competition-luy-ke') || valStr.includes('comptarget') || keyStr.includes('comptarget')) {
            console.log(`\nKey (raw hex): ${key.toString('hex')}`);
            console.log(`Key (utf8): ${keyStr}`);
            console.log(`Val length: ${value.length}`);
            console.log(`Val (utf8 sample): ${valStr.slice(0, 300)}`);
        }
    }
    console.log(`\nDone. Iterated ${count} keys.`);
    await db.close();
} catch (e) {
    console.error("Error:", e);
}
