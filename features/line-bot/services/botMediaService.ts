import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../../services/firebase';

const WEBHOOK_BASE_URL = 'https://asia-southeast1-dashboa-7e20b.cloudfunctions.net/lineBotWebhook';

export interface CompressedImageResult {
    base64: string;
    contentType: string;
    size: number;
}

/**
 * Nén ảnh bằng HTML5 Canvas client-side để giảm dung lượng file xuống dưới 200KB mà vẫn sắc nét
 */
export async function compressImage(
    file: File,
    maxWidth = 1200,
    quality = 0.85
): Promise<CompressedImageResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Không thể khởi tạo Canvas context'));
                    return;
                }

                // Vẽ ảnh lên canvas với nền trắng để tránh PNG trong suốt bị đen khi chuyển sang JPEG
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                const contentType = 'image/jpeg';
                const dataUrl = canvas.toDataURL(contentType, quality);
                const base64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

                resolve({
                    base64,
                    contentType,
                    size: Math.round((base64.length * 3) / 4)
                });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Tải ảnh trực tiếp lên Cloud (Firestore / Cloud Function Storage)
 * Trả về đường link URL HTTPS hợp lệ cho LINE Bot Webhook
 */
export async function uploadBotImage(file: File): Promise<string> {
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const compressed = await compressImage(file);

    // 1. Thử lưu trực tiếp vào Firestore collection 'bot_media'
    try {
        const docRef = doc(db, 'bot_media', mediaId);
        await setDoc(docRef, {
            id: mediaId,
            base64: compressed.base64,
            contentType: compressed.contentType,
            name: file.name,
            size: compressed.size,
            createdAt: new Date().toISOString(),
            // firestore.rules bot_media: chỉ người tạo mới xoá được (deleteBotImage)
            ownerUid: getAuth(db.app).currentUser?.uid ?? ''
        });
        return `${WEBHOOK_BASE_URL}?mediaId=${mediaId}`;
    } catch (firestoreError) {
        console.warn('Lưu bot_media trực tiếp Firestore gặp lỗi, thử gửi qua Cloud Function uploadMedia:', firestoreError);
    }

    // 2. Dự phòng: Gửi qua Cloud Function proxy
    try {
        // Máy chủ bắt buộc ID token Firebase (functions/src/lineBotWebhook.ts uploadMedia — audit S07)
        const idToken = await getAuth(db.app).currentUser?.getIdToken().catch(() => '') ?? '';
        const response = await fetch(`${WEBHOOK_BASE_URL}?action=uploadMedia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({
                mediaId,
                base64: compressed.base64,
                contentType: compressed.contentType,
                name: file.name
            })
        });

        const data = await response.json();
        if (data.success && data.url) {
            return data.url;
        }
        throw new Error(data.error || 'Lỗi không xác định khi upload ảnh');
    } catch (fallbackError: any) {
        console.error('Lỗi upload ảnh bot media:', fallbackError);
        throw new Error('Không thể tải ảnh lên: ' + (fallbackError.message || 'Lỗi kết nối'));
    }
}

/**
 * Xoá ảnh bot media nếu cần dọn dẹp
 */
export async function deleteBotImage(imageUrl: string): Promise<void> {
    try {
        const match = imageUrl.match(/mediaId=([a-zA-Z0-9_-]+)/);
        if (!match || !match[1]) return;
        const mediaId = match[1];
        const docRef = doc(db, 'bot_media', mediaId);
        await deleteDoc(docRef);
    } catch (err) {
        console.warn('Lỗi xoá bot_media:', err);
    }
}
