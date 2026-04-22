
import React, { createContext, useContext, useState, useEffect, useCallback, startTransition, useMemo } from 'react';

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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('sidebar_collapsed');
                return saved ? JSON.parse(saved) : true;
            } catch (e) {
                console.warn("localStorage not available:", e);
                return true;
            }
        }
        return true;
    });

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('dark_mode');
                if (saved !== null) return JSON.parse(saved);
            } catch (e) {
                console.warn("localStorage not available for dark mode:", e);
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Wrap tab switch in startTransition so the bottom nav stays responsive
    // while heavy views render in background
    const setActiveTab = useCallback((tab: string) => {
        startTransition(() => {
            setActiveTabRaw(tab);
        });
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
        } catch (e) {}
    }, [isSidebarCollapsed]);

    useEffect(() => {
        try {
            localStorage.setItem('dark_mode', JSON.stringify(isDarkMode));
        } catch (e) {}
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }
    }, [isDarkMode]);

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
