with open('/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/scratch/extracted_prod_db.txt', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Let's search for sequences of words and numbers separated by tabs
lines = text.split('\n')
print(f"Total lines: {len(lines)}")
for idx, line in enumerate(lines):
    if '\t' in line:
        print(f"Line {idx} (tabs: {line.count(chr(9))}): {line[:300]}")
