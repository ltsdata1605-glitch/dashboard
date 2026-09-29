/**
 * Harness cho tests/e2e/ui-dung-chung-dot-2.spec.ts — dựng component THẬT của components/shared/ui
 * (Vite biên dịch file này như mọi module của app): DataTable có nhóm cột + cột ẩn trên mobile + cuộn
 * dọc; Dropdown nằm trong Modal; Button thường.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Dropdown } from '../../../components/shared/ui/Dropdown';
import { DataTable } from '../../../components/shared/ui/DataTable';

type Row = { id: number; ten: string; a: number; b: number; c: number };
const rows: Row[] = Array.from({ length: 40 }, (_, i) => ({ id: i, ten: `Siêu thị ${i + 1}`, a: i, b: i * 2, c: i * 3 }));

function Harness() {
    const [open, setOpen] = useState(false);
    const [chon, setChon] = useState('');
    const [sort, setSort] = useState<{ col?: string; dir?: 'asc' | 'desc' | null }>({});
    return (
        <div style={{ padding: 16, background: '#fff' }}>
            <Button id="nut-thuong">Nút thường</Button>
            <Button id="mo-modal" onClick={() => setOpen(true)}>Mở modal</Button>
            <span id="da-chon">{chon}</span>
            <div id="bang" style={{ width: 360 }}>
                <DataTable<Row>
                    columns={[
                        { id: 'ten', header: 'Tên', cell: r => r.ten, sortable: true },
                        { id: 'a', header: 'A', cell: r => r.a, group: 'Nhóm 1', groupColor: 'sky' },
                        { id: 'b', header: 'B', cell: r => r.b, group: 'Nhóm 1', groupColor: 'sky', hideMobile: true },
                        { id: 'c', header: 'C', cell: r => r.c, group: 'Nhóm 2', groupColor: 'amber', hideMobile: true },
                    ]}
                    data={rows}
                    rowKey={r => r.id}
                    maxHeight="200px"
                    sortColumn={sort.col}
                    sortDirection={sort.dir ?? null}
                    onSort={(col, dir) => setSort({ col, dir })}
                />
            </div>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Modal có menu">
                <Dropdown
                    trigger={<span id="mo-menu">Chế độ</span>}
                    items={[{ id: 'x', label: 'Chế độ X' }, { id: 'y', label: 'Chế độ Y' }, { id: 'z', label: 'Chế độ Z' }]}
                    onSelect={setChon}
                />
            </Modal>
        </div>
    );
}

export function mountUiHarness() {
    const el = document.createElement('div');
    el.id = 'ui-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
