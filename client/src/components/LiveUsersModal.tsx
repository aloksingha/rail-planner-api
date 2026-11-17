import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
    X, Users, Globe, Smartphone, RefreshCw, Search, Clock, 
    Shield, Ticket, Wallet, Activity, ArrowRight, ExternalLink,
    Radio, CheckCircle2, AlertCircle, ChevronRight, Eye
} from 'lucide-react';
import UserActivityModal from './UserActivityModal';

interface LiveUser {
    id: string;
    name: string | null;
    email: string;
    mobile: string | null;
    role: string;
    status: string;
    walletBalance: number;
    isOnlineNow: boolean;
    platform: 'WEB' | 'APP';
    lastLoginAt: string | null;
    lastActiveAt: string | null;
    latestAction: string;
    latestActionTime: string;
}

interface LiveTelemetry {
    activeNow: { total: number; web: number; app: number };
    todayLogins: { total: number; web: number; app: number };
    todayBookings: { total: number; web: number; app: number };
}

interface LiveUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FilterTab = 'ALL' | 'ONLINE_NOW' | 'WEB' | 'APP';

export default function LiveUsersModal({ isOpen, onClose }: LiveUsersModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<LiveUser[]>([]);
    const [telemetry, setTelemetry] = useState<LiveTelemetry>({
        activeNow: { total: 0, web: 0, app: 0 },
        todayLogins: { total: 0, web: 0, app: 0 },
        todayBookings: { total: 0, web: 0, app: 0 }
    });
    const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserForHistory, setSelectedUserForHistory] = useState<LiveUser | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const fetchLiveUsers = async (showLoadingState = false) => {
        if (showLoadingState) setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get('/api/admin/live-users');
            if (data.success) {
                setUsers(data.users || []);
                if (data.telemetry) {
                    setTelemetry(data.telemetry);
                }
                setLastRefreshed(new Date());
            } else {
                setError(data.error || 'Failed to fetch live users');
            }
        } catch (err: any) {
            console.error('Failed to load live users:', err);
            setError(err.response?.data?.error || 'Unable to retrieve real-time user activity.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh every 12 seconds while modal is open
    useEffect(() => {
        if (isOpen) {
            fetchLiveUsers(true);
            const interval = setInterval(() => {
                fetchLiveUsers(false);
            }, 12000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return users.filter(u => {
            // Tab filter
            if (activeTab === 'ONLINE_NOW' && !u.isOnlineNow) return false;
            if (activeTab === 'WEB' && u.platform !== 'WEB') return false;
            if (activeTab === 'APP' && u.platform !== 'APP') return false;

            // Search filter
            if (term) {
                const hay = `${u.name || ''} ${u.email} ${u.role} ${u.platform} ${u.latestAction}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            return true;
        });
    }, [users, activeTab, searchTerm]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                <div 
                    className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-purple-500/30 shadow-2xl overflow-hidden text-slate-100"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-sky-600/30 border border-purple-500/40 text-purple-400 shrink-0 shadow-inner">
                                    <Radio size={22} className="animate-pulse text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                                            Live User Activity & Telemetry
                                        </h2>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                            Live Pulse
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Real-time tracking of active online sessions, Web vs App breakdowns, and post-login activities
                                    </p>
                                </div>
                            </div>

                            {/* Top Right Controls */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button 
                                    onClick={() => fetchLiveUsers(true)}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all disabled:opacity-50"
                                    title="Refresh Live Users"
                                >
                                    <RefreshCw size={13} className={loading ? 'animate-spin text-brand-blue' : ''} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Telemetry Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                            {/* Card 1: Online Now */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900 border border-emerald-500/30 shadow-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Active Online Now
                                    </span>
                                    <span className="text-xs font-mono text-slate-500">Last 15m</span>
                                </div>
                                <div className="flex items-baseline gap-2 mt-1.5">
                                    <span className="text-2xl font-black text-white">{telemetry.activeNow.total}</span>
                                    <span className="text-[11px] text-slate-400 font-bold">Agents / Users</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-[11px] font-bold">
                                    <span className="inline-flex items-center gap-1 text-sky-400">
                                        <Globe size={11} /> {telemetry.activeNow.web} Web
                                    </span>
                                    <span className="text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1 text-purple-400">
                                        <Smartphone size={11} /> {telemetry.activeNow.app} App
                                    </span>
                                </div>
                            </div>

                            {/* Card 2: Today's Logins */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-slate-900 border border-purple-500/30 shadow-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                        <Clock size={11} />
                                        Today's Logged-in Users
                                    </span>
                                    <span className="text-xs font-mono text-slate-500">Since 00:00</span>
                                </div>
                                <div className="flex items-baseline gap-2 mt-1.5">
                                    <span className="text-2xl font-black text-white">{telemetry.todayLogins.total}</span>
                                    <span className="text-[11px] text-slate-400 font-bold">Logged in today</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-[11px] font-bold">
                                    <span className="inline-flex items-center gap-1 text-sky-400">
                                        <Globe size={11} /> {telemetry.todayLogins.web} Web
                                    </span>
                                    <span className="text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1 text-purple-400">
                                        <Smartphone size={11} /> {telemetry.todayLogins.app} App
                                    </span>
                                </div>
                            </div>

                            {/* Card 3: Today's Bookings */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-950/40 via-slate-900/60 to-slate-900 border border-sky-500/30 shadow-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                                        <Ticket size={11} />
                                        Today's Live Bookings
                                    </span>
                                    <span className="text-xs font-mono text-slate-500">Live Volume</span>
                                </div>
                                <div className="flex items-baseline gap-2 mt-1.5">
                                    <span className="text-2xl font-black text-white">{telemetry.todayBookings.total}</span>
                                    <span className="text-[11px] text-slate-400 font-bold">Bookings created</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-[11px] font-bold">
                                    <span className="inline-flex items-center gap-1 text-sky-400">
                                        <Globe size={11} /> {telemetry.todayBookings.web} Web
                                    </span>
                                    <span className="text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1 text-purple-400">
                                        <Smartphone size={11} /> {telemetry.todayBookings.app} App
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Search and Tabs */}
                        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                                <button
                                    onClick={() => setActiveTab('ALL')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'ALL'
                                            ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/30'
                                            : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    All Active ({users.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('ONLINE_NOW')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'ONLINE_NOW'
                                            ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/30'
                                            : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Online Now ({users.filter(u => u.isOnlineNow).length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('WEB')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'WEB'
                                            ? 'bg-sky-600 text-white font-black shadow-md shadow-sky-600/30'
                                            : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    <Globe size={11} /> Web ({users.filter(u => u.platform === 'WEB').length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('APP')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === 'APP'
                                            ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/30'
                                            : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    <Smartphone size={11} /> App ({users.filter(u => u.platform === 'APP').length})
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 sm:w-64">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search live users or actions..."
                                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')} 
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Users List Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-mono uppercase tracking-wider text-slate-300">Scanning real-time active sessions...</p>
                            </div>
                        ) : error ? (
                            <div className="py-16 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3">
                                    <AlertCircle size={22} />
                                </div>
                                <p className="text-sm font-bold text-rose-300">{error}</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="py-20 text-center text-slate-500">
                                <Users size={36} className="mx-auto mb-3 text-slate-600" />
                                <p className="text-sm font-bold text-slate-300">No live sessions match criteria</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                    {searchTerm || activeTab !== 'ALL'
                                        ? 'No active users found for selected filters.'
                                        : 'No users have logged in or interacted yet today.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredUsers.map(user => {
                                    const timeDisplay = user.latestActionTime
                                        ? new Date(user.latestActionTime).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })
                                        : 'Active';

                                    return (
                                        <div
                                            key={user.id}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                user.isOnlineNow
                                                    ? 'bg-slate-800/80 border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                                                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                {/* Left: User Identity & Online Pill */}
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="relative">
                                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-base font-black text-white shrink-0 shadow-inner">
                                                            {(user.name || user.email || '?')[0].toUpperCase()}
                                                        </div>
                                                        {user.isOnlineNow && (
                                                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-black text-white truncate tracking-tight">
                                                                {user.name || 'Anonymous User'}
                                                            </p>
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/30">
                                                                {user.role}
                                                            </span>

                                                            {/* Online Now vs Recent */}
                                                            {user.isOnlineNow ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                                    Online Now
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                                                    <Clock size={10} /> Active today
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-slate-400">
                                                            <span className="font-mono text-slate-300 font-medium truncate">{user.email}</span>
                                                            {user.mobile && (
                                                                <span className="font-mono text-slate-400">{user.mobile}</span>
                                                            )}
                                                            <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">
                                                                ₹{user.walletBalance.toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Platform Badge & Action Button */}
                                                <div className="flex items-center gap-2.5 sm:ml-auto shrink-0">
                                                    {/* Platform Pill */}
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider font-mono border ${
                                                        user.platform === 'APP'
                                                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                                            : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                                                    }`}>
                                                        {user.platform === 'APP' ? <Smartphone size={12} /> : <Globe size={12} />}
                                                        {user.platform === 'APP' ? 'ANDROID APP' : 'WEB PORTAL'}
                                                    </span>

                                                    {/* View Date-wise Activity Button */}
                                                    <button
                                                        onClick={() => setSelectedUserForHistory(user)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-brand-blue border border-slate-600 hover:border-brand-blue text-white text-xs font-bold transition-all shadow-sm"
                                                        title="Open complete date-wise activity history"
                                                    >
                                                        <Eye size={12} />
                                                        <span>View History</span>
                                                        <ChevronRight size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Bottom: What the user is doing post-login */}
                                            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 shrink-0">
                                                        Latest Activity:
                                                    </span>
                                                    <p className="text-slate-300 font-medium truncate">
                                                        {user.latestAction}
                                                    </p>
                                                </div>
                                                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                                                    <Clock size={10} />
                                                    {timeDisplay}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Status Bar */}
                    <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Real-Time Monitoring
                            </span>
                            <span className="text-slate-600">|</span>
                            <span>Auto-refreshing every 12s</span>
                            <span className="text-slate-600">|</span>
                            <span>Last sync: {lastRefreshed.toLocaleTimeString('en-IN')}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all ml-auto"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Nested User Activity Date-Wise Modal */}
            <UserActivityModal
                isOpen={!!selectedUserForHistory}
                onClose={() => setSelectedUserForHistory(null)}
                userId={selectedUserForHistory?.id || null}
                userEmail={selectedUserForHistory?.email}
                userName={selectedUserForHistory?.name || undefined}
            />
        </>
    );
}
