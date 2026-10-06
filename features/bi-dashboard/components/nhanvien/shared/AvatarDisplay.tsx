import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AppIcon } from '../../../../../components/shared/ui/icon/AppIcon';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';
import { Button } from '../../../../../components/shared/ui/Button';
import { standardizeEmployeeName, extractEmployeeId } from '../../../utils/nhanVienHelpers';
import { getCartoonAvatar } from '../../../utils/cartoonAvatars';
import { AvatarPickerModal } from './AvatarPickerModal';
import * as db from '../../../utils/db';

interface AvatarDisplayProps {
    employeeName: string;
    supermarketName: string;
    isHidden?: boolean;
    onClick?: () => void;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ employeeName, isHidden, onClick }) => {
    const canonicalName = standardizeEmployeeName(employeeName);
    const dbKey = `avatar-${canonicalName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const defaultCartoon = useMemo(() => getCartoonAvatar(employeeName), [employeeName]);

    useEffect(() => {
        if (!avatarSrc && employeeName) {
            let isMounted = true;
            (async () => {
                const keys: string[] = [`avatar-${employeeName}`, `avatar-${canonicalName}`];
                const empId = extractEmployeeId(employeeName);
                if (empId) {
                    keys.push(`avatar-${empId}`);
                }
                if (employeeName.includes(' - ')) {
                    const parts = employeeName.split(' - ').map(p => p.trim());
                    if (parts.length >= 2) {
                        keys.push(`avatar-${parts[1]} - ${parts[0]}`);
                        keys.push(`avatar-${parts[0]}`);
                        keys.push(`avatar-${parts[1]}`);
                    }
                }
                for (const k of keys) {
                    try {
                        const val = await db.get<string>(k as any);
                        if (val && isMounted) {
                            setFallbackSrc(val);
                            return;
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                // Nếu vẫn chưa thấy và có empId hợp lệ, quét IndexedDB
                if (empId && empId.length >= 3) {
                    try {
                        const allItems = await db.getAll();
                        for (const item of allItems) {
                            if (item.key.startsWith('avatar-')) {
                                const keyContent = item.key.slice('avatar-'.length);
                                if (extractEmployeeId(keyContent) === empId || keyContent.includes(empId)) {
                                    const val = item.value as string;
                                    if (val && isMounted) {
                                        setFallbackSrc(val);
                                        await db.set(dbKey as any, val);
                                        return;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            })();
            return () => { isMounted = false; };
        }
    }, [avatarSrc, employeeName, canonicalName, dbKey]);

    const activeSrc = avatarSrc || fallbackSrc;
    const effectiveSrc = activeSrc || defaultCartoon.dataUrl;

    const syncAvatarToDb = async (src: string | null) => {
        const keysToUpdate: string[] = [dbKey, `avatar-${employeeName}`];
        const empId = extractEmployeeId(employeeName);
        if (empId) keysToUpdate.push(`avatar-${empId}`);

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
        await setAvatarSrc(dataUrl);
        setFallbackSrc(dataUrl);
        await syncAvatarToDb(dataUrl);
    };

    const handleResetDefaultAvatar = async () => {
        await setAvatarSrc(null);
        setFallbackSrc(null);
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

                    await setAvatarSrc(compressedBase64);
                    setFallbackSrc(compressedBase64);
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
                        title={activeSrc ? employeeName : `${employeeName} (Avatar hoạt hình: ${defaultCartoon.name})`}
                        style={{
                            borderRadius: '50%',
                            clipPath: 'circle(50% at 50% 50%)',
                            WebkitClipPath: 'circle(50% at 50% 50%)',
                            objectFit: 'cover'
                        }}
                        className="w-full h-full rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all shadow-2xs" 
                    />
                </div>
                
                <Button
                    variant="unstyled" size="none"
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsPickerOpen(true);
                    }}
                    title="Đổi avatar hoạt hình hoặc tải ảnh lên"
                    className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition-opacity after:absolute after:-inset-3 after:content-[''] lg:after:hidden no-print border border-slate-200 dark:border-slate-700 shadow-xs"
                >
                    <AppIcon name="upload" size="xs" className="text-sky-600" />
                </Button>
            </div>

            <AvatarPickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                employeeName={employeeName}
                currentAvatarSrc={activeSrc}
                onSelectAvatar={handleSelectCartoonAvatar}
                onResetDefault={handleResetDefaultAvatar}
                onUploadFile={handleUploadFile}
            />
        </>
    );
};

export default AvatarDisplay;
