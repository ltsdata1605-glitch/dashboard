# Workspace Rules

## Backup Commands
Whenever the user requests a backup (e.g. "backup", "hãy backup", "sao lưu", etc.), you must automatically run the backup script located at `archive/backup.cjs` using node:
```bash
node archive/backup.cjs
```
This script will handle both pushing the changes to Github and creating a zipped backup under the `archive` directory with sequential numbering.
