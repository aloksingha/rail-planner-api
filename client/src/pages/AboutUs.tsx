import { Train, ShieldCheck, Zap, Users, Globe, Award } from 'lucide-react';

export default function AboutUs() {
    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            {/* Hero Section */}
            <header className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-blue to-teal-500 p-12 shadow-2xl shadow-brand-blue/20">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6 transition-transform hover:scale-105">
                        <Zap size={16} className="text-yellow-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-white">The Future of Travel</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none mb-6">
                        We're Redefining <br />
                        <span className="text-brand-blue drop-shadow-sm brightness-125">Rail Booking.</span>
                    </h1>
                    <p className="text-blue-100/80 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                        Tickets Pro is more than just a booking engine. We're a technology-first travel partner dedicated to making Indian Railways more accessible, reliable, and transparent for everyone.
                    </p>
                </div>
            </header>

            {/* Core Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: ShieldCheck, title: 'Unmatched Security', desc: 'Enterprise-grade encryption for all passenger data and financial transactions via Razorpay.', color: 'text-brand-teal', bg: 'bg-brand-teal/10' },
                    { icon: Zap, title: 'Lightning Fast', desc: 'Proprietary routing logic ensures zero-lag availability checks and instant confirmations.', color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
                    { icon: Users, title: 'Customer First', desc: 'Human-centric design paired with 24/7 dedicated support for every single journey.', color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
                ].map((v, i) => (
                    <div key={i} className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-3xl p-8 hover:border-slate-600/60 transition-all hover:-translate-y-2 group group shadow-xl">
                        <div className={`w-14 h-14 rounded-2xl ${v.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <v.icon className={v.color} size={28} />
                        </div>
                        <h3 className="text-xl font-black text-white mb-3 tracking-tight">{v.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">{v.desc}</p>
                    </div>
                ))}
            </div>

            {/* Accreditation Section */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative group shadow-2xl">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-blue/10 blur-[120px] -z-10 group-hover:bg-brand-blue/20 transition-all duration-1000" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 rounded-full border border-brand-blue/20 mb-6 font-bold text-[10px] text-brand-blue uppercase tracking-widest">
                            Global Standard
                        </div>
                        <h2 className="text-4xl font-black text-white mb-6 leading-tight tracking-tight">
                            IATA Accredited <br />
                            <span className="text-slate-500">Global Travel Partner.</span>
                        </h2>
                        <p className="text-slate-400 mb-8 font-medium leading-relaxed">
                            Tickets Pro is proud to be an accredited agent of the <strong className="text-white">International Air Transport Association (IATA)</strong>. This certification is the gold standard in the travel industry, ensuring that our systems, financial security, and service quality meet rigorous global benchmarks.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                                <p className="text-brand-blue font-black text-lg mb-1">IATA-774219</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Accreditation No.</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                                <p className="text-brand-teal font-black text-lg mb-1">Standard Agent</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Certification Level</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative pt-4 sm:pt-0">
                        <div className="absolute -inset-4 bg-brand-blue/20 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative bg-white/5 backdrop-blur-sm p-4 rounded-[2rem] border border-white/10 transition-transform group-hover:scale-[1.02] duration-500">
                            <img 
                                src="/iata-cert-final.png" 
                                alt="IATA Certificate" 
                                className="w-full h-auto rounded-2xl shadow-2xl grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Story Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
                        Our Mission: <br />
                        <span className="bg-gradient-to-r from-brand-blue to-brand-teal bg-clip-text text-transparent">Every Seat, Every Station.</span>
                    </h2>
                    <p className="text-slate-400 leading-relaxed font-medium">
                        Founded in 2026, Tickets Pro emerged from a simple observation: travel booking should be as seamless as the journey itself. We've built an ecosystem that connects millions of travelers to the vast Indian Railway network through a interface that's both powerful and intuitive.
                    </p>
                    <div className="grid grid-cols-2 gap-6 pt-4">
                        <div className="space-y-1">
                            <p className="text-3xl font-black text-white leading-none">13K+</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Trains Daily</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-black text-white leading-none">7K+</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stations Linked</p>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-brand-blue/20 blur-[100px] rounded-full" />
                    <div className="relative bg-slate-900/60 border border-slate-700/50 rounded-[2rem] p-1 overflow-hidden shadow-2xl">
                        <img 
                            src="/train-mission.png" 
                            className="w-full h-full object-cover rounded-[1.8rem] opacity-80"
                            alt="Train Journey"
                        />
                    </div>
                </div>
            </div>

            {/* Achievement Chips */}
            <div className="flex flex-wrap gap-4 pt-8 border-t border-slate-800/50">
                {[
                    { icon: Globe, label: 'Nationwide Connectivity' },
                    { icon: Award, label: 'Official API Partner' },
                    { icon: Train, label: 'Real-time Tracking' },
                    { icon: ShieldCheck, label: 'Verified Payments' }
                ].map((c, i) => (
                    <div key={i} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/5 rounded-full text-slate-400 text-xs font-bold transition-colors hover:bg-white/10 hover:text-white">
                        <c.icon size={14} />
                        {c.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
