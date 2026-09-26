/**
 * Firebase Cloud Function - Tiếp nhận Webhook LINE Messaging API đa người dùng
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as crypto from 'crypto';
import { db } from './firebaseAdmin';
import { FieldPath } from 'firebase-admin/firestore';
import { isRelistUnusedCommand, getVnMonthStartIso, selectUnusedThisMonth } from './relistUnused';
import { formatShortUserName } from './userName';
import { isStrictPmhRequestForm } from './pmhForm';
import { extractBareCouponCode, buildCouponStatusReply } from './couponLookup';
import { getGroupFeatures, type GroupFeatures, type GroupFeatureKey } from './groupFeatureHelper';
import { allocatePmhSequence, formatPmhLabel, buildCouponUsedText, couponKind } from './pmhSequence';

const DEFAULT_REGION = 'asia-southeast1';

interface LineEvent {
    type: string;
    mode?: string;
    timestamp?: number;
    source?: {
        type: string;
        userId?: string;
        groupId?: string;
        roomId?: string;
    };
    replyToken?: string;
    message?: {
        id: string;
        type: string;
        text?: string;
        quoteToken?: string;
    };
}

/**
 * Lấy thông tin hiển thị của thành viên từ LINE API (để tag tên)
 */
async function getLineUserProfile(token: string, userId: string, groupId?: string): Promise<{ displayName: string; pictureUrl?: string; statusMessage?: string } | null> {
    if (!token || !userId) return null;
    try {
        const url = groupId
            ? `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`
            : `https://api.line.me/v2/bot/profile/${userId}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
        }).finally(() => clearTimeout(timer));

        if (!res.ok) return null;
        const data = await res.json() as any;
        return data && typeof data.displayName === 'string'
            ? { displayName: data.displayName, pictureUrl: data.pictureUrl, statusMessage: data.statusMessage }
            : null;
    } catch {
        return null;
    }
}

/**
 * Gửi tin nhắn trả lời (reply) qua LINE Messaging API có fallback tự động
 * Nếu gửi kèm mention bị lỗi (hết lượt miễn phí tag hoặc lỗi cú pháp tag), tự động gửi lại tin nhắn chỉ dùng quoteToken (trích dẫn)
 */
/**
 * Kết quả gửi kèm `sentMessages` (id + quoteToken của từng tin đã gửi) — cần để bot TRÍCH DẪN lại
 * đúng thẻ coupon khi người dùng bấm "Chạm để copy" (xem action mark-used). Thẻ Flex có quoteToken
 * (khi trích dẫn LINE hiển thị altText), tài liệu: developers.line.biz/en/docs/messaging-api/get-quote-tokens/
 */
interface LineSentMessage { id: string; quoteToken?: string }
interface LineSendResult { ok: boolean; sentMessages: LineSentMessage[] }

async function readSentMessages(res: Response): Promise<LineSentMessage[]> {
    try {
        const data = await res.json() as any;
        return Array.isArray(data?.sentMessages) ? data.sentMessages : [];
    } catch {
        return [];
    }
}

async function replyLineMessage(token: string, replyToken: string, messages: any[]): Promise<boolean> {
    return (await replyLineMessageDetailed(token, replyToken, messages)).ok;
}

async function replyLineMessageDetailed(token: string, replyToken: string, messages: any[]): Promise<LineSendResult> {
    const fail: LineSendResult = { ok: false, sentMessages: [] };
    if (!token || !replyToken || !messages || messages.length === 0) return fail;
    try {
        // Sanitize messages: LINE Messaging API chỉ cho phép quoteToken trên text, image, video, audio, location, sticker.
        // Tuyệt đối không cho phép quoteToken trên tin nhắn 'flex' (sẽ gây lỗi HTTP 400).
        const sanitized = messages.map(m => {
            const copy = { ...m };
            if (copy.type === 'flex' || copy.type !== 'text' || !copy.quoteToken) {
                delete copy.quoteToken;
            }
            return copy;
        });

        const res = await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ replyToken, messages: sanitized })
        });

        console.info(`[LINE Reply] Sent ${sanitized.length} msg(s). Status: ${res.status}`);

        if (res.ok) return { ok: true, sentMessages: await readSentMessages(res) };

        {
            const errData = await res.json().catch(() => ({}));
            console.warn('[LINE Reply Error]', res.status, errData);

            // Fallback 1: Nếu gửi Flex Message bị lỗi (ví dụ phiên bản LINE cũ hoặc cấu trúc bị từ chối), tự động fallback sang text
            const hasFlex = sanitized.some(m => m.type === 'flex');
            if (hasFlex) {
                console.info('[LINE Reply Fallback] Retrying with text fallback for flex messages...');
                const textFallbackMsgs = sanitized.map(m => {
                    if (m.type === 'flex') {
                        return {
                            type: 'text',
                            text: m.altText || '🎁 Bạn đã nhận được mã PMH.'
                        };
                    }
                    const copy = { ...m };
                    delete copy.mention;
                    return copy;
                });
                const retryRes = await fetch('https://api.line.me/v2/bot/message/reply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ replyToken, messages: textFallbackMsgs })
                });
                if (retryRes.ok) return { ok: true, sentMessages: await readSentMessages(retryRes) };
            }

            // Fallback 2: Kiểm tra xem có tin nhắn nào chứa mention không
            const hasMention = sanitized.some(m => m.mention);
            if (hasMention) {
                // Fallback: Nếu hết lượt miễn phí tag hoặc lỗi mention, gửi lại chỉ dùng quoteToken (trả lời trích dẫn)
                const fallbackMsgs = sanitized.map(m => {
                    const copy = { ...m };
                    delete copy.mention;
                    return copy;
                });
                const retryRes = await fetch('https://api.line.me/v2/bot/message/reply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ replyToken, messages: fallbackMsgs })
                });
                return retryRes.ok ? { ok: true, sentMessages: await readSentMessages(retryRes) } : fail;
            }
            return fail;
        }
    } catch (e) {
        console.error('[LINE Reply Error]', e);
        return fail;
    }
}

/**
 * Bot chủ động gửi (push) vào 1 chat. Dùng cho tin xác nhận trích dẫn thẻ coupon — không có replyToken
 * vì người dùng bấm từ LIFF chứ không nhắn gì. ⚠️ Push TÍNH VÀO hạn mức tin nhắn tháng của OA
 * (reply thì miễn phí); hết hạn mức LINE trả 429 → trả ok=false để LIFF tự gửi thay như trước.
 * Nếu quoteToken bị từ chối (400, vd thẻ đã bị thu hồi) thì gửi lại không trích dẫn.
 */
async function pushLineMessage(token: string, to: string, messages: any[]): Promise<{ ok: boolean; status: number; error?: string }> {
    if (!token || !to || !messages || messages.length === 0) return { ok: false, status: 0, error: 'missing-params' };
    const send = async (msgs: any[]) => fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, messages: msgs })
    });
    try {
        const sanitized = messages.map(m => {
            const copy = { ...m };
            if (copy.type !== 'text' || !copy.quoteToken) delete copy.quoteToken;
            return copy;
        });
        let res = await send(sanitized);
        if (res.ok) return { ok: true, status: res.status };
        const errData = await res.json().catch(() => ({})) as any;
        console.warn('[LINE Push Error]', res.status, errData);
        if (res.status === 400 && sanitized.some(m => m.quoteToken)) {
            res = await send(sanitized.map(m => { const c = { ...m }; delete c.quoteToken; return c; }));
            if (res.ok) return { ok: true, status: res.status };
        }
        return { ok: false, status: res.status, error: errData?.message || `HTTP ${res.status}` };
    } catch (e: any) {
        console.error('[LINE Push Error]', e);
        return { ok: false, status: 0, error: e?.message || 'network' };
    }
}

/**
 * Tạo LINE Flex Message Card cấp mã coupon
 * Tích hợp action: 'clipboard' - người dùng chạm vào khung mã hoặc nút bấm sẽ tự động copy mã coupon
 */
function createCouponFlexBubble(params: {
    displayName: string;
    productName: string;
    categoryLabel: string;
    code: string;
    orderId?: string;
    warehouse?: string;
    warningSuffix?: string;
    liffId?: string;
    cardIndex?: number;
    totalCards?: number;
    /** Thẻ đến từ đâu (chủ dự án chốt 2026-09-21): 'filter' = lọc danh sách PMH dán vào nhóm → tiêu đề
     *  "LỌC PMH {loại}"; 'stock' = cấp mã từ kho theo form xin PMH → tiêu đề "MÃ COUPON {loại}". */
    source?: 'filter' | 'stock';
}) {
    const cleanCode = String(params.code || '').trim();
    const isEvent = params.categoryLabel.toLowerCase().includes('event');
    const headerColor = isEvent ? '#06C755' : '#0284C7';
    const headerTitle = params.source === 'stock'
        ? `🎁 MÃ COUPON ${params.categoryLabel.toUpperCase()}`
        : `🎁 LỌC PMH ${params.categoryLabel.toUpperCase()}`;
    const cleanName = (params.displayName || 'Quản lý').replace(/^[@👤\s]+/, '').trim();
    const cardIndexNum = params.cardIndex || 1;

    const bodyContents: any[] = [
        {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'text',
                    // Bỏ nhãn "Đã cấp" bên phải (chủ dự án 2026-09-26): thẻ nào gửi ra cũng là đã
                    // cấp nên chữ này không mang thông tin, chỉ chiếm chỗ của tên người nhận —
                    // tên đang bị cắt "…" trên điện thoại. Bỏ đi thì tên chiếm trọn bề ngang.
                    text: `@${cleanName}`,
                    weight: 'bold',
                    size: 'xs',
                    color: '#0284C7',
                    wrap: true
                }
            ]
        },
        {
            type: 'box',
            layout: 'vertical',
            margin: 'xs',
            backgroundColor: '#F8FAFC',
            cornerRadius: 'md',
            paddingAll: '7px',
            contents: [
                {
                    type: 'text',
                    text: `🛍️ ${params.productName}`,
                    size: 'xs',
                    color: '#1E293B',
                    weight: 'bold',
                    wrap: true
                },
                ...(params.orderId ? [{
                    type: 'box',
                    layout: 'baseline',
                    margin: 'xs',
                    spacing: 'sm',
                    contents: [
                        { type: 'text', text: 'MĐH Áp dụng:', color: '#64748B', size: 'xxs', flex: 4 },
                        { type: 'text', text: params.orderId, color: '#0F172A', size: 'xs', weight: 'bold', flex: 6 }
                    ]
                }] : []),
                ...(params.warehouse ? [{
                    type: 'box',
                    layout: 'baseline',
                    margin: 'xxs',
                    spacing: 'sm',
                    contents: [
                        { type: 'text', text: 'Kho hàng:', color: '#64748B', size: 'xxs', flex: 4 },
                        { type: 'text', text: String(params.warehouse), color: '#0F172A', size: 'xs', weight: 'bold', flex: 6 }
                    ]
                }] : [])
            ]
        },
        // Nút "Chạm để copy" nền xanh đặc, KHÔNG hiện mã trên thẻ (chủ dự án chốt 2026-09-21) —
        // mã chỉ đi qua tham số LIFF; người dùng chạm là copy + bot xác nhận.
        {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            backgroundColor: '#06C755',
            cornerRadius: 'lg',
            paddingTop: '10px',
            paddingBottom: '10px',
            paddingStart: '12px',
            paddingEnd: '12px',
            action: {
                type: 'uri',
                label: 'Chạm để copy',
                uri: `https://liff.line.me/${params.liffId || '2011679071-BclvutpD'}?code=${encodeURIComponent(cleanCode)}&type=${encodeURIComponent(params.categoryLabel)}&index=${cardIndexNum}&reqBy=${encodeURIComponent(cleanName)}&prod=${encodeURIComponent(params.productName || '')}`
            },
            contents: [
                {
                    type: 'text',
                    text: '➜ Chạm để copy',
                    weight: 'bold',
                    size: 'md',
                    color: '#FFFFFF',
                    align: 'center'
                }
            ]
        },

        ...(params.warningSuffix ? [{
            type: 'text',
            text: params.warningSuffix.trim(),
            size: 'xxs',
            color: '#D97706',
            wrap: true,
            margin: 'xs'
        }] : [])
    ];

    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: headerColor,
            paddingAll: '10px',
            alignItems: 'center',
            contents: [
                {
                    type: 'text',
                    text: headerTitle,
                    color: '#FFFFFF',
                    weight: 'bold',
                    size: 'sm',
                    flex: 1
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#FFFFFF',
                    cornerRadius: 'md',
                    paddingStart: '8px',
                    paddingEnd: '8px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    flex: 0,
                    contents: [
                        {
                            type: 'text',
                            text: `PMH ${formatPmhLabel(cardIndexNum)}`,
                            color: headerColor,
                            weight: 'bold',
                            size: 'xxs'
                        }
                    ]
                }
            ]
        },
        body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '12px',
            contents: bodyContents
        }
    };
}

function createCouponFlexMessage(params: {
    displayName: string;
    productName: string;
    categoryLabel: string;
    code: string;
    orderId?: string;
    warehouse?: string;
    warningSuffix?: string;
    liffId?: string;
    cardIndex?: number;
    totalCards?: number;
}) {
    // Chỉ các luồng CẤP MÃ TỪ KHO (duyệt form xin PMH / lệnh DUYỆT / tự cấp) gọi hàm này.
    const bubble = createCouponFlexBubble({ ...params, source: 'stock' });
    return {
        type: 'flex',
        altText: `🎁 MÃ COUPON ${params.categoryLabel.toUpperCase()} - ${params.productName}`,
        contents: bubble
    };
}

/**
 * Tạo danh sách LINE Flex Messages dạng Thẻ (Bubble hoặc Carousel) cho các mã PMH lọc được
 */
function createFilteredPmhFlexMessages(matchedItems: Array<{
    recipient: string;
    productName: string;
    categoryLabel: string;
    code: string;
    orderId?: string;
    warningSuffix?: string;
    /** Số thứ tự chạy theo tháng (pmhSequence). Thiếu -> rơi về vị trí trong lô như trước. */
    cardIndex?: number;
}>, liffId?: string): any[] {
    if (!matchedItems || matchedItems.length === 0) return [];

    const bubbles = matchedItems.map((item, idx) => createCouponFlexBubble({
        displayName: item.recipient,
        productName: item.productName,
        categoryLabel: item.categoryLabel,
        code: item.code,
        orderId: item.orderId,
        warningSuffix: item.warningSuffix,
        liffId,
        cardIndex: item.cardIndex || idx + 1,
        totalCards: matchedItems.length,
        source: 'filter'
    }));

    const messages: any[] = [];
    const chunkSize = 10;
    for (let i = 0; i < bubbles.length; i += chunkSize) {
        const chunk = bubbles.slice(i, i + chunkSize);
        if (chunk.length === 1 && bubbles.length === 1) {
            messages.push({
                type: 'flex',
                altText: `🎁 LỌC PMH ${matchedItems[0].categoryLabel.toUpperCase()} - ${matchedItems[0].recipient}`,
                contents: chunk[0]
            });
        } else {
            const pageInfo = bubbles.length > chunkSize ? ` (${Math.floor(i / chunkSize) + 1}/${Math.ceil(bubbles.length / chunkSize)})` : '';
            messages.push({
                type: 'flex',
                altText: `🎁 Danh sách mã PMH lọc được${pageInfo}`,
                contents: {
                    type: 'carousel',
                    contents: chunk
                }
            });
        }
    }
    return messages.slice(0, 5);
}

/**
 * Format tin nhắn cho lệnh "cp" (Danh sách cú pháp đăng ký của tất cả sản phẩm)
 */
function formatSyntaxListMessage(
    coupons: Array<{ productName?: string; syntax?: string; type?: string; status?: string }>,
    fallbackSyntax?: string
): string {
    const productMap = new Map<string, { productName: string; syntax: string }>();

    for (const c of coupons) {
        const prodName = (c.productName || c.type || '').trim();
        if (!prodName) continue;
        const syntax = (c.syntax || '').trim();

        const existing = productMap.get(prodName);
        if (!existing) {
            productMap.set(prodName, {
                productName: prodName,
                syntax: syntax || `📝 FORM MẪU LẤY PMH\nLoại PMH: ${prodName}\nMĐH Áp dụng: 12345678`
            });
        } else if (!existing.syntax && syntax) {
            existing.syntax = syntax;
        }
    }

    if (productMap.size === 0) {
        const defaultSyntax = fallbackSyntax || `📝 FORM MẪU LẤY PMH\nLoại PMH: Bếp gas đôi Sunhouse SHB3105MD\nMĐH Áp dụng: 12345678`;
        return `📋 MẪU CÚ PHÁP ĐĂNG KÝ PMH:\n\n${defaultSyntax}\n\n(Hiện kho chưa có mã sản phẩm cụ thể. Quản lý hãy nạp mã vào Dashboard!)`;
    }

    let text = '📋 DANH SÁCH CÚ PHÁP ĐĂNG KÝ PMH\n━━━━━━━━━━━━━━━━━━━━━\n';
    let idx = 1;
    for (const item of productMap.values()) {
        text += `${idx}. 🛍️ ${item.productName}\n   ➜ Cú pháp:\n${item.syntax}\n\n`;
        idx++;
    }
    text += '━━━━━━━━━━━━━━━━━━━━━\n';
    text += '💡 Sao chép cú pháp sản phẩm tương ứng và gửi kèm thông tin để xin mã!\n';
    text += '👉 Gõ "tk" để kiểm tra số lượng tồn kho từng sản phẩm.';
    return text.trim();
}

/**
 * Kiểm tra xem tin nhắn có phải là lệnh yêu cầu hướng dẫn (hd / help / huong dan...) không
 */
function isHelpCommand(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim().toLowerCase().replace(/^@[^\s]+\s*/, '');
    return /^(?:[./!]?(?:hd|help|huongdan|hướng dẫn|\?)|huong\s*dan|hdsd)$/i.test(clean);
}

/**
 * Tạo nội dung tin nhắn hướng dẫn sử dụng bot toàn diện cho lệnh "hd"
 */
