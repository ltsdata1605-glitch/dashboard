#!/usr/bin/env node
'use strict';
/**
 * Đổi `import toast from 'react-hot-toast';` → `import { toast } from '<đường dẫn tương đối>/components/shared/ui/toast';`
 * ở mọi file .ts/.tsx (KE_HOACH_GIAO_DIEN_APPLE.md GĐ1). Chạy lại nhiều lần không hỏng (file đã đổi thì bỏ qua).
 * Bỏ qua: chính thư mục toast, node_modules, dist, functions, tests (test đơn vị mock thẳng 'react-hot-toast').
 *   node scripts/codemod/toast-import.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOAST_DIR = path.join(ROOT, 'components', 'shared', 'ui', 'toast');
const SKIP = new Set(['node_modules', 'dist', 'functions', 'tests', '.git', 'archive', 'scratch', '.claude', 'test-results']);
const DRY = process.argv.includes('--dry');
const PATTERN = /^import\s+toast\s+from\s+['"]react-hot-toast['"];?[ \t]*$/m;

function walk(dir, out) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (full !== TOAST_DIR) walk(full, out); }
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
    }
    return out;
}

let changed = 0;
for (const file of walk(ROOT, [])) {
    const src = fs.readFileSync(file, 'utf8');
    if (!PATTERN.test(src)) continue;
    let rel = path.relative(path.dirname(file), TOAST_DIR).split(path.sep).join('/');
    if (!rel.startsWith('.')) rel = './' + rel;
    const next = src.replace(PATTERN, `import { toast } from '${rel}';`);
    changed++;
    console.log(`${DRY ? '[dry] ' : ''}${path.relative(ROOT, file)} → ${rel}`);
    if (!DRY) fs.writeFileSync(file, next);
}
console.log(`${changed} file${DRY ? ' (chưa ghi)' : ' đã đổi'}.`);
