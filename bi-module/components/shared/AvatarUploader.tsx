import React, { useRef } from 'react';
import { UsersIcon, UploadIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';

export const AvatarUploader: React.FC<{ employeeName: string; supermarketName: string }> = ({ employeeName, supermarketName }) => {
    const dbKey = `avatar-${employeeName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
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
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };
    return (
        <div className="relative group w-8 h-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {avatarSrc ? <img src={avatarSrc} alt={employeeName} className="w-full h-full rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700" /> : <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-2 ring-slate-300 dark:border-slate-600"><UsersIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /></div>}
            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity no-print"><UploadIcon className="h-4 w-4 text-white" /></button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};
