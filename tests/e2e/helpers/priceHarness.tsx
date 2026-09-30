/** Harness cho so-gia-dien-thoai-va-huy.spec.ts — dựng PriceComparisonView THẬT, gỡ được theo lệnh. */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PriceComparisonView from '../../../components/views/PriceComparisonView';

let root: Root | null = null;
export function mountPrice() {
    const el = document.createElement('div');
    el.id = 'price-harness';
    document.body.appendChild(el);
    root = createRoot(el);
    root.render(<PriceComparisonView isActive />);
}
export function unmountPrice() { root?.unmount(); root = null; }
