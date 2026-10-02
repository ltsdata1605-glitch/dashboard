/**
 * Kiểm chữ ký `x-line-signature` của webhook LINE.
 *
 * LINE ký MỌI lượt gửi sự kiện: base64(HMAC-SHA256(Channel secret, thân request NGUYÊN BẢN)). Không kiểm thì ai biết
 * đường link webhook cũng giả được sự kiện (giả tin nhắn nhân viên, giả "đã dùng mã"…). Phải băm đúng BYTE thô
 * (`req.rawBody`) — băm lại JSON.stringify(req.body) sẽ lệch (khoảng trắng, thứ tự, ký tự unicode thoát).
 * https://developers.line.biz/en/reference/messaging-api/#signature-validation
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeLineSignature(rawBody: Buffer | string, channelSecret: string): string {
    return createHmac('sha256', channelSecret).update(rawBody).digest('base64');
}

/** true chỉ khi có đủ secret + chữ ký và chữ ký khớp (so sánh hằng thời gian). */
export function verifyLineSignature(
    rawBody: Buffer | string | undefined,
    signature: string | string[] | undefined,
    channelSecret: string | undefined,
): boolean {
    const secret = String(channelSecret || '').trim();
    const sig = Array.isArray(signature) ? signature[0] : signature;
    if (!secret || !sig || rawBody === undefined || rawBody === null) return false;
    const expected = Buffer.from(computeLineSignature(rawBody, secret));
    const actual = Buffer.from(String(sig).trim());
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}
