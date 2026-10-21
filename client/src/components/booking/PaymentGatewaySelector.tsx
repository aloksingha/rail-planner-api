import React, { memo, useState, useEffect } from 'react';
import axios from 'axios';
import { IndianRupee, AlertTriangle, Globe, Wallet, CheckCircle2, QrCode } from 'lucide-react';

export type PaymentMethod = 'RAZORPAY' | 'OFFLINE' | 'SKYDO' | 'YOUPI';

interface PaymentGatewaySelectorProps {
    userRole: string;
    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;
    walletBalance: number;
    useWalletBalance: boolean;
    setUseWalletBalance: (use: boolean) => void;
}

const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = memo(({
    userRole,
    paymentMethod,
    setPaymentMethod,
    walletBalance,
    useWalletBalance,
    setUseWalletBalance
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

    const showYouPi = config.paymentGatewayMode !== 'RAZORPAY' && config.youpiEnabled !== false;
    const showRazorpay = config.paymentGatewayMode !== 'YOUPI';

    return (
        <div className="bg-slate-50 dark:bg-black/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-500 mb-5 flex items-center gap-2 uppercase tracking-[0.25em]">Gateway Selection</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* YouPI Direct UPI Option (0% Platform Fee) */}
                {showYouPi && (
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('YOUPI')}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                            paymentMethod === 'YOUPI'
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${paymentMethod === 'YOUPI' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                <QrCode size={18} />
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-900 dark:text-white font-black text-base tracking-tight">Direct UPI</p>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">0% Fee</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">GPay • PhonePe • Paytm • BHIM</p>
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
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                            paymentMethod === 'RAZORPAY'
                                ? 'border-brand-blue bg-brand-blue/10'
                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${paymentMethod === 'RAZORPAY' ? 'bg-brand-blue text-white' : 'bg-slate-800 text-slate-500'}`}>
                                <IndianRupee size={18} />
                            </div>
                            <div className="text-left">
                                <p className="text-slate-900 dark:text-white font-black text-base tracking-tight">Razorpay</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">Cards • NetBanking • UPI</p>
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
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                            paymentMethod === 'OFFLINE'
                                ? 'border-rose-500 bg-rose-500/10'
                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${paymentMethod === 'OFFLINE' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                <AlertTriangle size={18} />
                            </div>
                            <div className="text-left">
                                <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">Offline (Test)</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">Admin Testing Only</p>
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
                        className={`col-span-1 sm:col-span-2 flex items-center justify-between p-4 rounded-2xl border-2 transition-all group mt-2 ${
                            useWalletBalance
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        } ${walletBalance <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${useWalletBalance ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                <Wallet size={18} />
                            </div>
                            <div className="text-left">
                                <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">Use Wallet Balance</p>
                                <p className="text-emerald-500 text-[9px] font-bold uppercase tracking-wider">
                                    Available: ₹{walletBalance.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            useWalletBalance ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                        }`}>
                            {useWalletBalance && <CheckCircle2 size={14} className="text-white" />}
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
                    <p className="text-slate-400 text-xs mb-4">Please transfer the exact booking amount to the following bank account, then proceed to Confirm.</p>
                    
                    <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Beneficiary Name</p>
                            <p className="text-sm text-slate-200 font-mono">PRADIP ENTERPRISES</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Account Number</p>
                            <p className="text-sm text-slate-200 font-mono">8334472992</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Bank Name & Address</p>
                            <p className="text-sm text-slate-200 font-mono text-xs">Community Federal Savings Bank, 5 Penn Plaza, 14th Floor, NY 10001, US</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Routing Numbers (USD)</p>
                            <p className="text-sm text-slate-200 font-mono">ACH: 026073150 &nbsp;|&nbsp; Fedwire: 026073008</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PaymentGatewaySelector;
