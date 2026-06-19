import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    AlertCircle, CheckCircle2, Search, RefreshCw, Trash2, 
    User, Mail, Phone, Calendar, Train, Clock, Filter,
    CheckSquare, XCircle
} from 'lucide-react';

interface FailedBooking {
    id: string;
    name: string;
    email: string;
    mobile: string;
    trainName: string | null;
    trainNumber: string | null;
    source: string | null;
    destination: string | null;
    journeyDate: string | null;
    class: string | null;
    reason: string | null;
    status: string;
    createdAt: string;
}

const STATUS_META: Record<string, { label: string, color: string, bg: string, border: string, icon: any }> = {
    PENDING: { label: 'Pending', color: 'text-brand-orange', bg: 'bg-brand-orange/10', border: 'border-brand-orange/20', icon: Clock },
    FOLLOWED_UP: { label: 'Followed Up', color: 'text-brand-teal', bg: 'bg-brand-teal/10', border: 'border-brand-teal/20', icon: CheckCircle2 },
    IGNORED: { label: 'Ignored', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: XCircle },
};

export default function FailedBookings() {
    const [bookings, setBookings] = useState<FailedBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('PENDING');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchBookings = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get('/api/failed-bookings');
            setBookings(data.failedBookings);
        } catch (err: any) {
            showMsg(err.response?.data?.error || 'Failed to load data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        setActionLoading(id);
        try {
            await axios.patch(`/api/failed-bookings/${id}/status`, { status });
            showMsg(`Successfully marked as ${status.replace('_', ' ')}`, 'success');
            fetchBookings();
        } catch (err: any) {
            showMsg(err.response?.data?.error || 'Update failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        setActionLoading(id);
        try {
            await axios.delete(`/api/failed-bookings/${id}`);
            showMsg('Record deleted successfully', 'success');
            fetchBookings();
        } catch (err: any) {
            showMsg(err.response?.data?.error || 'Delete failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = bookings.filter(b => {
        const statusMatch = filterStatus === 'ALL' || b.status === filterStatus;
        const searchMatch = !search || 
            b.name.toLowerCase().includes(search.toLowerCase()) || 
            b.email.toLowerCase().includes(search.toLowerCase()) ||
            b.mobile.includes(search);
        return statusMatch && searchMatch;
    });

    return (
        <div className="bg-transparent pb-12 w-full">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
                {/* Header */}
                <header className="mb-10 p-8 rounded-2xl bg-gradient-to-br from-brand-blue via-brand-teal/80 to-brand-teal shadow-xl shadow-brand-blue/20 relative overflow-hidden">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl border border-white/20 backdrop-blur-md">
                            <AlertCircle size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Failed Bookings Tracker</h1>
                            <p className="text-white/70 mt-1 text-sm font-medium">Follow up with leads who abandoned or failed their booking.</p>
                        </div>
                    </div>
                </header>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-brand-orange" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email or mobile..."
                            className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange/50 backdrop-blur-xl transition-all"
                        />
                    </div>

                    {/* Status Tabs */}
                    <div className="flex p-1 bg-slate-900/40 border border-slate-700/50 rounded-2xl backdrop-blur-xl">
                        {['PENDING', 'FOLLOWED_UP', 'IGNORED', 'ALL'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filterStatus === s 
                                        ? 'bg-brand-orange text-slate-950 shadow-lg shadow-brand-orange/20 border border-brand-orange/30' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchBookings}
                        className="p-3 bg-slate-900/40 border border-slate-700/50 rounded-2xl text-slate-400 hover:text-white hover:border-slate-500 transition-all backdrop-blur-xl"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Message Alert */}
                {message.text && (
                    <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-8 text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-300 ${
                        message.type === 'success' ? 'bg-brand-teal/10 border-brand-teal/20 text-brand-teal' : 'bg-brand-rose/10 border-brand-rose/20 text-brand-rose'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {message.text}
                    </div>
                )}

                {/* List */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <RefreshCw size={40} className="animate-spin mb-4 opacity-20" />
                        <p className="font-medium">Fetching lead data...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-slate-700/50 rounded-3xl">
                        <Filter size={40} className="mb-4 text-slate-700" />
                        <p className="text-slate-400 font-medium">No records found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filtered.map(booking => {
                            const meta = STATUS_META[booking.status] || STATUS_META.PENDING;
                            const StatusIcon = meta.icon;

                            return (
                                <div key={booking.id} className="group relative bg-slate-900/40 border border-slate-800/50 hover:border-brand-orange/30 rounded-3xl p-6 backdrop-blur-xl transition-all duration-300">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                        {/* User Info */}
                                        <div className="flex items-center gap-4 min-w-[240px]">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-inner group-hover:border-brand-orange/20 transition-colors`}>
                                                <User size={20} className="text-brand-orange" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-white font-black group-hover:text-brand-orange transition-colors tracking-tight text-lg">{booking.name}</h3>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                        <Mail size={12} className="opacity-50" />
                                                        <span className="truncate">{booking.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                        <Phone size={12} className="opacity-50" />
                                                        <span>{booking.mobile}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Journey Info */}
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 lg:p-0 bg-slate-950/30 lg:bg-transparent rounded-2xl">
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Train / Class</p>
                                                <div className="flex items-center gap-2 group/train">
                                                    <Train size={14} className="text-brand-orange opacity-50 group-hover/train:opacity-100 transition-opacity" />
                                                    <p className="text-sm text-slate-200 font-bold">{booking.trainName || '—'} ({booking.trainNumber})</p>
                                                </div>
                                                <p className="text-[9px] text-rose-400 font-black bg-rose-400/5 px-2 py-0.5 rounded-md inline-block border border-rose-400/10 uppercase tracking-widest">
                                                    {booking.class || 'N/A'}
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Route details</p>
                                                <p className="text-sm font-black text-white flex items-center gap-2">
                                                    {booking.source} 
                                                    <span className="text-brand-blue font-black">→</span> 
                                                    {booking.destination}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
                                                    <Calendar size={12} className="opacity-50 text-brand-teal" />
                                                    {booking.journeyDate || '—'}
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Failure Reason</p>
                                                <p className="text-sm text-rose-300 font-medium">{booking.reason || 'Manual abandonment'}</p>
                                                <p className="text-[10px] text-slate-500 font-medium italic"> Captured on {new Date(booking.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="flex items-center justify-between lg:justify-end gap-3 lg:w-48">
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-sm ${meta.bg} ${meta.border} ${meta.color}`}>
                                                <StatusIcon size={12} />
                                                {meta.label}
                                            </div>

                                            <div className="h-8 w-px bg-slate-700/50 hidden lg:block mx-1" />

                                            <div className="flex items-center gap-2">
                                                {booking.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(booking.id, 'FOLLOWED_UP')}
                                                        disabled={!!actionLoading}
                                                        className="p-2.5 bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-slate-950 border border-brand-teal/20 rounded-xl transition-all"
                                                        title="Mark as Followed Up"
                                                    >
                                                        <CheckSquare size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(booking.id)}
                                                    disabled={!!actionLoading}
                                                    className="p-2.5 bg-brand-rose/10 hover:bg-brand-rose text-brand-rose hover:text-slate-950 border border-brand-rose/20 rounded-xl transition-all"
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
