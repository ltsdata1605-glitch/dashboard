import { CheckThuongStoreSummary } from '../types';

export interface ExportImageOptions {
    stores: CheckThuongStoreSummary[];
    limit?: number;
    channel?: string;
    customTitle?: string;
    fileName?: string;
    fontName?: string;
}

export async function exportLeaderboardToImage({
    stores,
    limit,
    channel = 'ALL',
    customTitle,
    fileName,
    fontName = 'UTM Avo'
}: ExportImageOptions): Promise<void> {
    const listToExport = limit ? stores.slice(0, limit) : stores;
    if (listToExport.length === 0) {
        throw new Error('Không có dữ liệu siêu thị để xuất ảnh!');
    }

    // Chiều rộng tối ưu vừa vặn cho màn hình điện thoại (khoảng 450px)
    const TARGET_WIDTH = 450;

    // 1. Wrapper container ẩn ngoài màn hình
    const wrapper = document.createElement('div');
    wrapper.id = 'check-thuong-export-wrapper';
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.zIndex = '-99999';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.overflow = 'hidden';
    wrapper.style.width = `${TARGET_WIDTH}px`;

    // 2. Phần tử nội dung capture chuẩn kích thước điện thoại
    const captureTarget = document.createElement('div');
    captureTarget.id = 'check-thuong-capture-target';
    captureTarget.style.width = `${TARGET_WIDTH}px`;
    captureTarget.style.backgroundColor = '#ffffff';
    captureTarget.style.color = '#0f172a';
    captureTarget.style.fontFamily = `'${fontName}', 'UTM Avo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    captureTarget.style.padding = '12px 14px';
    captureTarget.style.boxSizing = 'border-box';
    captureTarget.style.display = 'block';
    captureTarget.style.border = '1.5px solid #cbd5e1';
    captureTarget.style.borderRadius = '12px';
    captureTarget.style.overflow = 'hidden';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const dateFileStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const totalBonusAll = listToExport.reduce((sum, s) => sum + s.totalBonus, 0);
    const totalBonusMil = Math.round(totalBonusAll / 1000000);

    const channelText = channel === 'ALL' ? 'Tất Cả Kênh' : `Kênh: ${channel}`;
    const displayTitle = customTitle || (channel !== 'ALL' ? `TOP ${listToExport.length} THƯỞNG CAO • KÊNH ${channel}` : `TOP ${listToExport.length} SIÊU THỊ THƯỞNG CAO`);

    let rowsHtml = '';
    listToExport.forEach((store, index) => {
        const rank = index + 1;
        const rankColor = rank === 1 ? '#d97706' : rank === 2 ? '#475569' : rank === 3 ? '#b45309' : '#64748b';
        const rankWeight = rank <= 3 ? '800' : '700';
        const bonusMil = Math.round(store.totalBonus / 1000000);
        const bgRow = index % 2 === 1 ? '#f8fafc' : '#ffffff';
        const pctColor = store.achievedPercent >= 70 ? '#059669' : store.achievedPercent >= 50 ? '#0284c7' : '#d97706';

        rowsHtml += `
            <tr style="background-color: ${bgRow}; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; line-height: 1.2;">
                <td style="padding: 4px 2px; text-align: center; font-weight: ${rankWeight}; color: ${rankColor}; width: 32px;">#${rank}</td>
                <td style="padding: 4px 2px; text-align: center; font-weight: 800; color: #0284c7; width: 42px;">${store.storeCode}</td>
                <td style="padding: 4px 6px; font-weight: 600; color: #1e293b; width: 178px; max-width: 178px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${store.storeName}</td>
                <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #059669; width: 48px; white-space: nowrap;">${store.achievedCount} <span style="color: #94a3b8; font-size: 9px; font-weight: 500;">/ ${store.totalCategories}</span></td>
                <td style="padding: 4px 3px; text-align: center; width: 66px;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
                        <span style="font-weight: 800; font-size: 10px; color: ${pctColor};">${store.achievedPercent}%</span>
                        <div style="width: 22px; height: 4px; background: #e2e8f0; border-radius: 999px; overflow: hidden; display: inline-block;">
                            <div style="width: ${Math.min(100, store.achievedPercent)}%; height: 100%; background: ${pctColor}; border-radius: 999px;"></div>
                        </div>
                    </div>
                </td>
                <td style="padding: 4px 4px; text-align: right; font-weight: 900; color: #059669; font-size: 11px; width: 48px; white-space: nowrap;">${bonusMil.toLocaleString('vi-VN')} Tr</td>
            </tr>
        `;
    });

    captureTarget.innerHTML = `
        <div style="margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-family: inherit;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 16px;">🏆</span>
                    <h1 style="margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; letter-spacing: -0.01em; text-transform: uppercase; font-family: inherit;">
                        ${displayTitle}
                    </h1>
                </div>
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 2.5px 7px; white-space: nowrap;">
                    <span style="font-size: 9px; font-weight: 700; color: #059669; text-transform: uppercase;">Tổng: </span>
                    <span style="font-size: 11.5px; font-weight: 900; color: #047857; font-family: inherit;">${totalBonusMil.toLocaleString('vi-VN')} Tr</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 3px; font-size: 9px; color: #64748b; font-family: inherit;">
                <span style="truncate; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${channelText}${fileName ? ` • ${fileName}` : ''}</span>
                <span style="color: #94a3b8; shrink-0;">${timeStr}</span>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; font-family: inherit;">
            <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #cbd5e1; font-size: 10px; text-transform: uppercase; color: #475569; letter-spacing: 0.03em; font-weight: 800; line-height: 1.2;">
                    <th style="padding: 5px 2px; text-align: center; width: 32px;">Hạng</th>
                    <th style="padding: 5px 2px; text-align: center; width: 42px;">Kho</th>
                    <th style="padding: 5px 6px; width: 178px; text-align: center;">Tên Siêu Thị</th>
                    <th style="padding: 5px 3px; text-align: center; width: 48px;">Đạt 100%</th>
                    <th style="padding: 5px 3px; text-align: center; width: 66px;">%Đạt</th>
                    <th style="padding: 5px 4px; text-align: center; width: 48px;">Thưởng</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; font-family: inherit;">
            <span>Check Thưởng • ĐMX & TGDD</span>
            <span>Hiển thị Top ${listToExport.length} dẫn đầu</span>
        </div>
    `;

    wrapper.appendChild(captureTarget);
    document.body.appendChild(wrapper);

    try {
        // Đợi fonts tải xong hoàn toàn
        if (document.fonts) {
            await document.fonts.ready;
        }
        // Đợi 1 tick để DOM tính toán đầy đủ layout
        await new Promise((resolve) => setTimeout(resolve, 150));

        const fullWidth = captureTarget.offsetWidth || TARGET_WIDTH;
        const fullHeight = captureTarget.offsetHeight || captureTarget.scrollHeight;

        const htmlToImage = await import('html-to-image');
        const dataUrl = await htmlToImage.toPng(captureTarget, {
            pixelRatio: 2.5, // Độ nét cực cao cho màn hình điện thoại
            backgroundColor: '#ffffff',
            width: fullWidth,
            height: fullHeight,
            cacheBust: true
        });

        if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 500) {
            throw new Error('Không thể tạo dữ liệu ảnh (kết quả rỗng)');
        }

        const channelSlug = (channel && channel !== 'ALL') ? `Kenh_${channel.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
        const link = document.createElement('a');
        link.download = `Top_${listToExport.length}_${channelSlug}Thuong_Cao_${dateFileStr}.png`;
        link.href = dataUrl;
        link.click();
    } finally {
        if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    }
}
