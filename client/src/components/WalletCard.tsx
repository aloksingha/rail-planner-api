import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, RefreshCw } from 'lucide-react';

export default function WalletCard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchWallet = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/wallet/history');
            setData(data);
        } catch (error) {
            console.error('Failed to fetch wallet info', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    if (loading && !data) {
        return (
            <div className="card-glow h-full flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                    <RefreshCw className="text-brand-blue animate-spin" size={24} />
                </div>
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Loading Wallet</p>
            </div>
        );
    }

    const { balance, transactions } = data || { balance: 0, transactions: [] };

    return (
        <div className="card-glow h-full flex flex-col p-6 overflow-hidden relative group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-none transition-all duration-500">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-teal flex items-center justify-center shadow-lg shadow-brand-blue/20">
                            <Wallet className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight">TicketsPro Wallet</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest">Platform Balance</p>
                        </div>
                    </div>
                    <button onClick={fetchWallet} className="p-2 transition-transform active:rotate-180 hover:text-brand-blue text-slate-400">
                        <RefreshCw size={14} className={loading ? 'animate-spin text-brand-blue' : ''} />
                    </button>
                </div>

                <div className="mb-8">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Available Funds</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">₹{balance.toLocaleString()}</span>
                        <span className="text-slate-500 font-black uppercase tracking-widest text-[9px] ml-1">INR</span>
                    </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Activity</p>
                        <Clock size={12} className="text-slate-400" />
                    </div>

                    {transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 border border-slate-200 dark:border-slate-800/50 rounded-2xl border-dashed">
                             <p className="text-slate-400 text-[10px] font-bold uppercase">No transactions yet</p>
                        </div>
                    ) : (
                        transactions.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all group/tx shadow-sm dark:shadow-none">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover/tx:scale-110 shadow-sm ${
                                        tx.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    }`}>
                                        {tx.type === 'CREDIT' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{tx.description || 'Adjustment'}</p>
                                        <p className="text-slate-500 text-[8px] font-bold uppercase">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className={`text-[11px] font-black ${
                                    tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                    {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
