
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import KPICard from './KPICard';
import { RevenueChart, CategoryPieChart, ActivityBarChart } from './Charts';
import RecentActivity from './RecentActivity';
import { 
  Users, 
  DollarSign, 
  ShoppingBag, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto space-y-12">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2"
                >
                  Dashboard Overview
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-slate-500 dark:text-slate-400 font-medium"
                >
                  Welcome back, Alex! Here's what's happening today.
                </motion.p>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                  <Calendar className="w-4 h-4" />
                  Last 30 Days
                </button>
                <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <KPICard 
                title="Total Revenue" 
                value="$128,430" 
                change="+12.5%" 
                isUp={true} 
                icon={DollarSign} 
                color="bg-indigo-500"
                delay={0.1}
              />
              <KPICard 
                title="Active Users" 
                value="43,210" 
                change="+5.2%" 
                isUp={true} 
                icon={Users} 
                color="bg-sky-500"
                delay={0.2}
              />
              <KPICard 
                title="Total Sales" 
                value="12,843" 
                change="-2.4%" 
                isUp={false} 
                icon={ShoppingBag} 
                color="bg-amber-500"
                delay={0.3}
              />
              <KPICard 
                title="Avg. Session" 
                value="12m 43s" 
                change="+8.1%" 
                isUp={true} 
                icon={Activity} 
                color="bg-rose-500"
                delay={0.4}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Revenue Growth</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly revenue trend for 2024</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue</span>
                    </div>
                  </div>
                </div>
                <RevenueChart />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="mb-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Market Share</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Distribution by category</p>
                </div>
                <CategoryPieChart />
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Top Performer</span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">SaaS (40%)</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="lg:col-span-2"
              >
                <RecentActivity />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="mb-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Weekly Activity</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">User engagement metrics</p>
                </div>
                <ActivityBarChart />
                <div className="mt-8 p-6 bg-indigo-600 rounded-3xl text-white relative overflow-hidden group">
                  <div className="relative z-10">
                    <h4 className="font-black text-lg mb-2">Upgrade to Pro</h4>
                    <p className="text-indigo-100 text-sm mb-4 opacity-80">Get advanced analytics and unlimited users.</p>
                    <button className="px-6 py-3 bg-white text-indigo-600 rounded-2xl text-sm font-bold hover:bg-indigo-50 transition-all">
                      Learn More
                    </button>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                </div>
              </motion.div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
