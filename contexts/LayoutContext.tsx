
import React, { createContext, useContext, useState, useEffect } from 'react';

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

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTab, setActiveTab] = useState('analysis');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar_collapsed');
            return saved ? JSON.parse(saved) : true;
        }
        return true;
    });

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dark_mode');
            if (saved !== null) return JSON.parse(saved);
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    useEffect(() => {
        localStorage.setItem('dark_mode', JSON.stringify(isDarkMode));
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    return (
        <LayoutContext.Provider value={{ 
            isSidebarCollapsed, 
            setIsSidebarCollapsed, 
            isMobileSidebarOpen,
            setIsMobileSidebarOpen,
            isDarkMode, 
            toggleDarkMode,
            activeTab,
            setActiveTab
        }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};
