# Sao lưu dự án (thay `archive/backup.cjs` cũ)

`sao-luu.cjs` nén dự án thành `archive/<số>. dashboardycx_backup_<ngày_giờ>.zip` rồi commit + push lên GitHub.
Khác bản cũ: **chỉ nén file git biết** (đã theo dõi + file mới chưa gitignore) cộng các file `.env*` — tự bỏ
`node_modules/`, `functions/node_modules/`, `functions/lib/`, `dist/`, `.e2e-chrome-profile/`, `test-results/`,
`playwright-report/`, `archive/`… Đo trên cây dự án: 1,3 GB → **7,9 MB** (864 file).

## Cài trên máy Mac (1 lần)
```bash
cd <thư mục dự án>
git pull origin main                                   # nếu tự đồng bộ chưa kéo về
cp archive/backup.cjs archive/backup.cu.cjs            # giữ bản cũ phòng khi cần quay lại
echo "require('../scripts/sao-luu/sao-luu.cjs');" > archive/backup.cjs
node archive/backup.cjs --chi-nen                      # thử: chỉ nén, không đụng git
ls -lh archive/ | tail -3                              # file mới phải cỡ vài MB, không phải hàng trăm MB
```
Từ đó `node archive/backup.cjs` (lệnh cũ, agent vẫn gọi) chạy bản mới. Quay lại bản cũ:
`mv archive/backup.cu.cjs archive/backup.cjs`.

## Hành vi
- Số thứ tự = số lớn nhất đang có trong `archive/` + 1 (nối tiếp dãy cũ 136, 137…).
- Có thay đổi → `git add -A` + commit `backup: …` → `git push` nhánh hiện tại. **Không bao giờ `--force`**:
  GitHub có bản mới hơn thì báo, zip vẫn tạo; chạy `git pull` rồi `git push`.
- `--chi-nen`: chỉ nén, không commit/push.
- Zip chứa `.env` → chỉ để trên máy (`archive/` bị gitignore, không bao giờ lên GitHub). Đừng gửi zip cho người khác.

Đã thử (2026-09-30): nén-only trên cây thật; commit+push và bị-từ-chối-khi-GitHub-mới-hơn trên repo giả lập.
