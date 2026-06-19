import { useEffect, useState } from 'react';
import axios from 'axios';
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
    user: { email: string; mobile: string | null };
}

export default function SalesBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                // Fetch only self bookings for Sales Manager
                const response = await axios.get('/api/admin/bookings');
                setBookings(response.data.bookings || []);
            } catch (error) {
                console.error('Failed to fetch bookings', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-slate-50 dark:bg-slate-950 min-h-screen">
                <div className="w-12 h-12 rounded-full border-4 border-brand-blue/20 border-t-brand-blue animate-spin" />
                <p className="text-brand-blue font-mono tracking-widest text-[10px] uppercase animate-pulse">Loading bookings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20 bg-slate-50 dark:bg-slate-950 min-h-screen px-4 pt-6">
            {/* Header Banner */}
            <div className="glass-panel relative overflow-hidden rounded-2xl bg-white dark:bg-slate-950/80 p-6 shadow-[0_0_30px_rgba(14,165,233,0.15)] border border-slate-200 dark:border-white/10">
                <div className="absolute inset-0 scanline opacity-30"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-brand-blue/5 dark:bg-brand-blue/10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-brand-blue/30 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <span className="material-symbols-outlined text-brand-blue text-3xl">local_police</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest italic italic">My Sales</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 font-mono text-[10px] uppercase tracking-widest">Self-booked tickets</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-center w-full sm:w-auto">
                        <p className="text-2xl font-black text-brand-blue drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]">{bookings.length}</p>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold">Total Tickets</p>
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <ReportExport 
                    data={bookings} 
                    filename="Sales_Bookings" 
                    title="Agent Operations Report" 
                    dateKey="createdAt" 
                />
            </div>

            <div className="space-y-4 relative z-10">
                {bookings.length === 0 ? (
                    <div className="glass-panel border border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center bg-white dark:bg-slate-950/40">
                        <div className="w-16 h-16 bg-brand-blue/5 dark:bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-brand-blue/30">
                            <span className="material-symbols-outlined text-brand-blue/50 text-3xl">search_off</span>
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-black text-sm tracking-widest uppercase mb-1">No bookings found</h3>
                        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">You haven't booked any tickets yet.</p>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <div key={booking.id} className="glass-panel group relative bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 transition-all hover:border-brand-blue/30 hover:shadow-[0_0_20px_rgba(14,165,233,0.1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-2xl transition-transform group-hover:scale-150 duration-700 pointer-events-none"></div>
                            
                            <div className="relative z-10 w-full sm:w-auto">
                                <p className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-widest group-hover:text-brand-blue transition-colors italic">{booking.event.name}</p>
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase">
                                    <span className="material-symbols-outlined text-[14px] text-brand-blue">calendar_month</span>
                                    {new Date(booking.event.date).toLocaleDateString()}
                                </div>
                                <div className="mt-3 text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-2 py-1 rounded inline-block">
                                    ID: {booking.id.slice(0, 10)}
                                </div>
                                
                                {/* Contact Actions */}
                                {booking.user?.mobile && (
                                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-sky-500/20 w-full">
                                        <div className="flex items-center gap-1.5 text-sky-400/80 text-[10px] font-mono tracking-widest uppercase bg-sky-500/10 px-2 py-1 rounded">
                                            <span className="material-symbols-outlined text-[12px]">person</span>
                                            {booking.user.email.split('@')[0]}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`https://wa.me/${booking.user.mobile.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 rounded border border-emerald-500/20 transition-all text-[9px] font-black tracking-widest uppercase"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">chat</span> CHAT
                                            </a>
                                            <a
                                                href={`tel:${booking.user.mobile}`}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 rounded border border-brand-blue/20 transition-all text-[9px] font-black tracking-widest uppercase"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">call</span> CALL
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto relative z-10 shrink-0">
                                <button
                                    onClick={() => setSelectedBookingForDetails(booking)}
                                    className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-sky-100 text-[9px] font-black tracking-widest uppercase rounded border border-slate-200 dark:border-white/10 transition-all w-full sm:w-auto flex items-center justify-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[14px]">visibility</span> DETAILS
                                </button>
                                
                                <span className={`text-[9px] px-3 py-2 rounded font-bold uppercase tracking-widest border flex items-center justify-center gap-1.5 w-full sm:w-auto
                                    ${booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                                    booking.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' :
                                        'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                    }`}>
                                    <span className="material-symbols-outlined text-[12px]">
                                        {booking.status === 'CONFIRMED' ? 'check_circle' : booking.status === 'CANCELLED' ? 'cancel' : 'schedule'}
                                    </span>
                                    {booking.status}
                                </span>

                                 {booking.status === 'PENDING' && (
                                    <div className="flex items-center justify-center gap-1.5 text-[9px] text-amber-500 bg-amber-500/5 px-3 py-2 rounded border border-amber-500/20 uppercase tracking-widest font-black w-full sm:w-auto">
                                        <span className="material-symbols-outlined text-[12px] animate-spin">refresh</span>
                                        PROCESSING
                                    </div>
                                 )}

                                 {booking.status === 'CONFIRMED' && booking.ticketUrl && (
                                    <a
                                        href={`${API_BASE_URL}${booking.ticketUrl}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-blue hover:opacity-90 text-white text-[9px] font-black uppercase tracking-widest rounded transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] w-full sm:w-auto"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">download</span>
                                        DOWNLOAD
                                    </a>
                                 )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Details Modal */}
            <BookingDetailsModal 
                isOpen={!!selectedBookingForDetails} 
                onClose={() => setSelectedBookingForDetails(null)} 
                booking={selectedBookingForDetails} 
            />
        </div>
    );
}
