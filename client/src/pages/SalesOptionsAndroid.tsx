import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { IndianRupee, TrendingUp, ShoppingBag, Plus, BarChart2, ArrowUpRight, Route as RouteIcon, Coins, ChevronRight } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface Booking {
    id: string;
    status: string;
    createdAt: string;
    user: { email: string };
    event: { name: string };
}

export default function SalesOptions() {
    const [salesData, setSalesData] = useState<{
        totalRevenue: number;
        recentBookings: Booking[];
        totalSalesCount: number;
        totalCommission?: number;
        timelineData: { date: string, amount: number }[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const { data } = await axios.get('/api/admin/sales');
                setSalesData(data);
            } catch (error) {
                console.error('Failed to fetch sales data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <div className="w-5 h-5 rounded-full border-2 border-brand-blue/20 border-t-brand-blue animate-spin" />
            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-widest">Loading analytics...</span>
        </div>
    );
    if (!salesData) return <div className="text-rose-400 p-8 card">Failed to load sales dashboard.</div>;

    return (
        <div className="pb-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* SCI-FI HEADER */}
            <div className="glass-panel p-6 mb-6 relative overflow-hidden group bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10">

                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 bg-repeat bg-[length:24px_24px]" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-slate-200 dark:border-brand-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <TrendingUp className="text-brand-blue" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Sales Analytics</h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1">Real-time sales tracking</p>
                        </div>
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-brand-blue/50 via-teal-500/50 to-transparent" />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 mb-8">
                <Link
                    to="/sales/new-booking"
                    className="flex-1 glass-panel py-4 flex items-center justify-center gap-2 text-white font-black uppercase tracking-[0.2em] text-[10px] bg-brand-blue shadow-[0_0_15px_rgba(14,165,233,0.1)] active:scale-95 transition-all rounded-xl border border-white/10"
                >
                    <Plus size={16} /> CREATE BOOKING
                </Link>
                {(() => {
                    const user = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                    if (user.role === 'SUPER_ADMIN') {
                        return (
                            <Link
                                to="/corridors"
                                className="flex-1 glass-panel py-4 flex items-center justify-center gap-2 text-brand-teal font-black uppercase tracking-[0.2em] text-[10px] bg-brand-teal/5 dark:bg-brand-teal/10 border border-brand-teal/30 active:scale-95 transition-all rounded-xl"
                            >
                                <RouteIcon size={16} /> MANAGE ROUTES
                            </Link>
                        );
                    }
                    return null;
                })()}
            </div>

            {/* STAT TILES */}
            <div className="grid grid-cols-1 gap-4 mb-8">
                {/* Revenue */}
                <div className="glass-panel p-6 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Gross Revenue</p>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                                ₹{salesData.totalRevenue.toLocaleString('en-IN')}
                            </h2>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                            <IndianRupee size={20} className="text-emerald-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest relative z-10">
                        <TrendingUp size={12} />
                        <span>+12.5% performance increase</span>
                    </div>
                </div>

                {/* Orders */}
                <div className="glass-panel p-6 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Tickets</p>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                                {salesData.totalSalesCount.toLocaleString()}
                            </h2>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center">
                            <ShoppingBag size={20} className="text-brand-blue" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-brand-blue text-[10px] font-black uppercase tracking-widest relative z-10">
                        <BarChart2 size={12} />
                        <span>Tickets Booked</span>
                    </div>
                </div>

                {/* Commission */}
                {salesData.totalCommission !== undefined && (
                    <div className="glass-panel p-6 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                        <div className="flex items-start justify-between mb-4 relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                                    {(() => {
                                        const user = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                                        return user.role === 'SALES_MANAGER' ? 'Commission Earned' : 'Commissions Paid';
                                    })()}
                                </p>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                                    ₹{salesData.totalCommission.toLocaleString('en-IN')}
                                </h2>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                                <IndianRupee size={20} className="text-amber-500" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest relative z-10">
                            <TrendingUp size={12} />
                            <span>Commission earnings</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Commission Chart Quick-Access (Sales Manager only) */}
            {(() => {
                const user = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                if (user.role !== 'SALES_MANAGER') return null;
                return (
                    <Link to="/sales/commission-chart" className="block mb-6 active:scale-[0.98] transition-transform">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-brand-orange p-5 shadow-lg shadow-amber-500/20">
                            <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
                                        <Coins size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-amber-100/70 font-black uppercase tracking-widest">My Earnings</p>
                                        <h3 className="text-white font-black text-base leading-tight">Commission Chart</h3>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            {[{ label: 'Platinum', rate: '5%' }, { label: 'Gold', rate: '7%' }, { label: 'Silver', rate: '8%' }, { label: 'Bronze', rate: '10%' }].map(t => (
                                                <span key={t.label} className="text-[8px] font-black text-white/80 bg-white/10 border border-white/20 rounded px-1 py-0.5">{t.label} {t.rate}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={22} className="text-white/70" />
                            </div>
                        </div>
                    </Link>
                );
            })()}

            {/* CHART PANEL */}
            <div className="glass-panel p-6 mb-6 relative overflow-hidden group bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10">

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Revenue Trend</h2>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1">Daily performance overview</p>
                    </div>

                    <div className="flex items-center gap-2 px-2 py-1 bg-brand-blue/5 dark:bg-brand-blue/10 border border-slate-200 dark:border-brand-blue/30 rounded text-[8px] font-black text-brand-blue uppercase tracking-widest animate-pulse">
                        UPDATED LIVE
                    </div>
                </div>
                
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData.timelineData}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#475569" 
                                tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }}
                                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                stroke="#475569" 
                                tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} 
                                tickFormatter={(v) => `₹${v}`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                    border: '1px solid rgba(14, 165, 233, 0.3)', 
                                    borderRadius: '0.75rem', 
                                    fontSize: 10,
                                    backdropFilter: 'blur(8px)',
                                    textTransform: 'uppercase',
                                    fontWeight: 900,
                                    letterSpacing: '0.1em'
                                }}
                                itemStyle={{ color: '#0ea5e9' }}
                                cursor={{ stroke: 'rgba(14, 165, 233, 0.2)', strokeWidth: 2 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="amount" 
                                stroke="#0ea5e9" 
                                strokeWidth={3} 
                                fill="url(#revGrad)"
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="glass-panel p-5 relative overflow-hidden bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Recent Bookings</h2>
                    <Link to="/sales/bookings" className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-1">
                        View All <ArrowUpRight size={12} />
                    </Link>
                </div>

                
                <div className="space-y-3">
                    {salesData.recentBookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl hover:border-brand-blue/20 transition-all group">
                            <div className="flex-1 min-w-0 pr-3">
                                <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{b.event?.name || 'GENERIC TRANSIT'}</p>

                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[9px] font-bold text-slate-500 font-mono truncate">{b.user?.email}</p>
                                    <span className="text-[8px] text-slate-600 font-black">•</span>
                                    <p className="text-[9px] font-bold text-slate-600 font-mono">{new Date(b.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest
                                ${b.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                    : b.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        : 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'}`}>
                                {b.status}
                            </div>
                        </div>
                    ))}
                    {salesData.recentBookings.length === 0 && (
                        <div className="py-10 text-center">
                            <ShoppingBag size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-700 opacity-30" />
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">No Active Bookings</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
