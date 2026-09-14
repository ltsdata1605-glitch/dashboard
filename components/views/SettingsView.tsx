import React from 'react';
import { SettingsAccountTab } from './settings/SettingsAccountTab';

const SettingsView: React.FC = () => {
    return (
        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen p-2 sm:p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700/50 p-3 sm:p-8 rounded-xl space-y-8">
                    <SettingsAccountTab />
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
