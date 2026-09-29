import type { Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Đăng nhập TÀI KHOẢN THẬT bằng custom token (2026-09-28, "Cách B"): container không qua được
 * popup Google (mật khẩu/2FA), nên một script ngoài repo dùng service account test ký custom token
 * cho `FIREBASE_TEST_UID`, ghi ra file và trỏ `E2E_CUSTOM_TOKEN_FILE` tới đó. Token hết hạn sau 1 giờ.
 *
 * CHỈ ĐỌC: `chanGhiCloud()` chặn mọi lượt ghi Firestore từ trình duyệt (kênh WebChannel
 * `Firestore/Write`) và mọi Cloud Function trừ `resolveSession` và `listManagedUsers` (chỉ đọc) — hàm bắt buộc để vào app, nó chỉ
 * cập nhật `lastLogin`/`loginCount` như mọi lần đăng nhập bình thường.
 */
export const customTokenFile = () => process.env.E2E_CUSTOM_TOKEN_FILE || '';
export const hasCustomToken = () => !!customTokenFile() && existsSync(customTokenFile());

export const chanGhiCloud = async (page: Page) => {
    const biChan: string[] = [];
    await page.context().route(/firestore\.googleapis\.com\/.*Firestore\/Write\//, route => {
        // Ghi lại document định ghi (nằm trong thân form-urlencoded của WebChannel).
        const than = decodeURIComponent((route.request().postData() || '').replace(/\+/g, ' '));
        // Tên document nằm trong JSON lồng (dấu nháy có thể đã escape \") — không in thân request: có token.
        const docs = [...new Set([...than.matchAll(/databases\/[^/]+\/documents\/([^"\\]+)/g)].map(m => m[1]))];
        const khoa = [...new Set([...than.matchAll(/"settingsStoreBackup"\s*:\s*\{\s*"mapValue"\s*:\s*\{\s*"fields"\s*:\s*\{(.*)/g)].map(m => [...m[1].matchAll(/"([^"]+)"\s*:\s*\{\s*"(?:mapValue|stringValue|booleanValue|integerValue|arrayValue|nullValue|doubleValue)"/g)].slice(0, 12).map(x => x[1]).join('|')))];
        biChan.push(`Firestore/Write${docs.length ? ' ' + docs.join(',') : ''}${khoa.length && khoa[0] ? ' [' + khoa.join(';') + ']' : ''}`);
        return route.abort();
    });
    await page.context().route(/cloudfunctions\.net\/|\.run\.app\//, route => {
        const ten = new URL(route.request().url()).pathname.split('/').filter(Boolean).pop() || '';
        // resolveSession: bắt buộc để vào app. listManagedUsers: chỉ đọc danh sách user cùng Kho.
        if (ten === 'resolveSession' || ten === 'listManagedUsers') return route.continue();
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
        const duongDanApp = '/services/firebase.ts'; // biến → tsc không đòi phân giải đường dẫn trình duyệt
        const fb = await import(/* @vite-ignore */ duongDanApp) as { auth: unknown };
        const fa = await import(/* @vite-ignore */ depUrl) as { signInWithCustomToken: (a: unknown, t: string) => Promise<unknown> };
        await fa.signInWithCustomToken(fb.auth, t);
    }, token);
};