function formatHelpGuideMessage(): string {
    return [
        '📖 HƯỚNG DẪN SỬ DỤNG BOT PMH ICT',
        '━━━━━━━━━━━━━━━━━━━━━',
        '📊 1. XEM TỒN KHO:',
        '• "tk" hoặc "tk event" (tk e): Tồn kho PMH Event',
        '• "tk gvgs" (tk gv): Tồn kho PMH Giờ Vàng',
        '',
        '⚡ 2. XIN NHẬN MÃ:',
        '• Chọn trực tiếp vào sản phẩm cần lấy Coupon',
        '💡 Gõ "tk" để xem danh sách & chạm lấy mã nhanh.',
        '',
        '🔄 3. HỦY / TRẢ MÃ VỀ KHO:',
        '• Soạn: "huy [Mã coupon]"',
        '',
        '🎯 4. LỌC MÃ RIÊNG (CHAT 1-1):',
        '• Chuyển tiếp tin nhắn gộp cho BOT để tự lọc mã tên bạn.',
        '• "csd": Hiện lại mọi thẻ đã lọc nhưng CHƯA sử dụng trong tháng.',
        '• Dán 1 mã coupon vào chat: BOT báo mã đã được ai dùng lúc nào / chưa dùng.'
    ].join('\n');
}

/**
 * Nhận diện lệnh huỷ/trả mã coupon vừa xin (nếu không dùng)
 * Cú pháp: huy [mã coupon hoặc MĐH]
 */
function parseCancelCouponCommand(text: string): { isCancel: boolean; target?: string; isBareCancel?: boolean } {
    if (!text || typeof text !== 'string') return { isCancel: false };
    const clean = text.trim().normalize('NFC').replace(/^@[^\s]+\s*/, '');
    const match = clean.match(/^(?:[./!]?(?:huỷ\s*mã|hủy\s*mã|huy\s*mã|huy\s*ma|tra\s*mã|tra\s*ma|revoke|cancel|huỷ|hủy|huy|tra|trả))\s*[:\-]?\s*([A-Za-z0-9_-]{4,40})$/i);
    if (match && match[1]) {
        return { isCancel: true, target: match[1].trim().toUpperCase() };
    }
    const bareMatch = clean.match(/^(?:[./!]?(?:huỷ\s*mã|hủy\s*mã|huy\s*mã|huy\s*ma|tra\s*mã|tra\s*ma|revoke|cancel|huỷ|hủy|huy|tra|trả))$/i);
    if (bareMatch) {
        return { isCancel: true, isBareCancel: true };
    }
    return { isCancel: false };
}

/**
 * Lấy chuỗi ngày hôm nay theo múi giờ Việt Nam (Asia/Ho_Chi_Minh) dạng 'YYYY-MM-DD'
 */
export function getVietnamTodayString(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

/**
 * Định dạng YYYY-MM-DD sang DD/MM/YYYY
 */
function formatDisplayDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

/**
 * Tự động quét và xoá các mã coupon UNUSED đã quá ngày hết hạn khỏi kho
 * Đồng thời lưu vết thông tin sản phẩm hết hạn vào 'expired_products'
 */
async function cleanupExpiredCoupons(uid: string): Promise<{ deleted: number; products: string[] }> {
    if (!uid) return { deleted: 0, products: [] };
    try {
        const todayVN = getVietnamTodayString();
        const colRef = db.collection('line_bots').doc(uid).collection('coupons');
        const snap = await colRef.where('status', '==', 'UNUSED').get();
        if (snap.empty) return { deleted: 0, products: [] };

        const expiredDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
        const productMap = new Map<string, { productName: string; syntax?: string; type?: string; expiryDate: string; count: number }>();

        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.expiryDate && data.expiryDate < todayVN) {
                expiredDocs.push(doc);
                const pName = (data.productName || data.type || 'PMH').trim();
                const key = pName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'pmh';
                const existing = productMap.get(key);
                if (!existing) {
                    productMap.set(key, {
                        productName: pName,
                        syntax: data.syntax || '',
                        type: data.type || '',
                        expiryDate: data.expiryDate,
                        count: 1
                    });
                } else {
                    existing.count++;
                    if (data.expiryDate > existing.expiryDate) {
                        existing.expiryDate = data.expiryDate;
                    }
                }
            }
        }

        if (expiredDocs.length === 0) return { deleted: 0, products: [] };

        // Xoá các document coupon hết hạn khỏi kho UNUSED
        const batchSize = 450;
        const now = new Date().toISOString();
        for (let i = 0; i < expiredDocs.length; i += batchSize) {
            const chunk = expiredDocs.slice(i, i + batchSize);
            const batch = db.batch();
            for (const d of chunk) {
                batch.delete(d.ref);
            }
            await batch.commit();
        }

        // Lưu thông tin vào expired_products để Bot nhận diện và báo hết hạn
        for (const [key, item] of productMap.entries()) {
            await db.collection('line_bots').doc(uid).collection('expired_products').doc(key).set({
                id: key,
                productName: item.productName,
                syntax: item.syntax || '',
                type: item.type || '',
                expiryDate: item.expiryDate,
                expiredAt: now,
                count: item.count
            }, { merge: true });
        }

        return { deleted: expiredDocs.length, products: Array.from(productMap.values()).map(p => p.productName) };
    } catch (e) {
        console.error('[cleanupExpiredCoupons error]', e);
        return { deleted: 0, products: [] };
    }
}

/**
 * Tìm kiếm xem sản phẩm có trong danh sách đã hết hạn hay không
 */
