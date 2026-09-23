import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Hai nhóm khẳng định TĨNH bổ sung cho `tests/e2e/iframe-tabs-csp.spec.ts` (2026-09-18).
 *
 * Spec e2e kia kiểm HÀNH VI lúc chạy: mở trình duyệt, xem iframe có nạp được không. Nó vẫn cần
 * thiết và vẫn ở nguyên đó. Nhưng nó chậm (cần Chromium + dev server) và, quan trọng hơn, nó chỉ
 * phủ đúng những tab đang có test. File này kiểm thẳng MÃ NGUỒN, chạy trong mili-giây, ở job
 * `check` vốn không cần trình duyệt:
 *
 *   - Thêm một tab nhúng iframe mới mà quên nới `frame-src` → đỏ ngay, không cần ai viết test e2e
 *     cho tab đó. Đây đúng là hình dạng sự cố đã xảy ra thật (xem chú thích trong spec e2e).
 *   - Hạ ngược phiên bản xlsx trong `public/check-thuong.html` → đỏ ngay, và đỏ vì ĐÚNG LÝ DO
 *     (mã nguồn ghim sai bản), không phụ thuộc CDN của SheetJS có đang sống hay không.
 *
 * ⚠️ KHÔNG chép lại vai trò của spec e2e: kiểm tĩnh không biết trình duyệt có thật sự nạp được
 * iframe hay không. Hai tầng bổ sung nhau, không thay thế nhau.
 */

const readRepoFile = (relativePath: string) =>
    readFileSync(resolve(process.cwd(), relativePath), 'utf-8');

describe('CSP frame-src trong index.html', () => {
    const html = readRepoFile('index.html');

    // ⚠️ PHẢI lấy từ ĐÚNG thẻ meta, không được grep cả file. Bản nháp đầu của test này dùng
    // /frame-src([^;]*);/ trên toàn bộ index.html và khớp trúng ĐOẠN CHÚ THÍCH ở đầu file — đoạn
    // kể lại sự cố CSP cũ, trong đó có nhắc nguyên văn `'self'` và `https://*.run.app`. Hậu quả:
    // 2 test "cho phép …" XANH GIẢ (chúng đang đọc lời kể về sự cố, không phải policy thật), còn
    // test còn lại đỏ oan. Một test xanh vì lý do sai còn tệ hơn không có test.
    const cspMeta = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(html)?.[1] ?? '';
    const frameSrc = /\bframe-src\b([^;]*)/.exec(cspMeta)?.[1] ?? '';

    it('tìm được thẻ meta CSP', () => {
        expect(cspMeta.trim(), 'không tìm thấy thẻ meta Content-Security-Policy').not.toBe('');
    });

    it('có khai directive frame-src', () => {
        expect(frameSrc.trim(), 'thẻ meta CSP không khai frame-src').not.toBe('');
    });

    // Đây ĐÚNG là sự cố đã xảy ra thật: frame-src khai thiếu 2 nguồn dưới đây nên tab Check Thưởng
    // và tab Hoàn thuế hỏng HOÀN TOÀN trong im lặng — iframe chỉ lặng lẽ thành chrome-error://.
    it("cho phép 'self' — thiếu thì iframe nội bộ /check-thuong.html bị chặn", () => {
        expect(frameSrc).toContain("'self'");
    });

    it('cho phép https://*.run.app — thiếu thì tab nhúng Cloud Run bị chặn', () => {
        expect(frameSrc).toContain('https://*.run.app');
    });

    it('mọi URL render qua <ExternalToolView> đều được frame-src cho phép', () => {
        // ⚠️ Nguồn chân lý là <ExternalToolView url="…"> trong App.tsx, KHÔNG phải `externalUrl`
        // trong Sidebar/MobileBottomNav: những mục đó đi qua `window.open(url, '_blank')` — mở tab
        // MỚI, không phải iframe, nên `frame-src` không áp dụng cho chúng. Lẫn hai thứ này sẽ báo
        // động giả (bản nháp đầu của chính test này đã vấp: nó đòi `frame-src` phải khai cả
        // ltsdata1605-glitch.github.io, vốn chỉ là một liên kết mở tab mới).
        const app = readRepoFile('App.tsx');
        const urls = [...app.matchAll(/<ExternalToolView[^>]*\surl="(https:\/\/[^"]+)"/g)].map(m => m[1]);

        // 2026-09-23: mục "Kiểm quỹ" (công cụ ngoài duy nhất còn render qua ExternalToolView) đã
        // bị gỡ theo yêu cầu chủ dự án, nên danh sách này rỗng là ĐÚNG — không còn iframe ngoài
        // nào để kiểm. Giữ vòng lặp bên dưới cho ngày có người nhúng công cụ ngoài trở lại.
        if (urls.length === 0) {
            expect(app).not.toMatch(/<ExternalToolView[^>]*\surl=\{/);
            return;
        }

        const sources = frameSrc.split(/\s+/).filter(Boolean);
        for (const url of urls) {
            const host = new URL(url).hostname;
            const allowed = sources.some(src =>
                src === `https://${host}`
                // frame-src khai theo wildcard một cấp, ví dụ https://*.run.app
                || (src.startsWith('https://*.') && host.endsWith(`.${src.slice('https://*.'.length)}`)));
            expect(allowed, `host ${host} bị CSP frame-src chặn — nới directive trong index.html`).toBe(true);
        }
    });
});

describe('Ghim phiên bản xlsx của check-thuong.html', () => {
    const html = readRepoFile('public/check-thuong.html');

    /**
     * Check Thưởng là app vanilla độc lập, nạp thư viện qua CDN nên KHÔNG đi qua npm — vì thế nó bị
     * bỏ sót khi Đợt 1 vá lỗ hổng xlsx cho cả dự án, và vẫn dùng bản 0.18.5 dính CVE-2023-30533
     * (Prototype Pollution) + CVE-2024-22363 (ReDoS) trong khi chính nó parse file Excel người dùng
     * tải lên.
     */
    const src = /<script[^>]+src="(https:\/\/[^"]*xlsx[^"]*)"/i.exec(html)?.[1] ?? '';

    it('có nạp xlsx từ CDN', () => {
        expect(src, 'không tìm thấy thẻ script nạp xlsx').not.toBe('');
    });

    it('dùng CDN chính chủ cdn.sheetjs.com, không phải npm/cdnjs', () => {
        // Bản gói `xlsx` trên npm/cdnjs đã ngừng được SheetJS cập nhật vá lỗi.
        expect(src).toContain('cdn.sheetjs.com');
    });

    it('ghim bản >= 0.20.3, không phải 0.18.5 dính CVE', () => {
        const parsed = /xlsx-(\d+)\.(\d+)\.(\d+)/.exec(src);
        expect(parsed, `không đọc được số phiên bản từ: ${src}`).toBeTruthy();
        const [, major, minor, patch] = parsed!.map(Number);
        expect(`${major}.${minor}.${patch}`).not.toBe('0.18.5');
        const atLeast = major > 0 || minor > 20 || (minor === 20 && patch >= 3);
        expect(atLeast, `xlsx ${major}.${minor}.${patch} quá cũ — cần >= 0.20.3`).toBe(true);
    });
});
