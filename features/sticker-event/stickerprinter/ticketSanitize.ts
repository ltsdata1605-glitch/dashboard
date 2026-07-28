import DOMPurify from 'dompurify';

// Nội dung sticker do nhân viên tự nhập (rich-text qua execCommand bold/italic/underline +
// span style font-size/font-family), lưu chung trên Firestore cho cả nhân viên trong cùng
// cửa hàng — sanitize trước khi render qua dangerouslySetInnerHTML để chặn stored XSS.
export const sanitizeTicketHtml = (html?: string): string =>
    DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'br', 'div', 'p', 'font'],
        ALLOWED_ATTR: ['style', 'face', 'size', 'color', 'class'],
        ALLOWED_CSS_PROPERTIES: [
            'font-family',
            'font-size',
            'font-weight',
            'font-style',
            'text-decoration',
            'color',
            'background-color',
            'line-height',
            'text-align'
        ]
    } as any) as any;

/**
 * Sanitize + loại bỏ font-size inline khỏi các <span style="font-size:...">
 * dùng cho phiếu #2-4 (display-only). Container div đã set fontSize qua
 * React state — inline font-size gây xung đột khiến text bị cắt hoặc tràn.
 * Giữ lại font-family, font-weight, font-style, text-decoration v.v.
 */
export const sanitizeTicketHtmlForDisplay = (html?: string): string => {
    const clean = sanitizeTicketHtml(html);
    // Xóa font-size property khỏi inline style, giữ nguyên các property khác
    return clean.replace(/font-size\s*:\s*[^;]+;?/gi, '');
};
