import React, { useRef, useState, useEffect } from 'react';
import { UsersIcon, UploadIcon } from '../../Icons';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';
import { Button } from '../../../../../components/shared/ui/Button';
import { standardizeEmployeeName } from '../../../utils/nhanVienHelpers';
import * as db from '../../../utils/db';

interface AvatarDisplayProps {
    employeeName: string;
    supermarketName: string;
    isHidden?: boolean;
    onClick?: () => void;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ employeeName, supermarketName, isHidden, onClick }) => {
    const canonicalName = standardizeEmployeeName(employeeName);
    const dbKey = `avatar-${canonicalName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!avatarSrc && employeeName) {
            let isMounted = true;
            (async () => {
                const keys: string[] = [`avatar-${employeeName}`, `avatar-${canonicalName}`];
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
            })();
            return () => { isMounted = false; };
        }
    }, [avatarSrc, employeeName, canonicalName]);

    const activeSrc = avatarSrc || fallbackSrc;

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
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
                    const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
                    setAvatarSrc(compressedBase64);
                    // Also save to other variations for safety
                    try {
                        if (employeeName !== canonicalName) {
                            await db.set(`avatar-${employeeName}` as any, compressedBase64);
                        }
                    } catch (e) {
                        // ignore
                    }
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };
    if (isHidden) return <div className="w-8 h-8 flex-shrink-0" />;
    return (
        <div 
            className="relative group w-8 h-8 flex-shrink-0"
            onClick={(e) => e.stopPropagation()} 
        >
            {activeSrc ? (
                <img 
                    src={activeSrc} 
                    alt={employeeName} 
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    className="w-full h-full rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700 cursor-pointer hover:scale-110 transition-transform" 
                />
            ) : (
                <div 
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-600 cursor-pointer hover:bg-slate-200"
                >
                    <UsersIcon className="h-4 w-4 text-slate-400" />
                </div>
            )}
            <Button
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all hover:scale-125 no-print border border-slate-100"
            >
                <UploadIcon className="h-2 w-2 text-sky-600" />
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};

export default AvatarDisplay;
