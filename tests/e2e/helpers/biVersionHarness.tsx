/** Harness cho bi-sync-kiem-phien-ban.spec.ts — gọi startBiAutoSyncSession THẬT + userscript giả trả lời ping. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { startBiAutoSyncSession } from '../../../features/bi-dashboard/services/biAutoSyncService';
import { BiAutoSyncModal } from '../../../features/bi-dashboard/components/BiAutoSyncModal';
import { Button } from '../../../components/shared/ui/Button';

function Harness() {
    const [ketQua, setKetQua] = useState('');
    const [cu, setCu] = useState({ hien: '', moi: '' });
    return (
        <div>
            <Button id="chay-tu-dong" onClick={async () => {
                try { await startBiAutoSyncSession('realtime'); setKetQua('chay'); }
                catch (e) {
                    const m = (e as Error).message;
                    setKetQua(m);
                    if (m.startsWith('USERSCRIPT_OUTDATED')) setCu({ hien: m.split(':')[1] || '', moi: m.split(':')[2] || '' });
                }
            }}>Tự động Realtime</Button>
            <span id="ket-qua">{ketQua}</span>
            <BiAutoSyncModal isOpen={Boolean(cu.hien)} mode="realtime" progress={null} status="outdated"
                currentVersion={cu.hien} latestVersion={cu.moi} onClose={() => setCu({ hien: '', moi: '' })} />
        </div>
    );
}

/** Giả userscript đã cài: trả lời ping của Dashboard với `version`. */
export function mountHarness(version: string) {
    window.addEventListener('ycx-bonus-bridge:ping', (e) => {
        const nonce = (e as CustomEvent).detail?.nonce;
        window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version } }));
    });
    const el = document.createElement('div');
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
