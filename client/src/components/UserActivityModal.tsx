import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
    X, User, Calendar, Clock, Globe, Smartphone, Shield, Ticket, Wallet, 
    FileText, CheckCircle2, AlertCircle, RefreshCw, Search, ChevronRight,
    ArrowUpRight, ArrowDownLeft, Filter, Copy, Check, ExternalLink, Activity
} from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'LOGIN' | 'BOOKING' | 'WALLET' | 'PRICE_REQUEST' | 'WITHDRAWAL' | 'PAYMENT' | 'AUDIT';
    platform: 'WEB' | 'APP' | null;
    title: string;
    description: string;
    timestamp: string;
    status?: string;
    amount?: number;
    metadata?: any;
}

interface TimelineDay {
    dateKey: string;
    dateFormatted: string;
    isToday: boolean;
    items: ActivityItem[];
}

interface ActivitySummary {
    totalEvents: number;
    loginCount: number;
    bookingCount: number;
    walletCount: number;
    priceRequestCount: number;
    auditCount: number;
    webEventsCount: number;
    appEventsCount: number;
}

interface UserDetails {
    id: string;
    email: string;
    name?: string | null;
    mobile?: string | null;
    role: string;
    region?: string | null;
    status: string;
    walletBalance: number;
    createdAt: string;
    lastLoginPlatform?: string | null;
    lastLoginAt?: string | null;
}

interface UserActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
    userEmail?: string;
    userName?: string;
}

type TabType = 'ALL' | 'LOGIN' | 'BOOKING' | 'WALLET' | 'PRICE_REQUEST' | 'AUDIT';
type PlatformFilter = 'ALL' | 'WEB' | 'APP';

