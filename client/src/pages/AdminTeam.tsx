import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Mail, Phone, Ticket, UserPlus, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamMember {
    id: string;
    email: string;
    name: string | null;
    mobile: string | null;
    region: string | null;
    createdAt: string;
    _count: { bookings: number };
}

const AVATAR_GRADIENTS = [
    'from-brand-blue to-teal-600',
    'from-brand-teal to-blue-600',
    'from-brand-orange to-brand-rose',
    'from-brand-teal to-brand-blue',
    'from-blue-400 to-brand-teal',
];

export default function AdminTeam() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get('/api/admin/team')
            .then(({ data }) => setMembers(data.members || []))
            .catch(() => setError('Failed to load team members.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-slate-800/60" />
            ))}
        </div>
    );

    if (error) return <div className="text-rose-400 p-8 card">{error}</div>;

    const totalBookings = members.reduce((s, m) => s + (m?._count?.bookings || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex items-start justify-between p-8 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-teal shadow-xl shadow-brand-blue/20 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex-1">
                    <h1 className="text-3xl font-black text-white">My Sales Team</h1>
                    <p className="text-white/70 mt-1 text-sm font-medium">Manage and monitor your dedicated Sales Managers.</p>
                </div>
                <Link to="/roles"
                    className="relative z-10 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-black uppercase tracking-widest py-3 px-6 rounded-xl border border-white/20 backdrop-blur-md transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg">
                    <UserPlus size={16} /> Add Member
                </Link>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-teal to-teal-700 p-6 shadow-lg shadow-brand-teal/20">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Team Size</p>
                    <p className="text-4xl font-black text-white">{members.length}</p>
                    <p className="text-white/60 text-xs mt-2 flex items-center gap-1 font-bold"><Users size={12} /> Sales Managers</p>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue to-blue-800 p-6 shadow-lg shadow-brand-blue/20">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Total Sales</p>
                    <p className="text-4xl font-black text-white">{totalBookings}</p>
                    <p className="text-white/60 text-xs mt-2 flex items-center gap-1 font-bold"><Ticket size={12} /> Tickets Generated</p>
                </div>
            </div>

            {/* Member Cards */}
            {members.length === 0 ? (
                <div className="rounded-3xl bg-slate-900/40 border border-slate-800/50 p-16 text-center backdrop-blur-xl">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        <Users size={28} className="text-slate-600" />
                    </div>
                    <p className="text-white font-black text-lg mb-1 uppercase tracking-tight">No team members yet</p>
                    <p className="text-slate-500 text-sm mb-8">Provision a Sales Manager to begin scaling your team.</p>
                    <Link to="/roles" className="inline-flex items-center gap-2 bg-brand-teal text-slate-950 font-black uppercase tracking-widest py-3.5 px-8 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-teal/20">
                        <UserPlus size={16} /> Add Sales Manager
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {members.map((member, idx) => {
                        const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                        const initials = (member.name || member.email || "?").slice(0, 2).toUpperCase();
                        return (
                            <div key={member.id}
                                className="rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-brand-teal/40 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-brand-teal/5 group">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    {/* Avatar */}
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg border-2 border-white/10 group-hover:scale-105 transition-transform`}>
                                        {initials}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-lg text-white group-hover:text-brand-teal transition-colors tracking-tight">{member.name || <span className="text-slate-600 italic font-normal">Anonymous</span>}</p>
                                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                                            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold font-mono">
                                                <Mail size={12} className="text-brand-blue" /> {member.email}
                                            </span>
                                            {member.mobile && <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold font-mono">
                                                <Phone size={12} className="text-brand-teal" /> {member.mobile}
                                            </span>}
                                            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-tighter">
                                                <Calendar size={12} /> Joined {new Date(member.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Right badges */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-1.5 px-3 py-2 bg-brand-blue/10 rounded-xl border border-brand-blue/20">
                                            <Ticket size={14} className="text-brand-blue" />
                                            <span className="text-white font-black text-base">{member?._count?.bookings || 0}</span>
                                            <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Bookings</span>
                                        </div>
                                        <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-teal/10 text-brand-teal border border-brand-teal/20 shadow-sm">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {members.length > 0 && (
                <Link to="/sales/team"
                    className="flex items-center justify-center gap-3 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 hover:bg-brand-orange/10 py-5 text-brand-orange font-black uppercase tracking-widest text-xs transition-all hover:border-brand-orange/40 shadow-inner group">
                    <TrendingUp size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    View All Team Bookings
                </Link>
            )}
        </div>
    );
}
