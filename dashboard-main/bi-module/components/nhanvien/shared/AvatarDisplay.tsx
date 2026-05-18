import React, { useRef } from 'react';
import { UsersIcon, UploadIcon } from '../../Icons';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';

interface AvatarDisplayProps {
    employeeName: string;
    supermarketName: string;
    isHidden?: boolean;
    onClick?: () => void;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ employeeName, supermarketName, isHidden, onClick }) => {
    // Bỏ supermarketName ra khỏi key để avatar dùng chung cho toàn hệ thống
    const dbKey = `avatar-${employeeName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatarSrc(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    if (isHidden) return <div className="w-8 h-8 flex-shrink-0" />;
    return (
        <div 
            className="relative group w-8 h-8 flex-shrink-0"
            onClick={(e) => e.stopPropagation()} 
        >
            {avatarSrc ? (
                <img 
                    src={avatarSrc} 
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
            <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
                className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-125 no-print border border-slate-100"
            >
                <UploadIcon className="h-2 w-2 text-primary-600" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};

export default AvatarDisplay;
