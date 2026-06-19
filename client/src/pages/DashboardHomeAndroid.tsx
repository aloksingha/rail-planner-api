import React, { useEffect, useState, Suspense, useMemo } from 'react';
import axios from 'axios';
import { Users, ShoppingBag, Activity, ChevronRight, TrendingUp, Plus, Clock, Terminal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import WalletCard from '../components/WalletCard';
import { InteractiveCard } from '../components/InteractiveCard';
import brandLogo from '../assets/brand_logo.png';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PromoBannerSlider from '../components/PromoBannerSlider';


interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color?: 'rose' | 'emerald' | 'indigo' | 'amber';
  subtitle?: string;
  to?: string;
}

const StatCard = React.memo(({ title, value, icon: Icon, trend, color = 'indigo', subtitle, to }: StatCardProps) => {
  const colorMap: Record<string, string> = {
    rose: "from-brand-teal via-teal-600 to-teal-800 dark:from-brand-teal dark:via-teal-600 dark:to-brand-deep shadow-slate-200 dark:shadow-brand-teal/20",
    emerald: "from-brand-blue via-blue-600 to-blue-800 dark:from-brand-blue dark:via-blue-600 dark:to-brand-deep shadow-slate-200 dark:shadow-brand-blue/20",
    indigo: "from-slate-800 via-slate-900 to-slate-950 dark:from-brand-deep dark:via-slate-800 dark:to-slate-950 shadow-slate-200 dark:shadow-brand-deep/20",
    amber: "from-brand-orange via-orange-600 to-orange-800 dark:from-brand-orange dark:via-orange-600 dark:to-brand-deep shadow-slate-200 dark:shadow-brand-orange/20",
  };

  const cardContent = (
    <div className="p-5 text-white h-full relative z-10 flex flex-col justify-between min-h-[120px]">
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/30 group-hover:scale-125 duration-700" />
      <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-black/10 blur-xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-white/70 text-[9px] uppercase font-black tracking-widest mb-0.5">{title}</p>
            <h3 className="text-2xl font-black tracking-tight drop-shadow-md">{value}</h3>
          </div>
          <div className="rounded-xl bg-white/15 p-2 backdrop-blur-md border border-white/20 shadow-[inset_0_1px_5px_rgba(255,255,255,0.2)] group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shrink-0">
            <Icon size={18} className="text-white drop-shadow-lg" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between mt-1">
        {trend ? (
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm border border-white/20 shadow-sm">
            <TrendingUp size={10} className="text-emerald-300" />
            <span>{trend}</span>
          </div>
        ) : subtitle ? (
          <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">{subtitle}</p>
        ) : (
          <div />
        )}
        <ChevronRight size={16} className="text-white/40 group-hover:translate-x-1 group-hover:text-white transition-all duration-300" />
      </div>
    </div>
  );

  if (to) {
    return (
      <InteractiveCard className={`p-0 overflow-hidden bg-gradient-to-br ${colorMap[color]} shadow-2xl transition-all duration-500 border border-slate-200 dark:border-none group shadow-inner flex flex-col hover:-translate-y-1 hover:shadow-3xl cursor-pointer rounded-2xl`}>
        <Link to={to} className="block w-full h-full">
          {cardContent}
        </Link>
      </InteractiveCard>
    );
  }

  return (
    <InteractiveCard className={`p-0 overflow-hidden bg-gradient-to-br ${colorMap[color]} shadow-2xl transition-all duration-500 border border-slate-200 dark:border-none group shadow-inner flex flex-col hover:-translate-y-1 hover:shadow-3xl rounded-2xl`}>
      {cardContent}
    </InteractiveCard>
  );
});

