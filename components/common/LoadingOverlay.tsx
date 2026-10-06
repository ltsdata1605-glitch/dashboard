
import React from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';

const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center z-50 rounded-none">
        <div className="animate-spin text-sky-500">
            <AppIcon name="loading" size="hero" />
        </div>
    </div>
);

export default LoadingOverlay;
