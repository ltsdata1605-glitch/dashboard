import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Linter } from 'eslint';
import globals from 'globals';

/**
 * Userscript Tampermonkey (public/scripts/*.user.js) nằm NGOÀI ESLint của dự án — không ai báo khi dùng biến chưa khai báo.
 * Bản 7.24 lỡ xoá `let acpRunning = false;` → 'use strict' ném ReferenceError mỗi lần bấm "⚡ Copy All" trên trang BI,
 * nút đứng im suốt 7.24–7.26 (phát hiện 2026-10-14 nhờ tests/e2e/click-plus-auto-toggle.spec.ts). Test này soi `no-undef`
 * trên MỌI userscript để lỗi cùng loại đỏ ngay ở `npm test`, không phải đợi người dùng báo.
 */
const THU_MUC = resolve(__dirname, '../../public/scripts');
const GM = ['GM_info', 'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues', 'GM_setClipboard', 'GM_addValueChangeListener',
    'GM_removeValueChangeListener', 'GM_xmlhttpRequest', 'GM_openInTab', 'GM_notification', 'GM_addStyle', 'unsafeWindow'];

describe('userscript không dùng biến chưa khai báo', () => {
    const files = readdirSync(THU_MUC).filter((f) => f.endsWith('.user.js'));
    it('có userscript để kiểm', () => expect(files.length).toBeGreaterThan(0));

    for (const f of files) {
        it(f, () => {
            const code = readFileSync(resolve(THU_MUC, f), 'utf8');
            const msgs = new Linter({ configType: 'flat' }).verify(code, [{
                languageOptions: {
                    ecmaVersion: 'latest',
                    sourceType: 'script',
                    globals: { ...globals.browser, ...Object.fromEntries(GM.map((g) => [g, 'readonly' as const])) },
                },
                rules: { 'no-undef': 'error' },
            }]);
            expect(msgs.map((m) => `${f}:${m.line} ${m.message}`)).toEqual([]);
        });
    }
});
