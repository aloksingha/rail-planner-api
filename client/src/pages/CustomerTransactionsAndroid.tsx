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

export default function CustomerTransactions() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await axios.get('/api/customer/dashboard');
                setPayments(response.data.payments || []);
            } catch (error) {
                console.error('Failed to fetch transactions', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <span className="material-symbols-outlined text-brand-blue/50 text-5xl animate-spin">sync</span>
                <p className="text-brand-blue font-['Space_Grotesk'] tracking-widest text-xs uppercase animate-pulse">Loading transactions...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* Header Section */}
            <div className="glass-panel relative overflow-hidden rounded-2xl bg-white dark:bg-slate-950/80 p-6 shadow-[0_0_30px_rgba(14,165,233,0.15)] border border-slate-200 dark:border-sky-500/30">
                <div className="absolute inset-0 scanline opacity-30"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-sky-500/20 rounded-xl flex items-center justify-center border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <span className="material-symbols-outlined text-sky-400 text-3xl">account_balance_wallet</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white uppercase tracking-widest drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]">Wallet Transactions</h1>
                            <p className="text-slate-500 dark:text-sky-400/60 mt-1 font-mono text-[10px] uppercase tracking-widest">Your recent payments and refunds</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <ReportExport 
                            data={payments} 
                            filename="Transaction_History" 
                            title="Transaction History" 
                            dateKey="createdAt" 
                        />
                    </div>
                </div>
            </div>

            {/* Main Ledger Card */}
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between px-2 mb-2">
                    <h2 className="text-sm font-['Space_Grotesk'] font-bold text-brand-blue uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span> Recent Activity
                    </h2>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                        <span className="material-symbols-outlined text-[12px]">verified_user</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest">Secure Payments</span>
                    </div>
                </div>

                {payments.length === 0 ? (
                    <div className="glass-panel border border-slate-200 dark:border-sky-500/20 rounded-2xl p-12 text-center bg-white dark:bg-slate-950/40">
                        <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-500/30">
                            <span className="material-symbols-outlined text-sky-400/50 text-3xl">money_off</span>
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase mb-1">No Transactions Yet</h3>
                        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Your transaction history will appear here.</p>
                    </div>
                ) : (
                    payments.map((payment) => (
                        <div key={payment.id} className="glass-panel group relative bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-sky-500/20 rounded-2xl p-5 transition-all hover:border-sky-500/50 hover:shadow-[0_0_20px_rgba(14,165,233,0.2)] overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-colors duration-500 pointer-events-none" />
                            
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                                
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded border flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] shrink-0 ${
                                        payment.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}>
                                        <span className="material-symbols-outlined text-[24px]">
                                            {payment.status === 'CAPTURED' ? 'south_east' : 'error'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="text-slate-900 dark:text-white font-['Space_Grotesk'] font-bold text-xl tracking-tight">₹{formatCurrency(payment.amount)}</p>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                                                payment.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                            }`}>
                                                {payment.status === 'CAPTURED' ? 'SUCCESSFUL' : 'FAILED'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono uppercase tracking-widest text-slate-500">
                                            <span className="text-sky-400/80"><span className="material-symbols-outlined text-[10px] align-text-bottom mr-0.5">schedule</span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-700" />
                                            <span>TXN: <span className="text-slate-300">{payment.paymentId.slice(0,12)}...</span></span>
                                            {payment.bookingId && (
                                                <>
                                                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                                                    <span>BID: <span className="text-sky-500 border border-sky-500/20 bg-sky-500/10 px-1 rounded">{payment.bookingId.slice(0,8)}</span></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center md:justify-end gap-3 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                                    {payment.refundInfo ? (
                                        <div className="text-left md:text-right w-full md:w-auto">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-[0.2em] border ${
                                                payment.refundInfo.status === 'SUCCESS' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.2)]' : 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                            }`}>
                                                <span className="material-symbols-outlined text-[12px]">{payment.refundInfo.status === 'SUCCESS' ? 'sync_alt' : 'hourglass_empty'}</span>
                                                {payment.refundInfo.status === 'SUCCESS' ? 'REFUNDED' : 'REFUND IN PROGRESS'}
                                            </span>
                                            {payment.refundInfo.razorpayRefundId && (
                                                <p className="text-[8px] text-slate-500 mt-1.5 font-mono tracking-widest uppercase">GATEWAY: <span className="text-slate-400">{payment.refundInfo.razorpayRefundId.slice(0,10)}...</span></p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-[14px] text-slate-500">sync_disabled</span>
                                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">No Refund</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="text-center opacity-30 mt-12">
                <span className="material-symbols-outlined text-[20px] mb-2 text-slate-500">memory</span>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Tickets Pro Secure Gateway</p>
            </div>
        </div>
    );
}
