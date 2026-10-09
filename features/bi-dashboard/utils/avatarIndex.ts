// Kho tra cứu ảnh đại diện nhân viên DÙNG CHUNG cho mọi bảng Report BI.
//
// Vì sao có file này (đo 2026-10-09): tab Thi đua › Nhóm vẽ 1 AvatarDisplay cho MỖI dòng (35 chương trình × 70 nhân
// viên ≈ 2.500 cái). Trước đây mỗi cái tự đọc IndexedDB tới 7 khoá biến thể, và nhân viên chưa có ảnh (đa số) còn
// QUÉT TOÀN BỘ kho bằng getAll() — kéo cả các chuỗi báo cáo lớn lên bộ nhớ — tức ~2.500 lượt quét mỗi lần mở tab,
// làm tab đứng nhiều giây. Nay: đọc mọi khoá `avatar-*` đúng 1 lần (theo dải khoá), tra cứu trong bộ nhớ, và
// cập nhật lại khi có ai ghi/xoá một khoá avatar (sự kiện `indexeddb-change` mà db.set/deleteEntry phát ra).

import { useSyncExternalStore } from 'react';
import * as db from './db';
import { standardizeEmployeeName, extractEmployeeId } from './nhanVienHelpers';

const AVATAR_PREFIX = 'avatar-';

let index = new Map<string, string>(); // phần sau "avatar-" → ảnh
let version = 0;
let loading: Promise<void> | null = null;
let listening = false;
const listeners = new Set<() => void>();
const lookupCache = new Map<string, string | null>();

const emit = () => {
    version++;
    lookupCache.clear();
    listeners.forEach(l => l());
};

const loadAll = (): Promise<void> => {
    if (!loading) {
        loading = db.getAllByPrefix(AVATAR_PREFIX)
            .then(items => {
                const next = new Map<string, string>();
                for (const { key, value } of items) {
                    if (typeof value === 'string' && value) next.set(key.slice(AVATAR_PREFIX.length), value);
                }
                index = next;
                emit();
            })
            .catch(err => {
                console.warn('[avatarIndex] Không đọc được ảnh đại diện:', err);
                loading = null; // cho phép thử lại lần sau
            });
    }
    return loading;
};

const handleDbChange = (event: Event) => {
    const key = (event as CustomEvent<{ key?: string }>).detail?.key;
    // 'ALL' = cả kho vừa bị xoá/nạp lại (đổi tài khoản, xoá dữ liệu) → nạp lại từ đầu, không giữ ảnh của kho cũ.
    if (key === 'ALL') { resetAvatarIndex(); return; }
    if (typeof key !== 'string' || !key.startsWith(AVATAR_PREFIX)) return;
    const name = key.slice(AVATAR_PREFIX.length);
    db.get<string>(key).then(val => {
        const prev = index.get(name);
        if (typeof val === 'string' && val) {
            if (prev === val) return;
            index.set(name, val);
        } else {
            if (prev === undefined) return;
            index.delete(name);
        }
        emit();
    }).catch(() => {});
};

const ensureStarted = () => {
    if (typeof window === 'undefined') return;
    if (!listening) {
        listening = true;
        window.addEventListener('indexeddb-change', handleDbChange);
    }
    loadAll();
};

export function resetAvatarIndex() {
    index = new Map();
    loading = null;
    emit();
    if (listening) loadAll();
}

/** Ghi thẳng vào kho trong bộ nhớ (ngay khi người dùng đổi ảnh) để mọi bảng thấy ngay, không chờ đọc lại IndexedDB. */
export function primeAvatar(key: string, src: string | null) {
    const name = key.startsWith(AVATAR_PREFIX) ? key.slice(AVATAR_PREFIX.length) : key;
    if (src) index.set(name, src); else index.delete(name);
    emit();
}

/** Các khoá biến thể của 1 nhân viên, đúng thứ tự ưu tiên mà AvatarDisplay/useEmployeeAvatar vẫn dùng. */
export function avatarKeyVariants(...names: (string | undefined)[]): string[] {
    const out: string[] = [];
    const add = (k?: string) => { if (k && !out.includes(k)) out.push(k); };
    for (const n of names) { add(n); if (n) add(standardizeEmployeeName(n)); }
    for (const n of names) {
        if (!n || !n.includes(' - ')) continue;
        const parts = n.split(' - ').map(p => p.trim());
        if (parts.length >= 2) { add(`${parts[1]} - ${parts[0]}`); add(parts[0]); add(parts[1]); }
    }
    for (const n of names) { const id = n ? extractEmployeeId(n) : ''; add(id); }
    return out;
}

/** Tra ảnh đã lưu của nhân viên (đồng bộ, trong bộ nhớ). null = chưa có ảnh riêng. */
export function lookupAvatar(...names: (string | undefined)[]): string | null {
    const cacheKey = names.join('\u0001');
    const cached = lookupCache.get(cacheKey);
    if (cached !== undefined) return cached;
    let found: string | null = null;
    for (const k of avatarKeyVariants(...names)) {
        const v = index.get(k);
        if (v) { found = v; break; }
    }
    if (!found) {
        // Cùng luật dò theo mã NV như bản cũ: khoá avatar nào có mã trùng hoặc chứa mã này.
        const empId = names.map(n => (n ? extractEmployeeId(n) : '')).find(id => id && id.length >= 3);
        if (empId) {
            for (const [k, v] of index) {
                if (extractEmployeeId(k) === empId || k.includes(empId)) { found = v; break; }
            }
        }
    }
    lookupCache.set(cacheKey, found);
    return found;
}

const subscribe = (l: () => void) => {
    ensureStarted();
    listeners.add(l);
    return () => { listeners.delete(l); };
};
const getVersion = () => version;

/** Ảnh đại diện đã lưu của nhân viên — mọi component dùng chung 1 lượt đọc IndexedDB. */
export function useAvatarSrc(...names: (string | undefined)[]): string | null {
    useSyncExternalStore(subscribe, getVersion, getVersion);
    return lookupAvatar(...names);
}
