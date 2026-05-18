import { createContext, useContext } from 'react';

interface ExportOptionsContextType {
    showExportOptions: (blob: Blob, filename: string) => Promise<'download' | 'share' | 'cancel'>;
}

const ExportOptionsContext = createContext<ExportOptionsContextType | null>(null);

export const ExportOptionsProvider = ExportOptionsContext.Provider;

export function useExportOptionsContext() {
    const ctx = useContext(ExportOptionsContext);
    if (!ctx) {
        // Fallback: direct download if no context
        return {
            showExportOptions: async (blob: Blob, filename: string) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                return 'download';
            }
        };
    }
    return ctx;
}
