import { useState, useCallback } from 'react';
import { downloadBlob, shareBlob, canShareFiles } from '../services/uiService';

export interface PendingExport {
    blob: Blob;
    filename: string;
    resolve: (action: 'download' | 'share' | 'cancel') => void;
}

export function useExportOptions() {
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

    const showExportOptions = useCallback((blob: Blob, filename: string): Promise<'download' | 'share' | 'cancel'> => {
        return new Promise((resolve) => {
            setPendingExport({ blob, filename, resolve });
        });
    }, []);

    const handleDownload = useCallback(() => {
        if (pendingExport) {
            downloadBlob(pendingExport.blob, pendingExport.filename);
            pendingExport.resolve('download');
            setPendingExport(null);
        }
    }, [pendingExport]);

    const handleShare = useCallback(async () => {
        if (pendingExport) {
            await shareBlob(pendingExport.blob, pendingExport.filename);
            pendingExport.resolve('share');
            setPendingExport(null);
        }
    }, [pendingExport]);

    const handleClose = useCallback(() => {
        if (pendingExport) {
            pendingExport.resolve('cancel');
            setPendingExport(null);
        }
    }, [pendingExport]);

    return {
        pendingExport,
        showExportOptions,
        handleDownload,
        handleShare,
        handleClose,
        canShare: canShareFiles(),
    };
}
