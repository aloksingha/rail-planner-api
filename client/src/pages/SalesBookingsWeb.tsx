import { useEffect, useState } from 'react';
import axios from 'axios';
import { Ticket, Calendar, Download, Info, MessageCircle, Phone, User as UserIcon } from 'lucide-react';
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
        return <div className=" text-brand-blue font-bold py-10">Loading your bookings...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-teal shadow-xl shadow-brand-blue/20 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-white">My Bookings</h1>
                    <p className="text-white/70 mt-1">View your personal walk-in ticket reservations and history.</p>
                </div>
            </header>

            <div className="card relative overflow-hidden group border border-slate-700/50 bg-surface/50">
                <div className="absolute right-0 top-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Ticket className="text-brand-blue" size={20} />
                        Personal Sales
                    </h2>
                    <span className="text-xs bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-full border border-brand-blue/20 font-black uppercase tracking-widest">
                        {bookings.length} reservations
                    </span>
                </div>

                <div className="mb-6 relative z-10">
                    <ReportExport 
                        data={bookings} 
                        filename="Sales_Bookings" 
                        title="Sales Bookings Report" 
                        dateKey="createdAt" 
                    />
                </div>

                <div className="space-y-4 relative z-10">
                    {bookings.length === 0 ? (
                        <p className="text-slate-500 italic py-4">You have not booked any tickets yet.</p>
                    ) : (
                        bookings.map((booking) => (
                            <div key={booking.id} className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-brand-blue/30 transition-all hover:bg-slate-900/60 group/item">
                                <div>
                                    <p className="text-white font-black text-lg">{booking.event.name}</p>
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-medium">
                                        <Calendar size={14} className="text-brand-blue" />
                                        {new Date(booking.event.date).toLocaleDateString()}
                                    </div>
                                    <div className="mt-3 text-[10px] text-slate-500 font-mono uppercase tracking-wider">ID: {booking.id}</div>
                                    
                                    {/* Contact Actions */}
                                    {booking.user?.mobile && (
                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800/50">
                                            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium">
                                                <UserIcon size={12} className="text-brand-blue" />
                                                {booking.user.email.split('@')[0]}
                                            </div>
                                            <div className="h-3 w-px bg-slate-800" />
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`https://wa.me/${booking.user.mobile.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 transition-all text-[10px] font-bold"
                                                >
                                                    <MessageCircle size={12} /> WhatsApp
                                                </a>
                                                <a
                                                    href={`tel:${booking.user.mobile}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 rounded-xl border border-sky-500/20 transition-all text-[10px] font-bold"
                                                >
                                                    <Phone size={12} /> Call
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <button
                                        onClick={() => setSelectedBookingForDetails(booking)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black rounded-xl border border-slate-700 transition-all"
                                    >
                                        DETAILS
                                    </button>
                                    <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border ${booking.status === 'CONFIRMED' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/20' :
                                        booking.status === 'CANCELLED' ? 'bg-brand-rose/10 text-brand-rose border-brand-rose/20' :
                                            'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                                        }`}>
                                        {booking.status}
                                    </span>

                                    {booking.status === 'PENDING' && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                                            <Info size={14} className="text-brand-orange" />
                                            Awaiting generated PDF
                                        </div>
                                    )}

                                    {booking.status === 'CONFIRMED' && booking.ticketUrl && (
                                        <a
                                            href={`${API_BASE_URL}${booking.ticketUrl}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/80 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5 active:scale-95"
                                        >
                                            <Download size={16} />
                                            Download Ticket
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
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
