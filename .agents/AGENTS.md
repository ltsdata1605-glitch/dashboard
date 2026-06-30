# Workspace Rules

## Ngôn ngữ
Tất cả mô tả, kế hoạch (plan), báo cáo (report), walkthrough, artifact, và giao tiếp với người dùng **BẮT BUỘC phải viết bằng tiếng Việt** trong mọi tình huống. Không ngoại lệ. Chỉ giữ nguyên tiếng Anh cho: tên biến, tên hàm, tên file, tên thư viện, code snippet, và thuật ngữ kỹ thuật không có từ tiếng Việt tương đương.

## Backup Commands
Whenever the user requests a backup (e.g. "backup", "hãy backup", "sao lưu", etc.), you must automatically run the backup script located at `archive/backup.cjs` using node:
```bash
node archive/backup.cjs
```
This script will handle both pushing the changes to Github and creating a zipped backup under the `archive` directory with sequential numbering.
