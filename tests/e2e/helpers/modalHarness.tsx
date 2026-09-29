/**
 * Harness cho tests/e2e/modal-ngan-xep.spec.ts — dựng Modal/ConfirmDialog THẬT của
 * components/shared/ui trong trang (Vite biên dịch file này như mọi module của app).
 * Kịch bản: modal A → trong A mở ConfirmDialog B (lồng); có thể mount thêm modal C đang ĐÓNG.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from '../../../components/shared/ui/Modal';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { Button } from '../../../components/shared/ui/Button';

function Harness() {
    const [openA, setOpenA] = useState(false);
    const [openB, setOpenB] = useState(false);
    const [mountC, setMountC] = useState(false);
    return (
        <div>
            <Button id="mo-a" onClick={() => setOpenA(true)}>Mở A</Button>
            <Modal isOpen={openA} onClose={() => setOpenA(false)} title="Hộp thoại A" footer={<Button id="a-luu">Lưu A</Button>}>
                <p>Nội dung A</p>
                <input id="a-input" aria-label="Ô nhập A" />
                <Button id="mo-b" onClick={() => setOpenB(true)}>Xoá (mở B)</Button>
                <Button id="mount-c" onClick={() => setMountC(true)}>Mount C</Button>
            </Modal>
            <ConfirmDialog isOpen={openB} onClose={() => setOpenB(false)} onConfirm={() => setOpenB(false)} title="Xác nhận B" message="Chắc chắn?" />
            {mountC && <Modal isOpen={false} onClose={() => {}} title="Hộp thoại C (đóng)"><p>C</p></Modal>}
        </div>
    );
}

export function mountHarness() {
    const el = document.createElement('div');
    el.id = 'modal-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
