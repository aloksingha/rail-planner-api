import { useEffect, useState } from 'react';
import axios from 'axios';
import { Ticket, Calendar, Download, RefreshCw, Info, CheckCircle2, IndianRupee, Clock, ArrowRight, Train } from 'lucide-react';
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
        // 1. Check for real server-side refund records first
        const latestRefund = b.refundRecords?.[0];
        if (latestRefund) {
            if (latestRefund.status === 'COMPLETED' || latestRefund.status === 'MANUAL_RESOLVED') {
                return { label: 'Refunded', color: 'text-brand-green bg-brand-green/10 border-brand-green/20', icon: <CheckCircle2 size={14} /> };
            }
            return { label: 'Refund Under Process', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20', icon: <Clock size={14} /> };
        }

        // 2. Fallback to local temporary state (for immediate UI update)
        if (refundProcessingIds.has(b.id)) {
            return { label: 'Refund Under Process', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20', icon: <Clock size={14} /> };
        }

        // 3. Standard booking statuses
        if (b.status === 'CANCELLED') return { label: 'Ticket Cancelled', color: 'text-brand-rose bg-brand-rose/10 border-brand-rose/20', icon: <Info size={14} /> };
        if (b.status === 'SUCCESS' || b.ticketUrl) return { label: 'Ticket Success', color: 'text-brand-green bg-brand-green/10 border-brand-green/20', icon: <CheckCircle2 size={14} /> };
        return { label: 'Ticket Pending', color: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20', icon: <Clock size={14} /> };
    };

    if (loading && bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Ticket className="text-slate-700 w-12 h-12" />
                <p className="text-slate-500 font-medium">Loading your journey history...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Decorative Train Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep via-brand-blue to-brand-teal p-8 shadow-2xl shadow-brand-blue/40">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/train.png")', backgroundSize: '200px' }} />
                <div className="absolute -right-10 -top-10 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex items-center gap-5">
                    <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                        <Train size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">My Bookings</h1>
                        <p className="text-white/60 mt-1 font-medium">Your complete rail reservation history</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-4xl font-black text-white">{bookings.length}</p>
                        <p className="text-white/50 text-xs uppercase tracking-widest font-bold">Total Trips</p>
                    </div>
                </div>
            </div>

            <div className="mb-6 relative z-10">
                <ReportExport 
                    data={bookings} 
                    filename="Customer_Bookings" 
                    title="My Bookings Report" 
                    dateKey="createdAt" 
                />
            </div>

            <div className="space-y-4">
                {bookings.length === 0 ? (
                    <div className="bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Ticket className="text-slate-600" size={32} />
                        </div>
                        <h3 className="text-white font-bold text-lg">No bookings found</h3>
                        <p className="text-slate-500 mt-1 max-w-xs mx-auto">Explore available trains and start your journey today!</p>
                    </div>
                ) : (
                    bookings.map((b) => {
                        const tStatus = getTicketStatus(b);
                        const isActioning = actioningId === b.id;
                        const hasRefund = (b.refundRecords && b.refundRecords.length > 0) || refundProcessingIds.has(b.id);
                        // Show Re-Book / Refund only if cancelled and NO refund has been initiated yet
                        const showCancelledActions = b.status === 'CANCELLED' && !hasRefund;

                        return (
                            <div key={b.id} className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-3xl p-6 transition-all hover:border-brand-blue/30 shadow-xl overflow-hidden data-[theme=light]:bg-white/90 data-[theme=light]:border-slate-200">
                                {/* Animated background glow */}
                                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-blue/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-brand-blue/10 transition-colors duration-500" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-teal/5 rounded-full blur-2xl group-hover:bg-brand-teal/10 transition-colors duration-500" />

                                <div className="flex flex-col lg:flex-row gap-6 items-start relative z-10">
                                    {/* Left: Journey Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-600">ID: {b.id.slice(0, 10)}…</span>
                                            {b.paymentId && <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-600">TXN: {b.paymentId.slice(0, 14)}…</span>}
                                            {b.class && <span className="bg-brand-blue/10 text-brand-blue px-2.5 py-1 rounded-lg border border-brand-blue/20 data-[theme=light]:bg-brand-blue/10 data-[theme=light]:border-brand-blue/30 data-[theme=light]:text-brand-blue">{b.class}</span>}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white group-hover:text-brand-blue transition-colors tracking-tight data-[theme=light]:text-slate-900 data-[theme=light]:group-hover:text-brand-blue">{b.event.name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 text-xs font-semibold data-[theme=light]:text-slate-600 data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300">
                                                    <Calendar size={12} className="text-brand-blue data-[theme=light]:text-brand-blue" />
                                                    {new Date(b.event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 text-xs font-semibold data-[theme=light]:text-slate-600 data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300">
                                                    <Clock size={12} className="text-brand-blue data-[theme=light]:text-brand-blue" />
                                                    Booked {new Date(b.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Center: Status Badges */}
                                    <div className="flex flex-wrap lg:flex-col items-start gap-2 lg:border-l lg:border-slate-700/50 lg:pl-6 shrink-0 data-[theme=light]:lg:border-slate-200">
                                        {/* Payment Status — always Success */}
                                        <div className="flex items-center gap-2 px-4 py-2 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded-2xl text-[11px] font-black whitespace-nowrap data-[theme=light]:bg-brand-green/10 data-[theme=light]:border-brand-green/30 data-[theme=light]:text-brand-green">
                                            <CheckCircle2 size={14} />
                                            PAYMENT SUCCESS
                                        </div>
                                        {/* Ticket Status — dynamic */}
                                        <div className={`flex items-center gap-2 px-4 py-2 border rounded-2xl text-[11px] font-black whitespace-nowrap ${tStatus.color}`}>
                                            {tStatus.icon}
                                            {tStatus.label.toUpperCase()}
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex lg:flex-col items-center gap-2 w-full lg:w-44 shrink-0">
                                        <button
                                            onClick={() => setSelectedBookingForDetails(b)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black rounded-2xl border border-slate-700 transition-all mb-1"
                                        >
                                            <Info size={13} strokeWidth={3} /> VIEW FULL DETAILS
                                        </button>
                                        {/* Download when ticket is available */}
                                        {(b.status === 'SUCCESS' || b.ticketUrl) && !hasRefund && (
                                            <a
                                                href={`${API_BASE_URL}${b.ticketUrl}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue/80 text-white text-xs font-black rounded-2xl transition-all shadow-lg shadow-brand-blue/30 hover:-translate-y-0.5 active:scale-95 data-[theme=light]:bg-brand-blue data-[theme=light]:hover:bg-brand-blue data-[theme=light]:shadow-brand-blue/20"
                                            >
                                                <Download size={13} /> DOWNLOAD TICKET
                                            </a>
                                        )}
                                        {/* Awaiting when pending */}
                                        {b.status !== 'CANCELLED' && b.status !== 'SUCCESS' && !b.ticketUrl && !hasRefund && (
                                            <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/50 text-slate-500 text-[10px] font-black rounded-2xl border border-slate-700 italic cursor-default data-[theme=light]:bg-slate-100 data-[theme=light]:text-slate-500 data-[theme=light]:border-slate-300">
                                                AWAITING TICKET ISSUANCE
                                            </div>
                                        )}
                                        {/* Refund Under Process badge */}
                                        {hasRefund && (
                                            <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-orange/10 text-brand-orange text-[10px] font-black rounded-2xl border border-brand-orange/20 data-[theme=light]:bg-brand-orange/10 data-[theme=light]:text-brand-orange data-[theme=light]:border-brand-orange/30">
                                                <Clock size={13} /> {tStatus.label.toUpperCase()}
                                            </div>
                                        )}
                                        {/* Re-Book / Refund — CUSTOMER ONLY, only when Cancelled */}
                                        {showCancelledActions && (
                                            <div className="w-full space-y-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setActioningId(b.id); setActionType('rebook'); }}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-black transition-all
                                                            ${(isActioning && actionType === 'rebook')
                                                                ? 'bg-brand-blue border-brand-blue/50 text-white shadow-lg shadow-brand-blue/30 data-[theme=light]:bg-brand-blue data-[theme=light]:border-brand-blue data-[theme=light]:text-white data-[theme=light]:shadow-brand-blue/20'
                                                                : 'bg-brand-blue/5 border-brand-blue/20 text-brand-blue hover:bg-brand-blue/10 data-[theme=light]:bg-brand-blue/5 data-[theme=light]:border-brand-blue/20 data-[theme=light]:text-brand-blue data-[theme=light]:hover:bg-brand-blue/10'}`}
                                                    >
                                                        <RefreshCw size={12} /> RE-BOOK
                                                    </button>
                                                    <button
                                                        onClick={() => { setActioningId(b.id); setActionType('refund'); }}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-black transition-all
                                                            ${(isActioning && actionType === 'refund')
                                                                ? 'bg-brand-orange border-brand-orange/50 text-white shadow-lg shadow-brand-orange/30 data-[theme=light]:bg-brand-orange data-[theme=light]:border-brand-orange data-[theme=light]:text-white data-[theme=light]:shadow-brand-orange/20'
                                                                : 'bg-brand-orange/5 border-brand-orange/20 text-brand-orange hover:bg-brand-orange/10 data-[theme=light]:bg-brand-orange/5 data-[theme=light]:border-brand-orange/20 data-[theme=light]:text-brand-orange data-[theme=light]:hover:bg-brand-orange/10'}`}
                                                    >
                                                        <IndianRupee size={12} /> REFUND
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Secondary Action Panel */}
                                {isActioning && (
                                    <div className="mt-6 pt-6 border-t border-slate-700/50 animate-in slide-in-from-top-4 duration-300 data-[theme=light]:border-slate-200">
                                        {actionType === 'rebook' ? (
                                            <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/40 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                                                <div className="flex-1 w-full space-y-2">
                                                    <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-wider data-[theme=light]:text-slate-600">Select New Journey Date</label>
                                                    <input
                                                        type="date"
                                                        value={rebookDate}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={(e) => setRebookDate(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-blue outline-none transition-all [color-scheme:dark]"
                                                    />
                                                    <p className="text-brand-blue/80 text-[10px] font-bold uppercase tracking-wide">
                                                        ✓ Payment Status remains Success · Ticket will be Pending until Admin confirms
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 w-full md:w-auto">
                                                    <button
                                                        onClick={() => { setActioningId(null); setActionType(null); }}
                                                        className="flex-1 md:flex-none px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black rounded-xl transition-all"
                                                    >
                                                        CANCEL
                                                    </button>
                                                    <button
                                                        onClick={() => handleRebook(b.id)}
                                                        className="flex-1 md:flex-none px-5 py-3 bg-brand-blue hover:bg-brand-blue/80 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
                                                    >
                                                        CONFIRM RE-BOOK <ArrowRight size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-brand-orange/5 p-5 rounded-2xl border border-brand-orange/10">
                                                <div className="space-y-1">
                                                    <p className="text-brand-orange/80 font-bold text-sm">Confirm Refund Request?</p>
                                                    <p className="text-brand-orange/60 text-[10px] font-medium leading-relaxed uppercase tracking-wide">Amount credited to original payment method within 5-7 working days.</p>
                                                </div>
                                                <div className="flex gap-2 w-full md:w-auto shrink-0">
                                                    <button
                                                        onClick={() => { setActioningId(null); setActionType(null); }}
                                                        className="flex-1 md:flex-none px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black rounded-xl transition-all"
                                                    >
                                                        EXIT
                                                    </button>
                                                    <button
                                                        onClick={() => handleRefund(b.id)}
                                                        className="flex-1 md:flex-none px-5 py-3 bg-brand-orange hover:bg-brand-orange/80 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-brand-orange/20"
                                                    >
                                                        PROCEED WITH REFUND
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
                <div className={`fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-3xl shadow-2xl border backdrop-blur-xl text-sm font-black animate-in slide-in-from-bottom-8 duration-500
                    ${toast.type === 'success' ? 'bg-brand-teal/90 border-brand-teal/40 text-brand-teal' : 'bg-brand-rose/90 border-brand-rose/40 text-brand-rose'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-brand-teal/20' : 'bg-brand-rose/20'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                    </div>
                    {toast.msg}
                </div>
            )}
            
            {/* Details Modal */}
            <BookingDetailsModal 
                isOpen={!!selectedBookingForDetails} 
                onClose={() => setSelectedBookingForDetails(null)} 
                booking={selectedBookingForDetails} 
                onRefresh={fetchBookings}
            />
        </div>
    );
}
