import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import type { ItemGroup, CustomField } from '../types';
import { GROUP_META } from '../catalog';

interface CustomFieldModalProps {
    group: ItemGroup | null;
    onClose: () => void;
    onSave: (field: Omit<CustomField, 'id'>) => void;
}

/** Thêm mục tuỳ chỉnh vào một nhóm — đếm số lượng (cái) hoặc nhập tiền (Tr). */
export const CustomFieldModal: React.FC<CustomFieldModalProps> = ({ group, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<CustomField['type']>('count');

    useEffect(() => {
        if (group) { setName(''); setType('count'); }
    }, [group]);

    const canSave = !!group && name.trim().length > 0;
    const submit = () => {
        if (!canSave || !group) return;
        onSave({ name: name.trim(), group, type });
        onClose();
    };

    return (
        <Modal
            isOpen={!!group}
            onClose={onClose}
            title="Thêm mục mới"
            subTitle={group ? `Nhóm ${GROUP_META[group].label}` : undefined}
            maxWidth="sm"
            footer={
                <div className="flex gap-2 w-full">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>Bỏ qua</Button>
                    <Button variant="primary" className="flex-1" disabled={!canSave} onClick={submit}>Lưu</Button>
                </div>
            }
        >
            <div className="space-y-3">
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tên mục / sản phẩm</label>
                    <Input autoFocus placeholder="VD: Ốp lưng, Mở thẻ…" value={name} onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submit(); }} className="rounded" />
                </div>
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cách nhập</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant={type === 'count' ? 'primary' : 'secondary'} size="sm" className="rounded" onClick={() => setType('count')}>
                            Đếm số lượng (cái)
                        </Button>
                        <Button variant={type === 'revenue' ? 'primary' : 'secondary'} size="sm" className="rounded" onClick={() => setType('revenue')}>
                            Tiền (Tr)
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
