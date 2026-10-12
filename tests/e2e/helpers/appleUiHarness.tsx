/** Harness cho tests/e2e/lop-apple-gd3.spec.ts — dựng component THẬT của lớp Apple (GĐ3, components/shared/ui). */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Switch } from '../../../components/shared/ui/Switch';
import { Banner } from '../../../components/shared/ui/Banner';
import { ListGroup, ListRow } from '../../../components/shared/ui/ListGroup';
import { ActionMenu } from '../../../components/shared/ui/ActionMenu';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { EmptyState } from '../../../components/shared/ui/EmptyState';
import { SectionHeader } from '../../../components/shared/ui/SectionHeader';
import { PageActionsProvider, usePageActions, useCurrentPageActions } from '../../../components/shared/ui/PageActions';

const w = window as unknown as { __log: string[] };
w.__log = [];
const ghi = (s: string) => w.__log.push(s);

function ManKhaiBao({ hien, dem }: { hien: boolean; dem: number }) {
    usePageActions(hien ? {
        title: 'Phân tích', subtitle: `Cập nhật ${dem}`,
        primary: { id: 'tai', label: 'Tải YCX', icon: 'upload', onClick: () => ghi(`primary:${dem}`) },
        items: [
            { id: 'dong-bo', label: 'Đồng bộ đám mây', icon: 'cloud', onSelect: () => ghi(`dong-bo:${dem}`) },
            { id: 'xoa', label: 'Xoá dữ liệu YCX', icon: 'delete', destructive: true, onSelect: () => ghi('xoa') },
        ],
    } : null);
    return null;
}

function KhungApp() {
    const c = useCurrentPageActions();
    return (
        <div id="khung-app">
            <span id="khung-tieu-de">{c?.title ?? '(trống)'}</span>
            <span id="khung-phu-de">{c?.subtitle ?? ''}</span>
            {c?.primary && <Button id="khung-nut-chinh" onClick={c.primary.onClick}>{c.primary.label}</Button>}
            {c?.items && <ActionMenu items={c.items} data-testid="khung-menu" />}
        </div>
    );
}

function Harness() {
    const [bat, setBat] = useState(false);
    const [tab, setTab] = useState('a');
    const [mo, setMo] = useState(false);
    const [hien, setHien] = useState(true);
    const [dem, setDem] = useState(1);
    return (
        <PageActionsProvider>
            <div style={{ padding: 16, background: '#f1f5f9', minHeight: '100vh' }}>
                <div className="flex items-center gap-3">
                    <label htmlFor="cong-tac" id="nhan-cong-tac">Tự đồng bộ</label>
                    <Switch id="cong-tac" checked={bat} onChange={setBat} aria-labelledby="nhan-cong-tac" />
                    <span id="trang-thai">{bat ? 'bat' : 'tat'}</span>
                </div>

                <div id="segment" className="mt-3">
                    <Tabs variant="segment" items={[{ id: 'a', label: 'Siêu thị' }, { id: 'b', label: 'Nhân viên' }, { id: 'c', label: 'Cập nhật' }]}
                        activeId={tab} onChange={setTab} />
                    <span id="tab-chon">{tab}</span>
                </div>

                <div className="mt-3">
                    <Banner tone="danger" title="Thông báo" onDismiss={() => ghi('dong-banner')} data-testid="banner">
                        {'Hệ thống sẽ bảo trì từ 22:00 đến 23:00 tối nay. '.repeat(6)}
                    </Banner>
                </div>

                <div className="mt-3">
                    <ListGroup title="Hiển thị" footer="Áp dụng cho máy này.">
                        <ListRow icon="chartBar" label="Biểu đồ xu hướng" trailing={<Switch checked={bat} onChange={setBat} label="Biểu đồ xu hướng" />} />
                        <ListRow icon="font" iconTone="amber" label="Phông chữ" value="UTM Avo" onClick={() => ghi('phong')} data-testid="hang-phong" />
                        <ListRow label="Xoá dữ liệu" destructive onClick={() => ghi('xoa-hang')} />
                    </ListGroup>
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <span>Menu:</span>
                    <ActionMenu title="Thao tác" items={[
                        { id: 'chia-se', label: 'Chia sẻ', icon: 'share', onSelect: () => ghi('chia-se') },
                        { id: 'tai-ve', label: 'Tải về', icon: 'download', onSelect: () => ghi('tai-ve') },
                        { id: 'xoa', label: 'Xoá', icon: 'delete', destructive: true, onSelect: () => ghi('menu-xoa') },
                    ]} data-testid="menu-thu" />
                </div>

                <div className="mt-3">
                    <SectionHeader title="Chi tiết theo kho" subtitle="Lọc theo kho: tất cả" />
                    <EmptyState icon="empty" title="Chưa có dữ liệu" description="Tải file YCX để bắt đầu." />
                </div>

                <div className="mt-3 flex gap-2">
                    <Button id="mo-sheet" onClick={() => setMo(true)}>Mở sheet</Button>
                    <Button id="an-man" variant="secondary" onClick={() => setHien(h => !h)}>Ẩn/hiện màn</Button>
                    <Button id="tang-dem" variant="tinted" onClick={() => setDem(d => d + 1)}>Đổi dữ liệu màn</Button>
                </div>

                <KhungApp />
                <ManKhaiBao hien={hien} dem={dem} />

                <Modal isOpen={mo} onClose={() => { ghi('huy-sheet'); setMo(false); }} position="bottom" title="Mục tiêu GTĐH"
                    primaryAction={{ label: 'Lưu', onClick: () => { ghi('luu-sheet'); setMo(false); } }}>
                    <div data-testid="than-sheet">
                        <label className="block">Ngành hàng<input id="o-nhap" className="block w-full border" /></label>
                        <div style={{ width: 900, height: 20, background: '#e2e8f0' }}>khối rộng 900px</div>
                    </div>
                </Modal>
            </div>
        </PageActionsProvider>
    );
}

export function mountHarness() {
    document.body.innerHTML = '<div id="harness"></div>';
    createRoot(document.getElementById('harness')!).render(<Harness />);
}
