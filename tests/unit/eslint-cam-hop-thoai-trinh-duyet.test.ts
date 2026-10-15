import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

/**
 * GĐ10 (2026-10-15): CLAUDE.md "Cấm tuyệt đối window.alert/confirm/prompt" — nhưng luật `no-restricted-globals` chỉ bắt `confirm()`
 * VIẾT TRẦN; `window.confirm()` là truy cập thuộc tính nên lọt: 6 chỗ dùng hộp thoại của trình duyệt (Phân tích, Tính thuế, Bot LINE,
 * Cấu hình SP) trong khi `npm run check` vẫn xanh. Test lint thử bằng ĐÚNG eslint.config.js của dự án (không khai lại luật ở đây —
 * khai lại thì test xanh kể cả khi cấu hình thật bị gỡ), ở cả khu vực gốc lẫn features/*.
 */
const eslint = new ESLint({ cwd: process.cwd() });
const CHO = [
    'components/views/__thu__.tsx',
    'features/line-bot/components/__thu__.tsx',
    'features/tax-calculator/__thu__.tsx',
    'features/bi-dashboard/services/__thu__.ts',
];
const loiCam = async (code: string, filePath: string) => {
    const [r] = await eslint.lintText(code, { filePath });
    return r.messages.filter((m) => m.ruleId === 'no-restricted-properties' || m.ruleId === 'no-restricted-globals').map((m) => m.ruleId);
};

describe('ESLint cấm hộp thoại của trình duyệt (alert / confirm / prompt)', () => {
    for (const goi of ['confirm("x")', 'window.confirm("x")', 'globalThis.confirm("x")', 'self.confirm("x")',
        'alert("x")', 'window.alert("x")', 'prompt("x")', 'window.prompt("x")']) {
        it(goi, async () => {
            for (const f of CHO) expect(await loiCam(`export function f() { ${goi}; }\n`, f), `${goi} @ ${f}`).toHaveLength(1);
        }, 30_000);
    }

    it('không bắt nhầm: phương thức trùng tên của đối tượng khác, chuỗi có chữ "window.confirm"', async () => {
        const code = 'export const f = (o: { confirm: () => void }) => { o.confirm(); return "window.confirm(x)"; };\n';
        for (const f of CHO) expect(await loiCam(code, f), f).toEqual([]);
    }, 30_000);
});
