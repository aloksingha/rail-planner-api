import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Clock, MapPin, User, Save, Loader2, Info } from 'lucide-react';

interface PriceRequest {
    id: string;
    userId: string;
    trainName: string;
    trainNumber: string;
    source: string;
    destination: string;
    class: string;
    suggestedPrice: number | null;
    status: string;
    adminComment: string | null;
    createdAt: string;
    user: { email: string };
}

export default function PriceRequestsPage() {
    const [requests, setRequests] = useState<PriceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editComment, setEditComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get('/api/price-requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch price requests', error);
            showToast('Failed to load requests.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleUpdatePrice = async (id: string) => {
        if (!editPrice || isNaN(parseFloat(editPrice))) {
            showToast('Please enter a valid price.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/price-requests/${id}`, {
                suggestedPrice: editPrice,
                adminComment: editComment,
                status: 'UPDATED'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Price updated successfully!');
            setEditingId(null);
            fetchRequests();
        } catch (error) {
            console.error('Failed to update price', error);
            showToast('Failed to update price.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesSearch = r.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.trainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.trainNumber.includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={24} />
            <span className="text-slate-400">Loading price requests...</span>
        </div>
    );

    return (
        <div className="pb-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* SCI-FI HEADER */}
            <div className="glass-panel p-6 mb-6 relative overflow-hidden group bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 bg-repeat bg-[length:24px_24px]" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-slate-200 dark:border-brand-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <Clock className="text-brand-blue" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Price Requests</h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1">Manage user price requests</p>
                        </div>
                    </div>
                    <div className="bg-amber-500/10 rounded-xl px-4 py-2 border border-amber-500/30">
                        <p className="text-amber-500 text-lg font-black leading-none tracking-tighter">{requests.filter(r => r.status === 'PENDING').length}</p>
                        <p className="text-slate-500 text-[7px] uppercase font-black tracking-widest mt-1">PENDING</p>
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-brand-blue/50 via-teal-500/50 to-transparent" />
            </div>

            {/* SEARCH & FILTERS */}
            <div className="glass-panel p-4 mb-6 space-y-4 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/10">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search train or user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full glass-panel pl-11 pr-4 py-3 text-xs font-black text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-white/10 focus:border-brand-blue/50 transition-all placeholder:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full glass-panel px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none border border-slate-200 dark:border-white/10 focus:border-brand-blue/50 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white"
                >
                    <option value="ALL">All Requests</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="UPDATED">Updated</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="EXPIRED">Expired</option>
                </select>
            </div>

            {/* REQUEST LIST */}
            <div className="space-y-4">
                {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                    <div key={req.id} className="glass-panel p-5 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className={`absolute top-0 left-0 w-1 h-full ${req.status === 'PENDING' ? 'bg-amber-500' : req.status === 'UPDATED' ? 'bg-emerald-500' : 'bg-slate-500'} opacity-50`} />
                        
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center">
                                <User className="text-brand-blue" size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{req.user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock size={10} className="text-slate-600" />
                                    <p className="text-[9px] font-bold text-slate-600 font-mono">{new Date(req.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest
                                ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                  req.status === 'UPDATED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                  'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                {req.status}
                            </div>
                        </div>

                        <div className="glass-panel p-4 mb-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-white/5">
                            <div className="flex items-start justify-between mb-2">
                                <p className="text-[12px] font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{req.trainName}</p>
                                <span className="text-[10px] font-mono font-black text-brand-blue">#{req.trainNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin size={10} className="text-slate-500" />
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    {req.source} → {req.destination}
                                </p>
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 text-[8px] font-black rounded uppercase tracking-tighter border border-slate-200 dark:border-white/10">{req.class}</span>
                            </div>
                            
                            <div className="h-px bg-white/5 w-full my-3" />
                            
                            <div className="flex items-center justify-between">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Suggested Price</p>
                                <p className="text-lg font-black text-emerald-400 font-mono">
                                    {req.suggestedPrice ? `₹${req.suggestedPrice}` : 'PENDING'}
                                </p>
                            </div>
                        </div>

                        {editingId === req.id ? (
                            <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 mb-1.5 block uppercase tracking-[0.2em]">Set New Price (₹)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full glass-panel px-4 py-3 text-sm font-black text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-white/10 focus:border-brand-blue/50 transition-all font-mono placeholder:text-slate-300 bg-slate-50 dark:bg-slate-900/50"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 mb-1.5 block uppercase tracking-[0.2em]">Admin Note</label>
                                    <input
                                        type="text"
                                        value={editComment}
                                        onChange={(e) => setEditComment(e.target.value)}
                                        placeholder="Add a note for the user..."
                                        className="w-full glass-panel px-4 py-3 text-[10px] font-black text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-white/10 focus:border-brand-blue/50 transition-all placeholder:text-slate-300 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdatePrice(req.id)}
                                        disabled={isSaving}
                                        className="flex-1 bg-brand-blue text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        SAVE PRICE
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="px-6 glass-panel text-slate-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        ) : (
                            (req.status === 'PENDING' || req.status === 'UPDATED') && (
                                <button
                                    onClick={() => {
                                        setEditingId(req.id);
                                        setEditPrice(req.suggestedPrice?.toString() || '');
                                        setEditComment(req.adminComment || '');
                                    }}
                                    className="w-full py-4 border border-brand-blue/20 text-brand-blue/70 hover:text-brand-blue rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-brand-blue/5"
                                >
                                    {req.suggestedPrice ? 'EDIT PRICE' : 'SET PRICE'}
                                </button>
                            )
                        )}
                        
                        {req.adminComment && editingId !== req.id && (
                            <div className="mt-4 flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                <Info size={14} className="text-brand-blue shrink-0 mt-0.5" />
                                <p className="text-[10px] text-slate-500 italic font-medium leading-relaxed">"{req.adminComment}"</p>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="py-20 glass-panel text-center">
                        <Search size={32} className="mx-auto mb-3 text-slate-400 opacity-30" />
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">No price requests found</p>
                    </div>
                )}
            </div>

            {/* TOAST */}
            {toast && (
                <div className={`fixed bottom-6 left-4 right-4 z-[200] p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-bottom-6 backdrop-blur-md shadow-2xl
                    ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/90 border-rose-500/50 text-rose-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                    <span className="font-black uppercase tracking-widest text-[10px] italic">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}
