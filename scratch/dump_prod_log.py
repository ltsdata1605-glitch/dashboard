import os

filepath = "/Users/dangkhoa/Library/Application Support/CocCoc/Browser/Profile 3/IndexedDB/https_ltsdata1605-glitch.github.io_0.indexeddb.leveldb/000003.log"
if not os.path.exists(filepath):
    print("Log file does not exist.")
    exit(1)

with open(filepath, 'rb') as f:
    content = f.read()

# Search for '95970' in UTF-16 LE
term = '95970'.encode('utf-16le')
idx = content.find(term)
if idx == -1:
    # Try UTF-8
    term = '95970'.encode('utf-8')
    idx = content.find(term)
    is_utf16 = False
else:
    is_utf16 = True

if idx == -1:
    print("Could not find '95970' in log file.")
    exit(1)

print(f"Found '95970' at offset {idx} (is_utf16: {is_utf16})")

# Print 2000 bytes before and 2000 bytes after as readable text
start = max(0, idx - 1000)
end = min(len(content), idx + 8000)
slice_bytes = content[start:end]

if is_utf16:
    text = slice_bytes.decode('utf-16le', errors='ignore')
else:
    text = slice_bytes.decode('utf-8', errors='ignore')

# Clean up non-printable
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

print("\n--- EXTRACTED CONTEXT ---")
print(clean_text)