export default function UserActivityModal({ isOpen, onClose, userId, userEmail, userName }: UserActivityModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [timeline, setTimeline] = useState<TimelineDay[]>([]);
    const [summary, setSummary] = useState<ActivitySummary>({
        totalEvents: 0,
        loginCount: 0,
        bookingCount: 0,
        walletCount: 0,
        priceRequestCount: 0,
        auditCount: 0,
        webEventsCount: 0,
        appEventsCount: 0
    });

    const [activeTab, setActiveTab] = useState<TabType>('ALL');
    const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(false);

    const fetchActivity = async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/api/admin/users/${userId}/activity`);
            if (data.success) {
                setUserDetails(data.user);
                setTimeline(data.timeline || []);
                setSummary(data.summary || {
                    totalEvents: 0,
                    loginCount: 0,
                    bookingCount: 0,
                    walletCount: 0,
                    priceRequestCount: 0,
                    auditCount: 0,
                    webEventsCount: 0,
                    appEventsCount: 0
                });
            } else {
                setError(data.error || 'Failed to load user activity.');
            }
        } catch (err: any) {
            console.error('Failed to fetch user activity:', err);
            setError(err.response?.data?.error || 'Unable to retrieve user activity records.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && userId) {
            setActiveTab('ALL');
            setPlatformFilter('ALL');
            setSearchTerm('');
            fetchActivity();
        }
    }, [isOpen, userId]);

    const handleCopyId = () => {
        if (userId) {
            navigator.clipboard.writeText(userId);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    // Filter timeline based on activeTab, platformFilter, and searchTerm
    const filteredTimeline = useMemo(() => {
        if (!timeline.length) return [];
        const term = searchTerm.trim().toLowerCase();

        return timeline
            .map(day => {
                const matchedItems = day.items.filter(item => {
                    // Tab match
                    if (activeTab !== 'ALL') {
                        if (activeTab === 'LOGIN' && item.type !== 'LOGIN') return false;
                        if (activeTab === 'BOOKING' && item.type !== 'BOOKING') return false;
                        if (activeTab === 'WALLET' && item.type !== 'WALLET' && item.type !== 'WITHDRAWAL' && item.type !== 'PAYMENT') return false;
                        if (activeTab === 'PRICE_REQUEST' && item.type !== 'PRICE_REQUEST') return false;
                        if (activeTab === 'AUDIT' && item.type !== 'AUDIT') return false;
                    }

                    // Platform match
                    if (platformFilter !== 'ALL') {
                        if (item.platform !== platformFilter) return false;
                    }

                    // Search term match
                    if (term) {
                        const hay = `${item.title} ${item.description} ${item.status || ''} ${item.platform || ''}`.toLowerCase();
                        if (!hay.includes(term)) return false;
                    }

                    return true;
                });

                return {
                    ...day,
                    items: matchedItems
                };
            })
            .filter(day => day.items.length > 0);
    }, [timeline, activeTab, platformFilter, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue/30 via-indigo-500/20 to-purple-500/30 border border-brand-blue/40 flex items-center justify-center text-lg font-black text-white shrink-0 shadow-inner">
                                {(userDetails?.name || userName || userEmail || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                                        {userDetails?.name || userName || 'User Activity'}
                                    </h2>
                                    {userDetails?.role && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/30">
                                            {userDetails.role}
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                        userDetails?.status === 'BLOCKED'
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    }`}>
                                        {userDetails?.status || 'ACTIVE'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-slate-400">
                                    <span className="font-mono text-slate-300 font-medium truncate">{userDetails?.email || userEmail}</span>
                                    {userId && (
                                        <button 
                                            onClick={handleCopyId}
                                            className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-white transition-colors bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"
                                            title="Copy User ID"
                                        >
                                            {copiedId ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                            {userId.slice(0, 8)}...
                                        </button>
                                    )}
                                    {userDetails?.walletBalance !== undefined && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                            <Wallet size={11} /> ₹{userDetails.walletBalance.toLocaleString('en-IN')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Right: Platform Badge & Close */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Current / Last Login Platform Badge */}
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                                {userDetails?.lastLoginPlatform === 'APP' ? (
                                    <>
                                        <Smartphone size={14} className="text-purple-400" />
                                        <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider">APP LOGIN</span>
                                    </>
                                ) : (
                                    <>
                                        <Globe size={14} className="text-sky-400" />
                                        <span className="text-[11px] font-black text-sky-300 uppercase tracking-wider">WEB LOGIN</span>
                                    </>
                                )}
                                {userDetails?.lastLoginAt && (
                                    <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 font-mono">
                                        {new Date(userDetails.lastLoginAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </span>
                                )}
                            </div>

                            <button 
                                onClick={fetchActivity}
                                disabled={loading}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                                title="Refresh Activity"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin text-brand-blue' : ''} />
                            </button>

                            <button 
                                onClick={onClose}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all"
                                title="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Secondary Filters & Search Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        {/* Tab Categories */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                            <button
                                onClick={() => setActiveTab('ALL')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'ALL'
                                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30 font-black'
                                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <Activity size={13} />
                                All ({summary.totalEvents})
                            </button>

                            <button
                                onClick={() => setActiveTab('LOGIN')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'LOGIN'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black'
                                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <Clock size={13} />
                                Logins ({summary.loginCount})
                            </button>

                            <button
                                onClick={() => setActiveTab('BOOKING')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'BOOKING'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <Ticket size={13} />
                                Bookings ({summary.bookingCount})
                            </button>

                            <button
                                onClick={() => setActiveTab('WALLET')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'WALLET'
                                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black'
                                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <Wallet size={13} />
                                Wallet ({summary.walletCount})
                            </button>

                            <button
                                onClick={() => setActiveTab('PRICE_REQUEST')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'PRICE_REQUEST'
                                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 font-black'
                                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <FileText size={13} />
                                Enquiries ({summary.priceRequestCount})
                            </button>

                            <button
                                onClick={() => setActiveTab('AUDIT')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === 'AUDIT'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <Shield size={13} />
                                Audits ({summary.auditCount})
                            </button>
                        </div>

                        {/* Right: Platform Switch & Search */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {/* Platform Toggle */}
                            <div className="flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700/80 text-[11px]">
                                <button
                                    onClick={() => setPlatformFilter('ALL')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                        platformFilter === 'ALL'
                                            ? 'bg-slate-700 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setPlatformFilter('WEB')}
                                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                                        platformFilter === 'WEB'
                                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                            : 'text-slate-400 hover:text-sky-300'
                                    }`}
                                >
                                    <Globe size={11} /> Web ({summary.webEventsCount})
                                </button>
                                <button
                                    onClick={() => setPlatformFilter('APP')}
                                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                                        platformFilter === 'APP'
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'text-slate-400 hover:text-purple-300'
                                    }`}
                                >
                                    <Smartphone size={11} /> App ({summary.appEventsCount})
                                </button>
                            </div>

                            {/* Search box */}
                            <div className="relative flex-1 sm:w-48">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Filter events..."
                                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue"
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
                </div>

                {/* Timeline Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <div className="w-10 h-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-mono uppercase tracking-wider text-slate-300">Compiling user chronological events...</p>
                        </div>
                    ) : error ? (
                        <div className="py-16 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3">
                                <AlertCircle size={22} />
                            </div>
                            <p className="text-sm font-bold text-rose-300">{error}</p>
                            <button
                                onClick={fetchActivity}
                                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all"
                            >
                                Retry Query
                            </button>
                        </div>
                    ) : filteredTimeline.length === 0 ? (
                        <div className="py-20 text-center text-slate-500">
                            <Activity size={36} className="mx-auto mb-3 text-slate-600" />
                            <p className="text-sm font-bold text-slate-300">No events found</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                {searchTerm || activeTab !== 'ALL' || platformFilter !== 'ALL'
                                    ? 'No activity matches your current filters. Try resetting the filters or search term.'
                                    : 'This user has not executed any tracked actions or bookings yet.'}
                            </p>
                            {(searchTerm || activeTab !== 'ALL' || platformFilter !== 'ALL') && (
                                <button
                                    onClick={() => {
                                        setActiveTab('ALL');
                                        setPlatformFilter('ALL');
                                        setSearchTerm('');
                                    }}
                                    className="mt-4 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {filteredTimeline.map(day => (
                                <div key={day.dateKey} className="relative">
                                    {/* Date Header Marker */}
                                    <div className="sticky top-0 z-10 py-1.5 bg-slate-900/95 backdrop-blur flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-slate-200 shadow-sm">
                                            <Calendar size={13} className="text-brand-blue" />
                                            <span>{day.dateFormatted}</span>
                                            {day.isToday && (
                                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider ml-1">
                                                    Today
                                                </span>
                                            )}
                                        </div>
                                        <div className="h-px flex-1 bg-slate-800" />
                                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                                            {day.items.length} {day.items.length === 1 ? 'Action' : 'Actions'}
                                        </span>
                                    </div>

                                    {/* Vertical Timeline Items */}
                                    <div className="mt-3 ml-4 sm:ml-6 pl-4 sm:pl-6 border-l-2 border-slate-800 space-y-4">
                                        {day.items.map(item => {
                                            const itemTime = new Date(item.timestamp).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            });

                                            return (
                                                <div 
                                                    key={item.id}
                                                    className="relative group flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                                                >
                                                    {/* Timeline Node Bullet */}
                                                    <div className={`absolute -left-[25px] sm:-left-[33px] top-4 w-4 h-4 rounded-full border-2 bg-slate-900 flex items-center justify-center ${
                                                        item.type === 'LOGIN' 
                                                            ? (item.platform === 'APP' ? 'border-purple-500 text-purple-400' : 'border-sky-500 text-sky-400')
                                                            : item.type === 'BOOKING'
                                                            ? 'border-emerald-500 text-emerald-400'
                                                            : item.type === 'WALLET' || item.type === 'PAYMENT'
                                                            ? 'border-amber-500 text-amber-400'
                                                            : item.type === 'PRICE_REQUEST'
                                                            ? 'border-sky-500 text-sky-400'
                                                            : 'border-indigo-500 text-indigo-400'
                                                    }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                                            item.type === 'LOGIN'
                                                                ? (item.platform === 'APP' ? 'bg-purple-500' : 'bg-sky-500')
                                                                : item.type === 'BOOKING'
                                                                ? 'bg-emerald-500'
                                                                : item.type === 'WALLET' || item.type === 'PAYMENT'
                                                                ? 'bg-amber-500'
                                                                : item.type === 'PRICE_REQUEST'
                                                                ? 'bg-sky-500'
                                                                : 'bg-indigo-500'
                                                        }`} />
                                                    </div>

                                                    {/* Event Type Icon */}
                                                    <div className={`p-2.5 rounded-xl shrink-0 ${
                                                        item.type === 'LOGIN'
                                                            ? (item.platform === 'APP' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20')
                                                            : item.type === 'BOOKING'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : item.type === 'WALLET' || item.type === 'PAYMENT'
                                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                            : item.type === 'PRICE_REQUEST'
                                                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                    }`}>
                                                        {item.type === 'LOGIN' ? (
                                                            item.platform === 'APP' ? <Smartphone size={16} /> : <Globe size={16} />
                                                        ) : item.type === 'BOOKING' ? (
                                                            <Ticket size={16} />
                                                        ) : item.type === 'WALLET' || item.type === 'PAYMENT' ? (
                                                            <Wallet size={16} />
                                                        ) : item.type === 'PRICE_REQUEST' ? (
                                                            <FileText size={16} />
                                                        ) : (
                                                            <Shield size={16} />
                                                        )}
                                                    </div>

                                                    {/* Event Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h4 className="text-xs sm:text-sm font-black text-white tracking-tight">
                                                                    {item.title}
                                                                </h4>

                                                                {/* Platform Pill */}
                                                                {item.platform && (
                                                                    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ${
                                                                        item.platform === 'APP'
                                                                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                                                                            : 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                                                                    }`}>
                                                                        {item.platform === 'APP' ? <Smartphone size={10} /> : <Globe size={10} />}
                                                                        {item.platform}
                                                                    </span>
                                                                )}

                                                                {/* Status Pill */}
                                                                {item.status && (
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ${
                                                                        ['CONFIRMED', 'SUCCESS', 'COMPLETED', 'CAPTURED', 'UPDATED'].includes(item.status)
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                                            : ['PENDING', 'AUTOMATED_PENDING'].includes(item.status)
                                                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                                                    }`}>
                                                                        {item.status}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Timestamp */}
                                                            <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1 shrink-0">
                                                                <Clock size={11} className="text-slate-500" />
                                                                {itemTime}
                                                            </span>
                                                        </div>

                                                        {/* Description */}
                                                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                            {item.description}
                                                        </p>

                                                        {/* Optional Amount */}
                                                        {item.amount !== undefined && (
                                                            <div className="mt-1.5">
                                                                <span className={`text-xs font-black font-mono ${
                                                                    item.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                                                                }`}>
                                                                    {item.amount > 0 ? `+ ₹${item.amount.toLocaleString('en-IN')}` : `- ₹${Math.abs(item.amount).toLocaleString('en-IN')}`}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Ticket Url Link */}
                                                        {item.metadata?.ticketUrl && (
                                                            <div className="mt-2">
                                                                <a 
                                                                    href={item.metadata.ticketUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-blue hover:underline bg-brand-blue/10 px-2 py-1 rounded border border-brand-blue/20"
                                                                >
                                                                    <ExternalLink size={10} /> View Confirmed Ticket PDF
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Timeline Tracking
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>Showing {filteredTimeline.reduce((acc, d) => acc + d.items.length, 0)} events</span>
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
    );
}
