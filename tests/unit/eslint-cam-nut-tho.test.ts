import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

/**
 * GĐ10 bước 2 (2026-10-21): `<button>` thô từ CẢNH BÁO thành CHẶN sau khi đưa 194 chỗ về 0 (mọi nút đi qua
 * components/shared/ui/Button — nút tự tạo kiểu dùng `variant="unstyled" size="none"`). Cảnh báo thì `npm run check` vẫn xanh nên
 * nút thô quay lại lúc nào không hay (đó là cách 438 chỗ tích lại). Test lint bằng ĐÚNG eslint.config.js của dự án (không khai lại luật
 * ở đây — khai lại thì test xanh kể cả khi cấu hình thật bị hạ về "warn"), ở khu vực gốc lẫn features/*.
 */
const eslint = new ESLint({ cwd: process.cwd() });
const CHO = [
    'components/views/__thu__.tsx',
    'components/layout/__thu__.tsx',
    'features/line-bot/components/__thu__.tsx',
    'features/bi-dashboard/components/__thu__.tsx',
    'features/sticker-event/__thu__.tsx',
];
const loiNutTho = async (code: string, filePath: string) => {
    const [r] = await eslint.lintText(code, { filePath });
    return r.messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.severity);
};

describe('ESLint chặn <button> thô', () => {
    it('<button> thô là LỖI (severity 2) ở mọi khu vực', async () => {
        const code = 'export const A = () => <button type="button" onClick={() => {}}>x</button>;\n';
        for (const f of CHO) expect(await loiNutTho(code, f), f).toEqual([2]);
    }, 30_000);

    it('không bắt nhầm: <Button> dùng chung, chữ "<button>" trong chuỗi', async () => {
        const code = 'import { Button } from "x";\nexport const A = () => <Button variant="unstyled" size="none" title="<button>">x</Button>;\n';
        for (const f of CHO) expect(await loiNutTho(code, f), f).toEqual([]);
    }, 30_000);

    it('chính Button.tsx (nơi DUY NHẤT được render <button> thật) không bị chặn', async () => {
        const [r] = await eslint.lintFiles(['components/shared/ui/Button.tsx']);
        expect(r.messages.filter((m) => m.ruleId === 'no-restricted-syntax')).toEqual([]);
    }, 30_000);
});
