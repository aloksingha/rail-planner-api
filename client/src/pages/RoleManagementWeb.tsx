import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCheck, ShieldAlert, Mail, User, Phone, ShieldCheck, Fingerprint, Lock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidIndianMobile } from '../utils/validation';

export default function RoleManagement() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [role, setRole] = useState('SALES_MANAGER');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUserRole(payload.role);
            } catch (e) {
                console.error("Token parse error", e);
            }
        }
    }, []);

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { data } = await axios.post('/api/admin/assign-role', { email, name, mobile, role });
            setMessage({ text: data.message, type: 'success' });
            setEmail('');
            setName('');
            setMobile('');
        } catch (error: any) {
            setMessage({ text: error.response?.data?.error || 'Failed to assign role', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

    const getRoleDescription = () => {
        switch(role) {
            case 'SUPER_ADMIN': return "Full root access. Can manage all system level configurations, users, and financials.";
            case 'ADMIN': return "Standard administrative access. Can manage users, refunds, and standard system reports.";
            case 'SALES_MANAGER': return "Restricted operational access. Authorized only for ticket booking and local sales reporting.";
            default: return "Select a role to view its permission profile.";
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in duration-700">
            
            {/* PRO HEADER ACTION BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-teal-500 p-px shadow-lg">
                        <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                            <Fingerprint size={32} className="text-brand-blue" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            {isSuperAdmin ? 'Identity Management' : 'Operations Provisioning'}
                            <div className="px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/30 text-[10px] font-black text-brand-blue uppercase tracking-widest leading-none">
                                SECURE
                            </div>
                        </h1>
                        <p className="text-slate-500 font-bold text-sm mt-1 max-w-sm uppercase tracking-wide">
                            Scale your workspace by provisioning secure authenticated accounts.
                        </p>
                    </div>
                </div>
            </div>

            {/* TWO-PANE PRO ADMIN SUITE */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
                
                {/* PANEL 1: CONTEXT & PERMISSIONS */}
                <div className="space-y-8 h-full">
                    <div className="bg-slate-900/20 rounded-[2.5rem] border border-white/5 p-8 h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <ShieldCheck className="text-brand-blue" size={24} />
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Permission Profile</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-3">
                                <span className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 inline-block">
                                    <Lock size={20} className="text-orange-500" />
                                </span>
                                <h4 className="text-white font-black text-sm uppercase tracking-widest">Authenticated Access</h4>
                                <p className="text-slate-500 text-xs font-bold leading-relaxed tracking-wider">
                                    All provisioned users must authenticate via secure identity tokens. Access is logged for audit trails.
                                </p>
                            </div>
                            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-3">
                                <span className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 inline-block">
                                    <ShieldAlert size={20} className="text-emerald-500" />
                                </span>
                                <h4 className="text-white font-black text-sm uppercase tracking-widest">Immutable Records</h4>
                                <p className="text-slate-500 text-xs font-bold leading-relaxed tracking-wider">
                                    Provisioning actions are signed and cannot be revoked without root intervention.
                                </p>
                            </div>
                        </div>

                        {/* Selected Role Context Card */}
                        <motion.div 
                            key={role}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-brand-blue/5 border border-brand-blue/10 rounded-3xl p-8 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <UserCheck size={120} className="text-brand-blue" />
                            </div>
                            <div className="relative z-10">
                                <div className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] mb-4">Current Selection</div>
                                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">{role.replace('_', ' ')}</h2>
                                <p className="text-slate-400 font-bold leading-relaxed max-w-md text-sm border-l-2 border-brand-blue/30 pl-4">
                                    {getRoleDescription()}
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* PANEL 2: PROVISIONING FORM */}
                <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-blue to-teal-500 shadow-[0_0_20px_rgba(14,165,233,0.5)]" />
                    
                    <div className="mb-8 overflow-hidden">
                        <h3 className="text-lg font-black text-white tracking-tight uppercase">Identity Entry</h3>
                        <div className="h-0.5 w-12 bg-brand-blue mt-2" />
                    </div>

                    <form onSubmit={handleAssignRole} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-brand-blue" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Registered Email ID"
                                    className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-12 py-4 text-white font-black placeholder:text-slate-600 focus:outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/10 transition-all text-sm"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-brand-blue" size={18} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Full Legal Name"
                                        className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-12 py-4 text-white font-black placeholder:text-slate-600 focus:outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/10 transition-all text-sm"
                                    />
                                </div>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-brand-blue" size={18} />
                                    <input
                                        type="tel"
                                        value={mobile}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 10) {
                                                setMobile(val);
                                            }
                                        }}
                                        placeholder="9876543210"
                                        className={`w-full bg-slate-950/40 border rounded-2xl px-12 py-4 text-white font-black placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-brand-blue/10 transition-all text-sm ${
                                            mobile.length > 0 && !isValidIndianMobile(mobile) && mobile.length === 10
                                                ? 'border-rose-500' 
                                                : mobile.length === 10 
                                                    ? 'border-emerald-500/50' 
                                                    : 'border-white/5 focus:border-brand-blue/50'
                                        }`}
                                    />
                                    {mobile.length > 0 && mobile.length < 10 && (
                                        <p className="text-[9px] text-amber-500 font-bold mt-1 ml-1 animate-pulse">Entering digits ({mobile.length}/10)...</p>
                                    )}
                                    {mobile.length === 10 && !isValidIndianMobile(mobile) && (
                                        <p className="text-[9px] text-rose-500 font-bold mt-1 ml-1 uppercase tracking-widest">Invalid! Must start with 6-9</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block ml-1">Rank Allocation</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-12 py-4 text-white font-black outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/10 transition-all appearance-none cursor-pointer uppercase tracking-widest text-xs"
                                    disabled={!isSuperAdmin}
                                >
                                    <option value="SALES_MANAGER" className="bg-slate-900">SALES MANAGER</option>
                                    {isSuperAdmin && (
                                        <>
                                            <option value="ADMIN" className="bg-slate-900">SYSTEM ADMIN</option>
                                            <option value="SUPER_ADMIN" className="bg-slate-900">SUPER ADMIN (ROOT)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !isValidIndianMobile(mobile)}
                            className="group relative w-full py-5 bg-gradient-to-r from-brand-blue to-teal-500 hover:shadow-[0_20px_50px_-10px_rgba(14,165,233,0.5)] text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-6 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
                        >
                            <span className="flex items-center justify-center gap-3 relative z-10">
                                {loading ? (
                                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> EXECUTING...</>
                                ) : (
                                    <><UserCheck size={18} /> FINAL PROVISIONING</>
                                )}
                            </span>
                            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                        </button>

                        <AnimatePresence>
                            {message && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className={`p-5 rounded-2xl border ${message.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-brand-blue/10 border-brand-blue/20 text-brand-blue'} overflow-hidden`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Info size={18} className="shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                            {message.text}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </div>
            </div>
        </div>
    );
}
