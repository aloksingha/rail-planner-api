import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    QrCode, Copy, Check, ShieldCheck, Clock, ExternalLink, 
    ArrowRight, Loader2, CheckCircle2, AlertCircle, X, Sparkles, Smartphone
} from 'lucide-react';

interface YouPiPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (bookingId?: string) => void;
    orderData: {
        orderId: string;
        amount: number;
        upiUrl: string;
        vpa: string;
        merchantName: string;
        expiresAt?: string;
    } | null;
}

export default function YouPiPaymentModal({ isOpen, onClose, onSuccess, orderData }: YouPiPaymentModalProps) {
    const [copied, setCopied] = useState(false);
    const [manualUtr, setManualUtr] = useState('');
    const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
    const [utrError, setUtrError] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const pollIntervalRef = useRef<any>(null);

    // Reset state on modal open
    useEffect(() => {
        if (!isOpen || !orderData) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
        }

        setIsPaid(false);
        setManualUtr('');
        setUtrError('');
        setTimeLeft(600);

        // Auto-polling for verification every 2.5s
        pollIntervalRef.current = setInterval(async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`/api/payments/youpi/status/${orderData.orderId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (data.status === 'SUCCESS') {
                    clearInterval(pollIntervalRef.current);
                    setIsPaid(true);
                    setTimeout(() => {
                        onSuccess(data.bookingId);
                    }, 1800);
                }
            } catch (err) {
                // Ignore transient network errors during poll
            }
        }, 2500);

        // Countdown timer
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            clearInterval(timer);
        };
    }, [isOpen, orderData]);

    if (!isOpen || !orderData) return null;

    const copyVpa = () => {
        navigator.clipboard.writeText(orderData.vpa);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVerifyUtr = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualUtr.trim() || manualUtr.trim().length < 6) {
            setUtrError('Please enter a valid Bank Ref / UTR number (at least 6-12 digits).');
            return;
        }

        setIsVerifyingUtr(true);
        setUtrError('');
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post('/api/payments/youpi/verify-utr', {
                orderId: orderData.orderId,
                utr: manualUtr.trim()
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (data.success) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                setIsPaid(true);
                setTimeout(() => {
                    onSuccess(data.bookingId);
                }, 1800);
            } else {
                setUtrError(data.error || 'Failed to verify UTR. Please wait for auto-detection.');
            }
        } catch (err: any) {
            setUtrError(err.response?.data?.error || 'UTR verification failed. Please try again.');
        } finally {
            setIsVerifyingUtr(false);
        }
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Fast direct QR code URL with zero external dependencies
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(orderData.upiUrl)}`;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <QrCode size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-black text-sm tracking-wide">Direct UPI Payment</h3>
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">0% PLATFORM FEE</span>
                            </div>
                            <p className="text-slate-400 text-[10px]">Instant Bank Settlement • Secure NPCI Rail</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Success State Overlay */}
                    {isPaid ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
                                <CheckCircle2 size={44} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white">Payment Verified!</h3>
                                <p className="text-slate-400 text-xs mt-1">Confirmed via sovereign UPI observer. Finalizing booking...</p>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-4 py-2 rounded-xl">
                                <Loader2 size={16} className="animate-spin" /> Redirecting to ticket...
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Amount & Timer Ribbon */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount to Pay</p>
                                    <h4 className="text-2xl font-black text-emerald-400 tracking-tight">₹{orderData.amount.toLocaleString()}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 justify-end">
                                        <Clock size={12} className="text-amber-400" /> Session Expires In
                                    </p>
                                    <span className="text-sm font-mono font-black text-amber-300">{formatTime(timeLeft)}</span>
                                </div>
                            </div>

                            {/* Dynamic QR Code Card */}
                            <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 relative group">
                                <div className="p-3 bg-white rounded-2xl shadow-xl">
                                    <img 
                                        src={qrCodeUrl} 
                                        alt="UPI QR Code" 
                                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                                    />
                                </div>
                                <p className="text-slate-400 text-[11px] font-bold mt-3 flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-emerald-400" /> Scan using any UPI App (GPay, PhonePe, Paytm, BHIM)
                                </p>

                                {/* Live Observer Listening Pulse */}
                                <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    <span>Observer listening for automatic confirmation...</span>
                                </div>
                            </div>

                            {/* Quick Mobile UPI Intent Launchers */}
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Smartphone size={13} /> Or Tap to Open UPI App on this device:
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <a 
                                        href={orderData.upiUrl}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
                                    >
                                        <ExternalLink size={13} /> Open UPI
                                    </a>
                                    <a 
                                        href={orderData.upiUrl.replace('upi://', 'phonepe://')}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 rounded-xl text-xs font-bold transition-all border border-purple-800/40"
                                    >
                                        PhonePe
                                    </a>
                                    <a 
                                        href={orderData.upiUrl}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 rounded-xl text-xs font-bold transition-all border border-blue-800/40"
                                    >
                                        GPay
                                    </a>
                                    <a 
                                        href={orderData.upiUrl.replace('upi://', 'paytmmp://')}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-200 rounded-xl text-xs font-bold transition-all border border-cyan-800/40"
                                    >
                                        Paytm
                                    </a>
                                </div>
                            </div>

                            {/* VPA / Receiver Details */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Receiver UPI ID</span>
                                    <span className="text-white text-xs font-mono font-bold">{orderData.vpa}</span>
                                </div>
                                <button 
                                    onClick={copyVpa} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-700"
                                >
                                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>

                            {/* Manual Bank Ref / UTR Submission */}
                            <form onSubmit={handleVerifyUtr} className="pt-2 border-t border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Paid? Enter 12-Digit Bank UTR / Ref (Optional):
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 429182930129"
                                        value={manualUtr}
                                        onChange={e => setManualUtr(e.target.value)}
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={isVerifyingUtr || !manualUtr.trim()}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                                    >
                                        {isVerifyingUtr ? <Loader2 size={14} className="animate-spin" /> : 'Verify UTR'}
                                    </button>
                                </div>
                                {utrError && <p className="text-rose-400 text-[10px] font-medium">{utrError}</p>}
                            </form>
                        </>
                    )}

                </div>

                {/* Footer Info */}
                <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-400" /> Powered by Sovereign YouPI Mesh
                    </span>
                    <span className="font-mono">Order: {orderData.orderId}</span>
                </div>

            </div>
        </div>
    );
}
