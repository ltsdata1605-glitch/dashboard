
import React from 'react';
import { motion } from 'motion/react';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const activities = [
  {
    id: 1,
    user: 'Sarah Miller',
    action: 'Subscription upgrade',
    amount: '+$1,200.00',
    status: 'completed',
    time: '2 mins ago',
    icon: CheckCircle2,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    id: 2,
    user: 'James Wilson',
    action: 'Payment failed',
    amount: '-$450.00',
    status: 'failed',
    time: '15 mins ago',
    icon: AlertCircle,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
  },
  {
    id: 3,
    user: 'Emily Blunt',
    action: 'New user registration',
    amount: 'Free',
    status: 'pending',
    time: '1 hour ago',
    icon: Clock,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  },
  {
    id: 4,
    user: 'Michael Scott',
    action: 'Invoice paid',
    amount: '+$3,400.00',
    status: 'completed',
    time: '3 hours ago',
    icon: CheckCircle2,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    id: 5,
    user: 'Pam Beesly',
    action: 'Refund processed',
    amount: '-$120.00',
    status: 'completed',
    time: '5 hours ago',
    icon: CheckCircle2,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  },
];

export default function RecentActivity() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Latest transactions across your platform</p>
        </div>
        <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <MoreHorizontal className="w-6 h-6 text-slate-400" />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 dark:border-slate-700">User</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 dark:border-slate-700">Action</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 dark:border-slate-700">Amount</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 dark:border-slate-700">Status</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right border-b border-slate-200 dark:border-slate-700">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {activities.map((activity, idx) => (
              <motion.tr 
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group"
              >
                <td className="px-8 py-5 border-r border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{activity.user}</span>
                  </div>
                </td>
                <td className="px-8 py-5 border-r border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{activity.action}</span>
                </td>
                <td className="px-8 py-5 border-r border-slate-200 dark:border-slate-700">
                  <div className={`flex items-center gap-1 font-bold text-sm ${activity.amount.startsWith('+') ? 'text-emerald-500' : activity.amount === 'Free' ? 'text-slate-400' : 'text-rose-500'}`}>
                    {activity.amount.startsWith('+') ? <ArrowUpRight className="w-4 h-4" /> : activity.amount.startsWith('-') ? <ArrowDownRight className="w-4 h-4" /> : null}
                    {activity.amount}
                  </div>
                </td>
                <td className="px-8 py-5 border-r border-slate-200 dark:border-slate-700">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${activity.color}`}>
                    <activity.icon className="w-3.5 h-3.5" />
                    <span className="capitalize">{activity.status}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{activity.time}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 text-center">
        <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors uppercase tracking-widest">
          View All Transactions
        </button>
      </div>
    </div>
  );
}
