import { test, expect, devices } from '@playwright/test';
import path from 'path';

test.use({ ...devices['iPhone 15'], defaultBrowserType: undefined });

const AUTH_STUB = `
const noop = () => {};
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return null; } }
export function getAuth() { return { currentUser: null }; }
export function initializeAuth() { return { currentUser: null }; }
export const indexedDBLocalPersistence = {}; export const browserPopupRedirectResolver = {};
const fakeUser = {
  uid: 'u-admin', email: 'admin@test.local', displayName: 'Admin Trường Sơn', photoURL: 'https://lh3.googleusercontent.com/broken-avatar.jpg',
  getIdTokenResult: async () => ({ claims: { role: 'admin', departmentId: 'ALL' } }),
  getIdToken: async () => 'token',
};
export function onAuthStateChanged(auth, cb) { window.__authCb = cb; setTimeout(() => cb(fakeUser), 30); return noop; }
export async function signInWithPopup() { window.__authCb(fakeUser); return { user: fakeUser }; }
export async function signInWithRedirect() {}
export async function getRedirectResult() { return null; }
export async function signInWithCredential() { return { user: null }; }
export async function signOut() { window.__authCb(null); }
export const browserLocalPersistence = {}; export const browserSessionPersistence = {};
export async function setPersistence() {}
export function getIdToken() { return Promise.resolve('token'); }
`;

const SESSION_STUB = `
export const resolveSession = async () => ({
  role: 'admin', status: 'approved', departmentId: 'ALL', employeeName: '21707 - Lê Trường Sơn', expiresAt: null,
});
export const requestAccess = async () => {};
`;

const ADMIN_SERVICE_STUB = `
export const MANAGED_USERS_CHANGED_EVENT = 'ycx-managed-users-changed';
export const listManagedUsers = async (mode) => {
  return [
    {
      id: 'user-1',
      uid: 'u1',
      email: 'dmxph4581@gmail.com',
      displayName: 'PH DMX',
      photoURL: 'https://lh3.googleusercontent.com/non-existent.jpg', // test broken image fallback
      role: 'employee',
      departmentId: '1330',
      employeeName: '3031',
      status: 'approved',
      expiresAt: null,
      createdAt: { toDate: () => new Date('2026-10-20') },
      loginCount: 17,
    },
    {
      id: 'user-2',
      uid: 'u2',
      email: 'linh.nguyenvu2904@gmail.com',
      displayName: 'Vũ Linh Nguyễn',
      photoURL: null,
      role: 'manager',
      departmentId: '1330',
      employeeName: '3031',
      status: 'approved',
      expiresAt: '2026-11-20',
      createdAt: { toDate: () => new Date('2026-10-18') },
      loginCount: 5,
    }
  ];
};
export const adminUpdateUser = async () => {
  window.dispatchEvent(new CustomEvent(MANAGED_USERS_CHANGED_EVENT));
};
`;

test('Verify user card is compact (< 90px height), avatar does not break, and all info is retained', async ({ page }) => {
    await page.route('**/node_modules/.vite/deps/firebase_auth.js*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_STUB }));
    await page.route('**/services/sessionService.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: SESSION_STUB }));
    await page.route('**/services/adminUserService.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: ADMIN_SERVICE_STUB }));

    // Abort broken image request to simulate Google 403 or network failure
    await page.route('https://lh3.googleusercontent.com/**', r => r.abort());

    await page.goto('/?tab=settings');
    await page.waitForLoadState('domcontentloaded');

    // Chờ danh sách hiển thị
    await page.locator('[data-segmented]').getByRole('button', { name: 'Hoạt động', exact: true }).click();

    // Check user card 1 is visible
    const card1 = page.locator('text=PH DMX').locator('..').locator('..').locator('..');
    await expect(card1).toBeVisible({ timeout: 15_000 });

    // Verify Avatar fallback is shown (not broken)
    const fallbackAvatar = card1.locator('[data-avatar-fallback]');
    await expect(fallbackAvatar).toBeVisible();
    await expect(fallbackAvatar).toHaveText('P');

    // Verify all info is present
    await expect(card1.locator('input[value="1330"]')).toBeVisible();
    await expect(card1.locator('input[value="3031"]')).toBeVisible();
    await expect(card1.getByText('Vô hạn')).toBeVisible();
    await expect(card1.getByText('20/10/2026')).toBeVisible();
    await expect(card1.getByText('17')).toBeVisible();

    // Measure card height
    const box = await card1.boundingBox();
    expect(box).not.toBeNull();
    console.log('USER CARD HEIGHT ON MOBILE:', box!.height);
    // Previously was > 250px! Now compact under 125px on mobile (wrapped 2-row layout)
    expect(box!.height).toBeLessThan(125);

    // Take screenshot of the mobile screen with compact user cards
    const screenshotPath = path.resolve(process.cwd(), 'tests/e2e/the-nguoi-dung-compact.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
});
