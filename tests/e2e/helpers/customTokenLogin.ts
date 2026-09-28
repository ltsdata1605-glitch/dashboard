import type { Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Đăng nhập TÀI KHOẢN THẬT bằng custom token (2026-09-28, "Cách B"): container không qua được
 * popup Google (mật khẩu/2FA), nên một script ngoài repo dùng service account test ký custom token
 * cho `FIREBASE_TEST_UID`, ghi ra file và trỏ `E2E_CUSTOM_TOKEN_FILE` tới đó. Token hết hạn sau 1 giờ.
 *
 * CHỈ ĐỌC: `chanGhiCloud()` chặn mọi lượt ghi Firestore từ trình duyệt (kênh WebChannel
 * `Firestore/Write`) và mọi Cloud Function trừ `resolveSession` — hàm bắt buộc để vào app, nó chỉ
 * cập nhật `lastLogin`/`loginCount` như mọi lần đăng nhập bình thường.
 */
export const customTokenFile = () => process.env.E2E_CUSTOM_TOKEN_FILE || '';
export const hasCustomToken = () => !!customTokenFile() && existsSync(customTokenFile());

export const chanGhiCloud = async (page: Page) => {
    const biChan: string[] = [];
    await page.context().route(/firestore\.googleapis\.com\/.*Firestore\/Write\//, route => {
        biChan.push('Firestore/Write');
        return route.abort();
    });
    await page.context().route(/cloudfunctions\.net\/|\.run\.app\//, route => {
        const ten = new URL(route.request().url()).pathname.split('/').filter(Boolean).pop() || '';
        if (ten === 'resolveSession') return route.continue();
        biChan.push(`fn:${ten}`);
        return route.abort();
    });
    return biChan;
};

/** Mở app, đăng nhập bằng custom token qua ĐÚNG instance `auth` của app (cùng URL module Vite). */
export const dangNhapBangToken = async (page: Page) => {
    const token = readFileSync(customTokenFile(), 'utf8').trim();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async (t) => {
        // Lấy đúng URL deps đã tối ưu mà services/firebase.ts đang import, để dùng chung bản module
        // (khác `?v=` là ra bản `firebase/auth` thứ hai, không nhận instance auth của app).
        const src = await (await fetch('/services/firebase.ts')).text();
        const depUrl = src.match(/from\s+["']([^"']*firebase_auth[^"']*)["']/)?.[1];
        if (!depUrl) throw new Error('Không tìm thấy import firebase/auth trong services/firebase.ts');
        const fb = await import(/* @vite-ignore */ '/services/firebase.ts') as { auth: unknown };
        const fa = await import(/* @vite-ignore */ depUrl) as { signInWithCustomToken: (a: unknown, t: string) => Promise<unknown> };
        await fa.signInWithCustomToken(fb.auth, t);
    }, token);
};
