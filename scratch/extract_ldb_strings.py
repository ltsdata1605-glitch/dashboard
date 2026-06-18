import os
import re

db_dir = "/Users/dangkhoa/Library/Application Support/CocCoc/Browser/Profile 3/IndexedDB/https_ltsdata1605-glitch.github.io_0.indexeddb.leveldb"
if not os.path.exists(db_dir):
    print("Database directory does not exist.")
    exit(1)

files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if f.endswith('.ldb') or f.endswith('.sst')]

for filepath in files:
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Search for '95970' in UTF-16 LE and UTF-8
        for term, is_utf16 in [('95970'.encode('utf-16le'), True), ('95970'.encode('utf-8'), False)]:
            idx = 0
            while True:
                idx = content.find(term, idx)
                if idx == -1:
                    break
                
                print(f"\n--- Found '95970' in {os.path.basename(filepath)} at offset {idx} (utf16: {is_utf16}) ---")
                start = max(0, idx - 1000)
                end = min(len(content), idx + 15000)
                slice_bytes = content[start:end]
                
                if is_utf16:
                    text = slice_bytes.decode('utf-16le', errors='ignore')
                else:
                    text = slice_bytes.decode('utf-8', errors='ignore')
                
                # Replace non-printable
                clean_text = ""
                for char in text:
                    if char == '\t':
                        clean_text += "<TAB>"
                    elif char == '\n':
                        clean_text += "<NL>\n"
                    elif char == '\r':
                        clean_text += "<CR>"
                    elif 32 <= ord(char) <= 126 or 128 <= ord(char) <= 10000:
                        clean_text += char
                    else:
                        clean_text += f"\\x{ord(char):02x}"
                
                print(clean_text[:4000])
                idx += len(term)
                
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
