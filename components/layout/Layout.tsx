
import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLayout } from '../../contexts/LayoutContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isSidebarCollapsed } = useLayout();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 flex">
      <Sidebar />
      
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        isSidebarCollapsed ? "lg:pl-20" : "lg:pl-[260px]"
      )}>
        <TopBar />
        
        <main className="flex-1 pt-16 overflow-x-hidden">
          <div className="p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
