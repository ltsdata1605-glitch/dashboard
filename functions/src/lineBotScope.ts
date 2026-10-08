import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin';

/** Tách chuỗi Mã Kho ("910, 911" / "ALL (Super Admin),910") — cùng cách firestore.rules myKhos()/botKhos(). */
export function splitKhos(raw: unknown): string[] {
  return typeof raw === 'string' ? raw.replace(/\s+/g, '').split(',').filter(Boolean) : [];
}

/**
 * Tìm "Bot Kho" để Quản lý cùng Mã Kho dùng chung (features/line-bot/hooks/useBotScope.ts).
 *
 * Trước đây client tự quét MỌI bot đang hoạt động (kèm Channel Access Token / Secret) rồi so Kho ở
 * máy — rules phải cho mọi manager đọc mọi bot (audit 2026-10-07, S13). Nay quét ở server và chỉ trả
 * thông tin hiển thị, không trả bí mật; truy cập bot sau đó do firestore.rules (canUseBot) kiểm theo Kho.
 */
export const lineBotFindWarehouseBot = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const role = request.auth.token.role;
  if (role !== 'admin' && role !== 'manager') {
    throw new HttpsError('permission-denied', 'Chỉ Quản lý được dùng Bot Kho.');
  }
  const myKhos = splitKhos(request.auth.token.departmentId);
  const requested = splitKhos((request.data as { departmentId?: string } | undefined)?.departmentId)
    .filter((k) => k !== 'ALL(SuperAdmin)' && k !== 'ALL');
  // Chỉ tìm trong Kho của CHÍNH người gọi (theo token), không tin Kho client gửi lên.
  const wanted = role === 'admin' ? requested : requested.filter((k) => myKhos.includes(k));
  if (wanted.length === 0) return { bot: null };

  const snap = await db.collection('line_bots').where('active', '==', true).limit(200).get();
  const found = snap.docs.find((d) => {
    const data = d.data();
    if (data.isWarehouseShared === false || !(data.hasToken || data.channelAccessToken)) return false;
    return splitKhos(data.departmentId).some((k) => wanted.includes(k));
  });
  if (!found) return { bot: null };

  const data = found.data();
  return {
    bot: {
      id: found.id,
      botName: data.botName || 'BOT LINE PMH',
      botBasicId: data.botBasicId || '',
      pictureUrl: data.pictureUrl ?? null,
      departmentId: data.departmentId || wanted.join(','),
      ownerEmail: data.ownerEmail ?? null,
      ownerName: data.ownerName ?? null,
      active: data.active ?? true,
      autoApprove: data.autoApprove ?? true,
      updatedAt: data.updatedAt || new Date().toISOString(),
    },
  };
});
