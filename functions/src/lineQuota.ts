import { runsOnDay, parseHHmm, type ScheduleLike, type VnNow } from './lineBotScheduleDue';

/**
 * Hạn mức tin LINE — ƯU TIÊN "Gửi Notify" (2026-10-15, chủ dự án yêu cầu "khắc phục triệt để, ưu tiên gửi notify").
 *
 * Đo trên log 01→15/10: 2 bot hết hạn mức tháng ngay 02/10. Tin PUSH vào nhóm tính theo SỐ THÀNH VIÊN nhóm. Thủ phạm:
 * tin xác nhận dùng coupon và báo cáo tồn kho 06:00 / tổng kết 22:00 — cả hai đã XOÁ (2026-10-20). Nay chỉ còn ước tính
 * tin các lịch Notify cần (màn Gửi Notify cảnh báo khi vượt hạn mức gói).
 */

const ngayTrongThang = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Số lượt một lịch sẽ chạy từ (ngày `tuNgay`, sau phút `tuPhut`) tới hết tháng — theo đúng luật runsOnDay của máy chủ. */
export function soLuotConLai(s: ScheduleLike, now: VnNow): number {
    if (s.active === false) return 0;
    const phut = parseHHmm(s.time);
    if (phut === null) return 0;
    const [y, m, d] = now.date.split('-').map(Number);
    let dem = 0;
    for (let ngay = d; ngay <= ngayTrongThang(y, m); ngay++) {
        const date = `${y}-${String(m).padStart(2, '0')}-${String(ngay).padStart(2, '0')}`;
        const dow = new Date(Date.UTC(y, m - 1, ngay)).getUTCDay();
        if (!runsOnDay(s, { date, dow, minutes: 0 })) continue;
        if (ngay === d && phut < now.minutes) continue; // giờ hôm nay đã qua
        dem++;
    }
    return dem;
}

export interface LichNotify extends ScheduleLike { targetType?: string; targetGroupIds?: string[] }

/** Ước tính số TIN (đã nhân số thành viên) các lịch Notify còn cần từ bây giờ tới hết tháng. */
export function uocTinhNotifyConLai(
    lich: LichNotify[], thanhVien: Record<string, number>, tatCaNhom: string[], now: VnNow,
): number {
    let tong = 0;
    for (const s of lich) {
        const nhom = s.targetType === 'SPECIFIC_GROUPS' ? (s.targetGroupIds || []) : tatCaNhom;
        const tinMoiLuot = nhom.reduce((a, g) => a + (thanhVien[g] ?? 1), 0);
        tong += soLuotConLai(s, now) * tinMoiLuot;
    }
    return tong;
}

// ── Gọi LINE (miễn phí, không tính vào hạn mức) ──────────────────────────────────────────────
export async function layHanMuc(token: string): Promise<{ limit: number | null; used: number | null }> {
    const h = { Authorization: `Bearer ${token}` };
    const [q, c] = await Promise.all([
        fetch('https://api.line.me/v2/bot/message/quota', { headers: h }).then(r => r.json()).catch(() => ({})),
        fetch('https://api.line.me/v2/bot/message/quota/consumption', { headers: h }).then(r => r.json()).catch(() => ({})),
    ]) as [{ type?: string; value?: number }, { totalUsage?: number }];
    return {
        limit: q?.type === 'limited' && typeof q.value === 'number' ? q.value : null,
        used: typeof c?.totalUsage === 'number' ? c.totalUsage : null,
    };
}

export async function demThanhVienNhom(token: string, groupId: string): Promise<number | null> {
    try {
        const r = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/members/count`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json() as { count?: number };
        return r.ok && typeof j.count === 'number' ? j.count : null;
    } catch { return null; }
}

/**
 * Ước tính tin Notify của 1 bot (đọc lịch đang bật + nhóm ở Firestore, số thành viên nhóm từ LINE — miễn phí).
 * `conLai`: từ bây giờ tới hết tháng; `caThang`: trọn tháng hiện tại. `nhomThem`: nhóm cần biết số thành viên (vd nhóm báo cáo).
 */
export async function uocTinhNotifyCuaBot(
    botRef: FirebaseFirestore.DocumentReference, token: string, now: VnNow, nhomThem: string[] = [],
): Promise<{ conLai: number; caThang: number; thanhVien: Record<string, number> }> {
    const [schedSnap, gSnap] = await Promise.all([
        botRef.collection('schedules').where('active', '==', true).get(),
        botRef.collection('groups').get(),
    ]);
    const lich = schedSnap.docs.map(d => d.data() as LichNotify);
    const tatCaNhom = gSnap.docs.filter(g => g.data()?.active !== false).map(g => String(g.data()?.groupId || g.id)).filter(Boolean);
    const canDem = new Set<string>(nhomThem.filter(Boolean));
    for (const l of lich) for (const g of (l.targetType === 'SPECIFIC_GROUPS' ? (l.targetGroupIds || []) : tatCaNhom)) canDem.add(g);
    const thanhVien: Record<string, number> = {};
    await Promise.all([...canDem].map(async g => { const n = await demThanhVienNhom(token, g); if (n !== null) thanhVien[g] = n; }));
    const dauThang = { date: now.date.slice(0, 8) + '01', dow: 0, minutes: 0 };
    return {
        conLai: uocTinhNotifyConLai(lich, thanhVien, tatCaNhom, now),
        caThang: uocTinhNotifyConLai(lich, thanhVien, tatCaNhom, dauThang),
        thanhVien,
    };
}
