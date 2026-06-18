import os

base_dir = "/Users/dangkhoa/Library/Application Support/CocCoc/"
if not os.path.exists(base_dir):
    print("CocCoc directory does not exist.")
    exit(1)

for root, dirs, files in os.walk(base_dir):
    for d in dirs:
        if "ltsdata1605-glitch" in d and "indexeddb.leveldb" in d:
            print(os.path.join(root, d))
