
import React, { createContext, useContext, useState, useEffect, useCallback, startTransition, useMemo, useRef } from 'react';
import { getSetting, saveSetting } from '../services/dbService';

// --- Separate context for activeTab to avoid cascading re-renders ---
interface TabContextType {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

interface LayoutContextType {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    isMobileSidebarOpen: boolean;
    setIsMobileSidebarOpen: (open: boolean) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTab, setActiveTabRaw] = useState('analysis');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        Promise.all([
            getSetting<string>('active_tab'),
            getSetting<boolean>('sidebar_collapsed'),
            getSetting<boolean>('dark_mode')
        ]).then(([savedTab, savedSidebar, savedDark]) => {
            // Check URL query parameter first (has highest priority)
            const urlParams = new URLSearchParams(window.location.search);
            const urlTab = urlParams.get('tab');
            const initialTab = urlTab || savedTab || 'analysis';
            
            setActiveTabRaw(initialTab);
            
            // Sync URL with initial tab if not present
            if (!urlTab) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('tab', initialTab);
                window.history.replaceState(null, '', newUrl.toString());
            }

            if (savedSidebar !== undefined && savedSidebar !== null) setIsSidebarCollapsed(savedSidebar);
            if (savedDark !== undefined && savedDark !== null) {
                setIsDarkMode(savedDark);
            } else {
                setIsDarkMode(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
            setIsLoaded(true);
        }).catch(() => setIsLoaded(true));
    }, []);

    // Wrap tab switch in startTransition so the bottom nav stays responsive
    // while heavy views render in background
    const setActiveTab = useCallback((tab: string) => {
        startTransition(() => {
            setActiveTabRaw(tab);
        });
        saveSetting('active_tab', tab).catch(() => {});
        
        // Sync URL tab query parameter
        try {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('tab', tab);
            // If switching away from print sticker, clean up sub tab parameter
            if (tab !== 'tools-print-sticker') {
                newUrl.searchParams.delete('sub');
            }
            window.history.replaceState(null, '', newUrl.toString());
        } catch (e) {
            console.error("Failed to sync tab to URL:", e);
        }
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        saveSetting('sidebar_collapsed', isSidebarCollapsed).catch(() => {});
    }, [isSidebarCollapsed, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        saveSetting('dark_mode', isDarkMode).catch(() => {});
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }
    }, [isDarkMode, isLoaded]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    // Memoize tab context to prevent re-renders of tab consumers when layout state changes
    const tabContextValue = useMemo(() => ({
        activeTab,
        setActiveTab
    }), [activeTab, setActiveTab]);

    // Memoize layout context (includes tab for backward compatibility with useLayout)
    const layoutContextValue = useMemo(() => ({
        isSidebarCollapsed, 
        setIsSidebarCollapsed, 
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isDarkMode, 
        toggleDarkMode,
        activeTab,
        setActiveTab
    }), [isSidebarCollapsed, isMobileSidebarOpen, isDarkMode, activeTab, setActiveTab]);

    return (
        <TabContext.Provider value={tabContextValue}>
            <LayoutContext.Provider value={layoutContextValue}>
                {children}
            </LayoutContext.Provider>
        </TabContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};

/**
 * Lightweight hook that only subscribes to tab changes.
 * Use this in components that only need activeTab/setActiveTab
 * to avoid re-rendering when sidebar/darkMode state changes.
 */
export const useActiveTab = () => {
    const context = useContext(TabContext);
    if (context === undefined) {
        throw new Error('useActiveTab must be used within a LayoutProvider');
    }
    return context;
};
