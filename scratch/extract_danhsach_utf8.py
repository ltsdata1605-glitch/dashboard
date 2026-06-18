import os
import re

db_dirs = [
    "/Users/dangkhoa/Library/Application Support/CocCoc/Browser/Default/IndexedDB/https_ltsdata1605-glitch.github.io_0.indexeddb.leveldb",
    "/Users/dangkhoa/Library/Application Support/CocCoc/Browser/Profile 3/IndexedDB/https_ltsdata1605-glitch.github.io_0.indexeddb.leveldb"
]

found = False
for db_dir in db_dirs:
    if not os.path.exists(db_dir):
        print(f"Directory {db_dir} does not exist.")
        continue
    
    print(f"Searching in {db_dir}...")
    files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if f.endswith('.ldb') or f.endswith('.sst') or f.endswith('.log')]

    for filepath in files:
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            # Search for NNH Điện gia dụng in UTF-8
            term = "Điện gia dụng".encode('utf-8')
            idx = content.find(term)
            if idx != -1:
                print(f"Found match in {os.path.basename(filepath)} at offset {idx}")
                start = max(0, idx - 10000)
                end = min(len(content), idx + 80000)
                slice_bytes = content[start:end]
                
                # Decode as UTF-8 ignoring errors
                text = slice_bytes.decode('utf-8', errors='ignore')
                
                # We want to find the TSV table that starts with "Nhân viên"
                match = re.search(r"Nhân viên[^\n]*\n.*", text)
                if match:
                    tsv_text = match.group(0)
                    clean_tsv = []
                    for line in tsv_text.split('\n'):
                        if 'Nhân viên' in line or 'Tổng' in line or 'BP ' in line or 'NNH ' in line or '\t' in line:
                            clean_tsv.append(line)
                        elif len(clean_tsv) > 10:
                            break
                    
                    final_tsv = '\n'.join(clean_tsv)
                    out_path = "/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/scratch/danhsach_raw.txt"
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        out_f.write(final_tsv)
                    print(f"Successfully extracted TSV data to {out_path}")
                    found = True
                    break
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
    if found:
        break

if not found:
    print("Could not find NNH Điện gia dụng in either database.")
