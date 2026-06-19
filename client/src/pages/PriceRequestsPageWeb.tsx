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
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Vibrant Header Banner */}
            <div className="card relative overflow-hidden group data-[theme=light]:bg-white/90 data-[theme=light]:border-slate-200">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2 data-[theme=light]:text-slate-900">
                        <Clock className="text-indigo-400 data-[theme=light]:text-indigo-500" size={20} />
                        Pricing Pipeline
                    </h2>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2 text-right data-[theme=light]:bg-indigo-100 data-[theme=light]:border-indigo-200">
                        <p className="text-white text-2xl font-black leading-none data-[theme=light]:text-indigo-600">{requests.filter(r => r.status === 'PENDING').length}</p>
                        <p className="text-indigo-200/80 text-[10px] uppercase font-bold tracking-widest mt-1 data-[theme=light]:text-indigo-400">Pending Requests</p>
                    </div>
                </div>
                <p className="text-slate-400 text-sm relative z-10 data-[theme=light]:text-slate-600">
                    Manage and define ticket prices for special routes. Review pending requests and update prices.
                </p>
            </div>

            <div className="card-glow p-6 data-[theme=light]:bg-white/80">
                <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by User, Train Name or Number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 data-[theme=light]:placeholder-slate-400"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-900/50 border border-slate-700/50 text-white px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500/50 transition-all font-medium data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 cursor-pointer"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending Review</option>
                        <option value="UPDATED">Prices Updated</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="EXPIRED">Expired</option>
                    </select>
                </div>

                <div className="space-y-4">
                    {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                        <div key={req.id} className="group relative bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all data-[theme=light]:bg-white data-[theme=light]:border-slate-200 data-[theme=light]:hover:bg-slate-50 data-[theme=light]:hover:border-indigo-300 data-[theme=light]:shadow-sm">
                            <div className="flex flex-col xl:flex-row gap-6">
                                {/* Request Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 data-[theme=light]:bg-indigo-100 data-[theme=light]:border-indigo-200">
                                            <User className="text-indigo-400 data-[theme=light]:text-indigo-600" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-500 uppercase tracking-wider data-[theme=light]:text-slate-400">Requested By</p>
                                            <p className="text-white font-medium data-[theme=light]:text-slate-900">{req.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Train Details</p>
                                            <p className="text-white font-semibold flex items-center gap-2 data-[theme=light]:text-slate-900">
                                                {req.trainName} <span className="text-indigo-400 text-sm data-[theme=light]:text-indigo-600">({req.trainNumber})</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Route & Class</p>
                                            <p className="text-white font-semibold flex items-center gap-2 data-[theme=light]:text-slate-900">
                                                <MapPin size={14} className="text-slate-400" />
                                                {req.source} → {req.destination}
                                                <span className="ml-2 px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-md border border-slate-700 data-[theme=light]:bg-slate-200 data-[theme=light]:text-slate-700 data-[theme=light]:border-slate-300">{req.class}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 data-[theme=light]:text-slate-500">
                                        <Clock size={14} />
                                        Requested on {new Date(req.createdAt).toLocaleString()}
                                    </div>
                                </div>

                                {/* Status & Price Control */}
                                <div className="w-full xl:w-72 flex-shrink-0 space-y-4">
                                    <div>
                                        <p className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2 data-[theme=light]:text-slate-400">Current Status</p>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 data-[theme=light]:bg-amber-100 data-[theme=light]:border-amber-200 data-[theme=light]:text-amber-600' :
                                            req.status === 'UPDATED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 data-[theme=light]:bg-emerald-100 data-[theme=light]:border-emerald-200 data-[theme=light]:text-emerald-600' :
                                                'bg-slate-500/10 text-slate-400 border-slate-500/20 data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-200 data-[theme=light]:text-slate-500'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    {editingId === req.id ? (
                                        <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-700/40 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                                            <div>
                                                <label className="text-xs font-black text-slate-400 mb-1.5 block uppercase tracking-wider data-[theme=light]:text-slate-600">Provide Final Price (₹)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                                                    <input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={(e) => setEditPrice(e.target.value)}
                                                        placeholder="e.g. 1500"
                                                        className="w-full bg-slate-800 border border-slate-600 text-white pl-8 pr-4 py-2.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono placeholder:text-slate-500 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-slate-400 mb-1.5 block uppercase tracking-wider data-[theme=light]:text-slate-600">Admin Note (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={editComment}
                                                    onChange={(e) => setEditComment(e.target.value)}
                                                    placeholder="e.g. High demand route, base price applied"
                                                    className="w-full bg-slate-800 border border-slate-600 text-white px-4 py-2.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm placeholder:text-slate-500 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => handleUpdatePrice(req.id)}
                                                    disabled={isSaving}
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 data-[theme=light]:bg-indigo-500 data-[theme=light]:hover:bg-indigo-600"
                                                >
                                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    SAVE PRICE
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg font-bold text-sm transition-colors data-[theme=light]:bg-slate-200 data-[theme=light]:text-slate-700 data-[theme=light]:hover:bg-slate-300"
                                                >
                                                    CANCEL
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/30 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-black tracking-wider mb-1">Final Price Set</p>
                                                    <p className="text-2xl font-mono text-emerald-400 font-bold data-[theme=light]:text-emerald-600">
                                                        {req.suggestedPrice ? `₹${req.suggestedPrice}` : 'N/A'}
                                                    </p>
                                                </div>
                                                {req.adminComment && (
                                                    <div className="max-w-[50%] bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex items-start gap-2 data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300">
                                                        <Info size={14} className="text-indigo-400 mt-0.5 shrink-0 data-[theme=light]:text-indigo-500" />
                                                        <p className="text-xs text-slate-300 italic data-[theme=light]:text-slate-600">"{req.adminComment}"</p>
                                                    </div>
                                                )}
                                            </div>
                                            {(req.status === 'PENDING' || req.status === 'UPDATED') && (
                                                <button
                                                    onClick={() => {
                                                        setEditingId(req.id);
                                                        setEditPrice(req.suggestedPrice?.toString() || '');
                                                        setEditComment(req.adminComment || '');
                                                    }}
                                                    className="mt-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors data-[theme=light]:text-indigo-600 data-[theme=light]:hover:text-indigo-700"
                                                >
                                                    {req.suggestedPrice ? 'Revise Price' : 'Define Price'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center bg-slate-800/20 rounded-2xl border border-slate-700/30 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                            <div className="flex flex-col items-center justify-center opacity-70">
                                <Search size={48} className="mb-4 text-slate-500 data-[theme=light]:text-slate-400" />
                                <p className="text-slate-400 font-medium data-[theme=light]:text-slate-500">No price requests found matching your filters.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300
                    ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300' : 'bg-rose-950 border-rose-500/40 text-rose-300'}`}>
                    <span>{toast.type === 'success' ? '✓' : '✕'}</span>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
