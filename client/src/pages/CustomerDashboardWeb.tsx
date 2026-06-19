import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, ChevronRight, Ticket, Wallet } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import axios from 'axios';
import { motion } from 'framer-motion';
import brandLogo from '../assets/brand_logo.png';
import PromoBannerSlider from '../components/PromoBannerSlider';


interface DashboardStats {
    balance: number;
    totalBookings: number;
    activeTickets: number;
}

const Shimmer = () => (
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
);

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

export default function CustomerDashboard() {
    const navigate = useNavigate();
    const [update, setUpdate] = useState<any>(null);
    const [stats, setStats] = useState<DashboardStats>(() => {
        const saved = localStorage.getItem('last_known_stats');
        return saved ? JSON.parse(saved) : { balance: 0, totalBookings: 0, activeTickets: 0 };
    });
    const [loading, setLoading] = useState(true);

    const handleBookNewTicket = useCallback(() => {
        navigate('/book-ticket');
    }, [navigate]);

    const handleWalletClick = useCallback(() => {
        navigate('/wallet');
    }, [navigate]);

    useEffect(() => {
        // Platform Update Listener
        const unsubUpdate = onSnapshot(doc(db, 'platform_updates', 'current'), (docSnap) => {
            if (docSnap.exists()) {
                setUpdate(docSnap.data());
            }
        });

        // Fetch User Stats
        const fetchStats = async () => {
            const cachedDataStr = sessionStorage.getItem('customer_stats_cache');
            const cachedTimeStr = sessionStorage.getItem('customer_stats_cache_time');
            if (cachedDataStr && cachedTimeStr) {
                const cachedTime = parseInt(cachedTimeStr, 10);
                if (Date.now() - cachedTime < 30000) {
                    setStats(JSON.parse(cachedDataStr));
                    setLoading(false);
                    return;
                }
            }
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get('/api/customer/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(data);
                localStorage.setItem('last_known_stats', JSON.stringify(data));
                sessionStorage.setItem('customer_stats_cache', JSON.stringify(data));
                sessionStorage.setItem('customer_stats_cache_time', Date.now().toString());
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        return () => unsubUpdate();
    }, []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-10 pb-20 px-4 lg:px-8 max-w-7xl mx-auto">
            {/* Header / Identity Area */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg border border-slate-200 dark:border-white/10 group overflow-hidden">
                        <img src={brandLogo} alt="Logo" className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-1.5 w-6 rounded-full bg-brand-blue" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-blue">Travel Control Node</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors italic">
                            Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-teal-400">Dashboard</span>
                        </h1>
                    </div>
                </div>
            </motion.div>

            {/* Promo / Ads Campaign Banner Slider */}
            <motion.div variants={itemVariants}>
                <PromoBannerSlider />
            </motion.div>

            {/* Quick Stats Grid */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Active Tickets Stat */}
                <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-8 shadow-sm dark:shadow-none min-h-[160px] flex flex-col justify-between group transition-all hover:-translate-y-1 hover:border-brand-blue/30 hover:shadow-2xl">
                    {loading && <Shimmer />}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-blue/10 transition-colors" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue border border-brand-blue/20 group-hover:scale-110 transition-transform">
                            <Ticket size={24} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Active Tickets</p>
                    </div>
                    <div className={`transition-opacity duration-300 ${loading ? 'opacity-20' : 'opacity-100'}`}>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic mt-4">{stats.activeTickets}</p>
                    </div>
                </motion.div>

                {/* Wallet Balance Stat */}
                <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-8 shadow-sm dark:shadow-none min-h-[160px] flex flex-col justify-between group transition-all hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-2xl cursor-pointer" onClick={handleWalletClick}>
                    {loading && <Shimmer />}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                            <Wallet size={24} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Wallet Balance</p>
                    </div>
                    <div className={`transition-opacity duration-300 ${loading ? 'opacity-20' : 'opacity-100'}`}>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic mt-4">₹{stats.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </motion.div>

                {/* Live Node Signal */}
                <motion.div variants={itemVariants} className="hidden lg:flex relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-8 items-center gap-8 shadow-sm dark:shadow-none min-h-[160px] hover:shadow-2xl transition-all">
                     <div className="flex-1">
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2 leading-none">Security Node</p>
                        <p className="text-slate-900 dark:text-white text-xs font-black tracking-widest uppercase">Encrypted // Operational</p>
                     </div>
                     <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
                     </div>
                </motion.div>
            </motion.div>

            {/* Feature Modules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                {/* Platform Update Card */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-10 group transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80 shadow-2xl flex flex-col min-h-[360px]">
                    {loading && !update ? (
                        <div className="space-y-6 flex-1 relative overflow-hidden">
                            <Shimmer />
                            <div className="h-10 w-10 bg-slate-200 dark:bg-white/5 rounded-xl border border-white/5" />
                            <div className="space-y-3">
                                <div className="h-8 w-3/4 bg-slate-200 dark:bg-white/5 rounded-lg" />
                                <div className="h-4 w-1/2 bg-slate-200 dark:bg-white/5 rounded-lg" />
                            </div>
                            <div className="h-32 w-full bg-slate-200 dark:bg-white/5 rounded-[2rem]" />
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Zap size={150} className="text-brand-orange group-hover:scale-110 transition-transform duration-1000" />
                            </div>
                            
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-brand-orange/10 text-brand-orange rounded-xl border border-brand-orange/20">
                                    <Zap size={22} />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em]">Node Announcements</h4>
                            </div>
                            
                            <h3 className="text-slate-900 dark:text-white font-black text-3xl mb-6 tracking-tight leading-none italic">{update?.title || 'Stable Connectivity'}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-md font-medium">
                                {update?.content || 'IR Intelligence Node is operational. Monitor the activity stream for corridor optimizations and schedule revisions.'}
                            </p>
                            
                            <div className="mt-auto flex items-center gap-4 pt-10">
                                <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.25em] bg-brand-orange/10 px-4 py-2 rounded-xl border border-brand-orange/20">
                                    {update?.badge || 'Latest Build'}
                                </span>
                                <span className="text-slate-600 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Build {update?.version || '3.0.0'}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Primary Action Card */}
                <button 
                    onClick={handleBookNewTicket}
                    className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-blue to-teal-600 p-10 text-white text-left shadow-[0_30px_60px_-15px_rgba(14,165,233,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all group min-h-[360px]"
                >
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-1000" />
                    
                    <div className="flex flex-col h-full relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-12 border border-white/20 group-hover:rotate-[15deg] transition-transform duration-500 shadow-2xl">
                            <Plus size={40} className="text-white" />
                        </div>
                        
                        <div className="mb-auto">
                            <h3 className="text-5xl font-black uppercase italic tracking-tighter leading-none mb-3 drop-shadow-lg">Book<br/>New Journey</h3>
                            <p className="text-blue-100/60 text-[10px] font-black uppercase tracking-[0.35em]">Instant PNR Reservation Node</p>
                        </div>
                        
                        <div className="pt-8 border-t border-white/10 flex items-center justify-between group-hover:translate-x-2 transition-transform duration-500">
                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Access Booking Grid</span>
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg">
                                <ChevronRight size={22} strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        </motion.div>
    );
}

