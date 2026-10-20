

import React, { useState } from 'react';
import { PrintSettings, ModernLayoutPositions } from './services/printService';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';
import { Tabs } from '../../components/shared/ui/Tabs';

interface LayoutSelectionModalProps {
    onSelect: (tagsPerPage: PrintSettings['tagsPerPage']) => void;
    onClose: () => void;
    stickerStyle: 'default' | 'modern';
    onStickerStyleChange: (style: 'default' | 'modern') => void;
    modernPositions?: ModernLayoutPositions;
    onModernPositionsChange: (positions: ModernLayoutPositions) => void;
}

const LayoutOptionButton: React.FC<{
    value: PrintSettings['tagsPerPage'];
    label: string;
    description: string;
    onSelect: (value: PrintSettings['tagsPerPage']) => void;
}> = ({ value, label, description, onSelect }) => (
    <Button
        variant="unstyled"
        size="none"
        onClick={() => onSelect(value)}
        className="justify-start w-full text-left p-4 rounded-card bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all duration-200"
    >
        <div>
            <p className="font-bold text-lg text-slate-800">{label}</p>
            <p className="text-sm text-slate-600">{description}</p>
        </div>
    </Button>
);

const LayoutSelectionModal: React.FC<LayoutSelectionModalProps> = ({ onSelect, onClose, stickerStyle, onStickerStyleChange, modernPositions, onModernPositionsChange }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const options: { value: PrintSettings['tagsPerPage']; label: string; description: string }[] = [
        { value: 1, label: '1 Sticker / Trang', description: 'CE, QĐH, Quạt lớn, MLN' },
        { value: 2, label: '2 Sticker / Trang', description: 'Bộ lau nhà, Bếp đôi, Lò vi sóng, Lò nướng' },
        { value: 4, label: '4 Sticker / Trang', description: 'Nồi cơm, Nồi chiên, Bếp đơn, Nồi, Quạt nhỏ' },
        { value: 8, label: '8 Sticker / Trang', description: 'Máy sấy tóc, bàn ủi, bình đun, Máy xay sinh tố, vợt muỗi, thớt' },
        { value: 16, label: '16 Sticker / Trang', description: 'Camera, DCNB,Chảo, bình giữ nhiệt, rổ, thao' },
        { value: 24, label: '24 Sticker / Trang', description: 'Phụ kiện, SDP, dao, kéo, đũa' },
        { value: 80, label: 'Máy in bill (80mm)', description: 'Khổ giấy in nhiệt K80mm' },
    ];

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Chọn Kiểu & Bố Cục In"
            titleColorClass="text-slate-900"
            maxWidth="lg"
        >
            <div className="space-y-4">
                <div className="py-2">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">1. Chọn Kiểu Sticker</h3>
                    <Tabs
                        variant="segment"
                        fullWidth
                        activeId={stickerStyle}
                        onChange={(id) => onStickerStyleChange(id as 'default' | 'modern')}
                        items={[
                            { id: 'default', label: 'Kiểu có sẵn' },
                            { id: 'modern', label: 'Kiểu hiện đại' },
                        ]}
                    />
                </div>

                <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">2. Chọn Bố Cục Trang In</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {options.map(option => (
                            <LayoutOptionButton
                                key={option.value}
                                value={option.value}
                                label={option.label}
                                description={option.description}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default LayoutSelectionModal;