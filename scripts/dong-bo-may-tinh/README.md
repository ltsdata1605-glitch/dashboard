# Tự đồng bộ GitHub → máy tính (macOS)

Mọi thay đổi làm trên cloud (Claude Code trên web/điện thoại) được đẩy lên nhánh `main` của GitHub.
Bộ script này cho máy Mac **tự kéo** bản mới đó về thư mục dự án, mỗi 5 phút và mỗi khi đăng nhập.

## Cài (chạy 1 lần trên máy Mac, trong thư mục dự án)
```bash
git checkout main && git pull origin main   # lần đầu phải kéo tay để có bộ script này
bash scripts/dong-bo-may-tinh/cai-dat.sh
```
Đổi chu kỳ (giây): `CHU_KY_GIAY=600 bash scripts/dong-bo-may-tinh/cai-dat.sh`

## Gỡ
```bash
bash scripts/dong-bo-may-tinh/go-cai-dat.sh
```

## Script làm gì — và KHÔNG làm gì
- Chỉ chạy khi máy đang ở nhánh `main`, không có file sửa dở, không có commit chưa push.
- Chỉ kéo kiểu fast-forward (`git pull --ff-only`). Không push, không xoá, không reset.
- Nếu `package-lock.json` (hoặc của `functions/`) đổi → tự `npm install` tương ứng.
- Bỏ qua vì lý do gì cũng hiện **thông báo macOS** + ghi nhật ký `~/Library/Logs/dashboard-dong-bo.log`.
  Gặp thông báo "CHƯA đồng bộ": commit/push hoặc `git stash` phần đang sửa, rồi `git pull`.

Đã thử 5 tình huống (máy sạch / sửa dở / commit chưa push / nhánh khác / sạch lại) bằng repo giả lập — 2026-09-29.
