import { RotateCcw, Clock, AlertTriangle, CheckCircle2, IndianRupee } from 'lucide-react';

export default function RefundPolicy() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-teal-500 p-8 shadow-xl shadow-brand-blue/20">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <h1 className="text-3xl font-black text-white tracking-tight relative z-10 flex items-center gap-3">
                    <RotateCcw size={32} className="text-white/40" />
                    Refund & Cancellation Policy
                </h1>
                <p className="text-white/80 mt-2 text-sm max-w-xl relative z-10 font-medium">
                    Transparent and fair cancellation rules for all your rail journeys.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Key Highlights */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Clock className="text-brand-blue" size={20} />
                            Cancellation Timelines
                        </h2>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-1 bg-brand-teal rounded-full shrink-0" />
                                <div>
                                    <h3 className="text-white font-black text-sm">Full Refund Policy</h3>
                                    <p className="text-slate-400 text-xs mt-1">If your ticket is <strong>Not Confirmed</strong> or is <strong>Cancelled by the Admin</strong>, no amount shall be deducted. A full refund will be processed immediately.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-1 bg-brand-orange rounded-full shrink-0" />
                                <div>
                                    <h3 className="text-white font-black text-sm">User Cancellations</h3>
                                    <p className="text-slate-400 text-xs mt-1">If a ticket is cancelled <strong>by the User</strong>, only the standard platform fee of <strong>₹50</strong> will be deducted. All remaining amounts will be refunded to your source account.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Platform Fee Section */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <IndianRupee className="text-brand-teal" size={20} />
                            Standard Platform Fees
                        </h2>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            Tickets Pro maintains a simplified refund structure. For every user-initiated cancellation, we only retain a flat convenience charge to cover our proprietary booking technology and 24/7 support infrastructure.
                        </p>
                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Platform Fee (Per Reservation)</span>
                            <span className="text-2xl font-black text-brand-teal">₹50</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {/* Emergency Booking Warning */}
                    <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 text-brand-orange/10 group-hover:scale-110 transition-transform">
                            <AlertTriangle size={120} />
                        </div>
                        <h3 className="text-brand-orange font-black text-lg uppercase tracking-wider mb-2">Emergency Policy</h3>
                        <p className="text-slate-400/80 text-xs leading-relaxed font-black uppercase tracking-tight">
                            Confirmed Emergency Booking tickets are strictly <span className="text-brand-orange">NON-REFUNDABLE</span> under IRCTC regulations. No refund is granted for the cancellation of confirmed Emergency Booking tickets except in cases of train cancellation/divergence.
                        </p>
                    </div>

                    {/* Refund Process */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-white font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <CheckCircle2 className="text-brand-teal" size={18} />
                            How to get a refund?
                        </h3>
                        <ol className="space-y-4">
                            {[
                                'Navigate to "My Bookings" in your dashboard.',
                                'Select the ticket you wish to cancel.',
                                'Verify the calculated refund amount.',
                                'Submit the cancellation request.',
                                'Amount will reflect in your source account within 5-7 business days.'
                            ].map((step, i) => (
                                <li key={i} className="flex gap-3 text-xs">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-bold shrink-0">{i + 1}</span>
                                    <span className="text-slate-400 font-medium">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
