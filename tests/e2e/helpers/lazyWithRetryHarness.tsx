// Trang thử cho tests/e2e/lazy-tai-truoc.spec.ts — dựng ĐÚNG utils/lazyWithRetry thật qua dev server.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';

type Props = { n: number; ten: string };
/** Mỗi lần GẮN có một mã ngẫu nhiên riêng — mã đổi nghĩa là component bị gỡ rồi gắn lại (mất trạng thái). */
const Con: React.FC<Props> = ({ n, ten }) => {
    const [ma] = useState(() => String(Math.random()));
    return <div data-testid={ten} data-ma={ma}>{ten} {n}</div>;
};

let moKhoa: (m: { default: React.FC<Props> }) => void = () => {};
/** Đường React.lazy: module CHƯA có lúc gắn (test tự "giải phóng" module sau). */
const ConCham = lazyWithRetry<React.FC<Props>>(() => new Promise((r) => { moKhoa = r; }), 'HarnessCham');
/** Đường preload: module đã tải xong TRƯỚC khi gắn. */
const ConTaiTruoc = lazyWithRetry<React.FC<Props>>(() => Promise.resolve({ default: Con }), 'HarnessTaiTruoc');

function Harness({ hienTaiTruoc }: { hienTaiTruoc: boolean }) {
    const [n, setN] = useState(0);
    (window as unknown as { __veLai: () => void }).__veLai = () => setN((x) => x + 1);
    return (
        <>
            <React.Suspense fallback={<div data-testid="cho-cham">chờ</div>}><ConCham n={n} ten="cham" /></React.Suspense>
            {hienTaiTruoc && <React.Suspense fallback={<div data-testid="cho-tai-truoc">chờ</div>}><ConTaiTruoc n={n} ten="tai-truoc" /></React.Suspense>}
        </>
    );
}

export async function mount() {
    document.body.innerHTML = '<div id="harness"></div>';
    const w = window as unknown as Record<string, unknown>;
    w.__moKhoa = () => moKhoa({ default: Con });
    await ConTaiTruoc.preload();
    const root = createRoot(document.getElementById('harness')!);
    root.render(<Harness hienTaiTruoc={false} />);
    w.__hienTaiTruoc = () => root.render(<Harness hienTaiTruoc />);
}
