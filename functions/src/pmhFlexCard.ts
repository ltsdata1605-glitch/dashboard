import { formatPmhLabel } from './pmhSequence';

/**
 * Tạo LINE Flex Message Card cấp mã coupon
 * Tích hợp action: 'uri' mở LIFF để tự động copy mã coupon
 */
export function createCouponFlexBubble(params: {
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
    /** Thẻ đến từ đâu: 'filter' = lọc danh sách PMH dán vào nhóm → tiêu đề "LỌC PMH {loại}"; 'stock' = cấp mã từ kho → tiêu đề "MÃ COUPON {loại}". */
    source?: 'filter' | 'stock';
}) {
    const cleanCode = String(params.code || '').trim();
    const lowerCat = (params.categoryLabel || '').toLowerCase();
    let headerColor = '#0EA5E9'; // Sky blue
    if (lowerCat.includes('event')) headerColor = '#06C755';
    else if (lowerCat.includes('giờ vàng') || lowerCat.includes('gvgs') || lowerCat.includes('gio vang')) headerColor = '#0D9488';
    else if (lowerCat.includes('vivo')) headerColor = '#0EA5E9';
    else if (lowerCat.includes('honor')) headerColor = '#2563EB';
    else if (lowerCat.includes('samsung')) headerColor = '#4F46E5';
    else if (lowerCat.includes('apple') || lowerCat.includes('iphone')) headerColor = '#475569';
    else if (lowerCat.includes('oppo')) headerColor = '#10B981';
    else if (lowerCat.includes('xiaomi')) headerColor = '#EA580C';

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
        // Nút "Chạm để copy" nền xanh đặc
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

export function createCouponFlexMessage(params: {
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
export function createFilteredPmhFlexMessages(matchedItems: Array<{
    recipient: string;
    productName: string;
    categoryLabel: string;
    code: string;
    orderId?: string;
    warningSuffix?: string;
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