// Stagger Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function DashboardHomeAndroid({ role }: { role?: string }) {
  const [stats, setStats] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('admin_dashboard_stats');
      return saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem('admin_dashboard_stats');
      return null;
    }
  });
  const [activities, setActivities] = useState<any[]>(() => {
    try {
      const saved = sessionStorage.getItem('admin_dashboard_activities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      sessionStorage.removeItem('admin_dashboard_activities');
      return [];
    }
  });
  const [loading, setLoading] = useState(!stats);
  const [loadingActivities, setLoadingActivities] = useState(activities.length === 0);

  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const cachedStatsStr = sessionStorage.getItem('admin_dashboard_stats');
        const cachedActivitiesStr = sessionStorage.getItem('admin_dashboard_activities');
        const cachedTimeStr = sessionStorage.getItem('admin_dashboard_cache_time');
        if (cachedStatsStr && cachedActivitiesStr && cachedTimeStr) {
          const cachedTime = parseInt(cachedTimeStr, 10);
          if (Date.now() - cachedTime < 30000) {
            setStats(JSON.parse(cachedStatsStr));
            setActivities(JSON.parse(cachedActivitiesStr));
            setLoading(false);
            setLoadingActivities(false);
            return;
          }
        }
      } catch (cacheError) {
        console.warn('Failed to parse cached dashboard stats', cacheError);
        sessionStorage.removeItem('admin_dashboard_stats');
        sessionStorage.removeItem('admin_dashboard_activities');
        sessionStorage.removeItem('admin_dashboard_cache_time');
      }

      try {
        const { data } = await axios.get('/api/admin/dashboard-data');
        const statsData = data.stats;
        setStats(statsData);
        setActivities(data.activities);
        sessionStorage.setItem('admin_dashboard_stats', JSON.stringify(statsData));
        sessionStorage.setItem('admin_dashboard_activities', JSON.stringify(data.activities));
        sessionStorage.setItem('admin_dashboard_cache_time', Date.now().toString());
      } catch (error) {
        console.error('Failed to fetch dashboard bundle', error);
        if (!stats) {
          setStats({ userCount: 0, teamCount: 0, todayBookings: 0, bookingCount: 0, todayAmount: 0, timeline: [] });
        }
      } finally {
        setLoading(false);
        setLoadingActivities(false);
      }
    };

    fetchDashboardData();
  }, []);

  const chartData = useMemo(() => {
    if (!stats || !stats.timeline) return [];
    return stats.timeline.map((t: any) => ({
      date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      transactions: t.count,
      amount: t.amount || 0
    }));
  }, [stats]);

  const userRole = role || user?.role || 'CUSTOMER';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN';

  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24 bg-slate-50 dark:bg-slate-950 min-h-[100dvh]">
      {styleTag}
      {/* Platform Updates Header */}
      <div className="glass-panel glow-border rounded-xl px-4 py-2 flex items-center gap-3 overflow-hidden bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/5 mx-1">
        <span className="flex h-2 w-2 rounded-full bg-brand-blue animate-pulse shadow-[0_0_8px_#0ea5e9] shrink-0"></span>
        <span className="font-bold text-brand-blue uppercase whitespace-nowrap text-[9px] tracking-wider shrink-0">PLATFORM UPDATES:</span>
        <div className="flex gap-6 items-center animate-[marquee_25s_linear_infinite] text-[9px] text-slate-500 dark:text-slate-400 italic whitespace-nowrap">
          <span>[{timeNow}] Processing latest transactions...</span>
          <span>System status: Healthy</span>
          <span>Security node active</span>
        </div>
      </div>

      {/* Promo / Ads Campaign Banner Slider */}
      <div className="px-1">
        <PromoBannerSlider />
      </div>

      <div className="flex flex-col gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md border border-slate-200 dark:border-white/10 overflow-hidden shrink-0">
            <img src={brandLogo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="h-1 w-4 rounded-full bg-brand-blue" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-blue">Operational Insights</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter italic">
              Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-teal">Center</span>
            </h1>
          </div>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 px-1">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse border border-slate-300 dark:border-white/5" />
            ))}
          </>
        ) : isSuperAdmin ? (
          <>
            <motion.div variants={itemVariants}><StatCard title="Failed Bookings" value={stats?.failedBookingCount || 0} icon={Activity} color="rose" subtitle="Intervention Required" to="/failed-bookings" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Price Requests" value={stats?.priceRequestCount || 0} icon={TrendingUp} color="amber" subtitle="Awaiting Review" to="/price-requests" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Today Bookings" value={stats?.todayBookings || 0} icon={Plus} color="emerald" trend="+14%" to="/manage-bookings" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Platform Users" value={stats?.userCount || 0} icon={Users} color="indigo" subtitle="Global Reach" to="/users" /></motion.div>
          </>
        ) : isAdmin ? (
          <>
            <motion.div variants={itemVariants}><StatCard title="Team Revenue" value={`₹${(stats?.todayAmount || 0).toLocaleString()}`} icon={TrendingUp} color="rose" subtitle="Earnings Today" to="/sales" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Price Requests" value={stats?.priceRequestCount || 0} icon={TrendingUp} color="amber" subtitle="Awaiting Review" to="/price-requests" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Team Bookings" value={stats?.todayBookings || 0} icon={ShoppingBag} color="emerald" subtitle="Processed Today" to="/manage-bookings" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Sales Team" value={stats?.teamCount || 0} icon={Users} color="indigo" subtitle="Network Members" to="/admin/team" /></motion.div>
          </>
        ) : (
          <>
            <motion.div variants={itemVariants}><StatCard title="Today's Revenue" value={`₹${(stats?.todayAmount || 0).toLocaleString()}`} icon={TrendingUp} color="amber" trend="Peak Active" to="/sales" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Lifetime Bookings" value={stats?.bookingCount || 0} icon={ShoppingBag} color="indigo" subtitle="Total Generated" to="/sales/bookings" /></motion.div>
            <motion.div variants={itemVariants} className="col-span-2">
              <InteractiveCard className="p-0 bg-brand-blue shadow-lg overflow-hidden border border-blue-300 dark:border-none cursor-pointer group rounded-2xl h-24">
                <Link to="/sales/new-booking" className="block p-5 h-full w-full relative z-10">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10 flex items-center justify-between h-full">
                    <div>
                      <h4 className="text-lg font-black tracking-tight mb-0.5 uppercase italic text-white text-left">Create New Booking</h4>
                      <p className="text-blue-100/70 text-[10px] font-medium text-left">Instantly reserve IRCTC train tickets.</p>
                    </div>
                    <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-md group-hover:rotate-6 transition-transform shrink-0">
                      <Plus size={20} className="text-white" />
                    </div>
                  </div>
                </Link>
              </InteractiveCard>
            </motion.div>
          </>
        )}
      </motion.div>

      <div className="space-y-6 px-1">
        <div className="card-glow p-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">Revenue Velocity</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[9px] mt-0.5 font-bold">REAL-TIME TRANSACTION FLOW OVER TIME</p>
            </div>
            <div className="px-2.5 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[8px] font-black uppercase tracking-wider">Daily Trend</div>
          </div>
          
          <div className={`w-full transition-all duration-500 ${chartData.length > 0 ? 'h-[220px]' : 'h-[100px] flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl mt-2'}`}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} opacity={0.5} />
                  <XAxis dataKey="date" stroke="currentColor" className="text-slate-500 dark:text-slate-600" tick={{ fontSize: 9, fontWeight: 800 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="currentColor" className="text-slate-500 dark:text-slate-600" tick={{ fontSize: 9, fontWeight: 800 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₹${v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#f8fafc' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1.5 }}
                  />
                  <Area type="monotone" name="Amount" dataKey="amount" stroke="#0D9488" strokeWidth={3} fill="url(#colorAmount)" activeDot={{ r: 4, fill: '#0D9488', strokeWidth: 0 }} />
                  <Area type="monotone" name="Transactions" dataKey="transactions" stroke="#0EA5E9" strokeWidth={3} fill="url(#colorTransactions)" activeDot={{ r: 4, fill: '#0EA5E9', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Awaiting Transaction Data</p>
              </div>
            )}
          </div>
        </div>

        {(isSuperAdmin || isAdmin) && (
          <div className="space-y-6">
            <WalletCard />
            
            <div className="card-glow p-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm transition-all flex flex-col max-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-1.5">
                    <Clock size={14} className="text-brand-blue" />
                    Recent Activity
                  </h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Live Terminal Feed</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {loadingActivities ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-white/5" />
                  ))
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 p-2.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 ${
                        activity.type === 'BOOKING' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                      }`}>
                        {activity.type === 'BOOKING' ? <ShoppingBag size={14} /> : <Terminal size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-[10px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{activity.user}</p>
                          <span className="text-[8px] font-bold text-slate-400 shrink-0 uppercase">
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{activity.details || activity.action}</p>
                        {activity.type === 'BOOKING' && (
                          <div className={`mt-0.5 inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-widest ${
                            activity.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {activity.status === 'CONFIRMED' ? <CheckCircle2 size={8} /> : <AlertCircle size={8} />}
                            {activity.status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center flex flex-col items-center justify-center gap-1.5">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <Activity size={18} />
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No Recent Signals</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styleTag = (
  <style>
    {`
    .glass-panel {
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .dark .glass-panel {
      background: rgba(13, 19, 34, 0.4);
      border-top: 1px solid rgba(137, 206, 255, 0.1);
    }
    .glow-border {
      box-shadow: inset 0 0 10px rgba(137, 206, 255, 0.1), 0 0 20px rgba(137, 206, 255, 0.05);
      border: 1px solid rgba(137, 206, 255, 0.2);
    }
    `}
  </style>
);
