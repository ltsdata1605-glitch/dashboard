import { useState, useCallback } from 'react';
import { downloadBlob, shareBlob, canShareFiles } from '../services/uiService';

export interface PendingExport {
    blob: Blob;
    filename: string;
}

export function useExportOptions() {
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

    const showExportOptions = useCallback((blob: Blob, filename: string) => {
        setPendingExport({ blob, filename });
    }, []);

    const handleDownload = useCallback(() => {
        if (pendingExport) {
            downloadBlob(pendingExport.blob, pendingExport.filename);
            setPendingExport(null);
        }
    }, [pendingExport]);

    const handleShare = useCallback(async () => {
        if (pendingExport) {
            await shareBlob(pendingExport.blob, pendingExport.filename);
            setPendingExport(null);
        }
    }, [pendingExport]);

    const handleClose = useCallback(() => {
        setPendingExport(null);
    }, []);

    return {
        pendingExport,
        showExportOptions,
        handleDownload,
        handleShare,
        handleClose,
        canShare: canShareFiles(),
    };
}
