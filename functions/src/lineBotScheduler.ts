/**
 * Cloud Scheduler cho BOT LINE:
 * 1. 06h00 sáng: Báo cáo thống kê tồn kho "tk" (chỉ gửi trong nhóm được cấu hình khi còn tồn coupon).
 * 2. 22h00 tối: Báo cáo tổng kết tổng số coupon đã sử dụng trong ngày & danh sách người dùng (dạng Thẻ Flex).
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from './firebaseAdmin';
import {
    formatInventoryReportMessage,
    createInventoryReportFlexMessage,
    getVietnamTodayString
} from './lineBotWebhook';

const SCHEDULER_REGION = 'asia-southeast1';

/**
 * Gửi tin nhắn PUSH trực tiếp tới Nhóm LINE (chỉ gửi trong nhóm, không gửi riêng)
 */
async function pushLineMessages(token: string, toGroupId: string, messages: any[]): Promise<boolean> {
    if (!token || !toGroupId || !messages || messages.length === 0) return false;
    try {
        const sanitized = messages.slice(0, 5).map(m => {
            if (m.type === 'text') {
                return { type: 'text', text: String(m.text || '') };
            }
            return m;
        });

        const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                to: toGroupId,
                messages: sanitized
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('[Scheduler Push Error]', res.status, errData);
            return false;
        }
        console.info(`[Scheduler Push Success] Đã gửi ${sanitized.length} tin nhắn đến nhóm ${toGroupId}`);
        return true;
    } catch (err) {
        console.error('[Scheduler Push Exception]', err);
        return false;
    }
}

/**
 * Tạo Thẻ Flex Message Tổng kết các phiếu/coupon đã sử dụng trong ngày lúc 22h00
 */
