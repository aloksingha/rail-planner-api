import { ShieldCheck, Scale, FileText, AlertCircle, Info, Gavel, Wallet, Coins, Percent } from 'lucide-react';

export default function TermsAndConditions() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-teal-500 p-8 shadow-xl shadow-brand-blue/20">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <h1 className="text-3xl font-black text-white tracking-tight relative z-10 flex items-center gap-3">
                    <Scale size={32} className="text-white/40" />
                    Terms and Conditions
                </h1>
                <p className="text-white/80 mt-2 text-sm max-w-xl relative z-10 font-medium">
                    Effective Date: March 2026. Please read these terms carefully before using Tickets Pro.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Table of Contents (Sidebar) */}
                <div className="lg:col-span-1 hidden lg:block">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-6 sticky top-24 shadow-xl">
                        <h3 className="font-black text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <FileText size={18} className="text-brand-blue" />
                            Contents
                        </h3>
                        <ul className="space-y-3 text-sm font-bold uppercase tracking-tight">
                            <li><a href="#acceptance" className="text-slate-400 hover:text-brand-blue transition-colors">1. Acceptance of Terms</a></li>
                            <li><a href="#booking" className="text-slate-400 hover:text-brand-blue transition-colors">2. Booking Policies</a></li>
                            <li><a href="#cancellation" className="text-slate-400 hover:text-brand-blue transition-colors">3. Cancellation & Refunds</a></li>
                            <li><a href="#emergency" className="text-slate-400 hover:text-brand-blue transition-colors">4. Emergency Booking</a></li>
                            <li><a href="#liability" className="text-slate-400 hover:text-brand-blue transition-colors">5. Limitation of Liability</a></li>
                            <li><a href="#users" className="text-slate-400 hover:text-brand-blue transition-colors">6. User Responsibilities</a></li>
                            <li><a href="#dispute" className="text-slate-400 hover:text-brand-blue transition-colors">7. Dispute Resolution</a></li>
                            <li><a href="#wallet" className="text-slate-400 hover:text-brand-blue transition-colors">8. Wallet & Withdrawal</a></li>
                            <li><a href="#commission" className="text-slate-400 hover:text-brand-orange transition-colors">9. Sales Manager Commission</a></li>
                        </ul>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-8 shadow-2xl space-y-8">

                        <section id="acceptance" className="scroll-mt-24 text-balance">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2">
                                1. Acceptance of Terms
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                By accessing and using the Tickets Pro platform ("Service"), you accept and agree to be bound by the terms and provisions of this agreement. Tickets Pro is a facilitator that connects users with railway booking systems. We do not operate the trains ourselves.
                            </p>
                        </section>

                        <section id="booking" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2">
                                2. Booking Policies
                            </h2>
                            <ul className="list-disc pl-5 space-y-3 text-slate-300 text-sm leading-relaxed">
                                <li><strong>Identity:</strong> Passenger names must strictly match government-issued ID (e.g., Aadhaar). Tickets Pro is not responsible for denied boarding due to name mismatches.</li>
                                <li><strong>Availability:</strong> Real-time availability is determined by IRCTC systems. A booking is only "Confirmed" once a PNR is generated.</li>
                                <li><strong>Electronic Ticket:</strong> Only the E-ticket generated via our dashboard or sent via email is valid for travel.</li>
                            </ul>
                        </section>

                        <section id="cancellation" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                3. Cancellation & Refunds
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                Cancellation requests are subject to both IRCTC policies and Tickets Pro service fees.
                                <br /><br />
                                <strong>System Cancellations:</strong> If the ticket remains <strong>Not Confirmed</strong> or is cancelled by <strong>Admin</strong>, a 100% refund (zero deduction) will be processed.
                                <br /><br />
                                <strong>User Cancellations:</strong> For cancellations initiated by the user, only the standard platform fee of ₹50 will be deducted from the total amount paid.
                            </p>
                        </section>

                        <section id="emergency" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <AlertCircle className="text-brand-orange" size={20} />
                                4. Emergency Booking
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed bg-brand-orange/5 border border-brand-orange/20 p-4 rounded-xl">
                                <strong>IMPORTANT:</strong> Confirmed Emergency Booking tickets are strictly <span className="text-brand-orange font-black">NON-REFUNDABLE</span> as per railway regulations. Tickets Pro cannot override this policy under any circumstances.
                            </p>
                        </section>

                        <section id="liability" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <Info className="text-brand-blue" size={20} />
                                5. Limitation of Liability
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Tickets Pro shall not be liable for any indirect, incidental, or consequential damages resulting from train cancellations, delays, technical glitches on railway servers, or incorrect information provided by the user. Our liability is limited to the platform fee paid for the specific transaction.
                            </p>
                        </section>

                        <section id="users" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2">
                                6. User Responsibilities
                            </h2>
                            <p className="text-slate-300 text-sm mb-3">Users are strictly prohibited from:</p>
                            <ul className="list-disc pl-5 space-y-2 text-slate-300 text-sm">
                                <li>Using manual or automated tools to scrape data from Tickets Pro.</li>
                                <li>Impersonating other users or providing fraudulent payment information.</li>
                                <li>Reselling tickets at a premium (scalping), which is a punishable offense under the Railways Act.</li>
                            </ul>
                        </section>

                        <section id="dispute" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <Gavel className="text-brand-blue" size={20} />
                                7. Dispute Resolution
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                These terms are governed by the laws of India. Any disputes arising from the use of this service shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.
                            </p>
                        </section>
 
                        <section id="wallet" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <Wallet className="text-brand-blue" size={20} />
                                8. Wallet & Withdrawal Policy
                            </h2>
                            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                                <p>
                                    <strong>Platform Wallet:</strong> All funds credited to the TicketsPro Wallet are for the sole purpose of booking services through our platform.
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-slate-400">
                                    <li><strong>Mandatory Gateway Top-ups:</strong> All wallet top-ups must be initiated by the user through the integrated Razorpay payment gateway. Manual credits by administrators are strictly prohibited for audit integrity.</li>
                                    <li><strong>Minimum Withdrawal:</strong> A minimum wallet balance of ₹500 is required to request a payout/withdrawal.</li>
                                    <li><strong>Tiered Transaction Fees:</strong> Each withdrawal request attracts a service charge based on the requested amount:
                                        <ul className="mt-2 list-[circle] pl-5 space-y-1">
                                            <li>₹0 - ₹1,000: <span className="text-brand-blue font-bold">₹10 Fee</span></li>
                                            <li>₹1,001 - ₹25,000: <span className="text-brand-blue font-bold">₹15 Fee</span></li>
                                            <li>₹25,001 & Above: <span className="text-brand-blue font-bold">₹20 Fee</span></li>
                                        </ul>
                                    </li>
                                    <li><strong>Refunds on Rejection:</strong> If a withdrawal request is rejected by the administrator, the system will automatically refund the full amount (Requested Payout + Transaction Fee) back to your wallet balance.</li>
                                </ul>
                            </div>
                        </section>

                        <section id="commission" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <Coins className="text-brand-orange" size={20} />
                                9. Sales Manager Commission Terms
                            </h2>
                            <div className="space-y-5 text-slate-300 text-sm leading-relaxed">
                                <p>
                                    Tickets Pro operates a tiered commission structure for all registered <strong>Sales Managers</strong>. Commissions are earned on every IRCTC ticket booking confirmed through your Sales Manager account or via Customer nodes registered under your referral link.
                                </p>

                                {/* Tier Table */}
                                <div className="rounded-xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-brand-orange/10 text-brand-orange">
                                                <th className="text-left px-4 py-3 font-black uppercase tracking-widest">Tier</th>
                                                <th className="text-left px-4 py-3 font-black uppercase tracking-widest">Booking Value</th>
                                                <th className="text-left px-4 py-3 font-black uppercase tracking-widest">Commission Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                                                <td className="px-4 py-3 font-bold text-amber-500">🥉 Bronze</td>
                                                <td className="px-4 py-3 text-slate-400">Under ₹1,500</td>
                                                <td className="px-4 py-3 font-black text-amber-500">10%</td>
                                            </tr>
                                            <tr className="bg-slate-500/5 hover:bg-slate-500/10 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-300">🥈 Silver</td>
                                                <td className="px-4 py-3 text-slate-400">₹1,500 – ₹3,499</td>
                                                <td className="px-4 py-3 font-black text-slate-300">8%</td>
                                            </tr>
                                            <tr className="bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors">
                                                <td className="px-4 py-3 font-bold text-yellow-400">🥇 Gold</td>
                                                <td className="px-4 py-3 text-slate-400">₹3,500 – ₹5,999</td>
                                                <td className="px-4 py-3 font-black text-yellow-400">7%</td>
                                            </tr>
                                            <tr className="bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors">
                                                <td className="px-4 py-3 font-bold text-cyan-400">💎 Platinum</td>
                                                <td className="px-4 py-3 text-slate-400">₹6,000 &amp; Above</td>
                                                <td className="px-4 py-3 font-black text-cyan-400">5%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <ul className="list-disc pl-5 space-y-3 text-slate-400">
                                    <li><strong className="text-white">Proportional Credit:</strong> Commission is calculated on the per-ticket fare (the booking value) and credited proportionally. It is not calculated on platform fees or taxes.</li>
                                    <li><strong className="text-white">Instant Ledger Credit:</strong> Commissions are automatically credited to your node wallet as soon as a booking transitions to the <strong className="text-brand-orange">CONFIRMED</strong> state in the system ledger. No manual processing is required.</li>
                                    <li><strong className="text-white">Self &amp; Network Bookings:</strong> You earn commission on bookings you make directly as a Sales Manager, as well as bookings made by Customer accounts registered under your referral node.</li>
                                    <li><strong className="text-white">Cancellation Clawback:</strong> If a confirmed booking is subsequently cancelled or partially cancelled, the system automatically debits the corresponding proportional commission from your wallet balance to maintain full audit alignment. Disputes regarding clawbacks must be raised within 7 days via the Contact Inbox.</li>
                                    <li><strong className="text-white">Payout Eligibility:</strong> Commission earnings accumulate in your Tickets Pro Wallet. Withdrawal requests are subject to the minimum balance threshold of <strong className="text-brand-orange">₹500</strong> and standard tiered transaction fees as outlined in Section 8.</li>
                                    <li><strong className="text-white">Earnings Calculator:</strong> The in-app Commission Chart provides an interactive calculator for real-time earnings estimates. Calculator results are indicative only and are subject to the final confirmed booking value recorded in the system.</li>
                                    <li><strong className="text-white">Policy Amendments:</strong> Tickets Pro reserves the right to revise commission tiers, rates, or eligibility rules. Active Sales Managers will be notified via the Platform Broadcasts feature at least 7 days prior to any structural change.</li>
                                </ul>

                                <div className="p-4 bg-brand-orange/5 rounded-xl border border-brand-orange/20 flex items-start gap-3">
                                    <Percent size={18} className="text-brand-orange mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-brand-orange/80 font-bold leading-relaxed">
                                        Commission earnings are considered supplemental income and may be subject to applicable income tax laws in India. Sales Managers are solely responsible for any tax reporting obligations arising from their commission earnings.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="pt-8 border-t border-white/5">
                            <div className="flex items-center gap-3 p-4 bg-brand-blue/10 rounded-2xl border border-brand-blue/20">
                                <ShieldCheck size={24} className="text-brand-blue" />
                                <p className="text-xs text-brand-blue font-black uppercase tracking-widest leading-relaxed">
                                    Tickets Pro is a certified booking facilitator. We adhere to the highest standards of data security and professional conduct.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
