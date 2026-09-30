import toast from 'react-hot-toast';
import { capPixelRatioForArea, isMobileLikeDevice } from '../../../utils/dataUtils';
import { deliverImage } from '../../../components/shared/ui/imageDelivery';

/**
 * Chụp một vùng DOM thành PNG rồi mở trình chia sẻ hệ thống (Zalo/Line trên điện thoại);
 * máy không hỗ trợ chia sẻ file thì tải ảnh về. html2canvas nạp động để không nặng bundle
 * ban đầu của tab.
 *
 * Audit A07 (2026-09-30): tỉ lệ 2 cố định vượt trần diện tích canvas iOS với danh sách khách hàng
 * dài (ảnh trắng); thu hồi blob URL ngay (Safari tải hỏng); Safari từ chối chia sẻ sau khi dựng ảnh
 * lâu thì báo lỗi thay vì cho chạm lại. Nay: trần diện tích + khâu giao ảnh chung.
 */
export async function shareElementAsImage(element: HTMLElement | null, filename: string, title: string): Promise<void> {
    if (!element) {
        toast.error('Không tìm thấy vùng cần chụp');
        return;
    }
    const toastId = toast.loading('Đang tạo ảnh…');
    try {
        const { default: html2canvas } = await import('html2canvas');
        const rect = element.getBoundingClientRect();
        const width = Math.max(rect.width, element.scrollWidth);
        const height = Math.max(rect.height, element.scrollHeight);
        const scale = isMobileLikeDevice() ? capPixelRatioForArea(width, height, 2) : 2;
        const canvas = await html2canvas(element, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Không tạo được ảnh');

        // Luôn thử chia sẻ trước khi thiết bị hỗ trợ (giữ hành vi cũ của module này), không được thì tải.
        const result = await deliverImage(blob, filename, { share: true, title });
        if (result === 'shared') toast.success('Đã mở trình chia sẻ', { id: toastId });
        else if (result === 'downloaded') toast.success('Đã tải ảnh về máy', { id: toastId });
        else toast.dismiss(toastId); // huỷ, hoặc đã hiện nút "Chia sẻ / Lưu ảnh" để chạm lại
    } catch (e) {
        toast.error(`Lỗi xuất ảnh: ${(e as Error).message}`, { id: toastId });
    }
}

export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
