// Trang thử cho tests/e2e/modal-sheet-vuot-dong.spec.ts — test nạp file này qua dev server Vite
// (import('/tests/e2e/helpers/sheetHarness.tsx')) để dựng ĐÚNG component Modal thật, không cần dữ liệu.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from '../../../components/shared/ui/Modal';

function Harness({ position }: { position: 'center' | 'bottom' }) {
    const [open, setOpen] = useState(true);
    (window as unknown as { __sheetClosed: number }).__sheetClosed ??= 0;
    return (
        <Modal
            isOpen={open}
            position={position}
            title="Cấu hình thử"
            onClose={() => { (window as unknown as { __sheetClosed: number }).__sheetClosed++; setOpen(false); }}
            footer={<div>Chân modal</div>}
        >
            <div data-testid="sheet-body">
                {Array.from({ length: 60 }, (_, i) => <p key={i} style={{ height: 30 }}>Dòng {i + 1}</p>)}
            </div>
        </Modal>
    );
}

export function mount(position: 'center' | 'bottom') {
    document.body.innerHTML = '<div id="harness"></div>';
    createRoot(document.getElementById('harness')!).render(<Harness position={position} />);
}
