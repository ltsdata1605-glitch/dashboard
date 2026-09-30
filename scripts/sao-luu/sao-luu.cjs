#!/usr/bin/env node
/**
 * Sao lưu dự án thành file zip trong `archive/` (+ tuỳ chọn commit & push lên GitHub).
 *
 * Thay cho `archive/backup.cjs` cũ (chỉ có trên máy Mac, nén cả thư mục nên kéo theo node_modules,
 * dist, profile Chrome của e2e… — mục A40 của audit).
 *
 * CHỌN FILE: lấy đúng danh sách git biết — file đã theo dõi + file mới chưa bị .gitignore
 * (`git ls-files --cached --others --exclude-standard`). Nhờ vậy mọi thư mục rác đã khai trong
 * .gitignore (node_modules/, functions/node_modules/, functions/lib/, dist/, .e2e-chrome-profile/,
 * test-results/, playwright-report/, archive/…) tự bị bỏ, và file đang sửa dở CHƯA commit vẫn vào zip.
 * Thêm riêng các file `.env*` (bị gitignore nhưng mất là không lấy lại được) — zip chỉ nằm trên máy,
 * thư mục archive/ bị gitignore nên KHÔNG bao giờ bị đẩy lên GitHub.
 *
 * TÊN FILE: `<số thứ tự>. dashboardycx_backup_<YYYYMMDD_HHMMSS>.zip` — số thứ tự = số lớn nhất
 * đang có trong archive/ + 1 (giữ đúng kiểu đặt tên cũ, vd "136. dashboardycx_backup_20260926_085429.zip").
 *
 * GITHUB: mặc định, nếu có thay đổi thì `git add -A` + commit "backup: …" rồi `git push` (không bao giờ
 * --force). Chạy với `--chi-nen` để chỉ nén, không đụng git.
 *
 * Cách chạy (từ thư mục dự án):   node scripts/sao-luu/sao-luu.cjs [--chi-nen]
 */
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const ARCHIVE = path.join(ROOT, 'archive');
const CHI_NEN = process.argv.includes('--chi-nen');

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const pad = (n) => String(n).padStart(2, '0');

function danhSachFile() {
    const tuGit = git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
        .split('\0')
        .filter(Boolean);
    // .env* ở gốc và functions/: gitignore nhưng cần có trong bản sao lưu
    const env = [];
    for (const dir of ['', 'functions']) {
        const abs = path.join(ROOT, dir);
        if (!fs.existsSync(abs)) continue;
        for (const f of fs.readdirSync(abs)) {
            if (f.startsWith('.env')) env.push(dir ? `${dir}/${f}` : f);
        }
    }
    // --cached còn liệt kê file đã xoá trên đĩa mà chưa commit → bỏ, zip sẽ báo lỗi nếu giữ
    return [...new Set([...tuGit, ...env])].filter((f) => fs.statSync(path.join(ROOT, f), { throwIfNoEntry: false })?.isFile());
}

function soThuTuTiepTheo() {
    if (!fs.existsSync(ARCHIVE)) return 1;
    let max = 0;
    for (const f of fs.readdirSync(ARCHIVE)) {
        const m = /^(\d+)\.\s/.exec(f);
        if (m && f.endsWith('.zip')) max = Math.max(max, Number(m[1]));
    }
    return max + 1;
}

function nen() {
    fs.mkdirSync(ARCHIVE, { recursive: true });
    const d = new Date();
    const moc = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const ten = `${soThuTuTiepTheo()}. dashboardycx_backup_${moc}.zip`;
    const dich = path.join(ARCHIVE, ten);
    const files = danhSachFile();
    // zip -@ đọc danh sách file từ stdin (có sẵn trên macOS); -X bỏ thuộc tính phụ của macOS
    execFileSync('zip', ['-q', '-X', dich, '-@'], { cwd: ROOT, input: files.join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'] });
    const mb = (fs.statSync(dich).size / 1024 / 1024).toFixed(1);
    console.log(`[sao-luu] Đã nén ${files.length} file → archive/${ten} (${mb} MB)`);
    return ten;
}

function dayLenGithub(ten) {
    const nhanh = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
    if (git('status', '--porcelain').trim()) {
        git('add', '-A');
        git('commit', '-q', '-m', `backup: ${ten.replace(/\.zip$/, '')}`);
        console.log(`[sao-luu] Đã commit thay đổi đang có trên nhánh ${nhanh}.`);
    }
    try {
        execFileSync('git', ['push', '-u', 'origin', nhanh], { cwd: ROOT, stdio: 'inherit' });
        console.log(`[sao-luu] Đã đẩy nhánh ${nhanh} lên GitHub.`);
    } catch {
        // Không bao giờ --force: bản trên GitHub mới hơn thì để người dùng tự `git pull` rồi chạy lại
        console.error(`[sao-luu] ⚠️ KHÔNG đẩy được lên GitHub (thường do GitHub có bản mới hơn). File zip vẫn đã tạo.`);
        console.error(`[sao-luu]    Chạy: git pull origin ${nhanh}   rồi: git push`);
        process.exitCode = 1;
    }
}

const ten = nen();
if (CHI_NEN) console.log('[sao-luu] --chi-nen: bỏ qua bước GitHub.');
else dayLenGithub(ten);
