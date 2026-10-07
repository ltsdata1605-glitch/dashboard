import { createHmac, timingSafeEqual } from 'crypto';

/**
 * "Vé" cho nút "Chạm để copy" trên thẻ coupon (LIFF → ?action=mark-used).
 *
 * Audit 2026-10-07 (S06): mark-used trước đây không cần bằng chứng gì — ai biết 1 mã coupon là đánh
 * dấu USED được ở MỌI bot có mã đó, kèm tên người dùng tự khai. Nay mỗi thẻ mới mang `b` (bot) và
 * `t` = HMAC(Channel Secret của bot, mã) — chỉ server giữ Channel Secret, nên chỉ người cầm đúng thẻ
 * bot đã gửi mới có vé hợp lệ, và lệnh chỉ chạm đúng bot đó.
 */
export function liffTicket(secret: string, code: string): string {
  return createHmac('sha256', secret).update(code.trim().toUpperCase()).digest('hex').slice(0, 32);
}

export function verifyLiffTicket(secret: string, code: string, ticket: string): boolean {
  if (!secret || !ticket) return false;
  const expected = Buffer.from(liffTicket(secret, code));
  const given = Buffer.from(ticket);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Thẻ gửi TRƯỚC bản vá chưa có vé — vẫn cho dùng tới mốc này (coupon xoay vòng theo tháng). */
export const LEGACY_LIFF_UNTIL = Date.parse('2026-11-15T00:00:00+07:00');

/**
 * Gắn `b`/`t` vào mọi link LIFF có `code=` trong tin nhắn Flex (đi sâu cả carousel). Không có Channel
 * Secret thì giữ nguyên link (thẻ vẫn copy được; mark-used sẽ từ chối sau mốc chuyển tiếp).
 */
export function signLiffUris<T>(messages: T, botUid: string, secret: unknown): T {
  const key = typeof secret === 'string' ? secret.trim() : '';
  if (!key || !botUid) return messages;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.uri === 'string' && obj.uri.startsWith('https://liff.line.me/')) {
      const url = new URL(obj.uri);
      const code = url.searchParams.get('code');
      if (code) {
        url.searchParams.set('b', botUid);
        url.searchParams.set('t', liffTicket(key, code));
        obj.uri = url.toString();
      }
    }
    Object.values(obj).forEach(walk);
  };
  walk(messages);
  return messages;
}
