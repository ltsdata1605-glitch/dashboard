import { toast } from '../../../components/shared/ui/toast';
import { exportElementAsImage } from '../../../components/shared/export';

/**
 * Chụp một vùng DOM thành PNG rồi mở trình chia sẻ hệ thống (Zalo/Line trên điện thoại); máy không hỗ trợ
 * chia sẻ file thì tải ảnh về.
 *
 * Kế hoạch "Hợp nhất xuất ảnh" (2026-10-01): trước đây chỉ nơi này dùng html2canvas (thư viện chụp thứ 2 của
 * dự án) + toast "Đang tạo ảnh…" riêng. Nay đi qua bộ xuất ảnh chung, bộ quy tắc 'raw' (giữ nguyên bố cục như
 * màn hình): cùng bảng chờ, chân ảnh, trần canvas iOS (audit A07) và khâu giao ảnh như mọi khu vực.
 */
export async function shareElementAsImage(element: HTMLElement | null, filename: string, title: string): Promise<void> {
    if (!element) {
        toast.error('Không tìm thấy vùng cần chụp');
        return;
    }
    // Luôn thử chia sẻ trước khi thiết bị hỗ trợ (giữ hành vi cũ của module này), không được thì tải.
    const blob = await exportElementAsImage(element, filename, { preset: 'raw', mode: 'share', progressTitle: title });
    if (!blob) toast.error('Lỗi xuất ảnh: không tạo được ảnh');
}

export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
