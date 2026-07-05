#!/usr/bin/env node
'use strict';

/**
 * Ratchet script cho các quy tắc của Shared Core Contract (RULES.md §2.5)
 * mà ESLint không kiểm được đáng tin cậy bằng AST: màu hardcode ngoài palette
 * semantic, class màu thiếu cặp dark:, và view thiếu toolbar mobile tương ứng.
 *
 * Cơ chế: đếm vi phạm theo file, so với baseline đã commit (violations-baseline.json).
 * Fail nếu 1 file bất kỳ có số vi phạm TĂNG so với baseline. Tự hạ baseline khi giảm.
 * Baseline chưa tồn tại → tạo mới từ hiện trạng (không fail lần đầu).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'violations-baseline.json');

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'archive', 'scratch', '.git',
  'telegram-agent', 'design-system',
]);

const NON_SEMANTIC_COLOR_PATTERN =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|accent|caret|decoration|shadow)-(?:indigo|blue|purple|violet|teal|cyan|orange|yellow|red|green|pink|fuchsia|lime|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;

const LIGHT_COLOR_ON_LINE =
  /\b(?:bg|text|border)-(?:slate|sky|emerald|amber|rose|indigo|blue|purple|violet|teal|cyan|orange|yellow|red|green|pink|fuchsia|lime|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/;

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function relPath(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function countNonSemanticColors(content) {
  const matches = content.match(NON_SEMANTIC_COLOR_PATTERN);
  return matches ? matches.length : 0;
}

function countMissingDarkVariant(content) {
  let count = 0;
  for (const line of content.split('\n')) {
    if (LIGHT_COLOR_ON_LINE.test(line) && !line.includes('dark:')) count++;
  }
  return count;
}

function countMissingMobileToolbar(content) {
  const hasDesktopPortal = content.includes('global-header-actions');
  const hasMobileToolbar = content.includes('lg:hidden');
  return hasDesktopPortal && !hasMobileToolbar ? 1 : 0;
}

function computeViolations() {
  const files = walk(ROOT, []);
  const result = {};
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const counts = {
      nonSemanticColor: countNonSemanticColors(content),
      missingDarkVariant: countMissingDarkVariant(content),
      missingMobileToolbar: countMissingMobileToolbar(content),
    };
    if (counts.nonSemanticColor || counts.missingDarkVariant || counts.missingMobileToolbar) {
      result[relPath(file)] = counts;
    }
  }
  return result;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function saveBaseline(data) {
  const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

function main() {
  const current = computeViolations();
  const baseline = loadBaseline();

  if (!baseline) {
    saveBaseline(current);
    console.log(`[lint-ratchet] Chưa có baseline — đã tạo mới tại violations-baseline.json (${Object.keys(current).length} file có vi phạm được ghi nhận).`);
    console.log('[lint-ratchet] Từ lần chạy sau, script sẽ chặn nếu vi phạm ở bất kỳ file nào TĂNG so với baseline này.');
    return;
  }

  const regressions = [];
  const nextBaseline = { ...baseline };
  let improved = false;

  for (const [file, counts] of Object.entries(current)) {
    const base = baseline[file] || { nonSemanticColor: 0, missingDarkVariant: 0, missingMobileToolbar: 0 };
    const merged = { ...base };
    for (const key of Object.keys(counts)) {
      const baseVal = base[key] || 0;
      if (counts[key] > baseVal) {
        regressions.push(`${file}: ${key} tăng từ ${baseVal} → ${counts[key]}`);
      } else if (counts[key] < baseVal) {
        merged[key] = counts[key];
        improved = true;
      }
    }
    nextBaseline[file] = merged;
  }

  for (const file of Object.keys(baseline)) {
    if (!current[file]) {
      delete nextBaseline[file];
      improved = true;
    }
  }

  if (regressions.length > 0) {
    console.error('[lint-ratchet] Phát hiện vi phạm MỚI so với baseline (RULES.md §2.5 Shared Core Contract):');
    for (const r of regressions) console.error(`  - ${r}`);
    console.error('\nSửa lại thay đổi, hoặc nếu đây là ngoại lệ có chủ đích, cập nhật thủ công violations-baseline.json.');
    process.exit(1);
  }

  if (improved) {
    saveBaseline(nextBaseline);
    console.log('[lint-ratchet] OK — không có vi phạm mới. Baseline đã được hạ xuống theo cải thiện vừa có.');
  } else {
    console.log('[lint-ratchet] OK — không có vi phạm mới so với baseline.');
  }
}

main();
