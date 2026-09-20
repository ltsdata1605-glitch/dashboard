/**
 * Parser bóc tách form xin mã PMH và bộ lọc tin nhắn chuyển tiếp
 * Kế thừa và chuẩn hoá từ dự án PMH ICT_T9
 */

import { ParsedCouponForm, ParsedImportItem, PmhFilterResult } from '../types/lineBot.types';

/**
 * Kiểm tra nhanh xem tin nhắn có giống form đăng ký PMH không
 */
export function looksLikeCouponForm(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const clean = text.toLowerCase();
    const hasPmh = clean.includes('pmh') || clean.includes('phiếu') || clean.includes('mã');
    const hasMdh = clean.includes('mđh') || clean.includes('mdh') || clean.includes('đơn hàng') || clean.includes('mã đh') || clean.includes('don hang');
    const hasKho = clean.includes('kho') || clean.includes('siêu thị') || clean.includes('st');
    return (hasPmh && hasMdh) || (hasMdh && hasKho);
}

/**
 * Bóc tách thông tin form xin mã PMH
 */
export function parseCouponForm(text: string): ParsedCouponForm {
    if (!text || typeof text !== 'string') {
        return { isValid: false, rawText: text || '', errorMessage: 'Nội dung tin nhắn trống' };
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let warehouse = '';
    let orderId = '';
    let couponType = '';
    let managerName = '';

    for (const line of lines) {
        const lower = line.toLowerCase();

        // Bỏ qua dòng tiêu đề dạng [TIÊU ĐỀ] hoặc === TIÊU ĐỀ === hoặc 📝 FORM MẪU
        if (line.startsWith('[') || line.startsWith('==') || line.startsWith('━━') || line.startsWith('📝') || lower.includes('form mẫu') || lower.includes('lấy pmh')) {
            continue;
        }

        // 1. Tìm mã kho (tuỳ chọn)
        if (!warehouse && (lower.includes('kho') || lower.includes('siêu thị') || lower.includes('st:'))) {
            const match = line.match(/(?:kho|siêu thị|st)[\s:.-]*([A-Za-z0-9_-]{2,10})/i);
            if (match && match[1]) {
                warehouse = match[1].trim();
            }
        }

        // 2. Tìm mã đơn hàng (MĐH Áp dụng / MĐH)
        if (!orderId && (lower.includes('mđh') || lower.includes('mdh') || lower.includes('đơn hàng') || lower.includes('mã đh') || lower.includes('don hang') || lower.includes('áp dụng'))) {
            const match = line.match(/(?:mđh\s*(?:áp dụng)?|mdh\s*(?:ap dung)?|đơn hàng\s*(?:áp dụng)?|mã đh|áp dụng)[\s:.-]*([A-Za-z0-9_-]{4,25})/i);
            if (match && match[1]) {
                orderId = match[1].trim().toUpperCase();
            }
        }

        // 3. Tìm loại PMH (Loại PMH / Loại / Sản phẩm)
        if (!couponType && (lower.startsWith('loại') || lower.includes('loại:') || lower.includes('mệnh giá') || lower.startsWith('pmh:') || lower.startsWith('phiếu:') || lower.includes('sản phẩm') || lower.startsWith('sp:'))) {
            const match = line.match(/(?:loại\s*(?:pmh)?|mệnh giá|pmh|phiếu|sản phẩm|sp)[\s:.-]+(.+)/i);
            if (match && match[1]) {
                let rawType = match[1].trim();
                // Chuẩn hoá các tên thường gặp
                if (/100k?|100\.000/i.test(rawType)) rawType = 'PMH 100K';
                else if (/200k?|200\.000/i.test(rawType)) rawType = 'PMH 200K';
                else if (/500k?|500\.000/i.test(rawType)) rawType = 'PMH 500K';
                else if (/50k?|50\.000/i.test(rawType)) rawType = 'GIẢM 50K';
                couponType = rawType;
            }
        }

        // 4. Tìm tên Quản lý / người xin
        if (!managerName && (lower.includes('quản lý') || lower.includes('ql') || lower.includes('người xin') || lower.includes('tên:'))) {
            const match = line.match(/(?:quản lý|ql|người xin|tên)[\s:.-]*(.+)/i);
            if (match && match[1]) {
                managerName = match[1].trim();
            }
        }
    }

    // Nếu không trích xuất được theo nhãn, thử regex mẫu toàn văn
    if (!orderId) {
        const mdhDirectMatch = text.match(/\b([0-9]{8,15})\b/);
        if (mdhDirectMatch) orderId = mdhDirectMatch[1];
    }

    if (!couponType) {
        if (/100k|100\.000/i.test(text)) couponType = 'PMH 100K';
        else if (/200k|200\.000/i.test(text)) couponType = 'PMH 200K';
        else if (/500k|500\.000/i.test(text)) couponType = 'PMH 500K';
    }

    const isValid = Boolean(orderId && couponType);
    let errorMessage: string | undefined;

    if (!isValid) {
        const missing: string[] = [];
        if (!orderId) missing.push('MĐH Áp dụng');
        if (!couponType) missing.push('Loại PMH');
        errorMessage = `Thiếu thông tin: ${missing.join(', ')}`;
    }

    return {
        isValid,
        warehouse,
        orderId,
        couponType,
        managerName,
        rawText: text,
        errorMessage
    };
}

/**
 * Tách nội dung tin nhắn chuyển tiếp thành từng khối chứa "➜ PMH" hoặc "-> PMH"
 */
export function parsePmhBlocks(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

    // 1. Tách theo vạch ngăn cách phổ biến (━━━, ───, ===, ---)
    let rawBlocks = text.split(/[━─—\-\=_~]{3,}/).map(b => b.trim()).filter(Boolean);

    // 2. Nếu không có vạch ngăn cách mà có nhiều "➜ PMH" / "-> PMH" hoặc "➜ ❌", tách thông minh theo từng khối phát mã
    const hasMultipleEntries = (text.match(/(?:➜|->|=>|►|•)\s*(?:PMH|phiếu|[❌⚠️])|^\s*[❌⚠️]/giu) || []).length > 1;
    if (rawBlocks.length <= 1 && hasMultipleEntries) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const entries: string[] = [];
        let currentEntry: string[] = [];
        let currentHasResult = false;

        for (const line of lines) {
            const isResultLine = /(?:➜|->|=>|►|•)\s*(?:PMH|phiếu|[❌⚠️])|\bPMH\s*[:\s]|^\s*[❌⚠️]/iu.test(line);

            // Nếu khối hiện tại đã có dòng kết quả rồi mà gặp dòng mới tiếp theo -> Bắt đầu khối mới
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

    // 3. Lọc chỉ giữ các khối có chứa kết quả PMH hoặc lỗi/thông báo (ví dụ: ➜ ❌ MĐH Áp Dụng Thiếu Hoặc Sai Cú Pháp.)
    return rawBlocks.filter(block => {
        const hasPmh = /(?:➜|->|=>|►|•)?\s*(?:PMH|phiếu)/i.test(block) || /\bPMH\b/i.test(block);
        const hasError = /(?:➜|->|=>|►|•|^\s*)\s*[❌⚠️🚫❗⛔]/u.test(block) || /(?:➜|->|=>|►|•)\s*(?:thiếu|sai|lỗi|không|mđh)/i.test(block);
        if (!hasPmh && !hasError) return false;
        if (block.includes('Hãy chuyển tiếp tin nhắn này') && !block.includes(':') && !hasError) return false;
        return true;
    });
}

/**
 * TỰ LỌC PMH: Kiểm tra xem một khối mã PMH có thuộc về người dùng đang chuyển tiếp không
 */
export function isBlockBelongToUser(block: string, candidateNames: string[]): boolean {
    if (!block || !candidateNames || candidateNames.length === 0) return false;

    const normalizedBlock = block.normalize('NFC').toLowerCase();

    for (const name of candidateNames) {
        if (!name || name.trim().length < 2) continue;
        const normName = name.normalize('NFC').toLowerCase().trim();

        // Khớp tên nguyên cụm (ví dụ: "Lê Trường Sơn", "Sơn", "CTH-AN-33747-BOSS")
        if (normalizedBlock.includes(normName)) {
            return true;
        }

        // Khớp từng từ nếu tên có nhiều hơn 1 từ (ví dụ: "Sơn", "Lê Sơn")
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
 * Bóc tách chi tiết từng khối mã PMH (Hỗ trợ cả mã thành công và thông báo lỗi ❌)
 */
export function parsePmhBlockDetails(block: string): {
    recipient: string;
    typeOrProduct: string;
    code: string;
    orderId?: string;
    rawBlock: string;
    revokedCode?: string;
    isReissue?: boolean;
    compactBlock?: string;
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
    const allCodes: Array<{
        typeOrProduct: string;
        code: string;
        revokedCode?: string;
        orderId?: string;
        rawLine?: string;
    }> = [];

    // Tìm MĐH trên toàn khối (hỗ trợ cả trường hợp rớt dòng hoặc ngắt dòng)
    const blockMdhMatch = block.match(/(?:mđh\s*(?:áp dụng)?|mdh|đơn hàng|trùng\s*mđh)[\s:.\-\r\n]*([A-Za-z0-9_-]{6,30})/i);
    if (blockMdhMatch) {
        orderId = blockMdhMatch[1].trim();
    }

    for (const line of lines) {
        const lower = line.toLowerCase();

        if (lower.includes('thu hồi') || lower.includes('cấp lại') || lower.includes('trùng')) {
            isReissue = true;
        }

        // 1. Dòng chứa mã coupon mới: ➜ PMH <Loại>: <Mã> hoặc ➜ PMH: <Mã> hoặc PMH: <Mã>
        const pmhMatch = line.match(/(?:➜|->|=>|►|•)?\s*(?:pmh|phiếu)\s*([^:]*?)\s*:\s*([A-Za-z0-9_-]{4,40})/i);
        if (pmhMatch) {
            const rawType = pmhMatch[1].trim();
            if (rawType && !typeOrProduct) {
                typeOrProduct = rawType;
            }
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

        // 2. Tìm mã thu hồi cũ nếu có: "JV4FL9I14N" hoặc (Thu hồi: ...)
        const revokeMatch = line.match(/(?:thu hồi|đã thu hồi|mã cũ)[\s:.-]*(?:mã\s*)?[:.-]*\s*["'\(]?([A-Za-z0-9_-]{4,40})["'\)]?/i);
        if (revokeMatch && !revokedCode) {
            revokedCode = revokeMatch[1].trim();
        }

        // 3. Dòng loại sản phẩm: Loại PMH: ... hoặc Sản phẩm: ...
        if (!typeOrProduct && (lower.includes('loại pmh') || lower.includes('loai pmh') || lower.includes('sản phẩm') || lower.startsWith('sp:'))) {
            const m = line.match(/(?:loại\s*(?:pmh)?|sản phẩm|sp)[\s:.-]+(.+)/i);
            if (m) typeOrProduct = m[1].trim();
            continue;
        }

        // 4. Dòng MĐH: MĐH Áp dụng: ... hoặc MĐH: ...
        if (!orderId && (lower.includes('mđh') || lower.includes('mdh') || lower.includes('đơn hàng'))) {
            const m = line.match(/(?:mđh\s*(?:áp dụng)?|mdh|đơn hàng)[\s:.-]*([A-Za-z0-9_-]{4,25})/i);
            if (m) orderId = m[1].trim();
            continue;
        }

        // 5. Nếu chưa có người nhận và dòng KHÔNG chứa các từ khoá hệ thống/thu hồi
        const isSystemLine = lower.includes('pmh') ||
            lower.includes('mđh') ||
            lower.includes('áp dụng') ||
            lower.includes('kho') ||
            lower.includes('loại') ||
            lower.includes('thu hồi') ||
            lower.includes('cấp lại') ||
            lower.includes('trùng') ||
            lower.includes('chuyển tiếp') ||
            lower.includes('lưu ý') ||
            lower.includes('chú ý') ||
            (orderId && line.includes(orderId)) ||
            /^[A-Za-z0-9_-]{6,30}\)?$/.test(line);

        if (!recipient && !isSystemLine) {
            recipient = line.replace(/^[@👤ℹ️🔄\s]+/, '').trim();
        }
    }

    // Fallback: Tìm dòng không phải dòng hệ thống
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

    // Tạo phiên bản làm gọn 2 dòng
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
        isReissue,
        compactBlock,
        rawBlock: block,
        allCodes
    };
}

/**
 * Lọc toàn diện các khối PMH theo danh sách tên người dùng được cấu hình
 */
export function filterPmhByUsers(text: string, candidateNames: string[]): PmhFilterResult {
    const allBlocks = parsePmhBlocks(text);
    const cleanNames = (candidateNames || []).map(n => (n || '').trim()).filter(Boolean);

    if (cleanNames.length === 0) {
        return {
            totalBlocks: allBlocks.length,
            matchedBlocks: [],
            matchedCodes: [],
            summaryMessage: 'Chưa có cấu hình tên người nhận để lọc PMH.'
        };
    }

    const matchedBlocks: string[] = [];
    const matchedCodes: PmhFilterResult['matchedCodes'] = [];

    for (const block of allBlocks) {
        if (isBlockBelongToUser(block, cleanNames)) {
            matchedBlocks.push(block);
            matchedCodes.push(parsePmhBlockDetails(block));
        }
    }

    const summaryMessage = formatFilteredPmhMessage(matchedBlocks, cleanNames);

    return {
        totalBlocks: allBlocks.length,
        matchedBlocks,
        matchedCodes,
        summaryMessage
    };
}

/**
 * Tạo tin nhắn trả lời chuẩn cho BOT khi lọc mã thành công (Rút gọn và gôm mã theo người nhận)
 */
export function formatFilteredPmhMessage(matchedBlocks: string[], candidateNames: string[]): string {
    const nameLabel = candidateNames.slice(0, 3).join(', ') + (candidateNames.length > 3 ? '...' : '');

    if (!matchedBlocks || matchedBlocks.length === 0) {
        return `🔍 BOT KHÔNG TÌM THẤY MÃ PMH\n━━━━━━\nKhông có mã PMH nào thuộc về [${nameLabel}] trong tin nhắn chuyển tiếp này.\n👉 Vui lòng kiểm tra lại tên cấu hình trên Dashboard YCX.`;
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

    return msg.trim();
}

/**
 * Tự động bóc tách danh sách mã PMH từ văn bản dán (Paste)
 * Nhận diện linh hoạt:
 * - Tên sản phẩm từ cụm 'dùng cho <Tên sản phẩm>:'
 * - Mã Coupon là chuỗi chữ-số liền nhau sau dấu ':' cuối cùng (hoặc dòng liền kề nếu ngắt dòng)
 * - Tự động loại bỏ dòng trống, hỗ trợ danh sách nhiều mã cùng 1 sản phẩm
 */
export function parsePastedCouponList(
    text: string,
    defaultType: string = 'Event',
    onDuplicate?: (skippedCode: string) => void
): ParsedImportItem[] {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split(/\r?\n/).map(l => l.trim());
    const items: ParsedImportItem[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Bỏ qua dòng phân cách hoặc tiêu đề khối
        if (/^(?:[-━═=_*~]{3,}|\[.+\])$/.test(line)) continue;

        let rawCode = '';
        let productName = '';

        // 1. Trích xuất tên sản phẩm (nếu có)
        // Tìm pattern: 'dùng cho <tên sp>:' hoặc 'cho sp <tên sp>:'
        const prodMatch = line.match(/(?:dùng cho|cho sp|cho sản phẩm|sản phẩm)\s+([^:\r\n]+?)(?::|$)/i);
        if (prodMatch && prodMatch[1]) {
            productName = prodMatch[1].trim();
        }

        // 2. Tìm mã sau dấu ':' cuối cùng
        const lastColonIdx = line.lastIndexOf(':');
        if (lastColonIdx !== -1) {
            const afterColon = line.substring(lastColonIdx + 1).trim();

            if (afterColon) {
                // Lấy token chữ-số liền nhau đầu tiên sau dấu ':'
                const tokenMatch = afterColon.match(/^([A-Za-z0-9_-]{4,40})/);
                if (tokenMatch) {
                    rawCode = tokenMatch[1];
                } else if (/^[A-Za-z0-9_-]+$/.test(afterColon)) {
                    rawCode = afterColon;
                }
            } else {
                // Sau dấu ':' bị trống (do ngắt dòng xuống dòng kế tiếp)
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    // Dòng kế tiếp là chuỗi mã độc lập (không có dấu ':')
                    if (nextLine && !nextLine.includes(':')) {
                        const tokenMatch = nextLine.match(/^([A-Za-z0-9_-]{4,40})/);
                        if (tokenMatch) {
                            rawCode = tokenMatch[1];
                            i++; // Đã tiêu thụ dòng mã
                        }
                    }
                }
            }
        }

        // 3. Fallback: Nếu không có dấu ':' hoặc chưa lấy được mã
        if (!rawCode) {
            const parts = line.split(/[,\t|]/).map(p => p.trim());
            const firstPart = parts[0];
            if (firstPart && /^[A-Za-z0-9_-]{3,40}$/.test(firstPart)) {
                rawCode = firstPart;
            }
        }

        if (rawCode && rawCode.length >= 3) {
            const upperCode = rawCode.toUpperCase();
            if (seenCodes.has(upperCode)) {
                if (onDuplicate) onDuplicate(upperCode);
                continue; // Tự động loại bỏ mã trùng lặp trong cùng danh sách nạp
            }
            seenCodes.add(upperCode);

            const autoSyntax = extractProductSyntax(productName);
            items.push({
                code: upperCode,
                productName: productName || '',
                type: defaultType,
                syntax: autoSyntax || productName || ''
            });
        }
    }

    return items;
}

/**
 * Làm sạch và chuẩn hoá ứng viên model từ token
 */
function cleanModelCandidate(tok: string): string {
    let s = tok.replace(/^[^\w]+|[^\w]+$/g, '');
    // Bỏ hậu tố trong ngoặc đơn như (N), (W), (K) nếu còn dính
    s = s.replace(/\([A-Za-z0-9]+\)$/, '');
    // Bỏ tiền tố 1-3 chữ cái + gạch ngang (như RC-, CH-, NR-) nếu phần còn lại >= 4 ký tự
    // Nếu phần còn lại < 4 (như KAD-X68 -> X68), thì giữ nguyên toàn bộ model KAD-X68
    const strippedPrefix = s.replace(/^[A-Za-z]{1,3}-/, '');
    if (strippedPrefix.length >= 4) {
        s = strippedPrefix;
    }
    // Bỏ hậu tố gạch ngang + 1-2 chữ cái (như -C, -VN)
    s = s.replace(/-[A-Za-z]{1,2}$/, '');
    return s;
}

/**
 * Tự động trích xuất mã/tên cú pháp đại diện cho sản phẩm.
 * Ưu tiên trích xuất model code ngắn gọn nếu có (VD: "SHD4607", "18JH1TVN", "KG20IH10N", "5H03P36", "KG40EH2").
 * Nếu không tìm thấy model thì fallback về toàn bộ tên sản phẩm.
 */
export function extractProductSyntax(name: string): string {
    if (!name || typeof name !== 'string') return '';
    const clean = name.trim();

    // Tách các từ, loại bỏ dấu ngoặc
    const tokens = clean.replace(/[\(\)\[\]\{\}]/g, ' ').split(/[\s,]+/);

    const candidates: string[] = [];
    for (const rawTok of tokens) {
        const tok = cleanModelCandidate(rawTok);

        // Bỏ qua đơn vị đo lường: e.g. "2L", "4L", "6.5L", "24cm", "1.8L", "1000W"
        if (/^\d+(\.\d+)?[LlMmKkGgWwCc]$/i.test(tok) || /^\d+cm$/i.test(tok) || /^\d+lit$/i.test(tok) || /^\d+w$/i.test(tok)) {
            continue;
        }

        // Model chuẩn: chứa cả chữ và số, độ dài từ 4 đến 25 ký tự
        if (/[A-Za-z]/.test(tok) && /\d/.test(tok) && tok.length >= 4 && tok.length <= 25) {
            candidates.push(tok);
        }
    }

    if (candidates.length > 0) {
        // Sắp xếp ưu tiên candidate dài hơn và có tính đặc thù hơn
        candidates.sort((a, b) => b.length - a.length);
        return candidates[0];
    }

    return clean;
}

export interface CouponSummaryItem {
    productName?: string;
    syntax?: string;
    type?: string;
    status?: string;
}

/**
 * Format tin nhắn cho lệnh "cp" (Danh sách cú pháp đăng ký của tất cả sản phẩm)
 */
export function formatSyntaxListMessage(
    coupons: CouponSummaryItem[],
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
                syntax: syntax || `[ĐĂNG KÝ PMH] ${prodName}\nKho: 910\nMĐH: 12345678\nQuản lý: Họ và Tên`
            });
        } else if (!existing.syntax && syntax) {
            existing.syntax = syntax;
        }
    }

    if (productMap.size === 0) {
        const defaultSyntax = fallbackSyntax || `[ĐĂNG KÝ PMH]\nKho: 910\nMĐH: 12345678\nLoại: PMH 100K\nQuản lý: Họ và Tên`;
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

export type CouponCategory = 'EVENT' | 'GVGS' | 'ALL';

/**
 * Kiểm tra mã thuộc nhóm PMH Event
 * (Bao gồm Event, Event Cuối Tuần, Event Lớn để tương thích ngược)
 */
export function isEventCategory(type?: string): boolean {
    if (!type) return false;
    const t = type.toLowerCase().trim();
    return t === 'event' || t.startsWith('event') || t.includes('cuối tuần') || t.includes('cuoi tuan') || t.includes('event lớn') || t.includes('event lon');
}

/**
 * Kiểm tra mã thuộc nhóm PMH Giờ Vàng Giá Sốc
 * (Bao gồm Giờ Vàng Giá Sốc, Giờ Vàng, GVGS, GV)
 */
export function isGvgsCategory(type?: string): boolean {
    if (!type) return false;
    const t = type.toLowerCase().trim();
    return t.includes('giờ vàng') || t.includes('gio vang') || t.includes('gvgs') || t === 'gv' || t.startsWith('gv');
}

/**
 * Lọc danh sách coupon theo nhóm Event hoặc Giờ Vàng Giá Sốc
 */
export function filterCouponsByCategory(coupons: CouponSummaryItem[], category?: CouponCategory): CouponSummaryItem[] {
    if (!category || category === 'ALL') return coupons;
    if (category === 'EVENT') {
        return coupons.filter(c => isEventCategory(c.type));
    }
    if (category === 'GVGS') {
        return coupons.filter(c => isGvgsCategory(c.type));
    }
    return coupons;
}

export interface ProductInventoryItem {
    index: number;
    productName: string;
    total: number;
    unused: number;
    category?: string;
}

/**
 * Trích xuất danh sách tồn kho theo từng sản phẩm có đánh số thứ tự (1, 2, 3...) chuẩn xác
 * Hỗ trợ lọc theo loại category ('EVENT' | 'GVGS' | 'ALL')
 */
export function getProductInventoryList(
    coupons: CouponSummaryItem[],
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

export interface CouponClaimSelection {
    isSelection: boolean;
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
export function parseCouponClaimCommand(text: string): CouponClaimSelection {
    if (!text || typeof text !== 'string') return { isSelection: false, isClaim: false };
    const clean = text.trim();

    // 1. Khớp lệnh nhận mã Event: "e1", "e 2", "event 1", "e1 01602SO26090873565", "e2: 12345678"
    const eventMatch = clean.match(/^(?:e|event)\s*(\d{1,3})(?:[\s:.-]+([A-Za-z0-9_-]{4,30}))?$/i);
    if (eventMatch) {
        const index = parseInt(eventMatch[1], 10);
        if (!isNaN(index) && index >= 1 && index <= 99) {
            return {
                isSelection: true,
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
                isSelection: true,
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
                isSelection: true,
                isClaim: false,
                isBareNumber: true,
                productIndex: index,
                orderId: bareMatch[2] ? bareMatch[2].trim() : undefined
            };
        }
    }

    return { isSelection: false, isClaim: false };
}

/**
 * Tương thích ngược với parseProductNumberSelection
 */
export function parseProductNumberSelection(text: string): {
    isSelection: boolean;
    productIndex?: number;
    orderId?: string;
} {
    const res = parseCouponClaimCommand(text);
    return {
        isSelection: res.isSelection,
        productIndex: res.productIndex,
        orderId: res.orderId
    };
}

/**
 * Format tin nhắn cho lệnh "tk", "tk event", "tk gvgs"
 */
export function formatInventoryReportMessage(
    coupons: CouponSummaryItem[],
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

