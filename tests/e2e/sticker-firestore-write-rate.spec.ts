import { test, expect } from '@playwright/test';

/**
 * Kiểm chứng RUNTIME cho bản sửa hạn mức Firestore 2026-09-17 (In Sticker):
 *  1. Module sticker-event mount được sau khi sửa hooks/useStickerEventState.ts (bắt lỗi React
 *     runtime mà tsc/eslint/build KHÔNG phát hiện được). Hook này được gọi ở
 *     StickerEventApp.tsx:113, TRƯỚC cổng đăng nhập ở dòng 457, nên effect đồng bộ phiên đã chạy
 *     thật (với user = null) ngay ở màn hình đăng nhập — phần này luôn được kiểm.
 *  2. Đếm số request ghi Firestore thật trong lúc thao tác liên tục. Phần này CHỈ kiểm được khi
 *     đăng nhập được vào module sticker.
 *
 * ⚠️ GIỚI HẠN ĐÃ BIẾT (ghi lại để lần chạy sau không tưởng là test đã bao phủ hết): ngày
 * 2026-09-17 test này KHÔNG đăng nhập được — Cloud Function stickerResolveSession trả
 * `functions/internal: INTERNAL` vì bên trong nó đọc Firestore và gặp đúng tình trạng hết hạn
 * mức đang cần sửa. Chạy lại sau khi hạn mức reset (0h giờ Thái Bình Dương) để kiểm nhánh
 * đã-đăng-nhập. Muốn nhánh đó có ý nghĩa thì kho TESTCLAUDEQA phải có sẵn dữ liệu tồn kho —
 * không có dữ liệu thì displayedProducts luôn rỗng, không thao tác nào sinh ra lượt ghi.
 *
 * Tài khoản test: xem memory `reference_sticker_event_test_accounts` (kho TESTCLAUDEQA, tách biệt
 * dữ liệu thật, đã được user cho phép tạo).
 */
const STICKER_URL = '/?tab=tools-print-sticker&sub=event';
const ADMIN_USER = 'admin_test_claude_qa2';
const ADMIN_PASS = 'Test123456';

test.setTimeout(180000);