async function findExpiredProduct(uid: string, searchKey: string): Promise<{ productName: string; expiryDate: string } | null> {
    if (!uid || !searchKey) return null;
    try {
        const cleanKey = searchKey.trim().toLowerCase();
        if (!cleanKey) return null;

        const snap = await db.collection('line_bots').doc(uid).collection('expired_products').get();
        if (snap.empty) return null;

        for (const d of snap.docs) {
            const data = d.data();
            const pName = (data.productName || '').toLowerCase();
            const syn = (data.syntax || '').toLowerCase();
            if (pName.includes(cleanKey) || cleanKey.includes(pName) || (syn && (syn.includes(cleanKey) || cleanKey.includes(syn)))) {
                return {
                    productName: data.productName || searchKey,
                    expiryDate: data.expiryDate || ''
                };
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Kiểm tra xem một coupon có khớp với từ khoá tìm kiếm / tên sản phẩm / cú pháp không
 */
function matchesProductSearch(
    coupon: { productName?: string; syntax?: string; type?: string },
    searchKey: string
): boolean {
    if (!searchKey || !coupon) return false;
    const key = searchKey.trim().toLowerCase();
    if (!key) return false;
    const cleanKey = key.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');

    const pName = (coupon.productName || '').trim().toLowerCase();
    const syn = (coupon.syntax || '').trim().toLowerCase();
    const type = (coupon.type || '').trim().toLowerCase();

    // 1. Khớp chính xác cú pháp / model
    if (syn) {
        const cleanSyn = syn.replace(/[^a-z0-9]/g, '');
        if (syn === key || (cleanKey.length >= 3 && cleanSyn === cleanKey)) return true;
        if (key.includes(syn) && syn.length >= 3) return true;
    }

    // 2. Khớp theo tên sản phẩm
    if (pName) {
        if (pName === key) return true;
        if (pName.includes(key)) return true;
        if (key.length >= 5 && key.includes(pName)) return true;

        // Trích xuất mã model trong tên sản phẩm để so sánh
        const modelMatch = pName.match(/\b([A-Z0-9-]{4,20})\b/i);
        if (modelMatch && modelMatch[1]) {
            const m = modelMatch[1].toLowerCase();
            if (m === key || key.includes(m)) return true;
        }
    }

    // 3. Khớp theo nhóm Event / Giờ Vàng
    if (key === 'event' || key === 'pmh event') {
        return type.includes('event');
    }
    if (key === 'giờ vàng' || key === 'gio vang' || key === 'gvgs' || key === 'gv' || key === 'giờ vàng giá sốc') {
        return !type.includes('event') && (type.includes('giờ vàng') || type.includes('gvgs'));
    }

    return false;
}

interface ProductInventoryItem {
    index: number;
    productName: string;
    total: number;
    unused: number;
}

type CouponCategory = 'EVENT' | 'GVGS' | 'ALL';

function isEventCategory(type?: string): boolean {
    if (!type) return true;
    const t = type.toLowerCase().trim();
    if (isGvgsCategory(t)) return false;
    return true;
}

function isGvgsCategory(type?: string): boolean {
    if (!type) return false;
    const t = type.toLowerCase().trim();
    return t.includes('giờ vàng') || t.includes('gio vang') || t.includes('gvgs') || t === 'gv' || t.startsWith('gv');
}

function filterCouponsByCategory(
    coupons: Array<{ productName?: string; syntax?: string; type?: string; status?: string }>,
    category?: CouponCategory
) {
    if (!category || category === 'ALL') return coupons;
    if (category === 'EVENT') {
        return coupons.filter(c => isEventCategory(c.type));
    }
    if (category === 'GVGS') {
        return coupons.filter(c => isGvgsCategory(c.type));
    }
    return coupons;
}

/**
 * Kiểm tra trạng thái hết hạn và số lượng khả dụng của toàn bộ nhóm coupon (EVENT hoặc GVGS)
 */
async function getCategoryExpiryInfo(
    uid: string,
    coupons: Array<{ productName?: string; syntax?: string; type?: string; status?: string; expiryDate?: string }>,
    category: 'EVENT' | 'GVGS'
): Promise<{
    isExpired: boolean;
    latestExpiryDate?: string;
    totalAll: number;
    totalUnused: number;
    hasCoupons: boolean;
}> {
    const todayVN = getVietnamTodayString();
    const isCat = category === 'EVENT' ? isEventCategory : isGvgsCategory;
    const catCoupons = (coupons || []).filter(c => isCat(c.type));

    let totalAll = catCoupons.length;
    let validUnused = 0;
    let latestExpiryDate: string | undefined;

    for (const c of catCoupons) {
        const isUnused = c.status === 'UNUSED' || !c.status;
        if (c.expiryDate) {
            if (!latestExpiryDate || c.expiryDate > latestExpiryDate) {
                latestExpiryDate = c.expiryDate;
            }
            if (isUnused && c.expiryDate >= todayVN) {
                validUnused++;
            }
        } else if (isUnused) {
            validUnused++;
        }
    }

    if (validUnused > 0) {
        return {
            isExpired: false,
            latestExpiryDate,
            totalAll,
            totalUnused: validUnused,
            hasCoupons: true
        };
    }

    // Nếu không còn mã UNUSED nào hợp lệ và ngày hết hạn mới nhất đã qua -> Nhóm đã hết hạn
    if (latestExpiryDate && latestExpiryDate < todayVN) {
        return {
            isExpired: true,
            latestExpiryDate,
            totalAll,
            totalUnused: 0,
            hasCoupons: catCoupons.length > 0
        };
    }

    // Nếu trong coupons không còn mã hoặc các mã còn lại không ghi nhận date, kiểm tra subcollection 'expired_products'
    try {
        const expSnap = await db.collection('line_bots').doc(uid).collection('expired_products').get();
        if (!expSnap.empty) {
            let expCatLatestDate: string | undefined;
            let countInExp = 0;
            for (const d of expSnap.docs) {
                const data = d.data();
                if (isCat(data.type) || (category === 'GVGS' && (data.productName?.toLowerCase().includes('giờ vàng') || data.type?.toLowerCase().includes('gv')))) {
                    countInExp++;
                    if (data.expiryDate && (!expCatLatestDate || data.expiryDate > expCatLatestDate)) {
                        expCatLatestDate = data.expiryDate;
                    }
                }
            }
            if (countInExp > 0 && expCatLatestDate && expCatLatestDate < todayVN) {
                return {
                    isExpired: true,
                    latestExpiryDate: expCatLatestDate,
                    totalAll: totalAll + countInExp,
                    totalUnused: 0,
                    hasCoupons: true
                };
            }
        }
    } catch (e) {
        console.warn('[getCategoryExpiryInfo error checking expired_products]', e);
    }

    return {
        isExpired: false,
        latestExpiryDate,
        totalAll,
        totalUnused: 0,
        hasCoupons: catCoupons.length > 0
    };
}

/**
 * Trích xuất danh sách tồn kho theo từng sản phẩm có đánh số thứ tự (1, 2, 3...)
 * Hỗ trợ lọc theo loại Event hoặc Giờ Vàng Giá Sốc
 */
function getProductInventoryList(
    coupons: Array<{ productName?: string; syntax?: string; type?: string; status?: string }>,
    category?: CouponCategory
): ProductInventoryItem[] {
    if (!coupons || coupons.length === 0) return [];

    const targetCoupons = filterCouponsByCategory(coupons, category);
    if (targetCoupons.length === 0) return [];

    const productMap = new Map<string, {
        productName: string;
        total: number;
        unused: number;
    }>();

    for (const c of targetCoupons) {
        const prodName = (c.productName || c.type || 'Sản phẩm khác').trim();
        const isUnused = c.status === 'UNUSED' || !c.status;

        const existing = productMap.get(prodName);
        if (!existing) {
            productMap.set(prodName, {
                productName: prodName,
                total: 1,
                unused: isUnused ? 1 : 0
            });
        } else {
            existing.total += 1;
            if (isUnused) existing.unused += 1;
        }
    }

    // Sắp xếp: Ưu tiên hết mã (unused === 0), rồi đến sắp hết (unused < 3), rồi đến còn nhiều
    const items = Array.from(productMap.values()).sort((a, b) => {
        const aLow = a.unused < 3 ? 1 : 0;
        const bLow = b.unused < 3 ? 1 : 0;
        if (aLow !== bLow) return bLow - aLow;
        return a.unused - b.unused;
    });

    return items.map((item, idx) => ({
        index: idx + 1,
        productName: item.productName,
        total: item.total,
        unused: item.unused
    }));
}

interface CouponClaimSelection {
    isClaim: boolean;
    isBareNumber?: boolean;
    category?: 'EVENT' | 'GVGS';
    productIndex?: number;
    orderId?: string;
}

/**
 * Nhận diện cú pháp xin nhận mã PMH:
 * - "e1", "e 2", "e2 12345678" -> Cấp mã Event số 2
 * - "gv1", "gv 2", "gv1 12345678" -> Cấp mã Giờ Vàng số 1
 * - "2", "2 12345678" -> Số trần (hệ thống nhắc gõ e2 hoặc gv2)
 */
function parseCouponClaimCommand(text: string): CouponClaimSelection {
    if (!text || typeof text !== 'string') return { isClaim: false };
    const clean = text.trim();

    // 1. Khớp lệnh nhận mã Event: "e1", "e 2", "event 1", "e1 01602SO26090873565", "e2: 12345678"
    const eventMatch = clean.match(/^(?:e|event)\s*(\d{1,3})(?:[\s:.-]+([A-Za-z0-9_-]{4,30}))?$/i);
    if (eventMatch) {
        const index = parseInt(eventMatch[1], 10);
        if (!isNaN(index) && index >= 1 && index <= 99) {
            return {
                isClaim: true,
                category: 'EVENT',
                productIndex: index,
                orderId: eventMatch[2] ? eventMatch[2].trim() : undefined
            };
        }
    }

    // 2. Khớp lệnh nhận mã Giờ Vàng: "gv1", "gv 2", "gvgs 1", "gv1 01602SO26090873565", "gv2: 12345678"
    const gvMatch = clean.match(/^(?:gv|gvgs)\s*(\d{1,3})(?:[\s:.-]+([A-Za-z0-9_-]{4,30}))?$/i);
    if (gvMatch) {
        const index = parseInt(gvMatch[1], 10);
        if (!isNaN(index) && index >= 1 && index <= 99) {
            return {
                isClaim: true,
                category: 'GVGS',
                productIndex: index,
                orderId: gvMatch[2] ? gvMatch[2].trim() : undefined
            };
        }
    }

    // 3. Số trần (ví dụ: "2", "2 12345678", "#2", "sp 2", ".2")
    const bareMatch = clean.match(/^(?:stt|sp|số|#|\.)?\s*(\d{1,3})(?:[\s:.-]+([A-Za-z0-9_-]{4,30}))?$/i);
    if (bareMatch) {
        const index = parseInt(bareMatch[1], 10);
        if (!isNaN(index) && index >= 1 && index <= 99) {
            return {
                isClaim: false,
                isBareNumber: true,
                productIndex: index,
                orderId: bareMatch[2] ? bareMatch[2].trim() : undefined
            };
        }
    }

    return { isClaim: false };
}

/**
 * Format tin nhắn cho lệnh "tk", "tk event", "tk gvgs"
 */
export function formatInventoryReportMessage(
    coupons: Array<{ productName?: string; syntax?: string; type?: string; status?: string }>,
    category?: CouponCategory
): {
    replyText: string;
    lowStockCount: number;
    totalUnused: number;
    totalAll: number;
    products: ProductInventoryItem[];
} {
    const isEvent = category === 'EVENT';
    const isGvgs = category === 'GVGS';

    const categoryTitle = isEvent
        ? 'PMH EVENT'
        : isGvgs
            ? 'PMH GIỜ VÀNG GIÁ SỐC'
            : 'THEO SẢN PHẨM';

    if (!coupons || coupons.length === 0) {
        return {
            replyText: `📊 BÁO CÁO TỒN KHO ${categoryTitle}\n━━━━━━━━━━━━━━━━━━━━━\nKho hiện tại chưa có mã nào!\nQuản lý vui lòng nạp mã vào Dashboard YCX.`,
            lowStockCount: 0,
            totalUnused: 0,
            totalAll: 0,
            products: []
        };
    }

    const products = getProductInventoryList(coupons, category);
    if (products.length === 0) {
        return {
            replyText: `📊 BÁO CÁO TỒN KHO ${categoryTitle}\n━━━━━━━━━━━━━━━━━━━━━\nHiện tại kho chưa có mã nào thuộc nhóm ${categoryTitle}.\nQuản lý vui lòng nạp mã vào Dashboard YCX!`,
            lowStockCount: 0,
            totalUnused: 0,
            totalAll: 0,
            products: []
        };
    }

    let totalAll = 0;
    let totalUnused = 0;
    for (const p of products) {
        totalAll += p.total;
        totalUnused += p.unused;
    }

    const lowStockItems = products.filter(i => i.unused < 3);
    const lowStockCount = lowStockItems.length;

    let text = `📊 BÁO CÁO TỒN KHO ${categoryTitle}\n━━━━━━━━━━━━━━━━━\n`;

    if (isEvent) {
        text += `📈 Tổng tồn kho Event: ${totalUnused} mã khả dụng / ${totalAll} tổng mã\n`;
        text += '💡 Cú pháp nhận mã Event: Gõ "e + STT" (ví dụ: e1, e2, e3...)\n';
    } else if (isGvgs) {
        text += `📈 Tổng tồn kho Giờ Vàng: ${totalUnused} mã khả dụng / ${totalAll} tổng mã\n`;
        text += '💡 Cú pháp nhận mã Giờ Vàng: Gõ "gv + STT" (ví dụ: gv1, gv2, gv3...)\n';
    } else {
        text += `📈 Tổng tồn kho: ${totalUnused} mã khả dụng / ${totalAll} tổng mã\n`;
        text += '💡 Nhận mã Event: Gõ "e + STT" (ví dụ: e1, e2...)\n';
        text += '⚡ Nhận mã Giờ Vàng: Gõ "gv + STT" (ví dụ: gv1, gv2...)\n';
        text += '👉 Xem riêng từng loại: Gõ "tk event" hoặc "tk gvgs"\n';
    }
    text += '━━━━━━━━━━━━━━━━━\n';

    if (lowStockCount > 0) {
        text += `🚨 CẢNH BÁO TỒN KHO THẤP (< 3 MÃ):\nCó [${lowStockCount}] sản phẩm sắp hết hoặc đã hết mã! Quản lý vui lòng nạp bổ sung mã mới.\n━━━━━━━━━━━━━━━━━\n`;
    }

    for (const item of products) {
        const cmdPrefix = isGvgs ? 'gv' : 'e';
        const cmdCode = `${cmdPrefix}${item.index}`;
        if (item.unused === 0) {
            text += `🔴 [${cmdCode}] ❌ ${item.productName}: HẾT MÃ (0/${item.total} mã)\n`;
        } else if (item.unused < 3) {
            text += `🟡 [${cmdCode}] ⚠️ ${item.productName}: SẮP HẾT: Còn ${item.unused}/${item.total} mã (CẦN NẠP GẤP!)\n`;
        } else {
            text += `🟢 [${cmdCode}] ${item.index}. ${item.productName}: Còn khả dụng: ${item.unused}/${item.total} mã\n`;
        }
    }

    return {
        replyText: text.trim(),
        lowStockCount,
        totalUnused,
        totalAll,
        products
    };
}

/**
 * Tạo LINE Flex Message dạng Dashboard hiển thị danh sách tồn kho PMH
 * Thiết kế hiện đại, có badge màu số lượng và cho phép chạm vào từng sản phẩm để nhận mã ngay lập tức
 */
export function createInventoryReportFlexMessage(params: {
    category: CouponCategory;
    totalAll: number;
    totalUnused: number;
    products: ProductInventoryItem[];
    altText?: string;
}) {
    const { category, totalAll, totalUnused, products } = params;
    const isEvent = category === 'EVENT';
    const isGvgs = category === 'GVGS';
    const categoryTitle = isGvgs ? 'PMH GIỜ VÀNG' : 'PMH EVENT';
    const headerColor = isGvgs ? '#D97706' : '#059669';
    const cmdPrefix = isGvgs ? 'gv' : 'e';
    const pct = totalAll > 0 ? Math.round((totalUnused / totalAll) * 100) : 0;
    const defaultAlt = `📊 Báo cáo tồn kho ${categoryTitle}: ${totalUnused}/${totalAll} mã khả dụng (${pct}%)`;
    const altText = (params.altText && params.altText.length <= 400) ? params.altText : defaultAlt;

    const PAGE_SIZE = 10;
    const totalPages = Math.min(Math.ceil(products.length / PAGE_SIZE) || 1, 10);
    const pages: ProductInventoryItem[][] = [];

    for (let i = 0; i < products.length && pages.length < 10; i += PAGE_SIZE) {
        pages.push(products.slice(i, i + PAGE_SIZE));
    }
    if (pages.length === 0) {
        pages.push([]);
    }

    const bubbles = pages.map((pageItems, pageIdx) => {
        const pageLabel = totalPages > 1 ? ` (${pageIdx + 1}/${totalPages})` : '';

        const itemBoxes = pageItems.map(item => {
            const cmdCode = `${cmdPrefix}${item.index}`;
            const isOut = item.unused === 0;
            const isLow = item.unused > 0 && item.unused < 3;
            const badgeBg = isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#ECFDF5';
            const badgeColor = isOut ? '#DC2626' : isLow ? '#D97706' : '#059669';
            const statusText = isOut ? 'HẾT MÃ' : `${item.unused}/${item.total}`;

            return {
                type: 'box',
                layout: 'horizontal',
                spacing: 'xs',
                alignItems: 'center',
                backgroundColor: isOut ? '#FEF2F2' : isLow ? '#FFFBEB' : (item.index % 2 === 0 ? '#F8FAFC' : '#FFFFFF'),
                cornerRadius: 'md',
                paddingStart: '6px',
                paddingEnd: '6px',
                paddingTop: '3px',
                paddingBottom: '3px',
                action: {
                    type: 'message',
                    label: cmdCode,
                    text: cmdCode
                },
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: badgeBg,
                        cornerRadius: 'sm',
                        paddingAll: '2px',
                        width: '32px',
                        alignItems: 'center',
                        contents: [
                            {
                                type: 'text',
                                text: cmdCode,
                                weight: 'bold',
                                size: 'xxs',
                                color: badgeColor
                            }
                        ]
                    },
                    {
                        type: 'text',
                        text: item.productName,
                        size: 'xxs',
                        color: isOut ? '#94A3B8' : '#1E293B',
                        weight: isOut ? 'regular' : 'bold',
                        flex: 7,
                        wrap: true
                    },
                    {
                        type: 'text',
                        text: statusText,
                        size: 'xxs',
                        color: badgeColor,
                        weight: 'bold',
                        align: 'end',
                        flex: 3
                    }
                ]
            };
        });

        return {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: headerColor,
                paddingAll: '10px',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'text',
                                text: `📊 TỒN KHO ${categoryTitle}${pageLabel}`,
                                color: '#FFFFFF',
                                weight: 'bold',
                                size: 'sm',
                                flex: 8
                            },
                            {
                                type: 'text',
                                text: `${pct}%`,
                                color: '#FCD34D',
                                weight: 'bold',
                                size: 'xs',
                                align: 'end',
                                flex: 2
                            }
                        ]
                    },
                    {
                        type: 'text',
                        text: `Khả dụng: ${totalUnused}/${totalAll} mã`,
                        color: '#E2E8F0',
                        size: 'xxs',
                        margin: 'xs'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '8px',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: '#F1F5F9',
                        cornerRadius: 'sm',
                        paddingAll: '4px',
                        margin: 'none',
                        contents: [
                            {
                                type: 'text',
                                text: `💡 Chạm vào sản phẩm để tự động gửi lệnh nhận mã!`,
                                size: 'xxs',
                                color: '#475569',
                                align: 'center'
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'xs',
                        margin: 'xs',
                        contents: itemBoxes.length > 0 ? itemBoxes : [
                            {
                                type: 'text',
                                text: 'Hiện không có sản phẩm nào.',
                                size: 'xs',
                                color: '#94A3B8',
                                align: 'center',
                                margin: 'md'
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                paddingAll: '8px',
                contents: [
                    {
                        type: 'button',
                        style: 'secondary',
                        height: 'sm',
                        color: '#F1F5F9',
                        action: {
                            type: 'message',
                            label: '❓ Hướng dẫn (hd)',
                            text: 'hd'
                        }
                    }
                ]
            }
        };
    });

    if (bubbles.length === 1) {
        return {
            type: 'flex',
            altText,
            contents: bubbles[0]
        };
    }

    return {
        type: 'flex',
        altText,
        contents: {
            type: 'carousel',
            contents: bubbles
        }
    };
}

/**
 * Bóc tách form đăng ký PMH
 */
function parseQuickForm(text: string) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let warehouse = '';
    let orderId = '';
    let couponType = '';
    let managerName = '';
    let requestedProduct = '';

    for (const line of lines) {
        const lower = line.toLowerCase();

        // 1. Kiểm tra header cú pháp: 📝 FORM MẪU LẤY PMH hoặc [ĐĂNG KÝ PMH] <Tên sản phẩm>
        if (
            line.startsWith('📝') ||
            line.startsWith('[') ||
            line.startsWith('==') ||
            line.startsWith('━━') ||
            lower.includes('form mẫu') ||
            lower.includes('lấy pmh')
        ) {
            const headerMatch = line.match(/^\[(?:đăng ký pmh|pmh)\]\s*(.*)$/i);
            if (headerMatch && headerMatch[1].trim()) {
                requestedProduct = headerMatch[1].trim();
            }
            continue;
        }

        // 2. Tìm mã kho (tuỳ chọn)
        if (!warehouse && (lower.includes('kho') || lower.includes('siêu thị') || lower.includes('st:'))) {
            const m = line.match(/(?:kho|siêu thị|st)[\s:.-]*([A-Za-z0-9_-]{2,10})/i);
            if (m) warehouse = m[1].trim();
        }

        // 3. Tìm mã đơn hàng (MĐH Áp dụng / MĐH / Đơn hàng)
        if (!orderId && (lower.includes('mđh') || lower.includes('mdh') || lower.includes('đơn hàng') || lower.includes('mã đh') || lower.includes('don hang') || lower.includes('áp dụng'))) {
            const m = line.match(/(?:mđh\s*(?:áp dụng)?|mdh\s*(?:ap dung)?|đơn hàng\s*(?:áp dụng)?|mã đh|áp dụng)[\s:.-]*([A-Za-z0-9_-]{4,25})/i);
            if (m) orderId = m[1].trim().toUpperCase();
        }

        // 4. Tìm loại PMH (Loại PMH / Loại / Sản phẩm / SP)
        if (!couponType && (lower.startsWith('loại') || lower.includes('loại:') || lower.includes('mệnh giá') || lower.startsWith('pmh:') || lower.startsWith('phiếu:') || lower.includes('sản phẩm') || lower.startsWith('sp:'))) {
            const m = line.match(/(?:loại\s*(?:pmh)?|mệnh giá|pmh|phiếu|sản phẩm|sp)[\s:.-]+(.+)/i);
            if (m) {
                let t = m[1].trim();
                if (/100k|100\.000/i.test(t)) t = 'PMH 100K';
                else if (/200k|200\.000/i.test(t)) t = 'PMH 200K';
                else if (/500k|500\.000/i.test(t)) t = 'PMH 500K';
                couponType = t;
            }
        }
        if (!requestedProduct && (lower.includes('sản phẩm') || lower.includes('sp:'))) {
            const m = line.match(/(?:sản phẩm|sp)[\s:.-]+(.+)/i);
            if (m) requestedProduct = m[1].trim();
        }
        if (!managerName && (lower.includes('quản lý') || lower.includes('ql') || lower.includes('người xin'))) {
            const m = line.match(/(?:quản lý|ql|người xin)[\s:.-]*(.+)/i);
            if (m) managerName = m[1].trim();
        }
    }

    if (!orderId) {
        const direct = text.match(/\b([0-9]{8,15})\b/);
        if (direct) orderId = direct[1];
    }
    if (!couponType && requestedProduct) {
        couponType = requestedProduct;
    }
    if (!requestedProduct && couponType) {
        requestedProduct = couponType;
    }

    return { warehouse, orderId, couponType, managerName, requestedProduct };
}

/**
 * Kiểm tra xem tin nhắn có phải là Báo cáo Thống kê / Tồn kho / Phân bổ PMH hay không.
 * (Để tuyệt đối không nhận diện nhầm thành form chuyển tiếp phát mã PMH).
 */
function isInventoryOrStatisticsReport(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();

    // 1. Tiêu đề hoặc cụm từ đặc trưng của bảng thống kê / tồn kho / phân bổ
    const reportKeywords = [
        'thống kê pmh',
        'thong ke pmh',
        'thống kê tồn kho',
        'thong ke ton kho',
        'pmh còn lại',
        'pmh con lai',
        'tồn kho pmh',
        'ton kho pmh',
        'báo cáo pmh',
        'bao cao pmh',
        'báo cáo tồn kho',
        'số lượng phân bổ',
        'so luong phan bo',
        'bảng thống kê',
        'bang thong ke'
    ];
    if (reportKeywords.some(kw => lower.includes(kw))) {
        return true;
    }

    // Tiêu đề thống kê kèm mốc giờ hoặc ngày (ví dụ: "THỐNG KÊ 20H00", "THỐNG KÊ 19H", "TỒN KHO 20H")
    if (/(?:thống\s*kê|báo\s*cáo|tồn\s*kho).*(?:\d{1,2}h|\bpmh\b|còn\s*lại)/i.test(text)) {
        return true;
    }

    // 2. Chứa nhiều dòng kiểm đếm số lượng phiếu (ví dụ: ": 0 Phiếu", ": 2.155 Phiếu", ": 42 Phiếu")
    const countWithUnitMatches = text.match(/:\s*(?:\d+[\.,]?\d*)\s*(?:phiếu|phieu|cái|chiếc|[❌⚠️])/gi) || [];
    if (countWithUnitMatches.length >= 2) {
        return true;
    }

    // 3. Chứa nhiều dòng định mức hạn mức theo khoảng giá và số đếm (ví dụ: "- Dưới 5 Triệu: 0", "- Từ 10 Đến 20 Triệu: 3673")
    const tierCountMatches = text.match(/(?:dưới|từ|trên)\s*\d+.*:\s*\d+/gi) || [];
    if (tierCountMatches.length >= 2) {
        return true;
    }

    return false;
}

/**
 * Kiểm tra tính hợp lệ của mã Coupon PMH thực tế
 * (Loại trừ các số đếm tồn kho như 0, 1, 3673, 2155 hoặc các chữ số lượng "0 Phiếu")
 */
function isValidCouponCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const clean = code.trim();
    // Mã coupon thực tế dài tối thiểu 5 ký tự, tối đa 40 ký tự
    if (clean.length < 5 || clean.length > 40) return false;
    // Nếu thuần là số, phải dài từ 7 chữ số trở lên (loại trừ các số đếm tồn kho như 0, 10, 186, 350, 3673)
    if (/^\d+$/.test(clean) && clean.length < 7) return false;
    // Không chứa các từ đơn vị, số lượng, hoặc trạng thái
    if (/(?:phiếu|phieu|triệu|trieu|nghìn|nghin|\btr\b|\bvnd\b|hết|het|hạn|han)/i.test(clean)) return false;
    return /^[A-Za-z0-9_-]+$/.test(clean);
}

/**
 * Tách nội dung tin nhắn chuyển tiếp thành từng khối chứa PMH
 */
function parsePmhBlocks(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

    // Nếu toàn bộ tin nhắn là báo cáo thống kê / tồn kho / phân bổ -> Bỏ qua ngay lập tức
    if (isInventoryOrStatisticsReport(text)) {
        return [];
    }

    let rawBlocks = text.split(/[━─—\-\=_~]{3,}/).map(b => b.trim()).filter(Boolean);

    const hasMultipleEntries = (text.match(/(?:➜|->|=>|►|•)\s*(?:PMH|phiếu|[❌⚠️])|^\s*[❌⚠️]/giu) || []).length > 1;
    if (rawBlocks.length <= 1 && hasMultipleEntries) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const entries: string[] = [];
        let currentEntry: string[] = [];
        let currentHasResult = false;

        for (const line of lines) {
            const isResultLine = /(?:➜|->|=>|►|•)\s*(?:PMH|phiếu|[❌⚠️])|\bPMH\s*[:\s]|^\s*[❌⚠️]/iu.test(line);

            if (currentHasResult && currentEntry.length > 0) {
                entries.push(currentEntry.join('\n'));
                currentEntry = [];
                currentHasResult = false;
            }

            currentEntry.push(line);
            if (isResultLine) {
                currentHasResult = true;
            }
        }
        if (currentEntry.length > 0) {
            entries.push(currentEntry.join('\n'));
        }
        if (entries.length > 1) {
            rawBlocks = entries;
        }
    }

    return rawBlocks.filter(block => {
        // Nếu khối là thống kê/tồn kho con -> Bỏ qua
        if (isInventoryOrStatisticsReport(block)) return false;

        // Bỏ qua nếu là hướng dẫn chuyển tiếp đơn thuần không có kết quả
        if (block.includes('Hãy chuyển tiếp tin nhắn này') && !block.includes(':') && !/[❌⚠️🚫❗⛔]/.test(block)) return false;

        // Kiểm tra xem khối có chứa kết quả cấp mã hợp lệ hay không:
        // a) Có dòng cấp mã PMH với mã coupon hợp lệ (từ 5 ký tự trở lên, không phải số đếm 0, 1, 350...)
        const lines = block.split(/\r?\n/).map(l => l.trim());
        let hasValidCode = false;
        for (const line of lines) {
            const pmhMatch = line.match(/(?:➜|->|=>|►|•)?\s*(?:pmh|phiếu)\s*([^:]*?)\s*:\s*([A-Za-z0-9_-]{4,40})/i);
            if (pmhMatch && isValidCouponCode(pmhMatch[2])) {
                hasValidCode = true;
                break;
            }
        }

        // b) Hoặc có dòng báo lỗi/từ chối của bot phát mã (ví dụ: ➜ ❌ MĐH Áp Dụng Thiếu Hoặc Sai Cú Pháp, ❌ Đơn hàng chưa duyệt...)
        const hasBotError = /(?:➜|->|=>|►|•|^\s*)\s*[❌⚠️🚫❗⛔]\s*(?:mđh|áp dụng|thiếu|sai|lỗi|hết|chưa|không|hợp lệ|thu hồi)/iu.test(block) ||
            (/(?:➜|->|=>|►|•)\s*(?:thiếu|sai|lỗi|hết hạn|không hợp lệ|đã thu hồi)/iu.test(block) && /mđh|áp dụng|cú pháp/iu.test(block));

        return hasValidCode || hasBotError;
    });
}

/**
 * Kiểm tra khối PMH có thuộc về người dùng đang lọc không
 */
function isBlockBelongToUser(block: string, candidateNames: string[]): boolean {
    if (!block || !candidateNames || candidateNames.length === 0) return false;

    // Chuẩn hoá Unicode NFC, chữ thường, chuyển mọi dạng gạch ngang (–, —, −, ‐) về '-' và chuẩn hoá khoảng trắng
    const cleanNorm = (s: string) => (s || '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizedBlock = cleanNorm(block);

    for (const name of candidateNames) {
        if (!name || name.trim().length < 2) continue;
        const normName = cleanNorm(name);
        if (normalizedBlock.includes(normName)) {
            return true;
        }
        const parts = normName.split(/\s+/).filter(p => p.length >= 2);
        if (parts.length >= 2) {
            const lastName = parts[parts.length - 1];
            if (normalizedBlock.includes(lastName) && parts.some(p => p !== lastName && normalizedBlock.includes(p))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Bóc tách chi tiết và làm gọn từng khối mã PMH
 */
function parsePmhBlockDetails(block: string): {
    recipient: string;
    typeOrProduct: string;
    code: string;
    orderId?: string;
    revokedCode?: string;
    compactBlock: string;
    allCodes?: Array<{
        typeOrProduct: string;
        code: string;
        revokedCode?: string;
        orderId?: string;
        rawLine?: string;
    }>;
} {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let recipient = '';
    let typeOrProduct = '';
    let code = '';
    let orderId = '';
    let revokedCode = '';
    let isReissue = false;

    // Tìm MĐH trên toàn khối (hỗ trợ cả trường hợp rớt dòng hoặc ngắt dòng)
    const blockMdhMatch = block.match(/(?:mđh\s*(?:áp dụng)?|mdh|đơn hàng|trùng\s*mđh)[\s:.\-\r\n]*([A-Za-z0-9_-]{6,30})/i);
    if (blockMdhMatch) {
        orderId = blockMdhMatch[1].trim();
    }

    const allCodes: Array<{
        typeOrProduct: string;
        code: string;
        revokedCode?: string;
        orderId?: string;
        rawLine?: string;
    }> = [];

    for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('thu hồi') || lower.includes('cấp lại') || lower.includes('trùng')) {
            isReissue = true;
        }

        const pmhMatch = line.match(/(?:➜|->|=>|►|•)?\s*(?:pmh|phiếu)\s*([^:]*?)\s*:\s*([A-Za-z0-9_-]{4,40})/i);
        if (pmhMatch) {
            const rawType = pmhMatch[1].trim();
            const foundCode = pmhMatch[2].trim();
            if (isValidCouponCode(foundCode)) {
                if (rawType && !typeOrProduct) typeOrProduct = rawType;
                if (!code) code = foundCode;
                allCodes.push({
                    typeOrProduct: rawType,
                    code: foundCode
                });
                continue;
            }
        }

        // 1b. Dòng thông báo lỗi hoặc trạng thái từ BOT phát mã: ➜ ❌ MĐH Áp Dụng..., ❌ ...
        const isStatusOrErrorLine = /^(?:➜|->|=>|►|•)?\s*[❌⚠️🚫❗⛔]/.test(line) ||
            (/^(?:➜|->|=>|►|•)/.test(line) && (lower.includes('thiếu') || lower.includes('sai') || lower.includes('lỗi') || lower.includes('hết') || lower.includes('không')));
        if (isStatusOrErrorLine) {
            const cleanText = line.startsWith('➜') ? line : `➜ ${line.replace(/^(?:->|=>|►|•)\s*/, '')}`;
            allCodes.push({
                typeOrProduct: 'ERROR',
                code: '',
                rawLine: cleanText
            });
            continue;
        }

        const revokeMatch = line.match(/(?:thu hồi|đã thu hồi|mã cũ)[\s:.-]*(?:mã\s*)?[:.-]*\s*["'\(]?([A-Za-z0-9_-]{4,40})["'\)]?/i);
        if (revokeMatch && !revokedCode) {
            revokedCode = revokeMatch[1].trim();
        }

        if (!typeOrProduct && (lower.includes('loại pmh') || lower.includes('loai pmh') || lower.includes('sản phẩm') || lower.startsWith('sp:'))) {
            const m = line.match(/(?:loại\s*(?:pmh)?|sản phẩm|sp)[\s:.-]+(.+)/i);
            if (m) typeOrProduct = m[1].trim();
            continue;
        }

        if (!orderId && (lower.includes('mđh') || lower.includes('mdh') || lower.includes('đơn hàng'))) {
            const m = line.match(/(?:mđh\s*(?:áp dụng)?|mdh|đơn hàng)[\s:.-]*([A-Za-z0-9_-]{4,25})/i);
            if (m) orderId = m[1].trim();
            continue;
        }

        const isSystemLine = lower.includes('pmh') || lower.includes('mđh') || lower.includes('áp dụng') ||
            lower.includes('kho') || lower.includes('loại') || lower.includes('thu hồi') ||
            lower.includes('cấp lại') || lower.includes('trùng') || lower.includes('chuyển tiếp') ||
            lower.includes('lưu ý') || lower.includes('chú ý') ||
            (orderId && line.includes(orderId)) ||
            /^[A-Za-z0-9_-]{6,30}\)?$/.test(line);

        if (!recipient && !isSystemLine) {
            recipient = line.replace(/^[@👤ℹ️🔄\s]+/, '').trim();
        }
    }

    if (!recipient) {
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (!lower.includes('thu hồi') && !lower.includes('cấp lại') && !lower.includes('pmh') && !lower.includes('mđh')) {
                recipient = line.replace(/^[@👤ℹ️🔄\s]+/, '').trim();
                break;
            }
        }
    }

    const finalRecipient = recipient || 'Quản lý';
    const finalType = typeOrProduct || 'PMH';

    if (allCodes.length === 0 && code) {
        allCodes.push({
            typeOrProduct: finalType,
            code,
            revokedCode: revokedCode || undefined,
            orderId: orderId || undefined
        });
    } else if (allCodes.length === 0) {
        const otherLines = lines.filter(l => l !== finalRecipient && !l.startsWith('---') && !l.startsWith('━━━') && (l.includes('❌') || l.includes('⚠️') || l.includes('Lưu ý') || l.includes('Chú ý') || /mđh|áp dụng/i.test(l)));
        if (otherLines.length > 0) {
            otherLines.forEach(l => {
                const cleanL = l.startsWith('➜') ? l : `➜ ${l}`;
                allCodes.push({
                    typeOrProduct: 'NOTE',
                    code: '',
                    rawLine: cleanL
                });
            });
        }
    } else {
        allCodes.forEach(c => {
            if (!c.revokedCode && revokedCode) c.revokedCode = revokedCode;
            if (!c.orderId && orderId) c.orderId = orderId;
        });
    }

    let compactBlock = '';
    if (isReissue) {
        const orderPart = orderId ? ` [MĐH: ${orderId}]` : '';
        const revokePart = revokedCode ? ` (Thu hồi: ${revokedCode})` : '';
        compactBlock = `${finalRecipient} 🔄 Cấp lại${orderPart}\n➜ PMH ${finalType} : ${code}${revokePart}`;
    } else {
        compactBlock = `${finalRecipient}\n➜ PMH ${finalType} : ${code}`;
    }

    return {
        recipient: finalRecipient,
        typeOrProduct: finalType,
        code,
        orderId: orderId || undefined,
        revokedCode: revokedCode || undefined,
        compactBlock,
        allCodes
    };
}

/**
 * Lọc các khối PMH theo tên và format kết quả trả về (Rút gọn & gôm theo người nhận)
 */
function filterPmhByUsers(text: string, candidateNames: string[], liffId?: string): {
    totalBlocks: number;
    matchedBlocks: string[];
    replyText: string;
    flexMessages?: any[];
    matchedItems?: Array<{
        recipient: string;
        productName: string;
        categoryLabel: string;
        code: string;
        orderId?: string;
        warningSuffix?: string;
    }>;
} {
    if (isInventoryOrStatisticsReport(text)) {
        return {
            totalBlocks: 0,
            matchedBlocks: [],
            replyText: ''
        };
    }

    const allBlocks = parsePmhBlocks(text);
    const cleanNames = (candidateNames || []).map(n => (n || '').trim()).filter(Boolean);

    if (cleanNames.length === 0) {
        return {
            totalBlocks: allBlocks.length,
            matchedBlocks: [],
            replyText: `💡 Bot nhận diện có ${allBlocks.length} mã PMH trong tin nhắn.\nTuy nhiên bạn chưa cấu hình tên người để lọc trên Dashboard YCX (Tab Cú pháp & Lọc)!`
        };
    }

    const matchedBlocks = allBlocks.filter(b => isBlockBelongToUser(b, cleanNames));
    const nameLabel = cleanNames.slice(0, 3).join(', ') + (cleanNames.length > 3 ? '...' : '');

    if (matchedBlocks.length === 0) {
        return {
            totalBlocks: allBlocks.length,
            matchedBlocks: [],
            replyText: `🔍 BOT KHÔNG TÌM THẤY MÃ PMH\n━━━━━━\nKhông có mã PMH nào thuộc về [${nameLabel}] trong tổng số [${allBlocks.length}] mã chuyển tiếp.\n👉 Vui lòng kiểm tra lại danh sách tên cấu hình trên Dashboard YCX!`
        };
    }

    // Gôm mã theo từng người nhận & chuẩn bị dữ liệu Thẻ Flex Card (mỗi mã 1 thẻ)
    interface RecipientGroup {
        recipient: string;
        items: string[];
    }

    const groups = new Map<string, RecipientGroup>();
    const matchedItemsForFlex: Array<{
        recipient: string;
        productName: string;
        categoryLabel: string;
        code: string;
        orderId?: string;
        warningSuffix?: string;
    }> = [];

    for (const block of matchedBlocks) {
        const details = parsePmhBlockDetails(block);
        const recipient = details.recipient || 'Quản lý';
        const key = recipient.toLowerCase().trim();

        const codesToProcess = (details.allCodes && details.allCodes.length > 0)
            ? details.allCodes
            : [{
                typeOrProduct: details.typeOrProduct,
                code: details.code,
                revokedCode: details.revokedCode,
                orderId: details.orderId
            }];

        for (const item of codesToProcess) {
            let line = '';
            if (item.rawLine) {
                line = item.rawLine;
            } else if (item.code) {
                const rawType = item.typeOrProduct ? item.typeOrProduct.trim() : '';
                const typeLabel = rawType
                    ? (rawType.toUpperCase().startsWith('PMH') ? rawType : `PMH ${rawType}`)
                    : 'PMH';

                line = `➜ ${typeLabel} : ${item.code}`;
                if (item.revokedCode) {
                    line += ` (Thu hồi: ${item.revokedCode})`;
                }

                // Chuẩn bị item cho Flex Card
                let cat = 'EVENT';
                if (/event/i.test(rawType)) cat = 'EVENT';
                else if (/gv|giờ vàng/i.test(rawType)) cat = 'GIỜ VÀNG';
                else if (rawType) cat = rawType.replace(/^pmh\s*/i, '').trim() || 'EVENT';

                let prod = rawType || 'Phiếu mua hàng PMH';
                if (!prod.toLowerCase().startsWith('pmh') && !prod.toLowerCase().startsWith('bếp') && !prod.toLowerCase().startsWith('nồi') && !prod.toLowerCase().startsWith('quạt') && !prod.toLowerCase().startsWith('tủ') && !prod.toLowerCase().startsWith('máy')) {
                    prod = `PMH ${prod}`;
                }

                matchedItemsForFlex.push({
                    recipient,
                    productName: prod,
                    categoryLabel: cat,
                    code: item.code,
                    orderId: item.orderId || details.orderId,
                    warningSuffix: item.revokedCode ? `(Thu hồi: ${item.revokedCode})` : undefined
                });
            } else {
                continue;
            }

            if (!groups.has(key)) {
                groups.set(key, {
                    recipient,
                    items: [line]
                });
            } else {
                const grp = groups.get(key)!;
                if (!grp.items.includes(line)) {
                    grp.items.push(line);
                }
            }
        }
    }

    let msg = `🎯 KẾT QUẢ LỌC PMH:\n`;
    msg += `━━━━━━\n`;

    const groupList = Array.from(groups.values());
    groupList.forEach((grp, idx) => {
        msg += `${grp.recipient}\n`;
        grp.items.forEach(item => {
            msg += `${item}\n`;
        });
        if (idx < groupList.length - 1) {
            msg += `━━━━━━\n`;
        }
    });

    msg += `━━━━━━\n`;
    msg += `💡 Sao chép mã phía trên để sử dụng!`;

    const flexMessages = createFilteredPmhFlexMessages(matchedItemsForFlex, liffId);

    return {
        totalBlocks: allBlocks.length,
        matchedBlocks,
        replyText: msg.trim(),
        flexMessages,
        matchedItems: matchedItemsForFlex
    };
}

export const lineBotWebhook = onRequest(
    { region: DEFAULT_REGION, cors: true },
    async (req, res) => {
        // GET verification
        if (req.method === 'GET') {
            res.status(200).send('LINE Bot Webhook is active!');
            return;
        }

        const action = String(req.query.action || req.body?.action || '').trim();

        // 1. Action: Xác thực token & lấy thông tin Bot (Proxy cho Frontend tránh lỗi CORS từ api.line.me)
        if (action === 'verifyToken') {
            const token = String(req.body?.token || req.query.token || '').trim();
            if (!token) {
                res.status(200).json({ success: false, error: 'Vui lòng nhập Channel Access Token' });
                return;
            }
            try {
                const lineRes = await fetch('https://api.line.me/v2/bot/info', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await lineRes.json().catch(() => ({}));
                if (!lineRes.ok) {
                    const lineMsg = (data as any)?.message || `Mã lỗi HTTP ${lineRes.status}`;
                    res.status(200).json({
                        success: false,
                        error: `Token không hợp lệ hoặc đã hết hạn: ${lineMsg}`
                    });
                    return;
                }
                res.status(200).json({ success: true, info: data });
                return;
            } catch (err: any) {
                res.status(200).json({
                    success: false,
                    error: err.message || 'Không thể kết nối đến máy chủ LINE API'
                });
                return;
            }
        }

        // 1.5. Action: Đánh dấu coupon đã sử dụng khi người dùng bấm qua LIFF
        if (action === 'mark-used' || action === 'markUsed') {
            const code = String(req.body?.code || req.query.code || '').trim().toUpperCase();
            const usedBy = String(req.body?.usedBy || req.query.usedBy || 'Người dùng LINE').trim();
            const now = new Date().toISOString();

            if (!code) {
                res.status(200).json({ success: false, error: 'Thiếu mã coupon' });
                return;
            }

            try {
                // Tốc độ là ưu tiên (LIFF đang chờ xoay): 1 truy vấn lấy bot → quét SONG SONG cả 2 collection
                // của mọi bot → cập nhật USED và push xác nhận SONG SONG → trả lời. Trước đây tuần tự từng bước.
                const botsSnap = await db.collection('line_bots').where('active', '==', true).get();
                const uids = botsSnap.empty
                    ? (await db.collection('line_bots').limit(5).get()).docs.map(d => d.id)
                    : botsSnap.docs.map(d => d.id);
                const tokenByUid = new Map<string, string>();
                botsSnap.docs.forEach(d => tokenByUid.set(d.id, String(d.data()?.channelAccessToken || '')));

                const scans = await Promise.all(uids.flatMap(bUid => [
                    db.collection('line_bots').doc(bUid).collection('filtered_coupons').where('code', '==', code).get()
                        .then(snap => ({ bUid, kind: 'filtered' as const, docs: snap.docs })),
                    db.collection('line_bots').doc(bUid).collection('coupons').where('code', '==', code).get()
                        .then(snap => ({ bUid, kind: 'stock' as const, docs: snap.docs }))
                ]));

                let wasAlreadyUsed = false;
                let previousUser = '';
                const toUpdate: FirebaseFirestore.DocumentReference[] = [];
                // Thẻ lọc đầu tiên vừa chuyển USED có đủ quoteToken + chatId → bot gửi xác nhận trích dẫn thẻ đó
                let quoteTarget: { bUid: string; chatId: string; quoteToken: string; cardIndex: number; categoryLabel?: string } | null = null;
                for (const scan of scans) {
                    for (const docItem of scan.docs) {
                        const d = docItem.data();
                        if (d.status === 'USED') {
                            wasAlreadyUsed = true;
                            if (d.usedBy && !previousUser) previousUser = d.usedBy;
                            continue;
                        }
                        toUpdate.push(docItem.ref);
                        if (scan.kind === 'filtered' && !quoteTarget && d.quoteToken && d.chatId) {
                            quoteTarget = { bUid: scan.bUid, chatId: d.chatId, quoteToken: d.quoteToken, cardIndex: Number(d.cardIndex) || Number(req.body?.index || req.query.index) || 1, categoryLabel: d.categoryLabel || d.type || '' };
                        }
                    }
                }
                const updatedCount = toUpdate.length;
                const isDuplicate = wasAlreadyUsed && updatedCount === 0;

                // Bot gửi tin xác nhận TRÍCH DẪN thẻ coupon (LIFF sendMessages không hỗ trợ quoteToken —
                // developers.line.biz/en/reference/liff/#send-messages). Thất bại (hết hạn mức push…) →
                // quotedSent=false, LIFF tự gửi tin thường thay người dùng như trước.
                const pushPromise: Promise<{ ok: boolean; status: number; error?: string } | null> = (!isDuplicate && quoteTarget)
                    ? (async () => {
                        let botToken = tokenByUid.get(quoteTarget!.bUid) || '';
                        if (!botToken) {
                            const botSnap = await db.collection('line_bots').doc(quoteTarget!.bUid).get();
                            botToken = String(botSnap.data()?.channelAccessToken || '');
                        }
                        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
                        // Tin xác nhận ghi tên gọn "Mã NV - Tên" (DMST-Nhân-107617SALE -> 107617 - Nhân); Firestore vẫn lưu usedBy đầy đủ.
                        // Nội dung theo LOẠI thẻ: "PMH 68" / "Coupon Event 68" / "Coupon GVGS 68"
                        const text = buildCouponUsedText({
                            categoryLabel: quoteTarget!.categoryLabel,
                            index: quoteTarget!.cardIndex,
                            timeStr,
                            userName: formatShortUserName(usedBy),
                        });
                        return pushLineMessage(botToken, quoteTarget!.chatId, [{ type: 'text', text, quoteToken: quoteTarget!.quoteToken }]);
                    })().catch((e: any) => ({ ok: false, status: 0, error: e?.message || 'push-failed' }))
                    : Promise.resolve(null);

                const updatePromise = updatedCount > 0
                    ? (async () => {
                        const batch = db.batch();
                        toUpdate.forEach(ref => batch.update(ref, { status: 'USED', usedBy, usedAt: now }));
                        await batch.commit();
                    })()
                    : Promise.resolve();

                const [pushed] = await Promise.all([pushPromise, updatePromise]);
                const quotedSent = Boolean(pushed?.ok);
                const quoteError = pushed && !pushed.ok ? (pushed.status === 429 ? 'quota' : pushed.error) : undefined;

                res.status(200).json({
                    success: true,
                    updatedCount,
                    alreadyUsed: isDuplicate,
                    previousUser: previousUser || undefined,
                    quotedSent,
                    quoteError
                });
                return;
            } catch (err: any) {
                res.status(200).json({ success: false, error: err.message });
                return;
            }
        }

        // 2. Action: Gửi tin nhắn kiểm tra push (Proxy cho Frontend)
        if (action === 'sendTestPush') {
            const token = String(req.body?.token || '').trim();
            const toUserId = String(req.body?.toUserId || '').trim();
            const text = String(req.body?.text || '').trim() || '🔔 Tin nhắn kiểm tra kết nối từ Dashboard YCX thành công!';
            if (!token || !toUserId) {
                res.status(200).json({ success: false, error: 'Thiếu Token hoặc LINE User ID' });
                return;
            }
            try {
                const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        to: toUserId,
                        messages: [{ type: 'text', text }]
                    })
                });
                const data = await lineRes.json().catch(() => ({}));
                if (!lineRes.ok) {
                    res.status(200).json({
                        success: false,
                        error: (data as any)?.message || `Gửi tin nhắn thất bại (mã lỗi HTTP ${lineRes.status})`
                    });
                    return;
                }
                res.status(200).json({ success: true });
                return;
            } catch (err: any) {
                res.status(200).json({ success: false, error: err.message || 'Lỗi mạng khi gửi tin nhắn test' });
                return;
            }
        }

        // 3. Action: Broadcast tin nhắn (Proxy cho Frontend)
        if (action === 'sendBroadcast') {
            const token = String(req.body?.token || '').trim();
            const text = String(req.body?.text || '').trim();
            if (!token || !text) {
                res.status(200).json({ success: false, error: 'Thiếu Token hoặc nội dung tin nhắn' });
                return;
            }
            try {
                const lineRes = await fetch('https://api.line.me/v2/bot/message/broadcast', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        messages: [{ type: 'text', text }]
                    })
                });
                const data = await lineRes.json().catch(() => ({}));
                if (!lineRes.ok) {
                    res.status(200).json({
                        success: false,
                        error: (data as any)?.message || `Lỗi phát sóng (mã lỗi HTTP ${lineRes.status})`
                    });
                    return;
                }
                res.status(200).json({ success: true });
                return;
            } catch (err: any) {
                res.status(200).json({ success: false, error: err.message });
                return;
            }
        }

        // 4. Action: Lấy thông tin profile người dùng (Proxy cho Frontend)
        if (action === 'getProfile') {
            const token = String(req.body?.token || req.query.token || '').trim();
            const targetUserId = String(req.body?.userId || req.query.userId || '').trim();
            const targetGroupId = String(req.body?.groupId || req.query.groupId || '').trim();
            if (!token || !targetUserId) {
                res.status(200).json({ success: false, error: 'Thiếu Token hoặc LINE User ID' });
                return;
            }
            try {
                const profile = await getLineUserProfile(token, targetUserId, targetGroupId || undefined);
                if (profile) {
                    res.status(200).json({ success: true, profile });
                } else {
                    res.status(200).json({ success: false, error: 'Không tìm thấy thông tin profile người dùng này' });
                }
                return;
            } catch (err: any) {
                res.status(200).json({ success: false, error: err.message });
                return;
            }
        }

        // 1. Phản hồi 200 ngay cho LINE webhook verification ping nếu events rỗng
        const events: LineEvent[] = req.body.events || [];
        if (!Array.isArray(events) || events.length === 0) {
            res.status(200).send('OK');
            return;
        }

        // 2. Tìm uid Quản lý: ưu tiên query param -> destination botUserId -> doc line_bots có sẵn
        let uid = String(req.query.uid || req.query.userId || '').trim();
        if (!uid) {
            const destination = (req.body as any)?.destination;
            if (destination) {
                const bSnap = await db.collection('line_bots').where('botUserId', '==', destination).limit(1).get();
                if (!bSnap.empty) {
                    uid = bSnap.docs[0].id;
                }
            }
            if (!uid) {
                const activeSnap = await db.collection('line_bots').where('active', '==', true).limit(1).get();
                if (!activeSnap.empty) {
                    uid = activeSnap.docs[0].id;
                } else {
                    const anySnap = await db.collection('line_bots').limit(1).get();
                    if (!anySnap.empty) {
                        uid = anySnap.docs[0].id;
                    }
                }
            }
        }

        if (!uid) {
            console.warn('[lineBotWebhook] Chưa có tài khoản Quản lý nào được thiết lập bot trong hệ thống.');
            res.status(200).send('OK');
            return;
        }

        // Lấy config của Quản lý từ Firestore
        const configDoc = await db.collection('line_bots').doc(uid).get();
        if (!configDoc.exists) {
            res.status(200).send('Manager LINE bot config not found');
            return;
        }
        const config = configDoc.data() || {};
        const token = config.channelAccessToken;
        if (!token) {
            res.status(200).send('Bot token not configured yet');
            return;
        }

        for (const event of events) {
            const senderUserId = event.source?.userId || '';
            const groupId = event.source?.groupId;
            const replyToken = event.replyToken;
            let currentGroupName = 'Nhóm LINE';

            // TỰ ĐỘNG GHI NHẬN & CẬP NHẬT NHÓM: Bất kỳ khi nào có event từ Group
            if (groupId) {
                try {
                    // Gọi LINE API lấy thông tin thật của Group nếu có token
                    const gRes = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (gRes.ok) {
                        const gData = (await gRes.json()) as any;
                        if (gData?.groupName) currentGroupName = gData.groupName;
                    }

                    await db.collection('line_bots').doc(uid).collection('groups').doc(groupId).set({
                        groupId,
                        groupName: currentGroupName,
                        active: true,
                        lastActiveAt: new Date().toISOString()
                    }, { merge: true });
                } catch (gErr) {
                    console.warn('[lineBotWebhook] Lỗi lưu group:', gErr);
                }
            }

            // TỰ ĐỘNG GHI NHẬN & CẬP NHẬT NGƯỜI DÙNG TƯƠNG TÁC (trong nhóm hoặc nhắn riêng)
            if (senderUserId && senderUserId.startsWith('U')) {
                try {
                    const uProfile = await getLineUserProfile(token, senderUserId, groupId);
                    const now = new Date().toISOString();
                    const userData: Record<string, any> = {
                        id: senderUserId,
                        lineUserId: senderUserId,
                        displayName: uProfile?.displayName || 'Thành viên LINE',
                        lastInteractionType: groupId ? 'GROUP' : 'DIRECT',
                        lastInteractedAt: now
                    };
                    if (uProfile?.pictureUrl) userData.pictureUrl = uProfile.pictureUrl;
                    if (uProfile?.statusMessage) userData.statusMessage = uProfile.statusMessage;
                    if (groupId) {
                        userData.lastGroupId = groupId;
                        userData.lastGroupName = currentGroupName;
                    }
                    if (event.message?.type === 'text') {
                        userData.lastMessage = String(event.message.text || '').slice(0, 100);
                    }
                    await db.collection('line_bots').doc(uid).collection('interacted_users').doc(senderUserId).set(userData, { merge: true });
                } catch (uErr) {
                    console.warn('[lineBotWebhook] Lỗi lưu interacted_user:', uErr);
                }
            }

            // Xử lý khi được thêm vào nhóm (join event) - Không gửi thông báo chào mừng để tránh làm phiền nhóm
            if (event.type === 'join') {
                console.info(`[lineBotWebhook] Bot joined group ${groupId || 'unknown'} (${currentGroupName}) - silent join.`);
                continue;
            }


            // Xử lý tin nhắn văn bản
            if (event.type === 'message' && event.message?.type === 'text' && replyToken) {
                const rawText = (event.message.text || '').trim();
                // Bỏ tiền tố @mention tên bot nếu có (ví dụ: "@Bot cp" -> "cp", "@DM_Tây Nam Bộ tk" -> "tk")
                const cleanText = rawText.replace(/^@[^\s]+\s*/, '').trim();
                const lower = cleanText.toLowerCase();

                console.info(`[lineBotWebhook] Received message "${cleanText}" from ${groupId ? 'GROUP:' + groupId : 'DIRECT:' + senderUserId}`);

                // Giới hạn tính năng theo nhóm (tab "Giới Hạn Tính Năng" trên Dashboard). Đọc 1 lần
                // cho cả tin nhắn này (có cache 60s trong groupFeatureHelper) rồi chặn đúng nhánh.
                // Chat 1-1 không bị giới hạn. Trước 2026-09-22 cấu hình này KHÔNG có tác dụng gì.
                const groupFeatures: GroupFeatures | null = groupId ? await getGroupFeatures(uid, groupId) : null;
                const allow = (key: GroupFeatureKey) => !groupFeatures || groupFeatures[key] !== false;
                const denyLog = (key: GroupFeatureKey, what: string) => {
                    console.info(`[Giới hạn tính năng] Nhóm ${groupId} đã TẮT "${key}" — bỏ qua ${what}.`);
                };

                // 1. Kiểm tra lệnh hỏi ID (id, lineid, groupid)
                if (lower === 'id' || lower === 'admin' || lower === 'lineid' || lower === 'groupid' || lower === '.id' || lower === '/id' || lower === '!id') {
                    if (groupId) {
                        const gDoc = await db.collection('line_bots').doc(uid).collection('groups').doc(groupId).get();
                        const gName = gDoc.exists ? (gDoc.data()?.groupName || 'Nhóm LINE') : 'Nhóm LINE';

                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `👥 THÔNG TIN NHÓM LINE:\n━━━━━━━━━━━━━━━━━━━━━\n🏷️ Tên nhóm: ${gName}\n🆔 Group ID:\n${groupId}\n\n✅ Đã tự động kết nối với Dashboard YCX!\n(Bạn có thể chọn nhóm này trong mục Hẹn Giờ Báo)`
                            }
                        ]);
                    } else {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `🆔 LINE User ID của bạn:\n${senderUserId}\n\n(Hãy copy chuỗi này dán vào mục Khai Báo Admin trên Dashboard YCX)`
                            }
                        ]);
                    }
                    continue;
                }

                // 1.4 Chào hỏi & menu trong chat riêng 1-1 (hi, hello, alo, xin chào...)
                if (!groupId && /^(?:hi|hello|alo|xin\s*chào|chào|chao|start|bắt\s*đầu|bat\s*dau|ơi|oi|menu)$/i.test(cleanText)) {
                    const welcomeMsg = `👋 Chào bạn! Em là BOT Quản Lý PMH ICT.\n━━━━━━━━━━━━━━━━━━━━━\n${formatHelpGuideMessage()}`;
                    await replyLineMessage(token, replyToken, [
                        {
                            type: 'text',
                            text: welcomeMsg,
                            quoteToken: event.message?.quoteToken
                        }
                    ]);
                    continue;
                }

                // 1.5 Kiểm tra lệnh hướng dẫn sử dụng (hd, help, huong dan, ...)
                if (isHelpCommand(cleanText)) {
                    if (!allow('autoReply')) { denyLog('autoReply', 'hướng dẫn "hd"'); continue; }
                    const helpMsg = formatHelpGuideMessage();
                    await replyLineMessage(token, replyToken, [
                        {
                            type: 'text',
                            text: helpMsg,
                            quoteToken: event.message?.quoteToken
                        }
                    ]);
                    continue;
                }

                // 1.6 Kiểm tra lệnh huỷ mã vừa xin nếu không dùng (huy [mã coupon] hoặc huy [MĐH])
                const cancelCmd = parseCancelCouponCommand(cleanText);
                if (cancelCmd.isCancel && !allow('syntax_cancel')) { denyLog('syntax_cancel', 'lệnh huỷ mã'); continue; }
                if (cancelCmd.isCancel && cancelCmd.target) {
                    const target = cancelCmd.target;
                    const userProfile = await getLineUserProfile(token, senderUserId, groupId);
                    const displayName = userProfile?.displayName || 'Bạn';

                    // Tìm mã theo coupon code hoặc MĐH
                    let querySnap = await db.collection('line_bots').doc(uid).collection('coupons')
                        .where('code', '==', target).limit(1).get();

                    if (querySnap.empty) {
                        querySnap = await db.collection('line_bots').doc(uid).collection('coupons')
                            .where('orderId', '==', target).limit(1).get();
                    }

                    if (!querySnap.empty) {
                        const cDoc = querySnap.docs[0];
                        const cData = cDoc.data();
                        const now = new Date().toISOString();

                        await cDoc.ref.update({
                            status: 'UNUSED',
                            orderId: '',
                            recipient: '',
                            recipientId: '',
                            revokedAt: now,
                            revokeReason: `Huỷ qua lệnh LINE bot bởi ${displayName}`,
                            updatedAt: now
                        });

                        const cancelMsg = `✅ ĐÃ THU HỒI MÃ VỀ KHO THÀNH CÔNG!\n━━━━━━━━━━━━━━━━━━━━━\n• Mã PMH: ${cData.code}\n• Sản phẩm: ${cData.productName || cData.type}\n• MĐH đã huỷ: ${cData.orderId || target}\n• Người huỷ: ${displayName}\n━━━━━━━━━━━━━━━━━━━━━\n👉 Mã coupon này đã được đưa về trạng thái "Khả dụng" trong kho để bạn khác có thể sử dụng!`;

                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: cancelMsg,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    } else {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `⚠️ Không tìm thấy mã coupon hoặc MĐH [${target}] trong danh sách đã cấp của kho!\n👉 Vui lòng kiểm tra lại chính xác mã coupon hoặc MĐH cần huỷ.`,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }
                }

                if (cancelCmd.isBareCancel) {
                    const bareGuide = `⚠️ HƯỚNG DẪN HUỶ / THU HỒI MÃ PMH:\n━━━━━━━━━━━━━━━━━━━━━\n👉 Cú pháp: Gõ "huy [Mã coupon hoặc MĐH]"\n\nVí dụ:\n• huy 6W43J4BI2S (huỷ theo mã coupon)\n• huy 01602SO26090873565 (huỷ theo Mã Đơn Hàng)\n\n💡 Sau khi huỷ, mã sẽ được tự động hoàn lại kho để bạn khác có thể sử dụng!`;
                    await replyLineMessage(token, replyToken, [
                        {
                            type: 'text',
                            text: bareGuide,
                            quoteToken: event.message?.quoteToken
                        }
                    ]);
                    continue;
                }

                // 1.8. Kiểm tra tin nhắn xác nhận sử dụng thẻ PMH từ LIFF
                // Nhận cả câu CŨ ("… đã được sử dụng lúc") lẫn câu MỚI theo loại thẻ
                // ("👉 Coupon Event 68 sử dụng lúc …") — xem buildCouponUsedText ở pmhSequence.ts.
                // Bỏ sót ở đây thì mã KHÔNG còn được đánh dấu USED nữa.
                const isUsedConfirm = cleanText.includes('sử dụng lúc') && cleanText.includes('👉');
                if (isUsedConfirm) {
                    // Số thẻ là cụm số NGAY TRƯỚC "sử dụng lúc" — hợp cho "PMH 68",
                    // "Coupon Event 68", "Coupon GVGS 68" và cả câu cũ "… 68 đã được sử dụng lúc".
                    // KHÔNG được lấy "số đầu tiên sau 👉": câu "👉 Mã này sử dụng lúc 14:33" sẽ vớ
                    // phải số GIỜ (14) và đánh dấu nhầm thẻ — test đã bắt đúng lỗi này.
                    const cardMatch = cleanText.match(/👉[^\n]*?(\d+)\s*(?:đã\s*được\s*)?sử\s*dụng\s*lúc/i);
                    const matchedCardIndex = (cardMatch && cardMatch[1]) ? Number(cardMatch[1]) : undefined;

                    // Định dạng mới: "↳ User: [Tên]"
                    const userMatch = cleanText.match(/↳\s*(?:User|Người dùng):\s*(.+)/i);
                    let matchedUser = userMatch ? userMatch[1].trim() : '';

                    if (!matchedUser) {
                        // Tương thích ngược: "đã được [Tên] sử dụng lúc"
                        const oldMatch = cleanText.match(/đã\s*được\s*(.+?)\s*sử\s*dụng\s*lúc/i);
                        if (oldMatch) {
                            matchedUser = oldMatch[1].trim();
                        }
                    }

                    const now = new Date().toISOString();

                    try {
                        const fRef = db.collection('line_bots').doc(uid).collection('filtered_coupons');
                        let q = fRef.where('status', '==', 'UNUSED');
                        if (matchedCardIndex) {
                            q = q.where('cardIndex', '==', matchedCardIndex);
                        }
                        const fSnap = await q.orderBy('filteredAt', 'desc').limit(1).get();
                        if (!fSnap.empty) {
                            await fSnap.docs[0].ref.update({
                                status: 'USED',
                                usedBy: matchedUser || 'Người dùng LINE',
                                usedAt: now
                            });
                            console.log(`[Filtered Coupons] Đã đánh dấu USED từ tin nhắn nhóm: PMH ${matchedCardIndex || 1} - ${matchedUser}`);
                        }
                    } catch (e) {
                        console.warn('[Webhook] Cập nhật USED từ tin nhắn thất bại:', e);
                    }
                    continue;
                }

                // 1.9. Lệnh "csd" — hiện lại TẤT CẢ thẻ PMH đã lọc nhưng CHƯA SỬ DỤNG trong tháng này
                // (thẻ cũ trôi mất trong nhóm, người dùng cần bấm "Chạm để copy" lại). Chỉ lọc theo
                // status ở Firestore (1 field, không cần composite index — project hiện KHÔNG có index
                // nào), còn "trong tháng" lọc bằng tay theo filteredAt (ISO UTC) so với đầu tháng giờ VN.
                if (isRelistUnusedCommand(cleanText)) {
                    if (!allow('filterCoupon')) { denyLog('filterCoupon', 'lệnh "csd"'); continue; }
                    const { label: monthLabel } = getVnMonthStartIso();
                    const MAX_CARDS = 40; // 4 carousel × 10 thẻ, chừa 1 tin văn bản báo phần còn lại (reply tối đa 5 tin)

                    let unusedDocs: Array<{ ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }> = [];
                    try {
                        const fSnap = await db.collection('line_bots').doc(uid).collection('filtered_coupons').where('status', '==', 'UNUSED').get();
                        unusedDocs = selectUnusedThisMonth(
                            fSnap.docs.map(d => ({ ref: d.ref, data: d.data(), code: d.data().code, status: d.data().status, filteredAt: d.data().filteredAt })),
                        );
                    } catch (err) {
                        console.warn('[csd] Lỗi đọc filtered_coupons:', err);
                        await replyLineMessage(token, replyToken, [{ type: 'text', text: '⚠️ Không đọc được danh sách thẻ đã lọc, vui lòng thử lại sau.', quoteToken: event.message?.quoteToken }]);
                        continue;
                    }

                    if (unusedDocs.length === 0) {
                        await replyLineMessage(token, replyToken, [{
                            type: 'text',
                            text: `✅ Không còn thẻ PMH nào chưa sử dụng trong tháng ${monthLabel}.`,
                            quoteToken: event.message?.quoteToken
                        }]);
                        continue;
                    }

                    const shown = unusedDocs.slice(0, MAX_CARDS);
                    // Giữ NGUYÊN số thứ tự đã cấp lúc lọc (số chạy theo tháng, xem pmhSequence) —
                    // thẻ hiện lại phải mang đúng tên gọi cũ để xác nhận "PMH 0007 đã dùng" khớp nhau.
                    const items = shown.map(d => ({
                        recipient: String(d.data.recipient || ''),
                        productName: String(d.data.productName || d.data.categoryLabel || 'PMH'),
                        categoryLabel: String(d.data.categoryLabel || d.data.productName || 'PMH'),
                        code: String(d.data.code),
                        orderId: d.data.orderId ? String(d.data.orderId) : undefined,
                        cardIndex: Number(d.data.cardIndex) || undefined,
                    }));
                    const flexMessages = createFilteredPmhFlexMessages(items, (config as any).liffId);
                    const messages: any[] = [...flexMessages];
                    if (unusedDocs.length > MAX_CARDS) {
                        messages.push({
                            type: 'text',
                            text: `📋 Tháng ${monthLabel} còn ${unusedDocs.length} thẻ chưa sử dụng — đang hiện ${MAX_CARDS} thẻ cũ nhất. Dùng xong gõ "csd" lần nữa để xem tiếp.`
                        });
                    }

                    const sent = await replyLineMessageDetailed(token, replyToken, messages);
                    // Thẻ vừa gửi lại có quoteToken/cardIndex MỚI — cập nhật để LIFF "Chạm để copy" và xác
                    // nhận trích dẫn trỏ đúng thẻ mới nhất (cùng quy ước với luồng lọc ở mục 3.8).
                    if (sent.ok && sent.sentMessages.length > 0) {
                        try {
                            const qBatch = db.batch();
                            const chatId = groupId || event.source?.roomId || senderUserId;
                            shown.forEach((d, idx) => {
                                const quoteToken = sent.sentMessages[Math.floor(idx / 10)]?.quoteToken;
                                const patch: Record<string, string | number> = { relistedAt: new Date().toISOString() };
                                if (quoteToken && chatId) {
                                    patch.quoteToken = quoteToken;
                                    patch.chatId = chatId;
                                    patch.chatType = groupId ? 'group' : (event.source?.roomId ? 'room' : 'user');
                                }
                                qBatch.update(d.ref, patch);
                            });
                            await qBatch.commit();
                        } catch (err) {
                            console.warn('[csd] Lỗi cập nhật quoteToken/cardIndex:', err);
                        }
                    }
                    console.info(`[csd] Hiện lại ${shown.length}/${unusedDocs.length} thẻ chưa sử dụng tháng ${monthLabel}`);
                    continue;
                }

                // 1.10. Tra cứu mã: người dùng dán ĐÚNG 1 mã coupon (8-12 ký tự) vào chat → bot báo mã đã
                // được ai dùng lúc nào (trích dẫn tin của người hỏi) hoặc chưa sử dụng. Không tìm thấy:
                // chat 1-1 báo rõ, trong nhóm im lặng (tránh nhiễu khi ai đó gõ 1 từ HOA dài).
                const bareCode = extractBareCouponCode(cleanText);
                if (bareCode && !allow('syntax_search')) { denyLog('syntax_search', 'tra cứu mã'); continue; }
                if (bareCode) {
                    try {
                        const [fSnap, cSnap] = await Promise.all([
                            db.collection('line_bots').doc(uid).collection('filtered_coupons').where('code', '==', bareCode).get(),
                            db.collection('line_bots').doc(uid).collection('coupons').where('code', '==', bareCode).get(),
                        ]);
                        const docs = [...fSnap.docs, ...cSnap.docs].map(d => d.data());
                        const replyText = buildCouponStatusReply(docs);
                        if (replyText) {
                            await replyLineMessage(token, replyToken, [{ type: 'text', text: replyText, quoteToken: event.message?.quoteToken }]);
                            console.info(`[Tra mã] ${bareCode}: ${docs.length} bản ghi -> ${replyText.split('\n')[0]}`);
                            continue;
                        }
                        if (!groupId && !event.source?.roomId) {
                            await replyLineMessage(token, replyToken, [{ type: 'text', text: `⚠️ Không tìm thấy mã này trong hệ thống của kho.`, quoteToken: event.message?.quoteToken }]);
                            continue;
                        }
                        console.log(`[Tra mã] ${bareCode}: không có trong hệ thống — nhóm chat, bot im lặng.`);
                        continue;
                    } catch (err) {
                        console.warn('[Tra mã] Lỗi đọc Firestore:', err);
                        // rơi xuống các bước sau như bình thường
                    }
                }

                // 2. Kiểm tra lệnh thống kê tồn kho (tk, tk event, tk gvgs...)
                const isTkEvent = /^(?:[./!]?tk\s*(?:event|e|evt)|(?:thống kê|thong ke)\s*(?:event|e))$/i.test(cleanText);
                const isTkGvgs = /^(?:[./!]?tk\s*(?:gvgs|gv|giovang|giờ vàng)|(?:thống kê|thong ke)\s*(?:gvgs|gv))$/i.test(cleanText);
                const isTkAll = /^(?:[./!]?tk|thống kê|thong ke|tonkho|ton kho|tồn kho|kiem tra ton|kiểm tra tồn)$/i.test(cleanText) || lower.startsWith('tk ');

                if ((isTkEvent || isTkGvgs || isTkAll) && !allow('syntax_tk')) { denyLog('syntax_tk', 'lệnh thống kê tồn kho'); continue; }
                if (isTkEvent || isTkGvgs || isTkAll) {
                    // Dọn dẹp các coupon UNUSED đã quá hạn trước khi thống kê tồn kho
                    await cleanupExpiredCoupons(uid);

                    const snap = await db.collection('line_bots').doc(uid).collection('coupons').get();
                    const coupons = snap.docs.map(d => d.data());

                    if (isTkEvent) {
                        const expInfo = await getCategoryExpiryInfo(uid, coupons, 'EVENT');
                        if (expInfo.isExpired) {
                            const dateStr = expInfo.latestExpiryDate ? ` (hạn dùng đến hết ngày ${formatDisplayDate(expInfo.latestExpiryDate)})` : '';
                            await replyLineMessage(token, replyToken, [{
                                type: 'text',
                                text: `⏰ NHÓM PMH EVENT ĐÃ HẾT HẠN SỬ DỤNG${dateStr}!\n━━━━━━━━━━━━━━━━━━━━━\n💡 Hiện tại kho không còn mã Event khả dụng. Quản lý vui lòng nạp mã đợt mới vào Dashboard YCX.`
                            }]);
                            continue;
                        }

                        const { replyText, products, totalAll, totalUnused } = formatInventoryReportMessage(coupons, 'EVENT');
                        if (products.length === 0 || totalUnused === 0) {
                            await replyLineMessage(token, replyToken, [{
                                type: 'text',
                                text: products.length === 0
                                    ? replyText
                                    : `⚠️ BÁO CÁO TỒN KHO PMH EVENT\n━━━━━━━━━━━━━━━━━━━━━\nHiện tại nhóm PMH Event đã phát hết mã khả dụng (0/${totalAll} mã)!\nQuản lý vui lòng nạp thêm mã vào Dashboard YCX.`
                            }]);
                            continue;
                        }
                        const flexMsg = createInventoryReportFlexMessage({
                            category: 'EVENT',
                            totalAll,
                            totalUnused,
                            products,
                            altText: `📊 Báo cáo tồn kho PMH Event: ${totalUnused}/${totalAll} mã khả dụng`
                        });
                        await replyLineMessage(token, replyToken, [flexMsg]);
                        continue;
                    }

                    if (isTkGvgs) {
                        const expInfo = await getCategoryExpiryInfo(uid, coupons, 'GVGS');
                        if (expInfo.isExpired) {
                            const dateStr = expInfo.latestExpiryDate ? ` (hạn dùng đến hết ngày ${formatDisplayDate(expInfo.latestExpiryDate)})` : '';
                            await replyLineMessage(token, replyToken, [{
                                type: 'text',
                                text: `⏰ NHÓM PMH GIỜ VÀNG ĐÃ HẾT HẠN SỬ DỤNG${dateStr}!\n━━━━━━━━━━━━━━━━━━━━━\n💡 Hiện tại kho không còn mã Giờ Vàng khả dụng. Quản lý vui lòng nạp mã đợt mới vào Dashboard YCX.`
                            }]);
                            continue;
                        }

                        const { replyText, products, totalAll, totalUnused } = formatInventoryReportMessage(coupons, 'GVGS');
                        if (products.length === 0 || totalUnused === 0) {
                            await replyLineMessage(token, replyToken, [{
                                type: 'text',
                                text: products.length === 0
                                    ? replyText
                                    : `⚠️ BÁO CÁO TỒN KHO PMH GIỜ VÀNG\n━━━━━━━━━━━━━━━━━━━━━\nHiện tại nhóm PMH Giờ Vàng đã phát hết mã khả dụng (0/${totalAll} mã)!\nQuản lý vui lòng nạp thêm mã vào Dashboard YCX.`
                            }]);
                            continue;
                        }
                        const flexMsg = createInventoryReportFlexMessage({
                            category: 'GVGS',
                            totalAll,
                            totalUnused,
                            products,
                            altText: `📊 Báo cáo tồn kho PMH Giờ Vàng: ${totalUnused}/${totalAll} mã khả dụng`
                        });
                        await replyLineMessage(token, replyToken, [flexMsg]);
                        continue;
                    }

                    // isTkAll: Gửi ALL tồn kho (cả PMH Event và PMH Giờ Vàng)
                    const expEvent = await getCategoryExpiryInfo(uid, coupons, 'EVENT');
                    const expGvgs = await getCategoryExpiryInfo(uid, coupons, 'GVGS');

                    const repEvent = formatInventoryReportMessage(coupons, 'EVENT');
                    const repGvgs = formatInventoryReportMessage(coupons, 'GVGS');
                    const flexMsgs: any[] = [];
                    const noticeLines: string[] = [];

                    // Xử lý nhóm Event: CHỈ hiển thị thẻ nếu CHƯA hết hạn VÀ CÒN mã khả dụng (>0)
                    if (!expEvent.isExpired && repEvent.totalUnused > 0 && repEvent.products.length > 0) {
                        flexMsgs.push(createInventoryReportFlexMessage({
                            category: 'EVENT',
                            totalAll: repEvent.totalAll,
                            totalUnused: repEvent.totalUnused,
                            products: repEvent.products,
                            altText: `📊 Báo cáo tồn kho PMH Event: ${repEvent.totalUnused}/${repEvent.totalAll} mã khả dụng`
                        }));
                    } else if (expEvent.isExpired) {
                        const dStr = expEvent.latestExpiryDate ? ` (hạn đến hết ${formatDisplayDate(expEvent.latestExpiryDate)})` : '';
                        noticeLines.push(`• Nhóm PMH Event: ĐÃ HẾT HẠN DÙNG${dStr}!`);
                    } else if (expEvent.hasCoupons && repEvent.totalUnused === 0) {
                        noticeLines.push(`• Nhóm PMH Event: Đã phát hết mã khả dụng (0/${repEvent.totalAll} mã).`);
                    }

                    // Xử lý nhóm Giờ Vàng: CHỈ hiển thị thẻ nếu CHƯA hết hạn VÀ CÒN mã khả dụng (>0)
                    if (!expGvgs.isExpired && repGvgs.totalUnused > 0 && repGvgs.products.length > 0) {
                        flexMsgs.push(createInventoryReportFlexMessage({
                            category: 'GVGS',
                            totalAll: repGvgs.totalAll,
                            totalUnused: repGvgs.totalUnused,
                            products: repGvgs.products,
                            altText: `📊 Báo cáo tồn kho PMH Giờ Vàng: ${repGvgs.totalUnused}/${repGvgs.totalAll} mã khả dụng`
                        }));
                    } else if (expGvgs.isExpired) {
                        const dStr = expGvgs.latestExpiryDate ? ` (hạn đến hết ${formatDisplayDate(expGvgs.latestExpiryDate)})` : '';
                        noticeLines.push(`• Nhóm PMH Giờ Vàng: ĐÃ HẾT HẠN DÙNG${dStr}!`);
                    } else if (expGvgs.hasCoupons && repGvgs.totalUnused === 0) {
                        noticeLines.push(`• Nhóm PMH Giờ Vàng: Đã phát hết mã khả dụng (0/${repGvgs.totalAll} mã).`);
                    }

                    const replyMsgs: any[] = [...flexMsgs];

                    if (noticeLines.length > 0) {
                        const noticeText = `📢 THÔNG BÁO TỒN KHO:\n${noticeLines.join('\n')}\n\n💡 Quản lý vui lòng cập nhật thêm mã mới vào Dashboard YCX nếu cần cấp thêm.`;
                        replyMsgs.push({ type: 'text', text: noticeText });
                    }

                    if (replyMsgs.length === 0) {
                        await replyLineMessage(token, replyToken, [
                            { type: 'text', text: '📊 BÁO CÁO TỒN KHO PMH\n━━━━━━━━━━━━━━━━━━━━━\nKho hiện tại chưa có mã nào khả dụng!\nQuản lý vui lòng nạp mã vào Dashboard YCX.' }
                        ]);
                        continue;
                    }

                    await replyLineMessage(token, replyToken, replyMsgs);
                    continue;
                }

                // 3. Nhận diện lệnh xin nhận mã PMH: e+STT (Event) hoặc gv+STT (Giờ Vàng) hoặc số trần (nhắc nhở)
                const claimCmd = parseCouponClaimCommand(cleanText);
                if ((claimCmd.isBareNumber || claimCmd.isClaim) && !allow('issueCoupon')) { denyLog('issueCoupon', 'lệnh xin cấp mã PMH'); continue; }

                if (claimCmd.isBareNumber && claimCmd.productIndex) {
                    // Người dùng gõ số trần (ví dụ: 1, 2, 2 12345678) mà chưa ghi rõ loại e hay gv
                    const userProfile = await getLineUserProfile(token, senderUserId, groupId);
                    const displayName = userProfile?.displayName || 'Bạn';
                    const tagString = `@${displayName}`;
                    const mdhSuffix = claimCmd.orderId ? ` ${claimCmd.orderId}` : '';
                    const guideMsg = `${tagString}\n⚠️ Vui lòng ghi rõ loại PMH bạn muốn lấy:\n👉 PMH Event: Gõ "e${claimCmd.productIndex}${mdhSuffix}"\n👉 PMH Giờ Vàng: Gõ "gv${claimCmd.productIndex}${mdhSuffix}"\n\n💡 Gõ "tk event" hoặc "tk gvgs" để kiểm tra danh sách!`;

                    const payload: any = {
                        type: 'text',
                        text: guideMsg,
                        quoteToken: event.message?.quoteToken
                    };
                    if (senderUserId) {
                        payload.mention = {
                            mentionees: [{ index: 0, length: tagString.length, userId: senderUserId }]
                        };
                    }
                    await replyLineMessage(token, replyToken, [payload]);
                    continue;
                }

                if (claimCmd.isClaim && claimCmd.category && claimCmd.productIndex) {
                    await cleanupExpiredCoupons(uid);
                    const snap = await db.collection('line_bots').doc(uid).collection('coupons').get();

                    // Tự động khôi phục mã bị kẹt do lỗi quoteToken lúc 15:50 (08:50 UTC) nếu có
                    for (const d of snap.docs) {
                        const c = d.data();
                        if (c.status === 'SENT' && !c.orderId && c.updatedAt && c.updatedAt.startsWith('2026-09-20T08:50')) {
                            await d.ref.update({
                                status: 'UNUSED',
                                recipient: '',
                                recipientId: '',
                                updatedAt: new Date().toISOString()
                            });
                            c.status = 'UNUSED';
                            delete c.recipient;
                            delete c.recipientId;
                        }
                    }

                    const coupons = snap.docs.map(d => d.data());
                    const productList = getProductInventoryList(coupons, claimCmd.category);
                    const catLabel = claimCmd.category === 'EVENT' ? 'Event' : 'Giờ Vàng Giá Sốc';
                    const cmdPrefix = claimCmd.category === 'EVENT' ? 'e' : 'gv';

                    if (claimCmd.productIndex > productList.length) {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `⚠️ Số thứ tự [${cmdPrefix}${claimCmd.productIndex}] không có trong danh sách PMH ${catLabel}!\nHiện tại nhóm có [${productList.length}] sản phẩm (từ ${cmdPrefix}1 đến ${cmdPrefix}${productList.length}).\n👉 Gõ "tk ${claimCmd.category === 'EVENT' ? 'event' : 'gvgs'}" để kiểm tra danh sách.`,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }

                    const targetProduct = productList[claimCmd.productIndex - 1];

                    if (targetProduct.unused <= 0) {
                        const expiredInfo = await findExpiredProduct(uid, targetProduct.productName);
                        if (expiredInfo) {
                            const expDateVN = formatDisplayDate(expiredInfo.expiryDate);
                            await replyLineMessage(token, replyToken, [
                                {
                                    type: 'text',
                                    text: `⚠️ THÔNG BÁO HẾT HẠN MÃ PMH!\nMã PMH cho sản phẩm [${targetProduct.productName}] đã HẾT HẠN SỬ DỤNG${expDateVN ? ` (Hạn dùng đến hết ngày ${expDateVN})` : ''}.\nKho đã tự động huỷ bỏ mã này theo quy định!`,
                                    quoteToken: event.message?.quoteToken
                                }
                            ]);
                            continue;
                        }

                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `❌ Rất tiếc, sản phẩm [${targetProduct.productName}] (${cmdPrefix}${claimCmd.productIndex}) hiện đã HẾT MÃ trong kho!\n👉 Gõ "tk ${claimCmd.category === 'EVENT' ? 'event' : 'gvgs'}" để kiểm tra các sản phẩm khác còn mã.`,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }

                    // Lấy profile người yêu cầu
                    const userProfile = await getLineUserProfile(token, senderUserId, groupId);
                    const displayName = userProfile?.displayName || 'Bạn';
                    const tagString = `@${displayName}`;

                    // Kiểm tra trùng MĐH nếu có nhập kèm
                    if (claimCmd.orderId) {
                        const dupSnap = await db.collection('line_bots').doc(uid).collection('coupons')
                            .where('orderId', '==', claimCmd.orderId).limit(1).get();

                        if (!dupSnap.empty) {
                            const existing = dupSnap.docs[0].data();
                            const prodTag = existing.productName || existing.type || 'PMH';
                            const dupText = `${tagString}\n⚠️ CẢNH BÁO TRÙNG MÃ ĐƠN HÀNG!\nĐơn hàng [${claimCmd.orderId}] đã được cấp mã trước đó:\nLoại PMH: ${prodTag}\n➜ PMH: ${existing.code}\n👤 Người nhận: ${existing.recipient || displayName}`;
                            const dupPayload: any = {
                                type: 'text',
                                text: dupText,
                                quoteToken: event.message?.quoteToken
                            };
                            if (senderUserId) {
                                dupPayload.mention = {
                                    mentionees: [{ index: 0, length: tagString.length, userId: senderUserId }]
                                };
                            }
                            await replyLineMessage(token, replyToken, [dupPayload]);
                            continue;
                        }
                    }

                    // Tự động phát mã nếu autoApprove !== false
                    if (config.autoApprove !== false) {
                        const cleanTargetName = targetProduct.productName.toLowerCase().trim();
                        let chosenDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

                        for (const d of snap.docs) {
                            const c = d.data();
                            if (c.status === 'UNUSED' || !c.status) {
                                const matchesCat = claimCmd.category === 'EVENT' ? isEventCategory(c.type) : isGvgsCategory(c.type);
                                if (matchesCat) {
                                    const pName = (c.productName || c.type || '').toLowerCase().trim();
                                    if (pName === cleanTargetName || pName.includes(cleanTargetName) || cleanTargetName.includes(pName)) {
                                        chosenDoc = d;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!chosenDoc) {
                            await replyLineMessage(token, replyToken, [
                                {
                                    type: 'text',
                                    text: `❌ Kho hiện không còn mã sẵn sàng cho sản phẩm [${targetProduct.productName}] (${catLabel}). Quản lý vui lòng nạp thêm mã!`,
                                    quoteToken: event.message?.quoteToken
                                }
                            ]);
                            continue;
                        }

                        const cData = chosenDoc.data();
                        const now = new Date().toISOString();

                        const shortCatForSeq = claimCmd.category === 'EVENT' ? 'Event' : 'Giờ Vàng';
                        // Số thứ tự CHẠY THEO THÁNG, mỗi LOẠI một dải riêng
                        // (functions/src/pmhSequence.ts) — chủ dự án chốt 2026-09-26. Trước đây luồng
                        // cấp mã từ kho không cấp số nên thẻ nào cũng hiện "PMH 0001", không gọi tên
                        // được một thẻ cụ thể để đối chiếu.
                        const seqStock = await allocatePmhSequence(uid, 1, new Date(), couponKind(shortCatForSeq));

                        await chosenDoc.ref.update({
                            status: 'SENT',
                            orderId: claimCmd.orderId || '',
                            recipient: displayName,
                            recipientId: senderUserId,
                            // Lưu lại để "csd" và xác nhận sử dụng (mark-used) gọi đúng số thẻ
                            ...(seqStock > 0 ? { cardIndex: seqStock } : {}),
                            updatedAt: now
                        });

                        const mdhLine = claimCmd.orderId ? `\nMĐH Áp dụng: ${claimCmd.orderId}` : '';
                        const shortCat = shortCatForSeq;

                        // Gửi Flex Message Card hỗ trợ chạm tự động copy mã
                        const flexMsg = createCouponFlexMessage({
                            displayName,
                            productName: targetProduct.productName,
                            categoryLabel: shortCat,
                            code: cData.code,
                            orderId: claimCmd.orderId,
                            cardIndex: seqStock > 0 ? seqStock : undefined,
                            liffId: (config as any).liffId
                        });

                        const sendOk = await replyLineMessage(token, replyToken, [flexMsg]);
                        if (!sendOk) {
                            console.error(`[replyLineMessage failed] Reverting coupon ${chosenDoc.id} back to UNUSED`);
                            await chosenDoc.ref.update({
                                status: 'UNUSED',
                                orderId: '',
                                recipient: '',
                                recipientId: '',
                                updatedAt: now
                            });
                        }
                        continue;
                    } else {
                        // Chờ Admin duyệt
                        await db.collection('line_bots').doc(uid).collection('pending_requests').add({
                            productName: targetProduct.productName,
                            requestedProduct: targetProduct.productName,
                            category: claimCmd.category,
                            managerName: displayName,
                            senderUserId,
                            orderId: claimCmd.orderId || '',
                            status: 'PENDING',
                            quoteToken: event.message?.quoteToken,
                            createdAt: new Date().toISOString()
                        });

                        const replyMsg = `${tagString}\n📋 Đã ghi nhận yêu cầu lấy PMH [${targetProduct.productName}] (${catLabel})!\n⏳ Vui lòng chờ Admin duyệt (Admin gõ "DUYỆT").`;
                        const payload: any = {
                            type: 'text',
                            text: replyMsg,
                            quoteToken: event.message?.quoteToken
                        };
                        if (senderUserId) {
                            payload.mention = {
                                mentionees: [{ index: 0, length: tagString.length, userId: senderUserId }]
                            };
                        }
                        await replyLineMessage(token, replyToken, [payload]);
                        continue;
                    }
                }

                // 3.5. Kiểm tra lệnh DUYỆT từ Admin (ví dụ: DUYỆT 12345678 hoặc DUYỆT / OK / ALL)
                const isApprovalAll = /^(?:duyệt|duyet|ok|all|approve)$/i.test(cleanText);
                const approvalMatch = cleanText.match(/^(?:duyệt|duyet|approve)\s+([A-Za-z0-9_-]{4,25})/i);

                if (isApprovalAll) {
                    await cleanupExpiredCoupons(uid);
                    const pendingSnap = await db.collection('line_bots').doc(uid).collection('pending_requests')
                        .where('status', '==', 'PENDING').get();

                    if (pendingSnap.empty) {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: 'Hiện tại không có yêu cầu nào đang nằm trong danh sách chờ duyệt.',
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }

                    const unusedSnap = await db.collection('line_bots').doc(uid).collection('coupons')
                        .where('status', '==', 'UNUSED').get();

                    if (unusedSnap.empty) {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: '❌ Kho hiện tại đã hết mã khả dụng để duyệt! Vui lòng nạp thêm mã vào Dashboard YCX.',
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }

                    let availableDocs = [...unusedSnap.docs];
                    const approvedEntries: string[] = [];
                    const now = new Date().toISOString();

                    for (const pDoc of pendingSnap.docs) {
                        const pData = pDoc.data();
                        const reqLower = (pData.requestedProduct || pData.couponType || '').toLowerCase();

                        // Tìm mã khớp
                        let chosenIdx = -1;
                        if (reqLower) {
                            chosenIdx = availableDocs.findIndex(d => {
                                const c = d.data();
                                const pName = (c.productName || '').toLowerCase();
                                const tName = (c.type || '').toLowerCase();
                                const syn = (c.syntax || '').toLowerCase();
                                return pName.includes(reqLower) || reqLower.includes(pName) || tName.includes(reqLower) || syn.includes(reqLower);
                            });
                        }
                        if (chosenIdx === -1 && availableDocs.length > 0) {
                            chosenIdx = 0;
                        }

                        if (chosenIdx !== -1) {
                            const chosenDoc = availableDocs[chosenIdx];
                            availableDocs.splice(chosenIdx, 1);
                            const cData = chosenDoc.data();

                            await chosenDoc.ref.update({
                                status: 'SENT',
                                warehouse: pData.warehouse || '',
                                orderId: pData.orderId,
                                recipient: pData.managerName || 'Nhân viên',
                                recipientId: pData.senderUserId || '',
                                updatedAt: now
                            });

                            await pDoc.ref.update({
                                status: 'APPROVED',
                                couponCode: cData.code,
                                approvedBy: senderUserId,
                                updatedAt: now
                            });

                            const dispName = pData.managerName || 'Quản lý';
                            const pTitle = cData.productName || cData.type || pData.couponType || 'PMH';
                            approvedEntries.push(`${dispName}\n➜ PMH ${pTitle} : ${cData.code}`);
                        }
                    }

                    if (approvedEntries.length > 0) {
                        const replyContent = approvedEntries.join('\n━━━━━━\n');
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: replyContent,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                    } else {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: '❌ Không đủ mã phù hợp trong kho để duyệt các yêu cầu đang chờ!',
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                    }
                    continue;
                }

                if (approvalMatch) {
                    await cleanupExpiredCoupons(uid);
                    const targetOrderId = approvalMatch[1].trim().toUpperCase();
                    const pendingDoc = await db.collection('line_bots').doc(uid).collection('pending_requests').doc(targetOrderId).get();
                    if (!pendingDoc.exists) {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `⚠️ Không tìm thấy yêu cầu chờ duyệt cho đơn hàng [${targetOrderId}]!`,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }

                    const pData = pendingDoc.data()!;
                    if (pData.status === 'APPROVED') {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `⚠️ Đơn hàng [${targetOrderId}] đã được duyệt trước đó:\n➜ PMH: ${pData.couponCode}`,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }

                    // Lấy mã khả dụng UNUSED
                    const unusedSnap = await db.collection('line_bots').doc(uid).collection('coupons')
                        .where('status', '==', 'UNUSED').get();

                    if (unusedSnap.empty) {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: `❌ Kho hiện tại đã hết mã khả dụng để duyệt cho đơn [${targetOrderId}]! Vui lòng nạp thêm mã vào Dashboard YCX.`,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                        continue;
                    }

                    // Khớp sản phẩm
                    let chosenDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
                    const reqLower = (pData.requestedProduct || pData.couponType || '').toLowerCase();
                    if (reqLower) {
                        for (const d of unusedSnap.docs) {
                            const c = d.data();
                            const pName = (c.productName || '').toLowerCase();
                            const tName = (c.type || '').toLowerCase();
                            const syn = (c.syntax || '').toLowerCase();
                            if (pName.includes(reqLower) || reqLower.includes(pName) || tName.includes(reqLower) || syn.includes(reqLower)) {
                                chosenDoc = d;
                                break;
                            }
                        }
                    }
                    if (!chosenDoc) chosenDoc = unusedSnap.docs[0];

                    const cData = chosenDoc.data();
                    const now = new Date().toISOString();

                    // Cùng bộ đếm theo tháng với thẻ "LỌC PMH" — xem pmhSequence.ts
                    const seqApprove = await allocatePmhSequence(uid, 1, new Date(), couponKind(pData.category === 'EVENT' ? 'Event' : 'Giờ Vàng'));

                    await chosenDoc.ref.update({
                        status: 'SENT',
                        warehouse: pData.warehouse || '',
                        orderId: targetOrderId,
                        recipient: pData.managerName || 'Nhân viên',
                        recipientId: pData.senderUserId || senderUserId,
                        ...(seqApprove > 0 ? { cardIndex: seqApprove } : {}),
                        updatedAt: now
                    });

                    await pendingDoc.ref.update({
                        status: 'APPROVED',
                        couponCode: cData.code,
                        approvedBy: senderUserId,
                        updatedAt: now
                    });

                    const displayTitle = cData.productName || cData.type || pData.couponType || 'PMH';
                    const categoryLabel = pData.category === 'EVENT' ? 'Event' : 'Giờ Vàng';

                    // Gửi Flex Message Card hỗ trợ chạm tự động copy mã
                    const flexMsg = createCouponFlexMessage({
                        displayName: pData.managerName || 'Bạn',
                        productName: displayTitle,
                        categoryLabel,
                        code: cData.code,
                        orderId: targetOrderId,
                        warehouse: pData.warehouse,
                        cardIndex: seqApprove > 0 ? seqApprove : undefined,
                        liffId: (config as any).liffId
                    });

                    await replyLineMessage(token, replyToken, [flexMsg]);
                    continue;
                }

                // 3.8. Kiểm tra tính năng LỌC PMH khi nhận tin nhắn chuyển tiếp
                const isReport = isInventoryOrStatisticsReport(rawText);
                const pmhBlocks = isReport ? [] : parsePmhBlocks(rawText);
                const parsed = parseQuickForm(cleanText);
                const isExplicitFilter = lower.startsWith('lọc') || lower.startsWith('loc') || lower.startsWith('.loc');
                const isForwardedPmhList = !isReport && pmhBlocks.length > 0 && (pmhBlocks.length > 1 || isExplicitFilter || (!parsed.orderId && /(?:➜|->|=>|►|•)\s*(?:PMH|phiếu|[❌⚠️])/i.test(rawText)));

                if (isForwardedPmhList && !allow('filterCoupon')) { denyLog('filterCoupon', 'lọc PMH từ tin chuyển tiếp'); continue; }
                if (isForwardedPmhList) {
                    const isGroupOrRoom = Boolean(groupId || event.source?.roomId);
                    let candidates: string[] = [];
                    if (Array.isArray(config.filterUserNames) && config.filterUserNames.length > 0) {
                        candidates = config.filterUserNames;
                    } else {
                        const userProfile = await getLineUserProfile(token, senderUserId, groupId);
                        if (userProfile?.displayName) {
                            candidates = [userProfile.displayName];
                        }
                    }

                    const filterResult = filterPmhByUsers(rawText, candidates, (config as any).liffId);

                    const makeFilteredDocId = (item: { code: string; recipient: string }) =>
                        `${item.code}_${item.recipient}`.replace(/[^a-zA-Z0-9_-]/g, '_');

                    // BỎ THẺ ĐÃ LỌC TRƯỚC ĐÓ (chủ dự án chốt 2026-09-22): người dùng dán lại y hệt
                    // danh sách cũ thì bot IM LẶNG, chỉ gửi những mã CHƯA từng lọc. Doc id đã là
                    // `${mã}_${người nhận}` nên chỉ cần hỏi Firestore các id đó có tồn tại không
                    // (query theo documentId, tối đa 30 id/lượt — chỉ tính phí đọc cho id KHỚP).
                    let newItems = filterResult.matchedItems || [];
                    let duplicateCount = 0;
                    if (newItems.length > 0) {
                        try {
                            const fCol = db.collection('line_bots').doc(uid).collection('filtered_coupons');
                            const ids = Array.from(new Set(newItems.map(makeFilteredDocId)));
                            const existing = new Set<string>();
                            for (let i = 0; i < ids.length; i += 30) {
                                const chunk = ids.slice(i, i + 30);
                                const snap = await fCol.where(FieldPath.documentId(), 'in', chunk).get();
                                snap.docs.forEach(d => existing.add(d.id));
                            }
                            if (existing.size > 0) {
                                const before = newItems.length;
                                newItems = newItems.filter(item => !existing.has(makeFilteredDocId(item)));
                                duplicateCount = before - newItems.length;
                            }
                        } catch (err) {
                            console.warn('[Filter PMH] Không kiểm tra được thẻ trùng, cứ gửi như cũ:', err);
                        }
                    }

                    if (duplicateCount > 0 && newItems.length === 0) {
                        console.info(`[Filter PMH] Toàn bộ ${duplicateCount} mã đã được lọc trước đó — không gửi lại thẻ.`);
                        // Trong NHÓM: im lặng tuyệt đối (đúng yêu cầu chủ dự án — dán lại danh sách cũ
                        // không được spam thẻ). Chat 1-1 hoặc khi gõ rõ lệnh lọc: nói 1 câu để người
                        // dùng biết bot có nhận, không tưởng bot chết.
                        if (!isGroupOrRoom || isExplicitFilter) {
                            await replyLineMessage(token, replyToken, [{
                                type: 'text',
                                text: `ℹ️ ${duplicateCount} mã trong tin này đã được lọc trước đó rồi.\n👉 Gõ "csd" để xem lại các thẻ chưa sử dụng trong tháng.`,
                                quoteToken: event.message?.quoteToken
                            }]);
                        }
                        continue;
                    }

                    // Số thứ tự thẻ CHẠY THEO THÁNG (0001, 0002…, reset đầu tháng) — cấp cả dải
                    // trong 1 transaction, xem functions/src/pmhSequence.ts.
                    if (newItems.length > 0) {
                        // Mỗi LOẠI một dải số riêng (Event 0001…, GVGS 0001…, PMH lọc 0001…).
                        // MỘT LẦN LỌC CÓ THỂ LẪN NHIỀU LOẠI (xem filterPmhByUsers: cat có thể là
                        // EVENT / GIỜ VÀNG / MM200…), nên phải cấp theo từng nhóm — cấp một dải
                        // chung sẽ khiến số của loại này đè lên loại kia.
                        const nhomTheoLoai = new Map<string, number[]>();
                        newItems.forEach((item, idx) => {
                            const k = couponKind((item as { categoryLabel?: string }).categoryLabel);
                            if (!nhomTheoLoai.has(k)) nhomTheoLoai.set(k, []);
                            nhomTheoLoai.get(k)!.push(idx);
                        });
                        const daDanhSo: Array<(typeof newItems)[number] & { cardIndex?: number }> = [...newItems];
                        for (const [loai, viTri] of nhomTheoLoai) {
                            const batDau = await allocatePmhSequence(uid, viTri.length, new Date(), loai as 'event' | 'gvgs' | 'pmh');
                            if (batDau > 0) {
                                viTri.forEach((pos, i) => {
                                    daDanhSo[pos] = { ...daDanhSo[pos], cardIndex: batDau + i } as typeof daDanhSo[number];
                                });
                            }
                        }
                        newItems = daDanhSo;
                    }

                    // Danh sách rút gọn (bỏ thẻ trùng) -> phải dựng lại thẻ Flex theo đúng số thứ tự mới
                    const flexMessages = newItems.length > 0
                        ? createFilteredPmhFlexMessages(newItems, (config as any).liffId)
                        : [];

                    // Tự động lưu các coupon lọc được vào Firestore để Admin theo dõi
                    if (newItems.length > 0) {
                        try {
                            const fBatch = db.batch();
                            const fNow = new Date().toISOString();
                            newItems.forEach((item, fIdx) => {
                                const docId = makeFilteredDocId(item);
                                const docRef = db.collection('line_bots').doc(uid).collection('filtered_coupons').doc(docId);
                                fBatch.set(docRef, {
                                    id: docId,
                                    code: item.code,
                                    productName: item.productName,
                                    categoryLabel: item.categoryLabel,
                                    recipient: item.recipient,
                                    orderId: item.orderId || null,
                                    cardIndex: (item as { cardIndex?: number }).cardIndex || fIdx + 1,
                                    status: 'UNUSED',
                                    filteredAt: fNow
                                }, { merge: true });
                            });
                            await fBatch.commit();
                        } catch (err) {
                            console.warn('[Filtered Coupons] Lỗi lưu Firestore:', err);
                        }
                    }

                    // QUY TẮC NGHIÊM NGẶT TRONG NHÓM / ROOM:
                    // 1. Nếu không tìm thấy mã nào thuộc về cấu hình:
                    //    -> Trong nhóm chat và KHÔNG có lệnh gõ trực tiếp (.loc, lọc): IM LẶNG TUYỆT ĐỐI!
                    //    -> Chỉ phản hồi thông báo không tìm thấy khi ở chat 1-1 hoặc khi gõ rõ lệnh lọc.
                    if (filterResult.matchedBlocks.length === 0) {
                        if (isGroupOrRoom && !isExplicitFilter) {
                            console.log('[Filter PMH] Nhóm chat: Không tìm thấy mã và không có lệnh lọc tường minh. Bot giữ im lặng.');
                            continue;
                        }
                    }

                    if (flexMessages.length > 0) {
                        const sent = await replyLineMessageDetailed(token, replyToken, flexMessages);
                        // Lưu quoteToken của thẻ + chat đích để mark-used (LIFF) cho bot gửi xác nhận TRÍCH DẪN đúng thẻ.
                        // Thẻ thứ fIdx nằm trong tin nhắn thứ floor(fIdx/10) (carousel gom 10 thẻ/tin, xem createFilteredPmhFlexMessages).
                        if (sent.ok && sent.sentMessages.length > 0 && newItems.length > 0) {
                            try {
                                const qBatch = db.batch();
                                const chatId = groupId || event.source?.roomId || senderUserId;
                                newItems.forEach((item, fIdx) => {
                                    const quoteToken = sent.sentMessages[Math.floor(fIdx / 10)]?.quoteToken;
                                    if (!quoteToken || !chatId) return;
                                    const docId = makeFilteredDocId(item);
                                    qBatch.update(db.collection('line_bots').doc(uid).collection('filtered_coupons').doc(docId), {
                                        quoteToken,
                                        chatId,
                                        chatType: groupId ? 'group' : (event.source?.roomId ? 'room' : 'user')
                                    });
                                });
                                await qBatch.commit();
                            } catch (err) {
                                console.warn('[Filtered Coupons] Lỗi lưu quoteToken:', err);
                            }
                        }
                    } else if (filterResult.matchedBlocks.length > 0 || !isGroupOrRoom || isExplicitFilter) {
                        await replyLineMessage(token, replyToken, [
                            {
                                type: 'text',
                                text: filterResult.replyText,
                                quoteToken: event.message?.quoteToken
                            }
                        ]);
                    }
                    continue;
                }

                // 4. Kiểm tra form đăng ký PMH — NGHIÊM: phải đúng cấu trúc form (tiêu đề ở dòng đầu +
                // Loại PMH + MĐH Áp dụng, xem pmhForm.ts). Chỉ có MĐH + Sản phẩm (vd tin "HỖ TRỢ GIAO
                // HÀNG") thì KHÔNG phải form xin PMH — bot im lặng tuyệt đối.
                const isStrictForm = isStrictPmhRequestForm(cleanText);
                if (!isStrictForm && parsed.orderId && (parsed.couponType || parsed.requestedProduct)) {
                    console.log('[Form PMH] Tin có MĐH/Sản phẩm nhưng KHÔNG đúng cú pháp form xin PMH. Bot giữ im lặng.');
                }
                if (isStrictForm && !allow('issueCoupon')) { denyLog('issueCoupon', 'form xin PMH'); continue; }
                if (
                    isStrictForm &&
                    parsed.orderId &&
                    (parsed.couponType || parsed.requestedProduct || lower.includes('lấy pmh') || lower.includes('loại pmh') || lower.includes('áp dụng'))
                ) {
                    const targetProdKey = (parsed.requestedProduct || parsed.couponType || '').trim();

                    // Nếu không có Loại PMH / Sản phẩm nào được chỉ định, Bot giữ im lặng (không đoán mò)
                    if (!targetProdKey) {
                        console.log('[Form PMH] Form không chứa Loại PMH/Sản phẩm cụ thể. Bot giữ im lặng.');
                        continue;
                    }

                    // 1. Tự động dọn dẹp các mã UNUSED đã quá hạn khỏi kho
                    await cleanupExpiredCoupons(uid);

                    // Lấy toàn bộ coupon của kho
                    const couponsSnap = await db.collection('line_bots').doc(uid).collection('coupons').get();
                    if (couponsSnap.empty) {
                        console.log('[Form PMH] Kho chưa có mã nào. Bỏ qua form.');
                        continue;
                    }

                    // Lọc các mã UNUSED
                    const unusedDocs = couponsSnap.docs.filter(d => d.data().status === 'UNUSED');

                    // Tìm mã khả dụng khớp với sản phẩm được yêu cầu
                    let chosenDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
                    for (const d of unusedDocs) {
                        if (matchesProductSearch(d.data(), targetProdKey)) {
                            chosenDoc = d;
                            break;
                        }
                    }

                    // Kiểm tra xem sản phẩm có trong danh mục quản lý của Bot không (kể cả các mã đã từng phát)
                    const isProductBelongsToBot = couponsSnap.docs.some(d => matchesProductSearch(d.data(), targetProdKey));
                    const expiredInfo = !chosenDoc ? await findExpiredProduct(uid, targetProdKey) : null;

                    // QUAN TRỌNG: Nếu sản phẩm KHÔNG thuộc danh mục quản lý của Bot này (ví dụ: MM700, ML200, đồ gia dụng của Bot khác...)
                    // VÀ KHÔNG có trong danh sách sản phẩm hết hạn của Bot:
                    // BOT BẮT BUỘC PHẢI TUYỆT ĐỐI IM LẶNG để các bot khác hoặc quản lý khác xử lý!
                    if (!chosenDoc && !isProductBelongsToBot && !expiredInfo) {
                        console.log(`[Form PMH] Loại PMH/Sản phẩm "${targetProdKey}" không thuộc quản lý của Bot này. Bot giữ im lặng.`);
                        continue;
                    }

                    // Lấy profile LINE người gửi để tag tên chính xác
                    const userProfile = await getLineUserProfile(token, senderUserId, groupId);
                    const displayName = userProfile?.displayName || parsed.managerName || 'Bạn';
                    const tagString = `@${displayName}`;

                    // Nếu sản phẩm thuộc Bot nhưng đã hết hạn:
                    if (!chosenDoc && expiredInfo) {
                        const expDateVN = formatDisplayDate(expiredInfo.expiryDate);
                        const expiredText = `${tagString}\n⚠️ THÔNG BÁO HẾT HẠN MÃ PMH!\nMã PMH cho sản phẩm [${expiredInfo.productName}] đã HẾT HẠN SỬ DỤNG${expDateVN ? ` (Hạn dùng đến hết ngày ${expDateVN})` : ''}.\nKho đã tự động huỷ bỏ mã này theo quy định!`;
                        const expPayload: any = {
                            type: 'text',
                            text: expiredText,
                            quoteToken: event.message?.quoteToken
                        };
                        if (senderUserId) {
                            expPayload.mention = {
                                mentionees: [{ index: 0, length: tagString.length, userId: senderUserId }]
                            };
                        }
                        await replyLineMessage(token, replyToken, [expPayload]);
                        continue;
                    }

                    // Nếu sản phẩm thuộc Bot nhưng kho đã hết mã khả dụng:
                    if (!chosenDoc) {
                        const emptyText = `${tagString}\n❌ HẾT MÃ TRONG KHO!\nSản phẩm [${targetProdKey}] hiện đã hết mã khả dụng. Vui lòng báo Quản lý nạp thêm mã vào Dashboard!`;
                        const emptyPayload: any = {
                            type: 'text',
                            text: emptyText,
                            quoteToken: event.message?.quoteToken
                        };
                        if (senderUserId) {
                            emptyPayload.mention = {
                                mentionees: [{ index: 0, length: tagString.length, userId: senderUserId }]
                            };
                        }
                        await replyLineMessage(token, replyToken, [emptyPayload]);
                        continue;
                    }

                    // Kiểm tra trùng lặp MĐH
                    const dupSnap = await db.collection('line_bots').doc(uid).collection('coupons')
                        .where('orderId', '==', parsed.orderId).limit(1).get();

                    if (!dupSnap.empty) {
                        const existing = dupSnap.docs[0].data();
                        const prodTag = existing.productName || existing.type || 'PMH';
                        const dupText = `${tagString}\n⚠️ CẢNH BÁO TRÙNG MÃ ĐƠN HÀNG!\nĐơn hàng [${parsed.orderId}] đã được cấp mã trước đó:\nLoại PMH: ${prodTag}\n➜ PMH: ${existing.code}\n👤 Người nhận: ${existing.recipient || displayName}`;
                        const dupPayload: any = {
                            type: 'text',
                            text: dupText,
                            quoteToken: event.message?.quoteToken
                        };
                        if (senderUserId) {
                            dupPayload.mention = {
                                mentionees: [{ index: 0, length: tagString.length, userId: senderUserId }]
                            };
                        }
                        await replyLineMessage(token, replyToken, [dupPayload]);
                        continue;
                    }

                    // Tự động duyệt hoặc chờ Admin duyệt (Tuỳ thiết lập của admin)
                    if (config.autoApprove !== false) {
                        const couponDoc = chosenDoc;
                        const cData = couponDoc.data();
                        const now = new Date().toISOString();
                        // Cùng bộ đếm theo tháng với thẻ "LỌC PMH" — xem pmhSequence.ts
                        const seqForm = await allocatePmhSequence(uid, 1, new Date(), couponKind(String(cData.type || parsed.couponType || '')));

                        await couponDoc.ref.update({
                            status: 'SENT',
                            warehouse: parsed.warehouse || '',
                            orderId: parsed.orderId,
                            recipient: displayName,
                            recipientId: senderUserId,
                            ...(seqForm > 0 ? { cardIndex: seqForm } : {}),
                            updatedAt: now
                        });

                        // Đếm số mã còn lại của sản phẩm này sau khi cấp
                        const targetKey = (cData.productName || cData.type || '').trim();
                        const remainingCount = unusedDocs.filter(d => {
                            if (d.id === couponDoc.id) return false;
                            const c = d.data();
                            return (c.productName || c.type || '').trim() === targetKey;
                        }).length;

                        let warningSuffix = '';
                        if (remainingCount < 3) {
                            if (remainingCount === 0) {
                                warningSuffix = `\n\n🚨 CẢNH BÁO: Sản phẩm [${targetKey}] ĐÃ HẾT MÃ! Quản lý vui lòng nạp thêm.`;
                            } else {
                                warningSuffix = `\n\n⚠️ CẢNH BÁO: Sản phẩm [${targetKey}] chỉ còn ${remainingCount} mã!`;
                            }
                        }

                        const displayTitle = cData.productName || cData.type || parsed.couponType || 'PMH';

                        // Gửi Flex Message Card hỗ trợ chạm tự động copy mã
                        const flexMsg = createCouponFlexMessage({
                            displayName,
                            productName: displayTitle,
                            categoryLabel: String(cData.type || parsed.couponType || 'PMH').toUpperCase().includes('EVENT') ? 'Event' : 'Giờ Vàng',
                            code: cData.code,
                            orderId: parsed.orderId,
                            warehouse: parsed.warehouse,
                            warningSuffix,
                            cardIndex: seqForm > 0 ? seqForm : undefined,
                            liffId: (config as any).liffId
                        });

                        await replyLineMessage(token, replyToken, [flexMsg]);
                        continue;
                    } else {
                        // CHẾ ĐỘ CHỜ ADMIN DUYỆT
                        const now = new Date().toISOString();
                        await db.collection('line_bots').doc(uid).collection('pending_requests').doc(parsed.orderId).set({
                            orderId: parsed.orderId,
                            warehouse: parsed.warehouse || '',
                            couponType: parsed.couponType || parsed.requestedProduct || '',
                            requestedProduct: parsed.requestedProduct || '',
                            managerName: displayName,
                            senderUserId,
                            groupId: groupId || null,
                            quoteToken: event.message?.quoteToken || null,
                            status: 'PENDING',
                            createdAt: now,
                            updatedAt: now
                        }, { merge: true });

                        const displayTitle = parsed.requestedProduct || parsed.couponType || 'PMH';
                        const pendingText = `${tagString}\nLoại PMH: ${displayTitle}\nMĐH Áp dụng: ${parsed.orderId}\n⏳ ĐÃ TIẾP NHẬN YÊU CẦU: Đang chờ Admin duyệt lệnh...`;

                        const pendingPayload: any = {
                            type: 'text',
                            text: pendingText,
                            quoteToken: event.message?.quoteToken
                        };
                        if (senderUserId) {
                            pendingPayload.mention = {
                                mentionees: [{ index: 0, length: tagString.length, userId: senderUserId }]
                            };
                        }
                        await replyLineMessage(token, replyToken, [pendingPayload]);
                        continue;
                    }
                }

                // 5. Kiểm tra Thư viện Từ khoá tự động (Keywords)
                if (!allow('keywordReply')) { denyLog('keywordReply', 'trả lời theo từ khoá'); continue; }
                const kwSnap = await db.collection('line_bots').doc(uid).collection('keywords')
                    .where('active', '==', true).get();

                for (const d of kwSnap.docs) {
                    const kw = d.data();
                    const target = (kw.keyword || '').trim().toLowerCase();
                    if (!target) continue;

                    const isMatch = kw.matchType === 'EXACT' ? lower === target : lower.includes(target);
                    if (isMatch) {
                        const replyMsgs: any[] = [];
                        if (kw.replyText) {
                            replyMsgs.push({ type: 'text', text: kw.replyText });
                        }
                        if (Array.isArray(kw.imageUrls) && kw.imageUrls.length > 0) {
                            for (const imgUrl of kw.imageUrls.slice(0, 4)) {
                                replyMsgs.push({
                                    type: 'image',
                                    originalContentUrl: imgUrl,
                                    previewImageUrl: imgUrl
                                });
                            }
                        }
                        if (replyMsgs.length > 0) {
                            await replyLineMessage(token, replyToken, replyMsgs);
                            break;
                        }
                    }
                }

                // 6. Trong chat riêng 1-1: nếu tin nhắn không khớp lệnh nào, nhắc nhở cú pháp thay vì im lặng
                if (!groupId) {
                    await replyLineMessage(token, replyToken, [
                        {
                            type: 'text',
                            text: `👋 Em là BOT Quản Lý PMH ICT.\n━━━━━━━━━━━━━━━━━━━━━\n💡 Gõ "tk" để xem tồn kho PMH\n⚡ Gõ "e1", "gv1"... để nhận mã\n📖 Gõ "hd" để xem hướng dẫn chi tiết nhé!`,
                            quoteToken: event.message?.quoteToken
                        }
                    ]);
                    continue;
                }
            }
        }

        res.status(200).send('OK');
    }
);
