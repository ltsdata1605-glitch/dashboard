import React, { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { IconName } from './icon/iconRegistry';
import type { ActionMenuItem } from './ActionMenu';

/**
 * HÀNH ĐỘNG CỦA TRANG — màn nào đang hiện thì KHAI BÁO tiêu đề + nút của nó, khung app tự vẽ (KE_HOACH_GIAO_DIEN_APPLE.md
 * mục 3.2 — GĐ3, 2026-10-11).
 *
 * Thay cho 7 nơi `createPortal` thẳng vào `#mobile-topbar-actions` / `#global-header-actions`: mỗi màn tự nhét bao nhiêu nút
 * tuỳ ý → 440px chứa 7 nút là chồng nhau (lỗi #1). Nay khung app (MobileNavBar trên iPhone, PageHeader trên laptop) quyết
 * định cách xếp: tối đa 1 nút chính + nút "⋯" chứa phần còn lại — cùng một dữ liệu cho cả 2 kích cỡ màn.
 *
 *   usePageActions(isActive ? { title: 'Phân tích', primary: {…}, items: [...] } : null);
 *
 * - Màn ẩn (tab không hiện) truyền `null` → gỡ khai báo. Nhiều màn cùng khai báo thì màn khai báo SAU CÙNG thắng.
 * - Hàm xử lý (`onSelect`/`onClick`) luôn là bản MỚI NHẤT của màn (đọc qua ref) — khung app không giữ closure cũ.
 * - Khung chỉ vẽ lại khi phần NHÌN THẤY đổi (tiêu đề, nhãn, icon, trạng thái tắt) — không vẽ lại theo mỗi lần màn render.
 * Hai context tách riêng: màn chỉ dùng phần "đăng ký" (không bao giờ đổi) → khai báo không làm chính màn đó vẽ lại.
 */
export interface PagePrimaryAction {
  id: string;
  label: string;
  icon?: IconName;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
}

export interface PageActionsConfig {
  title?: string;
  subtitle?: string;
  primary?: PagePrimaryAction;
  /** Nút icon hiện thẳng ra ngoài (tối đa 2 — thừa thì khung app dồn vào "⋯"). */
  quick?: ActionMenuItem[];
  /** Mọi thao tác còn lại — vào menu "⋯". Mục `destructive` tự xuống nhóm cuối, chữ đỏ. */
  items?: ActionMenuItem[];
}

interface Entry { owner: string; get: () => PageActionsConfig | null; sig: string }

interface Registry {
  set: (owner: string, get: () => PageActionsConfig | null, sig: string) => void;
  remove: (owner: string) => void;
}

const RegistryContext = createContext<Registry | null>(null);
const StateContext = createContext<Entry | null>(null);

/** Chữ ký phần NHÌN THẤY của khai báo — đổi chữ ký thì khung app mới vẽ lại. */
function chuKy(c: PageActionsConfig): string {
  const m = (i: ActionMenuItem) => [i.id, i.label, i.icon, i.disabled ? 1 : 0, i.destructive ? 1 : 0, i.section ?? '', i.description ?? ''];
  return JSON.stringify([
    c.title ?? '', c.subtitle ?? '',
    c.primary ? [c.primary.id, c.primary.label, c.primary.icon, c.primary.disabled ? 1 : 0, c.primary.loading ? 1 : 0] : null,
    (c.quick ?? []).map(m), (c.items ?? []).map(m),
  ]);
}

export const PageActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const registry = useMemo<Registry>(() => ({
    set: (owner, get, sig) => setEntries(prev => {
      const cu = prev.find(e => e.owner === owner);
      if (cu && cu.sig === sig) { cu.get = get; return prev; }
      return [...prev.filter(e => e.owner !== owner), { owner, get, sig }];
    }),
    remove: (owner) => setEntries(prev => (prev.some(e => e.owner === owner) ? prev.filter(e => e.owner !== owner) : prev)),
  }), []);
  const top = entries.length ? entries[entries.length - 1] : null;
  return (
    <RegistryContext.Provider value={registry}>
      <StateContext.Provider value={top}>{children}</StateContext.Provider>
    </RegistryContext.Provider>
  );
};

/** Màn đang hiện khai báo tiêu đề + nút cho khung app. Truyền `null` khi màn ẩn. Ngoài Provider thì không làm gì. */
export function usePageActions(config: PageActionsConfig | null): void {
  const registry = useContext(RegistryContext);
  const owner = useId();
  const ref = useRef(config);
  ref.current = config;
  const sig = config ? chuKy(config) : null;
  useLayoutEffect(() => {
    if (!registry) return;
    if (sig === null) { registry.remove(owner); return; }
    registry.set(owner, () => ref.current, sig);
  }, [registry, owner, sig]);
  useLayoutEffect(() => () => registry?.remove(owner), [registry, owner]);
}

/**
 * Cho KHUNG APP: khai báo đang có hiệu lực (hoặc null). Hàm xử lý trả về luôn gọi bản mới nhất của màn.
 */
export function useCurrentPageActions(): PageActionsConfig | null {
  const top = useContext(StateContext);
  const get = top?.get;
  // Bọc hàm xử lý: tra lại theo id ở thời điểm bấm → luôn gọi closure mới nhất của màn.
  const goi = useCallback((loai: 'primary' | 'quick' | 'items', id: string) => {
    const c = get?.();
    if (!c) return;
    if (loai === 'primary') { if (c.primary?.id === id) c.primary.onClick(); return; }
    (loai === 'quick' ? c.quick : c.items)?.find(i => i.id === id)?.onSelect();
  }, [get]);
  return useMemo(() => {
    const c = get?.();
    if (!c) return null;
    return {
      ...c,
      primary: c.primary ? { ...c.primary, onClick: () => goi('primary', c.primary!.id) } : undefined,
      quick: c.quick?.map(i => ({ ...i, onSelect: () => goi('quick', i.id) })),
      items: c.items?.map(i => ({ ...i, onSelect: () => goi('items', i.id) })),
    };
    // top.sig đổi ⇔ phần nhìn thấy đổi → tính lại; get ổn định theo owner
  }, [top?.sig, top?.owner, goi]);
}
