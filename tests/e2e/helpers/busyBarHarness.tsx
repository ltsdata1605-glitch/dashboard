/** Harness cho tang-toc-gd2.spec.ts — dựng BusyBar THẬT (components/shared/ui/BusyBar.tsx) với nút bật/tắt trạng thái bận. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BusyBar } from '../../../components/shared/ui/BusyBar';
import { Button } from '../../../components/shared/ui/Button';

function Harness() {
    const [ban, setBan] = useState(false);
    const [bam, setBam] = useState(0);
    return (
        <div style={{ position: 'fixed', top: 120, left: 16, zIndex: 2_000_000, background: '#fff', padding: 8 }}>
            <Button id="bat-ban" onClick={() => setBan(true)}>bận</Button>
            <Button id="het-ban" onClick={() => setBan(false)}>xong</Button>
            <Button id="nut-van-bam-duoc" onClick={() => setBam(n => n + 1)}>bấm thử</Button>
            <span id="so-lan-bam">{bam}</span>
            <BusyBar active={ban} label="Đang tính lại theo bộ lọc" />
        </div>
    );
}

export function mountHarness() {
    const el = document.createElement('div');
    el.id = 'busy-bar-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
