import { createContext, useContext } from 'react';
import { deliverImage } from '../../../components/shared/ui/imageDelivery';

interface ExportOptionsContextType {
    showExportOptions: (blob: Blob, filename: string) => Promise<'download' | 'share' | 'cancel'>;
}

const ExportOptionsContext = createContext<ExportOptionsContextType | null>(null);

export const ExportOptionsProvider = ExportOptionsContext.Provider;

export function useExportOptionsContext(): ExportOptionsContextType {
    const ctx = useContext(ExportOptionsContext);
    if (!ctx) {
        // Fallback: direct download if no context
        return {
            showExportOptions: async (blob: Blob, filename: string): Promise<'download' | 'share' | 'cancel'> => {
                await deliverImage(blob, filename, { share: false });
                return 'download';
            }
        };
    }
    return ctx;
}
