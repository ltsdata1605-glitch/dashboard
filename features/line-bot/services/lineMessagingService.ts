/**
 * Service tương tác với LINE Messaging API thông qua Cloud Function Proxy
 * Giải quyết triệt để lỗi "Failed to fetch" do trình duyệt chặn CORS khi gọi trực tiếp api.line.me
 */

import { getAuth } from 'firebase/auth';
import { db } from '../../../services/firebase';

export interface LineBotInfo {
    userId: string;
    basicId: string;
    displayName: string;
    pictureUrl?: string;
    chatMode: string;
    markAsReadMode: string;
}

const FIREBASE_REGION = 'asia-southeast1';
const FIREBASE_PROJECT_ID = 'dashboa-7e20b';
const CLOUD_PROXY_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/lineBotWebhook`;

/** ID token Firebase của người đang đăng nhập — server bắt buộc khi dùng bot theo botId (audit S13). */
async function currentIdToken(): Promise<string> {
    try { return (await getAuth(db.app).currentUser?.getIdToken()) ?? ''; } catch { return ''; }
}

export const lineMessagingService = {
    /**
     * Sinh Webhook URL cá nhân hoá cho Quản lý
     */
    getPersonalWebhookUrl(userId: string): string {
        return `${CLOUD_PROXY_URL}?uid=${encodeURIComponent(userId)}`;
    },

    /** Kiểm tra token ĐÃ LƯU của bot (server tự lấy token, client không cần biết). */
    async verifyBotById(botId: string): Promise<{ success: boolean; info?: LineBotInfo; error?: string }> {
        try {
            const idToken = await currentIdToken();
            const res = await fetch(`${CLOUD_PROXY_URL}?action=verifyToken`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ botId })
            });
            return await res.json();
        } catch {
            return { success: false, error: 'Không thể kết nối đến máy chủ xác thực LINE.' };
        }
    },

    /** Lưu Token/Secret mới lên server (line_bot_secrets). Chỉ chủ bot hoặc Admin; field bỏ trống = giữ nguyên. */
    async saveBotSecrets(botId: string, secrets: { channelAccessToken?: string; channelSecret?: string }): Promise<{ success: boolean; hasToken?: boolean; hasSecret?: boolean; error?: string }> {
        try {
            const idToken = await currentIdToken();
            const res = await fetch(`${CLOUD_PROXY_URL}?action=saveSecrets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ botId, ...secrets })
            });
            return await res.json();
        } catch {
            return { success: false, error: 'Không thể kết nối máy chủ để lưu Token.' };
        }
    },

    /**
     * Kiểm tra tính hợp lệ của Token và lấy thông tin Bot
     */
    async verifyBotToken(token: string): Promise<{ success: boolean; info?: LineBotInfo; error?: string }> {
        const cleanToken = (token || '').trim().replace(/^["']|["']$/g, '');
        if (!cleanToken) {
            return { success: false, error: 'Vui lòng nhập Channel Access Token' };
        }

        // 1. Thử gọi qua Firebase Cloud Function Proxy (Hỗ trợ CORS đầy đủ cho Browser)
        try {
            const res = await fetch(`${CLOUD_PROXY_URL}?action=verifyToken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: cleanToken })
            });

            if (res.ok) {
                const data = await res.json();
                return data;
            }
        } catch (cloudErr) {
            console.warn('[LineBot] Cloud Function Proxy không phản hồi, thử fallback local...', cloudErr);
        }

        // 2. Fallback sang Vite Dev Proxy (nếu đang chạy localhost với Vite)
        try {
            const res = await fetch('/api-line-proxy/v2/bot/info', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${cleanToken}`
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                return {
                    success: false,
                    error: errData.message || `Token không hợp lệ (mã lỗi HTTP ${res.status})`
                };
            }

            const info: LineBotInfo = await res.json();
            return { success: true, info };
        } catch (localErr: any) {
            return {
                success: false,
                error: 'Không thể kết nối đến máy chủ xác thực LINE (Lỗi mạng hoặc CORS). Vui lòng thử lại sau.'
            };
        }
    },

    /**
     * Gửi tin nhắn kiểm tra trực tiếp tới LINE User ID của Quản lý
     */
    async sendTestPush(target: string | { botId: string }, toUserId: string, text: string): Promise<{ success: boolean; error?: string }> {
        const cleanTo = (toUserId || '').trim();
        if (typeof target !== 'string') {
            // Bot đã lưu token ở server: gửi theo botId (không có đường dự phòng vì client không có token).
            if (!target.botId || !cleanTo) return { success: false, error: 'Thiếu Bot hoặc LINE User ID' };
            try {
                const idToken = await currentIdToken();
                const res = await fetch(`${CLOUD_PROXY_URL}?action=sendTestPush`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({ botId: target.botId, toUserId: cleanTo, text: text || '🔔 Tin nhắn kiểm tra kết nối từ Dashboard YCX thành công!' })
                });
                return await res.json();
            } catch {
                return { success: false, error: 'Lỗi mạng khi gửi tin nhắn test' };
            }
        }
        const cleanToken = (target || '').trim().replace(/^["']|["']$/g, '');
        if (!cleanToken || !cleanTo) {
            return { success: false, error: 'Thiếu Token hoặc LINE User ID' };
        }

        // 1. Thử Cloud Function Proxy
        try {
            const res = await fetch(`${CLOUD_PROXY_URL}?action=sendTestPush`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: cleanToken,
                    toUserId: cleanTo,
                    text: text || '🔔 Tin nhắn kiểm tra kết nối từ Dashboard YCX thành công!'
                })
            });

            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('[LineBot] Cloud Function Proxy sendTestPush thất bại, thử fallback...', e);
        }

        // 2. Fallback Vite Dev Proxy
        try {
            const res = await fetch('/api-line-proxy/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cleanToken}`
                },
                body: JSON.stringify({
                    to: cleanTo,
                    messages: [
                        {
                            type: 'text',
                            text: text || '🔔 Tin nhắn kiểm tra kết nối từ Dashboard YCX thành công!'
                        }
                    ]
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                return {
                    success: false,
                    error: errData.message || `Gửi tin nhắn thất bại (mã lỗi ${res.status})`
                };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: 'Lỗi mạng khi gửi tin nhắn test'
            };
        }
    },

    /**
     * Phát sóng thông báo nhanh tới tất cả người theo dõi Bot (Broadcast)
     */
    async sendBroadcast(token: string, text: string): Promise<{ success: boolean; error?: string }> {
        const cleanToken = (token || '').trim().replace(/^["']|["']$/g, '');
        if (!cleanToken) return { success: false, error: 'Thiếu Token' };

        // 1. Thử Cloud Function Proxy
        try {
            const res = await fetch(`${CLOUD_PROXY_URL}?action=sendBroadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: cleanToken,
                    text
                })
            });

            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('[LineBot] Cloud Function Proxy sendBroadcast thất bại, thử fallback...', e);
        }

        // 2. Fallback Vite Dev Proxy
        try {
            const res = await fetch('/api-line-proxy/v2/bot/message/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cleanToken}`
                },
                body: JSON.stringify({
                    messages: [{ type: 'text', text }]
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return { success: false, error: err.message || `Lỗi HTTP ${res.status}` };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Lỗi phát sóng tin nhắn' };
        }
    }
};
