import toast from 'react-hot-toast';

/**
 * Chụp một vùng DOM thành PNG rồi mở trình chia sẻ hệ thống (Zalo/Line trên điện thoại);
 * máy không hỗ trợ chia sẻ file thì tải ảnh về. html2canvas nạp động để không nặng bundle
 * ban đầu của tab.
 */
export async function shareElementAsImage(element: HTMLElement | null, filename: string, title: string): Promise<void> {
    if (!element) {
        toast.error('Không tìm thấy vùng cần chụp');
        return;
    }
    const toastId = toast.loading('Đang tạo ảnh…');
    try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Không tạo được ảnh');
        const file = new File([blob], filename, { type: 'image/png' });

        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title });
                toast.success('Đã mở trình chia sẻ', { id: toastId });
                return;
            } catch (e) {
                if ((e as { name?: string }).name === 'AbortError') {
                    toast.dismiss(toastId);
                    return;
                }
                throw e;
            }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Đã tải ảnh về máy', { id: toastId });
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
