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

/**
 * Sanitize + chuyển đổi font-size inline (px, pt) → cqw cho bản in.
 *
 * Bản in giữ container-type: inline-size (width=210mm + aspect-ratio)
 * nên cqw hoạt động tự nhiên. Tuy nhiên, Chrome preview đôi khi resolve
 * cqw thành px tuyệt đối (dựa trên kích thước preview panel ~384px),
 * lưu vào innerHTML. Các px values không scale theo container khi in →
 * cần convert px → cqw dựa trên preview container width.
 *
 * @param html - nội dung HTML từ contentEditable
 * @param previewWidthPx - chiều rộng thực tế của preview container (px).
 *                         Mặc định 384 (max-w-sm = 24rem ≈ 384px).
 */
export const sanitizeTicketHtmlForPrint = (
    html?: string,
    previewWidthPx = 384
): string => {
    let clean = sanitizeTicketHtml(html);

    // 1. Loại bỏ <span> rỗng chồng chất (artifact từ toolbar tăng/giảm font-size)
    //    GIỮ LẠI whitespace bên trong span ($1) — tránh nuốt khoảng trắng
    //    giữa các từ khiến "Chảo 10.000đ" → "Chảo10.000đ"
    let prev = '';
    while (prev !== clean) {
        prev = clean;
        clean = clean.replace(/<span[^>]*>(\s*)<\/span>/gi, '$1');
    }

    // 2. Chuyển font-size: Xpx → Xcqw (px / previewWidth * 100 = cqw)
    clean = clean.replace(
        /font-size\s*:\s*([\d.]+)\s*px/gi,
        (_match, val) => {
            const px = parseFloat(val);
            const cqw = ((px / previewWidthPx) * 100).toFixed(2);
            return `font-size:${cqw}cqw`;
        }
    );

    // 3. Chuyển font-size: Xpt → Xcqw (1pt = 1.3333px at 96dpi)
    clean = clean.replace(
        /font-size\s*:\s*([\d.]+)\s*pt/gi,
        (_match, val) => {
            const pt = parseFloat(val);
            const px = pt * (96 / 72); // pt → px at 96dpi
            const cqw = ((px / previewWidthPx) * 100).toFixed(2);
            return `font-size:${cqw}cqw`;
        }
    );

    // cqw giữ nguyên — container-type: inline-size cho phép cqw hoạt động
    return clean;
};

