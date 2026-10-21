import React, { memo, useState, useEffect } from 'react';
import axios from 'axios';
import { IndianRupee, AlertTriangle, Globe, Wallet, CheckCircle2, QrCode } from 'lucide-react';

export type PaymentMethod = 'RAZORPAY' | 'OFFLINE' | 'SKYDO' | 'YOUPI';

interface PaymentGatewaySelectorAndroidProps {
    userRole: string;
    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;
    walletBalance: number;
    useWalletBalance: boolean;
    setUseWalletBalance: (use: boolean) => void;
    amountToPayViaGateway: number;
}

const PaymentGatewaySelectorAndroid: React.FC<PaymentGatewaySelectorAndroidProps> = memo(({
    userRole,
    paymentMethod,
    setPaymentMethod,
    walletBalance,
    useWalletBalance,
    setUseWalletBalance,
    amountToPayViaGateway
}) => {
    const [config, setConfig] = useState<{
        paymentGatewayMode?: 'BOTH' | 'YOUPI' | 'RAZORPAY';
        youpiEnabled?: boolean;
    }>({ paymentGatewayMode: 'BOTH', youpiEnabled: true });

    useEffect(() => {
        axios.get('/api/settings/payment-config')
            .then(res => {
                if (res.data) {
                    setConfig(res.data);
                    if (res.data.paymentGatewayMode === 'YOUPI') {
                        setPaymentMethod('YOUPI');
                    }
                }
            })
            .catch(() => {});
    }, [setPaymentMethod]);

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const showYouPi = isSuperAdmin && config.paymentGatewayMode !== 'RAZORPAY' && config.youpiEnabled !== false;
    const showRazorpay = config.paymentGatewayMode !== 'YOUPI' || !isSuperAdmin;

    return (
        <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-white/5">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">Gateway Selection</p>
            
            <div className="grid grid-cols-1 gap-3">
                {/* YouPI Direct UPI Option */}
                {showYouPi && (
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('YOUPI')}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            paymentMethod === 'YOUPI'
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${paymentMethod === 'YOUPI' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                <QrCode size={16} />
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight">Direct UPI</p>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">0% Fee</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">GPay • PhonePe • Paytm • Any App</p>
                            </div>
                        </div>
                        {paymentMethod === 'YOUPI' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </button>
                )}

                {/* Razorpay Option */}
                {showRazorpay && (
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('RAZORPAY')}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            paymentMethod === 'RAZORPAY'
                                ? 'border-brand-blue bg-brand-blue/10'
                                : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${paymentMethod === 'RAZORPAY' ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                <IndianRupee size={16} />
                            </div>
                            <div className="text-left">
                                <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight">Razorpay</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">Cards • NetBanking • Wallets</p>
                            </div>
                        </div>
                        {paymentMethod === 'RAZORPAY' && <CheckCircle2 size={16} className="text-brand-blue" />}
                    </button>
                )}

                {/* Offline Option (Admin Only) */}
                {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('OFFLINE')}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            paymentMethod === 'OFFLINE'
                                ? 'border-rose-500 bg-rose-500/10'
                                : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${paymentMethod === 'OFFLINE' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                <AlertTriangle size={16} />
                            </div>
                            <div className="text-left">
                                <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight">Offline Payment</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">Admin Test Only</p>
                            </div>
                        </div>
                        {paymentMethod === 'OFFLINE' && <CheckCircle2 size={16} className="text-rose-500" />}
                    </button>
                )}
                
                {/* Skydo International Option */}
                <button
                    type="button"
                    onClick={() => setPaymentMethod('SKYDO')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                        paymentMethod === 'SKYDO'
                            ? 'border-sky-500 bg-sky-500/10'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${paymentMethod === 'SKYDO' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <Globe size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-slate-900 dark:text-white font-black text-base tracking-tight">International Payment</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">USD Transfers (ACH/Fedwire)</p>
                        </div>
                    </div>
                    {paymentMethod === 'SKYDO' && <CheckCircle2 size={16} className="text-sky-500" />}
                </button>

                {/* Combined Wallet Balance Toggle */}
                {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'CUSTOMER') && (
                    <button
                        type="button"
                        onClick={() => {
                            if (walletBalance > 0) setUseWalletBalance(!useWalletBalance);
                        }}
                        disabled={walletBalance <= 0}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all mt-1 ${
                            useWalletBalance
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                        } ${walletBalance <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${useWalletBalance ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                <Wallet size={16} />
                            </div>
                            <div className="text-left">
                                <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight">Use Wallet Balance</p>
                                <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                                    Available: ₹{walletBalance.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            useWalletBalance ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                            {useWalletBalance && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                    </button>
                )}
            </div>
            
            {/* Skydo Details Box */}
            {paymentMethod === 'SKYDO' && (
                <div className="mt-4 p-5 bg-sky-500/5 border border-sky-500/20 rounded-2xl">
                    <p className="text-sky-500 text-sm font-bold mb-2 flex items-center gap-2">
                        <Globe size={16} /> International Transfer Details
                    </p>
                    <p className="text-slate-400 text-xs mb-4">Please transfer <span className="font-bold text-white">₹{amountToPayViaGateway.toLocaleString()}</span> to the following bank account, then click Confirm Transfer below.</p>
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Beneficiary Name</p>
                            <p className="text-sm text-slate-200 font-mono">PRADIP ENTERPRISES</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Account Number</p>
                            <p className="text-sm text-slate-200 font-mono">8334472992</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Bank Name & Address</p>
                            <p className="text-sm text-slate-200 font-mono text-xs">Community Federal Savings Bank, 5 Penn Plaza, 14th Floor, NY 10001, US</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Routing Numbers (USD)</p>
                            <p className="text-sm text-slate-200 font-mono">ACH: 026073150</p>
                            <p className="text-sm text-slate-200 font-mono">Fedwire: 026073008</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PaymentGatewaySelectorAndroid;
