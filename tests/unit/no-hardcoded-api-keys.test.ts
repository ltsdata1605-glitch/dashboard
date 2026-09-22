import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Chặn hard-code khoá API Google (AIza…) trong mã nguồn — CLAUDE.md mục 0.5.
 *
 * Vì sao có test này: 2026-09-22 một khoá Gemini API thật bị hard-code vào
 * `features/tax-calculator/services/salarySlipOcrService.ts` rồi push lên GitHub công khai
 * (commit a9f88551). Google quét thấy, đánh dấu "API key was reported as leaked" và VÔ HIỆU
 * khoá → Cloud Function parseSalarySlipWithGemini trả 403 → chức năng Tính Thuế đọc phiếu
 * lương bằng AI chết hẳn. Khoá thật phải nằm ở Firebase Secret (`functions:secrets:set`)
 * hoặc localStorage của từng người dùng, không bao giờ trong repo.
 *
 * NGOẠI LỆ cố ý: cấu hình Firebase *web* (apiKey trình duyệt) — Firebase thiết kế để gửi tới
 * mọi trình duyệt, bảo mật nằm ở Firestore Rules (xem CLAUDE.md mục 1.1).
 */
const ALLOWED_FILES = new Set([
    'services/firebase.ts',
    'features/phan-ca/services/firebase.ts',
    'features/sticker-event/firebase-applet-config.json',
    'tests/unit/no-hardcoded-api-keys.test.ts',
]);

const KEY_PATTERN = /AIza[0-9A-Za-z_-]{30,}/;

describe('Không hard-code khoá API Google trong mã nguồn', () => {
    it('mọi file đang theo dõi bởi git đều sạch (trừ cấu hình Firebase web công khai)', () => {
        const files = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
            .split('\n')
            .map(f => f.trim())
            .filter(f => f && !ALLOWED_FILES.has(f) && /\.(ts|tsx|js|jsx|mjs|cjs|json|html|env|md)$/i.test(f));

        const offenders: string[] = [];
        for (const file of files) {
            let content = '';
            try { content = readFileSync(file, 'utf8'); } catch { continue; }
            if (!content.includes('AIza')) continue;
            content.split('\n').forEach((line, idx) => {
                if (KEY_PATTERN.test(line)) offenders.push(`${file}:${idx + 1}`);
            });
        }

        expect(
            offenders,
            `Có khoá API Google bị hard-code (dán vào Firebase Secret hoặc localStorage thay vì repo):\n${offenders.join('\n')}`
        ).toEqual([]);
    });
});
