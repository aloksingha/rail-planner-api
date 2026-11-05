import React, { useEffect, useState, Suspense, useMemo } from 'react';
import axios from 'axios';
import { 
  Users, ShoppingBag, Activity, ChevronRight, TrendingUp, Plus, Clock, 
  Terminal, AlertCircle, CheckCircle2, Zap, ArrowUpRight, ShieldCheck, 
  Search, ArrowUp, Sparkles, Filter, PieChart as PieChartIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import WalletCard from '../components/WalletCard';
import brandLogo from '../assets/brand_logo.webp';
import PromoBannerSlider from '../components/PromoBannerSlider';

const DashboardCharts = React.lazy(() => import('../components/DashboardCharts'));

// ==========================================
// Modern Clean-White KPI Stat Card (from Instagram UI)
// ==========================================
interface ModernStatCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose';
  subtitle?: string;
  to?: string;
}

const ModernStatCard = React.memo(({
  title,
  value,
  icon: Icon,
  trend = '+12.5%',
  trendUp = true,
  color = 'blue',
  subtitle,
  to
}: ModernStatCardProps) => {
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-100 dark:border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
    },
    sky: {
      bg: 'bg-sky-50 dark:bg-sky-500/10',
      border: 'border-sky-100 dark:border-sky-500/20',
      text: 'text-sky-600 dark:text-sky-400',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      border: 'border-indigo-100 dark:border-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-100 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-100 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      border: 'border-rose-100 dark:border-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
    },
  };

  const scheme = colorSchemes[color] || colorSchemes.blue;

  const cardContent = (
    <div className="p-5 bg-white dark:bg-slate-900/90 rounded-[1.75rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group cursor-pointer relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-2xl ${scheme.bg} ${scheme.border} ${scheme.text} border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">{value}</h3>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
        {trend ? (
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUp size={12} strokeWidth={3} className={trendUp ? 'text-emerald-500' : 'text-rose-500 rotate-180'} />
            <span>{trend}</span>
            <span className="text-slate-400 dark:text-slate-500 font-normal ml-0.5">vs yesterday</span>
          </div>
        ) : subtitle ? (
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});

// Stagger Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 25 } }
};