test('In Sticker mount được và không ghi Firestore dồn dập khi thao tác', async ({ page }) => {
    const pageErrors: string[] = [];
    const firestoreWrites: string[] = [];
    /** Lượt ghi document users/{uid}/state/current — thứ mục 2 thực sự đi giảm. */
    const sessionStateWrites: string[] = [];

    page.on('pageerror', (e) => pageErrors.push(e.message));

    // Firestore SDK gửi mọi lượt ghi qua kênh .../Firestore/Write/channel (WebChannel). ĐẾM SỐ
    // REQUEST Ở ĐÂY LÀ SAI THỨ CẦN ĐO: WebChannel còn có handshake/keepalive riêng, nên 1 lượt ghi
    // document không tương ứng 1 request. Phải soi payload để đếm ĐÚNG lượt ghi
    // `users/{uid}/state/current` — document mà `saveUserState()` ghi (mục 2 của bản sửa hạn mức).
    page.on('request', (req) => {
        const url = req.url();
        if (!url.includes('firestore.googleapis.com') || !url.includes('/Write/channel')) return;
        const body = req.postData() || '';
        firestoreWrites.push(`${req.method()} ${url.slice(0, 80)}`);
        // Đường dẫn trong payload WebChannel có thể bị URL-encode.
        const decoded = (() => { try { return decodeURIComponent(body); } catch { return body; } })();
        const hits = decoded.match(/state\/current/g);
        if (hits) sessionStateWrites.push(...hits);
    });

    await page.goto(STICKER_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // BƯỚC 1: qua cổng đăng nhập của APP GỐC. Không dùng tài khoản Google thật — bật Chế độ Dùng
    // Thử, đủ để `TabContent` mount `<StickerPrinterView />` (module sticker có màn đăng nhập
    // RIÊNG, dùng Firebase app riêng tên 'stickerevent').
    const demoBtn = page.getByText(/Kích hoạt Chế độ Dùng Thử/i).first();
    if (await demoBtn.isVisible().catch(() => false)) {
        await demoBtn.click();
        await page.waitForTimeout(5000);
    }
    await page.goto(STICKER_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000); // chờ lazy chunk StickerEventApp + Firebase init

    const stickerMounted = await page.getByText(/Đăng Nhập|Mã Kho|Tên đăng nhập/i).first()
        .isVisible().catch(() => false);

    // BƯỚC 2: đăng nhập vào chính module sticker. Mặc định form chọn vai trò "Nhân viên" và CHỈ
    // hiện 1 ô (User, không cần mật khẩu) — phải chọn "Admin (Quản lý)" để ô mật khẩu xuất hiện.
    let loggedIn = false;
    await page.getByText(/Admin \(Quản lý\)/i).first().click().catch(() => {});
    await page.waitForTimeout(800);
    const inputs = page.locator('input:visible:not([type="radio"])');
    const inputCount = await inputs.count();
    console.log(`[KẾT QUẢ] số ô nhập sau khi chọn vai trò Admin = ${inputCount}`);
    if (inputCount >= 2) {
        await inputs.nth(0).fill(ADMIN_USER).catch(() => {});
        await inputs.nth(1).fill(ADMIN_PASS).catch(() => {});
        await page.getByRole('button', { name: /^Đăng Nhập$/i }).first().click().catch(() => {});
        await page.waitForTimeout(20000); // warm-up Firestore WebChannel thường chậm lần đầu
    }
    loggedIn = await page.getByText(/TESTCLAUDEQA/i).first().isVisible().catch(() => false);

    // Ghi lại NGUYÊN VĂN thông báo lỗi đăng nhập (nếu có). Từ 2026-09-18, lỗi hết hạn mức phải hiện
    // thông điệp tiếng Việt rõ ràng chứ KHÔNG còn "Lỗi kết nối (functions/internal): INTERNAL" —
    // xem withQuotaMessage() trong functions/src/stickerEvent.ts.
    const errorBanner = page.locator('text=/Lỗi|hạn mức|INTERNAL/i').first();
    const errorText = await errorBanner.innerText().catch(() => '');
    console.log(`[KẾT QUẢ] thông báo lỗi đăng nhập = "${errorText.replace(/\s+/g, ' ').trim()}"`);
    console.log(`[KẾT QUẢ] module sticker đã mount = ${stickerMounted}`);

    // ---- Thao tác liên tục 15 lần rồi ngồi im 25s (dài hơn debounce cloud 20s) ----
    const writesBeforeActions = firestoreWrites.length;
    const stateWritesBefore = sessionStateWrites.length;
    for (let i = 0; i < 15; i++) {
        await page.mouse.click(5, 5).catch(() => {});
        await page.keyboard.press('Tab').catch(() => {});
        await page.waitForTimeout(150);
    }
    // Chờ 25s: dài hơn debounce cloud 20s để lượt ghi (nếu có) kịp bay đi.
    await page.waitForTimeout(25000);
    const writesDuringActions = firestoreWrites.length - writesBeforeActions;
    const stateWritesDuring = sessionStateWrites.length - stateWritesBefore;

    console.log(`[KẾT QUẢ] đăng nhập thành công = ${loggedIn}`);
    console.log(`[KẾT QUẢ] lỗi JS runtime = ${pageErrors.length} ${JSON.stringify(pageErrors.slice(0, 5))}`);
    console.log(`[KẾT QUẢ] request WebChannel Write trong 15 thao tác + 25s chờ = ${writesDuringActions} (gồm handshake/keepalive, KHÔNG phải số lượt ghi document)`);
    console.log(`[KẾT QUẢ] lượt ghi state/current trong 15 thao tác + 25s chờ = ${stateWritesDuring}`);
    console.log(`[KẾT QUẢ] tổng lượt ghi state/current cả phiên = ${sessionStateWrites.length}`);

    await page.screenshot({ path: 'test-results/sticker-write-rate.png', fullPage: true });

    // Điều kiện PHẢI đạt trong MỌI trường hợp: không có lỗi JS runtime nào từ module vừa sửa.
    expect(pageErrors.filter(m => !/quota|resource-exhausted|Quota/i.test(m))).toEqual([]);
    expect(stickerMounted).toBe(true);

    if (!loggedIn) {
        test.info().annotations.push({
            type: 'giới hạn',
            description: 'Không đăng nhập được vào module sticker (thường do Firestore hết hạn mức ' +
                '→ stickerResolveSession trả INTERNAL). Nhánh đếm lượt ghi KHÔNG được kiểm lần này.',
        });
        return;
    }

    // Đã đăng nhập: 15 thao tác trong ~2,5s rồi ngồi im 25s. Trước bản sửa, mỗi thao tác đổi
    // displayedProducts/inventoryFilters là 1 lượt ghi state/current riêng (debounce 1s). Nay
    // debounce 20s + chặn ghi lặp → nhiều nhất 1 lượt cho cả loạt.
    expect(stateWritesDuring).toBeLessThanOrEqual(1);
});
