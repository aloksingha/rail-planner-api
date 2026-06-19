import { useEffect, useState } from 'react';
import axios from 'axios';
import ReportExport from '../components/ReportExport';

interface Payment {
    id: string;
    paymentId: string;
    amount: number;
    status: string;
    createdAt: string;
    bookingId?: string | null;
    refundInfo?: {
        status: string;
        razorpayRefundId?: string;
        updatedAt: string;
    } | null;
}

interface WalletTx {
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    createdAt: string;
}

interface Withdrawal {
    id: string;
    amount: number;
    charge: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    remarks?: string;
    createdAt: string;
}

type Tab = 'sales' | 'wallet' | 'payouts';

export default function SalesTransactions() {
    const [activeTab, setActiveTab] = useState<Tab>('sales');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [walletHistory, setWalletHistory] = useState<WalletTx[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'sales') {
                const user = (() => {
                    try {
                        return JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                    } catch {
                        return {};
                    }
                })();
                const scope = (user?.role === 'SUPER_ADMIN') ? 'all' : 'me';
                const { data } = await axios.get(`/api/admin/transactions?scope=${scope}`);
                setPayments(data.payments || []);
            } else if (activeTab === 'wallet') {
                const { data } = await axios.get('/api/wallet/history');
                setWalletHistory(data.transactions || []);
            } else if (activeTab === 'payouts') {
                const { data } = await axios.get('/api/wallet/my-withdrawals');
                setWithdrawals(data || []);
            }
        } catch (error) {
            console.error(`Failed to fetch ${activeTab} data`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const TabButton = ({ id, label, icon }: { id: Tab, label: string, icon: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${
                activeTab === id 
                ? 'bg-brand-blue/20 text-brand-blue border-brand-blue/40 shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                : 'bg-white dark:bg-slate-900/50 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
        >
            <span className="material-symbols-outlined text-[14px]">{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 bg-slate-50 dark:bg-slate-950 min-h-screen px-4 pt-6">
            <header className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-950/80 shadow-[0_0_30px_rgba(14,165,233,0.15)] border border-slate-200 dark:border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 scanline opacity-30"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-blue">admin_panel_settings</span>
                            Transactions
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-mono text-[10px] uppercase tracking-widest">View history of all business activities</p>
                    </div>
                    <button 
                        onClick={fetchData}
                        className="bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue p-2.5 rounded border border-brand-blue/30 transition-all shadow-[0_0_10px_rgba(14,165,233,0.2)] active:scale-95"
                    >
                        <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>sync</span>
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                <TabButton id="sales" label="Sales" icon="receipt_long" />
                <TabButton id="wallet" label="Wallet" icon="account_balance_wallet" />
                <TabButton id="payouts" label="Payouts" icon="currency_rupee" />
            </div>

            {/* Content Area */}
            <div className="glass-panel border border-slate-200 dark:border-white/10 p-6 rounded-2xl relative overflow-hidden bg-white dark:bg-slate-950/60">
                <div className="absolute right-0 top-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10">
                    <h2 className="text-sm font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">
                            {activeTab === 'sales' ? 'receipt_long' : activeTab === 'wallet' ? 'account_balance_wallet' : 'currency_rupee'}
                        </span> 
                        {activeTab === 'sales' ? 'Sales' : activeTab === 'wallet' ? 'Wallet' : 'Payout Status'}
                    </h2>
                    
                    <div className="flex gap-2">
                         <ReportExport 
                            data={activeTab === 'sales' ? payments : activeTab === 'wallet' ? walletHistory : withdrawals} 
                            filename={`Report_${activeTab}`} 
                            title={`${activeTab.toUpperCase()} REPORT`} 
                            dateKey="createdAt" 
                        />
                    </div>
                </div>

                <div className="space-y-3 relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <span className="material-symbols-outlined text-[40px] text-brand-blue/50 animate-spin">refresh</span>
                            <p className="text-slate-500 dark:text-slate-400 font-mono uppercase tracking-[0.3em] text-[9px]">Loading data...</p>
                        </div>
                    ) : (
                        <>
                            {/* SALES TAB */}
                            {activeTab === 'sales' && (
                                payments.length === 0 ? (
                                    <EmptyState message="No sales data found." icon="search_off" />
                                ) : (
                                    payments.map((p) => (
                                        <div key={p.id} className="glass-panel p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-blue/50 transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded bg-brand-blue/5 flex items-center justify-center text-brand-blue border border-brand-blue/20">
                                                    <span className="material-symbols-outlined text-[20px]">south_east</span>
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-black text-xl tracking-tight font-mono">₹{p.amount.toLocaleString()}</p>
                                                    <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1">
                                                        <span className="material-symbols-outlined text-[10px] text-brand-blue mr-0.5">schedule</span>
                                                        {new Date(p.createdAt).toLocaleString()}
                                                        {(p as any).user && (
                                                            <>
                                                                <span className="mx-1 text-slate-300 dark:text-slate-700">|</span>
                                                                <span className="material-symbols-outlined text-[10px] text-brand-blue mr-0.5">person</span>
                                                                <span className="text-brand-blue/80">{(p as any).user.email}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-0 border-slate-800">
                                                <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                    p.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                                                }`}>
                                                    {p.status === 'CAPTURED' ? 'Success' : p.status}
                                                </span>
                                                <p className="text-[8px] font-mono text-slate-500 uppercase">ID: {p.paymentId.slice(0, 15)}...</p>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}

                            {/* WALLET TAB */}
                            {activeTab === 'wallet' && (
                                walletHistory.length === 0 ? (
                                    <EmptyState message="No wallet activity found." icon="money_off" />
                                ) : (
                                    walletHistory.map((tx) => (
                                        <div key={tx.id} className="glass-panel p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/10 rounded-xl flex items-center justify-between hover:border-brand-blue/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded flex items-center justify-center border ${
                                                    tx.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        {tx.type === 'CREDIT' ? 'south_east' : 'north_west'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-black text-sm tracking-widest uppercase">{tx.description || 'Adjustment'}</p>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                        {new Date(tx.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className={`text-lg font-black tracking-tighter font-mono ${
                                                tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'
                                            }`}>
                                                {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )
                            )}

                            {/* PAYOUTS TAB */}
                            {activeTab === 'payouts' && (
                                withdrawals.length === 0 ? (
                                    <EmptyState message="No payouts found." icon="receipt_long" />
                                ) : (
                                    withdrawals.map((w) => (
                                        <div key={w.id} className="glass-panel p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/10 rounded-xl hover:border-brand-blue/30 transition-all relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-10 h-10 rounded flex items-center justify-center border ${
                                                    w.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    w.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    <span className={`material-symbols-outlined text-[20px] ${w.status === 'PENDING' ? 'animate-spin' : ''}`}>
                                                        {w.status === 'APPROVED' ? 'verified' : w.status === 'REJECTED' ? 'cancel' : 'refresh'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-slate-900 dark:text-white font-black text-xl tracking-tight font-mono">₹{w.amount.toLocaleString()}</p>
                                                        <div className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                                                            <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest">Fee: ₹{w.charge}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                        {new Date(w.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-row md:flex-col justify-between md:items-end items-center gap-2 pt-3 md:pt-0 border-t md:border-0 border-slate-800 relative z-10">
                                                <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                    w.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    w.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {w.status}
                                                </span>
                                                {w.remarks && (
                                                    <p className="text-[8px] text-slate-500 max-w-[200px] text-left md:text-right font-mono italic">"{w.remarks}"</p>
                                                )}
                                            </div>
                                            {w.status === 'PENDING' && (
                                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-500/20">
                                                    <div className="h-full bg-amber-500 animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message, icon }: { message: string, icon: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900/40">
            <div className="w-12 h-12 rounded bg-brand-blue/5 border border-brand-blue/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-brand-blue text-[24px]">{icon}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest text-[9px]">{message}</p>
        </div>
    );
}
