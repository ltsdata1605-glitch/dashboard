
import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FilterIcon, ViewGridIcon, ViewListIcon } from '../../Icons';
import { Switch } from '../DashboardWidgets';
import { shortenName } from '../../../utils/dashboardHelpers';

interface CompetitionControlBarProps {
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    selectedPrograms: string[];
    setSelectedPrograms: React.Dispatch<React.SetStateAction<string[]>>;
    allProgramNames: string[];
}

const CompetitionControlBar: React.FC<CompetitionControlBarProps> = ({
    viewMode,
    setViewMode,
    selectedPrograms,
    setSelectedPrograms,
    allProgramNames,
}) => {
    const [programFilterSearch, setProgramFilterSearch] = useState('');
    const [isProgramFilterOpen, setIsProgramFilterOpen] = useState(false);
    const programFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (programFilterRef.current && !programFilterRef.current.contains(event.target as Node)) {
                setIsProgramFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredProgramNames = React.useMemo(() => {
        if (!programFilterSearch) return allProgramNames;
        return allProgramNames.filter(name =>
            name.toLowerCase().includes(programFilterSearch.toLowerCase())
        );
    }, [allProgramNames, programFilterSearch]);

    const toggleProgram = (name: string) => {
        setSelectedPrograms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) newSet.delete(name);
            else newSet.add(name);
            return Array.from(newSet);
        });
    };

    const toggleColumn = (header: string) => {
        setHiddenColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(header)) newSet.delete(header);
            else newSet.add(header);
            return Array.from(newSet);
        });
    };

    const isFiltered = selectedPrograms.length > 0 && selectedPrograms.length < allProgramNames.length;

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

            {/* Divider */}
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Filter */}
            <div className="relative" ref={programFilterRef}>
                <button
                    onClick={() => setIsProgramFilterOpen(p => !p)}
                    className={`p-1.5 transition-colors relative ${isFiltered ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    title="Lọc chương trình thi đua"
                >
                    <FilterIcon className="h-4 w-4" />
                    {isFiltered && (
                        <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[7px] font-bold w-3 h-3 flex items-center justify-center rounded-full">{selectedPrograms.length}</span>
                    )}
                </button>
                {isProgramFilterOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[100] p-3 flex flex-col max-h-96 text-left">
                        <div className="mb-2">
                            <input
                                type="text"
                                value={programFilterSearch}
                                onChange={(e) => setProgramFilterSearch(e.target.value)}
                                placeholder="Tìm kiếm chương trình..."
                                className="w-full px-3 py-1.5 text-xs border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
                            />
                        </div>
                        <div className="flex justify-between items-center mb-2 px-1">
                            <button onClick={() => setSelectedPrograms(allProgramNames)} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-wider">Chọn tất cả</button>
                            <button onClick={() => setSelectedPrograms([])} className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wider">Bỏ chọn</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-0.5 max-h-60">
                            {filteredProgramNames.map(name => (
                                <div key={name} className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <span className={`text-xs flex-1 mr-3 cursor-pointer select-none ${selectedPrograms.includes(name) ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`} onClick={() => toggleProgram(name)}>
                                        {shortenName(name)}
                                    </span>
                                    <Switch 
                                        checked={selectedPrograms.includes(name)} 
                                        onChange={() => toggleProgram(name)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
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
