/** Harness cho modal-da-chuyen-modal-chung.spec.ts — dựng các modal THẬT đã chuyển sang <Modal> dùng chung. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../../components/shared/ui/Button';
import { SelectInteractedUserModal } from '../../../features/line-bot/components/SelectInteractedUserModal';
import { KeywordEditModal } from '../../../features/line-bot/components/KeywordEditModal';
import { ScheduleEditModal } from '../../../features/line-bot/components/ScheduleEditModal';
import { LineBotOnboardingModal } from '../../../features/line-bot/components/LineBotOnboardingModal';
import { TaxBracketModal } from '../../../features/tax-calculator/components/TaxBracketModal';
import { ApiKeyConfigModal } from '../../../features/tax-calculator/components/ApiKeyConfigModal';
import { TaxHistoryModal } from '../../../features/tax-calculator/components/TaxHistoryModal';
import { AddIndustryKpiModal } from '../../../features/bi-dashboard/components/dashboard/industryKpi/AddIndustryKpiModal';
import { AvatarPickerModal } from '../../../features/bi-dashboard/components/nhanvien/shared/AvatarPickerModal';
import { CouponImportModal } from '../../../features/line-bot/components/CouponImportModal';
import { SelectFilterUserModal } from '../../../features/line-bot/components/SelectFilterUserModal';

const users = Array.from({ length: 14 }, (_, i) => ({
    id: `U${i}`.padEnd(33, 'a'), lineUserId: `U${i}`.padEnd(33, 'a'), displayName: `Nhân viên ${i + 1} - Nguyễn Văn Test`,
    lastInteractionType: (i % 2 ? 'GROUP' : 'DIRECT') as 'GROUP' | 'DIRECT', lastGroupName: 'Nhóm Siêu Thị 910',
    lastMessage: 'id', lastInteractedAt: new Date(Date.now() - i * 3600_000).toISOString(),
}));

const taxRecords = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1, name: `Nguyễn Văn ${String.fromCharCode(65 + i)}`, monthYear: i < 5 ? '09/2026' : '08/2026', totalIncome: 18_000_000 + i * 1_500_000,
    dependents: i % 3, proxyAmount: 4_000_000 + i * 100_000, taxOnProxyAmount: 120_000 + i * 5_000, netRefundToFriend: 3_800_000 + i * 90_000,
    createdAt: new Date(Date.now() - i * 86_400_000).toISOString(), syncedToCloud: true,
}));

const nganh = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, rawName: `NGANH ${i}`, displayName: `Ngành hàng ${i + 1}`, type: 'industry' as const }));

const maGiamGia = ['A', 'B'].flatMap((lo, bi) => Array.from({ length: 6 }, (_, i) => ({
    id: `c${bi}${i}`, code: `MA${lo}${i}`.padEnd(10, '0'), type: 'PMH 100K', productName: 'Tủ lạnh Panasonic', status: 'UNUSED' as const,
    createdAt: new Date(Date.now() - bi * 86_400_000).toISOString(), updatedAt: new Date().toISOString(), importBatchId: `lo-${lo}`,
})));

function Harness() {
    const [mo, setMo] = useState('');
    const [hangClicks, setHangClicks] = useState(0);
    return (
        <div>
            <Button id="mo-chon-tuong-tac" onClick={() => setMo('tuongtac')}>Mở</Button>
            <Button id="mo-chon-loc" onClick={() => setMo('loc')}>Mở lọc</Button>
            <SelectFilterUserModal isOpen={mo === 'loc'} onClose={() => setMo('')} interactedUsers={users} isLoading={false}
                onRefresh={() => {}} currentFilterNames={['Nhân viên 1']} onToggleName={() => {}} onBatchAddNames={() => {}} />
            <Button id="mo-tu-khoa" onClick={() => setMo('tukhoa')}>Mở từ khoá</Button>
            <KeywordEditModal isOpen={mo === 'tukhoa'} onClose={() => setMo('')} keyword={null} onSave={async () => 'ok'} />
            <Button id="mo-lich-hen" onClick={() => setMo('lichhen')}>Mở lịch hẹn</Button>
            <ScheduleEditModal isOpen={mo === 'lichhen'} onClose={() => setMo('')} schedule={null}
                groups={[{ groupId: 'C' + 'a'.repeat(32), groupName: 'Nhóm Siêu Thị 910', active: true } as never]} onSave={async () => 'ok'} />
            <Button id="mo-huong-dan" onClick={() => setMo('huongdan')}>Mở hướng dẫn</Button>
            <LineBotOnboardingModal isOpen={mo === 'huongdan'} onClose={() => setMo('')} webhookUrl="https://example.com/lineBotWebhook?uid=abc" />
            <Button id="mo-bieu-thue2" onClick={() => setMo('bieuthue')}>Mở biểu thuế</Button>
            <TaxBracketModal isOpen={mo === 'bieuthue'} onClose={() => setMo('')} />
            <Button id="mo-api-key" onClick={() => setMo('apikey')}>Mở API key</Button>
            <ApiKeyConfigModal isOpen={mo === 'apikey'} onClose={() => setMo('')} onSaveKey={() => {}} />
            <Button id="mo-lich-su-thue" onClick={() => setMo('lichsuthue')}>Mở lịch sử thuế</Button>
            <TaxHistoryModal isOpen={mo === 'lichsuthue'} onClose={() => setMo('')} records={taxRecords} onLoadRecord={() => {}}
                onDeleteRecord={() => {}} onClearAll={() => {}} />
            <Button id="mo-kpi-nganh" onClick={() => setMo('kpinganh')}>Mở KPI ngành</Button>
            <AddIndustryKpiModal isOpen={mo === 'kpinganh'} onClose={() => setMo('')} onAddCard={() => {}} onRemoveCard={() => {}}
                currentCards={[{ id: 'n1', title: 'Ngành hàng 2', type: 'industry' }]} availableIndustries={nganh} availableSubIndustries={[]} onResetDefault={() => {}} />
            {/* Dòng bảng có onClick: modal ảnh đại diện nằm TRONG nó (như AvatarDisplay trong bảng nhân viên) */}
            <div id="hang-bang" data-clicks={hangClicks} onClick={() => setHangClicks(c => c + 1)}>
                <Button id="mo-avatar" onClick={(e) => { e.stopPropagation(); setMo('avatar'); }}>Mở avatar</Button>
                <AvatarPickerModal isOpen={mo === 'avatar'} onClose={() => setMo('')} employeeName="Nguyễn Văn Test" currentAvatarSrc={null}
                    onSelectAvatar={() => {}} onResetDefault={() => {}} onUploadFile={async () => {}} />
            </div>
            <Button id="mo-nap-ma2" onClick={() => setMo('napma')}>Mở nạp mã</Button>
            <CouponImportModal isOpen={mo === 'napma'} onClose={() => setMo('')} onImport={async () => ({ added: 0, skipped: 0 })}
                coupons={maGiamGia as never} existingTypes={['PMH 100K']} onDeleteBatch={async (ids) => ids.length} />
            <SelectInteractedUserModal isOpen={mo === 'tuongtac'} onClose={() => setMo('')} interactedUsers={users} isLoading={false}
                onRefresh={() => {}} existingAdmins={[]} onSelectUser={async () => ({})} />
        </div>
    );
}
export function mountHarness() {
    const el = document.createElement('div');
    el.id = 'modal-da-chuyen-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
