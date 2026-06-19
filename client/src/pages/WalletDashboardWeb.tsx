import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Wallet, 
    Plus, 
    ArrowUpRight, 
    ArrowDownLeft, 
    History, 
    Clock, 
    CheckCircle2, 
    XCircle,
    Info,
    CreditCard,
    ShieldCheck
} from 'lucide-react';

interface WalletTransaction {
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT' | 'REFUND';
    description: string;
    createdAt: string;
}

interface WithdrawalRequest {
    id: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
    method: string;
    details: string;
    adminComment?: string;
    createdAt: string;
}

export default function WalletDashboard() {
    const [balance, setBalance] = useState<number>(0);
    const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
    const [pendingCommission, setPendingCommission] = useState<number>(0);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [topupAmount, setTopupAmount] = useState<string>('');
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK'>('UPI');
    const [upiId, setUpiId] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState<string>('');
    const [ifsc, setIfsc] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isForbidden, setIsForbidden] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [historyRes, withdrawalsRes] = await Promise.all([
                axios.get('/api/wallet/history'),
                axios.get('/api/wallet/my-withdrawals')
            ]);
            setBalance(historyRes.data.balance);
            setWithdrawableBalance(historyRes.data.withdrawableBalance ?? historyRes.data.balance);
            setPendingCommission(historyRes.data.pendingCommission ?? 0);
            setTransactions(historyRes.data.transactions);
            setWithdrawals(withdrawalsRes.data);
        } catch (error: any) {
            console.error('Failed to fetch wallet data', error);
            if (error.response?.status === 403) {
                setIsForbidden(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleTopup = async () => {
        const amount = parseFloat(topupAmount);
        if (isNaN(amount) || amount < 100) {
            return showMsg('Minimum top-up amount is ₹100', 'error');
        }

        setProcessing(true);
        try {
            const res = await loadRazorpay();
            if (!res) throw new Error('Razorpay SDK failed to load. Please check your internet connection and disable any adblocker.');

            const { data: order } = await axios.post('/api/payments/wallet/create-order', { amount });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SYjIQpMuEFzq0j', // Production Key
                amount: order.amount,
                currency: order.currency,
                name: 'Tickets Pro Wallet',
                description: 'Wallet Top-up',
                order_id: order.id,
                webview_intent: true,
                handler: async (response: any) => {
                    try {
                        const verifyRes = await axios.post('/api/payments/wallet/verify-topup', {
                            ...response,
                            amount
                        });
                        if (verifyRes.data.success) {
                            showMsg(`₹${amount} added to wallet successfully!`, 'success');
                            setShowTopupModal(false);
                            setTopupAmount('');
                            fetchData();
                        }
                    } catch (err: any) {
                        showMsg(err.response?.data?.error || 'Payment verification failed', 'error');
                    }
                },
                theme: { color: '#2dd4bf' }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                showMsg(`Payment failed: ${response.error.description}`, 'error');
            });
            rzp.open();
        } catch (error: any) {
            console.error('[Top-up Error Detail]:', error);
            const errorMsg = error.response?.data?.error || error.message || error.toString() || 'Top-up initiation failed';
            showMsg(errorMsg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const closeWithdrawModal = () => {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setUpiId('');
        setAccountNumber('');
        setIfsc('');
        setMessage(null);
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        let fee = 10;
        if (amount > 1000 && amount <= 25000) fee = 15;
        if (amount > 25000) fee = 20;

        const totalNeeded = amount + fee;

        if (isNaN(amount) || amount < 500) {
            return showMsg('Minimum withdrawal amount is ₹500', 'error');
        }
        if (totalNeeded > withdrawableBalance) {
            return showMsg(`Insufficient withdrawable balance. Including the ₹${fee} transaction fee, you need ₹${totalNeeded.toFixed(2)}. Your withdrawable balance is ₹${withdrawableBalance.toFixed(2)} (excluding ₹${pendingCommission.toFixed(2)} pending commissions).`, 'error');
        }

        const detailsStr = payoutMethod === 'UPI' ? upiId.trim() : `Acc: ${accountNumber.trim()}, IFSC: ${ifsc.trim()}`;

        if (payoutMethod === 'UPI' && !upiId.trim()) {
            return showMsg('Please provide a valid UPI ID', 'error');
        }
        if (payoutMethod === 'BANK' && (!accountNumber.trim() || !ifsc.trim())) {
            return showMsg('Please provide both Account Number and IFSC Code', 'error');
        }

        setProcessing(true);
        try {
            await axios.post('/api/wallet/withdraw-request', {
                amount,
                method: payoutMethod,
                details: detailsStr
            });
            showMsg('Withdrawal request submitted successfully!', 'success');
            closeWithdrawModal();
            fetchData();
        } catch (error: any) {
            showMsg(error.response?.data?.error || 'Withdrawal request failed', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-teal"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                        <Wallet className="text-brand-teal" size={36} />
                        My Wallet
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Manage your funds and payouts</p>
                </div>
            </div>

            {message && !showTopupModal && !showWithdrawModal && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-lg animate-in slide-in-from-top duration-300 ${
                    message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    <span className="font-bold">{message.text}</span>
                </div>
            )}

            {isForbidden && (
                <div className="p-8 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-in zoom-in duration-500">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-2">
                            <ShieldCheck size={32} className="text-rose-500" />
                        </div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tight">Access Locked</h2>
                        <p className="max-w-md font-bold leading-relaxed opacity-80">
                            Your security token is out of sync with the latest platform updates. 
                            To unlock your wallet, please <span className="text-white underline decoration-rose-500 underline-offset-4">Sign Out</span> and log back in.
                        </p>
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="mt-4 px-8 py-3 bg-rose-500 text-white font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                        >
                            Refresh Session
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Balance Card */}
                <div className="lg:col-span-1">
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/5 p-8 shadow-2xl h-full flex flex-col justify-between group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                            <Wallet size={120} />
                        </div>
                        
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Balance</span>
                            <div className="mt-4 flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white tracking-tighter italic">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Withdrawable:</span>
                                    <span className="text-brand-teal font-black">₹{withdrawableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Pending Comm.:</span>
                                    <span className="text-amber-500 font-black">₹{pendingCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 space-y-4">
                            <button 
                                onClick={() => setShowTopupModal(true)}
                                className="w-full py-4 bg-brand-teal text-slate-900 font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-teal/20"
                            >
                                <Plus size={20} /> Add Funds
                            </button>
                            <button 
                                onClick={() => setShowWithdrawModal(true)}
                                className="w-full py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all border border-white/5"
                            >
                                <ArrowDownLeft size={20} /> Withdraw
                            </button>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Withdrawal Requests */}
                    {withdrawals.length > 0 && (
                        <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-6 shadow-xl">
                            <h2 className="text-lg font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Clock className="text-amber-500" size={18} /> 
                                Pending Payouts
                            </h2>
                            <div className="space-y-3">
                                {withdrawals.filter(w => ['PENDING', 'PROCESSING'].includes(w.status)).map(w => (
                                    <div key={w.id} className="p-4 bg-slate-800/50 rounded-2xl border border-white/5 flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <History size={20} />
                                            </div>
                                            <div>
                                                <p className="text-white font-black tracking-tight">₹{w.amount}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{w.method}: {w.details}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                            w.status === 'PROCESSING' 
                                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20' 
                                            : 'bg-amber-500/20 text-amber-500 border-amber-500/20'
                                        }`}>
                                            {w.status === 'PENDING' ? 'Pending' : 'Processing'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Transaction History */}
                    <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-6 shadow-xl">
                        <h2 className="text-lg font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                            <History className="text-brand-teal" size={18} /> 
                            Recent Activity
                        </h2>
                        <div className="space-y-4">
                            {transactions.length === 0 ? (
                                <div className="text-center py-12 opacity-50">
                                    <Info className="mx-auto mb-2" size={24} />
                                    <p className="text-sm font-bold uppercase tracking-widest">No activity found</p>
                                </div>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="p-4 bg-slate-800/30 rounded-2xl border border-transparent hover:border-white/5 hover:bg-slate-800/50 transition-all flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                tx.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                            }`}>
                                                {tx.type === 'CREDIT' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold leading-tight">{tx.description}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                                    {new Date(tx.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-black text-lg ${
                                            tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-slate-400'
                                        }`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showTopupModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex justify-center items-start animate-in fade-in duration-300">
                    <div className="my-auto bg-slate-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative">
                        <h2 className="text-2xl font-black text-white uppercase italic mb-2">Add Balance</h2>
                        <p className="text-sm text-slate-400 mb-8">Choose an amount to top up your wallet</p>
                        
                        {message && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 mb-6 border shadow-lg animate-in slide-in-from-top duration-300 ${
                                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                                {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                <span className="font-bold text-sm">{message.text}</span>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {[500, 1000, 2000, 5000].map(amt => (
                                <button 
                                    key={amt}
                                    onClick={() => setTopupAmount(amt.toString())}
                                    className={`py-3 rounded-xl border font-black transition-all ${
                                        topupAmount === amt.toString() 
                                        ? 'bg-brand-teal border-brand-teal text-slate-900 shadow-lg shadow-brand-teal/20' 
                                        : 'bg-slate-800 border-white/5 text-slate-400 hover:border-slate-500'
                                    }`}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>

                        <div className="relative mb-8">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                            <input 
                                type="number"
                                placeholder="Enter custom amount"
                                value={topupAmount}
                                onChange={e => setTopupAmount(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-8 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-teal/50 transition-all"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setShowTopupModal(false); setMessage(null); }}
                                className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleTopup}
                                disabled={processing}
                                className="flex-[2] py-4 bg-brand-teal text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-teal/20 disabled:opacity-50"
                            >
                                {processing ? 'Processing...' : 'Pay Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex justify-center items-start animate-in fade-in duration-300">
                    <div className="my-auto bg-slate-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative">
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="text-rose-400" size={24} />
                            <h2 className="text-2xl font-black text-white uppercase italic">Withdraw</h2>
                        </div>
                        <p className="text-sm text-slate-400 mb-8">Funds will be transferred to your account</p>

                        {message && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 mb-6 border shadow-lg animate-in slide-in-from-top duration-300 ${
                                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                                {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                <span className="font-bold text-sm">{message.text}</span>
                            </div>
                        )}
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Amount</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                    <input 
                                        type="number"
                                        placeholder="Min ₹500"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-8 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-mono"
                                    />
                                </div>
                                {withdrawAmount && parseFloat(withdrawAmount) >= 500 && (
                                    <div className="mt-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5 flex justify-between items-center animate-in fade-in slide-in-from-top-1 duration-200">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Fee</span>
                                        <span className="text-sm font-black text-rose-400 truncate ml-2">
                                            + ₹{(() => {
                                                const amt = parseFloat(withdrawAmount);
                                                if (amt <= 1000) return 10;
                                                if (amt <= 25000) return 15;
                                                return 20;
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Payout Method</label>
                                <select 
                                    value={payoutMethod}
                                    onChange={e => setPayoutMethod(e.target.value as 'UPI' | 'BANK')}
                                    className="mt-1 w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all cursor-pointer"
                                >
                                    <option value="UPI">UPI (VPA)</option>
                                    <option value="BANK">Bank Transfer (Account/IFSC)</option>
                                </select>
                            </div>
                            {payoutMethod === 'UPI' ? (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">UPI ID</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. username@upi"
                                        value={upiId}
                                        onChange={e => setUpiId(e.target.value)}
                                        className="mt-1 w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-mono"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Account Number</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. 1234567890"
                                            value={accountNumber}
                                            onChange={e => setAccountNumber(e.target.value)}
                                            className="mt-1 w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">IFSC Code</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. HDFC0000123"
                                            value={ifsc}
                                            onChange={e => setIfsc(e.target.value.toUpperCase())}
                                            className="mt-1 w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={closeWithdrawModal}
                                className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleWithdraw}
                                disabled={processing}
                                className="flex-[2] py-4 bg-rose-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                            >
                                {processing ? 'Requesting...' : 'Request Payout'}
                            </button>
                        </div>
                        <p className="mt-6 text-[9px] text-slate-500 font-bold uppercase text-center tracking-widest">
                            Requests are usually processed within 24-48 hours
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
