import { describe, expect, it } from 'vitest';
import { liffTicket, verifyLiffTicket, signLiffUris } from '../../functions/src/liffTicket';
import { createFilteredPmhFlexMessages, createCouponFlexMessage } from '../../functions/src/pmhFlexCard';

/** Audit 2026-10-07 (S06): vé thẻ coupon cho mark-used — chỉ đúng bot + đúng mã mới hợp lệ. */
const collectUris = (node: unknown, out: string[] = []): string[] => {
    if (Array.isArray(node)) node.forEach((n) => collectUris(n, out));
    else if (node && typeof node === 'object') {
        const o = node as Record<string, unknown>;
        if (typeof o.uri === 'string') out.push(o.uri);
        Object.values(o).forEach((v) => collectUris(v, out));
    }
    return out;
};

describe('vé LIFF', () => {
    it('vé đúng mã + đúng secret hợp lệ; sai mã/sai secret/rỗng bị từ chối', () => {
        const t = liffTicket('secret-A', 'ABC123');
        expect(verifyLiffTicket('secret-A', 'abc123 ', t)).toBe(true); // chuẩn hoá hoa/thường, khoảng trắng
        expect(verifyLiffTicket('secret-A', 'ABC124', t)).toBe(false);
        expect(verifyLiffTicket('secret-B', 'ABC123', t)).toBe(false);
        expect(verifyLiffTicket('', 'ABC123', t)).toBe(false);
        expect(verifyLiffTicket('secret-A', 'ABC123', '')).toBe(false);
    });

    it('ký mọi thẻ trong carousel lọc PMH, giữ nguyên các tham số cũ', () => {
        const msgs = signLiffUris(createFilteredPmhFlexMessages([
            { recipient: 'Nhân', productName: 'PMH 100K', categoryLabel: '100K', code: 'CODE1', cardIndex: 1 },
            { recipient: 'Hà', productName: 'PMH 50K', categoryLabel: '50K', code: 'CODE2', cardIndex: 2 },
        ], 'liff-x'), 'botA', 'secret-A');
        const liff = collectUris(msgs).filter((u) => u.startsWith('https://liff.line.me/'));
        expect(liff).toHaveLength(2);
        for (const u of liff) {
            const p = new URL(u).searchParams;
            expect(p.get('b')).toBe('botA');
            expect(verifyLiffTicket('secret-A', p.get('code')!, p.get('t')!)).toBe(true);
            expect(p.get('reqBy')).toBeTruthy();
        }
    });

    it('thẻ cấp mã từ kho cũng được ký; thiếu secret thì giữ nguyên link', () => {
        const signed = createCouponFlexMessage({ displayName: 'A', productName: 'PMH', categoryLabel: 'PMH', code: 'Z9' });
        signLiffUris(signed, 'botA', 'secret-A');
        expect(collectUris(signed).some((u) => u.includes('&t='))).toBe(true);

        const unsigned = createCouponFlexMessage({ displayName: 'A', productName: 'PMH', categoryLabel: 'PMH', code: 'Z9' });
        signLiffUris(unsigned, 'botA', undefined);
        expect(collectUris(unsigned).some((u) => u.includes('&t='))).toBe(false);
    });
});
