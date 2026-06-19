import { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, Plus, Trash2, ExternalLink, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { InteractiveCard } from '../components/InteractiveCard';

export default function ManagePromotions() {
    const [promotions, setPromotions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    const fetchPromotions = async () => {
        try {
            const { data } = await axios.get('/api/promotions/admin');
            if (data.success && data.promotions) {
                setPromotions(data.promotions);
            }
        } catch (err) {
            console.error('Failed to load promotions', err);
            setMessage({ type: 'error', text: 'Failed to load promotions.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('linkUrl', linkUrl);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const { data } = await axios.post('/api/promotions/admin', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                setMessage({ type: 'success', text: 'Promotion banner created successfully!' });
                setTitle('');
                setDescription('');
                setLinkUrl('');
                setImageFile(null);
                const fileInput = document.getElementById('promo-image-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                fetchPromotions();
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create promotion.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { data } = await axios.patch(`/api/promotions/admin/${id}`, {
                isActive: !currentStatus
            });
            if (data.success) {
                setPromotions(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
            }
        } catch (err) {
            console.error('Failed to toggle active status', err);
            setMessage({ type: 'error', text: 'Failed to update promotion status.' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promotion banner?')) return;
        try {
            const { data } = await axios.delete(`/api/promotions/admin/${id}`);
            if (data.success) {
                setPromotions(prev => prev.filter(p => p.id !== id));
                setMessage({ type: 'success', text: 'Promotion banner successfully deleted!' });
            }
        } catch (err) {
            console.error('Failed to delete promotion', err);
            setMessage({ type: 'error', text: 'Failed to delete promotion.' });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="animate-spin text-brand-blue" size={40} />
                <p className="text-slate-400 font-medium">Loading campaigns...</p>
            </div>
        );
    }

    const apiBase = axios.defaults.baseURL || 'http://localhost:5000';

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 text-left">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-deep p-8 border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-brand-blue/10 rounded-2xl border border-brand-blue/20">
                        <Megaphone className="text-brand-blue" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic font-headline">Manage Campaigns</h1>
                        <p className="text-slate-400 mt-1 font-medium">Create and publish promotional banners across the app.</p>
                    </div>
                </div>
            </header>

            {message.text && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in zoom-in duration-300 ${
                    message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="font-semibold text-sm">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-6">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Plus size={20} className="text-brand-blue" />
                            Create New Banner
                        </h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue transition-colors font-medium"
                                    placeholder="e.g. Flight Booking Live!"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Description / Promo Text</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue transition-colors font-medium"
                                    placeholder="Describe the offer or service..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Redirect Route or Link</label>
                                <input
                                    type="text"
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue transition-colors font-medium"
                                    placeholder="e.g. /flight-booking or https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Banner Image</label>
                                <input
                                    id="promo-image-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-blue/20 file:text-brand-blue hover:file:bg-brand-blue/30 file:cursor-pointer"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Publish Campaign
                            </button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-black text-white">Active & Past Campaigns</h3>
                        <span className="text-xs text-slate-400 font-bold">{promotions.length} Campaigns</span>
                    </div>

                    {promotions.length === 0 ? (
                        <div className="bg-slate-900/20 border border-dashed border-white/5 rounded-3xl p-12 text-center text-slate-500">
                            <Megaphone className="mx-auto mb-4 opacity-20" size={48} />
                            <p className="font-semibold text-sm">No promotion banners have been created yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {promotions.map(promo => {
                                const finalImageUrl = promo.imageUrl 
                                    ? (promo.imageUrl.startsWith('http') ? promo.imageUrl : `${apiBase}${promo.imageUrl}`) 
                                    : null;

                                return (
                                    <InteractiveCard key={promo.id} className="p-4 bg-slate-900/40 border border-white/5 flex gap-4 items-center">
                                        {finalImageUrl && (
                                            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-950">
                                                <img src={finalImageUrl} alt={promo.title} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-2.5">
                                                <h4 className="text-base font-bold text-white truncate">{promo.title}</h4>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                    promo.isActive 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                    : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                                                }`}>
                                                    {promo.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{promo.description}</p>
                                            {promo.linkUrl && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-brand-blue mt-2 font-bold uppercase tracking-wider">
                                                    Redirects to: {promo.linkUrl}
                                                    <ExternalLink size={10} />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <button 
                                                onClick={() => handleToggleActive(promo.id, promo.isActive)}
                                                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${promo.isActive ? 'bg-brand-blue' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${promo.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>

                                            <button 
                                                onClick={() => handleDelete(promo.id)}
                                                className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-xl transition-all"
                                                title="Delete Campaign"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </InteractiveCard>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
