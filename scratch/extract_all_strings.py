import os
import re

db_dir = "/Users/dangkhoa/Library/Application Support/CocCoc/Browser/Profile 3/IndexedDB/https_ltsdata1605-glitch.github.io_0.indexeddb.leveldb"
if not os.path.exists(db_dir):
    print("Database directory does not exist.")
    exit(1)

out_path = "/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/scratch/all_extracted_strings.txt"
out_f = open(out_path, 'w', encoding='utf-8')

files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if os.path.isfile(os.path.join(db_dir, f))]

for filepath in files:
    if not (filepath.endswith('.log') or filepath.endswith('.ldb') or filepath.endswith('.sst')):
        continue
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Extract ASCII / UTF-8 strings
        matches_utf8 = re.findall(b'[\x09\x0A\x0D\x20-\x7E\xC2-\xDF][\x80-\xBF]|[\x20-\x7E\t\r\n]{15,}', content)
        for m in matches_utf8:
            try:
                dec = m.decode('utf-8', errors='ignore').strip()
                if len(dec) > 15 and ('Nhân viên' in dec or '95970' in dec or 'Lọc nước' in dec or 'Chế Thị' in dec):
                    out_f.write(f"--- UTF8 [{os.path.basename(filepath)}] ---\n")
                    out_f.write(dec + "\n\n")
            except:
                pass
                
        # Extract UTF-16 LE strings
        # We can search for pairs of bytes where the second byte is mostly 0x00 (ASCII) or small values
        # Let's decode the entire file as UTF-16LE and search for matches
        try:
            dec_utf16 = content.decode('utf-16le', errors='ignore')
            lines = dec_utf16.split('\n')
            for line in lines:
                if any(x in line for x in ['Nhân viên', '95970', 'Lọc nước', 'Chế Thị']):
                    out_f.write(f"--- UTF16LE [{os.path.basename(filepath)}] ---\n")
                    out_f.write(line.strip() + "\n\n")
        except:
            pass
            
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

out_f.close()
print("Done extracting all strings!")
