import { describe, expect, it, vi } from 'vitest';

// pageHtmlUtils kéo BarcodeCanvas (canvas) — test này không in mã vạch nên thay bằng bản giả.
vi.mock('../../components/views/BarcodeCanvas', () => ({ generateBarcodeDataUrl: () => 'data:image/png;base64,AA' }));
const { generatePageHtml } = await import('../../features/sticker-event/stickerprinter/pageHtmlUtils');

/**
 * Audit 2026-10-07 (S12): tên sản phẩm / giá / đầu-chân tem lấy từ Excel hoặc người dùng gõ là CHỮ
 * THUẦN — không được thành thẻ HTML trong trang in tem. Chữ thường thì HTML ra giống hệt trước.
 */
const PAYLOAD = '<img src=x onerror="alert(1)">';
const page = (over: Record<string, unknown> = {}) => ({
    id: 'p1', html: '', label: 'Tủ lạnh Aqua 189L', oldPrice: '5.990.000', newPrice: '4.990.000', percent: '-17%',
    timestamp: 0, header: 'GIÁ SỐC', subHeader: 'Chỉ hôm nay', footer: 'Áp dụng tại siêu thị', ...over,
});

describe('HTML trang tem In Sticker', () => {
    it('tên/giá/đầu/chân tem chứa thẻ HTML được escape, không sinh thẻ <img>', () => {
        const html = generatePageHtml(page({ label: PAYLOAD, header: PAYLOAD, subHeader: PAYLOAD, footer: PAYLOAD, oldPrice: PAYLOAD }) as any,
            'sale', 'gio_vang', 'bg.png');
        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    });

    it('chữ thường (tiếng Việt, dấu chấm giá) giữ nguyên', () => {
        const html = generatePageHtml(page() as any, 'sale', 'gia_soc', 'bg.png');
        expect(html).toContain('<div class="name">Tủ lạnh Aqua 189L</div>');
        expect(html).toContain('<div class="old">5.990.000</div>');
        expect(html).toContain('<div class="header-text">GIÁ SỐC</div>');
    });
});
