import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

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

export default function WalletDashboardAndroid() {
    const [balance, setBalance] = useState<number>(0);
    const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
    const [pendingCommission, setPendingCommission] = useState<number>(0);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [, setLoading] = useState(true);
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
        if (isNaN(amount) || amount < 100) return showMsg('Minimum top-up is ₹100', 'error');

        setProcessing(true);
        try {
            const res = await loadRazorpay();
            if (!res) throw new Error('Payment gateway initialization failed.');

            const { data: order } = await axios.post('/api/payments/wallet/create-order', { amount });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SYjIQpMuEFzq0j',
                amount: order.amount,
                currency: order.currency,
                name: 'Tickets Pro Wallet',
                description: 'Wallet Balance Top-up',
                order_id: order.id,
                handler: async (response: any) => {
                    try {
                        const verifyRes = await axios.post('/api/payments/wallet/verify-topup', {
                            ...response, amount
                        });
                        if (verifyRes.data.success) {
                            showMsg(`₹${amount} added to wallet successfully!`, 'success');
                            setShowTopupModal(false);
                            setTopupAmount('');
                            fetchData();
                        }
                    } catch (err: any) {
                        showMsg('Payment verification failed', 'error');
                    }
                },
                theme: { color: '#0ea5e9' }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', () => showMsg('Payment failed.', 'error'));
            rzp.open();
        } catch (error: any) {
            showMsg(error.response?.data?.error || error.message || 'Top-up failed', 'error');
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

        if (isNaN(amount) || amount < 500) return showMsg('Minimum withdrawal is ₹500', 'error');
        if (totalNeeded > withdrawableBalance) return showMsg(`Insufficient withdrawable balance. (Need ₹${totalNeeded.toFixed(2)} including fee, withdrawable: ₹${withdrawableBalance.toFixed(2)}).`, 'error');

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

    return (
        <div className="font-body-md text-slate-900 dark:text-white min-h-[100dvh] pb-32 bg-slate-50 dark:bg-slate-950">
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
                `}
            </style>

            <main className="pt-8 px-margin-page max-w-5xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="font-display-lg text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white mb-2 uppercase drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">WALLET DASHBOARD</h1>
                    <p className="font-body-md text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse shadow-[0_0_8px_#89ceff]"></span>
                        LIVE BALANCE UPDATES
                    </p>
                </div>

                {message && !showTopupModal && !showWithdrawModal && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl flex items-center gap-3 border shadow-lg ${
                        message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                        <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                        <span className="font-bold text-xs uppercase tracking-wider">{message.text}</span>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Wallet Balance */}
                    <div className="glass-panel col-span-1 md:col-span-2 p-8 rounded-xl relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                            <span className="material-symbols-outlined text-[150px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                        </div>
                        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>

                        <div className="relative z-10">
                            <span className="font-label-sm text-[10px] font-black tracking-widest text-brand-blue uppercase">Total Balance</span>
                            <h2 className="font-display-lg text-5xl font-black italic tracking-tighter text-slate-900 dark:text-white mt-4 mb-8">
                                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </h2>
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-2 mb-6">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Withdrawable:</span>
                                    <span className="text-brand-blue dark:text-sky-400 font-black">₹{withdrawableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Pending Comm.:</span>
                                    <span className="text-amber-500 font-black">₹{pendingCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => setShowTopupModal(true)}
                                    className="bg-gradient-to-r from-brand-blue to-sky-600 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:scale-[1.02] active:scale-95 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                                    ADD MONEY
                                </button>
                                <button 
                                    onClick={() => setShowWithdrawModal(true)}
                                    className="border border-brand-blue/30 text-brand-blue dark:text-sky-400 font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-blue/10 transition-all active:scale-95 bg-white dark:bg-slate-950/40 backdrop-blur-md"
                                >
                                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                                    WITHDRAW
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pending Withdrawals */}
                    <div className="glass-panel p-6 rounded-xl flex flex-col justify-between border-l-4 border-l-brand-teal relative overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
                        <div className="relative z-10">
                            <span className="font-label-sm text-[10px] font-black tracking-widest text-brand-teal uppercase">Pending Withdrawals</span>
                            <h3 className="font-headline-md text-2xl font-black italic mt-2 text-slate-900 dark:text-white">
                                ₹{withdrawals.filter(w => ['PENDING', 'PROCESSING'].includes(w.status)).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-4 relative z-10">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse shadow-[0_0_8px_#0d9488]"></span>
                                {withdrawals.filter(w => ['PENDING', 'PROCESSING'].includes(w.status)).length} Request(s)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Provisioning Logs (Activity) */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-headline-md text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-brand-blue text-xl">analytics</span>
                            TRANSACTION HISTORY
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {transactions.length === 0 ? (
                            <div className="text-center py-12 opacity-50 border border-dashed border-slate-300 dark:border-sky-500/20 rounded-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-sky-500">No transactions found.</p>
                            </div>
                        ) : (
                            transactions.map(tx => (
                                <div key={tx.id} className={`glass-panel p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between border-l-2 gap-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 ${tx.type === 'CREDIT' ? 'border-primary' : 'border-rose-500/60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'CREDIT' ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'}`}>
                                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                {tx.type === 'CREDIT' ? 'download' : 'upload'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs uppercase tracking-wide text-slate-900 dark:text-white leading-tight">{tx.description}</div>
                                            <div className="font-label-sm text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                                                DATE: {new Date(tx.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <div className={`font-black text-lg tracking-tight italic ${tx.type === 'CREDIT' ? 'text-brand-blue' : 'text-slate-900 dark:text-white'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                        </div>
                                        <div className="font-label-sm text-[8px] uppercase tracking-widest text-brand-blue/60">Verified</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </main>

            {/* Topup Modal */}
            {showTopupModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 flex justify-center items-start">
                    <div className="my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(14,165,233,0.15)] relative">
                        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-wider mb-2 relative z-10">Add Money</h2>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-sky-400/60 mb-6 relative z-10">Enter amount to add</p>

                        {message && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl flex items-center gap-3 mb-6 border shadow-lg relative z-10 ${
                                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                                <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                                <span className="font-bold text-xs uppercase tracking-wider">{message.text}</span>
                            </motion.div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                            {[500, 1000, 2000, 5000].map(amt => (
                                <button 
                                    key={amt}
                                    onClick={() => setTopupAmount(amt.toString())}
                                    className={`py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all border ${
                                        topupAmount === amt.toString() 
                                        ? 'bg-brand-blue/20 border-brand-blue text-brand-blue shadow-[inset_0_0_15px_rgba(137,206,255,0.2)]' 
                                        : 'bg-slate-100 dark:bg-slate-950/50 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-brand-blue/50'
                                    }`}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>

                        <div className="relative mb-6 z-10">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                            <input 
                                type="number"
                                placeholder="Custom Amount"
                                value={topupAmount}
                                onChange={e => setTopupAmount(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:outline-none focus:border-primary transition-colors text-sm"
                            />
                        </div>

                        <div className="flex gap-3 z-10 relative">
                            <button 
                                onClick={() => { setShowTopupModal(false); setMessage(null); }}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleTopup}
                                disabled={processing}
                                className="flex-[2] py-3 bg-brand-blue text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(137,206,255,0.3)]"
                            >
                                {processing ? 'ADDING...' : 'CONFIRM'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 flex justify-center items-start">
                    <div className="my-auto bg-slate-900 border border-rose-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(244,63,94,0.15)] relative">
                        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-wider mb-2 relative z-10">Withdraw Funds</h2>
                        <p className="text-[10px] uppercase tracking-widest text-rose-400/60 mb-6 relative z-10">Withdraw funds to your account</p>

                        {message && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl flex items-center gap-3 mb-6 border shadow-lg relative z-10 ${
                                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                                <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                                <span className="font-bold text-xs uppercase tracking-wider">{message.text}</span>
                            </motion.div>
                        )}
                        
                        <div className="space-y-4 mb-6 relative z-10">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Withdrawal Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 font-black">₹</span>
                                    <input 
                                        type="number"
                                        placeholder="Min ₹500"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:outline-none focus:border-rose-500 transition-colors text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Payout Method</label>
                                <select 
                                    value={payoutMethod}
                                    onChange={e => setPayoutMethod(e.target.value as 'UPI' | 'BANK')}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-rose-500 transition-colors text-sm cursor-pointer"
                                >
                                    <option value="UPI">UPI (VPA)</option>
                                    <option value="BANK">Bank Transfer (Account/IFSC)</option>
                                </select>
                            </div>
                            {payoutMethod === 'UPI' ? (
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">UPI ID</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. username@upi"
                                        value={upiId}
                                        onChange={e => setUpiId(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-rose-500 transition-colors text-sm font-mono"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Account Number</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. 1234567890"
                                            value={accountNumber}
                                            onChange={e => setAccountNumber(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-rose-500 transition-colors text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">IFSC Code</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. HDFC0000123"
                                            value={ifsc}
                                            onChange={e => setIfsc(e.target.value.toUpperCase())}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-rose-500 transition-colors text-sm font-mono"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 z-10 relative">
                            <button 
                                onClick={closeWithdrawModal}
                                className="flex-1 py-3 bg-slate-950 border border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleWithdraw}
                                disabled={processing}
                                className="flex-[2] py-3 bg-rose-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                            >
                                {processing ? 'WITHDRAWING...' : 'CONFIRM WITHDRAWAL'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
