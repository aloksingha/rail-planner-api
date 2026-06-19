import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Mail, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw, Search, MessageSquare } from 'lucide-react';

interface ContactMsg {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'UNREAD' | 'READ' | 'RESOLVED';
    createdAt: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    UNREAD:   { label: 'Unread',   color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    icon: AlertCircle },
    READ:     { label: 'Read',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: Clock },
    RESOLVED: { label: 'Resolved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2 },
};

export default function ContactInbox() {
    const [messages, setMessages] = useState<ContactMsg[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState({ text: '', type: '' });

    const showToast = (text: string, type: 'success' | 'error') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg({ text: '', type: '' }), 4000);
    };

    const token = () => localStorage.getItem('token');

    const fetchMessages = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get('/api/contact', { headers: { Authorization: `Bearer ${token()}` } });
            setMessages(data.messages);
        } catch {
            showToast('Failed to load messages.', 'error');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    const changeStatus = async (id: string, status: string) => {
        try {
            await axios.patch(`/api/contact/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token()}` } });
            setMessages(prev => prev.map(m => m.id === id ? { ...m, status: status as any } : m));
        } catch { showToast('Failed to update status.', 'error'); }
    };

    const deleteMessage = async (id: string) => {
        if (!confirm('Delete this message?')) return;
        try {
            await axios.delete(`/api/contact/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
            setMessages(prev => prev.filter(m => m.id !== id));
            if (expandedId === id) setExpandedId(null);
            showToast('Message deleted.', 'success');
        } catch { showToast('Failed to delete.', 'error'); }
    };

    const handleExpand = async (msg: ContactMsg) => {
        setExpandedId(expandedId === msg.id ? null : msg.id);
        if (msg.status === 'UNREAD') await changeStatus(msg.id, 'READ');
    };

    const filtered = messages.filter(m => {
        const statusOk = filterStatus === 'ALL' || m.status === filterStatus;
        const searchOk = !search || m.email.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase());
        return statusOk && searchOk;
    });

    const counts = { UNREAD: messages.filter(m => m.status === 'UNREAD').length, READ: messages.filter(m => m.status === 'READ').length, RESOLVED: messages.filter(m => m.status === 'RESOLVED').length };

    return (
        <div className="bg-transparent pb-12 w-full">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-indigo-500/15 rounded-xl border border-indigo-500/20">
                        <Mail size={22} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Contact Inbox</h1>
                        <p className="text-sm text-slate-400">{counts.UNREAD} unread · {messages.length} total messages</p>
                    </div>
                </div>

                {/* Toast */}
                {toastMsg.text && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl border mb-4 text-sm ${toastMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                        {toastMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {toastMsg.text}
                    </div>
                )}

                {/* Status Filter Tabs */}
                <div className="flex gap-2 flex-wrap mb-5">
                    {['ALL', 'UNREAD', 'READ', 'RESOLVED'].map(s => {
                        const active = filterStatus === s;
                        const meta = s !== 'ALL' ? STATUS_META[s] : null;
                        return (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                    active ? (meta ? `${meta.bg} ${meta.color} ${meta.border}` : 'bg-white/10 text-white border-white/20')
                                           : 'bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600'
                                }`}>
                                {s === 'ALL' ? `All (${messages.length})` : `${STATUS_META[s].label} (${counts[s as keyof typeof counts]})`}
                            </button>
                        );
                    })}
                    <div className="relative ml-auto">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-slate-900/60 border border-slate-700/50 rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-44" />
                    </div>
                    <button onClick={fetchMessages} className="p-1.5 bg-slate-900/60 border border-slate-700/50 rounded-full text-slate-400 hover:text-white transition-colors"><RefreshCw size={14} /></button>
                </div>

                {/* Messages */}
                {isLoading ? (
                    <div className="text-center py-16 text-slate-500"><RefreshCw size={22} className="animate-spin mx-auto mb-3" /><p>Loading...</p></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-500"><MessageSquare size={32} className="mx-auto mb-3 opacity-30" /><p>No messages found.</p></div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(msg => {
                            const meta = STATUS_META[msg.status];
                            const StatusIcon = meta.icon;
                            const isExpanded = expandedId === msg.id;
                            return (
                                <div key={msg.id} className={`rounded-xl border transition-all overflow-hidden ${meta.border} ${msg.status === 'UNREAD' ? 'bg-slate-800/60' : 'bg-slate-900/40'}`}>
                                    {/* Row */}
                                    <button className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/5 transition-colors" onClick={() => handleExpand(msg)}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                                            <StatusIcon size={14} className={meta.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${msg.status === 'UNREAD' ? 'text-white' : 'text-slate-300'}`}>{msg.name}</span>
                                                <span className="text-xs text-slate-500">·</span>
                                                <span className="text-xs text-slate-400 truncate">{msg.email}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">{msg.subject}</p>
                                        </div>
                                        <div className="hidden sm:flex flex-col items-end gap-1">
                                            <span className="text-xs text-slate-500">{new Date(msg.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color} ${meta.border}`}>{meta.label}</span>
                                        </div>
                                    </button>

                                    {/* Expanded body */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-1 border-t border-slate-700/50">
                                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/50 rounded-lg p-3 mb-3">{msg.message}</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {['UNREAD', 'READ', 'RESOLVED'].filter(s => s !== msg.status).map(s => (
                                                    <button key={s} onClick={() => changeStatus(msg.id, s)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${STATUS_META[s].bg} ${STATUS_META[s].color} ${STATUS_META[s].border} hover:opacity-80`}>
                                                        Mark as {STATUS_META[s].label}
                                                    </button>
                                                ))}
                                                <button onClick={() => deleteMessage(msg.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 ml-auto transition-colors">
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
