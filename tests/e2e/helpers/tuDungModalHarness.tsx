/** Harness cho modal-tu-dung-hanh-vi.spec.ts — dựng TaxBracketModal THẬT (modal tự dựng, không qua Modal). */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TaxBracketModal } from '../../../features/tax-calculator/components/TaxBracketModal';
import { Button } from '../../../components/shared/ui/Button';

function Harness() {
    const [mo, setMo] = useState(false);
    return (
        <div>
            <Button id="mo-bieu-thue" onClick={() => setMo(true)}>Mở biểu thuế</Button>
            <TaxBracketModal isOpen={mo} onClose={() => setMo(false)} />
        </div>
    );
}
export function mountHarness() {
    const el = document.createElement('div');
    el.id = 'tu-dung-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
