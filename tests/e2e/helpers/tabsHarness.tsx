// Trang thử cho tests/e2e/o-nhap-va-dai-chon-iphone.spec.ts — dựng ĐÚNG component Tabs thật qua dev server.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Tabs } from '../../../components/shared/ui/Tabs';

const ITEMS = Array.from({ length: 12 }, (_, i) => ({ id: `k${i}`, label: `Kho số ${1000 + i}` }));

function Harness() {
    const [active, setActive] = useState('k0');
    (window as unknown as { __setTab: (id: string) => void }).__setTab = setActive;
    return (
        <div>
            <div style={{ height: 600 }}>Phần trên trang</div>
            <Tabs items={ITEMS} activeId={active} onChange={setActive} variant="pills" />
            <div style={{ height: 1200 }}>Phần dưới trang</div>
        </div>
    );
}

export function mount() {
    document.body.innerHTML = '<div id="harness"></div>';
    createRoot(document.getElementById('harness')!).render(<Harness />);
}
