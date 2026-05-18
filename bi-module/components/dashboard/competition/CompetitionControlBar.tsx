
import React from 'react';
import ReactDOM from 'react-dom';
import { ViewGridIcon, ViewListIcon } from '../../Icons';

interface CompetitionControlBarProps {
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
}

const CompetitionControlBar: React.FC<CompetitionControlBarProps> = ({
    viewMode,
    setViewMode,
}) => {
    // Find portal target in DashboardHeader action bar
    const portalTarget = typeof document !== 'undefined' ? document.getElementById('column-settings-portal') : null;

    const controls = (
        <div id="competition-view-controls" className="flex items-center gap-1">
            {/* View mode toggle — flat icons, no bg/border */}
            <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Chế độ lưới"
            >
                <ViewGridIcon className="h-4 w-4"/>
            </button>
            <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Chế độ danh sách"
            >
                <ViewListIcon className="h-4 w-4"/>
            </button>
        </div>
    );

    // Portal into DashboardHeader action bar
    if (portalTarget) {
        return ReactDOM.createPortal(controls, portalTarget);
    }

    // Fallback: render inline
    return controls;
};

export default CompetitionControlBar;
