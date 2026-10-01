/** Harness cho bi-auto-sync-modal-tien-trinh.spec.ts — dựng BiAutoSyncModal THẬT, test bơm tiến trình qua window.__bi. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BiAutoSyncModal } from '../../../features/bi-dashboard/components/BiAutoSyncModal';
import type { BiSyncProgress } from '../../../features/bi-dashboard/services/biAutoSyncService';

type TrangThai = 'idle' | 'running' | 'success' | 'error';

function Harness() {
    const [mo, setMo] = useState(true);
    const [trangThai, setTrangThai] = useState<TrangThai>('running');
    const [tienTrinh, setTienTrinh] = useState<BiSyncProgress | null>(null);
    (window as unknown as { __bi: unknown }).__bi = {
        tienTrinh: (step: number, stepName: string, message: string) =>
            setTienTrinh({ jobId: 'job-1', mode: 'realtime', step, totalSteps: 4, stepName, message }),
        xong: () => setTrangThai('success'),
    };
    return (
        <div>
            <span id="trang-thai-mo">{mo ? 'mo' : 'dong'}</span>
            <BiAutoSyncModal isOpen={mo} mode="realtime" progress={tienTrinh} status={trangThai}
                onClose={() => setMo(false)} onCancel={() => setTrangThai('idle')} />
        </div>
    );
}
export function mountHarness() {
    const el = document.createElement('div');
    el.id = 'bi-auto-sync-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
