import os
import re

db_dir = "/Users/dangkhoa/Library/Application Support/CocCoc/Browser/Profile 3/IndexedDB/https_ltsdata1605-glitch.github.io_0.indexeddb.leveldb"
if not os.path.exists(db_dir):
    print("Database directory does not exist.")
    exit(1)

# Find all files
files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if os.path.isfile(os.path.join(db_dir, f))]

for filepath in files:
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Search for '95970' in UTF-16 LE since the previous output indicated UTF-16 LE matches
        term = b'95970'
        # We can search in utf-16le
        term_utf16 = '95970'.encode('utf-16le')
        idx = content.find(term_utf16)
        if idx != -1:
            print(f"\n--- Found '95970' UTF-16LE in {os.path.basename(filepath)} at offset {idx} ---")
            start = max(0, idx - 500)
            end = min(len(content), idx + 20000)
            slice_bytes = content[start:end]
            text = slice_bytes.decode('utf-16le', errors='ignore')
            
            # Let's write the decoded text to a file so we can view it
            out_path = "/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/scratch/extracted_prod_db.txt"
            with open(out_path, 'w', encoding='utf-8') as out_f:
                out_f.write(text)
            print(f"Extracted context written to {out_path}")
            break
            
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
