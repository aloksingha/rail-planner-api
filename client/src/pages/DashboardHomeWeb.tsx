import React, { useEffect, useState, Suspense, useMemo } from 'react';
import axios from 'axios';
import { Users, ShoppingBag, Activity, ChevronRight, TrendingUp, Plus, Clock, Terminal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import WalletCard from '../components/WalletCard';
import { InteractiveCard } from '../components/InteractiveCard';
import brandLogo from '../assets/brand_logo.webp';

import { AreaChart as AreaChartIcon } from 'lucide-react';
import PromoBannerSlider from '../components/PromoBannerSlider';

const DashboardCharts = React.lazy(() => import('../components/DashboardCharts'));
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
    <div className="p-6 text-white h-full relative z-10 flex flex-col justify-between min-h-[140px]">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/30 group-hover:scale-125 duration-700" />
      <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-black/10 blur-xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-[10px] uppercase font-black tracking-widest mb-1">{title}</p>
            <div className="text-3xl font-black tracking-tight drop-shadow-md">{value}</div>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-md border border-white/20 shadow-[inset_0_1px_5px_rgba(255,255,255,0.2)] group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
            <Icon size={24} className="text-white drop-shadow-lg" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between mt-2">
        {trend ? (
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm border border-white/20 shadow-sm">
            <TrendingUp size={12} className="text-emerald-300" />
            <span>{trend}</span>
          </div>
        ) : subtitle ? (
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{subtitle}</p>
        ) : (
          <div />
        )}
        <ChevronRight size={18} className="text-white/40 group-hover:translate-x-1 group-hover:text-white transition-all duration-300" />
      </div>
    </div>
  );

  if (to) {
    return (
      <InteractiveCard className={`p-0 overflow-hidden bg-gradient-to-br ${colorMap[color]} shadow-2xl transition-all duration-500 border border-slate-200 dark:border-none group shadow-inner flex flex-col hover:-translate-y-1 hover:shadow-3xl cursor-pointer`}>
        <Link to={to} className="block w-full h-full">
          {cardContent}
        </Link>
      </InteractiveCard>
    );
  }

  return (
    <InteractiveCard className={`p-0 overflow-hidden bg-gradient-to-br ${colorMap[color]} shadow-2xl transition-all duration-500 border border-slate-200 dark:border-none group shadow-inner flex flex-col hover:-translate-y-1 hover:shadow-3xl`}>
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg border border-slate-200 dark:border-white/10 group overflow-hidden">
            <img src={brandLogo} alt="Tickets Pro Logo" width={48} height={48} loading="lazy" className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-6 rounded-full bg-brand-blue" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">Operational Insights</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter italic">
              Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-teal">Center</span>
            </h1>
          </div>
        </div>
        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/5 py-2 px-4 flex items-center gap-3 shadow-sm transition-colors">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-xs font-bold text-slate-700 dark:text-white">Live Services Active</span>
        </div>
      </div>

      {/* Promo / Ads Campaign Banner Slider */}
      <PromoBannerSlider />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-[2rem] bg-slate-200 dark:bg-slate-900 animate-pulse border border-slate-300 dark:border-white/5" />
            ))}
          </>
        ) : isSuperAdmin ? (
          <>
            <motion.div variants={itemVariants}><StatCard title="Failed Bookings" value={stats?.failedBookingCount || 0} icon={Activity} color="rose" subtitle="Urgent Intervention Required" to="/failed-bookings" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Pending Price Requests" value={stats?.priceRequestCount || 0} icon={TrendingUp} color="amber" subtitle="Awaiting Admin Review" to="/price-requests" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Today's Global Bookings" value={stats?.todayBookings || 0} icon={Plus} color="emerald" trend="+14% since yesterday" to="/manage-bookings" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Total Platform Users" value={stats?.userCount || 0} icon={Users} color="indigo" subtitle="Global Reach" to="/users" /></motion.div>
          </>
        ) : isAdmin ? (
          <>
            <motion.div variants={itemVariants}><StatCard title="Today's Team Revenue" value={`₹${(stats?.todayAmount || 0).toLocaleString()}`} icon={TrendingUp} color="rose" subtitle="Sales Team Earnings" to="/sales" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Pending Price Requests" value={stats?.priceRequestCount || 0} icon={TrendingUp} color="amber" subtitle="Awaiting Admin Review" to="/price-requests" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Today's Team Bookings" value={stats?.todayBookings || 0} icon={ShoppingBag} color="emerald" subtitle="Processed via Dashboard" to="/manage-bookings" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="My Sales Team" value={stats?.teamCount || 0} icon={Users} color="indigo" subtitle="Network Members" to="/admin/team" /></motion.div>
          </>
        ) : (
          <>
            <motion.div variants={itemVariants}><StatCard title="Today's Revenue" value={`₹${(stats?.todayAmount || 0).toLocaleString()}`} icon={TrendingUp} color="amber" trend="Peak Hours Active" to="/sales" /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Lifetime Bookings" value={stats?.bookingCount || 0} icon={ShoppingBag} color="indigo" subtitle="Total Generated" to="/sales/bookings" /></motion.div>
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <InteractiveCard className="p-0 bg-brand-blue shadow-2xl overflow-hidden border border-blue-300 dark:border-none cursor-pointer group h-full">
                <Link to="/sales/new-booking" className="block p-6 h-full w-full relative z-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10 flex items-center justify-between h-full">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight mb-1 uppercase italic text-white text-left">Create New Booking</h2>
                      <p className="text-blue-100/70 text-sm font-medium text-left">Instantly reserve IRCTC train tickets for your clients.</p>
                    </div>
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl group-hover:rotate-6 transition-transform">
                      <Plus size={32} className="text-white" />
                    </div>
                  </div>
                </Link>
              </InteractiveCard>
            </motion.div>
          </>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className={`${(isSuperAdmin || isAdmin) ? 'lg:col-span-2' : 'lg:col-span-3'} card-glow p-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm transition-all`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Revenue Velocity</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-bold">REAL-TIME TRANSACTION FLOW OVER TIME</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] font-black uppercase tracking-wider">Daily Trend</div>
          </div>
          
          <div className={`w-full transition-all duration-500 ${chartData.length > 0 ? 'h-[340px]' : 'h-[120px] flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl mt-4'}`}>
            {chartData.length > 0 ? (
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-slate-400 font-medium text-xs">Loading chart module...</div>}>
                <DashboardCharts data={chartData} />
              </Suspense>
            ) : (
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Awaiting Transaction Data</p>
              </div>
            )}
          </div>
        </div>

        {(isSuperAdmin || isAdmin) && (
          <div className="lg:col-span-1 space-y-8">
            <WalletCard />
            
            <div className="card-glow p-6 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm transition-all h-full max-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
                    <Clock size={16} className="text-brand-blue" />
                    Recent Activity
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Live Terminal Feed</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {loadingActivities ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-white/5" />
                  ))
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 p-3 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110 ${
                        activity.type === 'BOOKING' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                      }`}>
                        {activity.type === 'BOOKING' ? <ShoppingBag size={18} /> : <Terminal size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{activity.user}</p>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase">
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{(activity.details || activity.action || '').replace(/Pushed OTA update to version/gi, 'Synchronized core version')}</p>
                        {activity.type === 'BOOKING' && (
                          <div className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            activity.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {activity.status === 'CONFIRMED' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {activity.status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <Activity size={24} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Recent Signals</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                <Link to="/admin/bookings" className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] hover:underline flex items-center justify-center gap-2">
                  View Full Operations Logs <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Platform Knowledge & Semantic Travel Guide */}
      <section className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-sm">
        <div className="max-w-4xl space-y-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-6 rounded-full bg-brand-blue" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">Platform Knowledge &amp; Travel Guide</span>
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Tickets Pro Travel Intelligence &amp; FAQ
          </h2>
          
          <p className="seo-summary-lead text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Tickets Pro is an automated IRCTC train booking, Tatkal assistance, and live PNR tracking platform designed to streamline train travel reservations across India with instant confirmation updates.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <article className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">What is Tickets Pro?</h3>
              <p className="seo-faq-answer text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tickets Pro refers to India's intelligent railway travel coordination system, providing live train seat availability across all classes, high-speed Tatkal booking assistance, automated PNR confirmation checking, and unified refund handling.
              </p>
            </article>

            <article className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">How to Check IRCTC PNR Status?</h3>
              <p className="seo-faq-answer text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Passengers can check their 10-digit IRCTC PNR status instantly via Tickets Pro WhatsApp automated bot or through the web dashboard to receive live coach allotment, berth numbers, and chart status.
              </p>
            </article>

            <article className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">How Does Tatkal Booking Automation Work?</h3>
              <p className="seo-faq-answer text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tatkal booking automation on Tickets Pro monitors quota releases at 10:00 AM for AC classes and 11:00 AM for Non-AC classes, routing verified seat availability to secure reservations within seconds.
              </p>
            </article>

            <article className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">How Are Train Ticket Cancellations &amp; Refunds Handled?</h3>
              <p className="seo-faq-answer text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Refunds are processed automatically back to the passenger's original payment method or wallet according to official Indian Railways cancellation and refund rules within 24 to 48 hours.
              </p>
            </article>
          </div>

          <div className="pt-4 border-t border-slate-200/50 dark:border-white/5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">Indian Railways Travel Definitions</h3>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-white/5">
                <dt className="font-bold text-slate-900 dark:text-white mb-1">PNR (Passenger Name Record)</dt>
                <dd className="text-slate-500 dark:text-slate-400 leading-normal">A unique 10-digit number assigned to train journeys across Indian Railways storing passenger and itinerary data.</dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-white/5">
                <dt className="font-bold text-slate-900 dark:text-white mb-1">Tatkal Quota</dt>
                <dd className="text-slate-500 dark:text-slate-400 leading-normal">An emergency seat reservation quota released one day prior to train departure for urgent passenger travel.</dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-white/5">
                <dt className="font-bold text-slate-900 dark:text-white mb-1">Chart Preparation</dt>
                <dd className="text-slate-500 dark:text-slate-400 leading-normal">The finalization of passenger seat and berth allocations approximately 4 hours prior to train departure.</dd>
              </div>
            </dl>
          </div>

          <div className="pt-4 border-t border-slate-200/50 dark:border-white/5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">IRCTC Booking Quota Timings Reference</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Quota Type</th>
                    <th className="py-2.5 px-3">Opening Time</th>
                    <th className="py-2.5 px-3">Advance Window</th>
                    <th className="py-2.5 px-3">Cancellation Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">AC Tatkal (1A, 2A, 3A, 3E, CC)</td>
                    <td className="py-2.5 px-3 text-emerald-500 font-bold">10:00 AM IST</td>
                    <td className="py-2.5 px-3">1 Day Prior</td>
                    <td className="py-2.5 px-3">Zero refund on confirmed Tatkal</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Non-AC Tatkal (Sleeper / 2S)</td>
                    <td className="py-2.5 px-3 text-emerald-500 font-bold">11:00 AM IST</td>
                    <td className="py-2.5 px-3">1 Day Prior</td>
                    <td className="py-2.5 px-3">Zero refund on confirmed Tatkal</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">General Reservation (GN)</td>
                    <td className="py-2.5 px-3 text-brand-blue font-bold">08:00 AM IST</td>
                    <td className="py-2.5 px-3">Up to 120 Days</td>
                    <td className="py-2.5 px-3">Full refund minus clerkage up to 48 hrs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Semantic Footer with Site Navigation */}
      <footer role="contentinfo" className="w-full pt-8 pb-4 border-t border-slate-200/50 dark:border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 Tickets Pro. Smart Rail Intelligence &amp; Automated Booking.</p>
        <nav aria-label="Footer Site Links" className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
          <Link to="/about" className="hover:text-primary transition-colors">About Us</Link>
          <Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link>
          <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms &amp; Conditions</Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
        </nav>
      </footer>
    </div>
  );
}
