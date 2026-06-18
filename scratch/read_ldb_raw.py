import os

db_dir = "/tmp/https_dashboard.pro.vn_0.indexeddb.leveldb"
if not os.path.exists(db_dir):
    print("Database directory does not exist.")
    exit(1)

files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if os.path.isfile(os.path.join(db_dir, f))]

for filepath in files:
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Search for 'bi_config' which in hex is: 62 69 5f 63 6f 6e 66 69 67
        idx = 0
        while True:
            idx = content.find(b'bi_config', idx)
            if idx == -1:
                break
            
            print(f"\n--- Found 'bi_config' in {os.path.basename(filepath)} at offset {idx} ---")
            # Print the context around this match
            start = max(0, idx - 20)
            end = min(len(content), idx + 2000)
            context = content[start:end]
            # Replace non-printable bytes
            clean_context = ""
            for b in context:
                if 32 <= b <= 126 or b == 10 or b == 13 or b == 9:
                    clean_context += chr(b)
                elif b >= 192: # Simple UTF-8 start byte support
                    clean_context += f"\\x{b:02x}"
                else:
                    clean_context += "."
            print(clean_context[:1000])
            
            idx += 9
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
