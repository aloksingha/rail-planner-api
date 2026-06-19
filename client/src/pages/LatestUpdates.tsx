import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { Zap, Save, RefreshCw, AlertCircle, Trash2, Edit3, Plus, History, ShieldAlert } from 'lucide-react';


interface NewsItem {
    id: string;
    title: string;
    content: string;
    badge: string;
    version: string;
    updatedAt: any;
}

export default function LatestUpdates() {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [badge, setBadge] = useState('Available Now');
    const [version, setVersion] = useState('2.4.0');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newsList, setNewsList] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const user = (() => {
            try {
                return JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
            } catch {
                return {};
            }
        })();
        const activeRole = user?.role || null;
        setUserRole(activeRole);

        if (activeRole !== 'SUPER_ADMIN') {
            console.warn('[LatestUpdates] Access Denied for role:', activeRole);
            const redirectTimer = setTimeout(() => navigate('/'), 2000);
            return () => clearTimeout(redirectTimer);
        }

        const q = query(collection(db, 'platform_updates'), orderBy('updatedAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as NewsItem[];
            setNewsList(items);
            setLoading(false);
        });
        return () => unsub();
    }, [navigate]);


    const resetForm = () => {
        setTitle('');
        setContent('');
        setBadge('Available Now');
        setVersion('2.4.0');
        setEditingId(null);
    };

    const handleEdit = (item: NewsItem) => {
        setTitle(item.title);
        setContent(item.content);
        setBadge(item.badge);
        setVersion(item.version);
        setEditingId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this update? This will remove it from all dashboards.')) return;
        try {
            await deleteDoc(doc(db, 'platform_updates', id));
            setMessage({ type: 'success', text: 'Update deleted successfully.' });
        } catch (err) {
            console.error("Error deleting update:", err);
            setMessage({ type: 'error', text: 'Failed to delete update. Check permissions.' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                title,
                content,
                badge,
                version,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, 'platform_updates', editingId), payload);
                setMessage({ type: 'success', text: 'Update modified successfully!' });
            } else {
                await addDoc(collection(db, 'platform_updates'), payload);
                setMessage({ type: 'success', text: 'New platform update published!' });
            }
            resetForm();
        } catch (err) {
            console.error("Error saving updates:", err);
            setMessage({ type: 'error', text: 'Failed to publish updates. Check permissions.' });
        } finally {
            setSaving(false);
        }
    };

    if (userRole && userRole !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 text-center animate-in zoom-in duration-300">
                <div className="p-6 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20 shadow-2xl shadow-rose-500/10">
                    <ShieldAlert size={64} className="animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Access Denied</h2>
                    <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
                        This section is restricted to Platform Administrators. You are being redirected...
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <RefreshCw className="animate-spin text-brand-blue" size={32} />
                <p className="text-slate-500 font-bold uppercase tracking-widest">Loading Feed...</p>
            </div>
        );
    }


    return (
        <div className="animate-in fade-in duration-500 space-y-12 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Platform News Center</h2>
                    <div className="h-1 w-20 bg-brand-orange rounded-full" />
                    <p className="text-slate-500 text-sm font-medium mt-2">Manage the announcements visible across all Tickets Pro dashboards.</p>
                </div>
                {editingId && (
                    <button 
                        onClick={resetForm}
                        className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all font-bold text-sm"
                    >
                        <Plus size={18} />
                        CREATE NEW UPDATE
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Editor Section */}
                <div className="card-glow border-l-4 border-l-brand-orange flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-brand-orange/20 text-brand-orange rounded-lg">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
                            {editingId ? `Editing: ${editingId}` : 'Publish New Update'}
                        </h3>
                    </div>
                    
                    <form onSubmit={handleSave} className="space-y-6 flex-1">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Headline / Title</label>
                            <input 
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="input-field"
                                placeholder="e.g. New Corridor: North Bengal Express"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Content Description</label>
                            <textarea 
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="input-field min-h-[140px]"
                                rows={5}
                                placeholder="Write the update details here..."
                                required
                                style={{ resize: 'none' }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Status Badge</label>
                                <input 
                                    type="text"
                                    value={badge}
                                    onChange={e => setBadge(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g. Available Now"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Version String</label>
                                <input 
                                    type="text"
                                    value={version}
                                    onChange={e => setVersion(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g. 2.4.0"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                <AlertCircle size={18} />
                                <span className="text-xs font-bold">{message.text}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={saving}
                            className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-brand-orange/20 from-brand-orange to-orange-600 hover:from-orange-500 hover:to-brand-orange mt-auto"
                        >
                            {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                            <span className="text-sm font-black uppercase tracking-widest">{saving ? 'Processing...' : editingId ? 'UPDATE ANNOUNCEMENT' : 'PUBLISH TO PLATFORM'}</span>
                        </button>
                    </form>
                </div>

                {/* Preview Section */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-6 px-1">
                        <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.25em]">Real-time Live Preview</h3>
                    </div>
                    
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950/40 border border-white/5 p-12 group transition-all hover:bg-slate-900/60 shadow-2xl flex-1 flex flex-col justify-center">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Zap size={100} className="text-brand-orange group-hover:rotate-12 transition-transform duration-1000" />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="p-2 bg-brand-orange/20 text-brand-orange rounded-lg">
                                <Zap size={20} />
                            </div>
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Platform Broadcast</h4>
                        </div>
                        
                        <h3 className="text-white font-black text-4xl mb-6 tracking-tight relative z-10 leading-tight">{title || 'Your Update Title'}</h3>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-xl font-medium relative z-10">
                            {content || 'This description will appear instantly in a modal popup for all active Admin and Sales Manager users.'}
                        </p>
                        
                        <div className="mt-10 flex items-center gap-5 relative z-10">
                            <div className="flex items-center gap-3 text-[11px] font-black text-brand-orange uppercase tracking-widest bg-brand-orange/10 px-5 py-2.5 rounded-2xl border border-brand-orange/20">
                                {badge || 'STATUS'}
                            </div>
                            <span className="text-slate-600 text-[11px] font-black uppercase tracking-[0.2em]">VERSION {version || 'X.X.X'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 px-1">
                    <div className="p-2 bg-white/5 text-slate-400 rounded-lg">
                        <History size={20} />
                    </div>
                    <h3 className="text-[13px] font-black text-white uppercase tracking-[0.2em]">Update Management History</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {newsList.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-white/5 rounded-3xl text-center">
                            <p className="text-slate-500 font-bold text-sm">No updates published yet.</p>
                        </div>
                    ) : newsList.map((item) => (
                        <div 
                            key={item.id}
                            className={`group p-6 rounded-3xl bg-slate-900/40 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6
                                ${editingId === item.id ? 'border-brand-orange/50 bg-brand-orange/5' : 'border-white/5 hover:bg-slate-900/80 hover:border-white/10 shadow-lg'}
                            `}
                        >
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest px-2 py-0.5 rounded bg-brand-orange/10">v{item.version}</span>
                                    <h4 className="text-white font-bold text-lg tracking-tight">{item.title}</h4>
                                </div>
                                <p className="text-slate-500 text-sm line-clamp-1 max-w-2xl">{item.content}</p>
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                    Last Updated: {item.updatedAt?.toDate().toLocaleString() || 'Just now'}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button 
                                    onClick={() => handleEdit(item)}
                                    className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:bg-brand-blue/20 hover:text-brand-blue transition-all"
                                    title="Edit Update"
                                >
                                    <Edit3 size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 transition-all"
                                    title="Delete Update"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
