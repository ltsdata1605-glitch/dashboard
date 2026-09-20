/**
 * Firebase Cloud Function - Tiếp nhận Webhook LINE Messaging API đa người dùng
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as crypto from 'crypto';
import { db } from './firebaseAdmin';

const DEFAULT_REGION = 'asia-southeast1';

interface LineEvent {
    type: string;
    mode?: string;
    timestamp?: number;
    source?: {
        type: string;
        userId?: string;
        groupId?: string;
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
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
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
async function replyLineMessage(token: string, replyToken: string, messages: any[]): Promise<boolean> {
    if (!token || !replyToken || !messages || messages.length === 0) return false;
    try {
        const res = await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ replyToken, messages })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.warn('[LINE Reply Error]', res.status, errData);

            // Kiểm tra xem có tin nhắn nào chứa mention không
            const hasMention = messages.some(m => m.mention);
            if (hasMention) {
                // Fallback: Nếu hết lượt miễn phí tag hoặc lỗi mention, gửi lại chỉ dùng quoteToken (trả lời trích dẫn)
                const fallbackMsgs = messages.map(m => {
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
                return retryRes.ok;
            }
            return false;
        }
        return true;
    } catch (e) {
        console.error('[LINE Reply Error]', e);
        return false;
    }
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

interface ProductInventoryItem {
    index: number;
    productName: string;
    total: number;
    unused: number;
}

type CouponCategory = 'EVENT' | 'GVGS' | 'ALL';

function isEventCategory(type?: string): boolean {
    if (!type) return false;
    const t = type.toLowerCase().trim();
    return t === 'event' || t.startsWith('event') || t.includes('cuối tuần') || t.includes('cuoi tuan') || t.includes('event lớn') || t.includes('event lon');
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
function formatInventoryReportMessage(
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

    let text = `📊 BÁO CÁO TỒN KHO ${categoryTitle}\n━━━━━━━━━━━━━━━━━━━━━\n`;

    if (lowStockCount > 0) {
        text += `🚨 CẢNH BÁO TỒN KHO THẤP (< 3 MÃ):\nCó [${lowStockCount}] sản phẩm sắp hết hoặc đã hết mã! Quản lý vui lòng nạp bổ sung mã mới.\n━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    for (const item of products) {
        if (item.unused === 0) {
            text += `${item.index}. ❌ ${item.productName}\n   ➜ HẾT MÃ (0/${item.total} mã)\n`;
        } else if (item.unused < 3) {
            text += `${item.index}. ⚠️ ${item.productName}\n   ➜ SẮP HẾT: Còn ${item.unused}/${item.total} mã (CẦN NẠP GẤP!)\n`;
        } else {
            text += `${item.index}. ✅ ${item.productName}\n   ➜ Còn khả dụng: ${item.unused}/${item.total} mã\n`;
        }
    }

    text += '━━━━━━━━━━━━━━━━━━━━━\n';
    if (isEvent) {
        text += `📈 Tổng tồn kho Event: ${totalUnused} mã khả dụng / ${totalAll} tổng mã\n`;
        text += '💡 Cú pháp nhận mã Event: Gõ "e + STT" (ví dụ: e1, e2, e3...)';
    } else if (isGvgs) {
        text += `📈 Tổng tồn kho Giờ Vàng: ${totalUnused} mã khả dụng / ${totalAll} tổng mã\n`;
        text += '💡 Cú pháp nhận mã Giờ Vàng: Gõ "gv + STT" (ví dụ: gv1, gv2, gv3...)';
    } else {
        text += `📈 Tổng tồn kho: ${totalUnused} mã khả dụng / ${totalAll} tổng mã\n`;
        text += '💡 Nhận mã Event: Gõ "e + STT" (ví dụ: e1, e2...)\n';
        text += '⚡ Nhận mã Giờ Vàng: Gõ "gv + STT" (ví dụ: gv1, gv2...)\n';
        text += '👉 Xem riêng từng loại: Gõ "tk event" hoặc "tk gvgs"';
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
 * Tách nội dung tin nhắn chuyển tiếp thành từng khối chứa PMH
 */
