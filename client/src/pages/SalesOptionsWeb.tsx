import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { IndianRupee, TrendingUp, ShoppingBag, Plus, BarChart2, ArrowUpRight, Route as RouteIcon, Coins, Percent, ChevronRight } from 'lucide-react';
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
        <div className="flex items-center justify-center h-64 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-brand-teal border-t-transparent animate-spin" />
            <span className="text-slate-400 font-medium">Loading sales analytics...</span>
        </div>
    );
    if (!salesData) return <div className="text-rose-400 p-8 card">Failed to load sales dashboard.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            {/* Vibrant Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-teal via-teal-600 to-brand-deep p-8 shadow-2xl shadow-brand-teal/30 group">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                        <TrendingUp size={32} className="text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight data-[theme=light]:text-slate-900">Sales Overview</h1>
                        <p className="text-cyan-100/70 text-sm mt-1 font-medium data-[theme=light]:text-brand-blue/70">Tracking revenue, bookings, and performance metrics with high-fidelity analytics.</p>
                    </div>
                    <div className="md:ml-auto">
                        <Link
                            to="/sales/new-booking"
                            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-2.5 text-white font-bold flex items-center gap-2 hover:bg-white/20 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={18} /> New Booking
                        </Link>
                        {(() => {
                            const user = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                            if (user.role === 'SUPER_ADMIN') {
                                return (
                                    <Link
                                        to="/corridors"
                                        className="bg-brand-blue/10 backdrop-blur-md border border-brand-blue/20 rounded-xl px-5 py-2.5 text-brand-blue font-bold flex items-center gap-2 hover:bg-brand-blue/20 transition-all shadow-lg active:scale-95 whitespace-nowrap ml-0 md:ml-3 mt-3 md:mt-0"
                                    >
                                        <RouteIcon size={18} /> Manage Pricing
                                    </Link>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className={`grid grid-cols-1 ${salesData.totalCommission !== undefined ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5`}>
                {/* Revenue */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-teal via-teal-600 to-brand-deep p-6 shadow-xl shadow-brand-teal/20 data-[theme=light]:from-brand-teal data-[theme=light]:to-teal-500">
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-black/10 rounded-full blur-xl" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Gross Revenue</p>
                            <div className="p-2 bg-white/15 rounded-xl">
                                <IndianRupee size={18} className="text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-black text-white">
                            ₹{salesData.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-1.5 mt-3 text-white/70 text-xs font-medium">
                            <TrendingUp size={13} />
                            <span>+12.5% this month</span>
                        </div>
                    </div>
                </div>

                {/* Orders */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-blue-600 to-brand-deep p-6 shadow-xl shadow-brand-blue/20 data-[theme=light]:from-brand-blue data-[theme=light]:to-blue-500">
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-black/10 rounded-full blur-xl" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Total Orders</p>
                            <div className="p-2 bg-white/15 rounded-xl">
                                <ShoppingBag size={18} className="text-white" />
                            </div>
                        </div>
                        <p className="text-4xl font-black text-white">{salesData.totalSalesCount.toLocaleString()}</p>
                        <div className="flex items-center gap-1.5 mt-3 text-white/70 text-xs font-medium">
                            <BarChart2 size={13} />
                            <span>Tickets processed</span>
                        </div>
                    </div>
                </div>

                {/* Commission */}
                {salesData.totalCommission !== undefined && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-orange via-orange-600 to-brand-deep p-6 shadow-xl shadow-brand-orange/20 data-[theme=light]:from-brand-orange data-[theme=light]:to-orange-500">
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-black/10 rounded-full blur-xl" />
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <p className="text-white/70 text-xs font-bold uppercase tracking-widest">
                                    {(() => {
                                        const user = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                                        return user.role === 'SALES_MANAGER' ? 'Commission Earned' : 'Commissions Paid';
                                    })()}
                                </p>
                                <div className="p-2 bg-white/15 rounded-xl">
                                    <IndianRupee size={18} className="text-white" />
                                </div>
                            </div>
                            <p className="text-4xl font-black text-white">
                                ₹{salesData.totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center gap-1.5 mt-3 text-white/70 text-xs font-medium">
                                <TrendingUp size={13} />
                                <span>Commission earnings</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Commission Chart Quick-Access Banner (Sales Manager only) */}
            {(() => {
                const user = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                if (user.role !== 'SALES_MANAGER') return null;
                return (
                    <Link to="/sales/commission-chart" className="group block">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-brand-orange border border-amber-400/20 shadow-xl shadow-amber-500/10 p-5 flex items-center justify-between hover:shadow-amber-500/25 transition-all duration-300 active:scale-[0.99]">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                            <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
                                    <Coins size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-amber-100/70 font-black uppercase tracking-widest mb-0.5">Sales Manager Earnings</p>
                                    <h3 className="text-white font-black text-lg leading-none">Commission Chart</h3>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        {[{ label: 'Platinum', rate: '5%' }, { label: 'Gold', rate: '7%' }, { label: 'Silver', rate: '8%' }, { label: 'Bronze', rate: '10%' }].map(t => (
                                            <span key={t.label} className="text-[9px] font-black text-white/80 uppercase tracking-wider bg-white/10 border border-white/20 rounded px-1.5 py-0.5">{t.label} · {t.rate}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10 flex items-center gap-2 text-white/80 group-hover:text-white transition-colors shrink-0 pl-4">
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">View Chart</span>
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                );
            })()}

            {/* Revenue Chart */}
            <div className="card-glow p-6 data-[theme=light]:bg-white/90 data-[theme=light]:border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white data-[theme=light]:text-slate-900">Revenue Timeline</h2>
                        <p className="text-slate-500 text-xs mt-0.5 data-[theme=light]:text-slate-500">Daily revenue over recent period</p>
                    </div>
                    <span className="text-xs text-brand-teal font-semibold bg-brand-teal/10 px-3 py-1 rounded-full border border-brand-teal/20">Live</span>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData.timelineData}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }}
                                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                            <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '0.75rem', fontSize: 12 }}
                                formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']}
                                labelFormatter={(l) => new Date(l).toLocaleDateString()}
                            />
                            <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#revGrad)"
                                dot={{ fill: '#0ea5e9', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#0ea5e9' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="card-glow p-6 data-[theme=light]:bg-white/80">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Recent Bookings</h2>
                    <Link to="/sales/bookings" className="text-xs text-brand-teal hover:text-cyan-400 font-semibold flex items-center gap-1">
                        View All <ArrowUpRight size={12} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="pb-3 pr-4 font-semibold">Customer</th>
                                <th className="pb-3 pr-4 font-semibold">Journey</th>
                                <th className="pb-3 pr-4 font-semibold">Date</th>
                                <th className="pb-3 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesData.recentBookings.map((b, i) => (
                                <tr key={b.id} className={`border-b border-slate-800/40 hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : ''}`}>
                                    <td className="py-3.5 pr-4 text-sm text-white font-medium">{b.user?.email?.split('@')[0] || 'Unknown'}</td>
                                    <td className="py-3.5 pr-4 text-sm text-slate-400 max-w-[180px] truncate">{b.event?.name || '—'}</td>
                                    <td className="py-3.5 pr-4 text-xs text-slate-500">{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                                    <td className="py-3.5">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                                            ${b.status === 'CONFIRMED' ? 'bg-brand-teal/15 text-brand-teal border border-brand-teal/20'
                                                : b.status === 'CANCELLED' ? 'bg-brand-rose/15 text-brand-rose border border-brand-rose/20'
                                                    : 'bg-brand-orange/15 text-brand-orange border border-brand-orange/20'}`}>
                                            {b.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {salesData.recentBookings.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-500">
                                        <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
                                        No bookings yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
