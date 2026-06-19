import { useEffect, useState } from 'react';
import axios from 'axios';
// import removed
import ReportExport from '../components/ReportExport';
import BookingDetailsModal from '../components/BookingDetailsModal';

interface Event {
    name: string;
    date: string;
}

interface Booking {
    id: string;
    status: string;
    createdAt: string;
    ticketUrl?: string;
    event: Event;
    class?: string;
    paymentId?: string | null;
    refundRecords?: Array<{
        status: string;
        amount: number;
        createdAt: string;
    }>;
}

export default function CustomerBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

    // Re-book/Refund states
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'rebook' | 'refund' | null>(null);
    const [rebookDate, setRebookDate] = useState('');
    // Track local "refund under process" state per booking id
    const [refundProcessingIds, setRefundProcessingIds] = useState<Set<string>>(new Set());

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/customer/dashboard');
            setBookings(response.data.bookings || []);
        } catch (error) {
            console.error('Failed to fetch bookings', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    // Refund: mark as "Refund Under Process" locally and call cancel API
    const handleRefund = async (id: string) => {
        try {
            await axios.put(`/api/customer/bookings/${id}/cancel`);
            setRefundProcessingIds(prev => new Set([...prev, id]));
            showToast('Refund Under Process. Credit in 5-7 working days.');
            setActioningId(null);
            setActionType(null);
            fetchBookings(); // Refresh to get real status
        } catch (err: any) {
            if (err.response?.data?.error === 'Already cancelled.') {
                // If already cancelled, we treat it as "Under Process" because the refund record exists
                setRefundProcessingIds(prev => new Set([...prev, id]));
                showToast('Refund Under Process.');
                setActioningId(null);
                setActionType(null);
                fetchBookings();
            } else {
                showToast(err.response?.data?.error || 'Failed to initiate refund.', 'error');
            }
        }
    };

    // Re-book: Payment stays Success, Ticket goes back to Pending
    const handleRebook = async (id: string) => {
        if (!rebookDate) return showToast('Please select a date.', 'error');
        try {
            await axios.put(`/api/customer/bookings/${id}/rebook`, { newDate: rebookDate });
            showToast('Re-booked! Payment Success. Ticket is now Pending admin confirmation.');
            fetchBookings();
            setActioningId(null);
            setActionType(null);
            setRebookDate('');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to re-book.', 'error');
        }
    };

    const getTicketStatus = (b: Booking) => {
        const latestRefund = b.refundRecords?.[0];
        if (latestRefund) {
            if (latestRefund.status === 'COMPLETED' || latestRefund.status === 'MANUAL_RESOLVED') {
                return { label: 'Refunded', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]', icon: <span className="material-symbols-outlined text-[14px]">check_circle</span> };
            }
            return { label: 'Refund Under Process', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]', icon: <span className="material-symbols-outlined text-[14px]">schedule</span> };
        }

        if (refundProcessingIds.has(b.id)) {
            return { label: 'Refund Under Process', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]', icon: <span className="material-symbols-outlined text-[14px]">schedule</span> };
        }

        if (b.status === 'CANCELLED') return { label: 'Booking Cancelled', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]', icon: <span className="material-symbols-outlined text-[14px]">warning</span> };
        if (b.status === 'SUCCESS' || b.ticketUrl) return { label: 'Ticket Issued', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]', icon: <span className="material-symbols-outlined text-[14px]">check_circle</span> };
        return { label: 'Booking Pending', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]', icon: <span className="material-symbols-outlined text-[14px]">schedule</span> };
    };

    if (loading && bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <span className="material-symbols-outlined text-brand-blue/50 text-5xl animate-spin">sync</span>
                <p className="text-brand-blue font-['Space_Grotesk'] tracking-widest text-xs uppercase animate-pulse">Loading your bookings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* Header Banner */}
            <div className="glass-panel relative overflow-hidden rounded-2xl bg-white dark:bg-slate-950/80 p-6 shadow-[0_0_30px_rgba(14,165,233,0.15)] border border-slate-200 dark:border-sky-500/30">
                <div className="absolute inset-0 scanline opacity-30"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-sky-500/20 rounded-xl flex items-center justify-center border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <span className="material-symbols-outlined text-sky-400 text-3xl">history</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white uppercase tracking-widest drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]">My Bookings</h1>
                            <p className="text-slate-500 dark:text-sky-400/60 mt-1 font-mono text-[10px] uppercase tracking-widest">Your confirmed ticket bookings</p>
                        </div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-sky-500/20 rounded-xl px-4 py-2 text-center w-full sm:w-auto">
                        <p className="text-2xl font-black text-brand-blue drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]">{bookings.length}</p>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold">Total Bookings</p>
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <ReportExport 
                    data={bookings} 
                    filename="My_Bookings" 
                    title="Booking History" 
                    dateKey="createdAt" 
                />
            </div>

            <div className="space-y-4">
                {bookings.length === 0 ? (
                    <div className="glass-panel border border-slate-200 dark:border-sky-500/20 rounded-2xl p-10 text-center bg-white dark:bg-slate-950/40">
                        <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-500/30">
                            <span className="material-symbols-outlined text-sky-400/50 text-3xl">search_off</span>
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase mb-1">No Bookings Found</h3>
                        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">You haven't made any bookings yet.</p>
                    </div>
                ) : (
                    bookings.map((b) => {
                        const tStatus = getTicketStatus(b);
                        const isActioning = actioningId === b.id;
                        const hasRefund = (b.refundRecords && b.refundRecords.length > 0) || refundProcessingIds.has(b.id);
                        const showCancelledActions = b.status === 'CANCELLED' && !hasRefund;

                        return (
                            <div key={b.id} className="glass-panel group relative bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-sky-500/20 rounded-2xl p-5 transition-all hover:border-sky-500/50 hover:shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-colors duration-500 pointer-events-none" />

                                <div className="flex flex-col lg:flex-row gap-5 items-start relative z-10">
                                    {/* Left: Journey Info */}
                                    <div className="flex-1 space-y-3 w-full">
                                        <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                                            <span className="bg-slate-100 dark:bg-slate-900/80 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">ID:{b.id.slice(0, 8)}</span>
                                            {b.paymentId && <span className="bg-slate-100 dark:bg-slate-900/80 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">TXN:{b.paymentId.slice(0, 10)}</span>}
                                            {b.class && <span className="bg-sky-500/10 text-sky-400 px-2 py-1 rounded border border-sky-500/30 shadow-[0_0_8px_rgba(14,165,233,0.2)]">{b.class}</span>}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors tracking-tight uppercase">{b.event.name}</h3>
                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-mono tracking-widest uppercase">
                                                    <span className="material-symbols-outlined text-[14px] text-sky-500">calendar_month</span>
                                                    {new Date(b.event.date).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-mono tracking-widest uppercase">
                                                    <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-600">schedule</span>
                                                    Booked {new Date(b.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Center: Status Badges */}
                                    <div className="flex flex-col items-start gap-2 lg:border-l lg:border-white/10 lg:pl-5 shrink-0 w-full lg:w-auto">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(16,185,129,0.1)] w-full lg:w-auto">
                                            <span className="material-symbols-outlined text-[14px]">verified</span>
                                            PAYMENT SUCCESSFUL
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded text-[9px] font-bold tracking-widest uppercase w-full lg:w-auto ${tStatus.color}`}>
                                            {tStatus.icon}
                                            {tStatus.label}
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex flex-col items-center gap-2 w-full lg:w-40 shrink-0">
                                        <button
                                            onClick={() => setSelectedBookingForDetails(b)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-sky-100 text-[9px] font-bold tracking-widest uppercase rounded border border-slate-200 dark:border-sky-500/20 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">read_more</span> DETAILS
                                        </button>
                                        
                                        {(b.status === 'SUCCESS' || b.ticketUrl) && !hasRefund && (
                                            <a
                                                href={`${API_BASE_URL}${b.ticketUrl}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-[9px] font-bold tracking-widest uppercase rounded border border-sky-500/40 transition-all shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">download</span> DOWNLOAD
                                            </a>
                                        )}
                                        
                                        {b.status !== 'CANCELLED' && b.status !== 'SUCCESS' && !b.ticketUrl && !hasRefund && (
                                            <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900/50 text-slate-500 text-[9px] font-bold tracking-widest uppercase rounded border border-slate-200 dark:border-slate-800 cursor-default">
                                                PROCESSING
                                            </div>
                                        )}
                                        
                                        {hasRefund && (
                                            <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-400 text-[9px] font-bold tracking-widest uppercase rounded border border-amber-500/20">
                                                <span className="material-symbols-outlined text-[14px]">schedule</span> {tStatus.label}
                                            </div>
                                        )}
                                        
                                        {showCancelledActions && (
                                            <div className="w-full flex gap-1">
                                                <button
                                                    onClick={() => { setActioningId(b.id); setActionType('rebook'); }}
                                                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded border text-[9px] font-bold tracking-widest uppercase transition-all
                                                        ${(isActioning && actionType === 'rebook')
                                                            ? 'bg-sky-500 border-sky-400 text-white shadow-[0_0_10px_rgba(14,165,233,0.4)]'
                                                            : 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">sync</span> RE-BOOK
                                                </button>
                                                <button
                                                    onClick={() => { setActioningId(b.id); setActionType('refund'); }}
                                                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded border text-[9px] font-bold tracking-widest uppercase transition-all
                                                        ${(isActioning && actionType === 'refund')
                                                            ? 'bg-amber-500 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                                                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">currency_rupee</span> REFUND
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Panels */}
                                {isActioning && (
                                    <div className="mt-4 pt-4 border-t border-sky-500/20 animate-in slide-in-from-top-2 duration-300">
                                        {actionType === 'rebook' ? (
                                            <div className="flex flex-col md:flex-row items-end gap-3 bg-slate-900/80 p-4 rounded-xl border border-sky-500/30 shadow-[inset_0_0_15px_rgba(14,165,233,0.1)]">
                                                <div className="flex-1 w-full space-y-1">
                                                    <label className="text-[9px] font-bold text-sky-500 uppercase tracking-widest">Select New Journey Date</label>
                                                    <input
                                                        type="date"
                                                        value={rebookDate}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={(e) => setRebookDate(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-sky-100 focus:border-sky-500 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
                                                    />
                                                    <p className="text-slate-500 dark:text-sky-400/60 text-[8px] uppercase tracking-widest mt-1">Payment remains valid. Ticket will be re-issued.</p>
                                                </div>
                                                <div className="flex gap-2 w-full md:w-auto">
                                                    <button
                                                        onClick={() => { setActioningId(null); setActionType(null); }}
                                                        className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] tracking-widest uppercase font-bold rounded transition-all border border-slate-600"
                                                    >
                                                        ABORT
                                                    </button>
                                                    <button
                                                        onClick={() => handleRebook(b.id)}
                                                        className="flex-1 md:flex-none px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-[10px] tracking-widest uppercase font-bold rounded transition-all shadow-[0_0_15px_rgba(14,165,233,0.4)] flex items-center justify-center gap-1"
                                                    >
                                                        CONFIRM <span className="material-symbols-outlined text-[12px]">send</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.1)]">
                                                <div className="space-y-1 w-full md:w-auto">
                                                    <p className="text-amber-500 font-bold text-xs uppercase tracking-widest">Confirm Cancellation & Refund?</p>
                                                    <p className="text-amber-500/60 text-[9px] uppercase tracking-widest leading-relaxed">Refund will be credited to your account in 5-7 working days.</p>
                                                </div>
                                                <div className="flex gap-2 w-full md:w-auto shrink-0 mt-3 md:mt-0">
                                                    <button
                                                        onClick={() => { setActioningId(null); setActionType(null); }}
                                                        className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] tracking-widest uppercase font-bold rounded transition-all border border-slate-600"
                                                    >
                                                        ABORT
                                                    </button>
                                                    <button
                                                        onClick={() => handleRefund(b.id)}
                                                        className="flex-1 md:flex-none px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-[10px] tracking-widest uppercase font-bold rounded transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                                    >
                                                        CONFIRM REFUND
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)] border backdrop-blur-xl text-xs tracking-widest uppercase font-bold animate-in slide-in-from-bottom-8 duration-500
                    ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/90 border-rose-500/40 text-rose-400'}`}>
                    <span className="material-symbols-outlined text-[16px]">
                        {toast.type === 'success' ? 'check_circle' : 'warning'}
                    </span>
                    {toast.msg}
                </div>
            )}
            
            <BookingDetailsModal 
                isOpen={!!selectedBookingForDetails} 
                onClose={() => setSelectedBookingForDetails(null)} 
                booking={selectedBookingForDetails} 
                onRefresh={fetchBookings}
            />
        </div>
    );
}
