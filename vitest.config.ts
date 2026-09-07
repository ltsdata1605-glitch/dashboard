import { defineConfig } from 'vitest/config';

/**
 * Test đơn vị cho TẦNG TÍNH TOÁN (utils/dataUtils.ts, services/*Service.ts, parser dữ liệu dán) —
 * "lưới an toàn" trước khi sửa bất cứ gì chạm vào số liệu doanh thu (KE_HOACH_TONG_THE.md đợt 0).
 *
 * Tách riêng khỏi Playwright: file test đơn vị đặt cạnh source (`*.test.ts`), Playwright chỉ nhìn
 * `tests/e2e/*.spec.ts` (xem `playwright.config.ts` testDir) — hai bộ không giẫm lên nhau.
 * Không cần plugin react/tailwind của vite.config.ts vì các hàm test là TS thuần, không render JSX.
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/*.test.ts'],
        exclude: ['node_modules/**', 'dist/**', 'archive/**', '_archive/**', 'functions/**', 'price-scraper-server/**', 'telegram-agent/**'],
        css: false,
    },
});
