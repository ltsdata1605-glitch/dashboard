/** Harness cho modal-tu-dung-hanh-vi.spec.ts — dựng CouponImportModal THẬT (lớp phủ tự dựng). */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CouponImportModal } from '../../../features/line-bot/components/CouponImportModal';
import { Button } from '../../../components/shared/ui/Button';

function Harness() {
    const [mo, setMo] = useState(false);
    return (
        <div>
            <Button id="mo-nap-ma" onClick={() => setMo(true)}>Mở nạp mã</Button>
            <CouponImportModal isOpen={mo} onClose={() => setMo(false)} onImport={async () => ({ added: 0, skipped: 0 })} coupons={[]} existingTypes={[]} />
        </div>
    );
}
export function mountHarness() {
    const el = document.createElement('div');
    el.id = 'coupon-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
