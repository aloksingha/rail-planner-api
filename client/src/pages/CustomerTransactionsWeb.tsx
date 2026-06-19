import { useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCard, History, ShieldCheck, ArrowUpRight, Loader2 } from 'lucide-react';
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
                <Loader2 className="h-12 w-12 text-brand-blue animate-spin" />
                <p className="text-slate-500 font-black uppercase tracking-widest">Syncing Ledger</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20 px-2 lg:px-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <History className="text-brand-blue" size={14} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-blue">Activity Node</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter italic leading-none">
                        Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-teal-400">Ledger</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <ReportExport 
                        data={payments} 
                        filename="Customer_Transactions" 
                        title="My Transactions Report" 
                        dateKey="createdAt" 
                    />
                </div>
            </div>

            {/* Main Ledger Card */}
            <div className="card-glow p-8 bg-slate-950/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-10 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue border border-brand-blue/20">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase italic leading-none mb-1">Transaction Stream</h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Verified Booking Records</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/5 rounded-full">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">PCI-DSS Encrypted</span>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    {payments.length === 0 ? (
                        <div className="text-center py-20 opacity-20">
                            <History size={48} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-widest text-sm">Empty Settlement History</p>
                        </div>
                    ) : (
                        payments.map((payment) => (
                            <div key={payment.id} className="group p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 hover:bg-white/5 hover:border-brand-blue/30 transition-all relative overflow-hidden shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${
                                        payment.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                    }`}>
                                        {payment.status === 'CAPTURED' ? <ArrowUpRight size={28} /> : '!'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="text-white font-black text-2xl tracking-tighter">₹{formatCurrency(payment.amount)}</p>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                                payment.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            }`}>
                                                {payment.status === 'CAPTURED' ? 'Settled' : 'Failed'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            <p className="text-slate-400">{new Date(payment.createdAt).toLocaleDateString()}</p>
                                            <span className="h-1 w-1 rounded-full bg-slate-700" />
                                            <p>TXN: <span className="text-white/60">{payment.paymentId}</span></p>
                                            {payment.bookingId && (
                                                <>
                                                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                                                    <p>BID: <span className="text-brand-blue italic">{payment.bookingId}</span></p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 relative z-10 shrink-0 self-end md:self-center">
                                    {payment.refundInfo ? (
                                        <div className="text-right">
                                            <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] ${
                                                payment.refundInfo.status === 'SUCCESS' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-[0_0_15px_rgba(14,165,233,0.2)]' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                            }`}>
                                                {payment.refundInfo.status === 'SUCCESS' ? 'Refunded' : 'Processing Refund'}
                                            </span>
                                            {payment.refundInfo.razorpayRefundId && (
                                                <p className="text-[9px] text-slate-600 mt-2 font-mono tracking-tighter italic">GATEWAY_{payment.refundInfo.razorpayRefundId}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic">No Refund Signal</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Information */}
            <div className="text-center opacity-30 mt-12 pb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Global Settlement Node · 2026 Tickets Pro</p>
            </div>
        </div>
    );
}
