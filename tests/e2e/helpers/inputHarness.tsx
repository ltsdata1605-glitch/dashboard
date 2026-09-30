/** Harness cho o-nhap-a17.spec.ts — dựng Input THẬT của components/shared/ui. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Input } from '../../../components/shared/ui/Input';

export function mountInput() {
    const el = document.createElement('div');
    el.id = 'input-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Input aria-label="Mã kho" error="Mã kho phải là số" aria-describedby="goi-y" />);
}
