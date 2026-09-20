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
            const match = line.match(/(?:mã\s*kho\s*(?:áp\s*dụng)?|kho\s*(?:áp\s*dụng)?|siêu\s*thị|st)[\s:.-]*([A-Za-z0-9_-]{2,10})/i);
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
 * Kiểm tra xem tin nhắn có phải là Báo cáo Thống kê / Tồn kho / Phân bổ PMH hay không.
 * (Để tuyệt đối không nhận diện nhầm thành form chuyển tiếp phát mã PMH).
 */
export function isInventoryOrStatisticsReport(text: string): boolean {
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
export function isValidCouponCode(code: string): boolean {
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
 * Tách nội dung tin nhắn chuyển tiếp thành từng khối phát mã PMH hợp lệ
 */
export function parsePmhBlocks(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

    // Nếu toàn bộ tin nhắn là báo cáo thống kê / tồn kho / phân bổ -> Bỏ qua ngay lập tức
    if (isInventoryOrStatisticsReport(text)) {
        return [];
    }

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

    // 3. Lọc chỉ giữ các khối thật sự là phát mã PMH hoặc thông báo lỗi/từ chối từ BOT phát mã
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
            const foundCode = pmhMatch[2].trim();
            if (isValidCouponCode(foundCode)) {
                if (rawType && !typeOrProduct) {
                    typeOrProduct = rawType;
                }
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
    if (isInventoryOrStatisticsReport(text)) {
        return {
            totalBlocks: 0,
            matchedBlocks: [],
            matchedCodes: [],
            summaryMessage: ''
        };
    }

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
    const matchedItemsForFlex: Array<{
        recipient: string;
        productName: string;
        categoryLabel: string;
        code: string;
        orderId?: string;
        warningSuffix?: string;
    }> = [];

    for (const block of allBlocks) {
        if (isBlockBelongToUser(block, cleanNames)) {
            matchedBlocks.push(block);
            const details = parsePmhBlockDetails(block);
            matchedCodes.push(details);

            const codesToProcess = (details.allCodes && details.allCodes.length > 0)
                ? details.allCodes
                : [{
                    typeOrProduct: details.typeOrProduct,
                    code: details.code,
                    revokedCode: details.revokedCode,
                    orderId: details.orderId
                }];

            for (const item of codesToProcess) {
                if (item.code) {
                    const rawType = (item.typeOrProduct || '').trim();
                    let cat = 'EVENT';
                    if (/event/i.test(rawType)) cat = 'EVENT';
                    else if (/gv|giờ vàng/i.test(rawType)) cat = 'GIỜ VÀNG';
                    else if (rawType) cat = rawType.replace(/^pmh\s*/i, '').trim() || 'EVENT';

                    let prod = rawType || 'Phiếu mua hàng PMH';
                    if (!prod.toLowerCase().startsWith('pmh') && !prod.toLowerCase().startsWith('bếp') && !prod.toLowerCase().startsWith('nồi') && !prod.toLowerCase().startsWith('quạt') && !prod.toLowerCase().startsWith('tủ') && !prod.toLowerCase().startsWith('máy')) {
                        prod = `PMH ${prod}`;
                    }

                    matchedItemsForFlex.push({
                        recipient: details.recipient || 'Quản lý',
                        productName: prod,
                        categoryLabel: cat,
                        code: item.code,
                        orderId: item.orderId || details.orderId,
                        warningSuffix: item.revokedCode ? `(Thu hồi: ${item.revokedCode})` : undefined
                    });
                }
            }
        }
    }

    const flexMessages = createFilteredPmhFlexMessages(matchedItemsForFlex);
    const summaryMessage = formatFilteredPmhMessage(matchedBlocks, cleanNames);

    return {
        totalBlocks: allBlocks.length,
        matchedBlocks,
        matchedCodes,
        summaryMessage,
        flexMessages
    };
}

/**
 * Tạo LINE Flex Bubble Card cho 1 mã PMH (Khung đồ hoạ bo góc, viền xanh, 1-chạm copy)
 */
export function createCouponCardBubble(params: {
    displayName: string;
    productName: string;
    categoryLabel: string;
    code: string;
    orderId?: string;
    warehouse?: string;
    warningSuffix?: string;
    liffId?: string;
}) {
    const cleanCode = String(params.code || '').trim();
    const isEvent = params.categoryLabel.toLowerCase().includes('event');
    const headerColor = isEvent ? '#06C755' : '#0284C7';
    const headerTitle = `🎁 MÃ PMH ${params.categoryLabel.toUpperCase()}`;
    const cleanName = (params.displayName || 'Quản lý').replace(/^[@👤\s]+/, '').trim();

    const bodyContents: any[] = [
        {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'text',
                    text: `@${cleanName}`,
                    weight: 'bold',
                    size: 'xs',
                    color: '#0284C7',
                    flex: 8
                },
                {
                    type: 'text',
                    text: 'Đã cấp',
                    size: 'xxs',
                    color: '#06C755',
                    align: 'end',
                    weight: 'bold',
                    flex: 4
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
        // Khung bọc căn giữa giúp khung mã coupon thu gọn vừa với nội dung (fit-content)
        {
            type: 'box',
            layout: 'horizontal',
            justifyContent: 'center',
            margin: 'sm',
            contents: [
                {
                    type: 'box',
                    layout: 'vertical',
                    flex: 0,
                    backgroundColor: '#ECFDF5',
                    cornerRadius: 'lg',
                    borderWidth: '2px',
                    borderColor: '#06C755',
                    paddingStart: '18px',
                    paddingEnd: '18px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    alignItems: 'center',
                    action: params.liffId ? {
                        type: 'uri',
                        label: 'Copy & Dùng Mã',
                        uri: `https://liff.line.me/${params.liffId}?code=${encodeURIComponent(cleanCode)}&type=${encodeURIComponent(params.categoryLabel)}`
                    } : {
                        type: 'clipboard',
                        label: 'Copy Mã',
                        clipboardText: cleanCode
                    },
                    contents: [
                        {
                            type: 'text',
                            text: `➜ PMH ${params.categoryLabel} (chạm để copy)`,
                            size: 'xxs',
                            color: '#059669',
                            align: 'center'
                        },
                        {
                            type: 'text',
                            text: cleanCode,
                            weight: 'bold',
                            size: 'md',
                            color: '#0F172A',
                            align: 'center',
                            margin: 'xs'
                        }
                    ]
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
            layout: 'vertical',
            backgroundColor: headerColor,
            paddingAll: '10px',
            contents: [
                {
                    type: 'text',
                    text: headerTitle,
                    color: '#FFFFFF',
                    weight: 'bold',
                    size: 'sm'
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

/**
 * Tạo danh sách LINE Flex Messages dạng Thẻ (Bubble hoặc Carousel) cho các mã PMH lọc được
 */
export function createFilteredPmhFlexMessages(matchedItems: Array<{
    recipient: string;
    productName: string;
    categoryLabel: string;
    code: string;
    orderId?: string;
    warningSuffix?: string;
}>, liffId?: string): any[] {
    if (!matchedItems || matchedItems.length === 0) return [];

    const bubbles = matchedItems.map(item => createCouponCardBubble({
        displayName: item.recipient,
        productName: item.productName,
        categoryLabel: item.categoryLabel,
        code: item.code,
        orderId: item.orderId,
        warningSuffix: item.warningSuffix,
        liffId
    }));

    const messages: any[] = [];
    const chunkSize = 10;
    for (let i = 0; i < bubbles.length; i += chunkSize) {
        const chunk = bubbles.slice(i, i + chunkSize);
        if (chunk.length === 1 && bubbles.length === 1) {
            messages.push({
                type: 'flex',
                altText: `🎁 Mã PMH ${matchedItems[0].categoryLabel}: ${matchedItems[0].code} (${matchedItems[0].recipient})`,
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
 * Kiểm tra xem ngày hết hạn đã qua hay chưa (theo múi giờ Việt Nam)
 * Ví dụ: expiryDate là '2026-09-27'
 * - Ngày 27/09/2026: Chưa hết hạn (vẫn dùng được trọn vẹn ngày 27)
 * - Ngày 28/09/2026 trở đi: ĐÃ HẾT HẠN (tự động xoá khỏi kho)
 */
export function isDateExpired(expiryDateStr?: string, compareDateStr?: string): boolean {
    if (!expiryDateStr) return false;
    const refDate = compareDateStr || getVietnamTodayString();
    return expiryDateStr < refDate;
}

/**
 * Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY để hiển thị cho người dùng
 */
export function formatDisplayDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

/**
 * Tự động tìm và trích xuất ngày lớn nhất / muộn nhất từ đoạn văn bản (định dạng DD/MM/YYYY)
 * Trả về chuỗi dạng 'YYYY-MM-DD' hoặc null nếu không tìm thấy
 */
export function extractLatestDateFromText(text: string): string | null {
    if (!text || typeof text !== 'string') return null;
    const regex = /(?:ngày\s+)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})/gi;
    let match: RegExpExecArray | null;
    const dates: string[] = [];
    while ((match = regex.exec(text)) !== null) {
        const d = match[1].padStart(2, '0');
        const m = match[2].padStart(2, '0');
        const y = match[3];
        dates.push(`${y}-${m}-${d}`);
    }
    if (dates.length === 0) return null;
    dates.sort();
    return dates[dates.length - 1];
}

/**
 * Tạo nội dung tin nhắn thông báo mã PMH đã hết hạn sử dụng
 */
export function formatExpiredCouponNotification(
    recipientName: string,
    productName: string,
    expiryDate?: string
): string {
    const dispDate = formatDisplayDate(expiryDate);
    const tag = recipientName ? `@${recipientName}` : '';
    return [
        tag,
        `⚠️ THÔNG BÁO HẾT HẠN MÃ PMH!`,
        `Mã PMH cho sản phẩm [${productName}] đã HẾT HẠN SỬ DỤNG${dispDate ? ` (Hạn dùng đến hết ngày ${dispDate})` : ''}.`,
        `Kho đã tự động huỷ bỏ các mã này theo quy định!`
    ].filter(Boolean).join('\n');
}

/**
 * Tự động bóc tách danh sách mã PMH từ văn bản dán (Paste)
 * Nhận diện linh hoạt:
 * - Tên sản phẩm từ cụm 'dùng cho <Tên sản phẩm>:'
 * - Mã Coupon là chuỗi chữ-số liền nhau sau dấu ':' cuối cùng (hoặc dòng liền kề nếu ngắt dòng)
 * - Ngày hết hạn từ dòng hoặc truyền vào mặc định
 * - Tự động loại bỏ dòng trống, hỗ trợ danh sách nhiều mã cùng 1 sản phẩm
 */
export function parsePastedCouponList(
    text: string,
    defaultType: string = 'Event',
    onDuplicate?: (skippedCode: string) => void,
    defaultExpiryDate?: string
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
        let lineExpiry: string | undefined = undefined;

        // 0. Trích xuất ngày nếu có trên dòng (ví dụ: 'Ngày 18/09/2026 : ...')
        const dateMatch = line.match(/(?:ngày\s+)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
        if (dateMatch) {
            const d = dateMatch[1].padStart(2, '0');
            const m = dateMatch[2].padStart(2, '0');
            const y = dateMatch[3];
            lineExpiry = `${y}-${m}-${d}`;
        }

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
            const resolvedExpiry = defaultExpiryDate || lineExpiry;
            items.push({
                code: upperCode,
                productName: productName || '',
                type: defaultType,
                syntax: autoSyntax || productName || '',
                expiryDate: resolvedExpiry || undefined
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
    if (!type) return true;
    const t = type.toLowerCase().trim();
    if (isGvgsCategory(t)) return false;
    return true;
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
 * Kiểm tra xem tin nhắn có phải là lệnh yêu cầu hướng dẫn (hd / help / huong dan...) không
 */
export function isHelpCommand(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim().toLowerCase().replace(/^@[^\s]+\s*/, '');
    return /^(?:[./!]?(?:hd|help|huongdan|hướng dẫn|\?)|huong\s*dan|hdsd)$/i.test(clean);
}

/**
 * Tạo nội dung tin nhắn hướng dẫn sử dụng bot toàn diện
 */
export function formatHelpGuideMessage(): string {
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
        '• Chuyển tiếp tin nhắn gộp cho BOT để tự lọc mã tên bạn.'
    ].join('\n');
}

/**
 * Nhận diện lệnh huỷ/trả mã coupon vừa xin (nếu không dùng)
 * Cú pháp: huy [mã coupon hoặc MĐH]
 */
export function parseCancelCouponCommand(text: string): { isCancel: boolean; target?: string; isBareCancel?: boolean } {
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
 * Kiểm tra xem một coupon có khớp với từ khoá tìm kiếm / tên sản phẩm / cú pháp không
 */
export function matchesProductSearch(
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


