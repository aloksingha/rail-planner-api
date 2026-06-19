import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import axios from 'axios';
import { motion } from 'framer-motion';
import PromoBannerSlider from '../components/PromoBannerSlider';


interface DashboardStats {
    balance: number;
    totalBookings: number;
    activeTickets: number;
}

export default function CustomerDashboardAndroid() {
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
        const unsubUpdate = onSnapshot(doc(db, 'platform_updates', 'current'), (docSnap) => {
            if (docSnap.exists()) {
                setUpdate(docSnap.data());
            }
        });

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

    // Time for the logs ticker
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div className="font-body-md text-slate-900 dark:text-white selection:bg-brand-blue/30 min-h-[100dvh] pb-32 bg-slate-50 dark:bg-slate-950">
            
            {/* Ambient Background Layers are managed by .native-android-theme globally, but we add local panel styling */}
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

            <main className="pt-8 px-margin-page max-w-5xl mx-auto space-y-stack-lg relative z-10">
                {/* Platform Updates */}
                <div className="glass-panel glow-border rounded-lg px-4 py-2 flex items-center gap-4 overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                    <span className="flex h-2 w-2 rounded-full bg-brand-blue animate-pulse shadow-[0_0_8px_#89ceff] shrink-0"></span>
                    <span className="font-label-sm text-brand-blue uppercase whitespace-nowrap text-[10px] shrink-0">LATEST:</span>
                    <div className="flex gap-8 items-center animate-[marquee_20s_linear_infinite] font-label-sm text-[10px] text-slate-500 dark:text-slate-400 italic whitespace-nowrap">
                        <span>[{timeNow}] Secure encrypted connection active...</span>
                        <span>Checking latest ticket availability...</span>
                        <span>{update?.title ? `ANNOUNCEMENT: ${update.title.toUpperCase()}` : 'ALL SYSTEMS OPERATIONAL...'}</span>
                    </div>
                </div>

                {/* Promo / Ads Campaign Banner Slider */}
                <PromoBannerSlider />

                {/* Main Header & Action */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
                    <div>
                        <h1 className="font-headline-lg text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">TICKETS PRO</h1>
                        <p className="font-body-md text-sm text-slate-500 dark:text-slate-400 opacity-70 tracking-widest uppercase">Manage your tickets and wallet balance.</p>
                    </div>
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBookNewTicket}
                        className="mt-6 bg-gradient-to-r from-brand-blue to-sky-600 text-white font-black uppercase text-[10px] tracking-[0.2em] px-8 py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.4)] border border-sky-400/50 w-full md:w-auto"
                    >
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                        BOOK NEW TICKET
                    </motion.button>
                </div>

                {/* Dashboard Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                    
                    {/* Stats Card 1: Wallet Balance */}
                    <motion.div 
                        whileTap={{ scale: 0.98 }}
                        onClick={handleWalletClick}
                        className="glass-panel glow-border p-5 rounded-xl space-y-3 relative overflow-hidden group cursor-pointer bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10"
                    >
                        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
                        <div className="flex justify-between items-start">
                            <span className="font-label-sm text-[10px] font-black text-primary-container uppercase tracking-widest">Wallet Balance</span>
                            <span className="material-symbols-outlined text-primary/40 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-display-lg text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic ${loading ? 'opacity-20' : 'opacity-100'} transition-opacity`}>
                                ₹{stats.balance.toLocaleString('en-IN')}
                            </span>
                            <span className="text-secondary font-label-sm text-[10px] uppercase font-black tracking-widest">LIVE</span>
                        </div>
                        {/* Visualizer */}
                        <div className="h-12 flex items-end gap-1 px-1 opacity-60">
                            <div className="flex-1 bg-emerald-500/30 h-1/2 rounded-t-sm group-hover:bg-emerald-500/80 transition-colors"></div>
                            <div className="flex-1 bg-emerald-500/30 h-2/3 rounded-t-sm group-hover:bg-emerald-500/80 transition-colors delay-75"></div>
                            <div className="flex-1 bg-emerald-500/30 h-[90%] rounded-t-sm group-hover:bg-emerald-500/80 transition-colors delay-100"></div>
                            <div className="flex-1 bg-emerald-500/30 h-3/4 rounded-t-sm group-hover:bg-emerald-500/80 transition-colors delay-150"></div>
                            <div className="flex-1 bg-emerald-500/30 h-5/6 rounded-t-sm group-hover:bg-emerald-500/80 transition-colors delay-200"></div>
                        </div>
                    </motion.div>

                    {/* Stats Card 2: Active Tickets */}
                    <div className="glass-panel glow-border p-5 rounded-xl space-y-3 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
                        <div className="flex justify-between items-start">
                            <span className="font-label-sm text-[10px] font-black text-primary-container uppercase tracking-widest">Active Tickets</span>
                            <span className="material-symbols-outlined text-primary/40 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-display-lg text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic ${loading ? 'opacity-20' : 'opacity-100'} transition-opacity`}>
                                {stats.activeTickets}
                            </span>
                            <span className="text-brand-blue font-label-sm text-[10px] uppercase font-black tracking-widest">BOOKED</span>
                        </div>
                        {/* Visualizer */}
                        <div className="h-12 flex items-center justify-center relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 border-2 border-primary/20 rounded-full border-t-primary animate-spin"></div>
                            </div>
                            <span className="text-[8px] font-label-sm font-black tracking-widest text-primary/60 uppercase">SYNCING</span>
                        </div>
                    </div>

                    {/* Stats Card 3: Total Bookings */}
                    <div className="glass-panel glow-border p-5 rounded-xl space-y-3 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
                        <div className="flex justify-between items-start">
                            <span className="font-label-sm text-[10px] font-black text-primary-container uppercase tracking-widest">Total Bookings</span>
                            <span className="material-symbols-outlined text-primary/40 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-display-lg text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic ${loading ? 'opacity-20' : 'opacity-100'} transition-opacity`}>
                                {stats.totalBookings}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-label-sm opacity-50 text-[10px] uppercase font-black tracking-widest">ALL TIME</span>
                        </div>
                        {/* Visualizer */}
                        <div className="h-12 space-y-2 pt-2">
                            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-primary to-secondary w-[85%] h-full rounded-full shadow-[0_0_8px_rgba(137,206,255,0.5)]"></div>
                            </div>
                            <div className="flex justify-between font-label-sm text-[8px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
                                <span>LIFETIME METRIC</span>
                                <span className="text-primary">85%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Announcements & Updates */}
                <div className="glass-panel glow-border rounded-xl overflow-hidden min-h-[250px] flex flex-col md:flex-row relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                    <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
                    
                    <div className="flex-[1.5] p-6 space-y-4 border-b md:border-b-0 md:border-r border-sky-500/10 z-10 relative">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-brand-orange text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
                            <h2 className="font-headline-md text-sm font-black uppercase tracking-widest text-brand-orange drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">Announcements</h2>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-display-lg text-2xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white leading-tight">
                                {update?.title || 'System Operational'}
                            </h3>
                            <p className="font-body-md text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest leading-relaxed">
                                {update?.content || 'Platform Management is fully operational. Secure communication lines are active and stable.'}
                            </p>
                        </div>
                        <div className="pt-4 flex items-center gap-4">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-3 py-1 rounded">
                                {update?.badge || 'VERIFIED'}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">
                                V.{update?.version || '1.0.0'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Tech graphic side */}
                    <div className="flex-1 relative min-h-[200px] bg-slate-900/50 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at center, #0ea5e9 0%, transparent 60%)' }}></div>
                        
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <div className="absolute inset-0 border border-sky-400/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                            <div className="absolute inset-2 border border-brand-orange/20 rounded-full animate-[spin_7s_linear_infinite_reverse]"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-sky-400 opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-sky-400/50 mt-1">CONNECTED</span>
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                            <div className="bg-slate-950/60 border border-white/5 p-2 rounded text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shadow-[0_0_5px_#f59e0b] animate-pulse"></span>
                                BROADCAST
                            </div>
                            <div className="bg-slate-950/60 border border-white/5 p-2 rounded text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#89ceff]"></span>
                                ENCRYPTED
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
