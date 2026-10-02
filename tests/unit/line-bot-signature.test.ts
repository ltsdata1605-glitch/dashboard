import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyLineSignature, computeLineSignature } from '../../functions/src/lineSignature';

/** Webhook LINE phải từ chối sự kiện không có/ sai chữ ký x-line-signature (functions/src/lineBotWebhook.ts). */
describe('kiểm chữ ký webhook LINE', () => {
    const secret = 'abc123secret';
    const body = '{"destination":"Uxxx","events":[{"type":"message","message":{"type":"text","text":"Mã: ABC – tiếng Việt"}}]}';
    const sig = createHmac('sha256', secret).update(body).digest('base64');

    it('khớp với cách LINE ký (base64 HMAC-SHA256 trên thân thô)', () => {
        expect(computeLineSignature(body, secret)).toBe(sig);
        expect(verifyLineSignature(Buffer.from(body), sig, secret)).toBe(true);
    });
    it('thân bị sửa 1 ký tự → từ chối', () => {
        expect(verifyLineSignature(body.replace('ABC', 'ABD'), sig, secret)).toBe(false);
    });
    it('sai secret → từ chối', () => {
        expect(verifyLineSignature(body, sig, 'secret-khac')).toBe(false);
    });
    it('thiếu chữ ký / thiếu secret / thiếu thân → từ chối (không bao giờ cho qua)', () => {
        expect(verifyLineSignature(body, undefined, secret)).toBe(false);
        expect(verifyLineSignature(body, '', secret)).toBe(false);
        expect(verifyLineSignature(body, sig, '')).toBe(false);
        expect(verifyLineSignature(undefined, sig, secret)).toBe(false);
    });
    it('chữ ký rác độ dài khác → từ chối, không ném lỗi', () => {
        expect(verifyLineSignature(body, 'x', secret)).toBe(false);
    });
});
