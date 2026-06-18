import os
import re

db_dir = "/tmp/https_dashboard.pro.vn_0.indexeddb.leveldb"
if not os.path.exists(db_dir):
    print("Database directory does not exist.")
    exit(1)

# Find all files in the copied leveldb
files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if os.path.isfile(os.path.join(db_dir, f))]

for filepath in files:
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Search for occurrences of 'Chế Thị Út' or 'danhsach' or 'Hùng Vương'
        if b'Che\xcc\x81 Thi\xcc\x83 U\xcc\x81t' in content or b'Ch\xe1\xbb\x93 Th\xe1\xbb\x8b \xc3\x9at' in content or b'Ch\xc3\xa9 Th\xe1\xbb\x8b \xc3\x9at' in content or b'Ch\xe1\xbb\x93 Th\xe1\xbb\x8b' in content or b'Ch\xe1\xbb\x93' in content or b'U\xcc\x81t' in content or b'95970' in content:
            print(f"\n--- Found match in file: {os.path.basename(filepath)} (size: {len(content)}) ---")
            
            # Find TSV-like strings using regex
            # A TSV line for employee data looks like: Name\tNumber\tNumber...
            # Let's extract any printable string sequences containing tabs
            matches = re.findall(b'[\x20-\x7E\t\r\n\x80-\xFF]{30,}', content)
            for m in matches:
                try:
                    decoded = m.decode('utf-8', errors='ignore')
                    if '95970' in decoded or 'Chế Thị' in decoded or 'Lọc nước' in decoded:
                        print("MATCH:")
                        print(decoded[:2000])
                except Exception as e:
                    pass
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
