
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
    isDesktopMenuOpen: boolean;
    setIsDesktopMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    toggleDesktopMenu: () => void;
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
    const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('ycx_desktop_menu_open');
        return saved !== null ? saved === 'true' : true;
    });
    // Dark Mode đã bị vô hiệu hoá toàn dự án theo yêu cầu — luôn Sáng, không thể bật.
    const [isDarkMode] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        Promise.all([
            getSetting<string>('active_tab'),
            getSetting<boolean>('sidebar_collapsed')
        ]).then(([savedTab, savedSidebar]) => {
            // Check URL query parameter first (has highest priority)
            const urlParams = new URLSearchParams(window.location.search);
            const urlTab = urlParams.get('tab');
            const initialTab = urlTab || savedTab || 'analysis';
            const resolvedInitialTab = initialTab === 'tools' ? 'tools-print-sticker' : initialTab;
            
            setActiveTabRaw(resolvedInitialTab);
            
            // Mở bằng link có ?tab=… → lưu luôn tab đó. Trước đây chỉ lưu khi BẤM đổi tab, nên mở
            // link rồi thoát → app cài trên iPhone mở lại (luôn vào "/") lại về tab cũ hơn.
            if (urlTab && urlTab !== savedTab) saveSetting('active_tab', resolvedInitialTab).catch(() => {});

            // Sync URL with initial tab if not present
            if (!urlTab || urlTab === 'tools') {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('tab', resolvedInitialTab);
                window.history.replaceState(null, '', newUrl.toString());
            }

            if (savedSidebar !== undefined && savedSidebar !== null) setIsSidebarCollapsed(savedSidebar);
            // Dark Mode đã tắt toàn dự án — bỏ qua setting đã lưu & prefers-color-scheme của hệ điều hành.
            setIsLoaded(true);
        }).catch(() => setIsLoaded(true));
    }, []);

    // Wrap tab switch in startTransition so the bottom nav stays responsive
    // while heavy views render in background
    const setActiveTab = useCallback((tab: string) => {
        const finalTab = tab === 'tools' ? 'tools-print-sticker' : tab;
        startTransition(() => {
            setActiveTabRaw(finalTab);
        });
        saveSetting('active_tab', finalTab).catch(() => {});
        
        // Sync URL tab query parameter
        try {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('tab', tab);
            // Nếu rời khỏi tab employees và tools-print-sticker thì dọn sạch các query con
            if (tab !== 'employees' && tab !== 'tools-print-sticker') {
                newUrl.searchParams.delete('view');
                newUrl.searchParams.delete('mode');
                newUrl.searchParams.delete('sub');
            }
            window.history.replaceState(null, '', newUrl.toString());
        } catch (e) {
            console.error("Failed to sync tab to URL:", e);
        }
    }, []);

    // Lắng nghe sự kiện chuyển tab toàn cục (từ Auto Sync, thông báo, hoặc các dịch vụ tự động)
    useEffect(() => {
        const handleNav = (e: Event) => {
            const tab = (e as CustomEvent).detail?.tab;
            if (tab && typeof tab === 'string') {
                setActiveTab(tab);
            }
        };
        window.addEventListener('app-switch-tab', handleNav);
        return () => window.removeEventListener('app-switch-tab', handleNav);
    }, [setActiveTab]);

    useEffect(() => {
        if (!isLoaded) return;
        saveSetting('sidebar_collapsed', isSidebarCollapsed).catch(() => {});
    }, [isSidebarCollapsed, isLoaded]);

    useEffect(() => {
        // Dark Mode đã bị vô hiệu hoá toàn dự án — luôn ép giao diện Sáng ngay khi mount,
        // đảm bảo không có class 'dark' nào trên <html> dù setting/hệ điều hành có gì.
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
    }, []);

    // Giữ lại cho tương thích API (nhiều nơi vẫn nhận toggleDarkMode qua context) nhưng không làm gì.
    const toggleDarkMode = () => { /* Dark Mode đã tắt toàn dự án — no-op */ };

    const toggleDesktopMenu = useCallback(() => {
        setIsDesktopMenuOpen(prev => {
            const next = !prev;
            try {
                localStorage.setItem('ycx_desktop_menu_open', String(next));
            } catch {
                // Ignore storage errors
            }
            return next;
        });
    }, []);

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
        isDesktopMenuOpen,
        setIsDesktopMenuOpen,
        toggleDesktopMenu,
        isDarkMode, 
        toggleDarkMode,
        activeTab,
        setActiveTab
    }), [isSidebarCollapsed, isMobileSidebarOpen, isDesktopMenuOpen, toggleDesktopMenu, isDarkMode, activeTab, setActiveTab]);

    return (
        <TabContext.Provider value={tabContextValue}>
            <LayoutContext.Provider value={layoutContextValue}>
                {children}
            </LayoutContext.Provider>
        </TabContext.Provider>
    );
};

const defaultTabContext: TabContextType = {
    activeTab: typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('tab') || 'analysis') : 'analysis',
    setActiveTab: (tab: string) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab } }));
        }
    }
};

const defaultLayoutContext: LayoutContextType = {
    isSidebarCollapsed: true,
    setIsSidebarCollapsed: () => {},
    isMobileSidebarOpen: false,
    setIsMobileSidebarOpen: () => {},
    isDesktopMenuOpen: false,
    setIsDesktopMenuOpen: () => {},
    toggleDesktopMenu: () => {},
    isDarkMode: false,
    toggleDarkMode: () => {},
    activeTab: typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('tab') || 'analysis') : 'analysis',
    setActiveTab: (tab: string) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app-switch-tab', { detail: { tab } }));
        }
    },
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[LayoutContext] useLayout được gọi ngoài LayoutProvider, sử dụng giá trị fallback an toàn.');
        }
        return defaultLayoutContext;
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
        if (process.env.NODE_ENV === 'development') {
            console.warn('[LayoutContext] useActiveTab được gọi ngoài LayoutProvider, sử dụng giá trị fallback an toàn.');
        }
        return defaultTabContext;
    }
    return context;
};
