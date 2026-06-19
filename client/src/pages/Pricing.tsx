import { IndianRupee, Tags, ShieldCheck, Zap, Info, CreditCard } from 'lucide-react';

export default function Pricing() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue via-brand-teal to-teal-500 p-8 shadow-xl shadow-brand-blue/20">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <h1 className="text-3xl font-black text-white tracking-tight relative z-10 flex items-center gap-3">
                    <IndianRupee size={32} className="text-white/40" />
                    Pricing & Fees
                </h1>
                <p className="text-white/80 mt-2 text-sm max-w-xl relative z-10 font-medium">
                    Fully transparent, competitive pricing for a premium booking experience.
                </p>
            </header>

            {/* Pricing Model Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Fee Details Card */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Info className="text-brand-blue" size={20} />
                            How we calculate your total fare
                        </h2>
                        <div className="space-y-4">
                            {[
                                { label: 'Base Rail Fare', desc: 'Regulated by Indian Railways based on distance and class.', icon: IndianRupee },
                                { label: 'Reservation & Superfast Charges', desc: 'Standard IRCTC charges applicable per ticket.', icon: Zap },
                                { label: 'Tickets Pro Platform Fee', desc: 'A flat ₹50 convenience charge for our 24/7 priority booking engine.', icon: Tags, highlight: true }
                            ].map((item, i) => (
                                <div key={i} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${item.highlight ? 'bg-brand-blue/10 border-brand-blue/30 shadow-lg shadow-brand-blue/5' : 'bg-white/5 border-white/5'}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.highlight ? 'bg-brand-blue/20' : 'bg-slate-800'}`}>
                                        <item.icon size={24} className={item.highlight ? 'text-brand-blue' : 'text-slate-400'} />
                                    </div>
                                    <div>
                                        <h3 className={`text-base font-black tracking-tight ${item.highlight ? 'text-white' : 'text-slate-200'}`}>{item.label}</h3>
                                        <p className="text-slate-400 text-xs mt-1 leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Pricing Info */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-brand-teal/20 transition-all duration-700" />
                        <h2 className="text-xl font-bold text-white mb-4">Routes with Dynamic Pricing</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            For specialty corridors with high demand, we use a <strong>Price Request</strong> system. Our expert managers verify the best available pricing manually to ensure high success rates.
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {['Verified Success Rates', 'Zero Hidden Markups', '3-Hour Price Lock', 'Instant Dashboard Support'].map((t, i) => (
                                <li key={i} className="flex items-center gap-2 text-[11px] font-black text-slate-300 uppercase tracking-tight">
                                    <ShieldCheck size={14} className="text-brand-teal" />
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Secure Payments Card */}
                <div className="md:col-span-1">
                    <div className="bg-gradient-to-b from-slate-900 to-brand-blue/10 border border-brand-blue/20 rounded-3xl p-8 sticky top-24 shadow-xl">
                        <div className="w-16 h-16 rounded-2xl bg-brand-blue/20 flex items-center justify-center mb-6">
                            <CreditCard className="text-brand-blue" size={32} />
                        </div>
                        <h3 className="text-white font-black text-xl mb-4 tracking-tight">100% Secure Payments</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                            We partner with **Razorpay** and leading banks to ensure your transactions are always safe.
                        </p>
                        
                        <div className="space-y-4">
                            <h4 className="text-brand-blue text-[10px] uppercase font-black tracking-[0.2em]">Supported Methods</h4>
                            <div className="grid grid-cols-2 gap-2 opacity-80">
                                {['UPI', 'Credit Cards', 'Debit Cards', 'Net Banking'].map(m => (
                                    <div key={m} className="px-3 py-2 bg-brand-blue/10 rounded-xl border border-brand-blue/10 text-[10px] text-brand-blue font-black uppercase tracking-widest text-center">
                                        {m}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-slate-500 text-[10px] leading-relaxed uppercase font-black text-center tracking-widest">
                                Certified IRCTC Partner <br /> (via authorized APIs)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
