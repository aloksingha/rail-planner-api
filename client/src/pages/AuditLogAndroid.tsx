import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, History, User, Activity, Calendar, Info, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuditLog {
    id: string;
    action: string;
    details: string | null;
    timestamp: string;
    performedByUser: {
        email: string;
        name: string | null;
    };
    targetUser: {
        email: string;
        name: string | null;
    } | null;
}

export default function AuditLogAndroid() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`/api/admin/audit-logs?page=${page}&limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        if (action.includes('UPDATE') || action.includes('CHANGE')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        if (action.includes('CREATE') || action.includes('ASSIGN')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        return 'text-brand-blue bg-brand-blue/10 border-brand-blue/20';
    };

    const filteredLogs = logs.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.performedByUser.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="font-body-md text-slate-900 dark:text-white selection:bg-brand-blue/30 min-h-[100dvh] pb-32 bg-slate-50 dark:bg-slate-950">
            <style>
                {`
                .glass-panel {
                    background: rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }
                .dark .glass-panel {
                    background: rgba(13, 19, 34, 0.4);
                    border-top: 1px solid rgba(137, 206, 255, 0.1);
                }
                .glow-border {
                    box-shadow: inset 0 0 10px rgba(137, 206, 255, 0.1), 0 0 20px rgba(137, 206, 255, 0.05);
                    border: 1px solid rgba(137, 206, 255, 0.2);
                }
                .scanline {
                    background: linear-gradient(to bottom, transparent 50%, rgba(137, 206, 255, 0.03) 50%);
                    background-size: 100% 4px;
                }
                `}
            </style>

            <main className="pt-6 px-6 space-y-8 relative z-10 w-full max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-xl glass-panel glow-border flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 transition-transform"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-headline-lg text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">Audit Logs</h1>
                        <p className="font-body-md text-[10px] text-slate-500 dark:text-slate-400 opacity-70 tracking-widest uppercase">System Activity Matrix</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl glass-panel glow-border flex items-center justify-center text-brand-blue">
                        <History size={20} />
                    </div>
                </div>

                {/* Search Bar */}
                <div className="glass-panel glow-border rounded-2xl p-2 flex items-center gap-3 bg-white dark:bg-slate-900/50">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="SEARCH ACTIVITY MATRIX..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none font-label-sm text-xs tracking-wider text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                    <div className="px-3 py-1 rounded-lg bg-brand-blue/10 border border-brand-blue/20">
                        <Filter size={14} className="text-brand-blue" />
                    </div>
                </div>

                {/* Log List */}
                <div className="space-y-4">
                    {loading && page === 1 ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(14,165,233,0.4)]"></div>
                            <span className="font-label-sm text-[10px] text-brand-blue animate-pulse tracking-[0.3em] uppercase font-black">Syncing Flux...</span>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="glass-panel glow-border rounded-3xl p-10 text-center space-y-4 bg-white dark:bg-slate-900/40">
                            <Activity size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
                            <p className="font-label-sm text-xs text-slate-500 dark:text-slate-500 tracking-widest uppercase italic">No Activity Records Found in Current Sector</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <div key={log.id} className="glass-panel glow-border rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 group active:scale-[0.98] transition-transform">
                                <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
                                <div className="p-4 space-y-4 relative z-10">
                                    {/* Action & Time */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className={`px-3 py-1 rounded-full border text-[9px] font-black tracking-[0.15em] uppercase ${getActionColor(log.action)}`}>
                                            {log.action.replace(/_/g, ' ')}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                            <Calendar size={12} />
                                            <span className="font-label-sm text-[9px] uppercase tracking-tighter">
                                                {new Date(log.timestamp).toLocaleString(undefined, { 
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 shrink-0">
                                            <Info size={16} />
                                        </div>
                                        <p className="text-sm font-body-md text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                            {log.details || 'No additional telemetry data available for this operation.'}
                                        </p>
                                    </div>

                                    {/* Performed By */}
                                    <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                                                <User size={12} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Operator</span>
                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{log.performedByUser.name || log.performedByUser.email}</span>
                                            </div>
                                        </div>

                                        {log.targetUser && (
                                            <div className="flex items-center gap-2 text-right">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subject</span>
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{log.targetUser.name || log.targetUser.email}</span>
                                                </div>
                                                <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                    <User size={12} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {total > 20 && (
                    <div className="flex items-center justify-center gap-4">
                        <button 
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                            className="px-6 py-2 rounded-xl glass-panel glow-border font-black text-[10px] tracking-widest uppercase text-slate-500 dark:text-slate-400 disabled:opacity-20 active:scale-95 transition-transform"
                        >
                            PREV SECTOR
                        </button>
                        <span className="font-label-sm text-xs font-black text-brand-blue uppercase tabular-nums tracking-widest">
                            {page} / {Math.ceil(total / 20)}
                        </span>
                        <button 
                            disabled={page * 20 >= total || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="px-6 py-2 rounded-xl glass-panel glow-border font-black text-[10px] tracking-widest uppercase text-slate-500 dark:text-slate-400 disabled:opacity-20 active:scale-95 transition-transform"
                        >
                            NEXT SECTOR
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
