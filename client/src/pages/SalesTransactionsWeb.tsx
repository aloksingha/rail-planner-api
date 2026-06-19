import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    CreditCard, 
    Wallet, 
    ArrowUpRight, 
    ArrowDownLeft, 
    RefreshCw, 
    Clock, 
    CheckCircle2,
    XCircle,
    Timer,
    BadgeIndianRupee,
    User
} from 'lucide-react';



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

    const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                activeTab === id 
                ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/20 scale-105' 
                : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
            }`}
        >
            <Icon size={14} />
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <header className="p-8 rounded-3xl bg-gradient-to-br from-brand-blue via-brand-teal to-emerald-500 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">My Ledger</h1>
                        <p className="text-white/80 mt-1 font-medium text-sm">Comprehensive track of your sales, wallet, and payouts.</p>
                    </div>
                    <button 
                        onClick={fetchData}
                        className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl border border-white/10 transition-all active:rotate-180 group"
                    >
                        <RefreshCw size={20} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-3 mb-8">
                <TabButton id="sales" label="Sales Ledger" icon={CreditCard} />
                <TabButton id="wallet" label="Wallet Activity" icon={Wallet} />
                <TabButton id="payouts" label="My Payouts" icon={BadgeIndianRupee} />
            </div>

            {/* Content Area */}
            <div className="card-glow border border-white/5 p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3 italic">
                        {activeTab === 'sales' && <><CreditCard className="text-brand-blue" /> Direct Sales</>}
                        {activeTab === 'wallet' && <><Wallet className="text-brand-teal" /> Wallet Trail</>}
                        {activeTab === 'payouts' && <><BadgeIndianRupee className="text-emerald-400" /> Payout Status</>}
                    </h2>
                    
                    <div className="flex gap-2">
                         <ReportExport 
                            data={activeTab === 'sales' ? payments : activeTab === 'wallet' ? walletHistory : withdrawals} 
                            filename={`TP_${activeTab}_Report`} 
                            title={`${activeTab.toUpperCase()} Records`} 
                            dateKey="createdAt" 
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                            <RefreshCw size={40} className="text-brand-blue animate-spin" />
                            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Encrypting Ledger Data...</p>
                        </div>
                    ) : (
                        <>
                            {/* SALES TAB */}
                            {activeTab === 'sales' && (
                                payments.length === 0 ? (
                                    <EmptyState message="No direct sales found in your ledger." />
                                ) : (
                                    payments.map((p) => (
                                        <div key={p.id} className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex justify-between items-center hover:bg-white/[0.06] transition-all group/item">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                                                    <ArrowUpRight size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-black text-2xl tracking-tighter">₹{p.amount.toLocaleString()}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2 text-balance">
                                                        <Clock size={12} /> {new Date(p.createdAt).toLocaleString()}
                                                        {(p as any).user && (
                                                            <>
                                                                <span className="mx-2 opacity-30">|</span>
                                                                <User size={12} className="text-brand-blue" />
                                                                <span className="text-brand-blue">{(p as any).user.email}</span>
                                                            </>
                                                        )}
                                                    </p>

                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                                                    p.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                }`}>
                                                    {p.status}
                                                </span>
                                                <p className="text-[9px] font-mono text-slate-600 uppercase">TXN: {p.paymentId}</p>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}

                            {/* WALLET TAB */}
                            {activeTab === 'wallet' && (
                                walletHistory.length === 0 ? (
                                    <EmptyState message="Your wallet activity log is empty." />
                                ) : (
                                    walletHistory.map((tx) => (
                                        <div key={tx.id} className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex justify-between items-center hover:bg-white/[0.06] transition-all group/item">
                                            <div className="flex items-center gap-5">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    tx.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                }`}>
                                                    {tx.type === 'CREDIT' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                                                </div>
                                                <div>
                                                    <p className="text-white font-black text-xl tracking-tight uppercase">{tx.description || 'Adjustment'}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                        {new Date(tx.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className={`text-2xl font-black tracking-tighter ${
                                                tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
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
                                    <EmptyState message="No payout history found." />
                                ) : (
                                    withdrawals.map((w) => (
                                        <div key={w.id} className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all group/item overflow-hidden relative">
                                            <div className="flex justify-between items-center relative z-10">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                        w.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 
                                                        w.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' : 
                                                        'bg-brand-blue/10 text-brand-blue'
                                                    }`}>
                                                        {w.status === 'APPROVED' ? <CheckCircle2 size={24} /> : 
                                                         w.status === 'REJECTED' ? <XCircle size={24} /> : 
                                                         <Timer size={24} className="animate-spin-slow" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-white font-black text-2xl tracking-tighter">₹{w.amount.toLocaleString()}</p>
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                                                <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">Charge: ₹{w.charge}</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                            {new Date(w.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                                                        w.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                        w.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                                        'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                                                    }`}>
                                                        {w.status}
                                                    </span>
                                                    {w.remarks && (
                                                        <p className="text-[9px] text-slate-500 max-w-[200px] text-right italic">"{w.remarks}"</p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Progress Bar for Pending */}
                                            {w.status === 'PENDING' && (
                                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-blue/20">
                                                    <div className="h-full bg-brand-blue animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
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

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-white/5 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                <Clock className="text-slate-700" size={32} />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{message}</p>
        </div>
    );
}
