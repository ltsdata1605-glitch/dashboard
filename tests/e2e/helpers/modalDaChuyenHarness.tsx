/** Harness cho modal-da-chuyen-modal-chung.spec.ts — dựng các modal THẬT đã chuyển sang <Modal> dùng chung. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../../components/shared/ui/Button';
import { SelectInteractedUserModal } from '../../../features/line-bot/components/SelectInteractedUserModal';
import { KeywordEditModal } from '../../../features/line-bot/components/KeywordEditModal';
import { ScheduleEditModal } from '../../../features/line-bot/components/ScheduleEditModal';
import { LineBotOnboardingModal } from '../../../features/line-bot/components/LineBotOnboardingModal';
import { SelectFilterUserModal } from '../../../features/line-bot/components/SelectFilterUserModal';

const users = Array.from({ length: 14 }, (_, i) => ({
    id: `U${i}`.padEnd(33, 'a'), lineUserId: `U${i}`.padEnd(33, 'a'), displayName: `Nhân viên ${i + 1} - Nguyễn Văn Test`,
    lastInteractionType: (i % 2 ? 'GROUP' : 'DIRECT') as 'GROUP' | 'DIRECT', lastGroupName: 'Nhóm Siêu Thị 910',
    lastMessage: 'id', lastInteractedAt: new Date(Date.now() - i * 3600_000).toISOString(),
}));

function Harness() {
    const [mo, setMo] = useState('');
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
