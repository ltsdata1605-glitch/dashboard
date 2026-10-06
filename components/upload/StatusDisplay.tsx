import React from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import type { Status } from '../../types';

interface StatusDisplayProps {
    status: Status;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
    if (!status || !status.message) {
        return null;
    }

    const typeClasses = {
        info: {
            bg: 'bg-sky-100 dark:bg-sky-900/50',
            border: 'border-sky-500',
            text: 'text-sky-800 dark:text-sky-200',
            icon: 'fileScan' as const,
            iconColor: 'text-sky-500',
        },
        success: {
            bg: 'bg-emerald-100 dark:bg-emerald-900/50',
            border: 'border-emerald-500',
            text: 'text-emerald-800 dark:text-emerald-200',
            icon: 'success' as const,
            iconColor: 'text-emerald-500',
        },
        error: {
            bg: 'bg-rose-100 dark:bg-rose-900/50',
            border: 'border-rose-500',
            text: 'text-rose-800 dark:text-rose-200',
            icon: 'warning' as const,
            iconColor: 'text-rose-500',
        },
    };

    const classes = typeClasses[status.type];
    const isProcessing = status.type === 'info' && status.progress < 100;

    return (
        <div className={`p-4 mb-6 rounded-lg border-l-4 shadow-md ${classes.bg} ${classes.border} ${classes.text}`} role="alert">
            <div className="flex items-center">
                {/* Trước 2026-10-06: class w-6 h-6 bị inline style 20px của Icon cũ đè mất — ra 20px chứ không 24px. */}
                <AppIcon name={classes.icon} size="lg" className={`mr-3 ${classes.iconColor} ${isProcessing ? 'animate-pulse' : ''}`} />
                <p className="font-semibold text-lg">{status.message}</p>
            </div>
            {status.progress > 0 && status.progress < 100 && (
                <div className={`mt-3 w-full rounded-full h-2.5 progress-bar-container ${isProcessing ? 'scanner' : ''}`}>
                    <div
                        className="bg-sky-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                        style={{ width: `${status.progress}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default StatusDisplay;