function parsePmhBlocks(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

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
        const hasPmh = /(?:➜|->|=>|►|•)?\s*(?:PMH|phiếu)/i.test(block) || /\bPMH\b/i.test(block);
        const hasError = /(?:➜|->|=>|►|•|^\s*)\s*[❌⚠️🚫❗⛔]/u.test(block) || /(?:➜|->|=>|►|•)\s*(?:thiếu|sai|lỗi|không|mđh)/i.test(block);
        if (!hasPmh && !hasError) return false;
        if (block.includes('Hãy chuyển tiếp tin nhắn này') && !block.includes(':') && !hasError) return false;
        return true;
    });
}

/**
 * Kiểm tra khối PMH có thuộc về người dùng đang lọc không
 */
function isBlockBelongToUser(block: string, candidateNames: string[]): boolean {
    if (!block || !candidateNames || candidateNames.length === 0) return false;
    const normalizedBlock = block.normalize('NFC').toLowerCase();

    for (const name of candidateNames) {
        if (!name || name.trim().length < 2) continue;
        const normName = name.normalize('NFC').toLowerCase().trim();
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
            if (rawType && !typeOrProduct) typeOrProduct = rawType;
            const foundCode = pmhMatch[2].trim();
            if (!code) code = foundCode;
            allCodes.push({
                typeOrProduct: rawType,
                code: foundCode
            });
            continue;
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
        const otherLines = lines.filter(l => l !== finalRecipient && !l.startsWith('---') && !l.startsWith('━━━'));
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
function filterPmhByUsers(text: string, candidateNames: string[]): {
    totalBlocks: number;
    matchedBlocks: string[];
    replyText: string;
} {
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

    // Gôm mã theo từng người nhận
    interface RecipientGroup {
        recipient: string;
        items: string[];
    }

    const groups = new Map<string, RecipientGroup>();

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

    return {
        totalBlocks: allBlocks.length,
        matchedBlocks,
        replyText: msg.trim()
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

            // Xử lý khi được thêm vào nhóm (join event)
            if (event.type === 'join') {
                if (replyToken) {
                    await replyLineMessage(token, replyToken, [
                        {
                            type: 'text',
                            text: `👋 Chào cả nhà! Em là BOT Quản Lý PMH.\n━━━━━━━━━━━━━━━━━━━━━\n📊 Gõ "tk event" để xem tồn kho PMH Event (Cú pháp nhận: e1, e2...)\n⚡ Gõ "tk gvgs" để xem tồn kho PMH Giờ Vàng (Cú pháp nhận: gv1, gv2...)\n🆔 Gõ "id" để xem ID nhóm này.`
                        }
                    ]);
                }
                continue;
            }

            // Xử lý tin nhắn văn bản
            if (event.type === 'message' && event.message?.type === 'text' && replyToken) {
                const rawText = (event.message.text || '').trim();
                // Bỏ tiền tố @mention tên bot nếu có (ví dụ: "@Bot cp" -> "cp", "@DM_Tây Nam Bộ tk" -> "tk")
                const cleanText = rawText.replace(/^@[^\s]+\s*/, '').trim();
                const lower = cleanText.toLowerCase();

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

                // 2. Kiểm tra lệnh thống kê tồn kho (tk, tk event, tk gvgs...)
                const isTkEvent = /^(?:[./!]?tk\s*(?:event|e|evt)|(?:thống kê|thong ke)\s*(?:event|e))$/i.test(cleanText);
                const isTkGvgs = /^(?:[./!]?tk\s*(?:gvgs|gv|giovang|giờ vàng)|(?:thống kê|thong ke)\s*(?:gvgs|gv))$/i.test(cleanText);
                const isTkAll = /^(?:[./!]?tk|thống kê|thong ke|tonkho|ton kho|tồn kho|kiem tra ton|kiểm tra tồn)$/i.test(cleanText) || lower.startsWith('tk ');

                if (isTkEvent || isTkGvgs || isTkAll) {
                    const snap = await db.collection('line_bots').doc(uid).collection('coupons').get();
                    const coupons = snap.docs.map(d => d.data());
                    const cat: CouponCategory = isTkEvent ? 'EVENT' : isTkGvgs ? 'GVGS' : 'ALL';
                    const { replyText } = formatInventoryReportMessage(coupons, cat);
                    await replyLineMessage(token, replyToken, [
                        { type: 'text', text: replyText }
                    ]);
                    continue;
                }

                // 3. Nhận diện lệnh xin nhận mã PMH: e+STT (Event) hoặc gv+STT (Giờ Vàng) hoặc số trần (nhắc nhở)
                const claimCmd = parseCouponClaimCommand(cleanText);

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
                    const snap = await db.collection('line_bots').doc(uid).collection('coupons').get();
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

                        await chosenDoc.ref.update({
                            status: 'SENT',
                            orderId: claimCmd.orderId || '',
                            recipient: displayName,
                            recipientId: senderUserId,
                            updatedAt: now
                        });

                        const mdhLine = claimCmd.orderId ? `\nMĐH Áp dụng: ${claimCmd.orderId}` : '';
                        const shortCat = claimCmd.category === 'EVENT' ? 'Event' : 'Giờ Vàng';
                        const replyMsg = `${tagString}\n🛍️ PMH ${shortCat}: ${targetProduct.productName}${mdhLine}\n➜ PMH: ${cData.code}`;

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

                    await chosenDoc.ref.update({
                        status: 'SENT',
                        warehouse: pData.warehouse || '',
                        orderId: targetOrderId,
                        recipient: pData.managerName || 'Nhân viên',
                        recipientId: pData.senderUserId || senderUserId,
                        updatedAt: now
                    });

                    await pendingDoc.ref.update({
                        status: 'APPROVED',
                        couponCode: cData.code,
                        approvedBy: senderUserId,
                        updatedAt: now
                    });

                    const requesterTag = `@${pData.managerName || 'Bạn'}`;
                    const displayTitle = cData.productName || cData.type || pData.couponType || 'PMH';
                    const approvedText = `${requesterTag}\nLoại PMH: ${displayTitle}\nMĐH Áp dụng: ${targetOrderId}\n➜ PMH: ${cData.code}`;

                    const replyPayload: any = {
                        type: 'text',
                        text: approvedText,
                        quoteToken: pData.quoteToken || event.message?.quoteToken
                    };
                    if (pData.senderUserId) {
                        replyPayload.mention = {
                            mentionees: [{ index: 0, length: requesterTag.length, userId: pData.senderUserId }]
                        };
                    }
                    await replyLineMessage(token, replyToken, [replyPayload]);
                    continue;
                }

                // 3.8. Kiểm tra tính năng LỌC PMH khi nhận tin nhắn chuyển tiếp
                const pmhBlocks = parsePmhBlocks(rawText);
                const parsed = parseQuickForm(cleanText);
                const isExplicitFilter = lower.startsWith('lọc') || lower.startsWith('loc') || lower.startsWith('.loc');
                const isForwardedPmhList = pmhBlocks.length > 0 && (pmhBlocks.length > 1 || isExplicitFilter || (!parsed.orderId && /(?:➜|->|=>|►|•)\s*(?:PMH|phiếu|[❌⚠️])/i.test(rawText)));

                if (isForwardedPmhList) {
                    let candidates: string[] = [];
                    if (Array.isArray(config.filterUserNames) && config.filterUserNames.length > 0) {
                        candidates = config.filterUserNames;
                    } else {
                        const userProfile = await getLineUserProfile(token, senderUserId, groupId);
                        if (userProfile?.displayName) {
                            candidates = [userProfile.displayName];
                        }
                    }

                    const filterResult = filterPmhByUsers(rawText, candidates);
                    await replyLineMessage(token, replyToken, [
                        {
                            type: 'text',
                            text: filterResult.replyText,
                            quoteToken: event.message?.quoteToken
                        }
                    ]);
                    continue;
                }

                // 4. Kiểm tra form đăng ký PMH
                if (
                    parsed.orderId &&
                    (parsed.couponType || parsed.requestedProduct || lower.includes('lấy pmh') || lower.includes('loại pmh') || lower.includes('áp dụng'))
                ) {
                    // Lấy profile LINE người gửi để tag tên chính xác
                    const userProfile = await getLineUserProfile(token, senderUserId, groupId);
                    const displayName = userProfile?.displayName || parsed.managerName || 'Bạn';
                    const tagString = `@${displayName}`;

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
                        // TỰ ĐỘNG DUYỆT & PHÁT MÃ
                        const unusedSnap = await db.collection('line_bots').doc(uid).collection('coupons')
                            .where('status', '==', 'UNUSED').get();

                        if (unusedSnap.empty) {
                            const emptyText = `${tagString}\n❌ HẾT MÃ TRONG KHO!\nKho hiện tại đã hết mã khả dụng. Vui lòng báo Quản lý nạp thêm mã vào Dashboard!`;
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

                        // Tìm mã khớp nhất:
                        let chosenDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

                        // Ưu tiên 1: Khớp theo requestedProduct
                        if (parsed.requestedProduct) {
                            const reqLower = parsed.requestedProduct.toLowerCase();
                            for (const d of unusedSnap.docs) {
                                const c = d.data();
                                const pName = (c.productName || '').toLowerCase();
                                const syn = (c.syntax || '').toLowerCase();
                                if (pName.includes(reqLower) || reqLower.includes(pName) || syn.includes(reqLower)) {
                                    chosenDoc = d;
                                    break;
                                }
                            }
                        }

                        // Ưu tiên 2: Khớp theo couponType
                        if (!chosenDoc && parsed.couponType) {
                            const typeLower = parsed.couponType.toLowerCase();
                            for (const d of unusedSnap.docs) {
                                const c = d.data();
                                const tName = (c.type || '').toLowerCase();
                                const pName = (c.productName || '').toLowerCase();
                                if (tName.includes(typeLower) || pName.includes(typeLower)) {
                                    chosenDoc = d;
                                    break;
                                }
                            }
                        }

                        // Ưu tiên 3: Fallback lấy mã đầu tiên
                        if (!chosenDoc) {
                            chosenDoc = unusedSnap.docs[0];
                        }

                        const couponDoc = chosenDoc;
                        const cData = couponDoc.data();
                        const now = new Date().toISOString();

                        await couponDoc.ref.update({
                            status: 'SENT',
                            warehouse: parsed.warehouse || '',
                            orderId: parsed.orderId,
                            recipient: displayName,
                            recipientId: senderUserId,
                            updatedAt: now
                        });

                        // Đếm số mã còn lại của sản phẩm này sau khi cấp
                        const targetKey = (cData.productName || cData.type || '').trim();
                        const remainingCount = unusedSnap.docs.filter(d => {
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

                        // Định dạng phản hồi chuẩn xác:
                        // @CTH-AN-33747-BOSS
                        // Loại PMH: ....
                        // MĐH Áp dụng:.... 
                        // ➜ PMH: 6W43J4BI2S
                        const replyText = `${tagString}\nLoại PMH: ${displayTitle}\nMĐH Áp dụng: ${parsed.orderId}\n➜ PMH: ${cData.code}${warningSuffix}`;

                        const replyPayload: any = {
                            type: 'text',
                            text: replyText,
                            quoteToken: event.message?.quoteToken
                        };
                        if (senderUserId) {
                            replyPayload.mention = {
                                mentionees: [
                                    {
                                        index: 0,
                                        length: tagString.length,
                                        userId: senderUserId
                                    }
                                ]
                            };
                        }

                        await replyLineMessage(token, replyToken, [replyPayload]);
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
            }
        }

        res.status(200).send('OK');
    }
);
