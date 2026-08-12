/** Helper to convert oklch() color values to standard rgb/rgba/hex format for html2canvas */
export function fixOklchColors(root: HTMLElement) {
    const cvs = document.createElement('canvas');
    cvs.width = 1;
    cvs.height = 1;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    function resolveOklch(val: string): string | null {
        if (!val || typeof val !== 'string' || val.indexOf('oklch') === -1) return null;
        try {
            // Sentinel KHÔNG được là đen — trước đây dùng '#000000' làm mốc rồi coi
            // "fillStyle không đổi sau khi gán val" là "màu này vốn đen", nhưng nếu canvas
            // không parse được cú pháp màu (vd biến thể oklch/color-mix mà html-to-image/một
            // số trình duyệt export không hỗ trợ), gán thất bại cũng khiến fillStyle giữ
            // nguyên '#000000' — bị hiểu nhầm thành "màu đen thật" và tô nhầm viền/nền/chữ
            // thành đen khi xuất ảnh. Đổi sang màu không thể trùng màu thiết kế thật để phân
            // biệt rạch ròi "parse được" vs "không parse được".
            const SENTINEL = '#ff00fe';
            ctx!.clearRect(0, 0, 1, 1);
            ctx!.fillStyle = SENTINEL;
            ctx!.fillStyle = val;
            if (ctx!.fillStyle === SENTINEL) return null; // Không parse được — giữ nguyên màu gốc, không đoán mò.

            ctx!.fillRect(0, 0, 1, 1);
            const px = ctx!.getImageData(0, 0, 1, 1).data;
            if (px[3] > 0) {
                return 'rgba(' + px[0] + ',' + px[1] + ',' + px[2] + ',' + (px[3] / 255).toFixed(2) + ')';
            }
            return ctx!.fillStyle;
        } catch (e) {
            return null;
        }
    }

    const els = [root, ...Array.from(root.querySelectorAll('*'))];
    type ColorStyleProp = 'color' | 'backgroundColor' | 'borderColor' | 'borderTopColor' | 'borderRightColor' | 'borderBottomColor' | 'borderLeftColor' | 'outlineColor' | 'textDecorationColor' | 'caretColor';
    const colorProps: [ColorStyleProp, string][] = [
        ['color', 'color'],
        ['backgroundColor', 'background-color'],
        ['borderColor', 'border-color'],
        ['borderTopColor', 'border-top-color'],
        ['borderRightColor', 'border-right-color'],
        ['borderBottomColor', 'border-bottom-color'],
        ['borderLeftColor', 'border-left-color'],
        ['outlineColor', 'outline-color'],
        ['textDecorationColor', 'text-decoration-color'],
        ['caretColor', 'caret-color']
    ];

    for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!(el instanceof HTMLElement)) continue;
        try {
            const cs = window.getComputedStyle(el);
            for (let j = 0; j < colorProps.length; j++) {
                const val = cs[colorProps[j][0]];
                if (val && typeof val === 'string' && val.indexOf('oklch') !== -1) {
                    const rgb = resolveOklch(val);
                    if (rgb) el.style.setProperty(colorProps[j][1], rgb, 'important');
                }
            }
            const shadow = cs.boxShadow;
            if (shadow && shadow.indexOf('oklch') !== -1) {
                const fixed = shadow.replace(/oklch\([^)]+\)/g, (match) => {
                    return resolveOklch(match) || 'transparent';
                });
                el.style.setProperty('box-shadow', fixed, 'important');
            }
        } catch (e) {
            // ignore
        }
    }
}