function createDailyUsageSummaryFlexCard(params: {
    dateString: string;
    totalUsed: number;
    usedItems: Array<{
        recipient?: string;
        usedBy: string;
        code: string;
        productName: string;
        cardIndex?: number;
        usedAt: string;
    }>;
}) {
    const { dateString, totalUsed, usedItems } = params;

    // Giới hạn hiển thị tối đa 20 dòng trong thẻ, nếu nhiều hơn ghi chú thêm
    const displayItems = usedItems.slice(0, 20);

    const itemContents: any[] = displayItems.map((item, idx) => {
        const timeStr = item.usedAt ? (() => {
            try {
                return new Date(item.usedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Ho_Chi_Minh'
                });
            } catch {
                return '';
            }
        })() : '';

        const indexBadge = item.cardIndex ? `PMH ${item.cardIndex}` : `Mã #${idx + 1}`;

        return {
            type: 'box',
            layout: 'vertical',
            backgroundColor: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
            cornerRadius: 'md',
            paddingAll: '8px',
            margin: 'xs',
            contents: [
                {
                    type: 'box',
                    layout: 'horizontal',
                    alignItems: 'center',
                    contents: [
                        {
                            type: 'text',
                            text: `👤 ${item.usedBy || item.recipient || 'Nhân viên'}`,
                            size: 'xs',
                            weight: 'bold',
                            color: '#0284C7',
                            flex: 7
                        },
                        {
                            type: 'text',
                            text: timeStr ? `⏰ ${timeStr}` : '',
                            size: 'xxs',
                            color: '#64748B',
                            align: 'end',
                            flex: 3
                        }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'xxs',
                    contents: [
                        {
                            type: 'text',
                            text: `🏷️ ${indexBadge} • ${item.productName || 'PMH'}`,
                            size: 'xxs',
                            color: '#334155',
                            wrap: true,
                            flex: 8
                        },
                        {
                            type: 'text',
                            text: item.code,
                            size: 'xxs',
                            weight: 'bold',
                            color: '#059669',
                            align: 'end',
                            flex: 4
                        }
                    ]
                }
            ]
        };
    });

    if (usedItems.length > 20) {
        itemContents.push({
            type: 'text',
            text: `...và còn ${usedItems.length - 20} phiếu PMH khác đã sử dụng`,
            size: 'xxs',
            color: '#94A3B8',
            align: 'center',
            margin: 'sm'
        });
    }

    if (usedItems.length === 0) {
        itemContents.push({
            type: 'text',
            text: 'Hôm nay chưa ghi nhận phiếu PMH nào được kích hoạt sử dụng.',
            size: 'xs',
            color: '#64748B',
            align: 'center',
            margin: 'md'
        });
    }

    return {
        type: 'flex',
        altText: `🌙 Tổng kết PMH đã dùng hôm nay (${dateString}): ${totalUsed} phiếu`,
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#1E293B',
                paddingAll: '12px',
                contents: [
                    {
                        type: 'text',
                        text: '🌙 TỔNG KẾT PMH ĐÃ DÙNG HÔM NAY',
                        color: '#38BDF8',
                        weight: 'bold',
                        size: 'sm'
                    },
                    {
                        type: 'text',
                        text: `📅 Ngày ${dateString}`,
                        color: '#94A3B8',
                        size: 'xxs',
                        margin: 'xs'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '12px',
                contents: [
                    // KPI Box
                    {
                        type: 'box',
                        layout: 'horizontal',
                        backgroundColor: '#ECFDF5',
                        cornerRadius: 'lg',
                        borderWidth: '1.5px',
                        borderColor: '#10B981',
                        paddingAll: '10px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        contents: [
                            {
                                type: 'text',
                                text: '🔥 Tổng số lượng đã dùng:',
                                size: 'xs',
                                weight: 'bold',
                                color: '#065F46'
                            },
                            {
                                type: 'text',
                                text: `${totalUsed} phiếu`,
                                size: 'md',
                                weight: 'bold',
                                color: '#047857'
                            }
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'md',
                        color: '#E2E8F0'
                    },
                    {
                        type: 'text',
                        text: '📋 DANH SÁCH CHI TIẾT SỬ DỤNG:',
                        size: 'xxs',
                        weight: 'bold',
                        color: '#64748B',
                        margin: 'sm'
                    },
                    ...itemContents
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '8px',
                contents: [
                    {
                        type: 'text',
                        text: '🤖 Báo cáo tự động lúc 22:00 bởi Bot LINE Quản Lý PMH',
                        size: 'xxs',
                        color: '#94A3B8',
                        align: 'center'
                    }
                ]
            }
        }
    };
}

/**
 * 1. LỊCH ĐỊNH KỲ 6H00 SÁNG (Múi giờ Việt Nam: Asia/Ho_Chi_Minh)
 * - Kiểm tra kho tồn: Nếu CÒN TỒN coupon (UNUSED), gửi báo cáo "tk" vào nhóm đã cấu hình.
 * - Nếu kho hết sạch mã (0 coupon), tự động bỏ qua không gửi.
 */
export const dailyMorningInventoryReport = onSchedule(
    {
        schedule: '0 6 * * *',
        timeZone: 'Asia/Ho_Chi_Minh',
        region: SCHEDULER_REGION
    },
    async () => {
        console.log('[Scheduler 06:00] Bắt đầu quét báo cáo tồn kho buổi sáng...');
        try {
            const botsSnap = await db.collection('line_bots').where('active', '==', true).get();
            if (botsSnap.empty) {
                console.log('[Scheduler 06:00] Không có bot nào đang active.');
                return;
            }

            for (const botDoc of botsSnap.docs) {
                const uid = botDoc.id;
                const config = botDoc.data();
                const token = config.channelAccessToken;

                // Kiểm tra xem admin có bật thông báo sáng không (mặc định bật)
                if (config.scheduledNotifications?.morningReport === false) {
                    console.log(`[Scheduler 06:00] Bot ${uid}: Admin tắt tính năng báo cáo sáng.`);
                    continue;
                }

                // Nhóm LINE nhận tin nhắn định kỳ do Admin thiết lập
                const targetGroupId = config.scheduledGroupId;
                if (!targetGroupId) {
                    console.log(`[Scheduler 06:00] Bot ${uid}: Chưa cấu hình Nhóm nhận định kỳ (scheduledGroupId). Bỏ qua.`);
                    continue;
                }

                // Kiểm tra xem trong kho có tồn coupon nào không
                const couponsSnap = await db.collection('line_bots').doc(uid).collection('coupons').get();
                const coupons = couponsSnap.docs.map(d => d.data());
                const unusedCoupons = coupons.filter(c => c.status === 'UNUSED' || !c.status);

                // NẾU TRONG KHO HẾT SẠCH MÃ -> KHÔNG GỬI
                if (unusedCoupons.length === 0) {
                    console.log(`[Scheduler 06:00] Bot ${uid}: Kho hết sạch mã (0 coupon tồn). Bỏ qua không gửi.`);
                    continue;
                }

                // CÒN TỒN MÃ -> Tạo báo cáo "tk" dạng Flex Message
                const repEvent = formatInventoryReportMessage(coupons, 'EVENT');
                const repGvgs = formatInventoryReportMessage(coupons, 'GVGS');
                const flexMsgs: any[] = [];

                if (repEvent.products.length > 0) {
                    flexMsgs.push(createInventoryReportFlexMessage({
                        category: 'EVENT',
                        totalAll: repEvent.totalAll,
                        totalUnused: repEvent.totalUnused,
                        products: repEvent.products,
                        altText: `📊 [06:00] Tồn kho PMH Event: ${repEvent.totalUnused}/${repEvent.totalAll} mã khả dụng`
                    }));
                }

                if (repGvgs.products.length > 0) {
                    flexMsgs.push(createInventoryReportFlexMessage({
                        category: 'GVGS',
                        totalAll: repGvgs.totalAll,
                        totalUnused: repGvgs.totalUnused,
                        products: repGvgs.products,
                        altText: `📊 [06:00] Tồn kho PMH Giờ Vàng: ${repGvgs.totalUnused}/${repGvgs.totalAll} mã khả dụng`
                    }));
                }

                if (flexMsgs.length > 0) {
                    await pushLineMessages(token, targetGroupId, flexMsgs);
                }
            }
        } catch (error) {
            console.error('[Scheduler 06:00 Error]', error);
        }
    }
);

/**
 * 2. LỊCH ĐỊNH KỲ 22H00 TỐI (Múi giờ Việt Nam: Asia/Ho_Chi_Minh)
 * - Thống kê tổng số lượng phiếu/coupon đã sử dụng trong ngày hôm nay.
 * - Danh sách các bạn sử dụng (dưới dạng Thẻ Flex Message).
 * - Gửi vào Nhóm LINE được Admin thiết lập trên "Cấu Hình Bot".
 */
export const dailyEveningUsageSummary = onSchedule(
    {
        schedule: '0 22 * * *',
        timeZone: 'Asia/Ho_Chi_Minh',
        region: SCHEDULER_REGION
    },
    async () => {
        console.log('[Scheduler 22:00] Bắt đầu quét tổng kết PMH đã sử dụng trong ngày...');
        try {
            const todayVN = getVietnamTodayString(); // 'YYYY-MM-DD'
            const [y, m, d] = todayVN.split('-');
            const dateDisplay = `${d}/${m}/${y}`;

            const botsSnap = await db.collection('line_bots').where('active', '==', true).get();
            if (botsSnap.empty) {
                console.log('[Scheduler 22:00] Không có bot nào đang active.');
                return;
            }

            for (const botDoc of botsSnap.docs) {
                const uid = botDoc.id;
                const config = botDoc.data();
                const token = config.channelAccessToken;

                // Kiểm tra xem admin có bật thông báo tối không (mặc định bật)
                if (config.scheduledNotifications?.eveningReport === false) {
                    console.log(`[Scheduler 22:00] Bot ${uid}: Admin tắt tính năng tổng kết tối.`);
                    continue;
                }

                // Nhóm LINE nhận tin nhắn định kỳ do Admin thiết lập
                const targetGroupId = config.scheduledGroupId;
                if (!targetGroupId) {
                    console.log(`[Scheduler 22:00] Bot ${uid}: Chưa cấu hình Nhóm nhận định kỳ (scheduledGroupId). Bỏ qua.`);
                    continue;
                }

                const usedItemsList: Array<{
                    recipient?: string;
                    usedBy: string;
                    code: string;
                    productName: string;
                    cardIndex?: number;
                    usedAt: string;
                }> = [];

                // 1. Quét từ collection 'filtered_coupons'
                try {
                    const fSnap = await db.collection('line_bots').doc(uid).collection('filtered_coupons')
                        .where('status', '==', 'USED').get();

                    for (const docItem of fSnap.docs) {
                        const data = docItem.data();
                        const usedAt = data.usedAt || data.filteredAt || '';
                        // Kiểm tra xem thời gian sử dụng có trong ngày hôm nay không
                        if (usedAt.startsWith(todayVN) || (data.usedAt && data.usedAt.includes(todayVN))) {
                            usedItemsList.push({
                                recipient: data.recipient || '',
                                usedBy: data.usedBy || data.recipient || 'Nhân viên',
                                code: data.code || '',
                                productName: data.productName || data.categoryLabel || 'PMH',
                                cardIndex: data.cardIndex,
                                usedAt
                            });
                        }
                    }
                } catch (err) {
                    console.warn('[Scheduler 22:00] Lỗi đọc filtered_coupons:', err);
                }

                // 2. Quét từ collection 'coupons' trong kho
                try {
                    const cSnap = await db.collection('line_bots').doc(uid).collection('coupons')
                        .where('status', '==', 'USED').get();

                    for (const docItem of cSnap.docs) {
                        const data = docItem.data();
                        const usedAt = data.usedAt || data.sentAt || '';
                        if (usedAt.startsWith(todayVN)) {
                            // Tránh trùng mã đã lấy ở filtered_coupons
                            if (!usedItemsList.some(item => item.code === data.code)) {
                                usedItemsList.push({
                                    recipient: data.recipient || '',
                                    usedBy: data.usedBy || data.recipient || 'Nhân viên',
                                    code: data.code || '',
                                    productName: data.productName || data.type || 'PMH',
                                    usedAt
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[Scheduler 22:00] Lỗi đọc coupons kho:', err);
                }

                // Sắp xếp theo thời gian sử dụng mới nhất lên đầu
                usedItemsList.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());

                // Tạo Flex Card tổng kết
                const summaryFlexMessage = createDailyUsageSummaryFlexCard({
                    dateString: dateDisplay,
                    totalUsed: usedItemsList.length,
                    usedItems: usedItemsList
                });

                await pushLineMessages(token, targetGroupId, [summaryFlexMessage]);
            }
        } catch (error) {
            console.error('[Scheduler 22:00 Error]', error);
        }
    }
);
