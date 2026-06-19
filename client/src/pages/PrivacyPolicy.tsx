import { ShieldCheck, Lock, Database, Globe, UserCheck } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-teal-500 p-8 shadow-xl shadow-brand-blue/20">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <h1 className="text-3xl font-black text-white tracking-tight relative z-10 flex items-center gap-3">
                    <ShieldCheck size={32} className="text-white/40" />
                    Privacy Policy
                </h1>
                <p className="text-white/80 mt-2 text-sm max-w-xl relative z-10 font-medium">
                    Your privacy is our priority. Learn how Tickets Pro handles and protects your personal data.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Table of Contents (Sidebar) */}
                <div className="lg:col-span-1 hidden lg:block">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-6 sticky top-24 shadow-xl">
                        <h3 className="font-black text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <Lock size={18} className="text-brand-blue" />
                            Sections
                        </h3>
                        <ul className="space-y-3 text-sm font-bold uppercase tracking-tight">
                            <li><a href="#collection" className="text-slate-400 hover:text-brand-blue transition-colors">1. Data Collection</a></li>
                            <li><a href="#usage" className="text-slate-400 hover:text-brand-blue transition-colors">2. How We Use Data</a></li>
                            <li><a href="#sharing" className="text-slate-400 hover:text-brand-blue transition-colors">3. Third-Party Sharing</a></li>
                            <li><a href="#security" className="text-slate-400 hover:text-brand-blue transition-colors">4. Data Security</a></li>
                            <li><a href="#cookies" className="text-slate-400 hover:text-brand-blue transition-colors">5. Cookies & Tracking</a></li>
                            <li><a href="#rights" className="text-slate-400 hover:text-brand-blue transition-colors">6. Your Rights</a></li>
                        </ul>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-8 shadow-2xl space-y-8">

                        <section id="collection" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <Database className="text-brand-blue" size={20} />
                                1. Data Collection
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                To facilitate your rail bookings, we collect personal information including but not limited to: 
                                <br /><br />
                                <strong>Personal Identification:</strong> Full name, age, gender, and Aadhaar-verified names.
                                <br />
                                <strong>Contact Information:</strong> Email address and mobile number for e-ticket delivery and SMS alerts.
                                <br />
                                <strong>Transactional Data:</strong> Payment details (processed securely via Razorpay, we do not store full card info).
                            </p>
                        </section>

                        <section id="usage" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2">
                                2. How We Use Data
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Your information is used primarily to:
                            </p>
                            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-300 text-sm">
                                <li>Process and confirm your rail reservations with the railway authority.</li>
                                <li>Send transaction receipts, E-tickets, and journey alerts.</li>
                                <li>Provide customer support and troubleshoot booking failures.</li>
                                <li>Verify identities during Emergency Booking or high-value booking price requests.</li>
                            </ul>
                        </section>

                        <section id="sharing" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <Globe className="text-brand-blue" size={20} />
                                3. Third-Party Sharing
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Tickets Pro strictly adheres to a <strong>No-Sell</strong> policy. We do not sell your personal information to third-party marketers. Data is shared exclusively with:
                                <br /><br />
                                1. <strong>CRIS/IRCTC:</strong> The central railway booking systems for reservation fulfillment.
                                <br />
                                2. <strong>Razorpay:</strong> Our secure payment gateway partner.
                                <br />
                                3. <strong>Zoho:</strong> Our notification partner for sending your E-tickets and SMS alerts.
                            </p>
                        </section>

                        <section id="security" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2">
                                4. Data Security
                            </h2>
                            <div className="bg-brand-teal/10 border border-brand-teal/20 p-5 rounded-2xl">
                                <p className="text-xs text-brand-teal leading-relaxed font-black uppercase tracking-widest">
                                    We employ SSL/TLS encryption for all data in transit. Our database is hosted on enterprise-grade infrastructure with strict Role-Based Access Control (RBAC), ensuring that even our internal support team can only access data relevant to your specific support ticket.
                                </p>
                            </div>
                        </section>

                        <section id="cookies" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2">
                                5. Cookies & Tracking
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                We use session cookies to maintain your authentication state and Google Analytics to improve our platform's performance. You can disable cookies in your browser, but this will prevent you from staying logged in to the Tickets Pro dashboard.
                            </p>
                        </section>

                        <section id="rights" className="scroll-mt-24">
                            <h2 className="text-xl font-bold text-white mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                <UserCheck className="text-brand-blue" size={20} />
                                6. Your Rights
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                You have the right to access, correct, or request the deletion of your personal data stored on Tickets Pro. To exercise these rights, please contact our privacy officer at <a href="mailto:privacy@ticketspro.in" className="text-brand-teal hover:underline font-black uppercase tracking-widest text-[10px]">privacy@ticketspro.in</a>.
                            </p>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
}
