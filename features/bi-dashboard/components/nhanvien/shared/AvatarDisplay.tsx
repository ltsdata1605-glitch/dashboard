import React, { useState, useMemo } from 'react';
import { standardizeEmployeeName, extractEmployeeId } from '../../../utils/nhanVienHelpers';
import { getCartoonAvatar } from '../../../utils/cartoonAvatars';
import { AvatarPickerModal } from './AvatarPickerModal';
import * as db from '../../../utils/db';
import { useAvatarSrc, primeAvatar } from '../../../utils/avatarIndex';

interface AvatarDisplayProps {
    employeeName: string;
    supermarketName: string;
    isHidden?: boolean;
    onClick?: () => void;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ employeeName, isHidden, onClick }) => {
    const canonicalName = standardizeEmployeeName(employeeName);
    const dbKey = `avatar-${canonicalName}`;
    // Tra trong kho ảnh dùng chung (utils/avatarIndex.ts) — KHÔNG tự đọc IndexedDB từng dòng: bảng Thi đua vẽ
    // hàng nghìn ảnh cùng lúc, mỗi cái tự đọc/quét kho làm tab đứng nhiều giây (đo 2026-10-09).
    const storedSrc = useAvatarSrc(canonicalName, employeeName);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const defaultCartoon = useMemo(() => getCartoonAvatar(employeeName), [employeeName]);

    const activeSrc = storedSrc;
    const effectiveSrc = activeSrc || defaultCartoon.dataUrl;

    const syncAvatarToDb = async (src: string | null) => {
        const keysToUpdate: string[] = [dbKey, `avatar-${employeeName}`];
        const empId = extractEmployeeId(employeeName);
        if (empId) keysToUpdate.push(`avatar-${empId}`);

        keysToUpdate.forEach(k => primeAvatar(k, src)); // mọi bảng đổi ảnh ngay, không chờ ghi xong
        for (const k of keysToUpdate) {
            try {
                if (src) {
                    await db.set(k as any, src);
                } else {
                    await db.deleteEntry(k as any);
                }
            } catch (e) {
                // ignore
            }
        }
    };

    const handleSelectCartoonAvatar = async (dataUrl: string) => {
        await syncAvatarToDb(dataUrl);
    };

    const handleResetDefaultAvatar = async () => {
        await syncAvatarToDb(null);
    };

    const handleUploadFile = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onloadend = () => {
                const img = new Image();
                img.onerror = reject;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 128;
                    const MAX_HEIGHT = 128;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/webp', 0.85);

                    await syncAvatarToDb(compressedBase64);
                    resolve();
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    if (isHidden) return <div className="w-5 h-5 flex-shrink-0" />;

    return (
        <>
            <div 
                className="relative group w-5 h-5 flex-shrink-0"
                onClick={(e) => e.stopPropagation()} 
            >
                <div
                    className="w-full h-full rounded-full overflow-hidden flex items-center justify-center shrink-0 preserve-rounded"
                    style={{
                        borderRadius: '50%',
                        clipPath: 'circle(50% at 50% 50%)',
                        WebkitClipPath: 'circle(50% at 50% 50%)'
                    }}
                >
                    <img 
                        src={effectiveSrc} 
                        alt={employeeName} 
                        data-avatar="true"
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (onClick) {
                                onClick();
                            } else {
                                setIsPickerOpen(true);
                            }
                        }}
                        title={activeSrc ? `${employeeName} (Bấm để đổi avatar)` : `${employeeName} (Avatar hoạt hình: ${defaultCartoon.name} — Bấm để đổi)`}
                        style={{
                            borderRadius: '50%',
                            clipPath: 'circle(50% at 50% 50%)',
                            WebkitClipPath: 'circle(50% at 50% 50%)',
                            objectFit: 'cover'
                        }}
                        className="w-full h-full rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-sky-400 hover:scale-110 active:scale-95 transition-all shadow-2xs" 
                    />
                </div>
            </div>

            {/* Chỉ dựng hộp chọn ảnh khi mở — trước đây mỗi dòng bảng đều dựng sẵn 1 cái (hàng nghìn ở tab Thi đua). */}
            {isPickerOpen && <AvatarPickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                employeeName={employeeName}
                currentAvatarSrc={activeSrc}
                onSelectAvatar={handleSelectCartoonAvatar}
                onResetDefault={handleResetDefaultAvatar}
                onUploadFile={handleUploadFile}
            />}
        </>
    );
};

export default AvatarDisplay;