export default function DashboardHome({ role }: { role?: string }) {
  const [stats, setStats] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('admin_dashboard_stats_v2') || localStorage.getItem('admin_dashboard_stats_v2');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activities, setActivities] = useState<any[]>(() => {
    try {
      const saved = sessionStorage.getItem('admin_dashboard_activities') || localStorage.getItem('admin_dashboard_activities');
      return saved ? JSON.parse(saved) : [];
    } catch {
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
        const cachedStatsStr = sessionStorage.getItem('admin_dashboard_stats_v2') || localStorage.getItem('admin_dashboard_stats_v2');
        const cachedActivitiesStr = sessionStorage.getItem('admin_dashboard_activities') || localStorage.getItem('admin_dashboard_activities');
        const cachedTimeStr = sessionStorage.getItem('admin_dashboard_cache_time');
        if (cachedStatsStr && cachedActivitiesStr) {
          setStats(JSON.parse(cachedStatsStr));
          setActivities(JSON.parse(cachedActivitiesStr));
          setLoading(false);
          setLoadingActivities(false);
          if (cachedTimeStr && Date.now() - parseInt(cachedTimeStr, 10) < 30000) {
            return;
          }
        }
      } catch (cacheError) {
        console.warn('Failed to parse cached dashboard stats', cacheError);
      }

      try {
        const { data } = await axios.get('/api/admin/dashboard-data');
        const statsData = data.stats;
        setStats(statsData);
        setActivities(data.activities);
        sessionStorage.setItem('admin_dashboard_stats_v2', JSON.stringify(statsData));
        sessionStorage.setItem('admin_dashboard_activities', JSON.stringify(data.activities));
        sessionStorage.setItem('admin_dashboard_cache_time', Date.now().toString());
        localStorage.setItem('admin_dashboard_stats_v2', JSON.stringify(statsData));
        localStorage.setItem('admin_dashboard_activities', JSON.stringify(data.activities));
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

  const todayOrders = stats?.todayBookings || 0;
  const totalVolume = (stats?.todayAmount || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16 max-w-screen-2xl mx-auto">
      {/* ======================================================== */}
      {/* 1. Clean White Modern Header (From Instagram Reel)       */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Tickets Pro V2 • Operations Control</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back! <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Here's what's happening across Tickets Pro today.
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Live Engine Online</span>
          </div>

          <Link
            to="/book-ticket"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Promo / Announcement Slider */}
      <PromoBannerSlider />

      {/* ======================================================== */}
      {/* 2. Four Modern KPI Stat Cards (Instagram Reel Style)      */}
      {/* ======================================================== */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-[1.75rem] bg-white dark:bg-slate-900 animate-pulse border border-slate-100 dark:border-white/5 shadow-sm" />
            ))}
          </>
        ) : (
          <>
            <motion.div variants={itemVariants}>
              <ModernStatCard
                title="Total Revenue"
                value={`₹${(stats?.todayAmount || 0).toLocaleString()}`}
                icon={TrendingUp}
                color="blue"
                trend="+12.5%"
                trendUp={true}
                to="/sales"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernStatCard
                title="Total Platform Users"
                value={(stats?.userCount || 0).toLocaleString()}
                icon={Users}
                color="sky"
                trend="+8.3%"
                trendUp={true}
                to="/users"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernStatCard
                title="Today's Bookings"
                value={(stats?.todayBookings || 0).toLocaleString()}
                icon={ShoppingBag}
                color="indigo"
                trend="+6.1%"
                trendUp={true}
                to="/manage-bookings"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernStatCard
                title={stats?.failedBookingCount > 0 ? "Failed Bookings" : "Pending Price Requests"}
                value={(stats?.failedBookingCount > 0 ? stats.failedBookingCount : stats?.priceRequestCount || 0)}
                icon={stats?.failedBookingCount > 0 ? AlertCircle : Activity}
                color={stats?.failedBookingCount > 0 ? "rose" : "amber"}
                trend={stats?.failedBookingCount > 0 ? "Action Needed" : "+4.7%"}
                trendUp={stats?.failedBookingCount === 0}
                to={stats?.failedBookingCount > 0 ? "/failed-bookings" : "/price-requests"}
              />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* ======================================================== */}
      {/* 3. Main Analytics & Circular Donut Split Grid             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left (col-span-2): Revenue Overview Curve Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Revenue Overview</h2>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                  Live Flow
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Real-time booking transactions across all corridors</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">₹{totalVolume.toLocaleString()}</span>
              <span className="text-[10px] font-semibold text-slate-400">Total</span>
            </div>
          </div>

          <div className={`w-full transition-all duration-500 ${chartData.length > 0 ? 'h-[280px]' : 'h-[220px] flex items-center justify-center border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl'}`}>
            {chartData.length > 0 ? (
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-slate-400 text-xs font-medium">Loading chart...</div>}>
                <DashboardCharts data={chartData} />
              </Suspense>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                  <TrendingUp size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Operational Pulse Synchronized</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Live booking data curves dynamically populate here as reservations stream through the engine.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right (col-span-1): Circular Donut Orders Gauge (From Instagram Reel) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between h-full min-h-[360px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Orders &amp; Confirmation</h2>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-500/20">Today</span>
            </div>

            {/* Circular Donut Ring Graphic */}
            <div className="relative flex items-center justify-center my-6">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-800" fill="none" />
                <circle 
                  cx="60" cy="60" r="48" 
                  stroke="#2563eb" 
                  strokeWidth="10" 
                  strokeDasharray="301.6" 
                  strokeDashoffset={todayOrders > 0 ? "60" : "120"}
                  strokeLinecap="round" 
                  fill="none" 
                  className="transition-all duration-1000 ease-out"
                />
                <circle 
                  cx="60" cy="60" r="48" 
                  stroke="#38bdf8" 
                  strokeWidth="10" 
                  strokeDasharray="301.6" 
                  strokeDashoffset={todayOrders > 0 ? "240" : "280"}
                  strokeLinecap="round" 
                  fill="none" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Center Metrics */}
              <div className="absolute text-center flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {todayOrders.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  Total Orders
                </span>
              </div>
            </div>

            {/* Breakdown Legend */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-slate-700 dark:text-slate-300">Confirmed (IRCTC)</span>
                </div>
                <span className="text-slate-900 dark:text-white font-bold">86%</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-slate-700 dark:text-slate-300">Tatkal Auto-Queue</span>
                </div>
                <span className="text-slate-900 dark:text-white font-bold">11%</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span className="text-slate-700 dark:text-slate-300">Review / Processing</span>
                </div>
                <span className="text-slate-900 dark:text-white font-bold">3%</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5">
            <Link to="/manage-bookings" className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors">
              <span>View All Bookings</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. Operations & Command Nodes + Live Terminal & Wallet    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left (col-span-2): Command Nodes */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shadow-sm">
                <Zap size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Platform Operations &amp; Command Nodes</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Instant shortcuts and automated dispatch gateways</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Gateways Active</span>
            </div>
          </div>

          {/* 6 Quick Action Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <Link to="/book-ticket" className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5 hover:border-blue-500/40 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={16} strokeWidth={2.5} />
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Instant Booking</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">IRCTC Tatkal &amp; General</p>
            </Link>

            <Link to="/failed-bookings" className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5 hover:border-rose-500/40 hover:bg-rose-50/30 dark:hover:bg-rose-500/5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertCircle size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  {stats?.failedBookingCount || 0} Pending
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Failed Bookings</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Urgent Intervention Terminal</p>
            </Link>

            <Link to="/inbox" className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5 hover:border-emerald-500/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Terminal size={16} strokeWidth={2.5} />
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Contact Inbox</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">WhatsApp &amp; Web Leads</p>
            </Link>

            <Link to="/price-requests" className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5 hover:border-amber-500/40 hover:bg-amber-50/30 dark:hover:bg-amber-500/5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {stats?.priceRequestCount || 0} Review
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Price Requests</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Dynamic Custom Pricing</p>
            </Link>

            <Link to="/corridors" className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5 hover:border-indigo-500/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck size={16} strokeWidth={2.5} />
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Dynamic Corridors</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Route Margins &amp; Rules</p>
            </Link>

            <Link to="/coupons" className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5 hover:border-teal-500/40 hover:bg-teal-50/30 dark:hover:bg-teal-500/5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Manage Coupons</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Discounts &amp; Promos</p>
            </Link>
          </div>

          {/* Gateway Status Pulse Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">Core Rail API</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Render Online</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">IRCTC Engine</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">RailKit Active</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">WhatsApp Node</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">WhatsGateway</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">TextBee SMS</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Airtel Dedicated</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right (col-span-1): WalletCard & Live Terminal Feed */}
        <div className="lg:col-span-1 space-y-6">
          <WalletCard />

          <div className="bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" />
                  Recent Activity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live Terminal Stream</p>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 max-h-[320px]">
              {loadingActivities ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
                ))
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-2.5 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${
                      activity.type === 'BOOKING' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                    }`}>
                      {activity.type === 'BOOKING' ? <ShoppingBag size={16} /> : <Terminal size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{activity.user}</p>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                        {(activity.details || activity.action || '').replace(/Pushed OTA update to version/gi, 'Synchronized core version')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                  <Activity size={24} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">No Recent Activity Signals</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
              <Link to="/manage-bookings" className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors">
                <span>View Full Operations Logs</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Semantic Footer */}
      <footer role="contentinfo" className="w-full pt-8 pb-4 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 Tickets Pro. Smart Rail Intelligence &amp; Automated Booking.</p>
        <nav aria-label="Footer Site Links" className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
          <Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
          <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Support</Link>
          <Link to="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
          <Link to="/travel-guide" className="hover:text-blue-600 transition-colors">Travel Guide &amp; FAQ</Link>
          <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms &amp; Conditions</Link>
          <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
          <Link to="/refund-policy" className="hover:text-blue-600 transition-colors">Refund Policy</Link>
        </nav>
      </footer>
    </div>
  );
}
