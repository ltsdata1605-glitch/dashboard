import DOMPurify from 'dompurify';

// Nội dung sticker do nhân viên tự nhập (rich-text qua execCommand bold/italic/underline +
// span style font-size/font-family), lưu chung trên Firestore cho cả nhân viên trong cùng
// cửa hàng — sanitize trước khi render qua dangerouslySetInnerHTML để chặn stored XSS.
export const sanitizeTicketHtml = (html?: string): string =>
    DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'br', 'div', 'p'],
        ALLOWED_ATTR: ['style'],
    });
