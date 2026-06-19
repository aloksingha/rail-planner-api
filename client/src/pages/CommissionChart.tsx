import { useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Coins, ShieldCheck, Info, HelpCircle, Calculator, TrendingUp, Sparkles } from 'lucide-react';

interface Tier {
    name: string;
    range: string;
    rate: number;
    color: string;
    gradient: string;
    shadow: string;
    badge: string;
}

const commissionTiers: Tier[] = [
    {
        name: 'Platinum Tier',
        range: '₹6,000 & Above',
        rate: 5,
        color: 'text-cyan-500',
        gradient: 'from-cyan-500/10 to-blue-500/5',
        shadow: 'shadow-cyan-500/5',
        badge: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400'
    },
    {
        name: 'Gold Tier',
        range: '₹3,500 - ₹5,999',
        rate: 7,
        color: 'text-yellow-500',
        gradient: 'from-yellow-500/10 to-amber-500/5',
        shadow: 'shadow-yellow-500/5',
        badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
    },
    {
        name: 'Silver Tier',
        range: '₹1,500 - ₹3,499',
        rate: 8,
        color: 'text-slate-400 dark:text-slate-300',
        gradient: 'from-slate-400/10 to-slate-500/5',
        shadow: 'shadow-slate-400/5',
        badge: 'bg-slate-400/10 border-slate-400/20 text-slate-50 dark:text-slate-300'
    },
    {
        name: 'Bronze Tier',
        range: 'Under ₹1,500',
        rate: 10,
        color: 'text-amber-600 dark:text-amber-500',
        gradient: 'from-amber-500/10 to-amber-600/5',
        shadow: 'shadow-amber-500/5',
        badge: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
    }
];

export default function CommissionChart() {
    const [calcAmount, setCalcAmount] = useState<string>('');
    const [isCalculating, setIsCalculating] = useState(false);

    // Calculate commission dynamically
    const calculatorResult = (() => {
        const amt = parseFloat(calcAmount);
        if (isNaN(amt) || amt <= 0) return null;

        let rate = 10;
        let tierName = 'Bronze Tier';
        let badgeColor = 'bg-amber-500/10 text-amber-500';

        if (amt >= 1500 && amt < 3500) {
            rate = 8;
            tierName = 'Silver Tier';
            badgeColor = 'bg-slate-400/10 text-slate-300';
        } else if (amt >= 3500 && amt < 6000) {
            rate = 7;
            tierName = 'Gold Tier';
            badgeColor = 'bg-yellow-500/10 text-yellow-400';
        } else if (amt >= 6000) {
            rate = 5;
            tierName = 'Platinum Tier';
            badgeColor = 'bg-cyan-500/10 text-cyan-400';
        }

        const earnings = Math.round((amt * (rate / 100)) * 100) / 100;
        return { rate, tierName, earnings, badgeColor };
    })();

    const handleCalcChange = (val: string) => {
        setIsCalculating(true);
        setCalcAmount(val);
        setTimeout(() => setIsCalculating(false), 150);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-orange via-amber-600 to-brand-deep p-8 shadow-2xl shadow-brand-orange/20 group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                        <Coins size={32} className="text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic">Commission Chart</h1>
                        <p className="text-amber-100/70 text-sm mt-1 font-medium">Earn tiered rewards automatically on every IRCTC ticket booked through your network node.</p>
                    </div>
                </div>
            </div>

            {/* Grid for Cards & Interactive Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Commission Tiers Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="text-brand-orange animate-pulse" size={18} />
                        Active Commission Tiers
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {commissionTiers.map((tier, index) => (
                            <motion.div
                                key={tier.name}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`rounded-2xl border border-slate-200 dark:border-white/5 bg-gradient-to-br ${tier.gradient} p-6 shadow-sm ${tier.shadow} flex flex-col justify-between h-44 hover:shadow-md transition-all duration-300 relative group/card`}
                            >
                                <div className="absolute top-4 right-4">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${tier.badge}`}>
                                        {tier.name}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Booking Value</p>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">{tier.range}</h3>
                                </div>

                                <div className="flex items-baseline justify-between mt-4">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Earning Rate</p>
                                        <span className={`text-4xl font-black ${tier.color} italic leading-none`}>{tier.rate}%</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-white/5 rounded px-1.5 py-0.5 opacity-60">PROPORTIONAL CREDIT</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Interactive Earnings Calculator */}
                <div className="lg:col-span-1">
                    <div className="card-glow p-6 flex flex-col justify-between h-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm min-h-[350px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Calculator className="text-brand-orange" size={18} />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Earnings Calculator</h3>
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-6">Estimate your payout instantly</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="ticketPrice" className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Ticket Price (₹)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <IndianRupee size={14} />
                                        </div>
                                        <input
                                            id="ticketPrice"
                                            type="number"
                                            placeholder="Enter ticket amount"
                                            value={calcAmount}
                                            onChange={(e) => handleCalcChange(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-brand-orange/50 outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                            {calculatorResult ? (
                                <div className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isCalculating ? 'opacity-30' : ''}`}>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold uppercase tracking-widest">Matched Tier</span>
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${calculatorResult.badgeColor}`}>
                                            {calculatorResult.tierName}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold uppercase tracking-widest">Commission Rate</span>
                                        <span className="text-slate-900 dark:text-white font-black">{calculatorResult.rate}%</span>
                                    </div>
                                    <div className="flex justify-between items-end bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5">
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Your Net Profit</span>
                                            <span className="text-2xl font-black text-emerald-500 italic leading-none">
                                                ₹{calculatorResult.earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Automated Credit</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400/60 flex flex-col items-center gap-2">
                                    <Info size={24} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Enter a valid amount to begin calculations</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms and Policies */}
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
                    <HelpCircle className="text-brand-orange" size={20} />
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Commission Terms & Rules</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600 dark:text-slate-300">
                    <div className="space-y-4">
                        <div className="relative pl-6">
                            <span className="absolute left-0 top-1 text-emerald-500 font-black">✓</span>
                            <p className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-1">Instant Payout Credits</p>
                            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                Commissions are calculated and credited in real-time to your node wallet as soon as a booking transitions to the <strong>CONFIRMED</strong> state in the ledger.
                            </p>
                        </div>
                        <div className="relative pl-6">
                            <span className="absolute left-0 top-1 text-emerald-500 font-black">✓</span>
                            <p className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-1">Self & Network Bookings</p>
                            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                You receive commission for bookings you execute directly as a Sales Manager, as well as bookings made by Customer nodes registered under your link.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative pl-6">
                            <span className="absolute left-0 top-1 text-rose-500 font-black">⚠</span>
                            <p className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-1">Cancellation Clawbacks</p>
                            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                If a booking is cancelled or partially cancelled, the system automatically debits the proportional commission amount from your wallet balance to maintain audit alignment.
                            </p>
                        </div>
                        <div className="relative pl-6">
                            <span className="absolute left-0 top-1 text-rose-500 font-black">⚠</span>
                            <p className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-1">Wallet Payout Restrictions</p>
                            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                You can request payouts of your wallet balance to UPI or bank accounts once it exceeds the threshold of <strong>₹500</strong>, subject to standard payout ledger fees.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3 p-4 bg-brand-orange/5 rounded-2xl border border-brand-orange/20">
                        <ShieldCheck size={24} className="text-brand-orange" />
                        <p className="text-[10px] text-brand-orange font-black uppercase tracking-widest leading-relaxed">
                            Tickets Pro is committed to audit integrity. All wallet credits, debits, and commission distributions are logged automatically in the system audit registry.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
